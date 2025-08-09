import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { isDrink } from "@/lib/product-helpers";

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
  quoteId: {
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
    fontSize: 12,
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
    color: "#FFFCF8",
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
  sandwichItem: {
    display: "flex",
    flexDirection: "column",
    marginBottom: 10,
    paddingLeft: 10,
  },
  sandwichName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#382628",
    marginBottom: 2,
  },
  sandwichDetails: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    fontSize: 12,
    color: "#382628",
    marginLeft: 10,
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
  bold: {
    fontWeight: 600,
    fontSize: 12,
    color: "#382628",
  },
  deliveryDetails: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "row",
  },
  detailsColumn: {
    flex: 1,
  },
});

export const OrderPDF = ({ orderData, quoteId, sandwichOptions = [] }) => {
  // Safely get nested values
  const companyName =
    orderData.companyDetails?.name ||
    orderData.companyDetails?.companyName ||
    orderData.name ||
    "Unknown Company";
  const phoneNumber = orderData.companyDetails?.phoneNumber || "";
  const address = orderData.companyDetails?.address || {};
  const street = address?.street || "";
  const houseNumber = address?.houseNumber || "";
  const houseNumberAddition = address?.houseNumberAddition || "";
  const postalCode = address?.postalCode || "";
  const city = address?.city || "";

  // Safe delivery details
  const deliveryTime = orderData.deliveryTime || "12:00";
  const deliveryStreet = orderData.street || street;
  const deliveryHouseNumber = orderData.houseNumber || houseNumber;
  const deliveryHouseNumberAddition =
    orderData.houseNumberAddition || houseNumberAddition;
  const deliveryPostalCode = orderData.postalCode || postalCode;
  const deliveryCity = orderData.city || city;

  // Safe invoice details
  const invoiceStreet = orderData.invoiceStreet || deliveryStreet;
  const invoiceHouseNumber =
    orderData.invoiceHouseNumber || deliveryHouseNumber;
  const invoiceHouseNumberAddition =
    orderData.invoiceHouseNumberAddition || deliveryHouseNumberAddition;
  const invoicePostalCode = orderData.invoicePostalCode || deliveryPostalCode;
  const invoiceCity = orderData.invoiceCity || deliveryCity;

  // Safely get the image URL
  const baseUrl =
    process.env.NEXT_PUBLIC_URL || "https://catering.thesandwichbar.nl";
  const imageUrl = {
    uri: `${baseUrl}/tsb-logo-full.png`,
    method: "GET",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Quote</Text>
            <Text style={styles.quoteId}>Quote ID: {quoteId}</Text>
            <Text style={styles.quoteId}>
              Date: {new Date().toLocaleDateString("nl-NL")}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Image src={imageUrl} style={styles.logo} />
          </View>
        </View>

        {/* Delivery and Invoice Details */}
        <View style={styles.detailsContainer}>
          {/* Delivery Details */}
          <View style={styles.detailsColumn}>
            {orderData.deliveryDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Delivery</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Date:</Text>
                  <Text style={styles.value}>
                    {new Date(orderData.deliveryDate).toLocaleDateString(
                      "nl-NL"
                    )}
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
            )}
          </View>

          {/* Invoice Details */}
          <View style={styles.detailsColumn}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invoice Address</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Company:</Text>
                <Text style={styles.value}>{companyName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {invoiceStreet} {invoiceHouseNumber}
                  {invoiceHouseNumberAddition}
                  {"\n"}
                  {invoicePostalCode} {invoiceCity}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Company Details if applicable */}
        {orderData.isCompany && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company Name:</Text>
              <Text style={styles.value}>{companyName}</Text>
            </View>
            {orderData.companyVAT && (
              <View style={styles.row}>
                <Text style={styles.label}>VAT Number:</Text>
                <Text style={styles.value}>{orderData.companyVAT}</Text>
              </View>
            )}
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
                <Text style={styles.tableCellBold}>Toppings</Text>
                <Text style={styles.tableCellBold}>Price</Text>
              </View>
              {orderData.selectionType === "custom" ? (
                Object.entries(orderData.customSelection || {}).map(
                  ([sandwichId, selections]) => {
                    if (!Array.isArray(selections)) return null;

                    return selections.map((selection, index) => {
                      if (!selection) return null;

                      const qty = selection.quantity || 0;
                      const breadType = selection.breadType || "-";
                      const sauce = selection.sauce || "geen";
                      const toppings = selection.toppings || [];
                      const subTotal = selection.subTotal || 0;

                      // Get the sandwich name for display
                      const sandwich = sandwichOptions.find(
                        (s) => s._id === sandwichId
                      );
                      const sandwichName = sandwich
                        ? sandwich.name
                        : "Unknown Sandwich";

                      // Check if we should show bread type for this item
                      const shouldShowBreadType =
                        sandwich && !isDrink(sandwich);

                      return (
                        <View
                          key={`${sandwichId}-${index}`}
                          style={styles.tableRow}
                        >
                          <Text style={styles.tableCellName}>
                            {sandwichName}
                          </Text>
                          <Text style={styles.tableCell}>{qty}x</Text>
                          <Text style={styles.tableCell}>
                            {shouldShowBreadType ? breadType : "-"}
                          </Text>
                          <Text style={styles.tableCell}>
                            {sauce !== "geen" ? sauce : "-"}
                          </Text>
                          <Text style={styles.tableCell}>
                            {toppings.length > 0 ? toppings.join(", ") : "-"}
                          </Text>
                          <Text style={styles.tableCell}>
                            €{subTotal.toFixed(2)}
                          </Text>
                        </View>
                      );
                    });
                  }
                )
              ) : (
                <>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>
                      Chicken, Meat, Fish
                    </Text>
                    <Text style={styles.tableCell}>
                      {orderData.varietySelection?.nonVega || 0}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €
                      {(
                        (orderData.varietySelection?.nonVega || 0) * 6.83
                      ).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegetarian</Text>
                    <Text style={styles.tableCell}>
                      {orderData.varietySelection?.vega || 0}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €
                      {((orderData.varietySelection?.vega || 0) * 6.83).toFixed(
                        2
                      )}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegan</Text>
                    <Text style={styles.tableCell}>
                      {orderData.varietySelection?.vegan || 0}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €
                      {(
                        (orderData.varietySelection?.vegan || 0) * 6.83
                      ).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Drinks section */}
        {orderData.addDrinks && (orderData.drinks?.verseJus > 0 || orderData.drinks?.sodas > 0 || orderData.drinks?.smoothies > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drinks</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>Item</Text>
                <Text style={styles.tableHeaderCell}>Quantity</Text>
                <Text style={styles.tableHeaderCell}>Price</Text>
                <Text style={styles.tableHeaderCell}>Total</Text>
              </View>
              <View style={styles.tableBody}>
                {orderData.drinks?.verseJus > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Fresh Juice</Text>
                    <Text style={styles.tableCell}>{orderData.drinks.verseJus}x</Text>
                    <Text style={styles.tableCell}>€3.62</Text>
                    <Text style={styles.tableCell}>
                      €{(orderData.drinks.verseJus * 3.62).toFixed(2)}
                    </Text>
                  </View>
                )}
                {orderData.drinks?.sodas > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Sodas</Text>
                    <Text style={styles.tableCell}>{orderData.drinks.sodas}x</Text>
                    <Text style={styles.tableCell}>€2.71</Text>
                    <Text style={styles.tableCell}>
                      €{(orderData.drinks.sodas * 2.71).toFixed(2)}
                    </Text>
                  </View>
                )}
                {orderData.drinks?.smoothies > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Smoothies</Text>
                    <Text style={styles.tableCell}>{orderData.drinks.smoothies}x</Text>
                    <Text style={styles.tableCell}>€3.62</Text>
                    <Text style={styles.tableCell}>
                      €{(orderData.drinks.smoothies * 3.62).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies or comments</Text>
          <Text style={styles.value}>
            {orderData.allergies || "None specified"}
          </Text>
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              €{calculateSubtotal(orderData).toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (9%):</Text>
            <Text style={styles.totalValue}>
              €{(calculateSubtotal(orderData) * 0.09).toFixed(2)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={[styles.totalValue, { fontWeight: 600 }]}>
              €{(calculateSubtotal(orderData) * 1.09).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.companyDetails}>
          <Text>The Sandwich Bar Nassaukade B.V.</Text>
          <Text>Nassaukade 378 H</Text>
          <Text>1054 AD Amsterdam</Text>
          <Text>orders@thesandwichbar.nl</Text>
        </View>
      </Page>
    </Document>
  );
};

// Utility function to calculate subtotal
const calculateSubtotal = (orderData) => {
  let subtotal = 0;
  
  if (orderData.selectionType === "custom") {
    subtotal = Object.values(orderData.customSelection || {})
      .flat()
      .reduce((total, selection) => total + selection.subTotal, 0);
  } else {
    subtotal = orderData.totalSandwiches * 6.83; // Assuming €6.83 per sandwich
  }
  
  // Add drinks pricing if drinks are selected
  if (orderData.addDrinks && orderData.drinks) {
    const drinksTotal = 
      (orderData.drinks.verseJus || 0) * 3.62 +  // Fresh juice €3.62
      (orderData.drinks.sodas || 0) * 2.71 +     // Sodas €2.71
      (orderData.drinks.smoothies || 0) * 3.62;  // Smoothies €3.62
    subtotal += drinksTotal;
  }
  
  return subtotal;
};

export default OrderPDF;
