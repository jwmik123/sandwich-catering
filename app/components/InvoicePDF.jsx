// app/components/InvoicePDF.jsx - Updated to include sandwich names
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
    flexDirection: "column",
    marginBottom: 10,
    paddingLeft: 10,
  },
  sandwichName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
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

// Fallback image URL in case the environment variable is missing
const DEFAULT_IMAGE_URL = "https://catering.thesandwichbar.nl/tsb.png";

const InvoicePDF = ({
  quoteId = "UNKNOWN",
  orderDetails = {},
  deliveryDetails = {},
  companyDetails = {},
  amount = 0,
  dueDate = new Date(),
  sandwichOptions = [], // Add sandwichOptions parameter
}) => {
  // Defensive coding: ensure all objects exist to prevent null references
  orderDetails = orderDetails || {};
  deliveryDetails = deliveryDetails || {};
  companyDetails = companyDetails || {};

  // Function to get sandwich name from ID
  const getSandwichName = (sandwichId) => {
    const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
    return sandwich ? sandwich.name : "Unknown Sandwich";
  };

  // Safely process the amount to ensure it always has the correct structure
  const amountData = (() => {
    if (typeof amount === "number") {
      return {
        total: amount || 0,
        subtotal: (amount || 0) / 1.09,
        vat: (amount || 0) - (amount || 0) / 1.09,
      };
    } else if (amount && typeof amount === "object") {
      return {
        total: amount.total || 0,
        subtotal: amount.subtotal || (amount.total || 0) / 1.09,
        vat: amount.vat || (amount.total || 0) - (amount.total || 0) / 1.09,
      };
    }
    return { total: 0, subtotal: 0, vat: 0 };
  })();

  // Handle properly formatted dates or create defaults
  const formattedDueDate = dueDate
    ? new Date(dueDate)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const today = new Date();

  // Safely get nested values
  const companyName = companyDetails?.name || "Unknown Company";
  const vatNumber = companyDetails?.vatNumber || "N/A";
  const address = companyDetails?.address || {};
  const street = address?.street || "";
  const houseNumber = address?.houseNumber || "";
  const houseNumberAddition = address?.houseNumberAddition || "";
  const postalCode = address?.postalCode || "";
  const city = address?.city || "";

  // Safe delivery details
  const deliveryDate = deliveryDetails?.deliveryDate
    ? new Date(deliveryDetails.deliveryDate)
    : new Date();
  const deliveryTime = deliveryDetails?.deliveryTime || "12:00";
  const deliveryStreet = deliveryDetails?.street || street;
  const deliveryHouseNumber = deliveryDetails?.houseNumber || houseNumber;
  const deliveryHouseNumberAddition =
    deliveryDetails?.houseNumberAddition || houseNumberAddition;
  const deliveryPostalCode = deliveryDetails?.postalCode || postalCode;
  const deliveryCity = deliveryDetails?.city || city;

  // Ensure selection properties exist
  const selectionType = orderDetails?.selectionType || "custom";
  const customSelection = orderDetails?.customSelection || {};
  const varietySelection = orderDetails?.varietySelection || {
    vega: 0,
    nonVega: 0,
    vegan: 0,
  };
  const allergies = orderDetails?.allergies || "None specified";

  // Safely get the image URL
  const baseUrl =
    process.env.NEXT_PUBLIC_URL || "https://catering.thesandwichbar.nl";
  const imageUrl = { uri: `${baseUrl}/tsb.png` };

  // Create a safe rendering of custom selections
  const renderCustomSelections = () => {
    if (!customSelection || Object.keys(customSelection).length === 0) {
      return (
        <View style={styles.orderItem}>
          <View style={styles.orderDetails}>
            <Text>No items selected</Text>
          </View>
        </View>
      );
    }

    // Safely iterate through selections
    return Object.entries(customSelection).map(
      ([sandwichId, selections], sandwichIndex) => {
        if (!Array.isArray(selections)) return null;

        return selections.map((selection, index) => {
          if (!selection) return null;

          const qty = selection.quantity || 0;
          const breadType = selection.breadType || "Unknown bread";
          const sauce = selection.sauce || "geen";
          const subTotal = selection.subTotal || 0;

          // Get the sandwich name for display
          const sandwichName = getSandwichName(sandwichId);

          return (
            <View key={`${sandwichId}-${index}`} style={styles.orderItem}>
              <Text style={styles.sandwichName}>{sandwichName}</Text>
              <View style={styles.orderDetails}>
                <Text>
                  {qty}x - {breadType}
                  {sauce !== "geen" && ` with ${sauce}`}
                </Text>
                <Text style={styles.bold}>€{subTotal.toFixed(2)}</Text>
              </View>
            </View>
          );
        });
      }
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceId}>Invoice Number: {quoteId}</Text>
            <Text style={styles.invoiceId}>
              Date: {today.toLocaleDateString("nl-NL")}
            </Text>
            <Text style={styles.invoiceId}>
              Due Date: {formattedDueDate.toLocaleDateString("nl-NL")}
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
              <Text style={styles.value}>{companyName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>VAT:</Text>
              <Text style={styles.value}>{vatNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>
                {street} {houseNumber}
                {houseNumberAddition}
                {"\n"}
                {postalCode} {city}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order</Text>
          {selectionType === "custom" ? (
            renderCustomSelections()
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Chicken, Meat, Fish:</Text>
                <Text style={styles.value}>
                  {varietySelection.nonVega || 0} sandwiches
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vegetarian:</Text>
                <Text style={styles.value}>
                  {varietySelection.vega || 0} sandwiches
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vegan:</Text>
                <Text style={styles.value}>
                  {varietySelection.vegan || 0} sandwiches
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies or comments</Text>
          <Text style={styles.value}>{allergies}</Text>
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {deliveryDate.toLocaleDateString("nl-NL")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{deliveryTime}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {deliveryStreet} {deliveryHouseNumber}
              {deliveryHouseNumberAddition}
              {"\n"}
              {deliveryPostalCode} {deliveryCity}
            </Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>€{amountData.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT (9%):</Text>
            <Text style={styles.value}>€{amountData.vat.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, styles.bold]}>Total:</Text>
            <Text style={[styles.value, styles.bold]}>
              €{amountData.total.toFixed(2)}
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
              {formattedDueDate.toLocaleDateString("nl-NL")}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            The Sandwich Bar Nassaukade B.V. | Nassaukade 378 H, 1054AD
            Amsterdam | +31 6 40889605
          </Text>
          <Text>
            KVK: 81038739 | BTW: NL861900558B01 | IBAN: NL05 INGB 0006 8499 73
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
