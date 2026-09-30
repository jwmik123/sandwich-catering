"use client";
import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Download, Lock } from "lucide-react";
import { toast } from "react-toastify";
import { Checkbox } from "@/components/ui/checkbox";
import QuoteButton from "@/app/components/QuoteButton";
import { generateQuote } from "@/app/actions/generateQuote";
import { PAYMENT_TERM_DAYS } from "@/app/assets/constants";
import { calculateVATBreakdown, calculateTotalWithVAT, round2 } from "@/lib/vat-calculations";
import {
  buildItems,
  buildUserData,
  storeOrderSnapshot,
  trackFunnelStep,
} from "@/lib/gtm";
import { rememberPendingOrder } from "@/lib/last-order";
import { houseNumberDigits, isCompletePostcode, lookupStreet } from "@/lib/address-lookup";
import { TIME_SLOTS, cityForPostcode, formatLongDate } from "@/lib/delivery-dates";
import { postalCodeDeliveryCosts } from "@/app/assets/postals";
import { cn } from "@/lib/utils";
import DeliveryDatePicker from "./DeliveryDatePicker";
import OrderLines from "./OrderLines";
import { Totals } from "./OrderPanel";
import { downloadInvoicePreview } from "./invoicePreview";
import { Card, Heading, PrimaryButton } from "./ui";

const NO_DELIVERY = "We do not deliver to this postal code.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIND_US_OPTIONS = [
  { value: "google", label: "Google search" },
  { value: "social_media", label: "Social media" },
  { value: "recommendation", label: "Recommendation from friend/colleague" },
  { value: "website", label: "Company website" },
  { value: "advertisement", label: "Advertisement" },
  { value: "repeat_customer", label: "Repeat customer" },
  { value: "other", label: "Other" },
];

function Field({ label, hint, error, className, children }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-[13px] font-medium", className)}>
      <span>
        {label}
        {hint && <span className="font-normal text-taupe"> {hint}</span>}
      </span>
      {children}
      {error && <span className="text-xs font-normal text-red-700">{error}</span>}
    </label>
  );
}

const inputClass = (invalid) =>
  cn(
    "h-[52px] w-full rounded-[14px] border-[1.5px] bg-cream px-4 text-[15px] font-normal text-ink outline-none transition-colors placeholder:text-taupe/70 focus:border-plum",
    invalid ? "border-red-600" : "border-plum/20"
  );

function Section({ number, title, id, children }) {
  return (
    <Card id={id} className="flex scroll-mt-28 flex-col gap-5 p-5 md:p-7">
      <h2 className="m-0 flex items-center gap-3 text-xl font-bold">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-plum text-sm text-cream">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

const emailListError = (value) => {
  if (!value) return "";
  const invalid = value
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email !== "" && !EMAIL_REGEX.test(email));
  return invalid.length > 0 ? `Invalid email format: ${invalid.join(", ")}` : "";
};

const invoiceEmailError = (value) => {
  if (!value || value.trim() === "") return "";
  if (value.includes(",") || value.includes(";")) return "Please enter one invoice address only";
  return EMAIL_REGEX.test(value.trim()) ? "" : `Invalid email format: ${value.trim()}`;
};

export default function Checkout({
  formData,
  updateFormData,
  sandwichOptions,
  drinks,
  totalAmount,
  deliveryCost,
  deliveryError,
  disabledDates,
  isStepValid,
  getValidationMessage,
  onEdit,
  onRemoveAddon,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  // Missing fields are marked only after the customer tried to order.
  const [showErrors, setShowErrors] = useState(false);
  // idle | loading | found | notFound | error
  const [addressLookup, setAddressLookup] = useState("idle");
  // The street we filled in last; a street typed by the customer is never overwritten.
  const autoStreet = useRef(null);
  const currentStreet = useRef(formData.street);
  currentStreet.current = formData.street;

  useEffect(() => {
    const { postalCode, houseNumber } = formData;
    if (!isCompletePostcode(postalCode) || !houseNumberDigits(houseNumber)) {
      setAddressLookup("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAddressLookup("loading");
      try {
        const result = await lookupStreet(postalCode, houseNumber, { signal: controller.signal });
        if (!result) {
          setAddressLookup("notFound");
          return;
        }
        setAddressLookup("found");
        if (!currentStreet.current || currentStreet.current === autoStreet.current) {
          autoStreet.current = result.street;
          updateFormData("street", result.street);
        }
      } catch (error) {
        if (error.name !== "AbortError") setAddressLookup("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Only a new postcode or house number triggers a lookup.
  }, [formData.postalCode, formData.houseNumber]);

  const vatBreakdown = calculateVATBreakdown(totalAmount, deliveryCost || 0);

  const pickDate = (value) => {
    updateFormData("deliveryDate", value);
    // Reset time when date changes
    updateFormData("deliveryTime", "");
  };

  const setSameAsDelivery = (checked) => {
    updateFormData("sameAsDelivery", checked);
    if (checked) {
      // Copy delivery address to invoice address
      updateFormData("invoiceStreet", formData.street);
      updateFormData("invoiceHouseNumber", formData.houseNumber);
      updateFormData("invoiceHouseNumberAddition", formData.houseNumberAddition);
      updateFormData("invoicePostalCode", formData.postalCode);
      updateFormData("invoiceCity", formData.city);
    }
  };

  const toggleFindUs = (value, checked) => {
    const current = formData.howDidYouFindUs || [];
    if (checked) {
      updateFormData("howDidYouFindUs", [...current, value]);
    } else {
      updateFormData("howDidYouFindUs", current.filter((item) => item !== value));
      if (value === "other") updateFormData("howDidYouFindUsOther", "");
    }
  };

  // Same flow the old PaymentStep ran; the pending order for "order again"
  // is the only addition.
  const handlePayment = async () => {
    trackFunnelStep({
      stepName: "payment",
      stepNumber: 6,
      formData,
      sandwichOptions,
      drinks,
      totalAmount,
      extra: { payment_method: paymentMethod },
      userData: buildUserData(formData, { includeContact: true }),
    });

    try {
      setIsProcessing(true);

      const result = await generateQuote({
        ...formData,
        deliveryCost: deliveryCost || 0,
      });

      if (result.success) {
        storeOrderSnapshot(result.quoteId, {
          ecommerce: {
            transaction_id: result.quoteId,
            currency: "EUR",
            value: round2(totalAmount),
            tax: vatBreakdown.vat,
            shipping: round2(deliveryCost || 0),
            payment_type: paymentMethod,
            items: buildItems(formData, { sandwichOptions, drinks }),
          },
          user_data: buildUserData(formData, { includeContact: true }),
        });
        rememberPendingOrder(result.quoteId, formData);

        if (paymentMethod === "invoice") {
          const invoiceResponse = await fetch("/api/create-invoice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quoteId: result.quoteId,
              amount: calculateTotalWithVAT(totalAmount, deliveryCost || 0),
              orderDetails: { ...formData, deliveryCost: deliveryCost || 0 },
            }),
          });

          const invoiceData = await invoiceResponse.json();

          if (invoiceData.success) {
            window.location.href = `/payment/success?quoteId=${result.quoteId}&type=invoice`;
          } else {
            toast.error("Something went wrong placing your order. Please try again or contact us.");
          }
        } else {
          const paymentResponse = await fetch("/api/create-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quoteId: result.quoteId,
              amount: calculateTotalWithVAT(totalAmount, deliveryCost || 0),
              orderDetails: { ...formData, deliveryCost: deliveryCost || 0 },
            }),
          });

          const paymentData = await paymentResponse.json();

          if (paymentData.success) {
            window.location.href = paymentData.checkoutUrl;
          } else {
            toast.error("Something went wrong starting the payment. Please try again or contact us.");
          }
        }
      } else {
        toast.error("Something went wrong placing your order. Please try again or contact us.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong placing your order. Please try again or contact us.");
    } finally {
      setIsProcessing(false);
    }
  };

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // What is still missing, for the checklist and the red field borders. The
  // order itself is still gated by useOrderValidation (steps 4 and 5).
  const missing = {
    date: !formData.deliveryDate,
    time: !formData.deliveryTime,
    postalCode: !formData.postalCode || deliveryError === NO_DELIVERY || !formData.city,
    houseNumber: !formData.houseNumber,
    street: !formData.street,
    companyName: !formData.companyName?.trim(),
    phoneNumber: !formData.phoneNumber?.trim(),
    email: !formData.email?.trim() || !!emailListError(formData.email),
    invoiceEmail: !!invoiceEmailError(formData.invoiceEmail),
  };
  const missingLabels = [
    missing.date && "delivery date",
    missing.time && "delivery time",
    (missing.postalCode || missing.houseNumber || missing.street) && "delivery address",
    missing.companyName && "company name",
    missing.phoneNumber && "phone number",
    missing.email && "valid e-mail",
    missing.invoiceEmail && "valid invoice e-mail",
  ].filter(Boolean);
  const isComplete = isStepValid(4) && isStepValid(5);
  const invalid = (field) => showErrors && missing[field];

  const handlePlaceOrder = () => {
    if (!isComplete) setShowErrors(true);
    const stillNeeded = missingLabels.length > 0 ? `Please fill in: ${missingLabels.join(", ")}` : "";
    if (!isStepValid(4)) {
      toast.error(
        deliveryError === NO_DELIVERY
          ? NO_DELIVERY
          : stillNeeded || getValidationMessage(4) || "Please fill in all delivery fields",
        { toastId: "checkout-validation" }
      );
      scrollTo("checkout-delivery");
      return;
    }
    if (!isStepValid(5)) {
      toast.error(stillNeeded || "Please fill in your e-mail, phone number and company name", {
        toastId: "checkout-validation",
      });
      scrollTo("checkout-details");
      return;
    }

    // The old wizard sent these when leaving the delivery and details steps.
    trackFunnelStep({
      stepName: "delivery",
      stepNumber: 4,
      formData,
      sandwichOptions,
      drinks,
      totalAmount,
      extra: {
        delivery_date: formData.deliveryDate,
        delivery_time: formData.deliveryTime,
      },
      userData: buildUserData(formData),
    });
    const extra = {};
    if (formData.howDidYouFindUs?.length > 0) extra.how_found = formData.howDidYouFindUs;
    if (formData.referenceNumber) extra.reference_number = formData.referenceNumber;
    trackFunnelStep({
      stepName: "company_details",
      stepNumber: 5,
      formData,
      sandwichOptions,
      drinks,
      totalAmount,
      extra,
      userData: buildUserData(formData, { includeContact: true }),
    });

    handlePayment();
  };

  const postalEntered = (formData.postalCode || "").replace(/\s/g, "").length >= 4;
  const emailError = emailListError(formData.email);
  const emailCount = formData.email
    ? formData.email.split(",").map((e) => e.trim()).filter(Boolean).length
    : 0;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pb-16 pt-8 md:px-10 lg:flex-row lg:pt-10">
      <main className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <Heading title="Last step," accent="your details." />
        </div>

        <Section number={1} title="When and where?" id="checkout-delivery">
          <div className="flex flex-col gap-5 xl:flex-row">
            <div className="w-full rounded-[20px] border-[1.5px] border-plum/[0.14] bg-cream p-4 xl:w-[380px] xl:shrink-0">
              <DeliveryDatePicker
                value={formData.deliveryDate}
                onChange={pickDate}
                disabledDates={disabledDates}
              />
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <strong className={cn("text-base", invalid("date") && "text-red-700")}>
                  {formData.deliveryDate ? formatLongDate(formData.deliveryDate) : "Pick a delivery date"}
                </strong>
                {formData.deliveryDate && invalid("time") && (
                  <span className="text-[13px] font-medium text-red-700">Pick a delivery time</span>
                )}
                <span className="text-[13px] text-taupe">
                  Your order may arrive up to 15 minutes earlier or later than the requested time.
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3">
                {TIME_SLOTS.map((slot) => {
                  const active = formData.deliveryTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      disabled={!formData.deliveryDate}
                      onClick={() => updateFormData("deliveryTime", slot)}
                      className={cn(
                        "h-11 rounded-full border-[1.5px] text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        active ? "border-plum bg-plum text-cream" : "border-plum/20 bg-cream hover:border-plum/50"
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <Field label="Postcode">
              <input
                className={inputClass(deliveryError === NO_DELIVERY || invalid("postalCode"))}
                value={formData.postalCode}
                onChange={(e) => {
                  updateFormData("postalCode", e.target.value);
                  updateFormData("city", cityForPostcode(e.target.value, postalCodeDeliveryCosts));
                }}
                autoComplete="postal-code"
                placeholder="1075 XN"
                required
              />
            </Field>
            <Field label="House number">
              <input
                className={inputClass(invalid("houseNumber"))}
                value={formData.houseNumber}
                onChange={(e) => updateFormData("houseNumber", e.target.value)}
                required
              />
            </Field>
            <Field label="Addition" hint="(e.g. 2nd floor)" className="col-span-2 md:col-span-1">
              <input
                className={inputClass(false)}
                value={formData.houseNumberAddition}
                onChange={(e) => updateFormData("houseNumberAddition", e.target.value)}
              />
            </Field>
            <Field
              label="Street"
              hint={
                addressLookup === "loading"
                  ? "· looking up…"
                  : addressLookup === "found" && formData.street === autoStreet.current
                    ? "· filled in from your postcode"
                    : ""
              }
              className="col-span-2 md:col-span-3"
            >
              <input
                className={inputClass(invalid("street"))}
                value={formData.street}
                onChange={(e) => updateFormData("street", e.target.value)}
                autoComplete="address-line1"
                placeholder="Filled in automatically from postcode and house number"
                required
              />
              {(addressLookup === "notFound" || addressLookup === "error") && (
                <span className="text-xs font-normal text-taupe">
                  {addressLookup === "notFound"
                    ? "We couldn't find this address. Please check the postcode and house number, or type the street yourself."
                    : "Please type the street yourself."}
                </span>
              )}
            </Field>
          </div>

          {postalEntered && (
            <div
              className={cn(
                "rounded-2xl px-[18px] py-3.5 text-sm",
                deliveryError === NO_DELIVERY ? "bg-red-50 text-red-800" : "bg-[#EEF3E6] text-leaf"
              )}
            >
              {deliveryError === NO_DELIVERY ? (
                NO_DELIVERY
              ) : (
                <>
                  <strong className="font-semibold">
                    {formData.city && `${formData.city} · `}
                    {deliveryCost > 0 ? `Delivery: €${deliveryCost.toFixed(2)}` : "Free delivery"}
                  </strong>
                  {deliveryError && <span className="block text-[13px]">{deliveryError}</span>}
                </>
              )}
            </div>
          )}

          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox checked={formData.sameAsDelivery} onCheckedChange={setSameAsDelivery} />
            Invoice and delivery address are the same
          </label>

          {!formData.sameAsDelivery && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
              <Field label="Invoice street" className="col-span-2 md:col-span-3">
                <input
                  className={inputClass(false)}
                  value={formData.invoiceStreet}
                  onChange={(e) => updateFormData("invoiceStreet", e.target.value)}
                  required
                />
              </Field>
              <Field label="Postcode">
                <input
                  className={inputClass(false)}
                  value={formData.invoicePostalCode}
                  onChange={(e) => updateFormData("invoicePostalCode", e.target.value)}
                  required
                />
              </Field>
              <Field label="House number">
                <input
                  className={inputClass(false)}
                  value={formData.invoiceHouseNumber}
                  onChange={(e) => updateFormData("invoiceHouseNumber", e.target.value)}
                  required
                />
              </Field>
              <Field label="Addition" className="col-span-2 md:col-span-1">
                <input
                  className={inputClass(false)}
                  value={formData.invoiceHouseNumberAddition}
                  onChange={(e) => updateFormData("invoiceHouseNumberAddition", e.target.value)}
                />
              </Field>
              <Field label="City" className="col-span-2 md:col-span-3">
                <input
                  className={inputClass(false)}
                  value={formData.invoiceCity}
                  onChange={(e) => updateFormData("invoiceCity", e.target.value)}
                  required
                />
              </Field>
            </div>
          )}

          <Field label="Allergies or comments?" hint="(optional)">
            <textarea
              className={cn(inputClass(false), "h-24 resize-none py-3")}
              value={formData.allergies}
              onChange={(e) => updateFormData("allergies", e.target.value)}
              placeholder="E.g. one guest has a nut allergy, report at reception"
            />
          </Field>
        </Section>

        <Section number={2} title="Your details" id="checkout-details">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Company name" hint="(or your full name if it's not a company order)">
              <input
                className={inputClass(invalid("companyName"))}
                value={formData.companyName}
                onChange={(e) => updateFormData("companyName", e.target.value)}
                autoComplete="organization"
                required
              />
            </Field>
            <Field label="Phone number" hint="(contact at the delivery location)">
              <input
                type="tel"
                className={inputClass(invalid("phoneNumber"))}
                value={formData.phoneNumber}
                onChange={(e) => updateFormData("phoneNumber", e.target.value)}
                autoComplete="tel"
                placeholder="06 12345678"
                required
              />
            </Field>
            <Field
              label="E-mail for confirmation"
              error={emailError}
              className="md:col-span-2"
            >
              <input
                type="text"
                className={inputClass(!!emailError || invalid("email"))}
                value={formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                autoComplete="email"
                placeholder="you@company.com, colleague@company.com"
                required
              />
              <span className="text-xs font-normal text-taupe">
                Separate multiple addresses with commas. All of them receive the confirmation and invoice.
                {!emailError && emailCount > 1 && ` (${emailCount} addresses)`}
              </span>
            </Field>
            <Field label="Invoice e-mail" hint="(optional)" error={invoiceEmailError(formData.invoiceEmail)}>
              <input
                type="text"
                className={inputClass(!!invoiceEmailError(formData.invoiceEmail))}
                value={formData.invoiceEmail}
                onChange={(e) => updateFormData("invoiceEmail", e.target.value)}
                placeholder="finance@company.com"
              />
              <span className="text-xs font-normal text-taupe">
                One address only. Leave empty to use the address above.
              </span>
            </Field>
            <Field label="Reference / PO number" hint="(optional)">
              <input
                className={inputClass(false)}
                value={formData.referenceNumber}
                onChange={(e) => updateFormData("referenceNumber", e.target.value)}
                placeholder="Shown on your invoice"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2.5 border-t border-plum/10 pt-4">
            <span className="text-sm font-semibold">
              How did you find us? <span className="font-normal text-taupe">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {FIND_US_OPTIONS.map((option) => {
                const active = formData.howDidYouFindUs?.includes(option.value) || false;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleFindUs(option.value, !active)}
                    className={cn(
                      "h-9 rounded-full border px-3.5 text-[13px] transition-colors",
                      active ? "border-plum bg-plum text-cream" : "border-plum/20 hover:border-plum/50"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {formData.howDidYouFindUs?.includes("other") && (
              <input
                className={inputClass(false)}
                value={formData.howDidYouFindUsOther || ""}
                onChange={(e) => updateFormData("howDidYouFindUsOther", e.target.value)}
                placeholder="Please specify..."
              />
            )}
          </div>
        </Section>

        {!formData.isCompany && (
          <Section number={3} title="How would you like to pay?" id="checkout-payment">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              {[
                { id: "online", title: "Pay directly online", sub: "iDEAL, credit card, etc. via Mollie" },
                { id: "invoice", title: "Pay via invoice", sub: `Within ${PAYMENT_TERM_DAYS} days of invoice date` },
              ].map((method) => (
                <label
                  key={method.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3.5 rounded-[20px] p-5",
                    paymentMethod === method.id
                      ? "border-2 border-plum bg-cream"
                      : "border-[1.5px] border-plum/20"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="mt-0.5 h-5 w-5 accent-plum"
                  />
                  <span className="flex flex-col gap-1">
                    <strong className="text-base">{method.title}</strong>
                    <span className="text-[13px] text-taupe">{method.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>
        )}
      </main>

      <aside className="w-full lg:w-[400px] lg:shrink-0">
        <div className="flex flex-col gap-[18px] rounded-[28px] border border-plum/[0.14] bg-paper p-[26px] shadow-[0_30px_60px_-40px_rgba(56,38,40,0.5)] lg:sticky lg:top-[108px]">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-xl font-bold">Your order</h2>
            <button type="button" onClick={onEdit} className="text-[13px] text-plum underline underline-offset-[3px]">
              Change
            </button>
          </div>
          <OrderLines
            formData={formData}
            sandwichOptions={sandwichOptions}
            drinks={drinks}
            onRemoveAddon={onRemoveAddon}
            compact
          />
          <div className="border-t border-plum/10 pt-3.5">
            <Totals
              totalAmount={totalAmount}
              deliveryCost={deliveryCost}
              showDelivery
              deliveryKnown={postalEntered && deliveryError !== NO_DELIVERY}
            />
          </div>
          {(formData.deliveryDate || formData.street) && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#F6EDDF] px-3.5 py-3 text-[13px]">
              <CalendarDays className="h-[18px] w-[18px] shrink-0 text-plum" />
              <span>
                {formData.deliveryDate ? formatLongDate(formData.deliveryDate) : "No date yet"}
                {formData.deliveryTime ? `, ${formData.deliveryTime}` : ""}
                {formData.street && (
                  <span className="block text-taupe">
                    {formData.street} {formData.houseNumber}
                    {formData.houseNumberAddition ? `-${formData.houseNumberAddition}` : ""}
                  </span>
                )}
              </span>
            </div>
          )}
          {!isComplete && missingLabels.length > 0 && (
            <div className="rounded-2xl border border-plum/15 px-3.5 py-3 text-[13px]">
              <span className="font-semibold">Still needed: </span>
              <span className="text-taupe">{missingLabels.join(", ")}</span>
            </div>
          )}
          <PrimaryButton
            tone="green"
            onClick={handlePlaceOrder}
            loading={isProcessing}
            aria-disabled={!isComplete}
            className={cn(!isComplete && "opacity-50")}
          >
            {isProcessing
              ? "Processing..."
              : formData.isCompany || paymentMethod === "online"
                ? `Continue to payment · €${vatBreakdown.total.toFixed(2)}`
                : `Place order · €${vatBreakdown.total.toFixed(2)}`}
          </PrimaryButton>
          <span className="flex items-center justify-center gap-1.5 text-center text-xs text-taupe">
            <Lock className="h-3.5 w-3.5" />
            By ordering you agree to our{" "}
            <a href="/terms" className="underline">
              terms
            </a>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <QuoteButton
              formData={formData}
              sandwichOptions={sandwichOptions}
              drinks={drinks}
              totalAmount={totalAmount}
              buttonClasses="flex h-12 items-center rounded-full border-[1.5px] border-plum/25 px-3 text-[13px] font-medium text-plum hover:border-plum"
            />
            <button
              type="button"
              onClick={() => downloadInvoicePreview({ formData, deliveryCost, sandwichOptions })}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-plum/25 px-3 text-[13px] font-medium text-plum hover:border-plum"
            >
              <Download className="h-4 w-4" />
              Invoice preview
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
