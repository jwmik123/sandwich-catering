// lib/yuki-api.js
import { GLUTEN_FREE_SURCHARGE } from "@/app/assets/constants";
import { parseString } from "xml2js";
import { promisify } from "util";
import { isDrink } from "./product-helpers";
import { client } from "@/sanity/lib/client";
import { PRODUCT_QUERY } from "@/sanity/lib/queries";
import { round2 } from "./vat-calculations";
import { assignInvoiceNumber } from "./invoice-number";

const parseXmlAsync = promisify(parseString);

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
          <EmailAddress>${escapeXml(contactData.email)}</EmailAddress>
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
            <ContactCode>${escapeXml(invoiceData.contactCode)}</ContactCode>
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
            <EmailAddress>${escapeXml(invoiceData.contactData.email)}</EmailAddress>
            <Website />
            <CoCNumber />
            ${invoiceData.contactData.vatNumber ? `<VATNumber>${escapeXml(invoiceData.contactData.vatNumber)}</VATNumber>` : "<VATNumber />"}
            <ContactType>Person</ContactType>
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

      console.log("Invoice creation successful:", xmlResponse);
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
      email: orderData.email,
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

    // Add delivery cost if applicable - check multiple possible locations
    // Delivery cost should be VAT-exclusive (it's stored that way in the system)
    const deliveryCost = round2(orderData.deliveryCost ||
                         orderData.deliveryDetails?.deliveryCost ||
                         0);

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
        Math.abs(bookedTotal - round2(amount.total)) > 0.005
      ) {
        console.warn(
          `⚠️  Yuki booked total €${bookedTotal.toFixed(2)} != stored total €${round2(amount.total).toFixed(2)}`
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
      calculatedDueDate.setDate(deliveryDate.getDate() + 14);
      dueDate = calculatedDueDate.toISOString().split("T")[0];
    } else {
      // Fallback to 14 days from now if no delivery date
      dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
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
   * Fetch all outstanding (unpaid/partially-paid) debtor items from Yuki.
   * Each item's `reference` equals the Yuki invoice number (our invoiceNumber).
   * Used for payment reconciliation (see ADR 0002).
   * @returns {Promise<Array<{reference, openAmount, originalAmount, dueDate, contact, documentId}>>}
   */
  async getOutstandingDebtorItems() {
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
            <includeBankTransactions>false</includeBankTransactions>
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
      dueDate: it.DueDate?.[0] || null,
      contact: it.Contact?.[0] || null,
      documentId: it.DocumentID?.[0] || null,
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

    // 6. Create the invoice in Yuki
    const yukiResult = await yukiClient.createSalesInvoice(invoiceData);
    console.log(`✅ Successfully created Yuki invoice for ${quoteId}.`);

    // 7. Update the invoice in Sanity with Yuki details
    await client
      .patch(invoiceId)
      .set({
        yukiSent: true,
        yukiSentAt: new Date().toISOString(),
        yukiContactCode: contactData.contactCode,
        yukiInvoiceReference: invoiceData.reference,
      })
      .commit();

    console.log(
      `--- Finished Yuki Invoice Creation for Quote ID: ${quoteId} ---`
    );
    return { success: true, result: yukiResult };
  } catch (error) {
    console.error(
      `❌ Critical error in createYukiInvoice for quote ${quoteId}:`,
      error
    );
    // Return error so the calling function is aware
    return { success: false, error: error.message };
  }
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
