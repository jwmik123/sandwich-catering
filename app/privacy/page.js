import React from "react";
import Image from "next/image";
export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl px-4 py-8 mx-auto">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full mb-12">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-md bg-primary hover:bg-primary/90"
          >
            ← Back to Home
          </a>
        </div>
      </div>
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>

      <p className="mb-8">
        We are committed to protecting your privacy. This privacy policy
        explains how we collect and use your personal data.
      </p>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">1. Data We Collect</h2>
        <p className="mb-4">
          We collect personal data such as name, company name, email, phone
          number, and order details via forms on our website.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          2. Purpose of Processing
        </h2>
        <p className="mb-4">
          We use your data to process orders, respond to inquiries, and send
          relevant service updates.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Data Sharing</h2>
        <p className="mb-4">
          We do not share your personal data with third parties, except where
          required for order fulfillment or by law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">4. Data Storage</h2>
        <p className="mb-4">
          Your data is securely stored and retained only as long as necessary
          for the purposes above.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">5. Cookies</h2>
        <p className="mb-4">
          We use cookies to enhance your experience and analyze website usage.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Your Rights</h2>
        <p className="mb-4">
          You may request access to, correction, or deletion of your data by
          contacting us at orders@thesandwichbar.nl.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">7. Contact Information</h2>
        <p className="mb-4">
          The Sandwich Bar Nassaukade B.V.
          <br />
          Nassaukade 378 H
          <br />
          1054 AD Amsterdam
          <br />
          KVK Number: 81264782
          <br />
          VAT Number: NL81264782B01
          <br />
          Email: orders@thesandwichbar.nl
        </p>
      </section>
    </div>
  );
}
