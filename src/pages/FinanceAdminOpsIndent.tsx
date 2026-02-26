import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, CheckCircle, Search, Settings, UserCircle, BookUser, Plus, Trash2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  readAdminOpsIndentConfig,
  writeAdminOpsIndentConfig,
} from '@/lib/adminOpsIndentConfig';
import {
  readSignatureDiary,
  writeSignatureDiary,
  readUserProfile,
  writeUserProfile,
  readDirectorsAttachedMap,
  writeDirectorsAttachedMap,
  type SignatureDiary,
} from '@/lib/signatureDiary';

// ─── Types ──────────────────────────────────────────────────────────────────

type PRLineItem = {
  id: string;
  srNo: number;
  itemCode: string;
  partName: string;
  specification: string;
  uom: string;
  totalQtyRequired: number;
  lessQtyAvailableInStock: number;
  procurementLeadTimeWeeks: number;
  materialRequiredByDate: string;
  indigenousOrImported: 'Indigenous' | 'Imported';
  ratePerItem: number;
  preferredVendorName: string;
  validityOfWarrantyAndGuarantee: string;
  fullLifeHr: string;
  actualLifeHr: string;
  reasonForReplacement: string;
  repairingPossibility: 'Yes' | 'No' | 'NA';
};

type Indent = {
  id: string;
  project: string;
  prNo: string;
  date: string;
  department: string;
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  remarksNotes: string;
  budgetHead: string;
  items: PRLineItem[];
  status: 'pending' | 'approved';
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const netPrQty = (it: PRLineItem) =>
  Math.max(0, (it.totalQtyRequired || 0) - (it.lessQtyAvailableInStock || 0));

const approxValue = (it: PRLineItem) => netPrQty(it) * (it.ratePerItem || 0);
const totalValue = (items: PRLineItem[]) =>
  items.reduce((sum, it) => sum + approxValue(it), 0);

const formatInr = (value: number) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹ ${Math.round(value).toLocaleString()}`;
  }
};

// ─── PR Preview ──────────────────────────────────────────────────────────────

const PRPreview = ({
  indent,
  attachments,
  showDirectorSignature,
}: {
  indent: Omit<Indent, 'id' | 'status'>;
  attachments?: SignatureDiary;
  showDirectorSignature?: boolean;
}) => {
  const sigFor = (name: string) => attachments?.[name] ?? null;
  return (
    <div className="min-w-[980px]">
      <div className="border border-gray-300 bg-white">
        <div className="text-center font-semibold text-sm py-2 border-b border-gray-300">
          SAI BIORESOURCES PRIVATE LIMITED
        </div>

        <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
          <div className="col-span-4 p-2 border-r border-gray-300">
            <span className="font-semibold">Project:</span> {indent.project || '—'}
          </div>
          <div className="col-span-4 p-2 border-r border-gray-300 text-center font-semibold">
            PURCHASE REQUISITION (PR.)
          </div>
          <div className="col-span-2 p-2 border-r border-gray-300">
            <span className="font-semibold">PR No.</span> {indent.prNo || '—'}
          </div>
          <div className="col-span-2 p-2">
            <span className="font-semibold">Date:</span> {indent.date || '—'}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
          <div className="col-span-4 p-2 border-r border-gray-300">
            <span className="font-semibold">Department:</span> {indent.department || '—'}
          </div>
          <div className="col-span-8 p-2">&nbsp;</div>
        </div>

        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-1 py-1 w-[28px]">Sr. Nos.</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Item Code</th>
              <th className="border border-gray-300 px-1 py-1">Part Name</th>
              <th className="border border-gray-300 px-1 py-1">Specification</th>
              <th className="border border-gray-300 px-1 py-1 w-[50px]">UoM</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Total Qty. Required</th>
              <th className="border border-gray-300 px-1 py-1 w-[80px]">Less Qty. Available in Stocks</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Net PR Qty</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Procurement Lead time (weeks)</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Material Required by Date</th>
              <th className="border border-gray-300 px-1 py-1 w-[70px]">Indigenous / Imported</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Rate/Item</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Approx. Value Rs.</th>
              <th className="border border-gray-300 px-1 py-1">Preferred Vendor Name</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Validity of Warranty and Guarantee</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Full life (Hr)</th>
              <th className="border border-gray-300 px-1 py-1 w-[60px]">Actual Life (Hr)</th>
              <th className="border border-gray-300 px-1 py-1 w-[90px]">Reason for replacement</th>
              <th className="border border-gray-300 px-1 py-1 w-[85px]">Repairing possibility Yes/No/NA</th>
            </tr>
          </thead>
          <tbody>
            {indent.items.map((it) => (
              <tr key={it.id}>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.srNo}</td>
                <td className="border border-gray-300 px-1 py-1">{it.itemCode || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.partName || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.specification || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.uom || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.totalQtyRequired || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.lessQtyAvailableInStock || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{netPrQty(it)}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.procurementLeadTimeWeeks || 0}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.materialRequiredByDate || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.indigenousOrImported}</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{it.ratePerItem ? it.ratePerItem.toLocaleString() : ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-right">{approxValue(it) ? formatInr(approxValue(it)) : ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.preferredVendorName || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.validityOfWarrantyAndGuarantee || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.fullLifeHr || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.actualLifeHr || ''}</td>
                <td className="border border-gray-300 px-1 py-1">{it.reasonForReplacement || ''}</td>
                <td className="border border-gray-300 px-1 py-1 text-center">{it.repairingPossibility || 'NA'}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={12} className="border border-gray-300 px-1 py-1 text-right font-semibold">TOTAL</td>
              <td colSpan={7} className="border border-gray-300 px-1 py-1 text-right font-semibold">
                {formatInr(totalValue(indent.items))}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-12 text-xs border-t border-gray-300">
          <div className="col-span-8 border-r border-gray-300">
            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">SAI BIORESOURCES PRIVATE LIMITED</div>
              <div className="p-2 font-semibold text-center">Name/ID</div>
              <div className="p-2 font-semibold text-center">Signature</div>
              <div className="p-2 font-semibold text-center">Date</div>
            </div>

            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Indented By</div>
              <div className="p-2 text-center">{indent.indentedBy || '—'}</div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                {sigFor(indent.indentedBy)?.signature ? (
                  <img src={sigFor(indent.indentedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                ) : <span className="text-gray-400">—</span>}
                {sigFor(indent.indentedBy)?.stamp ? (
                  <img src={sigFor(indent.indentedBy)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Forwarded By</div>
              <div className="p-2 text-center">{indent.forwardedBy || '—'}</div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                {sigFor(indent.forwardedBy)?.signature ? (
                  <img src={sigFor(indent.forwardedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                ) : <span className="text-gray-400">—</span>}
                {sigFor(indent.forwardedBy)?.stamp ? (
                  <img src={sigFor(indent.forwardedBy)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>

            {/* Director's Approval row — shows configured signature/stamp when approved or attached */}
            <div className="grid grid-cols-4">
              <div className="p-2 font-semibold">Director's Approval</div>
              <div className="p-2 text-center">
                {indent.directorsApproval || '—'}
              </div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                {showDirectorSignature && sigFor(indent.directorsApproval)?.signature ? (
                  <img src={sigFor(indent.directorsApproval)!.signature} alt="Signature" className="h-8 object-contain" />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                {showDirectorSignature && sigFor(indent.directorsApproval)?.stamp ? (
                  <img src={sigFor(indent.directorsApproval)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="grid grid-cols-1 border-b border-gray-300">
              <div className="p-2 font-semibold">Remarks / Notes</div>
              <div className="p-2 min-h-[56px] text-gray-700">{indent.remarksNotes || ''}</div>
            </div>
            <div className="p-2">
              <div className="font-semibold">Budget Head</div>
              <div className="text-gray-700">{indent.budgetHead || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sample Data ─────────────────────────────────────────────────────────────

const initialIndents: Indent[] = [
  {
    id: 'fao-1',
    project: 'Chhattisgarh 2250 Acres',
    prNo: 'SBR/NF/25-26/03',
    date: '2026-02-09',
    department: 'Cultivation',
    indentedBy: 'SUKHDEEP SINGH',
    forwardedBy: 'RAJINDER SINGH PADDA',
    directorsApproval: 'RAJENDRA SHRINGARPUTALE',
    remarksNotes: '',
    budgetHead: 'Machinery - Cultivation',
    status: 'pending',
    items: [
      {
        id: 'fao-li-1',
        srNo: 1,
        itemCode: '',
        partName: 'Chisel Plough',
        specification: '5 - Tynes/W - 4 ft',
        uom: 'No',
        totalQtyRequired: 4,
        lessQtyAvailableInStock: 0,
        procurementLeadTimeWeeks: 2,
        materialRequiredByDate: '2026-02-09',
        indigenousOrImported: 'Indigenous',
        ratePerItem: 45000,
        preferredVendorName: 'Vishwakarma',
        validityOfWarrantyAndGuarantee: 'NA',
        fullLifeHr: 'NA',
        actualLifeHr: 'NA',
        reasonForReplacement: 'Project Item',
        repairingPossibility: 'NA',
      },
    ],
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

const FinanceAdminOpsIndent = () => {
  const [indents, setIndents] = useState<Indent[]>(initialIndents);
  const [search, setSearch] = useState('');
  const [openRowId, setOpenRowId] = useState<string>('');
  const [configOpen, setConfigOpen] = useState(false);
  const [attachments, setAttachments] = useState<SignatureDiary>({});
  // per-indent flag to show director signature when explicitly attached
  const [directorsAttachedMap, setDirectorsAttachedMap] = useState<Record<string, boolean>>({});

  // Load attachments config on mount
  useEffect(() => {
    setAttachments(readSignatureDiary());
    setDirectorsAttachedMap(readDirectorsAttachedMap());
  }, []);

  // Reload attachments after configure modal closes
  const handleConfigClose = () => {
    setConfigOpen(false);
    setAttachments(readSignatureDiary());
    setDirectorsAttachedMap(readDirectorsAttachedMap());
  };

  const attachDirectorSignature = (id: string, indent: Indent) => {
    const diary = readSignatureDiary();
    const person = indent.directorsApproval?.trim();
    if (!person) { toast.error('No director name set for this indent'); return; }
    const entry = diary[person];
    if (!entry || !entry.signature) { toast.error(`No signature found for ${person} in diary`); return; }
    setDirectorsAttachedMap((p) => {
      const next = { ...p, [id]: true };
      writeDirectorsAttachedMap(next);
      return next;
    });
    toast.success(`Signature attached for ${person}`);
  };

  useEffect(() => writeDirectorsAttachedMap(directorsAttachedMap), [directorsAttachedMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return indents.filter(
      (it) =>
        (it.project ?? '').toLowerCase().includes(q) ||
        (it.prNo ?? '').toLowerCase().includes(q) ||
        (it.indentedBy ?? '').toLowerCase().includes(q) ||
        (it.items ?? []).some(
          (li) =>
            (li.partName ?? '').toLowerCase().includes(q) ||
            (li.itemCode ?? '').toLowerCase().includes(q),
        ),
    );
  }, [indents, search]);

  const approve = (id: string) => {
    const profile = readUserProfile();
    const name = profile.name.trim();
    setIndents((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      return {
        ...x,
        status: 'approved',
        // If the current user's name is set, overwrite the directorsApproval field
        directorsApproval: name || x.directorsApproval,
      };
    }));
    // Reload diary so the new name's signature is picked up immediately
    setAttachments(readSignatureDiary());
    // if profile has signature, mark attached so signature shows
    const diary = readSignatureDiary();
    if (name && diary[name]?.signature) setDirectorsAttachedMap((p) => ({ ...p, [id]: true }));
    toast.success(name
      ? `Director's approval granted by ${name}`
      : "Director's approval granted"
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Admin Ops Indents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review forwarded indents and grant Director's approval</p>
        </div>
        <Button variant="outline" onClick={() => setConfigOpen(true)} className="gap-2">
          <Settings className="w-4 h-4" />
          Configure
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by PR no, project, item or requester…"
          className="pl-9 bg-white border-gray-200 shadow-sm h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[minmax(220px,3fr)_minmax(140px,2fr)_minmax(180px,3fr)_minmax(130px,2fr)_80px_140px] gap-2 px-4 py-3 text-xs font-semibold text-gray-500 border-b border-gray-100">
          <div>PR No / Project</div>
          <div>Department</div>
          <div>Indented By</div>
          <div>Date</div>
          <div className="text-center">Items</div>
          <div className="text-right">Status</div>
        </div>

        <Accordion type="single" collapsible value={openRowId} onValueChange={(v) => setOpenRowId(v)}>
          {filtered.map((it) => (
            <AccordionItem key={it.id} value={it.id} className="border-b border-gray-100 last:border-b-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden">
                <div className="grid grid-cols-[minmax(220px,3fr)_minmax(140px,2fr)_minmax(180px,3fr)_minmax(130px,2fr)_80px_140px] gap-2 w-full items-center">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{it.prNo || 'PR (Draft)'}</div>
                    <div className="text-xs text-gray-400 truncate">{it.project || '—'}</div>
                  </div>
                  <div className="text-sm text-gray-700 truncate">{it.department || '—'}</div>
                  <div className="text-sm text-gray-700 truncate">{it.indentedBy || '—'}</div>
                  <div className="text-sm text-gray-700 whitespace-nowrap">{it.date || '—'}</div>
                  <div className="text-sm text-gray-700 text-center whitespace-nowrap tabular-nums">{(it.items ?? []).length}</div>
                  <div className="flex items-center justify-end gap-1.5 min-w-0">
                    <span
                      className={
                        `text-xs font-semibold tabular-nums ` +
                        (it.status === 'pending' ? 'text-yellow-700' : 'text-green-700')
                      }
                    >
                      {it.status === 'pending' ? 'PENDING' : 'APPROVED'}
                    </span>
                    {directorsAttachedMap[it.id] && (
                      <Paperclip className="w-4 h-4 text-gray-400 ml-2" />
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${openRowId === it.id ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 overflow-x-auto">
                  <PRPreview
                    indent={{
                      project: it.project,
                      prNo: it.prNo,
                      date: it.date,
                      department: it.department,
                      indentedBy: it.indentedBy,
                      forwardedBy: it.forwardedBy,
                      directorsApproval: it.directorsApproval,
                      remarksNotes: it.remarksNotes,
                      budgetHead: it.budgetHead,
                      items: it.items,
                    }}
                    attachments={attachments}
                    showDirectorSignature={it.status === 'approved' || Boolean(directorsAttachedMap[it.id])}
                  />

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => attachDirectorSignature(it.id, it)}
                      disabled={Boolean(directorsAttachedMap[it.id])}
                    >
                      <Paperclip className="w-4 h-4" />
                      {directorsAttachedMap[it.id] ? 'Sig Attached' : 'Attach Sig'}
                    </Button>

                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                      onClick={() => approve(it.id)}
                      disabled={it.status === 'approved'}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {it.status === 'approved' ? 'Approved' : "Grant Director's Approval"}
                    </Button>
                  </div>
                  {it.status !== 'approved' && (
                    <div className="mt-2 text-xs text-gray-400 text-right">
                      Click to grant Director's approval. Signature &amp; stamp from Configure will be applied.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <ConfigureModal open={configOpen} onClose={handleConfigClose} indents={indents} />
    </div>
  );
};

// ─── Shared: read image file ─────────────────────────────────────────────────

const readImageFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── DiaryPersonRow ───────────────────────────────────────────────────────────

const DiaryPersonRow = ({
  name,
  data,
  removable,
  onChange,
  onRemove,
}: {
  name: string;
  data: { signature: string; stamp: string };
  removable?: boolean;
  onChange: (next: { signature: string; stamp: string }) => void;
  onRemove?: () => void;
}) => {
  const sigRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
        {removable && onRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors ml-2 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-1">Signature</label>
          <input ref={sigRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; onChange({ ...data, signature: await readImageFile(f) }); e.target.value = ''; }}
          />
          {data.signature ? (
            <div className="space-y-1">
              <img src={data.signature} alt="Sig" className="h-9 border border-gray-200 rounded bg-white object-contain px-1 w-full" />
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] px-1" onClick={() => sigRef.current?.click()}>Replace</Button>
                <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] px-1 text-red-500" onClick={() => onChange({ ...data, signature: '' })}>Remove</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full text-[11px] h-8" onClick={() => sigRef.current?.click()}>Upload</Button>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-1">Stamp</label>
          <input ref={stampRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; onChange({ ...data, stamp: await readImageFile(f) }); e.target.value = ''; }}
          />
          {data.stamp ? (
            <div className="space-y-1">
              <img src={data.stamp} alt="Stamp" className="h-9 border border-gray-200 rounded bg-white object-contain px-1 w-full" />
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] px-1" onClick={() => stampRef.current?.click()}>Replace</Button>
                <Button type="button" variant="outline" size="sm" className="flex-1 h-6 text-[10px] px-1 text-red-500" onClick={() => onChange({ ...data, stamp: '' })}>Remove</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="w-full text-[11px] h-8" onClick={() => stampRef.current?.click()}>Upload</Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Configure Modal ──────────────────────────────────────────────────────────

const ConfigureModal = ({
  open,
  onClose,
  indents,
}: {
  open: boolean;
  onClose: () => void;
  indents: Indent[];
}) => {
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [diary, setDiary] = useState<SignatureDiary>({});
  const [newPersonName, setNewPersonName] = useState('');

  const detectedNames = useMemo(() => {
    const names = new Set<string>();
    for (const ind of indents) {
      if (ind.indentedBy?.trim()) names.add(ind.indentedBy.trim());
      if (ind.forwardedBy?.trim()) names.add(ind.forwardedBy.trim());
      if (ind.directorsApproval?.trim()) names.add(ind.directorsApproval.trim());
    }
    return Array.from(names);
  }, [indents]);

  const allDiaryNames = useMemo(() => {
    const set = new Set(detectedNames);
    Object.keys(diary).forEach((k) => set.add(k));
    return Array.from(set);
  }, [detectedNames, diary]);

  useEffect(() => {
    if (!open) return;
    const p = readUserProfile();
    setProfileName(p.name);
    setProfileRole(p.role);
    setDiary(readSignatureDiary());
    setNewPersonName('');
  }, [open]);

  const updateEntry = (name: string, data: { signature: string; stamp: string }) => {
    setDiary((prev) => ({ ...prev, [name]: data }));
  };

  const removePerson = (name: string) => {
    if (detectedNames.includes(name)) return;
    setDiary((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const addPerson = () => {
    const n = newPersonName.trim();
    if (!n) return;
    setDiary((prev) => ({ ...prev, [n]: prev[n] ?? { signature: '', stamp: '' } }));
    setNewPersonName('');
  };

  const save = () => {
    writeUserProfile({ name: profileName.trim(), role: profileRole.trim() });
    writeSignatureDiary(diary);
    toast.success('Configuration saved');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current User Profile */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserCircle className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-800">Current User Profile</p>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Your name here must match the Director's Approval name in the indent exactly — it will be used when you click "Grant Director's Approval".
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g. RAJENDRA SHRINGARPUTALE" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Role / Designation</label>
                <Input value={profileRole} onChange={(e) => setProfileRole(e.target.value)} placeholder="e.g. Director" />
              </div>
            </div>
          </div>

          {/* Signature Diary */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookUser className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-800">Signature Diary</p>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Upload signatures/stamps for each person. When you grant Director's Approval, your profile name is looked up here automatically.
            </p>
            <div className="space-y-3">
              {allDiaryNames.map((name) => (
                <DiaryPersonRow
                  key={name}
                  name={name}
                  data={diary[name] ?? { signature: '', stamp: '' }}
                  removable={!detectedNames.includes(name)}
                  onChange={(d) => updateEntry(name, d)}
                  onRemove={() => removePerson(name)}
                />
              ))}
              {allDiaryNames.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No names detected yet.</p>
              )}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Add person by name…"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } }}
                  className="text-sm h-9"
                />
                <Button type="button" variant="outline" size="sm" className="h-9 gap-1 shrink-0" onClick={addPerson}>
                  <Plus className="w-3.5 h-3.5" />Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceAdminOpsIndent;
