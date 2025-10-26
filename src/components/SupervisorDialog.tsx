import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
// UPDATED: Import the correct type from the API types file
import type { Supervisor } from "@/types/api";

interface SupervisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // This prop now expects the form data
  onSave: (
    data: Omit<Supervisor, "id"> & {
      name: string;
      email: string;
      phone: string;
      assigned_plots: string[];
    }
  ) => void;
  supervisor: Supervisor | null;
}

const availablePlots = [
  "Plot A",
  "Plot B",
  "Plot C",
  "Plot D",
  "Plot E",
  "Plot F",
  "Plot G",
  "Plot H",
];

export const SupervisorDialog = ({
  open,
  onOpenChange,
  onSave,
  supervisor,
}: SupervisorDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    assigned_plots: [] as string[], // UPDATED: to snake_case
  });

  useEffect(() => {
    if (supervisor) {
      setFormData({
        name: supervisor.name,
        email: supervisor.email,
        phone: supervisor.phone,
        assigned_plots: supervisor.assigned_plots, // UPDATED: to snake_case
      });
    } else {
      // Reset for "Add New"
      setFormData({
        name: "",
        email: "",
        phone: "",
        assigned_plots: [],
      });
    }
  }, [supervisor, open]); // Added 'open' to reset form when re-opened

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // onSave passes the raw form data up to the parent
    onSave(formData);
  };

  const togglePlot = (plot: string) => {
    setFormData((prev) => ({
      ...prev,
      // UPDATED: to snake_case
      assigned_plots: prev.assigned_plots.includes(plot)
        ? prev.assigned_plots.filter((p) => p !== plot)
        : [...prev.assigned_plots, plot],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {supervisor ? "Edit Supervisor" : "Add New Supervisor"}
          </DialogTitle>
          <DialogDescription>
            Fill in the supervisor details and assign plots for management
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Assign Plots</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availablePlots.map((plot) => (
                <div key={plot} className="flex items-center space-x-2">
                  <Checkbox
                    id={plot}
                    // UPDATED: to snake_case
                    checked={formData.assigned_plots.includes(plot)}
                    onCheckedChange={() => togglePlot(plot)}
                  />
                  <label
                    htmlFor={plot}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {plot}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {supervisor ? "Save Changes" : "Add Supervisor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};