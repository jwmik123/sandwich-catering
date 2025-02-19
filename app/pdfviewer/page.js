"use client";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  PDFViewer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    width: "50px",
    height: "50px",
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  quoteId: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    fontSize: 12,
    color: "#6b7280",
  },
  value: {
    width: "70%",
    fontSize: 12,
  },
  sandwichItem: {
    marginBottom: 10,
    paddingLeft: 10,
  },
  totalSection: {
    marginTop: 20,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  bold: {
    fontWeight: "bold",
    fontSize: 12,
  },
  deliveryDetails: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
});

export const PagePDF = () => {
  const orderData = {
    // Basic Order Info
    quoteId: "Q2024-001",
    numberOfPeople: 20,
    sandwichesPerPerson: 2,
    totalSandwiches: 40,

    // Selection Type - change between "custom" and "variety" to test both views
    selectionType: "custom",

    // Custom Selection Example
    customSelection: {
      "sandwich-1": [
        {
          quantity: 10,
          breadType: "Wit Stokbrood met Gerookte Kip",
          sauce: "mayonaise",
          subTotal: 55.0,
        },
        {
          quantity: 8,
          breadType: "Meergranen Stokbrood met Tonijnsalade",
          sauce: "geen",
          subTotal: 44.0,
        },
      ],
      "sandwich-2": [
        {
          quantity: 12,
          breadType: "Ciabatta met Carpaccio",
          sauce: "truffelmayonaise",
          subTotal: 72.0,
        },
        {
          quantity: 10,
          breadType: "Waldkorn met Geitenkaas",
          sauce: "honing-mosterd",
          subTotal: 55.0,
        },
      ],
    },

    // Variety Selection Example
    varietySelection: {
      nonVega: 25,
      vega: 10,
      vegan: 5,
    },

    // Delivery Details
    deliveryDate: "2024-03-01",
    deliveryTime: "12:30",
    street: "Hoofdstraat",
    houseNumber: "123",
    houseNumberAddition: "A",
    postalCode: "1234 AB",
    city: "Amsterdam",

    // Company Details
    isCompany: true,
    companyName: "TechCorp BV",
    companyVAT: "NL123456789B01",
  };
  return (
    <PDFViewer width="100%" height="1000px">
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Offerte</Text>
              <Text style={styles.quoteId}>Referentienummer: Qsdbwqe123</Text>
              <Text style={styles.quoteId}>
                Datum: {new Date().toLocaleDateString("nl-NL")}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Image src="/tsb.png" style={styles.logo} />
            </View>
          </View>
          {/* Delivery Details */}
          <View style={styles.deliveryDetails}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bezorging</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Datum:</Text>
                <Text style={styles.value}>
                  {new Date(orderData.deliveryDate).toLocaleDateString("nl-NL")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Tijd:</Text>
                <Text style={styles.value}>{orderData.deliveryTime}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Adres:</Text>
                <Text style={styles.value}>
                  {orderData.street} {orderData.houseNumber}
                  {orderData.houseNumberAddition}
                  {"\n"}
                  {orderData.postalCode} {orderData.city}
                </Text>
              </View>
            </View>

            {/* Company Details if applicable */}
            {orderData.isCompany && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bedrijfsgegevens</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Bedrijfsnaam:</Text>
                  <Text style={styles.value}>{orderData.companyName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>BTW-nummer:</Text>
                  <Text style={styles.value}>{orderData.companyVAT}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Order Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bestelling</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Aantal personen:</Text>
              <Text style={styles.value}>20</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Broodjes per persoon:</Text>
              <Text style={styles.value}>2</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Totaal broodjes:</Text>
              <Text style={styles.value}>40</Text>
            </View>
          </View>

          {/* Sandwich Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Geselecteerde Broodjes</Text>
            {orderData.selectionType === "custom" ? (
              // Custom selection details
              Object.entries(orderData.customSelection || {}).map(
                ([sandwichId, selections]) =>
                  selections.map((selection, index) => (
                    <View
                      key={`${sandwichId}-${index}`}
                      style={styles.sandwichItem}
                    >
                      <View style={styles.row}>
                        <Text style={styles.value}>
                          {`${selection.quantity}x - ${selection.breadType}`}
                          {selection.sauce !== "geen" &&
                            ` met ${selection.sauce}`}
                        </Text>
                        <Text style={styles.bold}>
                          €{selection.subTotal.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))
              )
            ) : (
              // Variety selection details
              <View>
                <View style={styles.row}>
                  <Text style={styles.label}>Kip, Vlees, Vis:</Text>
                  <Text style={styles.value}>
                    {orderData.varietySelection.nonVega} broodjes
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Vegetarisch:</Text>
                  <Text style={styles.value}>
                    {orderData.varietySelection.vega} broodjes
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Vegan:</Text>
                  <Text style={styles.value}>
                    {orderData.varietySelection.vegan} broodjes
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Totals */}
          <View style={styles.totalSection}>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotaal:</Text>
              <Text style={styles.value}>
                €{calculateSubtotal(orderData).toFixed(2)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>BTW (9%):</Text>
              <Text style={styles.value}>
                €{(calculateSubtotal(orderData) * 0.09).toFixed(2)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, styles.bold]}>Totaal:</Text>
              <Text style={[styles.value, styles.bold]}>
                €{(calculateSubtotal(orderData) * 1.09).toFixed(2)}
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
};

// Utility function to calculate subtotal
const calculateSubtotal = (orderData) => {
  if (orderData.selectionType === "custom") {
    return Object.values(orderData.customSelection || {})
      .flat()
      .reduce((total, selection) => total + selection.subTotal, 0);
  } else {
    // For variety selection, you'll need to implement pricing logic
    // This is a placeholder
    return orderData.totalSandwiches * 5.5; // Assuming €5 per sandwich
  }
};

export default PagePDF;
