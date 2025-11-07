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
}

export const AddInventoryItemDialog = ({ open, onOpenChange }: AddInventoryItemDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to the inventory management system
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input id="item-name" placeholder="Enter item name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" placeholder="Enter SKU" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="kg, litres, units, etc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-stock">Current Stock</Label>
            <Input id="current-stock" type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-stock">Minimum Stock</Label>
            <Input id="min-stock" type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost">Cost per Unit (₹)</Label>
            <Input id="cost" type="number" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input id="supplier" placeholder="Supplier name" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Item description" />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};