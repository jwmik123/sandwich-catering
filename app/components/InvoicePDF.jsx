// app/components/InvoicePDF.jsx - Updated to include sandwich names
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
  invoiceDetails = {},
  companyDetails = {},
  amount = 0,
  dueDate = new Date(),
  sandwichOptions = [], // Add sandwichOptions parameter
  referenceNumber = null, // Add reference number parameter
  fullName = null, // Add fullName parameter for non-business orders
}) => {
  // Defensive coding: ensure all objects exist to prevent null references
  orderDetails = orderDetails || {};
  deliveryDetails = deliveryDetails || {};
  invoiceDetails = invoiceDetails || {};
  companyDetails = companyDetails || {};

  // Function to get sandwich name from ID
  const getSandwichName = (sandwichId) => {
    const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
    return sandwich ? sandwich.name : "Unknown Sandwich";
  };

  // Calculate amounts using PaymentStep.jsx pattern
  const amountData = (() => {
    // If amount is passed as an object with the correct structure, use it
    if (amount && typeof amount === 'object' && amount.total !== undefined) {
      return {
        subtotal: amount.subtotal || 0,
        delivery: amount.delivery || 0,
        vat: amount.vat || 0,
        total: amount.total || 0,
      };
    }

    // Otherwise, calculate from order details using PaymentStep pattern
    let subtotalAmount = 0; // Items only, VAT-exclusive
    if (orderDetails.selectionType === "custom") {
      subtotalAmount = Object.values(orderDetails.customSelection || {})
        .flat()
        .reduce((total, selection) => total + (selection.subTotal || 0), 0);
    } else {
      const totalSandwiches =
        (orderDetails.varietySelection?.vega || 0) +
        (orderDetails.varietySelection?.nonVega || 0) +
        (orderDetails.varietySelection?.vegan || 0);
      subtotalAmount = totalSandwiches * 6.83; // VAT-exclusive
    }

    // Add drinks pricing if drinks are selected
    if (orderDetails.addDrinks && orderDetails.drinks) {
      const drinksTotal = 
        (orderDetails.drinks.verseJus || 0) * 3.62 +  // Fresh juice €3.62 VAT-exclusive
        (orderDetails.drinks.sodas || 0) * 2.71 +     // Sodas €2.71 VAT-exclusive
        (orderDetails.drinks.smoothies || 0) * 3.62;  // Smoothies €3.62 VAT-exclusive
      subtotalAmount += drinksTotal;
    }

    // Delivery cost (VAT-exclusive)
    const deliveryCost = orderDetails.deliveryCost || 0;
    
    // Calculate VAT and total using PaymentStep pattern
    const vatAmount = Math.ceil((subtotalAmount + deliveryCost) * 0.09 * 100) / 100;
    const totalAmount = subtotalAmount + deliveryCost + vatAmount; // Always calculate total correctly

    return {
      subtotal: subtotalAmount,
      delivery: deliveryCost,
      vat: vatAmount,
      total: totalAmount,
    };
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
    companyDetails?.name || companyDetails?.companyName || fullName || "Unknown Company";
  const phoneNumber = companyDetails?.phoneNumber || "";
  const address = companyDetails?.address || {};
  const street = address?.street || "";
  const houseNumber = address?.houseNumber || "";
  const houseNumberAddition = address?.houseNumberAddition || "";
  const postalCode = address?.postalCode || "";
  const city = address?.city || "";

  // Safe delivery details
  const deliveryTime = deliveryDetails?.deliveryTime || "12:00";
  const deliveryStreet = deliveryDetails?.address?.street || street;
  const deliveryHouseNumber =
    deliveryDetails?.address?.houseNumber || houseNumber;
  const deliveryHouseNumberAddition =
    deliveryDetails?.address?.houseNumberAddition || houseNumberAddition;
  const deliveryPostalCode = deliveryDetails?.address?.postalCode || postalCode;
  const deliveryCity = deliveryDetails?.address?.city || city;

  // Safe invoice details
  const invoiceStreet = invoiceDetails?.address?.street || deliveryStreet;
  const invoiceHouseNumber =
    invoiceDetails?.address?.houseNumber || deliveryHouseNumber;
  const invoiceHouseNumberAddition =
    invoiceDetails?.address?.houseNumberAddition || deliveryHouseNumberAddition;
  const invoicePostalCode =
    invoiceDetails?.address?.postalCode || deliveryPostalCode;
  const invoiceCity = invoiceDetails?.address?.city || deliveryCity;

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
          const breadType = selection.breadType || "-";
          const sauce = selection.sauce || "geen";
          const toppings = selection.toppings || [];
          const subTotal = selection.subTotal || 0;

          // Get the sandwich name for display
          const sandwichName = getSandwichName(sandwichId);

          // Find the sandwich to check if it's a drink/breakfast/sweet
          const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
          const shouldShowBreadType = sandwich && !isDrink(sandwich);

          return (
            <View key={`${sandwichId}-${index}`} style={styles.tableRow}>
              <Text style={styles.tableCellName}>{sandwichName}</Text>
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
            {referenceNumber && (
              <Text style={styles.invoiceId}>
                Reference Number: {referenceNumber}
              </Text>
            )}
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

            {/* Payment Information */}
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
                <Text style={styles.tableCellBold}>Toppings</Text>
                <Text style={styles.tableCellBold}>Price</Text>
              </View>
              {selectionType === "custom" ? (
                <>
                  {renderCustomSelections()}
                  {orderDetails?.deliveryCost &&
                    orderDetails.deliveryCost > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableCellName}>Delivery</Text>
                        <Text style={styles.tableCell}>1x</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>
                          €{(orderDetails.deliveryCost || 0).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  {/* Drinks for custom selection */}
                  {orderDetails?.addDrinks && orderDetails.drinks?.verseJus > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Fresh Juice</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.verseJus}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.verseJus * 3.62).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {orderDetails?.addDrinks && orderDetails.drinks?.sodas > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Sodas</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.sodas}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.sodas * 2.71).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {orderDetails?.addDrinks && orderDetails.drinks?.smoothies > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Smoothies</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.smoothies}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.smoothies * 3.62).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
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
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.nonVega * 6.83).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegetarian</Text>
                    <Text style={styles.tableCell}>
                      {varietySelection.vega}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.vega * 6.83).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCellName}>Vegan</Text>
                    <Text style={styles.tableCell}>
                      {varietySelection.vegan}x
                    </Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>-</Text>
                    <Text style={styles.tableCell}>
                      €{(varietySelection.vegan * 6.83).toFixed(2)}
                    </Text>
                  </View>
                  {orderDetails?.deliveryCost &&
                    orderDetails.deliveryCost > 0 && (
                      <View style={styles.tableRow}>
                        <Text style={styles.tableCellName}>Delivery</Text>
                        <Text style={styles.tableCell}>1x</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>-</Text>
                        <Text style={styles.tableCell}>
                          €{(orderDetails.deliveryCost || 0).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  {/* Drinks for variety selection */}
                  {orderDetails?.addDrinks && orderDetails.drinks?.verseJus > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Fresh Juice</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.verseJus}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.verseJus * 3.62).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {orderDetails?.addDrinks && orderDetails.drinks?.sodas > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Sodas</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.sodas}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.sodas * 2.71).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {orderDetails?.addDrinks && orderDetails.drinks?.smoothies > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCellName}>Smoothies</Text>
                      <Text style={styles.tableCell}>{orderDetails.drinks.smoothies}x</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>-</Text>
                      <Text style={styles.tableCell}>
                        €{(orderDetails.drinks.smoothies * 3.62).toFixed(2)}
                      </Text>
                    </View>
                  )}
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
          {amountData.delivery > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery:</Text>
              <Text style={styles.totalValue}>
                €{amountData.delivery.toFixed(2)}
              </Text>
            </View>
          ) : (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery:</Text>
              <Text style={styles.totalValue}>Free</Text>
            </View>
          )}
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
          <Text>The Sandwich Bar Nassaukade B.V.</Text>
          <Text>Nassaukade 378 H</Text>
          <Text>1054 AD Amsterdam</Text>
          <Text>orders@thesandwichbar.nl</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
