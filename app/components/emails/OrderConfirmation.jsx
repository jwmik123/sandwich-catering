import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Preview,
  Section,
} from "@react-email/components";

export default function OrderConfirmation({
  quoteId,
  orderDetails,
  deliveryDetails,
  companyDetails,
  totalAmount,
}) {
  return (
    <Html>
      <Head />
      <Preview>Bedankt voor uw bestelling bij LunchCatering</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={title}>Bestelling Bevestigd</Text>
          <Text style={paragraph}>
            Beste {companyDetails ? companyDetails.companyName : "klant"},
          </Text>
          <Text style={paragraph}>
            Bedankt voor uw bestelling. Hieronder vindt u de details van uw
            bestelling:
          </Text>

          <Section style={details}>
            <Text style={subtitle}>Referentienummer</Text>
            <Text style={detailText}>{quoteId}</Text>

            <Text style={subtitle}>Bezorggegevens</Text>
            <Text style={detailText}>
              Datum:{" "}
              {new Date(deliveryDetails.deliveryDate).toLocaleDateString(
                "nl-NL"
              )}
              <br />
              Tijd: {deliveryDetails.deliveryTime}
              <br />
              Adres: {deliveryDetails.street} {deliveryDetails.houseNumber}
              {deliveryDetails.houseNumberAddition}
              <br />
              {deliveryDetails.postalCode} {deliveryDetails.city}
            </Text>

            <Text style={subtitle}>Bestelling</Text>
            {orderDetails.selectionType === "custom" ? (
              Object.entries(orderDetails.customSelection).map(
                ([_, selections]) =>
                  selections.map((selection, index) => (
                    <Text key={index} style={detailText}>
                      {selection.quantity}x - {selection.breadType}
                      {selection.sauce !== "geen" && ` met ${selection.sauce}`}
                      {` - €${selection.subTotal.toFixed(2)}`}
                    </Text>
                  ))
              )
            ) : (
              <>
                <Text style={detailText}>
                  Kip, Vlees, Vis: {orderDetails.varietySelection.nonVega}{" "}
                  broodjes
                  <br />
                  Vegetarisch: {orderDetails.varietySelection.vega} broodjes
                  <br />
                  Vegan: {orderDetails.varietySelection.vegan} broodjes
                </Text>
              </>
            )}

            <Text style={subtitle}>Totaalbedrag</Text>
            <Text style={detailText}>
              Subtotaal: €{totalAmount.toFixed(2)}
              <br />
              BTW (9%): €{(totalAmount * 0.09).toFixed(2)}
              <br />
              Totaal: €{(totalAmount * 1.09).toFixed(2)}
            </Text>
          </Section>

          <Section style={details}>
            <Text style={subtitle}>Allergieën of opmerkingen</Text>
            <Text style={detailText}>{orderDetails.allergies}</Text>
          </Section>

          <Text style={paragraph}>
            Als u vragen heeft over uw bestelling, neem dan contact met ons op.
          </Text>

          <Text style={paragraph}>
            Met vriendelijke groet,
            <br />
            Team LunchCatering
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const title = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1f2937",
  padding: "0 48px",
};

const subtitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "4px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#4b5563",
  padding: "0 48px",
};

const details = {
  padding: "24px 48px",
  backgroundColor: "#f9fafb",
  borderRadius: "4px",
  margin: "24px 48px",
};

const detailText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 16px",
};
