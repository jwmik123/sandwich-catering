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
      setError("Er is iets misgegaan bij het ophalen van de offerte");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
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
              <Alert variant="destructive" className="text-sm py-2 px-3">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
