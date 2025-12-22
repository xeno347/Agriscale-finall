import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddLeadFormData) => Promise<void>;
}

export interface AddLeadFormData {
  fullName: string;
  phoneNumber: string;
  alternatePhone?: string;
  leadSource: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  estimatedLandArea?: number;
  waterAvailable: boolean;
  notes?: string;
}

const AddLeadModal = ({ open, onClose, onSubmit }: AddLeadModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AddLeadFormData>({
    fullName: '',
    phoneNumber: '',
    alternatePhone: '',
    leadSource: '',
    village: '',
    taluka: '',
    district: '',
    state: '',
    estimatedLandArea: undefined,
    waterAvailable: false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        fullName: '',
        phoneNumber: '',
        alternatePhone: '',
        leadSource: '',
        village: '',
        taluka: '',
        district: '',
        state: '',
        estimatedLandArea: undefined,
        waterAvailable: false,
        notes: '',
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Add New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter farmer's full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternatePhone">Alternate Phone</Label>
              <Input
                id="alternatePhone"
                value={formData.alternatePhone}
                onChange={e => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadSource">Lead Source *</Label>
              <Select
                value={formData.leadSource}
                onValueChange={value => setFormData(prev => ({ ...prev, leadSource: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Field Agent">Field Agent</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Digital Campaign">Digital Campaign</SelectItem>
                  <SelectItem value="Village Meeting">Village Meeting</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="village">Village *</Label>
              <Input
                id="village"
                required
                value={formData.village}
                onChange={e => setFormData(prev => ({ ...prev, village: e.target.value }))}
                placeholder="Enter village name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taluka">Taluka</Label>
              <Input
                id="taluka"
                value={formData.taluka}
                onChange={e => setFormData(prev => ({ ...prev, taluka: e.target.value }))}
                placeholder="Enter taluka"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Input
                id="district"
                required
                value={formData.district}
                onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
                placeholder="Enter district"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={value => setFormData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                  <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                  <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                  <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                  <SelectItem value="Bihar">Bihar</SelectItem>
                  <SelectItem value="Gujarat">Gujarat</SelectItem>
                  <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                  <SelectItem value="Karnataka">Karnataka</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedLandArea">Estimated Land Area (acres)</Label>
              <Input
                id="estimatedLandArea"
                type="number"
                value={formData.estimatedLandArea || ''}
                onChange={e => setFormData(prev => ({ ...prev, estimatedLandArea: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Enter area in acres"
              />
            </div>

            <div className="space-y-2">
              <Label>Water Available</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formData.waterAvailable}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, waterAvailable: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.waterAvailable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this lead..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadModal;
