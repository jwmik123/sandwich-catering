// Nightly Sanity <-> Yuki consistency check (see lib/consistency-check.js).
// Runs after reconcile-payments. Mails a report (see sendAdminReport for the
// recipient) when anything needs action;
// a clean night sends nothing.
//
//   ?send=0   return the report without mailing (for testing)
//   ?send=1   mail even when there is nothing to act on
export const dynamic = "force-dynamic";

import { buildInvoiceOverview } from "@/lib/invoice-overview";
import {
  findInconsistencies,
  ACTION,
  BOOKKEEPING,
  KIND_LABELS,
} from "@/lib/consistency-check";
import { sendAdminReport } from "@/lib/email";
import { auditAgainstLedger } from "@/lib/ledger-audit";
import { YukiApiClient, validateYukiConfig } from "@/lib/yuki-api";

// Only recent invoices get the ledger proof; older history was audited by hand.
const LEDGER_AUDIT_DAYS = 90;
import { NextResponse } from "next/server";

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function renderSection(title, findings) {
  if (!findings.length) return { html: "", text: "" };
  const byKind = new Map();
  for (const f of findings) {
    byKind.set(f.kind, [...(byKind.get(f.kind) || []), f]);
  }
  let html = `<h2 style="font-size:16px;margin:24px 0 8px">${escapeHtml(title)}</h2>`;
  let text = `\n${title.toUpperCase()}\n`;
  for (const [kind, items] of byKind) {
    html += `<h3 style="font-size:14px;margin:16px 0 4px">${escapeHtml(KIND_LABELS[kind] || kind)} (${items.length})</h3><ul style="margin:0;padding-left:18px">`;
    text += `\n${KIND_LABELS[kind] || kind} (${items.length})\n`;
    for (const f of items) {
      const who = [f.invoiceNumber, f.customer].filter(Boolean).join(" · ");
      html += `<li style="margin:2px 0"><strong>${escapeHtml(who)}</strong>${who ? " — " : ""}${escapeHtml(f.detail)}</li>`;
      text += `- ${who}${who ? " — " : ""}${f.detail}\n`;
    }
    html += "</ul>";
  }
  return { html, text };
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sendParam = new URL(request.url).searchParams.get("send");

  try {
    const overview = await buildInvoiceOverview();
    const findings = findInconsistencies(overview);

    // Sent, not open in Yuki, never verified: paid and settled — or never
    // booked. Only the revenue ledger can tell (see lib/ledger-audit.js).
    if (!overview.yukiError) {
      const since = new Date(Date.now() - LEDGER_AUDIT_DAYS * 86400000)
        .toISOString()
        .slice(0, 10);
      const unproven = overview.rows.filter(
        (r) =>
          r.yukiSent &&
          !r.verifiedInYuki &&
          !r.openInYuki &&
          r.status !== "cancelled" &&
          r.deliveryDate &&
          r.deliveryDate >= since
      );
      if (unproven.length) {
        try {
          const { apiKey, adminId } = validateYukiConfig();
          const ledger = await new YukiApiClient(apiKey, adminId).getRevenueTransactions(
            since,
            new Date().toISOString().slice(0, 10)
          );
          const verdicts = auditAgainstLedger(
            unproven.map((r) => ({
              invoiceNumber: r.invoiceNumber,
              customer: r.customer,
              date: r.deliveryDate,
              altDates: r.yukiSentAt ? [r.yukiSentAt.slice(0, 10)] : [],
              subtotal: r.subtotal,
              delivery: r.delivery,
            })),
            ledger
          );
          for (const v of verdicts.filter((v) => v.verdict === "missing")) {
            const row = unproven.find((r) => r.invoiceNumber === v.invoiceNumber);
            findings.push({
              kind: "missing_in_yuki",
              severity: ACTION,
              invoiceNumber: v.invoiceNumber,
              customer: row?.customer || null,
              detail: `Marked as sent, but not in Yuki's revenue ledger. ${v.detail}`,
            });
          }
        } catch (e) {
          console.error("Ledger audit failed:", e.message);
        }
      }
    }
    const action = findings.filter((f) => f.severity === ACTION);
    const bookkeeping = findings.filter((f) => f.severity === BOOKKEEPING);

    console.log(
      `🔎 consistency-check: ${action.length} to act on, ${bookkeeping.length} bookkeeping item(s)`
    );
    action.forEach((f) =>
      console.warn(`  [${f.kind}] ${f.invoiceNumber || ""} ${f.detail}`)
    );

    const shouldSend =
      sendParam === "1" || (sendParam !== "0" && action.length > 0);

    let mailedTo = null;
    if (shouldSend) {
      const a = renderSection("Needs action", action);
      const b = renderSection("For the bookkeeper", bookkeeping);
      const intro = action.length
        ? `${action.length} invoice issue(s) need attention.`
        : "Nothing needs action.";
      mailedTo = await sendAdminReport({
        subject: `Catering invoices: ${action.length} issue(s) to check`,
        html: `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">
          <p>${escapeHtml(intro)} Details per invoice are also in the Studio <em>Reminders</em> tab.</p>
          ${a.html}${b.html}
        </div>`,
        text: `${intro}\n${a.text}${b.text}`,
      });
    }

    return NextResponse.json({
      success: true,
      actionCount: action.length,
      bookkeepingCount: bookkeeping.length,
      mailedTo,
      findings,
    });
  } catch (error) {
    console.error("❌ consistency-check error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
