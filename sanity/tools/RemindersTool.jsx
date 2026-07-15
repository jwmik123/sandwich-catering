import { useEffect, useMemo, useState, useCallback } from "react";
import { IntentLink } from "sanity/router";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Text,
  TextArea,
  TextInput,
  useToast,
} from "@sanity/ui";

// Default reminder wording. {invoiceNumber} and {dueDate} are filled in
// per invoice when sending.
const DEFAULT_TEMPLATE = `This is a friendly reminder that invoice {invoiceNumber} is still outstanding. The payment term was 30 days from the invoice date and payment was due on {dueDate}. If you have already paid, please disregard this message — otherwise we kindly ask you to arrange payment. The invoice is attached again for your convenience.`;

const fillTokensPreview = (message, inv) =>
  message
    .replaceAll("{invoiceNumber}", inv?.invoiceNumber || "CAT-2026-0001")
    .replaceAll(
      "{dueDate}",
      inv?.dueDate
        ? new Date(inv.dueDate).toLocaleDateString("nl-NL")
        : "16-8-2026"
    );

const euro = (n) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
      }).format(n);

const NUM_STYLE = { fontVariantNumeric: "tabular-nums" };

// Column layout shared by header + rows so everything lines up.
const COLUMNS = [
  { key: "invoice", label: "Invoice", flex: 3 },
  { key: "customer", label: "Customer", flex: 4 },
  { key: "total", label: "Total", flex: 2, align: "right" },
  { key: "yuki", label: "Yuki", flex: 3 },
  { key: "age", label: "Age", flex: 2 },
  { key: "status", label: "Status", flex: 2 },
  { key: "reminder", label: "Reminder", flex: 2 },
];

function StatCard({ label, value, detail, tone }) {
  return (
    <Card padding={3} radius={3} shadow={1} tone={tone || "default"} flex={1}>
      <Stack space={3}>
        <Text size={1} muted weight="medium">
          {label}
        </Text>
        <Text size={4} weight="bold" style={NUM_STYLE}>
          {value}
        </Text>
        {detail ? (
          <Text size={0} muted style={NUM_STYLE}>
            {detail}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function AgeBadge({ inv }) {
  if (!inv.openInYuki || inv.daysOpen == null) {
    return (
      <Text size={1} muted>
        —
      </Text>
    );
  }
  // Online-paid invoices are only waiting on payout matching — age is
  // informational, never urgent.
  if (inv.paidOnline) {
    return (
      <Badge tone="default" fontSize={0} style={NUM_STYLE}>
        {inv.daysOpen}d
      </Badge>
    );
  }
  const pastDue = inv.dueDate && new Date(inv.dueDate) < new Date();
  const tone = pastDue ? "critical" : inv.daysOpen > 7 ? "caution" : "default";
  return (
    <Badge tone={tone} fontSize={0} style={NUM_STYLE}>
      {inv.daysOpen}d{pastDue ? " · past due" : ""}
    </Badge>
  );
}

// An invoice a human may send a payment reminder for: still open in Yuki AND
// not paid online (online payers already paid — Yuki just hasn't matched the
// Mollie payout yet).
const isRemindable = (inv) => inv.openInYuki && !inv.paidOnline;

export function RemindersTool() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("all"); // all | open | payout | paid | mismatch
  const [query, setQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_TEMPLATE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices/overview");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load");
      setData(json);
      setSelected({});
      if (json.yukiError) {
        toast.push({
          status: "warning",
          title: "Yuki data unavailable",
          description: json.yukiError,
        });
      }
    } catch (e) {
      toast.push({
        status: "error",
        title: "Failed to load invoices",
        description: String(e?.message || e),
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const invoices = useMemo(() => data?.invoices || [], [data]);
  // "Needs payment": open in Yuki and not paid online — reminder candidates.
  const needsPayment = useMemo(
    () => invoices.filter((i) => isRemindable(i)),
    [invoices]
  );
  const awaitingPayout = useMemo(
    () => invoices.filter((i) => i.awaitingPayout),
    [invoices]
  );
  const mismatches = useMemo(
    () => invoices.filter((i) => i.mismatch),
    [invoices]
  );
  const totalOpenAmount = useMemo(
    () => needsPayment.reduce((s, i) => s + (i.openAmount || 0), 0),
    [needsPayment]
  );
  const pastDueCount = useMemo(
    () =>
      needsPayment.filter((i) => i.dueDate && new Date(i.dueDate) < new Date())
        .length,
    [needsPayment]
  );

  const visible = useMemo(() => {
    let rows = invoices;
    if (filter === "open") rows = rows.filter((i) => isRemindable(i));
    if (filter === "payout") rows = rows.filter((i) => i.awaitingPayout);
    if (filter === "paid") rows = rows.filter((i) => !i.openInYuki);
    if (filter === "mismatch") rows = rows.filter((i) => i.mismatch);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((i) =>
        [i.invoiceNumber, i.customer, i.email]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [invoices, filter, query]);

  const visibleOpen = visible.filter((i) => isRemindable(i));
  const allVisibleOpenSelected =
    visibleOpen.length > 0 && visibleOpen.every((i) => selected[i._id]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAllVisibleOpen = () =>
    setSelected((s) => {
      const next = { ...s };
      const target = !allVisibleOpenSelected;
      visibleOpen.forEach((i) => {
        next[i._id] = target;
      });
      return next;
    });

  const selectedRows = invoices.filter((i) => selected[i._id]);
  const selectedAmount = selectedRows.reduce(
    (s, i) => s + (i.openAmount || 0),
    0
  );

  const send = async () => {
    if (selectedRows.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: selectedRows.map((i) => i._id),
          message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.push({
          status: json.failed ? "warning" : "success",
          title: `Sent ${json.sent} reminder(s)`,
          description: json.failed ? `${json.failed} failed` : undefined,
        });
        setPreviewOpen(false);
        await load();
      } else {
        toast.push({
          status: "error",
          title: "Send failed",
          description: json.error,
        });
      }
    } catch (e) {
      toast.push({
        status: "error",
        title: "Send failed",
        description: String(e?.message || e),
      });
    } finally {
      setSending(false);
    }
  };

  const filters = [
    { key: "all", label: `All (${invoices.length})` },
    { key: "open", label: `Needs payment (${needsPayment.length})` },
    ...(awaitingPayout.length
      ? [{ key: "payout", label: `Awaiting payout (${awaitingPayout.length})` }]
      : []),
    {
      key: "paid",
      label: `Settled (${invoices.filter((i) => !i.openInYuki).length})`,
    },
    ...(mismatches.length
      ? [{ key: "mismatch", label: `⚠ Mismatch (${mismatches.length})` }]
      : []),
  ];

  return (
    <Flex direction="column" height="fill">
      <Box flex={1} overflow="auto">
        <Box padding={4} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Stack space={4}>
            {/* Header */}
            <Flex align="flex-start" justify="space-between" gap={3}>
              <Stack space={2}>
                <Text size={3} weight="bold">
                  Invoices &amp; Reminders
                </Text>
                <Text size={1} muted>
                  Every CAT- invoice, matched live against Yuki&apos;s
                  open-debtor list.
                </Text>
              </Stack>
              <Button
                mode="ghost"
                text="Refresh"
                onClick={load}
                disabled={loading || sending}
              />
            </Flex>

            {/* Stats */}
            {!loading && data && (
              <Flex gap={3} wrap="wrap">
                <StatCard label="Invoices" value={invoices.length} />
                <StatCard
                  label="Needs payment"
                  value={needsPayment.length}
                  detail={`${euro(totalOpenAmount)} outstanding`}
                  tone={needsPayment.length ? "caution" : "positive"}
                />
                <StatCard
                  label="Past due"
                  value={pastDueCount}
                  tone={pastDueCount ? "critical" : "positive"}
                />
                <StatCard
                  label="Awaiting payout"
                  value={awaitingPayout.length}
                  detail="paid online, not yet matched in Yuki"
                  tone="default"
                />
                <StatCard
                  label="Mismatches"
                  value={mismatches.length}
                  detail={
                    mismatches.length
                      ? "paid in Sanity, open in Yuki"
                      : "Sanity and Yuki agree"
                  }
                  tone={mismatches.length ? "caution" : "positive"}
                />
              </Flex>
            )}

            {/* Filters + search */}
            {!loading && (
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <Flex gap={1}>
                  {filters.map((f) => (
                    <Button
                      key={f.key}
                      mode={filter === f.key ? "default" : "bleed"}
                      tone={filter === f.key ? "primary" : "default"}
                      fontSize={1}
                      padding={2}
                      text={f.label}
                      onClick={() => setFilter(f.key)}
                    />
                  ))}
                </Flex>
                <Box style={{ width: 220 }}>
                  <TextInput
                    fontSize={1}
                    padding={2}
                    placeholder="Search invoice, customer…"
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                  />
                </Box>
              </Flex>
            )}

            {/* Table */}
            {loading ? (
              <Flex justify="center" align="center" padding={6} gap={3}>
                <Spinner muted />
                <Text muted size={1}>
                  Fetching invoices and Yuki open items…
                </Text>
              </Flex>
            ) : visible.length === 0 ? (
              <Card padding={5} radius={3} tone="transparent" border>
                <Stack space={3} style={{ textAlign: "center" }}>
                  <Text size={2} muted>
                    {invoices.length === 0
                      ? "No CAT- invoices yet."
                      : "Nothing matches this filter."}
                  </Text>
                </Stack>
              </Card>
            ) : (
              <Card radius={3} shadow={1} overflow="hidden">
                {/* Header row */}
                <Card padding={3} borderBottom tone="transparent">
                  <Flex align="center" gap={3}>
                    <Box style={{ width: 24 }}>
                      <Checkbox
                        checked={allVisibleOpenSelected}
                        indeterminate={
                          !allVisibleOpenSelected &&
                          visibleOpen.some((i) => selected[i._id])
                        }
                        onChange={toggleAllVisibleOpen}
                        disabled={visibleOpen.length === 0}
                      />
                    </Box>
                    {COLUMNS.map((c) => (
                      <Box flex={c.flex} key={c.key}>
                        <Text
                          size={0}
                          weight="semibold"
                          muted
                          align={c.align}
                          style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {c.label}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </Card>

                {/* Rows */}
                {visible.map((inv, idx) => (
                  <Card
                    key={inv._id}
                    padding={3}
                    tone={
                      inv.mismatch
                        ? "caution"
                        : selected[inv._id]
                          ? "primary"
                          : "default"
                    }
                    borderBottom={idx < visible.length - 1}
                  >
                    <Flex align="center" gap={3}>
                      <Box style={{ width: 24 }}>
                        <Checkbox
                          checked={!!selected[inv._id]}
                          onChange={() => toggle(inv._id)}
                          disabled={!isRemindable(inv)}
                        />
                      </Box>

                      <Box flex={3}>
                        <IntentLink
                          intent="edit"
                          params={{ id: inv._id, type: "invoice" }}
                          style={{ textDecoration: "none" }}
                        >
                          <Text
                            size={1}
                            weight="semibold"
                            style={{ ...NUM_STYLE, color: "var(--card-link-fg-color, inherit)" }}
                          >
                            {inv.invoiceNumber}
                          </Text>
                        </IntentLink>
                      </Box>

                      <Box flex={4}>
                        <Stack space={2}>
                          <Text size={1} textOverflow="ellipsis">
                            {inv.customer || "—"}
                          </Text>
                          {inv.email ? (
                            <Text size={0} muted textOverflow="ellipsis">
                              {inv.email}
                            </Text>
                          ) : null}
                        </Stack>
                      </Box>

                      <Box flex={2}>
                        <Text size={1} align="right" style={NUM_STYLE}>
                          {euro(inv.total)}
                        </Text>
                      </Box>

                      <Box flex={3}>
                        {inv.awaitingPayout ? (
                          <Badge tone="primary" fontSize={0} style={NUM_STYLE}>
                            online · awaiting payout
                          </Badge>
                        ) : inv.openInYuki ? (
                          <Badge tone="caution" fontSize={0} style={NUM_STYLE}>
                            open · {euro(inv.openAmount)}
                          </Badge>
                        ) : (
                          <Badge tone="positive" fontSize={0}>
                            paid
                          </Badge>
                        )}
                      </Box>

                      <Box flex={2}>
                        <AgeBadge inv={inv} />
                      </Box>

                      <Box flex={2}>
                        <Flex align="center" gap={2}>
                          <Text size={1} muted>
                            {inv.status || "—"}
                          </Text>
                          {inv.mismatch ? (
                            <Badge tone="critical" fontSize={0}>
                              ⚠
                            </Badge>
                          ) : null}
                        </Flex>
                      </Box>

                      <Box flex={2}>
                        <Text size={1} muted style={NUM_STYLE}>
                          {inv.reminderSentAt
                            ? inv.reminderSentAt.slice(0, 10)
                            : "—"}
                        </Text>
                      </Box>
                    </Flex>
                  </Card>
                ))}
              </Card>
            )}

            {!loading && (
              <Text size={0} muted>
                Reminders can only be sent for open bank-transfer invoices.
                &ldquo;Awaiting payout&rdquo; = paid online via Mollie; Yuki
                closes these once the Mollie payout is matched by the
                bookkeeper.
                {mismatches.length
                  ? " ⚠ = bank-transfer invoice marked paid in Sanity while Yuki still reports it open — check in Yuki."
                  : ""}
              </Text>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Sticky action bar */}
      {selectedRows.length > 0 && (
        <Card padding={3} borderTop tone="primary">
          <Flex
            align="center"
            justify="space-between"
            gap={3}
            style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}
          >
            <Text size={1} weight="medium" style={NUM_STYLE}>
              {selectedRows.length} selected · {euro(selectedAmount)} open
            </Text>
            <Flex gap={2}>
              <Button
                mode="ghost"
                text="Clear"
                fontSize={1}
                onClick={() => setSelected({})}
                disabled={sending}
              />
              <Button
                tone="primary"
                fontSize={1}
                text={`Preview & send ${selectedRows.length} reminder${selectedRows.length > 1 ? "s" : ""}`}
                onClick={() => setPreviewOpen(true)}
                disabled={sending}
              />
            </Flex>
          </Flex>
        </Card>
      )}
      {/* Preview & edit dialog */}
      {previewOpen && (
        <Dialog
          header="Payment reminder"
          id="reminder-preview"
          width={1}
          onClose={() => !sending && setPreviewOpen(false)}
        >
          <Box padding={4}>
            <Stack space={4}>
              <Stack space={2}>
                <Text size={1} weight="medium">
                  Sending to {selectedRows.length} invoice
                  {selectedRows.length > 1 ? "s" : ""}
                </Text>
                <Text size={1} muted textOverflow="ellipsis">
                  {selectedRows
                    .slice(0, 6)
                    .map((i) => i.invoiceNumber)
                    .join(", ")}
                  {selectedRows.length > 6
                    ? ` +${selectedRows.length - 6} more`
                    : ""}
                </Text>
              </Stack>

              <Stack space={2}>
                <Flex align="center" justify="space-between">
                  <Text size={1} weight="medium">
                    Message
                  </Text>
                  <Button
                    mode="bleed"
                    fontSize={0}
                    padding={2}
                    text="Reset to default"
                    onClick={() => setMessage(DEFAULT_TEMPLATE)}
                    disabled={sending || message === DEFAULT_TEMPLATE}
                  />
                </Flex>
                <TextArea
                  rows={7}
                  fontSize={1}
                  value={message}
                  onChange={(e) => setMessage(e.currentTarget.value)}
                  disabled={sending}
                />
                <Text size={0} muted>
                  {"{invoiceNumber}"} and {"{dueDate}"} are filled in per
                  invoice. The email also includes the order details and the
                  invoice PDF.
                </Text>
              </Stack>

              <Stack space={2}>
                <Text size={1} weight="medium">
                  Preview
                  {selectedRows[0]
                    ? ` — ${selectedRows[0].invoiceNumber}`
                    : ""}
                </Text>
                <Card padding={3} radius={2} tone="transparent" border>
                  <Stack space={3}>
                    <Text size={1} weight="medium">
                      Dear {selectedRows[0]?.customer || "customer"},
                    </Text>
                    <Text size={1} style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {fillTokensPreview(message, selectedRows[0])}
                    </Text>
                    <Text size={0} muted>
                      📎 invoice-
                      {selectedRows[0]?.invoiceNumber || "CAT-2026-0001"}.pdf
                    </Text>
                  </Stack>
                </Card>
              </Stack>

              <Flex justify="flex-end" gap={2}>
                <Button
                  mode="ghost"
                  text="Cancel"
                  onClick={() => setPreviewOpen(false)}
                  disabled={sending}
                />
                <Button
                  tone="primary"
                  text={
                    sending
                      ? "Sending…"
                      : `Send ${selectedRows.length} reminder${selectedRows.length > 1 ? "s" : ""}`
                  }
                  onClick={send}
                  disabled={sending || !message.trim() || selectedRows.length === 0}
                />
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </Flex>
  );
}

export default RemindersTool;
