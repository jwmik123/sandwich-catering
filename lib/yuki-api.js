// lib/yuki-api.js
import { parseString } from "xml2js";
import { promisify } from "util";

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

    // Generate invoice lines XML
    const invoiceLines = invoiceData.lines
      .map(
        (line) => `
      <InvoiceLine>
        <Description>${escapeXml(line.description)}</Description>
        <ProductQuantity>${line.quantity}</ProductQuantity>
        <Product>
          <Description>${escapeXml(line.description)}</Description>
          <Reference>PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}</Reference>
          <Category xsi:nil="true" />
          <SalesPrice>${line.unitPrice.toFixed(2)}</SalesPrice>
          <VATPercentage>${line.vatPercentage}.00</VATPercentage>
          <VATIncluded>false</VATIncluded>
          <VATType>2</VATType>
          <GLAccountCode>${line.glAccount || "8000"}</GLAccountCode>
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
   */
  formatInvoiceFromOrderData(orderData, quoteId, invoiceAmount) {
    const contactCode = `CUST-${Date.now()}`;

    // Create contact data
    const contactData = {
      contactCode,
      fullName: orderData.name || "Unknown Customer",
      companyName: orderData.companyName || null,
      email: orderData.email,
      isCompany: !orderData.isCompany, // Note: your app uses isCompany=false for business
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

    if (orderData.selectionType === "custom") {
      // Process custom selections - prices are already VAT-exclusive
      Object.entries(orderData.customSelection || {}).forEach(
        ([sandwichId, selections]) => {
          selections.forEach((selection) => {
            const sandwich = this.findSandwichById(sandwichId);
            // selection.subTotal is VAT-exclusive, so unitPrice is also VAT-exclusive
            lines.push({
              description: `${sandwich?.name || "Unknown Sandwich"} - ${selection.breadType} ${selection.sauce !== "geen" ? `with ${selection.sauce}` : ""}`,
              quantity: selection.quantity,
              unitPrice: selection.subTotal / selection.quantity, // VAT-exclusive unit price
              vatCode: "NL_21", // Standard VAT rate for food
              vatPercentage: 9,
              glAccount: "8000", // Sales account
            });
          });
        }
      );
    } else {
      // Process variety selection - convert to VAT-exclusive price
      const varietyTypes = [
        { key: "nonVega", name: "Chicken, Meat, Fish" },
        { key: "vega", name: "Vegetarian" },
        { key: "vegan", name: "Vegan" },
      ];

      varietyTypes.forEach((type) => {
        const quantity = orderData.varietySelection?.[type.key] || 0;
        if (quantity > 0) {
          lines.push({
            description: `${type.name} Sandwiches`,
            quantity,
            unitPrice: 5.92, // VAT-exclusive price (€6.38 incl. VAT = €5.92 excl. VAT at 9%)
            vatCode: "NL_21",
            vatPercentage: 9,
            glAccount: "8000",
          });
        }
      });
    }

    // Add delivery cost if applicable - delivery cost is VAT-exclusive
    if (orderData.deliveryCost && orderData.deliveryCost > 0) {
      lines.push({
        description: "Delivery Cost",
        quantity: 1,
        unitPrice: orderData.deliveryCost, // VAT-exclusive delivery cost
        vatCode: "NL_21",
        vatPercentage: 9,
        glAccount: "8100", // Delivery income account
      });
    }

    const invoiceDate = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const invoiceData = {
      contactCode,
      contactData,
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
