// app/components/InvoicePDF.js
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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
  headerLeft: {
    // Added from OrderPDF
  },
  headerRight: {
    // Added from OrderPDF
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
  invoiceId: {
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
  companyInfo: {
    marginBottom: 20,
  },
  companyDetails: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
  orderItem: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 10,
    paddingLeft: 10,
  },
  orderDetails: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    fontSize: 12,
    color: "#4b5563",
    marginLeft: 10,
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
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    color: "#6b7280",
    borderTop: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

const imageUrl = {
  uri: `${process.env.NEXT_PUBLIC_URL || "https://catering.thesandwichbar.nl"}/tsb.png`,
};

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
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Invoice</Text>
          <Text style={styles.invoiceId}>Invoice Number: {quoteId}</Text>
          <Text style={styles.invoiceId}>
            Date: {new Date().toLocaleDateString("nl-NL")}
          </Text>
          <Text style={styles.invoiceId}>
            Due Date: {new Date(dueDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Image src={imageUrl} style={styles.logo} />
        </View>
      </View>

      {/* Company Details */}
      <View style={styles.companyDetails}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>The Sandwichbar</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              Nassaukade 378 H,{"\n"} 1054AD Amsterdam
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT:</Text>
            <Text style={styles.value}>NL123456789B01</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>KVK:</Text>
            <Text style={styles.value}>81038739</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{companyDetails.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT:</Text>
            <Text style={styles.value}>{companyDetails.vatNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {companyDetails.address.street}{" "}
              {companyDetails.address.houseNumber}
              {companyDetails.address.houseNumberAddition}
              {"\n"}
              {companyDetails.address.postalCode} {companyDetails.address.city}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order</Text>
        {orderDetails.selectionType === "custom" ? (
          Object.entries(orderDetails.customSelection).map(
            ([sandwichId, selections]) =>
              selections.map((selection, index) => (
                <View key={`${sandwichId}-${index}`} style={styles.orderItem}>
                  <View style={styles.orderDetails}>
                    <Text>
                      {selection.quantity}x - {selection.breadType}
                      {selection.sauce !== "geen" && ` met ${selection.sauce}`}
                    </Text>
                    <Text style={styles.bold}>
                      €{selection.subTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))
          )
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Chicken, Meat, Fish:</Text>
              <Text style={styles.value}>
                {orderDetails.varietySelection.nonVega} sandwiches
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Vegetarian:</Text>
              <Text style={styles.value}>
                {orderDetails.varietySelection.vega} sandwiches
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Vegan:</Text>
              <Text style={styles.value}>
                {orderDetails.varietySelection.vegan} sandwiches
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Allergies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Allergies or comments</Text>
        <Text style={styles.value}>{orderDetails.allergies}</Text>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {new Date(deliveryDetails.deliveryDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{deliveryDetails.deliveryTime}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>
            {deliveryDetails.street} {deliveryDetails.houseNumber}
            {deliveryDetails.houseNumberAddition}
            {"\n"}
            {deliveryDetails.postalCode} {deliveryDetails.city}
          </Text>
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal:</Text>
          <Text style={styles.value}>€{amount.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VAT (9%):</Text>
          <Text style={styles.value}>€{amount.vat.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, styles.bold]}>Total:</Text>
          <Text style={[styles.value, styles.bold]}>
            €{amount.total.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>IBAN:</Text>
          <Text style={styles.value}>NL05 INGB 0006 8499 73</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>The Sandwich Bar Nassaukade B.V.</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>O.v.v.:</Text>
          <Text style={styles.value}>Invoice Number {quoteId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Date:</Text>
          <Text style={styles.value}>
            {new Date(dueDate).toLocaleDateString("nl-NL")}
          </Text>
        </View>
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
