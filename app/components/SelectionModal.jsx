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
import { breadTypes, sauces } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";
import { Info, X } from "lucide-react";
import { urlFor } from "@/sanity/lib/image";

const SelectionModal = ({
  isOpen,
  onClose,
  sandwich,
  onAdd,
  remainingQuantity,
}) => {
  const [quantity, setQuantity] = React.useState("1");
  const [breadType, setBreadType] = React.useState(breadTypes[0].id);
  const [sauce, setSauce] = React.useState(sauces[0].id);
  const [showAllergyInfo, setShowAllergyInfo] = useState(false);

  // Create quantity options from 1 to 100, regardless of item type
  const quantityOptions = React.useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => (i + 1).toString());
  }, []);

  const handleSubmit = () => {
    onAdd({
      sandwichId: sandwich.id,
      quantity: parseInt(quantity),
      breadType: isDrink(sandwich) ? null : breadType,
      sauce,
      subTotal: calculateSubTotal(
        sandwich.price,
        isDrink(sandwich) ? null : breadType,
        parseInt(quantity)
      ),
    });
    onClose();
  };

  const calculateSubTotal = (basePrice, selectedBreadType, qty) => {
    const breadSurcharge = selectedBreadType
      ? breadTypes.find((b) => b.id === selectedBreadType)?.surcharge || 0
      : 0;
    return (basePrice + breadSurcharge) * qty;
  };

  const currentSubTotal = calculateSubTotal(
    sandwich?.price || 0,
    isDrink(sandwich) ? null : breadType,
    parseInt(quantity)
  );

  console.log(sandwich);
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
        <div className="relative w-full h-40 overflow-hidden rounded-t-lg">
          <div
            className="absolute inset-0 scale-150 bg-center bg-cover"
            style={{
              backgroundImage: `url(${urlFor(sandwich?.image).url()})`,
            }}
          />
          <Button
            variant="link"
            size="icon"
            onClick={onClose}
            className="absolute w-8 h-8 text-black rounded-full top-2 right-2"
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between w-full mt-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setShowAllergyInfo(!showAllergyInfo)}
                    className="flex items-center justify-center w-8 h-8 rounded-md cursor-pointer"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background p-6 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
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
