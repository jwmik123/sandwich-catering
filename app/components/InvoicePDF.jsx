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
    fontFamily: "Helvetica",
    fontSize: 12,
    backgroundColor: "#FFFCF8",
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#4D343F",
    paddingBottom: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    width: "80px",
    height: "80px",
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 600,
    color: "#382628",
  },
  invoiceId: {
    fontSize: 12,
    color: "#4D343F",
    marginBottom: 5,
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 600,
    color: "#382628",
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    fontSize: 12,
    color: "#4D343F",
  },
  value: {
    width: "70%",
    fontSize: 10,
    color: "#382628",
  },
  table: {
    width: "100%",
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4D343F",
    padding: 5,
    borderBottom: 1,
    borderBottomColor: "#382628",
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottom: 1,
    borderBottomColor: "#4D343F",
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: "#382628",
  },
  tableCellBold: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: "#FFFCF8",
  },
  tableCellName: {
    flex: 2,
    fontSize: 12,
    color: "#382628",
  },
  tableCellBoldName: {
    flex: 2,
    fontSize: 12,
    fontWeight: 600,
    color: "#FFFCF8",
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  totalLabel: {
    width: "30%",
    fontSize: 12,
    fontWeight: 600,
    color: "#382628",
  },
  totalValue: {
    width: "70%",
    fontSize: 12,
    color: "#382628",
  },
  companyDetails: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: 1,
    borderTopColor: "#4D343F",
    fontSize: 10,
    color: "#4D343F",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailsColumn: {
    width: "48%",
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

  // Calculate due date as 14 days after delivery date
  const deliveryDate = deliveryDetails?.deliveryDate
    ? new Date(deliveryDetails.deliveryDate + "T00:00:00+02:00")
    : new Date();

  // If we have a delivery date, calculate due date as 14 days after delivery date
  const calculatedDueDate = new Date(deliveryDate);
  calculatedDueDate.setDate(calculatedDueDate.getDate() + 14);
  const finalDueDate = dueDate ? formattedDueDate : calculatedDueDate;

  const today = new Date();

  // Safely get nested values
  const companyName =
    companyDetails?.name || companyDetails?.companyName || "Unknown Company";
  const phoneNumber = companyDetails?.phoneNumber || "";
  const address = companyDetails?.address || {};
  const street = address?.street || "";
  const houseNumber = address?.houseNumber || "";
  const houseNumberAddition = address?.houseNumberAddition || "";
  const postalCode = address?.postalCode || "";
  const city = address?.city || "";

  // Safe delivery details
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
  const imageUrl = {
    uri: `${baseUrl}/tsb-logo-full.png`,
    method: "GET",
  };

  // Create a safe rendering of custom selections
  const renderCustomSelections = () => {
    if (!customSelection || Object.keys(customSelection).length === 0) {
      return (
        <View style={styles.tableRow}>
          <Text style={styles.tableCellName}>No items selected</Text>
          <Text style={styles.tableCell}>-</Text>
          <Text style={styles.tableCell}>-</Text>
          <Text style={styles.tableCell}>-</Text>
          <Text style={styles.tableCell}>-</Text>
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
            <View key={`${sandwichId}-${index}`} style={styles.tableRow}>
              <Text style={styles.tableCellName}>{sandwichName}</Text>
              <Text style={styles.tableCell}>{qty}x</Text>
              <Text style={styles.tableCell}>{breadType}</Text>
              <Text style={styles.tableCell}>
                {sauce !== "geen" ? sauce : "-"}
              </Text>
              <Text style={styles.tableCell}>€{subTotal.toFixed(2)}</Text>
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
            <Text style={styles.invoiceId}>Invoice ID: {quoteId}</Text>
            <Text style={styles.invoiceId}>
              Date: {today.toLocaleDateString("nl-NL")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Image src={imageUrl} style={styles.logo} />
          </View>
        </View>

        {/* Delivery and Payment Details */}
        <View style={styles.detailsContainer}>
          {/* Delivery Details */}
          <View style={styles.detailsColumn}>
            {deliveryDetails.deliveryDate && (
              <View style={styles.deliveryDetails}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Delivery</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Company:</Text>
                    <Text style={styles.value}>{companyName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Phone:</Text>
                    <Text style={styles.value}>
                      {deliveryDetails.phoneNumber || "-"}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Delivery Date:</Text>
                    <Text style={styles.value}>
                      {deliveryDate.toLocaleDateString("nl-NL", {
                        timeZone: "Europe/Amsterdam",
                      })}
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
              </View>
            )}
          </View>

          {/* Payment Information */}
          <View style={styles.detailsColumn}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              <View style={styles.row}>
                <Text style={styles.label}>IBAN:</Text>
                <Text style={styles.value}>NL05 INGB 0006 8499 73</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>BIC:</Text>
                <Text style={styles.value}>INGBNL2A</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.value}>
                  The Sandwich Bar Nassaukade B.V.
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>KvK Number:</Text>
                <Text style={styles.value}>81038739</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>VAT Number:</Text>
                <Text style={styles.value}>NL861900558B01</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Due Date:</Text>
                <Text style={styles.value}>
                  {finalDueDate.toLocaleDateString("nl-NL", {
                    timeZone: "Europe/Amsterdam",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Company Details if applicable */}
        {companyDetails.isCompany && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company Name:</Text>
              <Text style={styles.value}>{companyName}</Text>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order</Text>
          <View style={styles.table}>
            <View>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellBoldName}>Sandwich</Text>
                <Text style={styles.tableCellBold}>Quantity</Text>
                <Text style={styles.tableCellBold}>Bread</Text>
                <Text style={styles.tableCellBold}>Sauce</Text>
                <Text style={styles.tableCellBold}>Price</Text>
              </View>
              {selectionType === "custom" ? (
                renderCustomSelections()
              ) : (
                <>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>
                      Chicken, Meat, Fish
                    </Text>
                    <Text style={styles.tableCell}>
                      {varietySelection.nonVega}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.nonVega * 6.38).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegetarian</Text>
                    <Text style={styles.tableCell}>
                      {varietySelection.vega}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.vega * 6.38).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegan</Text>
                    <Text style={styles.tableCell}>
                      {varietySelection.vegan}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.vegan * 6.38).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies or comments</Text>
          <Text style={styles.value}>{allergies}</Text>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              €{amountData.subtotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (9%):</Text>
            <Text style={styles.totalValue}>€{amountData.vat.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={[styles.totalValue, { fontWeight: 600 }]}>
              €{amountData.total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.companyDetails}>
          <Text>The Sandwich Bar B.V.</Text>
          <Text>Nassaukade 378 H</Text>
          <Text>1054 AD Amsterdam</Text>
          <Text>info@thesandwichbar.nl</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
