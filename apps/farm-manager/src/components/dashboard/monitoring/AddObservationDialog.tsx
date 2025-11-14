import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera } from "lucide-react";

export type Observation = {
  id: string;
  fieldId: string;
  fieldName: string;
  type: string;
  notes?: string;
  photoDataUrl?: string; // base64 preview
  createdAt: string;
};

type AddObservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: { id: string; name: string }[];
  onSave: (obs: Observation) => void;
};

export const observationTypes = [
  "Crop Health",
  "Irrigation",
  "Pest/Disease",
  "Soil Condition",
  "Fertilizer",
  "Other",
];

export function AddObservationDialog({ open, onOpenChange, fields, onSave }: AddObservationDialogProps) {
  const [fieldId, setFieldId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      // reset on close
      setFieldId("");
      setType("");
      setNotes("");
      setPhotoDataUrl(undefined);
    }
  }, [open]);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!fieldId || !type) {
      // simple validation - you can expand
      alert("Please select a field and observation type.");
      return;
    }
    const fieldName = fields.find((f) => f.id === fieldId)?.name ?? fieldId;
    const obs = {
      id: `OBS-${Date.now()}`,
      fieldId,
      fieldName,
      type,
      notes,
      photoDataUrl,
      createdAt: new Date().toISOString(),
    };
    onSave(obs);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Field Observation</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Record a new observation about field conditions, crop health, or activities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <div className="text-sm font-medium">Select Field</div>
            <Select onValueChange={(v) => setFieldId(v)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Choose a field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium">Observation Type</div>
            <Select onValueChange={(v) => setType(v)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {observationTypes.map((ot) => (
                  <SelectItem key={ot} value={ot}>
                    {ot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-sm font-medium">Notes</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe your observation in detail..."
              className="mt-2"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button variant="ghost" className="px-4 py-3 border">
                <Camera className="mr-2 w-4 h-4" /> Add Photo
              </Button>
            </label>

            {photoDataUrl && (
              <div className="rounded overflow-hidden border w-24 h-24">
                <img src={photoDataUrl} alt="preview" className="object-cover w-full h-full" />
              </div>
            )}

            <div className="ml-auto text-sm text-slate-500">{/* placeholder for helper */}</div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave} className="ml-2">
            Save Observation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
