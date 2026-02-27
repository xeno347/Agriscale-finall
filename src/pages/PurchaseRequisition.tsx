import { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle, FilePlus, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { readSignatureDiary, type SignatureDiary } from '@/lib/signatureDiary';

// Vendor Quote type
type Quote = {
  id: string;
  vendorName: string;
  quotedRate: number;
  leadTimeDays?: number;
  notes?: string;
};

// Simple types used by this page
type PRLineItem = {
  id: string;
  srNo: number;
  itemCode?: string;
  partName: string;
  specification?: string;
  uom: string;
  totalQtyRequired: number;
  lessQtyAvailableInStock?: number;
  procurementLeadTimeWeeks?: number;
  materialRequiredByDate?: string;
  indigenousOrImported?: string;
  ratePerItem?: number;
  preferredVendorName?: string;
  validityOfWarrantyAndGuarantee?: string;
  fullLifeHr?: string;
  actualLifeHr?: string;
  reasonForReplacement?: string;
  repairingPossibility?: string;
  quotes?: Quote[];
};

type Indent = {
  id: string;
  project: string;
  prNo: string;
  date: string;
  department?: string;
  indentedBy: string;
  forwardedBy: string;
  directorsApproval: string;
  remarksNotes?: string;
  budgetHead?: string;
  items: PRLineItem[];
  status: 'draft' | 'signed' | 'raised';
};

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().split('T')[0];

const sample: Indent[] = [
  {
    id: 'pr-1',
    project: 'Chhattisgarh 2250 Acres',
    prNo: 'SBR/PR/26/001',
    date: today(),
    department: 'Cultivation',
    indentedBy: 'SUKHDEEP SINGH',
    forwardedBy: 'RAJINDER SINGH PADDA',
    directorsApproval: 'RAJENDRA SHRINGARPUTALE',
    remarksNotes: '',
    budgetHead: 'Machinery',
    items: [
      { id: 'pr-li-1', srNo: 1, partName: 'Chisel Plough', uom: 'No', totalQtyRequired: 4, ratePerItem: 45000 },
    ],
    status: 'draft',
  },
];

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

const netPrQty = (it: PRLineItem) => Math.max(0, (it.totalQtyRequired || 0) - (it.lessQtyAvailableInStock || 0));
const approxValue = (it: PRLineItem) => netPrQty(it) * (it.ratePerItem || 0);
const totalValue = (items: PRLineItem[]) => items.reduce((s, it) => s + approxValue(it), 0);

const PRPreview = ({
  indent,
  attachments,
  onAddQuote,
  onRemoveQuote,
}: {
  indent: Omit<Indent, 'id' | 'status'>;
  attachments?: SignatureDiary;
  onAddQuote?: (lineItemId: string, quote: Quote) => void;
  onRemoveQuote?: (lineItemId: string, quoteId: string) => void;
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
                <td className="border border-gray-300 px-1 py-1 text-center">{it.indigenousOrImported || ''}</td>
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

        {/* Quotations */}
        <div className="border-t border-gray-300">
          <div className="px-2 py-1 text-xs font-semibold bg-gray-50 border-b border-gray-300">Quotations</div>
          <div className="p-2 space-y-3">
            {indent.items.map((it) => (
              <div key={it.id} className="border border-gray-200 rounded">
                <div className="flex items-center justify-between px-2 py-1 bg-white">
                  <div className="text-xs font-semibold text-gray-800">
                    Item {it.srNo}: <span className="font-normal">{it.partName}</span>
                  </div>
                  {onAddQuote ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => {
                        const vendorName = window.prompt('Vendor Name');
                        if (!vendorName?.trim()) return;
                        const rateStr = window.prompt('Quoted Rate');
                        const quotedRate = Number(rateStr);
                        if (!Number.isFinite(quotedRate) || quotedRate <= 0) return;
                        const ltdStr = window.prompt('Lead time (days) [optional]') || '';
                        const leadTimeDays = ltdStr.trim() ? Number(ltdStr) : undefined;
                        const notes = window.prompt('Notes [optional]') || undefined;
                        onAddQuote(it.id, {
                          id: genId(),
                          vendorName: vendorName.trim(),
                          quotedRate,
                          leadTimeDays: Number.isFinite(leadTimeDays as any) ? leadTimeDays : undefined,
                          notes,
                        });
                      }}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add Quote
                    </Button>
                  ) : null}
                </div>

                <div className="px-2 pb-2">
                  {(it.quotes?.length || 0) === 0 ? (
                    <div className="text-[11px] text-gray-400 py-2">No quotes added.</div>
                  ) : (
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-2 py-1 text-left">Vendor</th>
                          <th className="border border-gray-200 px-2 py-1 text-right w-[120px]">Quoted Rate</th>
                          <th className="border border-gray-200 px-2 py-1 text-center w-[120px]">Lead time (days)</th>
                          <th className="border border-gray-200 px-2 py-1 text-left">Notes</th>
                          <th className="border border-gray-200 px-2 py-1 w-[40px]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {it.quotes?.map((q) => (
                          <tr key={q.id}>
                            <td className="border border-gray-200 px-2 py-1">{q.vendorName}</td>
                            <td className="border border-gray-200 px-2 py-1 text-right">{formatInr(q.quotedRate)}</td>
                            <td className="border border-gray-200 px-2 py-1 text-center">{q.leadTimeDays ?? '—'}</td>
                            <td className="border border-gray-200 px-2 py-1">{q.notes || '—'}</td>
                            <td className="border border-gray-200 px-2 py-1">
                              {onRemoveQuote ? (
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-red-600"
                                  onClick={() => onRemoveQuote(it.id, q.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
                <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                  {sigFor(indent.indentedBy)?.signature ? (
                    <img src={sigFor(indent.indentedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
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
                <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                  {sigFor(indent.forwardedBy)?.signature ? (
                    <img src={sigFor(indent.forwardedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {sigFor(indent.forwardedBy)?.stamp ? (
                  <img src={sigFor(indent.forwardedBy)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>

            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Director's Approval</div>
              <div className="p-2 text-center">{indent.directorsApproval || '—'}</div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                  {sigFor(indent.directorsApproval)?.signature ? (
                    <img src={sigFor(indent.directorsApproval)!.signature} alt="Signature" className="h-8 object-contain" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {sigFor(indent.directorsApproval)?.stamp ? (
                  <img src={sigFor(indent.directorsApproval)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.date || '—'}</div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="border-b border-gray-300 p-2">
              <div className="font-semibold">Remarks / Notes</div>
              <div className="text-gray-700 mt-1 whitespace-pre-wrap">{indent.remarksNotes || '—'}</div>
            </div>
            <div className="p-2">
              <div className="font-semibold">Budget Head</div>
              <div className="text-gray-700 mt-1">{indent.budgetHead || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PurchaseRequisition = () => {
  const [indents, setIndents] = useState<Indent[]>(sample);
  const [open, setOpen] = useState(false);
  const [diary, setDiary] = useState<SignatureDiary>({});
  const [newProject, setNewProject] = useState('');
  const [newPrNo, setNewPrNo] = useState('');
  const [newDate, setNewDate] = useState(today());
  const [newIndentedBy, setNewIndentedBy] = useState('');
  const [newForwardedBy, setNewForwardedBy] = useState('');
  const [newDirectorsApproval, setNewDirectorsApproval] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [previewIndent, setPreviewIndent] = useState<Indent | null>(null);

  useEffect(() => {
    setDiary(readSignatureDiary());
  }, []);

  const signaturesPresent = (it: Indent) => {
    const d = readSignatureDiary();
    return {
      indented: Boolean(it.indentedBy && d[it.indentedBy]?.signature),
      forwarded: Boolean(it.forwardedBy && d[it.forwardedBy]?.signature),
      director: Boolean(it.directorsApproval && d[it.directorsApproval]?.signature),
    };
  };

  const canRaise = (it: Indent) => {
    const s = signaturesPresent(it);
    return s.indented && s.forwarded && s.director;
  };

  const raisePR = (id: string) => {
    setIndents((prev) => prev.map((x) => x.id === id ? { ...x, status: 'raised' } : x));
    toast.success('Purchase Requisition raised');
  };

  const saveNew = () => {
    if (!newProject.trim()) return toast.error('Project required');
    if (!newPrNo.trim()) return toast.error('PR No required');
    if (!newIndentedBy.trim()) return toast.error('Indented By required');
    if (!newForwardedBy.trim()) return toast.error('Forwarded By required');
    if (!newDirectorsApproval.trim()) return toast.error("Director's name required");
    const id = genId();
    const item: PRLineItem = { id: genId(), srNo: 1, partName: newItemName || 'Item', uom: 'No', totalQtyRequired: newItemQty };
    const next: Indent = {
      id,
      project: newProject.trim(),
      prNo: newPrNo.trim(),
      date: newDate,
      department: undefined,
      indentedBy: newIndentedBy.trim(),
      forwardedBy: newForwardedBy.trim(),
      directorsApproval: newDirectorsApproval.trim(),
      remarksNotes: '',
      budgetHead: '',
      items: [item],
      status: 'draft',
    };
    setIndents((p) => [next, ...p]);
    setOpen(false);
    toast.success('Indent created');
  };

  const addQuote = (indentId: string, lineItemId: string, quote: Quote) => {
    setIndents((prev) => prev.map((x) => {
      if (x.id !== indentId) return x;
      return {
        ...x,
        items: x.items.map((li) => li.id === lineItemId ? { ...li, quotes: [quote, ...(li.quotes || [])] } : li),
      };
    }));
    toast.success('Quote added');
  };

  const removeQuote = (indentId: string, lineItemId: string, quoteId: string) => {
    setIndents((prev) => prev.map((x) => {
      if (x.id !== indentId) return x;
      return {
        ...x,
        items: x.items.map((li) => li.id === lineItemId ? { ...li, quotes: (li.quotes || []).filter((q) => q.id !== quoteId) } : li),
      };
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requisition</h1>
          <p className="text-sm text-gray-500">Raise PRs and manage received indents once all signatures are present.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setOpen(true)} className="bg-green-600 text-white gap-2">
            <Plus className="w-4 h-4" /> New Indent
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {indents.map((it) => {
          const s = signaturesPresent(it);
          return (
            <div key={it.id} className="bg-white border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{it.prNo} — {it.project}</div>
                <div className="text-xs text-gray-500">Indented by {it.indentedBy} · Forwarded by {it.forwardedBy} · Director {it.directorsApproval}</div>
                <div className="mt-2 text-xs flex gap-3">
                  <div className={`px-2 py-1 rounded ${s.indented ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Indented {s.indented ? '✓' : '✕'}</div>
                  <div className={`px-2 py-1 rounded ${s.forwarded ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Forwarded {s.forwarded ? '✓' : '✕'}</div>
                  <div className={`px-2 py-1 rounded ${s.director ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>Director {s.director ? '✓' : '✕'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                  <FilePlus className="w-4 h-4" /> Preview
                </Button>
                <Button onClick={() => canRaise(it) ? raisePR(it.id) : toast.error('All signatures required to raise PR')} className={`gap-2 ${it.status === 'raised' ? 'bg-gray-200 text-gray-700' : 'bg-green-600 text-white'}`} disabled={it.status === 'raised'}>
                  <CheckCircle className="w-4 h-4" /> {it.status === 'raised' ? 'Raised' : 'Raise PR'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Indent</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Project</label>
              <Input value={newProject} onChange={(e) => setNewProject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">PR No</label>
              <Input value={newPrNo} onChange={(e) => setNewPrNo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Date</label>
                <Input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Indented By</label>
                <Input value={newIndentedBy} onChange={(e) => setNewIndentedBy(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Forwarded By</label>
                <Input value={newForwardedBy} onChange={(e) => setNewForwardedBy(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Director</label>
                <Input value={newDirectorsApproval} onChange={(e) => setNewDirectorsApproval(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Item Name</label>
                <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Qty</label>
                <Input type="number" value={String(newItemQty)} onChange={(e) => setNewItemQty(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">UoM</label>
                <Input value={"No"} disabled />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={saveNew}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewIndent)} onOpenChange={(v) => { if (!v) setPreviewIndent(null); }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>PR Preview</DialogTitle>
          </DialogHeader>
          {previewIndent && (
            <PRPreview
              indent={{
                project: previewIndent.project,
                prNo: previewIndent.prNo,
                date: previewIndent.date,
                department: previewIndent.department,
                indentedBy: previewIndent.indentedBy,
                forwardedBy: previewIndent.forwardedBy,
                directorsApproval: previewIndent.directorsApproval,
                remarksNotes: previewIndent.remarksNotes || '',
                budgetHead: previewIndent.budgetHead || '',
                items: previewIndent.items,
              }}
              attachments={diary}
              onAddQuote={(lineItemId, quote) => addQuote(previewIndent.id, lineItemId, quote)}
              onRemoveQuote={(lineItemId, quoteId) => removeQuote(previewIndent.id, lineItemId, quoteId)}
            />
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewIndent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequisition;
