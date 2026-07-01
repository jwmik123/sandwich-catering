import { useEffect, useState, useCallback } from "react";
import { useClient } from "sanity";
import {
  Card,
  Stack,
  Flex,
  Box,
  Text,
  Button,
  Checkbox,
  Spinner,
  useToast,
} from "@sanity/ui";

const OVERDUE_QUERY = `*[_type == "invoice" && status == "overdue"] | order(dueDate asc){
  _id,
  invoiceNumber,
  quoteId,
  dueDate,
  reminderSentAt,
  "customer": coalesce(companyDetails.name, orderDetails.name),
  "email": orderDetails.email,
  "total": amount.total
}`;

export function RemindersTool() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await client.withConfig({ useCdn: false }).fetch(OVERDUE_QUERY);
      setInvoices(data || []);
      setSelected({});
    } catch (e) {
      toast.push({
        status: "error",
        title: "Failed to load overdue invoices",
        description: String(e?.message || e),
      });
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const allSelected =
    invoices.length > 0 && invoices.every((i) => selected[i._id]);
  const toggleAll = () =>
    setSelected(
      allSelected
        ? {}
        : Object.fromEntries(invoices.map((i) => [i._id, true]))
    );

  const selectedIds = invoices.filter((i) => selected[i._id]).map((i) => i._id);

  const send = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.push({
          status: json.failed ? "warning" : "success",
          title: `Sent ${json.sent} reminder(s)`,
          description: json.failed ? `${json.failed} failed` : undefined,
        });
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

  return (
    <Card padding={4} height="fill" overflow="auto">
      <Stack space={4}>
        <Flex align="center" justify="space-between">
          <Text size={3} weight="bold">
            Overdue invoices
          </Text>
          <Flex gap={2}>
            <Button
              mode="ghost"
              text="Refresh"
              onClick={load}
              disabled={loading || sending}
            />
            <Button
              tone="primary"
              text={`Send reminders (${selectedIds.length})`}
              onClick={send}
              disabled={sending || selectedIds.length === 0}
            />
          </Flex>
        </Flex>

        {loading ? (
          <Flex justify="center" padding={5}>
            <Spinner muted />
          </Flex>
        ) : invoices.length === 0 ? (
          <Text muted>No overdue invoices 🎉</Text>
        ) : (
          <Stack space={2}>
            {/* Header row */}
            <Flex align="center" gap={3} paddingX={2} paddingBottom={1}>
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <Box flex={2}>
                <Text size={1} weight="semibold" muted>
                  Invoice
                </Text>
              </Box>
              <Box flex={3}>
                <Text size={1} weight="semibold" muted>
                  Customer
                </Text>
              </Box>
              <Box flex={2}>
                <Text size={1} weight="semibold" muted>
                  Total
                </Text>
              </Box>
              <Box flex={2}>
                <Text size={1} weight="semibold" muted>
                  Due
                </Text>
              </Box>
              <Box flex={2}>
                <Text size={1} weight="semibold" muted>
                  Last reminder
                </Text>
              </Box>
            </Flex>

            {invoices.map((inv) => (
              <Card key={inv._id} padding={2} radius={2} shadow={1}>
                <Flex align="center" gap={3}>
                  <Checkbox
                    checked={!!selected[inv._id]}
                    onChange={() => toggle(inv._id)}
                  />
                  <Box flex={2}>
                    <Text size={1}>{inv.invoiceNumber || inv.quoteId}</Text>
                  </Box>
                  <Box flex={3}>
                    <Text size={1}>{inv.customer || "—"}</Text>
                    <Text size={0} muted>
                      {inv.email || ""}
                    </Text>
                  </Box>
                  <Box flex={2}>
                    <Text size={1}>€{Number(inv.total || 0).toFixed(2)}</Text>
                  </Box>
                  <Box flex={2}>
                    <Text size={1} muted>
                      {inv.dueDate ? inv.dueDate.slice(0, 10) : "—"}
                    </Text>
                  </Box>
                  <Box flex={2}>
                    <Text size={1} muted>
                      {inv.reminderSentAt
                        ? inv.reminderSentAt.slice(0, 10)
                        : "—"}
                    </Text>
                  </Box>
                </Flex>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

export default RemindersTool;
