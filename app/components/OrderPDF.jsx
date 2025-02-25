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
    display: "flex",
    flexDirection: "row",

    marginBottom: 10,
    paddingLeft: 10,
  },
  sandwichName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 3,
  },
  sandwichDetails: {
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
});

const imageUrl = "/tsb.png";

export const OrderPDF = ({ orderData, quoteId, sandwichOptions = [] }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Offerte</Text>
            <Text style={styles.quoteId}>Referentienummer: {quoteId}</Text>
            <Text style={styles.quoteId}>
              Datum: {new Date().toLocaleDateString("nl-NL")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Image src={imageUrl} style={styles.logo} />
          </View>
        </View>

        {/* Delivery Details */}
        {orderData.deliveryDate && (
          <View style={styles.deliveryDetails}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>
                  {new Date(orderData.deliveryDate).toLocaleDateString("nl-NL")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>{orderData.deliveryTime}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {orderData.street} {orderData.houseNumber}
                  {orderData.houseNumberAddition}
                  {"\n"}
                  {orderData.postalCode} {orderData.city}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Company Details if applicable */}
        {orderData.isCompany && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company Name:</Text>
              <Text style={styles.value}>{orderData.companyName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>VAT Number:</Text>
              <Text style={styles.value}>{orderData.companyVAT}</Text>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Total sandwiches:</Text>
            <Text style={styles.value}>{orderData.totalSandwiches}</Text>
          </View>
        </View>

        {/* Sandwich Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Sandwiches</Text>
          {orderData.selectionType === "custom" ? (
            // Custom selection details with sandwich names
            Object.entries(orderData.customSelection || {}).map(
              ([sandwichId, selections]) => {
                const sandwich = sandwichOptions?.find(
                  (s) => s._id === sandwichId
                );
                return selections.map((selection, index) => (
                  <View
                    key={`${sandwichId}-${index}`}
                    style={styles.sandwichItem}
                  >
                    <Text style={styles.sandwichName}>
                      {sandwich?.name || "Unknown sandwich"}
                    </Text>
                    <View style={styles.sandwichDetails}>
                      <Text>
                        {`${selection.quantity}x - ${selection.breadType ? selection.breadType : ""}`}
                        {selection.sauce !== "geen" &&
                          ` with ${selection.sauce}`}
                      </Text>
                      <Text style={styles.bold}>
                        €{selection.subTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ));
              }
            )
          ) : (
            // Variety selection details
            <View>
              <View style={styles.row}>
                <Text style={styles.label}>Chicken, Meat, Fish:</Text>
                <Text style={styles.value}>
                  {orderData.varietySelection.nonVega} sandwiches
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vegetarian:</Text>
                <Text style={styles.value}>
                  {orderData.varietySelection.vega} sandwiches
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vegan:</Text>
                <Text style={styles.value}>
                  {orderData.varietySelection.vegan} sandwiches
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies or comments</Text>
          <Text style={styles.value}>{orderData.allergies}</Text>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>
              €{calculateSubtotal(orderData).toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT (9%):</Text>
            <Text style={styles.value}>
              €{(calculateSubtotal(orderData) * 0.09).toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, styles.bold]}>Total:</Text>
            <Text style={[styles.value, styles.bold]}>
              €{(calculateSubtotal(orderData) * 1.09).toFixed(2)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Utility function to calculate subtotal
const calculateSubtotal = (orderData) => {
  if (orderData.selectionType === "custom") {
    return Object.values(orderData.customSelection || {})
      .flat()
      .reduce((total, selection) => total + selection.subTotal, 0);
  } else {
    return orderData.totalSandwiches * 6.38; // Assuming €6.38 per sandwich
  }
};

export default OrderPDF;
