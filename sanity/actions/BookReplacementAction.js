// sanity/actions/BookReplacementAction.js
// On a replacement invoice: credit the old invoice and book this one in Yuki
// WITHOUT mailing the customer — for when they already got the corrected
// invoice by hand. "Send Invoice" can still mail it later (ADR 0004).
import { DocumentIcon } from "@sanity/icons";

export function BookReplacementAction(props) {
  const { type, published, onComplete } = props;

  if (type !== "invoice" || !published?.replaces?._ref) return null;
  if (published.yukiSent || published.emailSent) return null;

  return {
    label: "Book in Yuki (no e-mail)",
    icon: DocumentIcon,
    onHandle: async () => {
      const confirmed = window.confirm(
        "Book this invoice in Yuki without e-mailing the customer?\n\n" +
          "The invoice it replaces is credited in Yuki and this one is booked under a new invoice number. " +
          "Only use this when the customer already has the corrected invoice."
      );
      if (!confirmed) {
        onComplete();
        return;
      }
      try {
        const response = await fetch("/api/invoices/book-replacement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId: published._id }),
        });
        const result = await response.json();
        onComplete();
        window.alert(result.success ? result.message : `Booking failed: ${result.error}`);
      } catch (error) {
        onComplete();
        window.alert(`Booking failed: ${error.message}`);
      }
    },
  };
}
