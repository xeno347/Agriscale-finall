import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Eye,
  FileText,
  FileUp,
  Flag,
  IdCard,
  BookOpen,
  FileBadge2,
  Landmark,
  Loader2,
  Save,
  Plus,
} from 'lucide-react';
import getBaseUrl from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import CredentialsDialog from '@/components/farmers/CredentialsDialog';
import { findAmritAgrotech } from './api';
import type { FarmerDetail } from './types';

type DocumentKey = 'adhar_card' | 'pand_card' | 'kisan_book' | 'B1_record' | 'agreement' | 'bank_passbook';

const DocumentPreview = ({ title, url }: { title: string; url: string }) => {
  const lower = url.toLowerCase();
  const isImage = /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(lower);
  const isPdf = /\.pdf(\?|$)/i.test(lower);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
          title={title}
        >
          <Eye className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {!url ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No document uploaded</div>
        ) : isImage ? (
          <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted/10 p-2">
            <img src={url} alt={title} className="h-auto w-full rounded" />
          </div>
        ) : isPdf ? (
          <div className="h-[70vh] overflow-hidden rounded-md border">
            <iframe src={url} title={title} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Preview not supported for this file type.</span>
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open document</a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const DocumentUploadCard = ({
  title,
  icon: Icon,
  existingUrl,
  file,
  onFileChange,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  existingUrl: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) => {
  const statusText = file ? file.name : existingUrl ? 'Current document available' : 'No document uploaded';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{title}</p>
              <p className={`mt-0.5 truncate text-[11px] ${file ? 'text-emerald-700' : existingUrl ? 'text-slate-500' : 'text-slate-400'}`}>
                {statusText}
              </p>
            </div>
            {existingUrl ? <DocumentPreview title={title} url={existingUrl} /> : null}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
            <FileUp className="h-3.5 w-3.5" />
            {file ? 'Replace selected file' : existingUrl ? 'Replace document' : 'Upload document'}
            <input type="file" className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>
    </div>
  );
};

export type AmritAgrotechProfileProps = {
  farmerId: string;
  farmer: FarmerDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (farmer: FarmerDetail) => void;
};

const AmritAgrotechProfile = ({ farmerId, farmer, open, onOpenChange, onUpdated }: AmritAgrotechProfileProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const [form, setForm] = useState({
    phoneNumber: '',
    alternatePhone: '',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
    leaseRent: '',
    agreementStartDate: '',
    agreementEndDate: '',
    bankHolderName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
  });
  const [files, setFiles] = useState<Partial<Record<DocumentKey, File | null>>>({});
  const [extraBankDraft, setExtraBankDraft] = useState({ holderName: '', bankName: '', accountNumber: '', ifsc: '', passbookPdf: null as File | null });
  const [addingBank, setAddingBank] = useState(false);

  useEffect(() => {
    if (!farmer) return;
    const kyc = Array.isArray(farmer.kyc_data) ? farmer.kyc_data[0] : farmer.kyc_data;
    const agreement = Array.isArray(farmer.agreement_data) ? farmer.agreement_data[0] : farmer.agreement_data;
    const bank = Array.isArray(farmer.bank_details) && farmer.bank_details.length > 0 ? farmer.bank_details[0] : null;

    setForm({
      phoneNumber: farmer.phone_number ?? '',
      alternatePhone: farmer.alternate_phone_number ?? '',
      address: farmer.address ?? kyc?.permanent_address ?? '',
      aadhaarNumber: kyc?.adhar_number ?? '',
      panNumber: kyc?.pan_numnber ?? kyc?.pan_number ?? '',
      leaseRent: String(agreement?.lease_rent ?? ''),
      agreementStartDate: agreement?.agreement_start_date ?? '',
      agreementEndDate: agreement?.agreement_end_date ?? '',
      bankHolderName: bank?.holder_name ?? '',
      bankName: bank?.bank_name ?? '',
      bankAccountNumber: bank?.account_number ?? '',
      bankIfsc: bank?.ifsc_code ?? bank?.IFSC_code ?? '',
    });
    setFiles({});
  }, [farmer]);

  const setField = <K extends keyof typeof form>(key: K, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const getDocUrl = (key: DocumentKey) => farmer?.documents?.[key]?.url ?? '';

  const uploadDocument = async (documentType: DocumentKey, file: File) => {
    const base = getBaseUrl().replace(/\/$/, '');
    const params = new URLSearchParams({ document_type: documentType, farmer_id: farmerId });
    const formData = new FormData();
    formData.append('doc', file, file.name);
    const resp = await fetch(`${base}/farmer_managment/upload_documents?${params.toString()}`, { method: 'POST', body: formData });
    const body = await resp.json().catch(() => null);
    if (!resp.ok || body?.success === false) throw new Error(body?.message || `Failed to upload ${documentType}`);
  };

  const handleSave = async () => {
    if (!farmer) return;
    setSaving(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');

      for (const [key, file] of Object.entries(files) as Array<[DocumentKey, File | null]>) {
        if (file) await uploadDocument(key, file);
      }

      const kyc = Array.isArray(farmer.kyc_data) ? farmer.kyc_data[0] : farmer.kyc_data;
      const nextKyc = { ...(kyc ?? {}), adhar_number: form.aadhaarNumber.trim(), pan_numnber: form.panNumber.trim() };
      const agreement = Array.isArray(farmer.agreement_data) ? farmer.agreement_data[0] : farmer.agreement_data;
      const nextAgreement = {
        ...(agreement ?? {}),
        lease_rent: form.leaseRent === '' ? '' : Number(form.leaseRent),
        agreement_start_date: form.agreementStartDate,
        agreement_end_date: form.agreementEndDate,
      };
      const banks = Array.isArray(farmer.bank_details) ? farmer.bank_details : [];
      const nextBank = {
        ...(banks[0] ?? {}),
        holder_name: form.bankHolderName.trim(),
        bank_name: form.bankName.trim(),
        account_number: form.bankAccountNumber.trim(),
        ifsc_code: form.bankIfsc.trim(),
        IFSC_code: form.bankIfsc.trim(),
      };

      const resp = await fetch(`${base}/farmer_managment/update_farmer_details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: farmerId,
          kyc_data: [nextKyc],
          agreement_data: [nextAgreement],
          bank_details: [nextBank, ...banks.slice(1)],
          farmer_name: 'AmritAgrotech',
          farmer_contact: form.phoneNumber.trim(),
          farmer_alternate_contact: form.alternatePhone.trim(),
          farmer_address: form.address.trim(),
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok || body?.success === false) throw new Error(body?.message || 'Failed to save profile');

      const snapshot = await findAmritAgrotech();
      if (snapshot) onUpdated(snapshot);
      toast({ title: 'Success', description: 'AmritAgrotech profile saved.', variant: 'success' });
      setFiles({});
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!extraBankDraft.holderName || !extraBankDraft.bankName || !extraBankDraft.accountNumber || !extraBankDraft.ifsc || !extraBankDraft.passbookPdf) {
      toast({ title: 'Missing fields', description: 'Fill all fields and attach the passbook PDF.', variant: 'destructive' });
      return;
    }
    setAddingBank(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const addResp = await fetch(`${base}/farmer_managment/add_new_bank_details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: farmerId,
          account_number: extraBankDraft.accountNumber,
          IFSC_code: extraBankDraft.ifsc,
          holder_name: extraBankDraft.holderName,
          bank_name: extraBankDraft.bankName,
        }),
      });
      const addBody = await addResp.json().catch(() => null);
      if (!addResp.ok || addBody?.success !== true) throw new Error(addBody?.message || 'Failed to add bank account');

      const passbookForm = new FormData();
      passbookForm.append('doc', extraBankDraft.passbookPdf);
      await fetch(`${base}/farmer_managment/update_bank_passbook_document?farmer_id=${encodeURIComponent(farmerId)}`, { method: 'POST', body: passbookForm });

      const snapshot = await findAmritAgrotech();
      if (snapshot) onUpdated(snapshot);
      setExtraBankDraft({ holderName: '', bankName: '', accountNumber: '', ifsc: '', passbookPdf: null });
      toast({ title: 'Success', description: 'Bank account added.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add bank account', variant: 'destructive' });
    } finally {
      setAddingBank(false);
    }
  };

  const toggleFlag = async () => {
    if (!farmer) return;
    if (farmer.flagged) {
      onUpdated({ ...farmer, flagged: false });
      return;
    }
    setFlagging(true);
    try {
      const base = getBaseUrl().replace(/\/$/, '');
      const resp = await fetch(`${base}/farmer_managment/make_farmer_flagged`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: farmerId }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok || body?.success !== true) throw new Error('Failed to flag');
      onUpdated({ ...farmer, flagged: true });
    } catch {
      toast({ title: 'Error', description: 'Failed to flag AmritAgrotech', variant: 'destructive' });
    } finally {
      setFlagging(false);
    }
  };

  const additionalBanks = Array.isArray(farmer?.bank_details) ? farmer!.bank_details!.slice(1) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>AmritAgrotech</SheetTitle>
          <SheetDescription>Company profile — KYC, agreement, bank details and credentials.</SheetDescription>
        </SheetHeader>

        {!farmer ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Button variant="ghost" size="sm" className="gap-2" onClick={toggleFlag} disabled={flagging}>
                <Flag className={`h-4 w-4 ${farmer.flagged ? 'fill-red-500 text-red-500' : ''}`} />
                {farmer.flagged ? 'Flagged' : 'Flag'}
              </Button>
              <CredentialsDialog
                farmerId={farmerId}
                credentials={farmer.credentials}
                open={credentialsOpen}
                onOpenChange={setCredentialsOpen}
                onSaved={(next) => onUpdated({ ...farmer, credentials: next })}
              />
            </div>

            <Tabs defaultValue="personal">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="kyc">KYC</TabsTrigger>
                <TabsTrigger value="agreement">Agreement</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label>Phone number</Label>
                  <Input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Alternate phone</Label>
                  <Input value={form.alternatePhone} onChange={(e) => setField('alternatePhone', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  <div><span className="block font-semibold text-slate-700">Village</span>{farmer.village || '—'}</div>
                  <div><span className="block font-semibold text-slate-700">District</span>{farmer.district || '—'}</div>
                  <div><span className="block font-semibold text-slate-700">State</span>{farmer.state || '—'}</div>
                </div>
              </TabsContent>

              <TabsContent value="kyc" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label>Aadhaar number</Label>
                  <Input value={form.aadhaarNumber} onChange={(e) => setField('aadhaarNumber', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN number</Label>
                  <Input value={form.panNumber} onChange={(e) => setField('panNumber', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DocumentUploadCard title="Aadhaar Card" icon={IdCard} existingUrl={getDocUrl('adhar_card')} file={files.adhar_card ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, adhar_card: f }))} />
                  <DocumentUploadCard title="PAN Card" icon={IdCard} existingUrl={getDocUrl('pand_card')} file={files.pand_card ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, pand_card: f }))} />
                  <DocumentUploadCard title="Kisan Book" icon={BookOpen} existingUrl={getDocUrl('kisan_book')} file={files.kisan_book ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, kisan_book: f }))} />
                  <DocumentUploadCard title="B1 Record" icon={FileBadge2} existingUrl={getDocUrl('B1_record')} file={files.B1_record ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, B1_record: f }))} />
                </div>
              </TabsContent>

              <TabsContent value="agreement" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start date</Label>
                    <Input type="date" value={form.agreementStartDate} onChange={(e) => setField('agreementStartDate', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End date</Label>
                    <Input type="date" value={form.agreementEndDate} onChange={(e) => setField('agreementEndDate', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Lease rent</Label>
                  <Input type="number" value={form.leaseRent} onChange={(e) => setField('leaseRent', e.target.value)} />
                </div>
                <DocumentUploadCard title="Agreement" icon={FileText} existingUrl={getDocUrl('agreement')} file={files.agreement ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, agreement: f }))} />
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Holder name</Label>
                    <Input value={form.bankHolderName} onChange={(e) => setField('bankHolderName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bank name</Label>
                    <Input value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account number</Label>
                    <Input value={form.bankAccountNumber} onChange={(e) => setField('bankAccountNumber', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IFSC code</Label>
                    <Input value={form.bankIfsc} onChange={(e) => setField('bankIfsc', e.target.value)} />
                  </div>
                </div>
                <DocumentUploadCard title="Passbook" icon={Landmark} existingUrl={getDocUrl('bank_passbook')} file={files.bank_passbook ?? null} onFileChange={(f) => setFiles((p) => ({ ...p, bank_passbook: f }))} />

                {additionalBanks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Additional accounts</Label>
                    {additionalBanks.map((b: any, i: number) => (
                      <div key={i} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                        {b?.bank_name ?? 'Bank'} · {b?.account_number ?? '—'} · {b?.ifsc_code ?? b?.IFSC_code ?? '—'}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
                  <Label className="text-xs">Add another bank account</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Holder name" value={extraBankDraft.holderName} onChange={(e) => setExtraBankDraft((p) => ({ ...p, holderName: e.target.value }))} />
                    <Input placeholder="Bank name" value={extraBankDraft.bankName} onChange={(e) => setExtraBankDraft((p) => ({ ...p, bankName: e.target.value }))} />
                    <Input placeholder="Account number" value={extraBankDraft.accountNumber} onChange={(e) => setExtraBankDraft((p) => ({ ...p, accountNumber: e.target.value }))} />
                    <Input placeholder="IFSC" value={extraBankDraft.ifsc} onChange={(e) => setExtraBankDraft((p) => ({ ...p, ifsc: e.target.value }))} />
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50">
                    <FileUp className="h-3.5 w-3.5" />
                    {extraBankDraft.passbookPdf ? extraBankDraft.passbookPdf.name : 'Upload passbook PDF'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setExtraBankDraft((p) => ({ ...p, passbookPdf: e.target.files?.[0] ?? null }))} />
                  </label>
                  <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleAddBankAccount} disabled={addingBank}>
                    {addingBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add account
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="space-y-3 pt-3">
                <p className="text-xs text-muted-foreground">All uploaded documents in one place.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['adhar_card', 'pand_card', 'kisan_book', 'B1_record', 'agreement', 'bank_passbook'] as DocumentKey[]).map((key) => (
                    <DocumentUploadCard
                      key={key}
                      title={key.replace(/_/g, ' ')}
                      icon={FileText}
                      existingUrl={getDocUrl(key)}
                      file={files[key] ?? null}
                      onFileChange={(f) => setFiles((p) => ({ ...p, [key]: f }))}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <Button className="w-full gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AmritAgrotechProfile;
