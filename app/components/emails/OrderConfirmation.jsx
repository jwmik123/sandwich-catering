import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Preview,
  Section,
} from "@react-email/components";
import { isDrink } from "@/lib/product-helpers";
import { DRINK_PRICES, GLUTEN_FREE_SURCHARGE } from "@/app/assets/constants";

export default function OrderConfirmation({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  totalAmount, // This should be VAT-exclusive subtotal
  fullName,
  sandwichOptions = [],
  referenceNumber = null,
  amount = null, // New: prefer amount object if provided
}) {
  // Helper function to check if bread type should be shown
  const shouldShowBreadType = (sandwichId, breadType) => {
    const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
    return sandwich && !isDrink(sandwich) && breadType;
  };

  // This function calculates the subtotal (VAT-exclusive) for the order.
  // It expects an orderDetails object as used in this component.
  const calculateSubtotal = (orderDetails) => {
    let subtotal = 0;

    if (!orderDetails) return 0;

    if (orderDetails.selectionType === "custom") {
      subtotal = Object.values(orderDetails.customSelection || {})
        .flat()
        .reduce((total, selection) => total + (selection.subTotal || 0), 0);
    } else {
      // Calculate based on actual selected quantities
      const regularSandwiches =
        (orderDetails.varietySelection?.vega || 0) +
        (orderDetails.varietySelection?.nonVega || 0) +
        (orderDetails.varietySelection?.vegan || 0);

      subtotal = regularSandwiches * 6.83; // €6.83 per sandwich

      // Add gluten-free with full price (base + surcharge)
      if (orderDetails.varietySelection?.glutenFree > 0) {
        subtotal += orderDetails.varietySelection.glutenFree * (6.83 + GLUTEN_FREE_SURCHARGE);
      }
    }

    // Add drinks pricing if drinks are selected
    if (orderDetails.addDrinks && orderDetails.drinks) {
      const drinksTotal =
        ((orderDetails.drinks.freshOrangeJuice || orderDetails.drinks.verseJus) || 0) * DRINK_PRICES.FRESH_ORANGE_JUICE +
        (orderDetails.drinks.sodas || 0) * DRINK_PRICES.SODAS +
        (orderDetails.drinks.smoothies || 0) * DRINK_PRICES.SMOOTHIES +
        (orderDetails.drinks.milk || 0) * DRINK_PRICES.MILK;
      subtotal += drinksTotal;
    }

    return subtotal;
  };

  return (
    <Html>
      <Head />
      <Preview>Thank you for your order at The Sandwich Bar</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={title}>Order Confirmation</Text>
          <Text style={paragraph}>
            Dear{" "}
            {companyDetails?.companyName || fullName || "customer"}
            ,
          </Text>
          <Text style={paragraph}>
            Thank you for your order. Below are the details of your order:
          </Text>

          <Section style={details}>
            <Text style={subtitle}>Quote ID</Text>
            <Text style={detailText}>{quoteId}</Text>

            {referenceNumber && (
              <>
                <Text style={subtitle}>Reference Number</Text>
                <Text style={detailText}>{referenceNumber}</Text>
              </>
            )}

            <Text style={subtitle}>Delivery details</Text>
            <Text style={detailText}>
              Date:{" "}
              {new Date(deliveryDetails.deliveryDate).toLocaleDateString(
                "nl-NL"
              )}
              <br />
              Time: {deliveryDetails.deliveryTime}
              <br />
              Phone: {deliveryDetails.phoneNumber || "Not provided"}
              <br />
              Address: {deliveryDetails.street} {deliveryDetails.houseNumber}
              {deliveryDetails.houseNumberAddition}
              <br />
              {deliveryDetails.postalCode} {deliveryDetails.city}
            </Text>

            <Text style={subtitle}>Order</Text>
            {orderDetails.selectionType === "custom" ? (
              Object.entries(orderDetails.customSelection).map(
                ([sandwichId, selections]) =>
                  selections.map((selection, index) => (
                    <Text key={index} style={detailText}>
                      {selection.quantity}x
                      {shouldShowBreadType(sandwichId, selection?.breadType) &&
                        ` - ${selection?.breadType}`}
                      {selection?.sauce !== "none" &&
                        ` with ${selection?.sauce}`}
                      {` - €${selection.subTotal.toFixed(2)}`}
                    </Text>
                  ))
              )
            ) : (
              <>
                <Text style={detailText}>
                  Chicken, Meat, Fish: {orderDetails.varietySelection.nonVega}{" "}
                  sandwiches
                  <br />
                  Vegetarian: {orderDetails.varietySelection.vega} sandwiches
                  <br />
                  Vegan: {orderDetails.varietySelection.vegan} sandwiches
                  {orderDetails.varietySelection.glutenFree > 0 && (
                    <>
                      <br />
                      Gluten Free: {orderDetails.varietySelection.glutenFree} sandwiches (+€{GLUTEN_FREE_SURCHARGE} each)
                    </>
                  )}
                </Text>
              </>
            )}

            {/* Drinks section */}
            {orderDetails.addDrinks && ((orderDetails.drinks?.freshOrangeJuice || orderDetails.drinks?.verseJus) > 0 || orderDetails.drinks?.sodas > 0 || orderDetails.drinks?.smoothies > 0) && (
              <>
                <Text style={subtitle}>Drinks</Text>
                <Text style={detailText}>
                  {(orderDetails.drinks?.freshOrangeJuice || orderDetails.drinks?.verseJus) > 0 && (
                    <>
                      Fresh Orange Juice: {(orderDetails.drinks.freshOrangeJuice || orderDetails.drinks.verseJus)}x - €{((orderDetails.drinks.freshOrangeJuice || orderDetails.drinks.verseJus) * DRINK_PRICES.FRESH_ORANGE_JUICE).toFixed(2)}
                      <br />
                    </>
                  )}
                  {orderDetails.drinks?.sodas > 0 && (
                    <>
                      Sodas: {orderDetails.drinks.sodas}x - €{(orderDetails.drinks.sodas * DRINK_PRICES.SODAS).toFixed(2)}
                      <br />
                    </>
                  )}
                  {orderDetails.drinks?.smoothies > 0 && (
                    <>
                      Smoothies: {orderDetails.drinks.smoothies}x - €{(orderDetails.drinks.smoothies * DRINK_PRICES.SMOOTHIES).toFixed(2)}
                      <br />
                    </>
                  )}
                  {orderDetails.drinks?.milk > 0 && (
                    <>
                      Milk: {orderDetails.drinks.milk}x - €{(orderDetails.drinks.milk * DRINK_PRICES.MILK).toFixed(2)}
                      <br />
                    </>
                  )}
                </Text>
              </>
            )}

            <Text style={subtitle}>Total amount</Text>
            <Text style={detailText}>
              Subtotal: €{calculateSubtotal(orderDetails).toFixed(2)}
              <br />
              VAT (9%): €{Math.ceil(calculateSubtotal(orderDetails) * 0.09 * 100) / 100}
              <br />
              Total: €{totalAmount.toFixed(2)}
            </Text>
          </Section>

          <Section style={details}>
            <Text style={subtitle}>Allergies or comments</Text>
            <Text style={detailText}>{orderDetails.allergies}</Text>
          </Section>

          <Text style={paragraph}>
            If you have any questions about your order, please contact us.
          </Text>

          <Text style={paragraph}>
            With kind regards,
            <br />
            The Sandwich Bar Nassaukade B.V.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#FFFCF8",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const container = {
  backgroundColor: "#FFFCF8",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const title = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#382628",
  padding: "0 48px",
};

const subtitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#4D343F",
  marginBottom: "4px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#382628",
  padding: "0 48px",
};

const details = {
  padding: "24px 48px",
  backgroundColor: "#FFFCF8",
  borderRadius: "4px",
  margin: "24px 48px",
  border: "1px solid #4D343F",
};

const detailText = {
  fontSize: "14px",
  color: "#382628",
  margin: "0 0 16px",
};
