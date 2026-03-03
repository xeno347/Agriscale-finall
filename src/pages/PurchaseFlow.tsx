import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Trash2, X, ArrowRight, FileText, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const COMPARATIVE_KEY = 'farmconnect.prComparative.v1';
const PURCHASE_FLOW_KEY = 'farmconnect.purchaseFlow.v3';

type QuoteVendor = { id: string; name: string };
type PrItem = { id: string; srNo: number; partName: string; uom: string; qty: number; gstPercent?: number };
type VendorQuote = { vendorId: string; unitRateByItemId: Record<string, number> };

type Comparative = {
  indentId: string;
  title: string;
  subTitle?: string;
  vendors: QuoteVendor[];
  items: PrItem[];
  quotes: VendorQuote[];
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
  hoSelectedVendorId?: string;
  technicalRecommendedVendorId?: string;
  hoForwardedAt?: string;
};

// Free-form document — user types the name, picks a file
type FlowDoc = {
  id: string;
  docType: string;   // user-entered label e.g. "Proforma Invoice", "LC Draft", etc.
  fileName: string;
  uploadedAt: string;
};

type PurchaseFlowRecord = {
  indentId: string;
  selectedVendorId?: string;
  docs: FlowDoc[];
  updatedAt: string;
};

type PurchaseFlowState = { records: Record<string, PurchaseFlowRecord> };

const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const readComparatives = (): Record<string, Comparative> => {
  try {
    const raw = window.localStorage.getItem(COMPARATIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const readPf = (): PurchaseFlowState => {
  try {
    const raw = window.localStorage.getItem(PURCHASE_FLOW_KEY);
    if (!raw) return { records: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? { records: parsed.records || {} } : { records: {} };
  } catch { return { records: {} }; }
};

const writePf = (s: PurchaseFlowState) => {
  try { window.localStorage.setItem(PURCHASE_FLOW_KEY, JSON.stringify(s)); } catch { /**/ }
};

const inr = (n: number) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
};

const baseForVendor = (c: Comparative, vendorId: string) => {
  const q = c.quotes.find((x) => x.vendorId === vendorId);
  return (c.items || []).reduce((sum, it) => {
    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
    return sum + unit * (it.qty || 0);
  }, 0);
};

const gstForVendor = (c: Comparative, vendorId: string) => {
  const q = c.quotes.find((x) => x.vendorId === vendorId);
  return (c.items || []).reduce((sum, it) => {
    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
    const amt = unit * (it.qty || 0);
    const gp = Number(isFinite(Number(it.gstPercent)) ? it.gstPercent : 0) || 0;
    return sum + amt * (gp / 100);
  }, 0);
};

const totalForVendor = (c: Comparative, vendorId: string) => {
  const base = baseForVendor(c, vendorId);
  const freight = Number(c.freightCharges?.[vendorId] ?? 0) || 0;
  const other = Number(c.otherCharges?.[vendorId] ?? 0) || 0;
  const gst = gstForVendor(c, vendorId);
  return base + freight + other + gst;
};

/* ─────────────────────────────────────────
   PR / Comparative Preview Popup (PDF-style)
───────────────────────────────────────── */
function PRPreviewPopup({
  c,
  onClose,
}: {
  c: Comparative;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${c.title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        .sub { color: #555; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; font-size: 11px; }
        th { background: #f0f0f0; text-align: center; font-weight: 600; }
        td:first-child, th:first-child { text-align: left; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
        .rec { background: #dbeafe; color: #1d4ed8; }
        .sel { background: #dcfce7; color: #15803d; }
        .total-row td { font-weight: 700; background: #f9f9f9; }
        .section { margin-top: 20px; }
        .label { font-weight: 600; color: #444; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const lowestTotal = Math.min(...(c.vendors || []).map((v) => totalForVendor(c, v.id)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Purchase Requisition — Finalized by HO</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable PDF body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 bg-white text-black" ref={printRef}>

          {/* Letterhead */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">Farm Connect</div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{c.title}</h1>
                {c.subTitle && <div className="text-xs text-gray-500 mt-1">{c.subTitle}</div>}
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <div><span className="font-semibold">Indent ID:</span> {c.indentId}</div>
                {c.hoForwardedAt && (
                  <div><span className="font-semibold">Forwarded:</span> {new Date(c.hoForwardedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                )}
                <div className="mt-2 flex gap-2 justify-end flex-wrap">
                  {c.technicalRecommendedVendorId && (
                    <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-[10px] px-2.5 py-0.5 font-semibold">
                      Tech Rec: {(c.vendors || []).find((v) => v.id === c.technicalRecommendedVendorId)?.name || c.technicalRecommendedVendorId}
                    </span>
                  )}
                  {c.hoSelectedVendorId && (
                    <span className="inline-block rounded-full bg-green-100 text-green-700 text-[10px] px-2.5 py-0.5 font-semibold">
                      HO Selected: {(c.vendors || []).find((v) => v.id === c.hoSelectedVendorId)?.name || c.hoSelectedVendorId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Summary Cards */}
          <div className="mb-6">
            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Vendor Summary</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min((c.vendors || []).length, 4)}, 1fr)` }}>
              {(c.vendors || []).map((v) => {
                const total = totalForVendor(c, v.id);
                const isRec = v.id === c.technicalRecommendedVendorId;
                const isSel = v.id === c.hoSelectedVendorId;
                const isLowest = total === lowestTotal;
                return (
                  <div
                    key={v.id}
                    className={
                      'rounded-lg border-2 p-3 ' +
                      (isSel ? 'border-green-500 bg-green-50' : isRec ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50')
                    }
                  >
                    <div className="font-bold text-sm text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">ID: {v.id}</div>
                    <div className="text-base font-bold mt-2 text-gray-900">{inr(total)}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {isSel && <span className="rounded-full bg-green-600 text-white text-[10px] px-2 py-0.5 font-semibold">✓ HO Selected</span>}
                      {isRec && <span className="rounded-full bg-blue-600 text-white text-[10px] px-2 py-0.5 font-semibold">Tech Rec</span>}
                      {isLowest && <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 font-semibold">L1</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparative Table */}
          <div className="mb-6">
            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Item-wise Comparison</div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="border border-gray-200 px-3 py-2 text-left w-6">Sr.</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Item / Part</th>
                    <th className="border border-gray-200 px-3 py-2 text-center">UOM</th>
                    <th className="border border-gray-200 px-3 py-2 text-right">Qty</th>
                    <th className="border border-gray-200 px-3 py-2 text-right">GST%</th>
                    {(c.vendors || []).map((v) => (
                      <th key={v.id} className={
                        'border border-gray-200 px-3 py-2 text-right ' +
                        (v.id === c.hoSelectedVendorId ? 'bg-green-50 text-green-800' : '')
                      }>
                        {v.name}
                        {v.id === c.hoSelectedVendorId && <div className="text-[9px] font-normal text-green-600">HO Selected</div>}
                        {v.id === c.technicalRecommendedVendorId && <div className="text-[9px] font-normal text-blue-600">Tech Rec</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(c.items || []).map((it, idx) => {
                    const rowPrices = (c.vendors || []).map((v) => {
                      const q = c.quotes.find((x) => x.vendorId === v.id);
                      return q?.unitRateByItemId?.[it.id] ?? 0;
                    });
                    const minPrice = Math.min(...rowPrices.filter((p) => p > 0));
                    return (
                      <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{it.srNo}</td>
                        <td className="border border-gray-200 px-3 py-2 font-medium">{it.partName}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{it.uom}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right">{it.qty}</td>
                        <td className="border border-gray-200 px-3 py-2 text-right text-gray-600">{it.gstPercent ?? 0}%</td>
                        {(c.vendors || []).map((v) => {
                          const q = c.quotes.find((x) => x.vendorId === v.id);
                          const unit = q?.unitRateByItemId?.[it.id] ?? 0;
                          const isMin = unit > 0 && unit === minPrice;
                          const isSel = v.id === c.hoSelectedVendorId;
                          return (
                            <td
                              key={v.id}
                              className={
                                'border border-gray-200 px-3 py-2 text-right ' +
                                (isMin ? 'font-bold text-green-700 bg-green-50' : isSel ? 'bg-green-50/40' : '')
                              }
                            >
                              {unit > 0 ? inr(unit) : <span className="text-gray-300">—</span>}
                              {isMin && <span className="ml-1 text-[9px] text-green-600">L1</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Base Total row */}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={5} className="border border-gray-200 px-3 py-2 text-right text-gray-700">Base Total</td>
                    {(c.vendors || []).map((v) => (
                      <td key={v.id} className={'border border-gray-200 px-3 py-2 text-right ' + (v.id === c.hoSelectedVendorId ? 'bg-green-50' : '')}>
                        {inr(baseForVendor(c, v.id))}
                      </td>
                    ))}
                  </tr>

                  {/* GST row */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="border border-gray-200 px-3 py-2 text-right text-gray-600">GST Amount</td>
                    {(c.vendors || []).map((v) => (
                      <td key={v.id} className={'border border-gray-200 px-3 py-2 text-right text-gray-600 ' + (v.id === c.hoSelectedVendorId ? 'bg-green-50/40' : '')}>
                        {inr(gstForVendor(c, v.id))}
                      </td>
                    ))}
                  </tr>

                  {/* Freight row */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="border border-gray-200 px-3 py-2 text-right text-gray-600">Freight Charges</td>
                    {(c.vendors || []).map((v) => (
                      <td key={v.id} className={'border border-gray-200 px-3 py-2 text-right text-gray-600 ' + (v.id === c.hoSelectedVendorId ? 'bg-green-50/40' : '')}>
                        {inr(Number(c.freightCharges?.[v.id] ?? 0))}
                      </td>
                    ))}
                  </tr>

                  {/* Other charges row */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="border border-gray-200 px-3 py-2 text-right text-gray-600">Other Charges</td>
                    {(c.vendors || []).map((v) => (
                      <td key={v.id} className={'border border-gray-200 px-3 py-2 text-right text-gray-600 ' + (v.id === c.hoSelectedVendorId ? 'bg-green-50/40' : '')}>
                        {inr(Number(c.otherCharges?.[v.id] ?? 0))}
                      </td>
                    ))}
                  </tr>

                  {/* Grand Total row */}
                  <tr className="bg-gray-800 text-white font-bold">
                    <td colSpan={5} className="border border-gray-600 px-3 py-2.5 text-right">Grand Total (incl. GST)</td>
                    {(c.vendors || []).map((v) => {
                      const total = totalForVendor(c, v.id);
                      const isLowest = total === lowestTotal;
                      return (
                        <td key={v.id} className={'border border-gray-600 px-3 py-2.5 text-right ' + (isLowest ? 'text-amber-300' : '')}>
                          {inr(total)}
                          {isLowest && <div className="text-[9px] text-amber-300 font-normal">Lowest</div>}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer note */}
          <div className="border-t border-gray-200 pt-4 mt-6 text-[10px] text-gray-400 flex items-center justify-between">
            <span>This document was finalized by the Head Office. For internal use only.</span>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Delete Confirmation Warning Popup
───────────────────────────────────────── */
function DeleteConfirmPopup({
  doc,
  onCancel,
  onConfirm,
}: {
  doc: FlowDoc;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-card shadow-xl">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-red-100 bg-red-50 rounded-t-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="font-semibold text-sm text-red-700">Delete Document?</div>
        </div>
        <div className="px-4 py-4 space-y-2">
          <p className="text-sm text-foreground">
            You are about to permanently delete:
          </p>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="text-sm font-semibold">{doc.docType}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{doc.fileName}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
            </div>
          </div>
          <p className="text-xs text-red-600 font-medium mt-2">
            ⚠ Once deleted, this document cannot be recovered. This action is irreversible.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Yes, Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Upload Document Popup
───────────────────────────────────────── */
function UploadDocPopup({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (docType: string, fileName: string) => void;
}) {
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const suggestions = [
    'Proforma Invoice', 'Purchase Order', 'Tax Invoice', 'E-way Bill',
    'Delivery Challan', 'GRN Document', 'LC Draft', 'Inspection Report',
    'Quality Certificate', 'Packing List', 'Bill of Lading',
  ];

  const handleSave = () => {
    if (!docType.trim()) return toast.error('Enter document type');
    if (!file) return toast.error('Select a file');
    onSave(docType.trim(), file.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Upload Document</div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Document Type</label>
            <Input
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="e.g. Proforma Invoice, GRN, Tax Invoice..."
              list="doc-suggestions"
            />
            <datalist id="doc-suggestions">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDocType(s)}
                  className={
                    'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ' +
                    (docType === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">File</label>
            <label className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select file'}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gap-2">
            <Upload className="w-4 h-4" /> Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export default function PurchaseFlow() {
  const navigate = useNavigate();
  const [comparatives, setComparatives] = useState<Record<string, Comparative>>({});
  const [pf, setPf] = useState<PurchaseFlowState>({ records: {} });
  const [expandedId, setExpandedId] = useState<string>('');
  const [uploadPopupFor, setUploadPopupFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ indentId: string; doc: FlowDoc } | null>(null);
  const [prPreviewFor, setPrPreviewFor] = useState<string | null>(null); // indentId

  useEffect(() => {
    const all = readComparatives();

    const seeds: Comparative[] = [
      {
        indentId: 'PR-2025-001',
        title: 'Tillage Equipment — Kharif Season 2025',
        subTitle: 'Chhattisgarh Block A, 2250 Acres',
        vendors: [
          { id: 'v1', name: 'Mahindra Agri Solutions' },
          { id: 'v2', name: 'TAFE Farm Equipment' },
          { id: 'v3', name: 'Sonalika Implements' },
        ],
        items: [
          { id: 'i1', srNo: 1, partName: 'Chisel Plough (9 Tyne)', uom: 'No', qty: 6, gstPercent: 12 },
          { id: 'i2', srNo: 2, partName: 'Disc Harrow (18 Disc)', uom: 'No', qty: 4, gstPercent: 12 },
          { id: 'i3', srNo: 3, partName: 'Rotavator (6 ft)', uom: 'No', qty: 5, gstPercent: 12 },
        ],
        quotes: [
          { vendorId: 'v1', unitRateByItemId: { i1: 45000, i2: 52000, i3: 68000 } },
          { vendorId: 'v2', unitRateByItemId: { i1: 42000, i2: 49500, i3: 65000 } },
          { vendorId: 'v3', unitRateByItemId: { i1: 44000, i2: 51000, i3: 66500 } },
        ],
        freightCharges: { v1: 8000, v2: 6500, v3: 7200 },
        otherCharges: { v1: 2000, v2: 1500, v3: 1800 },
        technicalRecommendedVendorId: 'v2',
        hoSelectedVendorId: 'v2',
        hoForwardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        indentId: 'PR-2025-002',
        title: 'Irrigation Infrastructure — Drip & Sprinkler',
        subTitle: 'Madhya Pradesh — Rabi Season',
        vendors: [
          { id: 'w1', name: 'Jain Irrigation Systems' },
          { id: 'w2', name: 'Netafim India' },
        ],
        items: [
          { id: 'j1', srNo: 1, partName: 'Drip Lateral Pipe (16mm)', uom: 'Mtr', qty: 15000, gstPercent: 18 },
          { id: 'j2', srNo: 2, partName: 'Inline Drippers (4 LPH)', uom: 'Nos', qty: 75000, gstPercent: 18 },
          { id: 'j3', srNo: 3, partName: 'Filter Unit (Disc 3")', uom: 'Set', qty: 12, gstPercent: 18 },
          { id: 'j4', srNo: 4, partName: 'Fertigation Tank (200L)', uom: 'Nos', qty: 12, gstPercent: 18 },
        ],
        quotes: [
          { vendorId: 'w1', unitRateByItemId: { j1: 18, j2: 4.5, j3: 8500, j4: 6200 } },
          { vendorId: 'w2', unitRateByItemId: { j1: 19.5, j2: 4.2, j3: 9200, j4: 5900 } },
        ],
        freightCharges: { w1: 12000, w2: 14500 },
        otherCharges: { w1: 5000, w2: 3500 },
        technicalRecommendedVendorId: 'w1',
        hoSelectedVendorId: 'w1',
        hoForwardedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        indentId: 'PR-2025-003',
        title: 'Seed Procurement — Paddy Hybrid Varieties',
        subTitle: 'Odisha — 3500 Acres, Kharif 2025',
        vendors: [
          { id: 's1', name: 'Bayer CropScience Ltd' },
          { id: 's2', name: 'PI Industries' },
          { id: 's3', name: 'UPL Limited' },
        ],
        items: [
          { id: 'k1', srNo: 1, partName: 'Paddy Hybrid — Arize AZ8433', uom: 'Kg', qty: 1800, gstPercent: 0 },
          { id: 'k2', srNo: 2, partName: 'Paddy Hybrid — DRR Dhan 45', uom: 'Kg', qty: 1200, gstPercent: 0 },
        ],
        quotes: [
          { vendorId: 's1', unitRateByItemId: { k1: 320, k2: 290 } },
          { vendorId: 's2', unitRateByItemId: { k1: 305, k2: 280 } },
          { vendorId: 's3', unitRateByItemId: { k1: 315, k2: 285 } },
        ],
        freightCharges: { s1: 4500, s2: 3800, s3: 4200 },
        otherCharges: { s1: 0, s2: 0, s3: 0 },
        technicalRecommendedVendorId: 's2',
        hoSelectedVendorId: 's2',
        hoForwardedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        indentId: 'PR-2025-004',
        title: 'Post-Harvest Equipment — Threshers & Cleaners',
        subTitle: 'Punjab — Wheat Season 2025',
        vendors: [
          { id: 'p1', name: 'Kartar Agro Industries' },
          { id: 'p2', name: 'Preet Agro Industries' },
        ],
        items: [
          { id: 'h1', srNo: 1, partName: 'Axial Flow Thresher (Multi-crop)', uom: 'No', qty: 3, gstPercent: 12 },
          { id: 'h2', srNo: 2, partName: 'Grain Cleaning Machine', uom: 'No', qty: 3, gstPercent: 12 },
          { id: 'h3', srNo: 3, partName: 'Conveyour Belt (20 ft)', uom: 'No', qty: 6, gstPercent: 18 },
        ],
        quotes: [
          { vendorId: 'p1', unitRateByItemId: { h1: 185000, h2: 42000, h3: 28000 } },
          { vendorId: 'p2', unitRateByItemId: { h1: 178000, h2: 45000, h3: 26500 } },
        ],
        freightCharges: { p1: 15000, p2: 12000 },
        otherCharges: { p1: 8000, p2: 6000 },
        technicalRecommendedVendorId: 'p1',
        hoSelectedVendorId: 'p2',
        hoForwardedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    let changed = false;
    for (const seed of seeds) {
      if (!all[seed.indentId]) {
        all[seed.indentId] = seed;
        changed = true;
      }
    }
    if (changed) {
      try { window.localStorage.setItem(COMPARATIVE_KEY, JSON.stringify(all)); } catch { /**/ }
    }

    setComparatives(all);
    setPf(readPf());
  }, []);

  const forwardedToPurchase = useMemo(() =>
    Object.values(comparatives)
      .filter((c) => c?.indentId && c.hoSelectedVendorId)
      .sort((a, b) => (b.hoForwardedAt || '').localeCompare(a.hoForwardedAt || '')),
    [comparatives]
  );

  const addDoc = (indentId: string, docType: string, fileName: string) => {
    const doc: FlowDoc = { id: genId(), docType, fileName, uploadedAt: new Date().toISOString() };
    setPf((p) => {
      const existing: PurchaseFlowRecord = p.records[indentId] || {
        indentId,
        selectedVendorId: comparatives[indentId]?.hoSelectedVendorId,
        docs: [],
        updatedAt: new Date().toISOString(),
      };
      const next: PurchaseFlowState = {
        records: {
          ...p.records,
          [indentId]: {
            ...existing,
            docs: [...(existing.docs || []), doc],
            updatedAt: new Date().toISOString(),
          },
        },
      };
      writePf(next);
      return next;
    });
    toast.success('Document uploaded');
  };

  const removeDoc = (indentId: string, docId: string) => {
    setPf((p) => {
      const existing = p.records[indentId];
      if (!existing) return p;
      const next: PurchaseFlowState = {
        records: {
          ...p.records,
          [indentId]: {
            ...existing,
            docs: (existing.docs || []).filter((d) => d.id !== docId),
            updatedAt: new Date().toISOString(),
          },
        },
      };
      writePf(next);
      return next;
    });
    toast.success('Document removed');
    setDeleteTarget(null);
  };

  const requestDelete = (indentId: string, doc: FlowDoc) => {
    setDeleteTarget({ indentId, doc });
  };

  const setVendor = (indentId: string, vendorId: string) => {
    setPf((p) => {
      const existing: PurchaseFlowRecord = p.records[indentId] || {
        indentId, docs: [], updatedAt: new Date().toISOString(),
      };
      const next: PurchaseFlowState = {
        records: {
          ...p.records,
          [indentId]: { ...existing, selectedVendorId: vendorId, updatedAt: new Date().toISOString() },
        },
      };
      writePf(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* PR Preview popup */}
      {prPreviewFor && comparatives[prPreviewFor] && (
        <PRPreviewPopup
          c={comparatives[prPreviewFor]}
          onClose={() => setPrPreviewFor(null)}
        />
      )}

      {/* Upload popup */}
      {uploadPopupFor && (
        <UploadDocPopup
          onClose={() => setUploadPopupFor(null)}
          onSave={(docType, fileName) => addDoc(uploadPopupFor, docType, fileName)}
        />
      )}

      {/* Delete confirmation popup */}
      {deleteTarget && (
        <DeleteConfirmPopup
          doc={deleteTarget.doc}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => removeDoc(deleteTarget.indentId, deleteTarget.doc.id)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="text-2xl font-bold">Purchase Flow</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Finalized quotes → Upload any documents (PI, PO, Invoice, GRN, etc.)
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {forwardedToPurchase.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground text-center">
            No finalized quotes yet. Complete the HO review to see items here.
          </div>
        ) : (
          forwardedToPurchase.map((c) => {
            const rec = pf.records[c.indentId];
            const docs: FlowDoc[] = rec?.docs || [];
            const selVendorId = rec?.selectedVendorId || c.hoSelectedVendorId || '';
            const selVendor = (c.vendors || []).find((v) => v.id === selVendorId);
            const isOpen = expandedId === c.indentId;

            return (
              <div key={c.indentId} className="rounded-xl border border-border bg-card overflow-hidden">

                {/* ── Main row ── */}
                <div className="flex items-center gap-0 min-h-[88px] flex-wrap">

                  {/* Indent card */}
                  <div className="w-[240px] shrink-0 border-r border-border px-4 py-4 bg-muted/30 self-stretch flex flex-col justify-center">
                    <div className="font-semibold text-sm leading-snug">{c.title || 'Comparative'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Indent: {c.indentId}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.technicalRecommendedVendorId && (
                        <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 font-medium">Tech Rec</span>
                      )}
                      {c.hoSelectedVendorId && (
                        <span className="rounded-full bg-green-100 text-green-700 text-[10px] px-2 py-0.5 font-medium">HO Selected</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrPreviewFor(c.indentId)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline w-fit"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View PR / Comparative
                    </button>
                  </div>

                  {/* Arrow */}
                  <div className="px-3 text-muted-foreground shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </div>

                  {/* Uploaded doc bubbles */}
                  <div className="flex items-center gap-3 flex-wrap flex-1 px-2 py-3">
                    {docs.map((d, idx) => (
                      <div key={d.id} className="flex flex-col items-center gap-1 group">
                        {/* connector arrow between docs */}
                        {idx > 0 && (
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                        <div className="relative flex flex-col items-center">
                          <div className="relative w-20 h-20 rounded-full border-2 border-green-500 bg-green-50 flex flex-col items-center justify-center">
                            <Upload className="w-5 h-5 text-green-600" />
                            <button
                              type="button"
                              onClick={() => requestDelete(c.indentId, d)}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="mt-1 text-[10px] font-medium text-center max-w-[80px] leading-tight">{d.docType}</span>
                          <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">{d.fileName}</span>
                        </div>
                        {idx < docs.length - 1 && (
                          <div className="hidden" />
                        )}
                      </div>
                    ))}

                    {/* Add doc bubble */}
                    <div className="flex flex-col items-center gap-1">
                      {docs.length > 0 && (
                        <div className="flex items-center self-center mb-1 text-muted-foreground">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setUploadPopupFor(c.indentId)}
                        className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex flex-col items-center justify-center transition-colors"
                        title="Upload document"
                      >
                        <Plus className="w-7 h-7" />
                      </button>
                      <span className="text-[10px] text-muted-foreground mt-1">Add Doc</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? '' : c.indentId)}
                    className="mr-4 shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    {isOpen ? 'Hide' : `Details (${docs.length} docs)`}
                  </button>
                </div>

                {/* ── Expanded panel ── */}
                {isOpen && (
                  <div className="border-t border-border p-4 space-y-4 bg-muted/10">
                    {/* Vendor info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="text-xs text-muted-foreground">Selected Vendor</div>
                        <div className="text-sm font-semibold">{selVendor?.name || selVendorId || '—'}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="text-xs text-muted-foreground">Tech Recommended</div>
                        <div className="text-sm font-semibold">
                          {(c.vendors || []).find((v) => v.id === c.technicalRecommendedVendorId)?.name || '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="text-xs text-muted-foreground">HO Selected</div>
                        <div className="text-sm font-semibold">
                          {(c.vendors || []).find((v) => v.id === c.hoSelectedVendorId)?.name || '—'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-3">
                        <div className="text-xs text-muted-foreground">Vendor for PO</div>
                        <select
                          className="mt-1 w-full rounded border border-border bg-background text-xs px-2 py-1"
                          value={selVendorId}
                          onChange={(e) => setVendor(c.indentId, e.target.value)}
                        >
                          <option value="">Select</option>
                          {(c.vendors || []).map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Documents list */}
                    <div className="rounded-lg border border-border bg-background overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <div className="text-xs font-semibold">Documents ({docs.length})</div>
                        <Button size="sm" variant="outline" className="gap-2 h-7 text-xs" onClick={() => setUploadPopupFor(c.indentId)}>
                          <Plus className="w-3.5 h-3.5" /> Add Document
                        </Button>
                      </div>
                      {docs.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">No documents uploaded yet.</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {docs.map((d) => (
                            <div key={d.id} className="flex items-center gap-3 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{d.docType}</div>
                                <div className="text-xs text-muted-foreground truncate">{d.fileName}</div>
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {new Date(d.uploadedAt).toLocaleString()}
                              </div>
                              <button
                                type="button"
                                onClick={() => requestDelete(c.indentId, d)}
                                className="text-gray-400 hover:text-red-600 shrink-0"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
