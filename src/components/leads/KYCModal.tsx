import { useEffect, useId, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Lead } from '@/types/farm';
import { Loader2, CreditCard, Building, User, Upload, Check, ArrowRight, ArrowLeft, FileText } from 'lucide-react';

function FileUploadField(props: {
  label: string;
  accept: string;
  file: File | null | undefined;
  onChange: (file: File | null) => void;
  helperText?: string;
}) {
  const inputId = useId();

  const previewUrl = useMemo(() => {
    if (!props.file) return null;
    return URL.createObjectURL(props.file);
  }, [props.file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isPdf = Boolean(props.file?.type === 'application/pdf' || props.file?.name?.toLowerCase().endsWith('.pdf'));
  const isImage = Boolean(props.file?.type?.startsWith('image/'));

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{props.label}</Label>

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept={props.accept}
          className="hidden"
          onChange={(e) => props.onChange(e.target.files?.[0] || null)}
        />
        <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById(inputId)?.click()}>
          <Upload className="w-4 h-4" />
          Choose file
        </Button>
        {props.file && (
          <Button type="button" variant="ghost" onClick={() => props.onChange(null)}>
            Remove
          </Button>
        )}
      </div>

      {props.helperText && <p className="text-xs text-muted-foreground">{props.helperText}</p>}

      {props.file && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{props.file.name}</p>
              <p className="text-xs text-muted-foreground">{Math.ceil(props.file.size / 1024)} KB</p>
            </div>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline whitespace-nowrap"
              >
                Open
              </a>
            )}
          </div>

          {previewUrl && isImage && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Uploaded preview"
                className="h-28 w-full object-cover rounded-md border"
              />
            </div>
          )}

          {previewUrl && isPdf && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                PDF preview
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-40 rounded-md border bg-background"
                title="PDF preview"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface KYCModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: {
    aadhaarNumber: string;
    aadhaarPhoto?: File | null;
    profilePhoto?: File | null;
    leaseRent?: number;
    panNumber: string;
    panPhoto?: File | null;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    passbookPhoto?: File | null;
    agreementFile?: File | null;
    agreementStart?: string;
    agreementEnd?: string;
    b1Record?: File | null;
    kisanBook?: File | null;
  }) => Promise<void>;
}

const KYCModal = ({ open, onClose, lead, onSubmit }: KYCModalProps) => {
  const [step, setStep] = useState<'documents' | 'bank' | 'agreement'>('documents');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    panNumber: '',
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    leaseRent: '',
  });
  const [files, setFiles] = useState<{
    aadhaarPhoto?: File | null;
    panPhoto?: File | null;
    passbookPhoto?: File | null;
    profilePhoto?: File | null;
    agreementFile?: File | null;
    b1Record?: File | null;
    kisanBook?: File | null;
  }>({});

  if (!lead) return null;



  const isStep1Valid = () => {
    return formData.aadhaarNumber && formData.panNumber && formData.address;
  };

  const isStep2Valid = () => {
    return formData.bankName && formData.accountNumber && formData.ifscCode;
  };

  const isStep3Valid = () => {
    // agreement is optional for now; return true
    return true;
  };

  const handleNextStep = () => {
    if (isStep1Valid()) {
      setStep('bank');
    }
  };

  const handleNextToAgreement = () => {
    if (isStep2Valid()) setStep('agreement');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // collect agreement dates from DOM inputs since stored separately for simplicity
      const agreementStart = (document.getElementById('agreementStart') as HTMLInputElement | null)?.value;
      const agreementEnd = (document.getElementById('agreementEnd') as HTMLInputElement | null)?.value;

      await onSubmit({
        aadhaarNumber: formData.aadhaarNumber,
        aadhaarPhoto: files.aadhaarPhoto || null,
        profilePhoto: files.profilePhoto || null,
        panNumber: formData.panNumber,
        panPhoto: files.panPhoto || null,
        address: formData.address,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        leaseRent: formData.leaseRent ? Number(formData.leaseRent) : undefined,
        passbookPhoto: files.passbookPhoto || null,
        agreementFile: files.agreementFile || null,
        agreementStart: agreementStart || undefined,
        agreementEnd: agreementEnd || undefined,
        b1Record: files.b1Record || null,
        kisanBook: files.kisanBook || null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">KYC Registration</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2 flex-wrap">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'documents' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">1</span>
            Documents
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">2</span>
            Bank Details
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${step === 'agreement' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">3</span>
            Agreement
          </div>
        </div>

        {step === 'documents' && (
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
            {/* Aadhaar & PAN uploads */}
            <div className="grid grid-cols-3 gap-4">
              <FileUploadField
                label="Aadhaar Photo (PNG)"
                accept="image/png"
                file={files.aadhaarPhoto}
                onChange={(file) => setFiles(prev => ({ ...prev, aadhaarPhoto: file }))}
                helperText="PNG only"
              />

              <FileUploadField
                label="PAN Card (PNG)"
                accept="image/png"
                file={files.panPhoto}
                onChange={(file) => setFiles(prev => ({ ...prev, panPhoto: file }))}
                helperText="PNG only"
              />

              <FileUploadField
                label="Profile Photo"
                accept="image/png,image/jpeg"
                file={files.profilePhoto}
                onChange={(file) => setFiles(prev => ({ ...prev, profilePhoto: file }))}
                helperText="PNG or JPG"
              />
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
        )}
        {step === 'bank' && (
        <form onSubmit={(e) => { e.preventDefault(); handleNextToAgreement(); }} className="space-y-6 pt-4">
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
            <FileUploadField
              label="Passbook front / Cancelled cheque (image)"
              accept="image/png,image/jpeg"
              file={files.passbookPhoto}
              onChange={(file) => setFiles(prev => ({ ...prev, passbookPhoto: file }))}
              helperText="PNG or JPG"
            />
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
              <Button type="submit" disabled={!isStep2Valid()} className="gap-2">
                Next: Agreement
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
        )}
        {step === 'agreement' && (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Agreement Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Upload className="w-4 h-4" />
              <span>Agreement & Records</span>
            </div>

            <FileUploadField
              label="Agreement Contract (PDF)"
              accept="application/pdf"
              file={files.agreementFile}
              onChange={(file) => setFiles(prev => ({ ...prev, agreementFile: file }))}
              helperText="PDF only"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agreementStart">Agreement Start</Label>
                <Input id="agreementStart" type="date" onChange={e => {/* handled on submit */}} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreementEnd">Agreement End</Label>
                <Input id="agreementEnd" type="date" onChange={e => {/* handled on submit */}} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaseRent">Lease Rent (₹)</Label>
                <Input
                  id="leaseRent"
                  type="number"
                  min={0}
                  step={1}
                  value={formData.leaseRent}
                  onChange={e => setFormData(prev => ({ ...prev, leaseRent: e.target.value }))}
                  placeholder="Enter lease rent in rupees"
                />
              </div>
            </div>

            <FileUploadField
              label="B1 Record (PDF)"
              accept="application/pdf"
              file={files.b1Record}
              onChange={(file) => setFiles(prev => ({ ...prev, b1Record: file }))}
              helperText="PDF only"
            />

            <FileUploadField
              label="Kisan Book (PDF)"
              accept="application/pdf"
              file={files.kisanBook}
              onChange={(file) => setFiles(prev => ({ ...prev, kisanBook: file }))}
              helperText="PDF only"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setStep('bank')} className="gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KYCModal;
