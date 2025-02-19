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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { breadTypes, sauces } from "@/app/assets/constants";

const SelectionModal = ({
  isOpen,
  onClose,
  sandwich,
  onAdd,
  remainingQuantity,
}) => {
  const [quantity, setQuantity] = React.useState(1);
  const [breadType, setBreadType] = React.useState(breadTypes[0].id);
  const [sauce, setSauce] = React.useState(sauces[0].id);

  const handleSubmit = () => {
    onAdd({
      sandwichId: sandwich.id,
      quantity,
      breadType,
      sauce,
      subTotal: calculateSubTotal(sandwich.price, breadType, quantity),
    });
    onClose();
  };

  const calculateSubTotal = (basePrice, selectedBreadType, qty) => {
    const breadSurcharge =
      breadTypes.find((b) => b.id === selectedBreadType)?.surcharge || 0;
    return (basePrice + breadSurcharge) * qty;
  };

  const currentSubTotal = calculateSubTotal(
    sandwich?.price || 0,
    breadType,
    quantity
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
            <Input
              type="number"
              min="1"
              max={remainingQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20"
            />
          </div>

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
                    <SelectItem
                      key={sauceOption.name} // Using name as key since it should be unique
                      value={sauceOption.name} // Using name as value instead of _id
                    >
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
