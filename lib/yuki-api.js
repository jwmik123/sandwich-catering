// lib/yuki-api.js
import { GLUTEN_FREE_SURCHARGE, PAYMENT_TERM_DAYS } from "@/app/assets/constants";
import { parseString } from "xml2js";
import { promisify } from "util";
import { isDrink } from "./product-helpers";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { round2 } from "./vat-calculations";
import { assignInvoiceNumber } from "./invoice-number";

const parseXmlAsync = promisify(parseString);

// Invoices booked before booking verification existed carry no yukiVerifiedAt,
// so their absence from Yuki's open list cannot be judged — for those, absence
// still means paid. Only invoices booked from this moment on are held to the
// stricter "must have been verified" standard.
export const VERIFICATION_ROLLOUT_AT = new Date("2026-09-18T00:00:00.000Z");

/**
 * Yuki's <EmailAddress> accepts exactly one address. Order forms regularly carry
 * two ("tessa@x.nl, info@x.nl"), which makes Yuki reject the whole sales invoice
 * while still answering HTTP 200 — the invoice then silently never exists.
 * Returns the first syntactically valid address, or "" when there is none.
 */
export function sanitizeEmailForYuki(raw) {
  if (!raw) return "";
  const candidates = String(raw)
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const valid = candidates.find((c) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(c));
  if (valid && candidates.length > 1) {
    console.warn(
      `⚠️  Multiple/odd e-mail values for Yuki ("${raw}") — using "${valid}"`
    );
  }
  return valid || "";
}

// Markers Yuki puts in an HTTP-200 body when it did NOT accept the document.
const YUKI_FAILURE_MARKERS = [
  "soap:Fault",
  "<Error",
  "<Errors",
  "<Exception",
  "Exception:",
  "not valid",
  "is invalid",
  "Invalid ",
  "Rejected",
  "Geweigerd",
  "Foutmelding",
];

/**
 * Yuki's SOAP endpoints answer 200 OK for rejected documents, with the outcome in
 * the body. A processed sales invoice looks like:
 *   <TotalSucceeded>1</TotalSucceeded><TotalFailed>0</TotalFailed>
 *   <Invoice><Succeeded>true</Succeeded><Processed>true</Processed><Message /></Invoice>
 * Throws on anything that is not a clean success.
 */
export function assertYukiResponseOk(xmlResponse, operation) {
  const body = String(xmlResponse || "");
  const num = (tag) => {
    const m = body.match(new RegExp(`<${tag}[^>]*>\\s*(\\d+)\\s*<`));
    return m ? parseInt(m[1], 10) : null;
  };
  const message = (body.match(/<Message[^>]*>([\s\S]*?)<\/Message>/) || [])[1];
  const detail = message?.trim() ? ` Yuki says: "${message.trim()}".` : "";

  const failed = num("TotalFailed");
  const skipped = num("TotalSkipped");
  const succeeded = num("TotalSucceeded");

  if (failed) {
    throw new Error(
      `${operation}: Yuki failed ${failed} document(s).${detail} Response: ${body.slice(0, 1500)}`
    );
  }
  if (skipped) {
    throw new Error(
      `${operation}: Yuki skipped ${skipped} document(s).${detail} Response: ${body.slice(0, 1500)}`
    );
  }
  if (/<Succeeded>\s*false\s*<\/Succeeded>/i.test(body)) {
    throw new Error(
      `${operation}: Yuki reported Succeeded=false.${detail} Response: ${body.slice(0, 1500)}`
    );
  }
  if (succeeded === 0) {
    throw new Error(
      `${operation}: Yuki booked 0 documents.${detail} Response: ${body.slice(0, 1500)}`
    );
  }

  // Catch-all for shapes without the counters (contacts, future endpoints).
  const marker = YUKI_FAILURE_MARKERS.find((m) =>
    body.toLowerCase().includes(m.toLowerCase())
  );
  if (marker) {
    throw new Error(
      `${operation} rejected by Yuki (marker "${marker}").${detail} Response: ${body.slice(0, 1500)}`
    );
  }
}

export class YukiApiClient {
  constructor(apiKey, administrationId) {
    this.apiKey = apiKey;
    this.administrationId = administrationId;
    this.sessionId = null;
    this.baseUrl = "https://api.yukiworks.nl/ws";
  }

  /**
   * Authenticate with Yuki and get session ID
   */
  async authenticate() {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <Authenticate xmlns="http://www.theyukicompany.com/">
            <accessKey>${this.apiKey}</accessKey>
          </Authenticate>
        </soap12:Body>
      </soap12:Envelope>`;

    console.log("=== YUKI AUTHENTICATION REQUEST ===");
    console.log("URL:", `${this.baseUrl}/Sales.asmx`);
    console.log("API Key:", this.apiKey ? "***SET***" : "NOT SET");

    try {
      const response = await fetch(`${this.baseUrl}/Sales.asmx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction: '"http://www.theyukicompany.com/Authenticate"',
        },
        body: soapEnvelope,
      });

      console.log("=== YUKI AUTHENTICATION RESPONSE ===");
      console.log("Status:", response.status, response.statusText);

      const xmlResponse = await response.text();
      console.log("Response Body:", xmlResponse);

      if (!response.ok) {
        throw new Error(
          `Authentication failed: ${response.statusText}. Response: ${xmlResponse}`
        );
      }

      const parsed = await parseXmlAsync(xmlResponse);
      console.log("Parsed Response:", JSON.stringify(parsed, null, 2));

      // Extract session ID from response
      const sessionId =
        parsed["soap:Envelope"]["soap:Body"][0]["AuthenticateResponse"][0][
          "AuthenticateResult"
        ][0];

      console.log("Extracted Session ID:", sessionId);

      if (!sessionId) {
        throw new Error("Failed to get session ID from Yuki");
      }

      this.sessionId = sessionId;
      return sessionId;
    } catch (error) {
      console.error("Yuki authentication error:", error);
      throw error;
    }
  }

  /**
   * Create a contact/customer in Yuki
   */
  async createContact(contactData) {
    if (!this.sessionId) {
      await this.authenticate();
    }

    // Helper function to escape XML characters
    const escapeXml = (str) => {
      if (!str) return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const contactXml = `
      <Contacts>
        <Contact>
          <ContactCode>${escapeXml(contactData.contactCode)}</ContactCode>
          <FullName>${escapeXml(contactData.fullName)}</FullName>
          <CompanyName>${escapeXml(contactData.companyName || "")}</CompanyName>
          <EmailAddress>${escapeXml(sanitizeEmailForYuki(contactData.email))}</EmailAddress>
          <ContactType>${contactData.isCompany ? "Business" : "Person"}</ContactType>
          <CustomerLedgerAccount>1300</CustomerLedgerAccount>
          <Address>
            <Street>${escapeXml(contactData.address.street)}</Street>
            <HouseNumber>${escapeXml(contactData.address.houseNumber)}</HouseNumber>
            <ZipCode>${escapeXml(contactData.address.postalCode)}</ZipCode>
            <City>${escapeXml(contactData.address.city)}</City>
            <Country>NL</Country>
          </Address>
          ${contactData.vatNumber ? `<VATNumber>${escapeXml(contactData.vatNumber)}</VATNumber>` : ""}
        </Contact>
      </Contacts>`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <UpdateContact xmlns="http://www.theyukicompany.com/">
            <sessionId>${this.sessionId}</sessionId>
            <domainId>${this.administrationId}</domainId>
            <xmlDoc>${contactXml}</xmlDoc>
          </UpdateContact>
        </soap12:Body>
      </soap12:Envelope>`;

    console.log("=== YUKI CONTACT SOAP REQUEST ===");
    console.log("URL:", `${this.baseUrl}/Contact.asmx`);
    console.log("Contact Data:", JSON.stringify(contactData, null, 2));
    console.log("SOAP Envelope:", soapEnvelope);

    try {
      const response = await fetch(`${this.baseUrl}/Contact.asmx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction: '"http://www.theyukicompany.com/UpdateContact"',
        },
        body: soapEnvelope,
      });

      console.log("=== YUKI CONTACT RESPONSE ===");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));

      const xmlResponse = await response.text();
      console.log("Response Body:", xmlResponse);

      if (!response.ok) {
        throw new Error(
          `Contact creation failed: ${response.status} ${response.statusText}. Response: ${xmlResponse}`
        );
      }

      console.log("Contact creation successful:", xmlResponse);
      return xmlResponse;
    } catch (error) {
      console.error("Yuki contact creation error:", error);
      throw error;
    }
  }

  /**
   * Create a sales invoice in Yuki
   */
  async createSalesInvoice(invoiceData) {
    if (!this.sessionId) {
      await this.authenticate();
    }

    console.log("=== SESSION CHECK ===");
    console.log("Session ID:", this.sessionId);

    // Helper function to escape XML characters
    const escapeXml = (str) => {
      if (!str) return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Generate invoice lines XML with VAT applied to each line
    const invoiceLines = invoiceData.lines
      .map(
        (line) => `
      <InvoiceLine>
        <Description>${escapeXml(line.description)}</Description>
        <ProductQuantity>${line.quantity}</ProductQuantity>
        <LineAmount>${line.lineAmount.toFixed(2)}</LineAmount>
        <LineVATAmount>${line.lineVat.toFixed(2)}</LineVATAmount>
        <Product>
          <Description>${escapeXml(line.description)}</Description>
          <Reference>PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}</Reference>
          <Category xsi:nil="true" />
          <SalesPrice>${line.unitPrice.toFixed(2)}</SalesPrice>
          <VATPercentage>9.00</VATPercentage>
          <VATIncluded>false</VATIncluded>
          <VATType>2</VATType>
          <GLAccountCode>${line.glAccount || "80001"}</GLAccountCode>
          <Remarks />
        </Product>
      </InvoiceLine>
    `
      )
      .join("");

    const invoiceXml = `
      <SalesInvoices xmlns="urn:xmlns:http://www.theyukicompany.com:salesinvoices" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <SalesInvoice>
          <Reference>${escapeXml(invoiceData.reference)}</Reference>
          <Subject>${escapeXml(invoiceData.subject)}</Subject>
          <PaymentMethod>${invoiceData.paymentMethod || "ElectronicTransfer"}</PaymentMethod>
          <Process>true</Process>
          <EmailToCustomer>false</EmailToCustomer>
          <Layout />
          <Date>${invoiceData.invoiceDate}</Date>
          <DueDate>${invoiceData.dueDate}</DueDate>
          <PriceList />
          <Currency />
          <Remarks />
          <Contact>
            ${invoiceData.contactCode ? `<ContactCode>${escapeXml(invoiceData.contactCode)}</ContactCode>` : ""}
            <FullName>${escapeXml(invoiceData.contactData.fullName)}</FullName>
            <FirstName />
            <MiddleName />
            <LastName />
            <Gender>Male</Gender>
            <CountryCode>NL</CountryCode>
            <City>${escapeXml(invoiceData.contactData.address.city)}</City>
            <Zipcode>${escapeXml(invoiceData.contactData.address.postalCode)}</Zipcode>
            <AddressLine_1>${escapeXml(invoiceData.contactData.address.street + " " + invoiceData.contactData.address.houseNumber)}</AddressLine_1>
            <AddressLine_2 />
            <EmailAddress>${escapeXml(sanitizeEmailForYuki(invoiceData.contactData.email))}</EmailAddress>
            <Website />
            <CoCNumber />
            ${invoiceData.contactData.vatNumber ? `<VATNumber>${escapeXml(invoiceData.contactData.vatNumber)}</VATNumber>` : "<VATNumber />"}
            <ContactType>${invoiceData.contactData.isCompany ? "Company" : "Person"}</ContactType>
          </Contact>
          <InvoiceLines>
            ${invoiceLines}
          </InvoiceLines>
        </SalesInvoice>
      </SalesInvoices>`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <ProcessSalesInvoices xmlns="http://www.theyukicompany.com/">
            <sessionId>${this.sessionId}</sessionId>
            <administrationId>${this.administrationId}</administrationId>
            <xmlDoc>${invoiceXml}</xmlDoc>
          </ProcessSalesInvoices>
        </soap12:Body>
      </soap12:Envelope>`;

    console.log("=== YUKI INVOICE SOAP REQUEST ===");
    console.log("URL:", `${this.baseUrl}/Sales.asmx`);
    console.log("Invoice Data:", JSON.stringify(invoiceData, null, 2));
    console.log("SOAP Envelope:", soapEnvelope);

    try {
      const response = await fetch(`${this.baseUrl}/Sales.asmx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          SOAPAction: '"http://www.theyukicompany.com/ProcessSalesInvoices"',
        },
        body: soapEnvelope,
      });

      console.log("=== YUKI INVOICE RESPONSE ===");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));

      const xmlResponse = await response.text();
      console.log("Response Body:", xmlResponse);

      if (!response.ok) {
        throw new Error(
          `Invoice creation failed: ${response.status} ${response.statusText}. Response: ${xmlResponse}`
        );
      }

      // Yuki answers 200 OK even when it rejects the document: the reason sits
      // in the body. Without this check a rejected invoice was recorded as sent.
      assertYukiResponseOk(xmlResponse, "ProcessSalesInvoices");

      console.log("Invoice creation accepted by Yuki:", xmlResponse);
      return xmlResponse;
    } catch (error) {
      console.error("Yuki invoice creation error:", error);
      throw error;
    }
  }

  /**
   * Helper method to format invoice data from your app data
   * @param {Object} orderData - Order details from Sanity invoice
   * @param {string} quoteId - Quote ID for reference
   * @param {Object} amount - Stored PDF amount object { subtotal, delivery, vat, total }; drives exact Yuki totals
   * @param {Array} sandwichOptions - Product data from Sanity for naming
   * @returns {Object} { contactData, invoiceData } formatted for Yuki API
   */
  formatInvoiceFromOrderData(
    orderData,
    quoteId,
    amount,
    sandwichOptions = []
  ) {
    const contactCode = `CUST-${Date.now()}`;

    // Create contact data
    const contactData = {
      contactCode,
      fullName: orderData.name || "Unknown Customer",
      companyName: orderData.companyName || null,
      // The invoice address is the one bookkeeping should hold; fall back to the
      // contact address (first entry) when the customer did not give one.
      email: sanitizeEmailForYuki(orderData.invoiceEmail || orderData.email),
      isCompany: orderData.isCompany,
      address: {
        street: orderData.street,
        houseNumber:
          orderData.houseNumber + (orderData.houseNumberAddition || ""),
        postalCode: orderData.postalCode,
        city: orderData.city,
      },
      vatNumber: orderData.companyVAT || null,
    };

    // Create invoice lines
    const lines = [];

    const addLine = (sandwichId, selection) => {
      // Safety check: skip invalid selections
      if (!selection || !selection.quantity || selection.quantity <= 0) {
        console.warn('Skipping invalid selection with zero or missing quantity:', selection);
        return;
      }

      const sandwich = this.findSandwichById(sandwichId, sandwichOptions);
      // subTotal is stored VAT-exclusive in Sanity — divide by quantity only
      const unitPrice = round2(selection.subTotal / selection.quantity);

      // Build description based on item type
      let description = sandwich?.name || "Unknown Sandwich";
      if (sandwich && !isDrink(sandwich) && selection.breadType) {
        description += ` - ${selection.breadType}`;
      }
      if (selection.sauce !== "geen") {
        description += ` with ${selection.sauce}`;
      }

      lines.push({
        description,
        quantity: selection.quantity,
        unitPrice: unitPrice, // VAT-exclusive unit price (Yuki will add 9% VAT)
        glAccount: "80001", // Sales account
      });
    };

    if (orderData.selectionType === "custom") {
      const customSelection = orderData.customSelection || {};

      // Handle both array format (from Sanity read) and object format (from new order)
      if (Array.isArray(customSelection)) {
        // This format comes from reading an existing document from Sanity
        customSelection.forEach((item) => {
          const sandwichId = item.sandwichId?._ref || item.sandwichId;
          const selections = item.selections || [];
          selections.forEach((selection) => {
            addLine(sandwichId, selection);
          });
        });
      } else if (
        typeof customSelection === "object" &&
        customSelection !== null
      ) {
        // This format comes directly from a new order submission
        Object.entries(customSelection).forEach(([sandwichId, selections]) => {
          selections.forEach((selection) => {
            addLine(sandwichId, selection);
          });
        });
      }
    } else {
      // Process variety selection - use VAT-exclusive price for Yuki
      const varietyTypes = [
        { key: "nonVega", name: "Chicken, Meat, Fish" },
        { key: "vega", name: "Vegetarian" },
        { key: "vegan", name: "Vegan" },
        { key: "glutenFree", name: "Gluten Free" },
      ];

      varietyTypes.forEach((type) => {
        const quantity = orderData.varietySelection?.[type.key] || 0;
        if (quantity > 0) {
          // Use €7.30 as VAT-exclusive price, add gluten-free surcharge if applicable
          // Round to ensure consistent 2-decimal precision
          const unitPrice = round2(type.key === "glutenFree" ? 7.30 + GLUTEN_FREE_SURCHARGE : 7.30);
          lines.push({
            description: `${type.name} Sandwiches`,
            quantity,
            unitPrice: unitPrice, // VAT-exclusive price
            glAccount: "80001",
          });
        }
      });

      // Add upsell addon products (for variety orders)
      if (orderData.upsellAddons && orderData.upsellAddons.length > 0) {
        orderData.upsellAddons.forEach(addon => {
          // Safety check: skip invalid addons
          if (!addon || !addon.quantity || addon.quantity <= 0) {
            console.warn('Skipping invalid addon with zero or missing quantity:', addon);
            return;
          }

          // addon.subTotal is VAT-exclusive in Sanity — divide by quantity only
          const unitPrice = round2((addon.subTotal || 0) / (addon.quantity || 1));

          lines.push({
            description: addon.name || 'Additional Item',
            quantity: addon.quantity,
            unitPrice: unitPrice, // VAT-exclusive (Yuki will add 9% VAT)
            glAccount: "80001",
          });
        });
      }
    }

    // Add drinks if applicable (using drinksWithDetails)
    if (orderData.drinksWithDetails && orderData.drinksWithDetails.length > 0) {
      orderData.drinksWithDetails.forEach(drink => {
        lines.push({
          description: drink.name,
          quantity: drink.quantity,
          unitPrice: round2(drink.price), // Already VAT-exclusive from Sanity, round for safety
          glAccount: "80001", // Sales account
        });
      });
    }

    // Delivery cost, VAT-exclusive. The stored PDF amount is the source of truth:
    // invoice snapshots often lack orderDetails.deliveryCost (it lives on the
    // quote's deliveryDetails), which silently dropped delivery from Yuki.
    const deliveryCost = round2(
      typeof amount?.delivery === "number"
        ? amount.delivery
        : orderData.deliveryCost || orderData.deliveryDetails?.deliveryCost || 0
    );

    if (deliveryCost > 0) {
      lines.push({
        description: "Delivery Cost",
        quantity: 1,
        unitPrice: deliveryCost, // VAT-exclusive (Yuki will add 9% VAT)
        glAccount: "80001", // Delivery income account
      });
    }

    // Force Yuki to book exactly the app-computed PDF totals (see ADR 0001).
    // Yuki skips its own per-line amount/VAT calculation when LineAmount and
    // LineVATAmount are supplied, so no "Afrondingsverschil" line is needed.
    lines.forEach((line) => {
      line.lineAmount = round2(line.quantity * line.unitPrice); // net, VAT-exclusive
      line.lineVat = round2(line.lineAmount * 0.09);
    });

    // The customer pays the PDF, so Yuki must book the PDF's net amount exactly.
    // Line items can drift from it (a custom order whose subTotals were stored
    // VAT-inclusive, an upsell the PDF left out). Rather than book a different
    // receivable than the invoice we sent, add one explicit adjustment line and
    // report it, so the difference is visible instead of silently absorbed.
    let amountCorrection = 0;
    if (amount && typeof amount.subtotal === "number") {
      const targetNet = round2(amount.subtotal + deliveryCost);
      const netSum = round2(lines.reduce((s, l) => round2(s + l.lineAmount), 0));
      amountCorrection = round2(targetNet - netSum);
      if (Math.abs(amountCorrection) >= 0.01) {
        console.warn(
          `⚠️  Invoice lines net €${netSum.toFixed(2)} != PDF net €${targetNet.toFixed(2)} — adding adjustment of €${amountCorrection.toFixed(2)}`
        );
        lines.push({
          description: "Adjustment to invoice total",
          quantity: 1,
          unitPrice: amountCorrection,
          glAccount: "80001",
          lineAmount: amountCorrection,
          lineVat: round2(amountCorrection * 0.09),
        });
      } else {
        amountCorrection = 0;
      }
    }

    // Distribute VAT so the sum of line VAT equals the stored PDF VAT exactly.
    // The PDF computes one ceil-rounded VAT figure on the whole invoice, so we
    // push any residual onto the last line rather than let Yuki re-round per line.
    if (amount && typeof amount.vat === "number") {
      const targetVat = round2(amount.vat);
      const vatSum = round2(lines.reduce((s, l) => round2(s + l.lineVat), 0));
      const residual = round2(targetVat - vatSum);
      if (Math.abs(residual) >= 0.005 && lines.length > 0) {
        const last = lines[lines.length - 1];
        last.lineVat = round2(last.lineVat + residual);
      }

      // Validation log: what Yuki will now book vs the stored PDF total
      const netSum = round2(lines.reduce((s, l) => round2(s + l.lineAmount), 0));
      const finalVat = round2(lines.reduce((s, l) => round2(s + l.lineVat), 0));
      const bookedTotal = round2(netSum + finalVat);
      console.log("=== YUKI TOTAL FORCED TO PDF ===");
      console.log(
        `Net: €${netSum.toFixed(2)}  VAT: €${finalVat.toFixed(2)}  Total: €${bookedTotal.toFixed(2)}`
      );
      if (
        typeof amount.total === "number" &&
        Math.abs(bookedTotal - round2(amount.total)) > 0.01
      ) {
        // Never book a receivable that differs from the invoice the customer got.
        throw new Error(
          `Yuki total €${bookedTotal.toFixed(2)} would differ from invoice total €${round2(amount.total).toFixed(2)} — not booking.`
        );
      } else {
        console.log("✓ Yuki total matches stored PDF total exactly");
      }
    }

    // Use delivery date as invoice date when creating on delivery date
    const invoiceDate =
      orderData.deliveryDate || new Date().toISOString().split("T")[0];

    // Calculate due date as 14 days after delivery date
    let dueDate;
    if (orderData.deliveryDate) {
      const deliveryDate = new Date(orderData.deliveryDate + "T00:00:00+02:00");
      const calculatedDueDate = new Date(deliveryDate);
      calculatedDueDate.setDate(deliveryDate.getDate() + PAYMENT_TERM_DAYS);
      dueDate = calculatedDueDate.toISOString().split("T")[0];
    } else {
      // Fallback to the payment term from now if no delivery date
      dueDate = new Date(Date.now() + PAYMENT_TERM_DAYS * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    }

    const invoiceData = {
      contactCode,
      contactData,
      // Reference IS the Yuki invoice number when Process=true. Keep it clean
      // (gapless invoiceNumber, set by the caller) — the customer PO is not put
      // here. Falls back to quoteId until an invoiceNumber is assigned.
      reference: quoteId,
      subject: `Catering Order ${quoteId}`,
      paymentMethod:
        orderData.paymentMethod === "invoice" ? "Bank" : "DirectDebit",
      invoiceDate,
      dueDate,
      lines,
      amountCorrection,
      deliveryDate: orderData.deliveryDate,
      deliveryTime: orderData.deliveryTime,
    };

    return { contactData, invoiceData };
  }

  /**
   * Helper to find sandwich by ID (you'll need to pass sandwichOptions to this)
   */
  findSandwichById(sandwichId, sandwichOptions = []) {
    return sandwichOptions.find((s) => s._id === sandwichId);
  }

  /**
   * Revenue (GL 80001) transactions between two dates (YYYY-MM-DD).
   * @returns {Promise<Array<{contact, date, amount}>>}
   */
  async getRevenueTransactions(startDate, endDate) {
    if (!this.sessionId) {
      await this.authenticate();
    }
    const response = await fetch(`${this.baseUrl}/Accounting.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: '"http://www.theyukicompany.com/GLAccountTransactions"',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
          <soap12:Body>
            <GLAccountTransactions xmlns="http://www.theyukicompany.com/">
              <sessionID>${this.sessionId}</sessionID>
              <administrationID>${this.administrationId}</administrationID>
              <GLAccountCode>80001</GLAccountCode>
              <StartDate>${startDate}T00:00:00</StartDate>
              <EndDate>${endDate}T23:59:59</EndDate>
            </GLAccountTransactions>
          </soap12:Body>
        </soap12:Envelope>`,
    });
    const xml = await response.text();
    if (!response.ok) {
      throw new Error(`GLAccountTransactions failed: ${response.status} ${response.statusText}`);
    }
    const parsed = await parseXmlAsync(xml);
    const txs =
      parsed?.["soap:Envelope"]?.["soap:Body"]?.[0]?.["GLAccountTransactionsResponse"]?.[0]?.[
        "GLAccountTransactionsResult"
      ]?.[0]?.["GLAccountTransactions"]?.[0]?.["GLAccountTransaction"] || [];
    return txs.map((t) => ({
      contact: t.Contact?.[0] || "",
      date: t.Date?.[0] || "",
      amount: parseFloat(t.Amount?.[0] || "0"),
    }));
  }

  /**
   * The Contact service addresses the administration by its domain GUID, not
   * the administration id the other services use.
   */
  async getContactDomainId() {
    if (this.contactDomainId) return this.contactDomainId;
    if (!this.sessionId) {
      await this.authenticate();
    }
    const response = await fetch(`${this.baseUrl}/Contact.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: '"http://www.theyukicompany.com/Domains"',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
          <soap12:Body>
            <Domains xmlns="http://www.theyukicompany.com/">
              <sessionID>${this.sessionId}</sessionID>
            </Domains>
          </soap12:Body>
        </soap12:Envelope>`,
    });
    const xml = await response.text();
    if (!response.ok) {
      throw new Error(`Domains failed: ${response.status} ${response.statusText}`);
    }
    const id = (xml.match(/<Domain ID="([^"]+)"/) || [])[1];
    if (!id) throw new Error("Yuki returned no domain for this access key");
    this.contactDomainId = id;
    return id;
  }

  /**
   * Contacts whose name contains `name`, oldest first. Yuki matches on
   * substrings ("UNS" also finds "Kunststofplatenshop"), so callers must
   * compare names exactly themselves.
   * @returns {Promise<Array<{id, code, name}>>}
   */
  async searchContactsByName(name) {
    if (!name || !name.trim()) return [];
    const domainId = await this.getContactDomainId();
    const escape = (v) =>
      String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const response = await fetch(`${this.baseUrl}/Contact.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: '"http://www.theyukicompany.com/SearchContacts"',
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
          <soap12:Body>
            <SearchContacts xmlns="http://www.theyukicompany.com/">
              <sessionID>${this.sessionId}</sessionID>
              <domainID>${domainId}</domainID>
              <searchOption>Name</searchOption>
              <searchValue>${escape(name.trim())}</searchValue>
              <sortOrder>CreatedAsc</sortOrder>
              <modifiedAfter>2000-01-01T00:00:00</modifiedAfter>
              <active>Active</active>
              <pageNumber>1</pageNumber>
            </SearchContacts>
          </soap12:Body>
        </soap12:Envelope>`,
    });
    const xml = await response.text();
    if (!response.ok) {
      throw new Error(`SearchContacts failed: ${response.status} ${response.statusText}`);
    }
    const parsed = await parseXmlAsync(xml);
    const contacts =
      parsed?.["soap:Envelope"]?.["soap:Body"]?.[0]?.["SearchContactsResponse"]?.[0]?.[
        "SearchContactsResult"
      ]?.[0]?.["Contacts"]?.[0]?.["Contact"] || [];
    const text = (c, k) => (typeof c[k]?.[0] === "string" ? c[k][0].trim() : "");
    return contacts.map((c) => ({
      id: c.$?.ID || null,
      code: text(c, "Code"),
      name:
        [text(c, "FullName"), text(c, "Name"), text(c, "CompanyName")].find(Boolean) ||
        `${text(c, "FirstName")} ${text(c, "LastName")}`.trim(),
    }));
  }

  /**
   * Ask Yuki whether one specific invoice reference exists as an outstanding
   * debtor item. Used to prove a freshly booked invoice really landed.
   * @returns {Promise<boolean>}
   */
  async checkOutstandingItem(reference) {
    if (!this.sessionId) {
      await this.authenticate();
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <CheckOutstandingItem xmlns="http://www.theyukicompany.com/">
            <sessionID>${this.sessionId}</sessionID>
            <Reference>${reference}</Reference>
          </CheckOutstandingItem>
        </soap12:Body>
      </soap12:Envelope>`;

    const response = await fetch(`${this.baseUrl}/Accounting.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: '"http://www.theyukicompany.com/CheckOutstandingItem"',
      },
      body: soapEnvelope,
    });

    const xmlResponse = await response.text();
    if (!response.ok) {
      throw new Error(
        `CheckOutstandingItem failed: ${response.status} ${response.statusText}. Response: ${xmlResponse}`
      );
    }

    const parsed = await parseXmlAsync(xmlResponse);
    const items =
      parsed?.["soap:Envelope"]?.["soap:Body"]?.[0]?.[
        "CheckOutstandingItemResponse"
      ]?.[0]?.["CheckOutstandingItemResult"]?.[0]?.["OutstandingItems"]?.[0]?.[
        "Item"
      ] || [];

    return items.length > 0;
  }

  /**
   * Fetch all outstanding (unpaid/partially-paid) debtor items from Yuki.
   * Each item's `reference` equals the Yuki invoice number (our invoiceNumber).
   * Used for payment reconciliation (see ADR 0002).
   * @returns {Promise<Array<{reference, openAmount, originalAmount, dueDate, contact, documentId}>>}
   */
  async getOutstandingDebtorItems({ includeBankTransactions = false } = {}) {
    if (!this.sessionId) {
      await this.authenticate();
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                       xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <OutstandingDebtorItems xmlns="http://www.theyukicompany.com/">
            <sessionID>${this.sessionId}</sessionID>
            <administrationID>${this.administrationId}</administrationID>
            <includeBankTransactions>${includeBankTransactions}</includeBankTransactions>
            <sortOrder>DateDesc</sortOrder>
          </OutstandingDebtorItems>
        </soap12:Body>
      </soap12:Envelope>`;

    const response = await fetch(`${this.baseUrl}/Accounting.asmx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: '"http://www.theyukicompany.com/OutstandingDebtorItems"',
      },
      body: soapEnvelope,
    });

    const xmlResponse = await response.text();
    if (!response.ok) {
      throw new Error(
        `OutstandingDebtorItems failed: ${response.status} ${response.statusText}. Response: ${xmlResponse}`
      );
    }

    const parsed = await parseXmlAsync(xmlResponse);
    const items =
      parsed?.["soap:Envelope"]?.["soap:Body"]?.[0]?.[
        "OutstandingDebtorItemsResponse"
      ]?.[0]?.["OutstandingDebtorItemsResult"]?.[0]?.[
        "OutstandingDebtorItems"
      ]?.[0]?.["Item"] || [];

    return items.map((it) => ({
      reference: it.Reference?.[0] || null,
      openAmount: parseFloat(it.OpenAmount?.[0] || "0"),
      originalAmount: parseFloat(it.OriginalAmount?.[0] || "0"),
      date: it.Date?.[0] || null,
      dueDate: it.DueDate?.[0] || null,
      contact: it.Contact?.[0] || null,
      contactCode:
        typeof it.ContactCode?.[0] === "string" ? it.ContactCode[0].trim() : "",
      documentId: it.DocumentID?.[0] || null,
      // Bank transactions carry the payer's remittance text here, often with
      // our invoice number or quote id in it.
      description: it.Description?.[0] || "",
    }));
  }
}

/**
 * Creates a Yuki invoice by fetching the latest data from Sanity.
 * This is designed to be called directly from other API routes.
 */
export async function createYukiInvoice(quoteId, invoiceId) {
  console.log(
    `--- Starting Yuki Invoice Creation for Quote ID: ${quoteId} ---`
  );

  try {
    // 1. Validate config
    const { apiKey, adminId } = validateYukiConfig();

    // 2. Fetch the invoice data from Sanity using the invoiceId
    const invoiceDoc = await client.fetch(
      `*[_type == "invoice" && _id == $invoiceId][0]`,
      { invoiceId }
    );

    if (!invoiceDoc) {
      throw new Error(`Invoice document with ID "${invoiceId}" not found.`);
    }

    // 2b. Ensure a gapless invoice number exists (idempotent). This becomes the
    // Yuki <Reference> / invoice number. Safe to call here even if a booking
    // point already minted one — it returns the existing number.
    const invoiceNumber = await assignInvoiceNumber(invoiceDoc);
    invoiceDoc.invoiceNumber = invoiceNumber;

    // 3. Get all products for naming and details
    const sandwichOptions = await client.fetch(PRODUCT_QUERY);

    // 4. Initialize Yuki Client
    const yukiClient = new YukiApiClient(apiKey, adminId);

    // 5. Format data for Yuki API
    const { contactData, invoiceData } = yukiClient.formatInvoiceFromOrderData(
      invoiceDoc.orderDetails,
      quoteId,
      invoiceDoc.amount,
      sandwichOptions
    );

    // The gapless invoice number is the Yuki invoice number (Reference + Process=true).
    invoiceData.reference = invoiceNumber;

    // Add company details if they exist on the invoice document
    if (invoiceDoc.companyDetails) {
      invoiceData.contactData.companyName = invoiceDoc.companyDetails.name;
      invoiceData.contactData.vatNumber = invoiceDoc.companyDetails.companyVAT;
      invoiceData.contactData.isCompany = true;
    }

    // Book onto the customer's existing Yuki contact instead of creating a new
    // one per invoice (which left e.g. 14 separate "Dentsu Creative" contacts).
    const {
      code: contactCode,
      fullName: yukiFullName,
      source: contactSource,
    } = await resolveYukiContactCode(invoiceDoc, yukiClient);
    contactData.contactCode = contactCode;
    invoiceData.contactCode = contactCode;
    if (yukiFullName) {
      // Yuki matches a code-less contact on the exact FullName only.
      contactData.fullName = yukiFullName;
      invoiceData.contactData.fullName = yukiFullName;
    }
    console.log(
      `Yuki contact for ${invoiceNumber}: ${contactCode || `"${yukiFullName}"`} (${contactSource})`
    );

    // 6. Create the invoice in Yuki
    const yukiResult = await yukiClient.createSalesInvoice(invoiceData);

    // 7. Prove it actually landed. Yuki can accept the call and still not book
    // the document; a booked, unpaid invoice always appears as an outstanding
    // debtor item (online-paid ones too, until the payout is matched).
    const verifiedAt = await verifyInvoiceBooked(
      yukiClient,
      invoiceData.reference
    );

    if (!verifiedAt) {
      // Do NOT mark it sent: an unsent invoice must stay visible as such, and
      // reconciliation must never read its absence from Yuki as "paid".
      await client
        .patch(invoiceId)
        .set({
          yukiSent: false,
          yukiError: `Invoice ${invoiceData.reference} was accepted by Yuki but is not present as an outstanding item — treat as NOT booked.`,
          yukiLastAttemptAt: new Date().toISOString(),
        })
        .commit();

      console.error(
        `❌ ${invoiceData.reference} not found in Yuki after creation — marked as not sent.`
      );
      return {
        success: false,
        error: `Yuki did not book invoice ${invoiceData.reference}`,
      };
    }

    console.log(
      `✅ Successfully created and verified Yuki invoice for ${quoteId}.`
    );

    // 8. Update the invoice in Sanity with Yuki details
    await client
      .patch(invoiceId)
      .set({
        yukiSent: true,
        yukiSentAt: new Date().toISOString(),
        yukiVerifiedAt: verifiedAt,
        yukiMissing: false,
        yukiAmountCorrection: invoiceData.amountCorrection || 0,
        yukiContactCode: contactData.contactCode,
        yukiContactName: contactData.fullName,
        yukiInvoiceReference: invoiceData.reference,
        yukiError: null,
        yukiLastAttemptAt: new Date().toISOString(),
      })
      .commit();

    console.log(
      `--- Finished Yuki Invoice Creation for Quote ID: ${quoteId} ---`
    );
    return { success: true, result: yukiResult, verifiedAt };
  } catch (error) {
    console.error(
      `❌ Critical error in createYukiInvoice for quote ${quoteId}:`,
      error
    );
    // Yuki refuses a second invoice with the same number. That is not a
    // failure: the invoice is in Yuki, which is all we wanted to know.
    if (/bestaat al een factuur met het factuurnummer|already exists/i.test(error.message)) {
      try {
        await client
          .patch(invoiceId)
          .set({
            yukiSent: true,
            yukiVerifiedAt: new Date().toISOString(),
            yukiMissing: false,
            yukiError: null,
            yukiLastAttemptAt: new Date().toISOString(),
          })
          .commit();
      } catch (patchError) {
        console.error("Could not record existing Yuki invoice:", patchError);
      }
      console.log(`Invoice for quote ${quoteId} already exists in Yuki — nothing to book.`);
      return { success: true, alreadyBooked: true };
    }

    try {
      await client
        .patch(invoiceId)
        .set({
          yukiSent: false,
          yukiError: String(error.message).slice(0, 1000),
          yukiLastAttemptAt: new Date().toISOString(),
        })
        .commit();
    } catch (patchError) {
      console.error("Could not record Yuki error on invoice:", patchError);
    }
    // Return error so the calling function is aware
    return { success: false, error: error.message };
  }
}

// Booking is normally instant, but give Yuki a few seconds before concluding
// the invoice is missing.
const VERIFY_DELAYS_MS = [0, 3000, 8000];

/**
 * Polls Yuki's outstanding-item list for `reference`.
 * @returns {Promise<string|null>} ISO timestamp of the successful check, or null.
 */
async function verifyInvoiceBooked(yukiClient, reference) {
  for (const delay of VERIFY_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      const found = await yukiClient.checkOutstandingItem(reference);
      if (found) return new Date().toISOString();
      console.warn(`… ${reference} not in Yuki yet (waited ${delay}ms)`);
    } catch (e) {
      console.error(`Verification call failed for ${reference}:`, e.message);
    }
  }
  return null;
}

// "Dentsu Creative B.V." and "dentsu creative" are the same customer.
export function normalizeCustomerName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\bb\.?\s?v\.?(?=\s|$)/g, " ")
    .replace(/\bn\.?\s?v\.?(?=\s|$)/g, " ")
    .replace(/\bstichting\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

// Yuki contacts that receive money on behalf of others. Online payments land on
// the payment provider's contact "Mollie"; Mollie BV is also a customer, and
// both normalise to the same name — never name-match an invoice onto these.
const PAYMENT_PROVIDER_CONTACT_NAMES = new Set(["mollie"]);

/**
 * Finds the Yuki contact this customer's invoice belongs on, so invoice and
 * payment end up on the same contact (Yuki only auto-matches a bank payment
 * to an invoice on the same contact). In order:
 *   1. the code this invoice was booked with before (a verified re-booking)
 *   2. a same-named contact that this customer's bank payments are arriving
 *      on right now (from Yuki's unlinked receipts) — by code if it has one,
 *      else by exact name
 *   2a. the contact an earlier invoice of this customer was name-matched onto
 *   2b. the bookkeeper's own contact: exactly one Yuki contact WITHOUT a code
 *      whose name equals the customer's apart from case, punctuation and
 *      "B.V." — this is where bank payments arrive. Referenced by its exact
 *      FullName with no code; Yuki then only fills that contact's blank
 *      fields and overwrites nothing (per Yuki's sales-invoice XML docs,
 *      which also say name matching only considers contacts without a code).
 *   3. the oldest code used on an earlier invoice for the same VAT number,
 *      invoice e-mail address or company name
 *   4. an existing Yuki contact with exactly this name that has a code
 *   5. a new code
 * @returns {Promise<{code: string, fullName?: string, source: string}>}
 *   `fullName` is set only for step 2 and must be sent verbatim.
 */
export async function resolveYukiContactCode(invoiceDoc, yukiClient) {
  // Only when that earlier booking really happened. A code left behind by a
  // booking Yuki rejected points at a contact that never existed, and would
  // keep the invoice off the contact the customer's payments arrive on.
  if (invoiceDoc.yukiContactCode && invoiceDoc.yukiVerifiedAt) {
    return { code: invoiceDoc.yukiContactCode, source: "this invoice" };
  }

  const name = invoiceDoc.companyDetails?.name || invoiceDoc.orderDetails?.name || "";
  const wantName = normalizeCustomerName(name);
  const wantVat = String(
    invoiceDoc.companyDetails?.companyVAT || invoiceDoc.orderDetails?.companyVAT || ""
  )
    .replace(/\s/g, "")
    .toUpperCase();
  const wantEmail = String(invoiceDoc.orderDetails?.invoiceEmail || "")
    .trim()
    .toLowerCase();

  // Yuki's name search is a substring search; fetch once, reuse below.
  let yukiContacts = [];
  if (wantName) {
    try {
      yukiContacts = await yukiClient.searchContactsByName(name);
    } catch (e) {
      // A failed lookup must not block booking; worst case is one new contact.
      console.warn("Yuki contact lookup failed:", e.message);
    }
  }

  if (wantName && !PAYMENT_PROVIDER_CONTACT_NAMES.has(wantName)) {
    // Best evidence: a contact with this customer's name that bank payments
    // are actually arriving on (seen among Yuki's unlinked receipts). A
    // customer can have several same-named contacts; this is the one that
    // lets Yuki match payment and invoice.
    try {
      const items = await yukiClient.getOutstandingDebtorItems({
        includeBankTransactions: true,
      });
      const paying = items.filter(
        (it) =>
          it.openAmount < 0 &&
          it.contact &&
          normalizeCustomerName(it.contact) === wantName
      );
      const distinct = [
        ...new Map(
          paying.map((it) => [`${it.contactCode}|${it.contact}`, it])
        ).values(),
      ];
      if (distinct.length === 1) {
        const { contact, contactCode } = distinct[0];
        return contactCode
          ? { code: contactCode, source: "contact receiving this customer's payments" }
          : {
              code: "",
              fullName: contact,
              source: "contact receiving this customer's payments (name match)",
            };
      }
    } catch (e) {
      console.warn("Yuki receipt lookup failed:", e.message);
    }

    // Once an invoice for this customer was booked onto a contact by name,
    // stay there: the receipt evidence above disappears as soon as the
    // bookkeeper links the payments.
    const earlierByName = await client.fetch(
      `*[_type == "invoice" && yukiSent == true && defined(yukiVerifiedAt) && defined(yukiContactName) && (!defined(yukiContactCode) || yukiContactCode == "") && _id != $id]{
        yukiContactName, "name": coalesce(companyDetails.name, orderDetails.name)
      } | order(yukiSentAt desc)`,
      { id: invoiceDoc._id }
    );
    const sticky = earlierByName.find(
      (p) => normalizeCustomerName(p.name) === wantName
    );
    if (sticky) {
      return {
        code: "",
        fullName: sticky.yukiContactName,
        source: "same Yuki contact as this customer's earlier invoice",
      };
    }

    const codeless = yukiContacts.filter(
      (c) => !c.code && c.name && normalizeCustomerName(c.name) === wantName
    );
    // Exactly one, or not at all: two candidates means we cannot tell which
    // one the bank payments land on, and a wrong contact is worse than none.
    if (codeless.length === 1) {
      return {
        code: "",
        fullName: codeless[0].name,
        source: "bookkeeper's Yuki contact (name match)",
      };
    }
  }

  const previous = await client.fetch(
    `*[_type == "invoice" && defined(yukiContactCode) && yukiContactCode != "" && yukiSent == true && _id != $id]{
      yukiContactCode, yukiSentAt,
      "name": coalesce(companyDetails.name, orderDetails.name),
      "vat": coalesce(companyDetails.companyVAT, orderDetails.companyVAT),
      "email": orderDetails.invoiceEmail
    } | order(yukiSentAt asc)`,
    { id: invoiceDoc._id }
  );

  const byVat =
    wantVat &&
    previous.find(
      (p) => String(p.vat || "").replace(/\s/g, "").toUpperCase() === wantVat
    );
  if (byVat) return { code: byVat.yukiContactCode, source: "same VAT number" };

  const byEmail =
    wantEmail &&
    previous.find((p) => String(p.email || "").trim().toLowerCase() === wantEmail);
  if (byEmail) return { code: byEmail.yukiContactCode, source: "same invoice e-mail" };

  const byName = wantName && previous.find((p) => normalizeCustomerName(p.name) === wantName);
  if (byName) return { code: byName.yukiContactCode, source: "same company name" };

  const exact = yukiContacts.find(
    (c) => c.code && normalizeCustomerName(c.name) === wantName
  );
  if (wantName && exact) return { code: exact.code, source: "existing Yuki contact" };

  return { code: `CUST-${Date.now()}`, source: "new contact" };
}

// Helper function to generate unique contact code
export function generateContactCode(email, companyName) {
  const base = companyName || email.split("@")[0];
  const timestamp = Date.now().toString().slice(-6);
  return `${base
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6)}${timestamp}`;
}

// Validation helper
export function validateYukiConfig() {
  const apiKey = process.env.YUKI_API_KEY;
  const adminId = process.env.YUKI_ADMINISTRATION_ID;

  if (!apiKey || !adminId) {
    throw new Error(
      "Yuki API credentials not configured. Please set YUKI_API_KEY and YUKI_ADMINISTRATION_ID environment variables."
    );
  }

  return { apiKey, adminId };
}
