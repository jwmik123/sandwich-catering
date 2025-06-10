import React from "react";

export default function TermsPage() {
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
      <h1 className="mb-8 text-3xl font-bold">Terms and Conditions</h1>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">1. Company Information</h2>
        <p className="mb-4">
          This website is operated by The Sandwich Bar Nassaukade B.V.,
          registered with the Dutch Chamber of Commerce under number 81264782,
          with VAT ID NL81264782B01.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">2. Services</h2>
        <p className="mb-4">
          We provide catering services to businesses, including but not limited
          to lunches, buffets, and event catering.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Orders and Payment</h2>
        <p className="mb-4">
          Orders must be placed at least 24 hours in advance. Payments can be
          made via bank transfer (IBAN: NL05 INGB 0006 8499 73). All prices are
          listed in EUR, excluding VAT unless otherwise stated.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">4. Delivery</h2>
        <p className="mb-4">
          Deliveries are made within Amsterdam and surrounding areas. Free
          delivery is available for orders above €100,- (some areas excluded:
          1026-1028, 1035, 1101-1109). Specific delivery times are agreed upon
          when ordering. We reserve the right to cancel or delay orders due to
          unforeseen circumstances.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          5. Cancellation and Refunds
        </h2>
        <p className="mb-4">
          Due to the perishable nature of our products, cancellations must be
          made at least 24 hours in advance. Refunds are subject to approval and
          depend on the timing of cancellation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Liability</h2>
        <p className="mb-4">
          We are not liable for any damages resulting from allergies or misuse
          of our products. Customers are responsible for providing accurate
          dietary information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">7. Complaints</h2>
        <p className="mb-4">
          Complaints must be reported within 24 hours after delivery via
          orders@thesandwichbar.nl. We aim to respond within 2 business days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">8. Applicable Law</h2>
        <p className="mb-4">
          Dutch law applies. Any disputes will be handled by the competent court
          in Amsterdam.
        </p>
      </section>
    </div>
  );
}
