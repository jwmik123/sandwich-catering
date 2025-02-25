"use client";

import { useState } from "react";
import { generateQuote } from "@/app/actions/generateQuote";

export default function QuoteButton({
  formData,
  buttonClasses,
  sandwichOptions,
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadQuote = async () => {
    try {
      setIsGenerating(true);

      const result = await generateQuote(formData, sandwichOptions);

      if (result.success) {
        // Download the PDF
        const pdfResponse = await fetch(result.pdfUrl);
        const pdfBlob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `offerte-${result.quoteId}.pdf`);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        link.remove();
      } else {
        console.error("Failed to generate quote:", result.error);
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error("Error downloading quote:", error);
      // Handle error (show message to user)
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownloadQuote}
      disabled={isGenerating}
      className={`${buttonClasses} w-full justify-center ${
        isGenerating ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isGenerating ? "Generating..." : "Download Quote (PDF)"}
    </button>
  );
}
