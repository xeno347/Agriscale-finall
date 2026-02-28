import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  document?: { name: string; url?: string };
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
  status: 'draft' | 'signed' | 'raised' | 'po';
  purchaseOrder?: {
    id: string;
    date: string;
    totalValue: number;
    items: { lineItemId: string; quoteId: string; vendorName: string; quotedRate: number }[];
  };
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

const COMPARATIVE_KEY = 'farmconnect.prComparative.v1';

const readComparatives = (): Record<string, any> => {
  try {
    const raw = window.localStorage.getItem(COMPARATIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeComparatives = (all: Record<string, any>) => {
  try {
    window.localStorage.setItem(COMPARATIVE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

const PurchaseRequisition = () => {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'new' | 'process' | 'po'>('new');
  const [openAddQuote, setOpenAddQuote] = useState<string | null>(null);
  const [addQuoteForms, setAddQuoteForms] = useState<Record<string, { vendor: string; file?: File | null; prices: Record<string, string> }>>({});

  const vendors = ['Vendor A', 'Vendor B', 'Vendor C'];

  const openAddQuoteForm = (indent: Indent) => {
    setOpenAddQuote((s) => (s === indent.id ? null : indent.id));
    setAddQuoteForms((prev) => {
      if (prev[indent.id]) return prev;
      const prices: Record<string, string> = {};
      indent.items.forEach((li) => { prices[li.id] = String(li.ratePerItem || 0); });
      return { ...prev, [indent.id]: { vendor: vendors[0], file: null, prices } };
    });
  };

  const handleFileChange = (indentId: string, f?: File) => {
    setAddQuoteForms((p) => ({ ...p, [indentId]: { ...(p[indentId] || { vendor: vendors[0], prices: {} }), file: f || null } }));
  };

  const handlePriceChange = (indentId: string, lineItemId: string, value: string) => {
    setAddQuoteForms((p) => ({ ...p, [indentId]: { ...(p[indentId] || { vendor: vendors[0], prices: {} }), prices: { ...(p[indentId]?.prices || {}), [lineItemId]: value } } }));
  };

  const handleVendorChange = (indentId: string, vendor: string) => {
    setAddQuoteForms((p) => ({ ...p, [indentId]: { ...(p[indentId] || { vendor: vendors[0], prices: {} }), vendor } }));
  };

  const submitAddQuote = async (indentId: string) => {
    const form = addQuoteForms[indentId];
    if (!form || !form.vendor) return toast.error('Vendor required');
    const indent = indents.find((i) => i.id === indentId);
    if (!indent) return toast.error('Indent not found');

    let dataUrl: string | undefined;
    if (form.file) {
      dataUrl = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = rej;
        fr.readAsDataURL(form.file as File);
      });
    }

    // add a quote per line item with provided price
    indent.items.forEach((li) => {
      const priceStr = form.prices[li.id] || '0';
      const q: Quote = {
        id: genId(),
        vendorName: form.vendor,
        quotedRate: Number(priceStr) || 0,
        document: form.file ? { name: form.file.name, url: dataUrl } : undefined,
      };
      addQuote(indentId, li.id, q);
    });

    setOpenAddQuote(null);
    toast.success('Quotation(s) added');
  };

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

  const hasAnyQuotes = (it: Indent) => it.items.some((li) => (li.quotes?.length || 0) > 0);

  const createPO = (id: string) => {
    setIndents((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      // ensure every line item has at least one quote
      const missing = x.items.some((li) => !(li.quotes && li.quotes.length > 0));
      if (missing) {
        toast.error('All items must have at least one quote to create PO');
        return x;
      }

      const selected = x.items.map((li) => {
        const best = (li.quotes || []).reduce((b: Quote | null, q) => {
          if (!b) return q;
          return q.quotedRate < b.quotedRate ? q : b;
        }, null as Quote | null)!;
        return { lineItemId: li.id, quoteId: best.id, vendorName: best.vendorName, quotedRate: best.quotedRate };
      });

      const total = x.items.reduce((s, li) => {
        const sel = selected.find((si) => si.lineItemId === li.id)!;
        return s + (sel.quotedRate * netPrQty(li));
      }, 0);

      return {
        ...x,
        status: 'po',
        purchaseOrder: { id: genId(), date: today(), totalValue: total, items: selected },
      };
    }));
    toast.success('Purchase Order created');
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

  const openQuotationPage = (indent: Indent) => {
    const all = readComparatives();
    if (!all[indent.id]) {
      all[indent.id] = {
        indentId: indent.id,
        title: `Vendor Comparative Statement for ${indent.project}`,
        gstPercent: 18,
        vendors: [
          { id: genId(), name: 'VENDOR 1' },
          { id: genId(), name: 'VENDOR 2' },
        ],
        items: indent.items.map((li) => ({
          id: li.id,
          srNo: li.srNo,
          partName: li.partName,
          uom: li.uom,
          qty: netPrQty(li),
        })),
        quotes: [],
      };
      writeComparatives(all);
    }
    navigate(`/purchase-requisition/${indent.id}/quotation`);
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

      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            New Indent ({indents.filter((it) => it.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'process' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Process ({indents.filter((it) => it.status !== 'po' && hasAnyQuotes(it)).length})
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'po' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Purchase Order ({indents.filter((it) => it.status === 'po').length})
          </button>
        </div>

        <div className="bg-white rounded border">
          <div className="divide-y divide-gray-100">
            {activeTab === 'new' && indents.filter((it) => it.status === 'draft').map((it) => {
              const s = signaturesPresent(it);
              return (
                <div key={it.id}>
                  <div className="flex items-center justify-between py-3 px-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                      <div className="text-xs text-gray-500 truncate">Indented by {it.indentedBy} · Forwarded by {it.forwardedBy}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-xs text-gray-500 mr-4">
                        <span className={`${s.indented ? 'text-green-700' : 'text-gray-400'}`}>Indented</span>
                        <span className="mx-1">·</span>
                        <span className={`${s.forwarded ? 'text-green-700' : 'text-gray-400'}`}>Forwarded</span>
                      </div>
                      <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                        <FilePlus className="w-4 h-4" /> Preview
                      </Button>
                      <Button variant="outline" onClick={() => openQuotationPage(it)} className="gap-2">
                        <PlusCircle className="w-4 h-4" /> Add Quotation
                      </Button>
                    </div>
                  </div>

                  {openAddQuote === it.id ? (
                    <div className="px-4 pb-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-600">Vendor</label>
                          <select value={addQuoteForms[it.id]?.vendor || vendors[0]} onChange={(e) => handleVendorChange(it.id, e.target.value)} className="w-full border rounded px-2 py-1">
                            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Quotation PDF</label>
                          <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(it.id, e.target.files?.[0])} />
                        </div>
                        <div className="flex items-end">
                          <div className="ml-auto">
                            <Button onClick={() => submitAddQuote(it.id)} className="bg-blue-600 text-white mr-2">Save</Button>
                            <Button variant="outline" onClick={() => setOpenAddQuote(null)}>Cancel</Button>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-medium mb-1">Quoted prices (per line)</div>
                      <div className="space-y-2">
                        {it.items.map((li) => (
                          <div key={li.id} className="flex items-center gap-2">
                            <div className="min-w-0 text-xs truncate">{li.partName}</div>
                            <div className="w-32">
                              <input type="number" value={addQuoteForms[it.id]?.prices[li.id] ?? String(li.ratePerItem || 0)} onChange={(e) => handlePriceChange(it.id, li.id, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeTab === 'process' && indents.filter((it) => it.status !== 'po' && hasAnyQuotes(it)).map((it) => {
              return (
                <div key={it.id}>
                  <div className="flex items-center justify-between py-3 px-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                      <div className="text-xs text-gray-500 truncate">Quoted items: {it.items.reduce((c, li) => c + ((li.quotes?.length) || 0), 0)}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                        <FilePlus className="w-4 h-4" /> Preview
                      </Button>
                      <Button variant="outline" onClick={() => openQuotationPage(it)} className="gap-2">
                        <PlusCircle className="w-4 h-4" /> Add Quotation
                      </Button>
                      <Button
                        onClick={() => createPO(it.id)}
                        className={`gap-2 ${it.items.some(li => !(li.quotes && li.quotes.length > 0)) ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}
                        disabled={it.items.some(li => !(li.quotes && li.quotes.length > 0))}
                      >
                        <Plus className="w-4 h-4" /> Create PO
                      </Button>
                    </div>
                  </div>

                  {openAddQuote === it.id ? (
                    <div className="px-4 pb-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-600">Vendor</label>
                          <select value={addQuoteForms[it.id]?.vendor || vendors[0]} onChange={(e) => handleVendorChange(it.id, e.target.value)} className="w-full border rounded px-2 py-1">
                            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Quotation PDF</label>
                          <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(it.id, e.target.files?.[0])} />
                        </div>
                        <div className="flex items-end">
                          <div className="ml-auto">
                            <Button onClick={() => submitAddQuote(it.id)} className="bg-blue-600 text-white mr-2">Save</Button>
                            <Button variant="outline" onClick={() => setOpenAddQuote(null)}>Cancel</Button>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm font-medium mb-1">Quoted prices (per line)</div>
                      <div className="space-y-2">
                        {it.items.map((li) => (
                          <div key={li.id} className="flex items-center gap-2">
                            <div className="min-w-0 text-xs truncate">{li.partName}</div>
                            <div className="w-32">
                              <input type="number" value={addQuoteForms[it.id]?.prices[li.id] ?? String(li.ratePerItem || 0)} onChange={(e) => handlePriceChange(it.id, li.id, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {activeTab === 'po' && indents.filter((it) => it.status === 'po').map((it) => (
              <div key={it.id} className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                  <div className="text-xs text-gray-500 truncate">PO Date: {it.purchaseOrder?.date} · Total: {it.purchaseOrder ? formatInr(it.purchaseOrder.totalValue) : '—'}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                    <FilePlus className="w-4 h-4" /> View PO
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
