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
      setError("Er is iets misgegaan bij het ophalen van de offerte");
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
            className="border-green-500 text-green-500 hover:bg-green-50"
          >
            Load existing quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Load quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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

          <div className="flex space-x-2 justify-end mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
