import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { breadTypes, sauces, toppings } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";
import { Info, X } from "lucide-react";
import { urlFor } from "@/sanity/lib/image";

const SelectionModal = ({
  isOpen,
  onClose,
  sandwich,
  onAdd,
}) => {
  const [quantity, setQuantity] = React.useState("1");
  const [breadType, setBreadType] = React.useState(breadTypes[0].id);
  const [sauce, setSauce] = React.useState(sauces[0].id);
  const [selectedToppings, setSelectedToppings] = React.useState([]);
  const [showAllergyInfo, setShowAllergyInfo] = useState(false);

  // Create quantity options from 1 to 100, regardless of item type
  const quantityOptions = React.useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => (i + 1).toString());
  }, []);

  const handleToppingChange = (toppingName, checked) => {
    if (checked) {
      setSelectedToppings((prev) => [...prev, toppingName]);
    } else {
      setSelectedToppings((prev) => prev.filter((t) => t !== toppingName));
    }
  };

  const handleSubmit = () => {
    onAdd({
      sandwichId: sandwich.id,
      quantity: parseInt(quantity),
      breadType: isDrink(sandwich) ? null : breadType,
      sauce,
      toppings: selectedToppings,
      subTotal: calculateSubTotal(
        sandwich.price,
        isDrink(sandwich) ? null : breadType,
        parseInt(quantity),
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

    return (basePrice + breadSurcharge + sauceCost + toppingCost) * qty;
  };

  const currentSubTotal = calculateSubTotal(
    sandwich?.price || 0,
    isDrink(sandwich) ? null : breadType,
    parseInt(quantity),
    sauce,
    selectedToppings
  );

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
  const totalPerItem = (sandwich?.price || 0) + additionalCosts;
  const totalPrice = totalPerItem * parseInt(quantity);

  // console.log(sandwich);
  // Helper function to display allergy information
  const renderAllergyInfo = () => {
    if (!sandwich?.allergyInfo || sandwich.allergyInfo.length === 0) {
      return "No allergy information available";
    }

    return (
      <div className="space-y-2">
        <p className="font-medium">This product contains or may contain:</p>
        <ul className="pl-5 text-sm list-disc">
          {sandwich.allergyInfo.map((allergen) => (
            <li key={allergen} className="capitalize">
              {allergen}
            </li>
          ))}
        </ul>
        {sandwich.allergyNotes && (
          <p className="mt-2 text-sm italic">{sandwich.allergyNotes}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <div className="overflow-hidden relative w-full h-40 rounded-t-lg">
          <div
            className="absolute inset-0 bg-center bg-cover scale-150"
            style={{
              backgroundImage: `url(${urlFor(sandwich?.image).url()})`,
            }}
          />
          <Button
            variant="link"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 text-black rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Select options - {sandwich?.name}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Select value={quantity} onValueChange={setQuantity}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quantityOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Only show bread type selection for non-drinks */}
            {!isDrink(sandwich) && (
              <div className="space-y-2">
                <Label>Bread type</Label>
                <Select value={breadType} onValueChange={setBreadType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {breadTypes.map((bread) => (
                      <SelectItem key={bread.id} value={bread.id}>
                        {bread.name}
                        {bread.surcharge > 0 &&
                          ` (+€${bread.surcharge.toFixed(2)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sandwich.hasSauceOptions && (
              <div className="space-y-2">
                <Label>Sauce</Label>
                <Select value={sauce} onValueChange={setSauce}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geen">No Sauce</SelectItem>
                    {sandwich?.sauceOptions?.map((sauceOption) => (
                      <SelectItem
                        key={sauceOption.name}
                        value={sauceOption.name}
                      >
                        {sauceOption.name}
                        {sauceOption.price > 0 &&
                          ` (+€${sauceOption.price.toFixed(2)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sandwich.hasToppings && (
              <div className="space-y-2">
                <Label>Toppings</Label>
                <div className="overflow-y-auto p-3 space-y-2 max-h-32 rounded-md border">
                  {sandwich?.toppingOptions?.map((toppingOption) => (
                    <div
                      key={toppingOption.name}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={toppingOption.name}
                        checked={selectedToppings.includes(toppingOption.name)}
                        onCheckedChange={(checked) =>
                          handleToppingChange(toppingOption.name, checked)
                        }
                      />
                      <Label
                        htmlFor={toppingOption.name}
                        className="flex-1 text-sm font-normal cursor-pointer"
                      >
                        {toppingOption.name}
                        {toppingOption.price > 0 && (
                          <span className="ml-1 text-gray-500">
                            (+€{Number(toppingOption.price || 0).toFixed(2)})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Display */}
            <div className="pt-4 mt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base price:</span>
                  <span>€{sandwich?.price?.toFixed(2) || "0.00"}</span>
                </div>
                {!isDrink(sandwich) &&
                  breadTypes.find((b) => b.id === breadType)?.surcharge > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Bread surcharge:</span>
                      <span>
                        +€
                        {breadTypes
                          .find((b) => b.id === breadType)
                          ?.surcharge.toFixed(2)}
                      </span>
                    </div>
                  )}
                {sandwich?.hasSauceOptions && sauce !== "geen" && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Sauce:</span>
                    <span>
                      +€
                      {sandwich.sauceOptions
                        ?.find((s) => s.name === sauce)
                        ?.price?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                )}
                {sandwich?.hasToppings && selectedToppings.length > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Toppings:</span>
                    <span>
                      +€
                      {selectedToppings
                        .reduce((total, toppingName) => {
                          const toppingOption = sandwich.toppingOptions?.find(
                            (t) => t.name === toppingName
                          );
                          return total + (toppingOption?.price || 0);
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-sm font-medium border-t">
                  <span>Price per item:</span>
                  <span>€{totalPerItem.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total ({quantity}x):</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center mt-6 w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setShowAllergyInfo(!showAllergyInfo)}
                    className="flex justify-center items-center w-8 h-8 rounded-md cursor-pointer"
                  >
                    <Info className="w-5 h-5 text-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Click for allergy information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Add to order</Button>
            </div>
          </DialogFooter>

          {/* Allergy Information Dialog */}
          {showAllergyInfo && (
            <div className="flex fixed inset-0 z-50 justify-center items-center bg-black/50">
              <div className="bg-background p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Allergy Information</h3>
                  <Button
                    variant="ghost"
                    className="!hover:bg-transparent"
                    size="sm"
                    onClick={() => setShowAllergyInfo(false)}
                  >
                    ✕
                  </Button>
                </div>
                {renderAllergyInfo()}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectionModal;
