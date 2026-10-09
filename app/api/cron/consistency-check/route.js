// Weekly Sanity <-> Yuki consistency check (see lib/consistency-check.js).
// Runs Monday morning after reconcile-payments. Mails a report to the shop
// (see sendAdminReport for the recipients) when anything needs action or
// bookkeeping; a clean week sends nothing.
//
//   ?send=0   return the report without mailing (for testing)
//   ?send=1   mail even when the list is empty
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

// Same look as the customer mails (lib/email.js): logo, white card, aubergine headings.
const BRAND = "#4D343F";

function renderSection(title, findings) {
  if (!findings.length) return { html: "", text: "" };
  const byKind = new Map();
  for (const f of findings) {
    byKind.set(f.kind, [...(byKind.get(f.kind) || []), f]);
  }
  let html = `<h2 style="color:${BRAND};font-size:18px;margin:30px 0 10px;padding-bottom:5px;border-bottom:2px solid ${BRAND}">${escapeHtml(title)}</h2>`;
  let text = `\n${title.toUpperCase()}\n`;
  for (const [kind, items] of byKind) {
    html += `<p style="font-weight:bold;color:${BRAND};margin:18px 0 6px">${escapeHtml(KIND_LABELS[kind] || kind)} (${items.length})</p>`;
    text += `\n${KIND_LABELS[kind] || kind} (${items.length})\n`;
    for (const f of items) {
      const who = [f.invoiceNumber, f.customer].filter(Boolean).join(" · ");
      html += `<div style="padding:8px 0;border-bottom:1px solid #eee"><strong>${escapeHtml(who)}</strong><br/><span style="color:#555">${escapeHtml(f.detail)}</span></div>`;
      text += `- ${who}${who ? ": " : ""}${f.detail}\n`;
    }
  }
  return { html, text };
}

function renderReport(intro, sectionsHtml) {
  return `<div style="background-color:#f9f9f9;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;font-family:Arial,sans-serif;line-height:1.6;color:#333;font-size:14px">
    <div style="text-align:center;padding:20px 0">
      <img src="https://catering.thesandwichbar.nl/tsb-logo-full.png" alt="The Sandwich Bar" style="max-width:150px;height:auto" />
    </div>
    <h1 style="color:${BRAND};font-size:22px;text-align:center;margin:0 0 20px">Wekelijkse controle facturen</h1>
    <p style="margin:0">${escapeHtml(intro)}</p>
    ${sectionsHtml}
    <p style="margin-top:40px;padding-top:20px;border-top:1px solid ${BRAND};font-size:12px;color:#666;text-align:center">
      Automatische controle van Sanity en Yuki, elke maandag. Per factuur meer details in de Studio, tab <em>Reminders</em>.
    </p>
  </div>
</div>`;
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
              detail: "Staat als verstuurd, maar staat niet in de omzet in Yuki.",
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
      sendParam === "1" ||
      (sendParam !== "0" && action.length + bookkeeping.length > 0);

    let mailedTo = null;
    if (shouldSend) {
      const a = renderSection("Actie nodig", action);
      const b = renderSection("Voor de boekhouding", bookkeeping);
      const intro = `Deze week: ${action.length} ${action.length === 1 ? "punt" : "punten"} met actie nodig, ${bookkeeping.length} voor de boekhouding.`;
      mailedTo = await sendAdminReport({
        subject: `Cateringfacturen: ${action.length} actie nodig, ${bookkeeping.length} voor de boekhouding`,
        html: renderReport(intro, a.html + b.html),
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
