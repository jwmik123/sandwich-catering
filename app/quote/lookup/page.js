"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function QuoteLookup() {
  const [quoteId, setQuoteId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Quote niet gevonden");
        return;
      }

      // Store quote data in localStorage for form restoration
      localStorage.setItem("restoreQuote", JSON.stringify(data.quote));

      // Redirect to home page with query param
      router.push("/?restore=true");
    } catch (error) {
      setError("Something went wrong when fetching the quote");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl p-6 mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Load quote</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quoteId">Quote ID</Label>
              <Input
                type="text"
                id="quoteId"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                placeholder="F.E. Q12345678"
                className="focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive" className="px-3 py-2 text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load quote"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
