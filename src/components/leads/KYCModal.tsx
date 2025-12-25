import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lead } from '@/types/farm';
import { Loader2, CreditCard, Building, User, Upload, X, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface KYCModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: {
    aadhaarNumber: string;
    panNumber: string;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  }) => Promise<void>;
}

const KYCModal = ({ open, onClose, lead, onSubmit }: KYCModalProps) => {
  const [step, setStep] = useState<'documents' | 'bank'>('documents');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    panNumber: '',
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  if (!lead) return null;



  const isStep1Valid = () => {
    return formData.aadhaarNumber && formData.panNumber && formData.address;
  };

  const isStep2Valid = () => {
    return formData.bankName && formData.accountNumber && formData.ifscCode;
  };

  const handleNextStep = () => {
    if (isStep1Valid()) {
      setStep('bank');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        address: formData.address,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">KYC Registration</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'documents' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">1</span>
            Documents
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">2</span>
            Bank Details
          </div>
        </div>

        {step === 'documents' ? (
        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6 pt-4">
          {/* Identity Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <User className="w-4 h-4" />
              <span>Identity Documents</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
                <Input
                  id="aadhaarNumber"
                  required
                  value={formData.aadhaarNumber}
                  onChange={e => setFormData(prev => ({ ...prev, aadhaarNumber: e.target.value }))}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number *</Label>
                <Input
                  id="panNumber"
                  required
                  value={formData.panNumber}
                  onChange={e => setFormData(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CreditCard className="w-4 h-4" />
              <span>Address Details</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                required
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter complete address with PIN code"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isStep1Valid()} className="gap-2">
              Next: Bank Details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Bank Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Building className="w-4 h-4" />
              <span>Bank Details</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  required
                  value={formData.bankName}
                  onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="Enter bank name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  required
                  value={formData.accountNumber}
                  onChange={e => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="Enter account number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code *</Label>
                <Input
                  id="ifscCode"
                  required
                  value={formData.ifscCode}
                  onChange={e => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="SBIN0001234"
                  maxLength={11}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStep('documents')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isStep2Valid() || loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Check className="w-4 h-4" />
                Complete Registration
              </Button>
            </div>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KYCModal;
