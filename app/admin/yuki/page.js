// app/admin/yuki/page.js - Admin dashboard for Yuki integration
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function YukiAdminPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [batchDates, setBatchDates] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/yuki/admin", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}`,
        },
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setMessage(`Failed to load status: ${error.message}`);
    }
  };

  const performAction = async (action, params = {}) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/yuki/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}`,
        },
        body: JSON.stringify({ action, ...params }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${action} completed successfully`);
        if (data.results) {
          setMessage(
            `✅ Processed ${data.processed} items: ${data.successful} successful, ${data.failed} failed`
          );
        }
        await loadStatus(); // Refresh status
      } else {
        setMessage(`❌ ${action} failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => performAction("test-connection");

  const sendSingle = () => {
    if (!quoteId.trim()) {
      setMessage("Please enter a Quote ID");
      return;
    }
    performAction("send-single", { quoteId: quoteId.trim() });
  };

  const sendBatch = () => {
    performAction("send-batch", batchDates);
  };

  const refresh = () => {
    loadStatus();
    setMessage("Status refreshed");
  };

  // In je admin dashboard
  const sendTestInvoice = async () => {
    try {
      const response = await fetch("/api/test/yuki-invoice", {
        method: "POST",
      });
      const data = await response.json();
      setMessage(
        data.success
          ? `✅ Test successful: ${data.testQuoteId}`
          : `❌ ${data.error}`
      );
    } catch (error) {
      setMessage(`❌ Test failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-6xl p-6 mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Yuki Integration Admin</h1>
        <Button onClick={refresh} variant="outline">
          Refresh
        </Button>
      </div>

      {message && (
        <Alert
          className={
            message.includes("✅") ? "border-green-500" : "border-red-500"
          }
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${status?.yukiEnabled ? "bg-green-500" : "bg-red-500"}`}
              />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status?.yukiEnabled ? "default" : "destructive"}>
              {status?.yukiEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {status?.timestamp && (
              <p className="mt-2 text-sm text-gray-500">
                Last updated: {new Date(status.timestamp).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotes Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {status?.stats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Quotes:</span>
                  <span className="font-medium">
                    {status.stats.totalQuotes}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Quotes:</span>
                  <span className="font-medium">{status.stats.paidQuotes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sent to Yuki:</span>
                  <span className="font-medium text-green-600">
                    {status.stats.yukiSent}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-medium text-orange-600">
                    {status.stats.yukiPending}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {status?.stats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Invoices:</span>
                  <span className="font-medium">
                    {status.stats.invoicesTotal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sent to Yuki:</span>
                  <span className="font-medium text-green-600">
                    {status.stats.invoicesYukiSent}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-medium text-orange-600">
                    {status.stats.invoicesYukiPending}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Test the connection to Yuki API and verify credentials.
            </p>
            <Button
              onClick={testConnection}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </CardContent>
          <Button onClick={sendTestInvoice}>Send Test Invoice to Yuki</Button>
        </Card>

        {/* Send Single */}
        <Card>
          <CardHeader>
            <CardTitle>Send Single Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Send a specific quote/invoice to Yuki manually.
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Enter Quote ID (e.g., Q12345678)"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
              />
              <Button
                onClick={sendSingle}
                disabled={loading || !quoteId.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send to Yuki"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Send Batch */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Batch Process</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              Send all paid quotes/invoices in a date range to Yuki. Leave dates
              empty to process all pending items.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                type="date"
                placeholder="Start Date"
                value={batchDates.startDate}
                onChange={(e) =>
                  setBatchDates((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
              <Input
                type="date"
                placeholder="End Date"
                value={batchDates.endDate}
                onChange={(e) =>
                  setBatchDates((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
              <Button
                onClick={sendBatch}
                disabled={loading}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Batch Process"
                )}
              </Button>
            </div>
            <Alert className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                This will process multiple invoices. Use with caution and
                monitor the results.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <h4 className="mb-2 font-medium">How it works:</h4>
            <ol className="ml-4 space-y-1 list-decimal list-inside">
              <li>
                When a customer pays online → invoice is automatically sent to
                Yuki
              </li>
              <li>
                When an invoice is created (pay by invoice) → invoice is
                automatically sent to Yuki
              </li>
              <li>
                Use this admin panel to manually send specific invoices or batch
                process
              </li>
              <li>
                All customers are created as contacts in Yuki with their company
                details
              </li>
              <li>
                Invoices include detailed line items with proper VAT codes
              </li>
            </ol>
          </div>

          <div className="text-sm text-gray-600">
            <h4 className="mb-2 font-medium">Troubleshooting:</h4>
            <ul className="ml-4 space-y-1 list-disc list-inside">
              <li>
                If "Test Connection" fails, check your Yuki API credentials
              </li>
              <li>
                Ensure your Yuki webservice has sufficient daily API calls
                remaining
              </li>
              <li>Contact codes are auto-generated to avoid duplicates</li>
              <li>Failed sends can be retried using the manual send option</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-blue-50">
            <h4 className="mb-2 font-medium text-blue-900">
              Yuki Configuration Required:
            </h4>
            <ul className="ml-4 space-y-1 text-sm text-blue-800 list-disc list-inside">
              <li>Create a webservice API key in your Yuki domain</li>
              <li>Note your Administration ID from Yuki</li>
              <li>Add these to your environment variables</li>
              <li>Ensure the Sales webservice is enabled for your domain</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
