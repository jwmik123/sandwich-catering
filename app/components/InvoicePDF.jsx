// app/components/InvoicePDF.js
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: "bold",
  },
  invoiceDetails: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    color: "#6b7280",
  },
  value: {
    width: "70%",
  },
  companyInfo: {
    marginBottom: 20,
  },
  totalSection: {
    marginTop: 20,
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  bold: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    color: "#6b7280",
  },
});

const InvoicePDF = ({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  amount,
  dueDate,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Factuur</Text>
        <View style={styles.invoiceDetails}>
          <Text>Factuurnummer: {quoteId}</Text>
          <Text>Datum: {new Date().toLocaleDateString("nl-NL")}</Text>
          <Text>
            Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
      </View>

      {/* Company Details */}
      <View style={styles.section}>
        <View style={styles.companyInfo}>
          <Text style={styles.sectionTitle}>Van</Text>
          <Text>The Sandwichbar</Text>
          <Text>Voorbeeldstraat 1</Text>
          <Text>1234 AB Amsterdam</Text>
          <Text>BTW: NL123456789B01</Text>
          <Text>KVK: 12345678</Text>
        </View>

        <View style={styles.companyInfo}>
          <Text style={styles.sectionTitle}>Aan</Text>
          <Text>{companyDetails.name}</Text>
          <Text>BTW: {companyDetails.vatNumber}</Text>
          <Text>
            {companyDetails.address.street} {companyDetails.address.houseNumber}
            {companyDetails.address.houseNumberAddition}
          </Text>
          <Text>
            {companyDetails.address.postalCode} {companyDetails.address.city}
          </Text>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bestelling</Text>
        {orderDetails.selectionType === "custom" ? (
          Object.entries(orderDetails.customSelection).map(([_, selections]) =>
            selections.map((selection, index) => (
              <View key={index} style={styles.row}>
                <Text style={styles.value}>
                  {selection.quantity}x - {selection.breadType}
                  {selection.sauce !== "geen" && ` met ${selection.sauce}`}
                </Text>
                <Text>€{selection.subTotal.toFixed(2)}</Text>
              </View>
            ))
          )
        ) : (
          <>
            <View style={styles.row}>
              <Text>
                Kip, Vlees, Vis: {orderDetails.varietySelection.nonVega}{" "}
                broodjes
              </Text>
            </View>
            <View style={styles.row}>
              <Text>
                Vegetarisch: {orderDetails.varietySelection.vega} broodjes
              </Text>
            </View>
            <View style={styles.row}>
              <Text>Vegan: {orderDetails.varietySelection.vegan} broodjes</Text>
            </View>
          </>
        )}
      </View>

      {/* Allergies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergieën of opmerkingen</Text>
        <Text style={styles.value}>{orderDetails.allergies}</Text>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bezorging</Text>
        <Text>
          Datum:{" "}
          {new Date(deliveryDetails.deliveryDate).toLocaleDateString("nl-NL")}
        </Text>
        <Text>Tijd: {deliveryDetails.deliveryTime}</Text>
        <Text>
          Adres: {deliveryDetails.street} {deliveryDetails.houseNumber}
          {deliveryDetails.houseNumberAddition}
        </Text>
        <Text>
          {deliveryDetails.postalCode} {deliveryDetails.city}
        </Text>
      </View>

      {/* Totals */}
      <View style={styles.totalSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotaal:</Text>
          <Text style={styles.value}>€{amount.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>BTW (9%):</Text>
          <Text style={styles.value}>€{amount.vat.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, styles.bold]}>Totaal:</Text>
          <Text style={[styles.value, styles.bold]}>
            €{amount.total.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Betalingsgegevens</Text>
        <Text>IBAN: NL05 INGB 0006 8499 73</Text>
        <Text>T.n.v.: The Sandwich Bar Nassaukade B.V.</Text>
        <Text>O.v.v.: Factuurnummer {quoteId}</Text>
        <Text>
          Vervaldatum: {new Date(dueDate).toLocaleDateString("nl-NL")}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>
          The Sandwich Bar Nassaukade B.V. | Nassaukade 378 H, 1054AD Amsterdam
          | +31 6 40889605
        </Text>
        <Text>
          KVK: 81038739 | BTW: NL861900558B01 | IBAN: NL05 INGB 0006 8499 73
        </Text>
      </View>
    </Page>
  </Document>
);

export default InvoicePDF;
