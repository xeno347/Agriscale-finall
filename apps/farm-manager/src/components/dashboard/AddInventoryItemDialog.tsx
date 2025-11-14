import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface AddInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any) => void;
}

export const AddInventoryItemDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddInventoryItemDialogProps) => {

  const handleSubmit = () => {
    const newItem = {
      id: Date.now().toString(),
      itemName: (document.getElementById("item-name") as HTMLInputElement).value,
      category: (document.getElementById("category") as HTMLInputElement).value,
      sku: (document.getElementById("sku") as HTMLInputElement).value,
      unit: (document.getElementById("unit") as HTMLInputElement).value,
      currentStock: Number((document.getElementById("current-stock") as HTMLInputElement).value),
      minStock: Number((document.getElementById("min-stock") as HTMLInputElement).value),
      cost: Number((document.getElementById("cost") as HTMLInputElement).value),
      supplier: (document.getElementById("supplier") as HTMLInputElement).value,
      description: (document.getElementById("description") as HTMLTextAreaElement).value,
      purchaseDate: (document.getElementById("purchase-date") as HTMLInputElement)?.value || "",
      expiryDate: (document.getElementById("expiry-date") as HTMLInputElement)?.value || "",
    };

    onAdd(newItem);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Fill the details to add a new inventory item.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input id="item-name" placeholder="Enter item name" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seeds">Seeds</SelectItem>
                <SelectItem value="fertilizers">Fertilizers</SelectItem>
                <SelectItem value="pesticides">Pesticides</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>SKU</Label>
            <Input id="sku" placeholder="Enter SKU" />
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <Input id="unit" placeholder="kg, litres, units etc." />
          </div>

          <div className="space-y-2">
            <Label>Current Stock</Label>
            <Input id="current-stock" type="number" placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label>Minimum Stock</Label>
            <Input id="min-stock" type="number" placeholder="0" />
          </div>

          <div className="space-y-2">
            <Label>Cost per Unit (₹)</Label>
            <Input id="cost" type="number" placeholder="00.00" />
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input id="supplier" placeholder="Supplier name" />
          </div>

          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input id="purchase-date" type="date" />
          </div>

          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input id="expiry-date" type="date" />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea id="description" placeholder="Item description" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
