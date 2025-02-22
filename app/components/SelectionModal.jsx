import React from "react";
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
import { breadTypes, sauces } from "@/app/assets/constants";
import { isDrink } from "@/lib/product-helpers";

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

  // For drinks, we don't limit by remainingQuantity
  const quantityOptions = React.useMemo(() => {
    const maxQuantity = isDrink(sandwich) ? 10 : remainingQuantity;
    return Array.from({ length: maxQuantity }, (_, i) => (i + 1).toString());
  }, [remainingQuantity, sandwich]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Selecteer Opties - {sandwich?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Aantal</Label>
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
              <Label>Broodsoort</Label>
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
              <Label>Saus</Label>
              <Select value={sauce} onValueChange={setSauce}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geen">Geen Saus</SelectItem>
                  {sandwich.sauceOptions.map((sauceOption) => (
                    <SelectItem key={sauceOption.name} value={sauceOption.name}>
                      {sauceOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit}>Toevoegen aan Bestelling</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectionModal;
