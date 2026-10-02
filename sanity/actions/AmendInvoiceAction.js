// sanity/actions/AmendInvoiceAction.js
// "Change order" on an issued invoice: it is never edited, it is credited and
// replaced by a new invoice (ADR 0004). This creates the replacement and opens
// it; "Send Invoice" on the replacement credits the old one and mails both.
import { EditIcon } from "@sanity/icons";
import { useRouter } from "sanity/router";

export function AmendInvoiceAction(props) {
  const { type, published, onComplete } = props;
  const router = useRouter();

  if (type !== "invoice" || !published?.yukiSent) return null;
  if (published.status === "cancelled" || published.status === "paid") return null;
  if (typeof published.paidAmount === "number") return null;

  const existing = published.replacedBy?._ref;

  return {
    label: existing ? "Open replacement invoice" : "Change order",
    icon: EditIcon,
    onHandle: async () => {
      if (existing) {
        onComplete();
        router.navigateIntent("edit", { id: existing, type: "invoice" });
        return;
      }

      const confirmed = window.confirm(
        `${published.invoiceNumber} is already booked and sent, so it can't be edited.\n\n` +
          "This creates a new invoice to edit. When you press Send Invoice on the new one, " +
          `${published.invoiceNumber} is credited in Yuki and the customer gets the new invoice with the credit note.\n\nContinue?`
      );
      if (!confirmed) {
        onComplete();
        return;
      }

      try {
        const response = await fetch("/api/invoices/amend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: published._id }),
        });
        const result = await response.json();
        onComplete();
        if (!result.success) {
          window.alert(`Could not change the order: ${result.error}`);
          return;
        }
        router.navigateIntent("edit", { id: result.invoiceId, type: "invoice" });
      } catch (error) {
        onComplete();
        window.alert(`Could not change the order: ${error.message}`);
      }
    },
  };
}
