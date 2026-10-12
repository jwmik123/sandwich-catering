// sanity/actions/ReissuePublishAction.js
// Publish on an issued invoice whose name / address was edited (ADR 0004).
// An issued invoice is never changed under its own number, so instead of
// publishing the edit this credits the invoice and sends it again under a new
// number with the new addressee. The edit itself is then discarded: the old
// invoice keeps what it was booked with.
import { useState } from "react";
import { useDocumentOperation } from "sanity";
import { useRouter } from "sanity/router";
import { pickAddressee, sameValue } from "../../lib/addressee";

export function withReissue(PublishAction) {
  function ReissuePublishAction(props) {
    const original = PublishAction(props);
    const { id, type, draft, published, onComplete } = props;
    const { discardChanges } = useDocumentOperation(id, type);
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    if (type !== "invoice" || !draft || !published?.yukiSent) return original;
    if (published.status === "cancelled") return original;
    if (sameValue(pickAddressee(draft), pickAddressee(published))) return original;

    return {
      ...original,
      label: busy ? "Sending corrected invoice…" : "Publish & send corrected invoice",
      disabled: busy,
      tone: "primary",
      onHandle: async () => {
        const email = draft.orderDetails?.invoiceEmail || draft.orderDetails?.email;
        const confirmed = window.confirm(
          `${published.invoiceNumber} is already issued, so it can't change under the same number.\n\n` +
            `Publishing credits ${published.invoiceNumber} in Yuki and sends the customer (${email || "no e-mail"}) ` +
            "a new invoice with the corrected name / address under a new number, together with the credit note. " +
            "The amount stays the same." +
            (published.status === "paid" || typeof published.paidAmount === "number"
              ? " The invoice is paid: the new one says nothing is left to pay."
              : "") +
            "\n\nOther unpublished edits on this invoice are discarded.\n\nContinue?"
        );
        if (!confirmed) {
          onComplete();
          return;
        }
        setBusy(true);
        try {
          const response = await fetch("/api/invoices/reissue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId: published._id, addressee: pickAddressee(draft) }),
          });
          const result = await response.json();
          if (!result.success) {
            window.alert(`Could not send the corrected invoice: ${result.error}`);
            return;
          }
          discardChanges.execute();
          window.alert(result.message || "Corrected invoice sent.");
          if (result.invoiceId) {
            router.navigateIntent("edit", { id: result.invoiceId, type: "invoice" });
          }
        } catch (error) {
          window.alert(`Could not send the corrected invoice: ${error.message}`);
        } finally {
          setBusy(false);
          onComplete();
        }
      },
    };
  }
  ReissuePublishAction.action = PublishAction.action;
  return ReissuePublishAction;
}
