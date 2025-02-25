// app/quote/lookup/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Load quote</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="quoteId"
              className="block text-sm font-medium text-gray-700"
            >
              Quote ID
            </label>
            <input
              type="text"
              id="quoteId"
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="F.E. Q12345678"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load quote"}
          </button>
        </form>
      </div>
    </div>
  );
}
