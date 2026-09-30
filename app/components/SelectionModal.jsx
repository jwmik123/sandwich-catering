import React, { useState } from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronDown, Info, Plus, X } from "lucide-react";
import { breadTypes, sauces } from "@/app/assets/constants";
import { shouldHaveBreadType } from "@/lib/product-helpers";
import { formatEuro } from "@/lib/selection-pricing";
import { round2 } from "@/lib/vat-calculations";
import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";
import { Chip, PrimaryButton, QuantityStepper } from "@/app/components/order/ui";

const SelectionModal = ({
  isOpen,
  onClose,
  sandwich,
  onAdd,
}) => {
  const [quantity, setQuantity] = React.useState(1);
  const [breadType, setBreadType] = React.useState(breadTypes[0].id);
  const [sauce, setSauce] = React.useState(sauces[0].id);
  const [selectedToppings, setSelectedToppings] = React.useState([]);
  const [showAllergyInfo, setShowAllergyInfo] = useState(false);

  const handleToppingChange = (toppingName, checked) => {
    if (checked) {
      setSelectedToppings((prev) => [...prev, toppingName]);
    } else {
      setSelectedToppings((prev) => prev.filter((t) => t !== toppingName));
    }
  };

  const handleSubmit = () => {
    const qty = Math.max(1, parseInt(quantity) || 1);
    onAdd({
      sandwichId: sandwich.id,
      quantity: qty,
      breadType: shouldHaveBreadType(sandwich) ? breadType : null,
      sauce,
      toppings: selectedToppings,
      subTotal: calculateSubTotal(
        sandwich.price,
        shouldHaveBreadType(sandwich) ? breadType : null,
        qty,
        sauce,
        selectedToppings
      ),
    });
    onClose();
  };

  const calculateSubTotal = (
    basePrice,
    selectedBreadType,
    qty,
    selectedSauce,
    selectedToppings
  ) => {
    const breadSurcharge = selectedBreadType
      ? breadTypes.find((b) => b.id === selectedBreadType)?.surcharge || 0
      : 0;

    // Add sauce cost if applicable
    let sauceCost = 0;
    if (sandwich?.hasSauceOptions && selectedSauce !== "geen") {
      const sauceOption = sandwich.sauceOptions?.find(
        (s) => s.name === selectedSauce
      );
      sauceCost = sauceOption?.price || 0;
    }

    // Add topping costs if applicable
    let toppingCost = 0;
    if (sandwich?.hasToppings && selectedToppings.length > 0) {
      selectedToppings.forEach((toppingName) => {
        const toppingOption = sandwich.toppingOptions?.find(
          (t) => t.name === toppingName
        );
        if (toppingOption?.price) {
          toppingCost += toppingOption.price;
        }
      });
    }

    // Round the unit price and total to 2 decimals to match Yuki calculations
    const unitPrice = round2(basePrice + breadSurcharge + sauceCost + toppingCost);
    return round2(unitPrice * qty);
  };

  // Calculate additional costs from sauce and toppings
  const getAdditionalCosts = () => {
    let additionalCost = 0;

    // Add sauce cost if applicable
    if (sandwich?.hasSauceOptions && sauce !== "geen") {
      const selectedSauce = sandwich.sauceOptions?.find(
        (s) => s.name === sauce
      );
      if (selectedSauce?.price) {
        additionalCost += selectedSauce.price;
      }
    }

    // Add topping costs if applicable
    if (sandwich?.hasToppings && selectedToppings.length > 0) {
      selectedToppings.forEach((toppingName) => {
        const toppingOption = sandwich.toppingOptions?.find(
          (t) => t.name === toppingName
        );
        if (toppingOption?.price) {
          additionalCost += toppingOption.price;
        }
      });
    }

    return additionalCost;
  };

  const additionalCosts = getAdditionalCosts();

  // Add bread surcharge to the total
  const breadSurcharge = shouldHaveBreadType(sandwich)
    ? breadTypes.find((b) => b.id === breadType)?.surcharge || 0
    : 0;

  const totalPerItem = round2((sandwich?.price || 0) + breadSurcharge + additionalCosts);
  const totalPrice = round2(totalPerItem * (parseInt(quantity) || 1));

  const selectedBread = breadTypes.find((b) => b.id === breadType);
  const sauceSurcharge =
    sandwich?.hasSauceOptions && sauce !== "geen"
      ? sandwich.sauceOptions?.find((s) => s.name === sauce)?.price || 0
      : 0;
  const toppingSurcharge = selectedToppings.reduce(
    (total, toppingName) =>
      total + (sandwich.toppingOptions?.find((t) => t.name === toppingName)?.price || 0),
    0
  );
  const hasAllergyInfo = sandwich?.allergyInfo?.length > 0 || sandwich?.allergyNotes;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:items-center sm:p-6">
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-cream text-ink shadow-[0_30px_60px_-30px_rgba(56,38,40,0.6)] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 sm:max-h-[88vh] sm:w-[480px] sm:rounded-[28px] sm:data-[state=open]:slide-in-from-bottom-4"
          >
            <div className="overflow-y-auto">
              <div className="relative h-44 shrink-0 overflow-hidden bg-[#EEEBE6] sm:h-48">
                {sandwich?.image && (
                  <Image
                    src={urlFor(sandwich.image).width(960).height(480).fit("crop").url()}
                    alt={sandwich.name}
                    fill
                    sizes="480px"
                    className="scale-[1.3] object-cover"
                  />
                )}
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream/95 text-plum shadow-sm"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>
              </div>

              <div className="flex flex-col gap-6 px-5 pb-6 pt-5 sm:px-7">
                <div className="flex flex-col gap-1.5">
                  <DialogPrimitive.Title className="m-0 text-2xl font-extrabold uppercase leading-[1] tracking-[-0.03em]">
                    {sandwich?.name}
                  </DialogPrimitive.Title>
                  {sandwich?.description && (
                    <p className="m-0 text-[13px] leading-[1.45] text-taupe">{sandwich.description}</p>
                  )}
                  <span className="text-base font-semibold">{formatEuro(sandwich?.price || 0)}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">Amount</span>
                  <QuantityStepper
                    label={sandwich?.name}
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    size="sm"
                  />
                </div>

                {/* Only show bread type selection for sandwiches (specials/basics) */}
                {shouldHaveBreadType(sandwich) && (
                  <fieldset className="flex flex-col gap-2.5">
                    <legend className="mb-2.5 text-sm font-semibold">Bread</legend>
                    {breadTypes.map((bread) => {
                      const active = breadType === bread.id;
                      return (
                        <button
                          key={bread.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setBreadType(bread.id)}
                          className={cn(
                            "flex h-14 items-center gap-3 rounded-[18px] border-[1.5px] bg-paper px-4 text-left text-sm transition-colors",
                            active ? "border-plum" : "border-plum/15 hover:border-plum/40"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                              active ? "border-plum bg-plum" : "border-plum/30"
                            )}
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-cream" />}
                          </span>
                          <span className="flex-1 font-medium">{bread.name}</span>
                          <span className="tabular-nums text-taupe">
                            {bread.surcharge > 0 ? `+${formatEuro(bread.surcharge)}` : "Included"}
                          </span>
                        </button>
                      );
                    })}
                  </fieldset>
                )}

                {sandwich.hasSauceOptions && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-sm font-semibold">Sauce</span>
                    <div className="flex flex-wrap gap-2">
                      <Chip active={sauce === "geen"} onClick={() => setSauce("geen")}>
                        No sauce
                      </Chip>
                      {sandwich?.sauceOptions?.map((sauceOption) => (
                        <Chip
                          key={sauceOption.name}
                          active={sauce === sauceOption.name}
                          onClick={() => setSauce(sauceOption.name)}
                        >
                          {sauceOption.name}
                          {sauceOption.price > 0 && (
                            <span className="ml-1 opacity-70">+{formatEuro(sauceOption.price)}</span>
                          )}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {sandwich.hasToppings && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-sm font-semibold">
                      Toppings <span className="font-normal text-taupe">· choose any</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sandwich?.toppingOptions?.map((toppingOption) => {
                        const active = selectedToppings.includes(toppingOption.name);
                        return (
                          <Chip
                            key={toppingOption.name}
                            active={active}
                            onClick={() => handleToppingChange(toppingOption.name, !active)}
                            className="inline-flex items-center gap-1.5"
                          >
                            {active ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                            )}
                            {toppingOption.name}
                            {toppingOption.price > 0 && (
                              <span className="opacity-70">
                                +{formatEuro(Number(toppingOption.price || 0))}
                              </span>
                            )}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                )}

                {hasAllergyInfo && (
                  <div className="rounded-[18px] bg-sand px-4 py-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => setShowAllergyInfo(!showAllergyInfo)}
                      aria-expanded={showAllergyInfo}
                      className="flex w-full items-center gap-2 font-semibold text-plum"
                    >
                      <Info className="h-4 w-4" />
                      Allergy information
                      <ChevronDown
                        className={cn("ml-auto h-4 w-4 transition-transform", showAllergyInfo && "rotate-180")}
                      />
                    </button>
                    {showAllergyInfo && (
                      <div className="mt-2 flex flex-col gap-2 text-taupe">
                        {sandwich.allergyInfo?.length > 0 && (
                          <p className="m-0">
                            Contains or may contain:{" "}
                            <span className="capitalize text-ink">
                              {sandwich.allergyInfo.join(", ")}
                            </span>
                          </p>
                        )}
                        {sandwich.allergyNotes && <p className="m-0 italic">{sandwich.allergyNotes}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t border-plum/10 pt-4 text-sm">
                  <div className="flex justify-between text-taupe">
                    <span>Base price</span>
                    <span className="tabular-nums">{formatEuro(sandwich?.price || 0)}</span>
                  </div>
                  {shouldHaveBreadType(sandwich) && selectedBread?.surcharge > 0 && (
                    <div className="flex justify-between text-taupe">
                      <span>{selectedBread.name}</span>
                      <span className="tabular-nums">+{formatEuro(selectedBread.surcharge)}</span>
                    </div>
                  )}
                  {sandwich?.hasSauceOptions && sauce !== "geen" && (
                    <div className="flex justify-between text-taupe">
                      <span>Sauce</span>
                      <span className="tabular-nums">+{formatEuro(sauceSurcharge)}</span>
                    </div>
                  )}
                  {sandwich?.hasToppings && selectedToppings.length > 0 && (
                    <div className="flex justify-between text-taupe">
                      <span>Toppings</span>
                      <span className="tabular-nums">+{formatEuro(toppingSurcharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-taupe">
                    <span>Per item</span>
                    <span className="tabular-nums">{formatEuro(totalPerItem)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xl font-bold">
                    <span>Total ({quantity || 1}×)</span>
                    <span className="tabular-nums">{formatEuro(totalPrice)}</span>
                  </div>
                  <span className="text-xs text-taupe">Prices excl. VAT</span>
                </div>
              </div>
            </div>

            <div className="border-t border-plum/10 bg-cream px-5 pb-5 pt-4 sm:px-7">
              <PrimaryButton onClick={handleSubmit}>Add to order</PrimaryButton>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SelectionModal;
