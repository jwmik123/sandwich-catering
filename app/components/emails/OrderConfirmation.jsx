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

export default function OrderConfirmation({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  totalAmount,
  fullName,
  sandwichOptions = [],
}) {
  // Helper function to check if bread type should be shown
  const shouldShowBreadType = (sandwichId, breadType) => {
    const sandwich = sandwichOptions.find((s) => s._id === sandwichId);
    return sandwich && !isDrink(sandwich) && breadType;
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
            {companyDetails
              ? companyDetails.companyName
              : fullName || "customer"}
            ,
          </Text>
          <Text style={paragraph}>
            Thank you for your order. Below are the details of your order:
          </Text>

          <Section style={details}>
            <Text style={subtitle}>Quote ID</Text>
            <Text style={detailText}>{quoteId}</Text>

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
                </Text>
              </>
            )}

            <Text style={subtitle}>Total amount</Text>
            <Text style={detailText}>
              Subtotal: €{totalAmount.toFixed(2)}
              <br />
              VAT (9%): €{(totalAmount * 0.09).toFixed(2)}
              <br />
              Total: €{(totalAmount * 1.09).toFixed(2)}
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
