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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddEmployeeDialog = ({ open, onOpenChange }: AddEmployeeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Add a new employee to the agricultural operations team
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input id="full-name" placeholder="Enter name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="example@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Field Manager</SelectItem>
                  <SelectItem value="agronomist">Agronomist</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="seasonal">Seasonal Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary (₹) *</Label>
              <Input id="salary" type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-type">Salary Type *</Label>
              <Select>
                <SelectTrigger id="salary-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aadhar">Aadhar Number</Label>
              <Input id="aadhar" placeholder="XXXX-XXXX-XXXX-XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pan">PAN Number (Optional)</Label>
              <Input id="pan" placeholder="ABCDE1234F" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-account">Bank Account</Label>
              <Input id="bank-account" placeholder="Account number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input id="ifsc" placeholder="SBIN0001234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency-contact">Emergency Contact</Label>
              <Input id="emergency-contact" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-date">Join Date</Label>
              <Input id="join-date" type="text" placeholder="dd/mm/yyyy" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="Enter complete address" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="specializations">Specializations (comma-separated)</Label>
              <Input id="specializations" placeholder="e.g., Tractor Operation, Irrigation" />
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Add Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};