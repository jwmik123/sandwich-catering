"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function QuoteLookupModal({ trigger, onQuoteLoaded }) {
  const [quoteId, setQuoteId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
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

      // Close modal
      setOpen(false);

      // If onQuoteLoaded callback exists, pass the quote data to parent component
      if (typeof onQuoteLoaded === "function") {
        onQuoteLoaded(data.quote);
      } else {
        // If no callback provided, redirect to home page with query param
        router.push("/?restore=true");
      }
    } catch (error) {
      setError("Something went wrong when fetching the quote");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="text-green-500 border-green-500 hover:bg-green-50"
          >
            Load existing quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Load quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

          <div className="flex justify-end mt-6 space-x-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-white bg-green-500 hover:bg-green-600"
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
