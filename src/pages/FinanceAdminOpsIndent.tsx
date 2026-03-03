import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Paperclip, Search, Send, Settings, UserCircle, BookUser, Plus, Trash2 } from 'lucide-react';
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
import { getBaseUrl } from '@/lib/config';
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

const COMPARATIVE_KEY = 'farmconnect.prComparative.v1';
const FINANCE_NFA_NOTES_KEY = 'farmconnect.financeAdminOps.nfaNotes.v1';

type Comparative = {
  indentId: string;
  title: string;
  subTitle?: string;
  vendors: Array<{ id: string; name: string }>;
  items: Array<{ id: string; qty: number; gstPercent?: number }>; // minimal for total calc
  quotes: Array<{ vendorId: string; unitRateByItemId: Record<string, number> }>;
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
  hoSelectedVendorId?: string;
  hoForwardedAt?: string;
};

type FinanceNfaNoteState = Record<string, { note: string; updatedAt: string }>;

const readComparatives = (): Record<string, Comparative> => {
  try {
    const raw = window.localStorage.getItem(COMPARATIVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const seedDummyComparativesIfEmpty = () => {
  try {
    const existing = readComparatives();
    if (existing && Object.keys(existing).length > 0) return;

    const dummy: Record<string, Comparative> = {
      // Default dummy entries
      'SBR/PR/25-26/001': {
        indentId: 'SBR/PR/25-26/001',
        title: 'Chhattisgarh 2250 Acres - PR 001',
        subTitle: 'Comparative (Dummy)',
        vendors: [
          { id: 'v-a', name: 'Vishwakarma Implements' },
          { id: 'v-b', name: 'Agro Tools & Co.' },
          { id: 'v-c', name: 'Shree Tractors Spares' },
        ],
        items: [
          { id: 'it-1', qty: 1, gstPercent: 18 },
          { id: 'it-2', qty: 1, gstPercent: 18 },
        ],
        quotes: [
          { vendorId: 'v-a', unitRateByItemId: { 'it-1': 15900, 'it-2': 5200 } },
          { vendorId: 'v-b', unitRateByItemId: { 'it-1': 16500, 'it-2': 4800 } },
          { vendorId: 'v-c', unitRateByItemId: { 'it-1': 15800, 'it-2': 5500 } },
        ],
        freightCharges: { 'v-a': 0, 'v-b': 800, 'v-c': 0 },
        otherCharges: { 'v-a': 0, 'v-b': 0, 'v-c': 0 },
        hoSelectedVendorId: 'v-a',
        hoForwardedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      'SBR/PR/25-26/003': {
        indentId: 'SBR/PR/25-26/003',
        title: 'Chhattisgarh 2250 Acres - PR 003',
        subTitle: 'Comparative (Dummy)',
        vendors: [
          { id: 'v-d', name: 'Mahadev Engineering' },
          { id: 'v-e', name: 'Patel Farm Machinery' },
        ],
        items: [{ id: 'it-1', qty: 2, gstPercent: 18 }],
        quotes: [
          { vendorId: 'v-d', unitRateByItemId: { 'it-1': 42000 } },
          { vendorId: 'v-e', unitRateByItemId: { 'it-1': 48000 } },
        ],
        freightCharges: { 'v-d': 1200, 'v-e': 0 },
        otherCharges: { 'v-d': 0, 'v-e': 0 },
        hoSelectedVendorId: 'v-d',
        hoForwardedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },

      // IMPORTANT: Finance page indents currently use PR numbers like SBR/NF/25-26/03.
      // Seed a dummy comparative for that key so clicking NFA rows works out-of-the-box.
      'SBR/NF/25-26/03': {
        indentId: 'SBR/NF/25-26/03',
        title: 'Chhattisgarh 2250 Acres - NF 03',
        subTitle: 'HO Comparative (Dummy)',
        vendors: [
          { id: 'v-x', name: 'Vishwakarma Implements' },
          { id: 'v-y', name: 'Agro Tools & Co.' },
          { id: 'v-z', name: 'Patel Farm Machinery' },
        ],
        items: [
          { id: 'it-1', qty: 4, gstPercent: 18 },
          { id: 'it-2', qty: 1, gstPercent: 18 },
        ],
        quotes: [
          { vendorId: 'v-x', unitRateByItemId: { 'it-1': 44500, 'it-2': 5200 } },
          { vendorId: 'v-y', unitRateByItemId: { 'it-1': 45200, 'it-2': 4800 } },
          { vendorId: 'v-z', unitRateByItemId: { 'it-1': 46800, 'it-2': 4500 } },
        ],
        freightCharges: { 'v-x': 0, 'v-y': 1500, 'v-z': 0 },
        otherCharges: { 'v-x': 0, 'v-y': 0, 'v-z': 0 },
        hoSelectedVendorId: 'v-x',
        hoForwardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };

    window.localStorage.setItem(COMPARATIVE_KEY, JSON.stringify(dummy));
  } catch {
    // ignore
  }
};

const readFinanceNotes = (): FinanceNfaNoteState => {
  try {
    const raw = window.localStorage.getItem(FINANCE_NFA_NOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeFinanceNotes = (s: FinanceNfaNoteState) => {
  try {
    window.localStorage.setItem(FINANCE_NFA_NOTES_KEY, JSON.stringify(s));
  } catch {
    /**/
  }
};

const calcHoSelectedTotal = (c: Comparative) => {
  const vid = c.hoSelectedVendorId;
  if (!vid) return null;
  const q = (c.quotes || []).find((x) => x.vendorId === vid);
  const base = (c.items || []).reduce((sum, it) => {
    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
    return sum + unit * (Number(it.qty) || 0);
  }, 0);
  const gst = (c.items || []).reduce((sum, it) => {
    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
    const amt = unit * (Number(it.qty) || 0);
    const gp = Number(isFinite(Number(it.gstPercent)) ? it.gstPercent : 0) || 0;
    return sum + amt * (gp / 100);
  }, 0);
  const freight = Number(c.freightCharges?.[vid] ?? 0) || 0;
  const other = Number(c.otherCharges?.[vid] ?? 0) || 0;
  return base + gst + freight + other;
};

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
  indentedBySignature?: string;
  indentedByTimestamp?: string;
  forwardedBySignature?: string;
  forwardedByTimestamp?: string;
  forwardedBy: string;
  directorsApproval: string;
  directorsApprovalSignature?: string;
  directorsApprovalTimestamp?: string;
  remarksNotes: string;
  budgetHead: string;
  items: PRLineItem[];
  status: 'pending' | 'forwarded';
};

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
                <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                  {sigFor(indent.indentedBy)?.signature ? (
                    <img src={sigFor(indent.indentedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                  ) : indent.indentedBySignature ? (
                    <div className="text-[11px] text-gray-700 text-center">{indent.indentedBySignature}</div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {sigFor(indent.indentedBy)?.stamp ? (
                  <img src={sigFor(indent.indentedBy)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.indentedByTimestamp ? indent.indentedByTimestamp : (indent.date || '—')}</div>
            </div>
            <div className="grid grid-cols-4 border-b border-gray-300">
              <div className="p-2 font-semibold">Forwarded By</div>
              <div className="p-2 text-center">{indent.forwardedBy || '—'}</div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                  {sigFor(indent.forwardedBy)?.signature ? (
                    <img src={sigFor(indent.forwardedBy)!.signature} alt="Signature" className="h-8 object-contain" />
                  ) : indent.forwardedBySignature ? (
                    <div className="text-[11px] text-gray-700 text-center">{indent.forwardedBySignature}</div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                {sigFor(indent.forwardedBy)?.stamp ? (
                  <img src={sigFor(indent.forwardedBy)!.stamp} alt="Stamp" className="h-8 object-contain" />
                ) : null}
              </div>
              <div className="p-2 text-center">{indent.forwardedByTimestamp ? indent.forwardedByTimestamp : (indent.date || '—')}</div>
            </div>
            {/* Director's Approval row */}
            <div className="grid grid-cols-4">
              <div className="p-2 font-semibold">Director's Approval</div>
              <div className="p-2 text-center">
                {indent.directorsApproval || '—'}
              </div>
              <div className="p-2 flex flex-col items-center justify-center gap-0.5">
                  <div className="w-full h-10 border border-gray-200 rounded bg-white flex items-center justify-center px-1">
                    {(() => {
                      const diaryEntry = sigFor(indent.directorsApproval);
                      if (diaryEntry?.signature && showDirectorSignature) {
                        return <img src={diaryEntry.signature} alt="Signature" className="h-8 object-contain" />;
                      }
                      if (indent.directorsApprovalSignature) {
                        return <div className="text-[11px] text-gray-700 text-center">{indent.directorsApprovalSignature}</div>;
                      }
                      return <span className="text-gray-400">—</span>;
                    })()}
                  </div>
                  {(() => {
                    const diaryEntry = sigFor(indent.directorsApproval);
                    if (diaryEntry?.stamp && showDirectorSignature) {
                      return <img src={diaryEntry.stamp} alt="Stamp" className="h-8 object-contain" />;
                    }
                    return null;
                  })()}
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

// ─── HO Comparative Preview (PDF-style) ─────────────────────────────────────

const formatDateYmd = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const HOPreview = ({ comp }: { comp: Comparative }) => {
  const selectedVid = comp.hoSelectedVendorId;
  const selectedVendorName = comp.vendors?.find((v) => v.id === selectedVid)?.name ?? (selectedVid || '—');

  // compute per-vendor totals for display
  const rows = (comp.vendors || []).map((v) => {
    const q = (comp.quotes || []).find((x) => x.vendorId === v.id);
    const base = (comp.items || []).reduce((sum, it) => {
      const unit = q?.unitRateByItemId?.[it.id] ?? 0;
      return sum + unit * (Number(it.qty) || 0);
    }, 0);
    const gst = (comp.items || []).reduce((sum, it) => {
      const unit = q?.unitRateByItemId?.[it.id] ?? 0;
      const amt = unit * (Number(it.qty) || 0);
      const gp = Number(isFinite(Number(it.gstPercent)) ? it.gstPercent : 0) || 0;
      return sum + amt * (gp / 100);
    }, 0);
    const freight = Number(comp.freightCharges?.[v.id] ?? 0) || 0;
    const other = Number(comp.otherCharges?.[v.id] ?? 0) || 0;
    return { vendorId: v.id, vendorName: v.name, base, gst, freight, other, total: base + gst + freight + other };
  });

  const selectedTotal = typeof selectedVid === 'string' ? rows.find((r) => r.vendorId === selectedVid)?.total ?? null : null;

  return (
    <div className="min-w-[980px] bg-white">
      <div className="border border-gray-300">
        <div className="text-center font-semibold text-sm py-2 border-b border-gray-300">
          HO Comparative / Selected Quote
        </div>

        <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
          <div className="col-span-7 p-2 border-r border-gray-300">
            <span className="font-semibold">Title:</span> {comp.title || '—'}
            {comp.subTitle ? <span className="text-gray-600"> · {comp.subTitle}</span> : null}
          </div>
          <div className="col-span-5 p-2">
            <span className="font-semibold">Forwarded:</span> {formatDateYmd(comp.hoForwardedAt) || '—'}
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
          <div className="col-span-7 p-2 border-r border-gray-300">
            <span className="font-semibold">Selected Vendor:</span> {selectedVendorName}
          </div>
          <div className="col-span-5 p-2">
            <span className="font-semibold">Selected Total:</span>{' '}
            {typeof selectedTotal === 'number' ? formatInr(selectedTotal) : '—'}
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-left">Vendor</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Base</th>
              <th className="border border-gray-300 px-2 py-1 text-right">GST</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Freight</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Other</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSel = Boolean(selectedVid) && r.vendorId === selectedVid;
              return (
                <tr key={r.vendorId} className={isSel ? 'bg-green-50' : undefined}>
                  <td className="border border-gray-300 px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={isSel ? 'font-semibold text-green-800' : 'text-gray-900'}>{r.vendorName}</span>
                      {isSel ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-600 text-white">Selected</span> : null}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatInr(r.base)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatInr(r.gst)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatInr(r.freight)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatInr(r.other)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-semibold">{formatInr(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-2 text-[11px] text-gray-500 border-t border-gray-300">
          Note: This is a printable preview generated in-app. Use Download/Print to save as PDF.
        </div>
      </div>
    </div>
  );
};

const initialIndents: Indent[] = [
  {
    id: 'aoi-1',
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
        id: 'aoi-li-1',
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

const AdminOpsIndent = () => {
  const [indents, setIndents] = useState<Indent[]>(initialIndents);
  const [search, setSearch] = useState('');
  const [openRowId, setOpenRowId] = useState<string>('');
  const [configOpen, setConfigOpen] = useState(false);
  const [attachments, setAttachments] = useState<SignatureDiary>({});
  // per-indent flag to show director signature when explicitly attached
  const [directorsAttachedMap, setDirectorsAttachedMap] = useState<Record<string, boolean>>({});

  const [comparatives, setComparatives] = useState<Record<string, Comparative>>({});
  const [nfaNotes, setNfaNotes] = useState<FinanceNfaNoteState>({});

  const [activeSection, setActiveSection] = useState<'indents' | 'nfa'>('indents');

  const [previewHoComp, setPreviewHoComp] = useState<Comparative | null>(null);

  // Load attachments config on mount
  useEffect(() => {
    seedDummyComparativesIfEmpty();
    setAttachments(readSignatureDiary());
    setDirectorsAttachedMap(readDirectorsAttachedMap());
    setComparatives(readComparatives());
    setNfaNotes(readFinanceNotes());
  }, []);

  useEffect(() => {
    writeFinanceNotes(nfaNotes);
  }, [nfaNotes]);

  const updateNfaNote = (indentKey: string, note: string) => {
    setNfaNotes((p) => ({
      ...p,
      [indentKey]: { note, updatedAt: new Date().toISOString() },
    }));
  };

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

  // Load indents from admin ops API
  useEffect(() => {
    const load = async () => {
      try {
        const BASE_URL = getBaseUrl().replace(/\/$/, '');
        const financeUrl = `${BASE_URL}/purchase_flow/get_finance_ops_indents`;
        const adminUrl = `${BASE_URL}/purchase_flow/get_admin_ops_indents`;

        const tryFetch = async (url: string) => {
          const r = await fetch(url);
          const body = await r.text().catch(() => '');
          return { ok: r.ok, status: r.status, statusText: r.statusText, body };
        };

        const first = await tryFetch(financeUrl);
        let text = first.body;
        let json: any = {};

        if (!first.ok) {
          // if finance endpoint missing (404), try admin endpoint as fallback
          if (first.status === 404) {
            console.warn(`Finance endpoint 404, retrying admin endpoint: ${adminUrl}`);
            const alt = await tryFetch(adminUrl);
            if (!alt.ok) {
              throw new Error(`Fetch failed ${first.status} ${first.statusText}: ${first.body}`);
            }
            text = alt.body;
          } else {
            throw new Error(`Fetch failed ${first.status} ${first.statusText}: ${first.body}`);
          }
        }

        try {
          json = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          console.error('Failed to parse indents JSON', parseErr, text);
          throw new Error('Invalid JSON received from indents API');
        }

        const arr = json.finance_ops_indents ?? json.admin_ops_indents ?? json.finance_admin_ops_indents ?? [];
        const list: Indent[] = (arr || []).map((r: any, idx: number) => {
          const items: PRLineItem[] = (r.indent_data?.item_row || []).map((it: any, i: number) => ({
            id: `${r.pr_number ?? 'api'}-li-${i}`,
            srNo: it.sr_no ?? i + 1,
            itemCode: it.item_code ?? '',
            partName: it.part_name ?? '',
            specification: it.specification ?? '',
            uom: it.uom ?? '',
            totalQtyRequired: it.total_qty_required ?? 0,
            lessQtyAvailableInStock: it.less_qty_available_in_stock ?? 0,
            procurementLeadTimeWeeks: it.procurement_lead_time_weeks ?? 0,
            materialRequiredByDate: it.material_required_by_date ?? '',
            indigenousOrImported: it.indigenous_or_imported ?? 'Indigenous',
            ratePerItem: it.rate_per_item ?? 0,
            preferredVendorName: it.preferred_vendor_name ?? '',
            validityOfWarrantyAndGuarantee: it.validity_of_warranty_and_guarantee ?? '',
            fullLifeHr: it.full_life_hr ?? '',
            actualLifeHr: it.actual_life_hr ?? '',
            reasonForReplacement: it.reason_for_replacement ?? '',
            repairingPossibility: it.repairing_possibility ?? 'NA',
          }));

          const indentedByName = r.indented_by?.name_id ?? '';
          const signatureText = r.indented_by?.signature ?? '';
          const timestamp = r.indented_by?.timestamp ?? r.created_at ?? '';
          const forwardedByName = r.forwarded_by?.name_id ?? '';
          const forwardedSignatureText = r.forwarded_by?.signature ?? '';
          const forwardedTimestamp = r.forwarded_by?.timestamp ?? '';
          const approvedByName = r.approved_by?.name_id ?? '';
          const approvedBySignature = r.approved_by?.signature ?? '';
          const approvedByTimestamp = r.approved_by?.timestamp ?? '';

          return {
            id: r.pr_number ?? `api-${idx}`,
            project: r.indent_data?.project ?? '',
            prNo: r.pr_number ?? '',
            date: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : (r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''),
            department: r.department ?? '',
            indentedBy: indentedByName,
            indentedBySignature: signatureText,
            indentedByTimestamp: timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '',
            forwardedBy: forwardedByName,
            forwardedBySignature: forwardedSignatureText,
            forwardedByTimestamp: forwardedTimestamp ? new Date(forwardedTimestamp).toISOString().slice(0,10) : '',
            directorsApproval: approvedByName,
            directorsApprovalSignature: approvedBySignature,
            directorsApprovalTimestamp: approvedByTimestamp ? new Date(approvedByTimestamp).toISOString().slice(0,10) : '',
            remarksNotes: r.notes ?? '',
            budgetHead: '',
            items,
            // Consider indent 'pending' when director's approval signature is missing
            status: approvedBySignature ? 'forwarded' : 'pending',
          } as Indent;
        });
        setIndents(list);
      } catch (err: any) {
        console.error('Load indents error:', err);
        const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
        toast.error(`Failed to load indents: ${msg}`);
      }
    };
    load();
  }, []);

  // per-indent state: whether attachment is done (enables Forward)
  const [attachedMap, setAttachedMap] = useState<Record<string, boolean>>({});
  // per-indent approval state coming from attach-sign API
  const [indentApprovalsMap, setIndentApprovalsMap] = useState<Record<string, boolean>>({});
  const [attachingApprovalMap, setAttachingApprovalMap] = useState<Record<string, boolean>>({});
  const [previewIndent, setPreviewIndent] = useState<Indent | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return indents.filter((it) =>
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

  const markAttached = (id: string) => {
    setAttachedMap((prev) => ({ ...prev, [id]: true }));
    toast.success('Attachment added');
  };

  const forward = (id: string) => {
    if (!attachedMap[id]) return;
    setIndents((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'forwarded' } : x)));
    toast.success('Indent forwarded');
  };

  // API helper: POST to attach sign endpoint
  const indentByAttachSignApi = async (payload: { pr_number: string; name_id: string; signature: string }) => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${BASE_URL}/purchase_flow/forward_indent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('attach-sign failed');
    // Some backends may return empty body; parse safely and return null if empty or unparsable
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // API helper: POST to director approval endpoint
  const directorApprovalApi = async (payload: { pr_number: string; name_id: string; signature: string }) => {
    const BASE_URL = getBaseUrl().replace(/\/$/, '');
    const res = await fetch(`${BASE_URL}/purchase_flow/director_approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('director approval failed');
    const text = await res.text();
    if (!text) return { success: true } as any; // treat empty ok response as success
    try {
      return JSON.parse(text);
    } catch {
      return { success: true } as any;
    }
  };

  const attachIndentApproval = async ({ id, prNo }: { id: string; prNo: string }) => {
    if (!prNo) { toast.error('Missing PR number'); return; }
    const p = readUserProfile();
    let staffName = (p.name || '').trim();
    let staffDesignation = (p.role || '').trim();

    // If local profile is missing, try retrieving credentials from server
    if (!staffName) {
      try {
        const BASE_URL = getBaseUrl().replace(/\/$/, '');
        // read cached auth token (stored by AuthContext under key 'fc_auth_v1')
        let token = '';
        try {
          const raw = window.localStorage.getItem('fc_auth_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            token = String(parsed?.token ?? '');
          }
        } catch {
          // ignore parse errors
        }

        const res = await fetch(`${BASE_URL}/login/get_credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const cred = await res.json();
          staffName = (cred?.staff_name || '').trim();
          staffDesignation = (cred?.staff_designation || '')?.trim();
          if (staffName) writeUserProfile({ name: staffName, role: staffDesignation });
        }
      } catch (e) {
        console.warn('Failed to fetch credentials', e);
      }
    }

    if (!staffName) {
      toast.error('Unable to determine staff name; please login or set profile');
      return;
    }

    const nameId = `${staffName}${staffDesignation ? ` / ${staffDesignation}` : ''}`;
    const now = new Date();
    const hhmm = now.toTimeString().slice(0,5);
    const ymd = now.toISOString().slice(0,10);
    const signature = `Approved | ${staffName} | ${hhmm} | ${ymd}`;

    setAttachingApprovalMap((s) => ({ ...s, [id]: true }));
    try {
      const json = await directorApprovalApi({ pr_number: prNo, name_id: nameId, signature });
      // If backend explicitly returned success:true, use our nameId and signature
      let backend: any = null;
      if (json && (json.success === true)) {
        backend = { name_id: nameId, signature, timestamp: new Date().toISOString() };
      } else if (json) {
        backend = (json.approved_by ?? json.forwarded_by ?? json.indented_by) ?? { name_id: nameId, signature, timestamp: new Date().toISOString() };
      } else {
        backend = { name_id: nameId, signature, timestamp: new Date().toISOString() };
      }

      const stampDate = backend.timestamp ? new Date(backend.timestamp).toISOString().slice(0,10) : ymd;
      setIndents((prev) => prev.map((x) => x.id === id ? ({ ...x,
        directorsApproval: backend.name_id ?? x.directorsApproval,
        directorsApprovalSignature: backend.signature ?? signature,
        directorsApprovalTimestamp: stampDate,
        status: 'forwarded',
      }) : x));
      // If preview is open for this indent, update it so popup shows new signature immediately
      setPreviewIndent((prev) => prev && prev.id === id ? ({ ...prev,
        directorsApproval: backend.name_id ?? prev.directorsApproval,
        directorsApprovalSignature: backend.signature ?? signature,
        directorsApprovalTimestamp: stampDate,
        status: 'forwarded',
      }) : prev);
      setIndentApprovalsMap((s) => ({ ...s, [id]: true }));
      toast.success('Signature attached');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Attach sign failed');
    } finally {
      setAttachingApprovalMap((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Indent Approval</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review indents, attach documents, and forward</p>
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

      {/* Sticky section switcher so Indents + NFA are always easy to access */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-gray-50/90 backdrop-blur border-b border-gray-100">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeSection === 'indents' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveSection('indents')}
          >
            Indents ({filtered.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeSection === 'nfa' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveSection('nfa')}
          >
            NFA Notes
          </button>
        </div>
      </div>

      {activeSection === 'indents' ? (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          {/* header row */}
          <div className="grid grid-cols-[minmax(220px,3fr)_minmax(140px,2fr)_minmax(180px,3fr)_minmax(130px,2fr)_80px_140px] gap-2 px-4 py-3 text-xs font-semibold text-gray-500 border-b border-gray-100">
            <div>PR No / Project</div>
            <div>Department</div>
            <div>Indented By</div>
            <div>Date</div>
            <div className="text-center">Items</div>
            <div className="text-right">Status</div>
          </div>

          <div className="space-y-3">
            {filtered.map((it) => {
              const attached = Boolean(attachedMap[it.id]);
              const alreadySigned = Boolean(it.directorsApprovalSignature) || Boolean(indentApprovalsMap[it.id]);
              void attached;

              return (
                <div
                  key={it.id}
                  className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-gray-200"
                  onClick={() => setPreviewIndent(it)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPreviewIndent(it);
                  }}
                >
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-semibold text-gray-800">{it.prNo || 'PR (Draft)'}</h3>
                      <span className="text-xs text-gray-400">{it.project}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Items: {(it.items ?? []).length} · Total: {formatInr(totalValue(it.items ?? []))} · Indented by {it.indentedBy || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          it.status === 'pending'
                            ? 'text-yellow-600'
                            : it.status === 'forwarded'
                              ? 'text-blue-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {it.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">{it.date}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void attachIndentApproval({ id: it.id, prNo: it.prNo });
                        }}
                        disabled={alreadySigned || Boolean(attachingApprovalMap[it.id])}
                      >
                        <Paperclip className="w-4 h-4" />
                        {alreadySigned ? 'Approved' : attachingApprovalMap[it.id] ? 'Attaching…' : 'Attach Sign'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">NFA Notes</h2>
              <p className="text-xs text-gray-500">HO selected quote + Finance Admin Ops note (stored locally)</p>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(220px,3fr)_minmax(220px,3fr)_minmax(280px,4fr)] gap-2 px-4 py-3 text-xs font-semibold text-gray-500 border-b border-gray-100">
            <div>PR No / Project</div>
            <div>HO Forwarded Note</div>
            <div>Finance Admin Ops Note</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((it) => {
              const comp = (comparatives || {})[it.id];
              const hoTotal = comp ? calcHoSelectedTotal(comp) : null;
              const hoVendor = comp?.vendors?.find((v) => v.id === comp.hoSelectedVendorId)?.name;
              const noteState = nfaNotes[it.id];

              return (
                <div
                  key={`nfa-${it.id}`}
                  className="grid grid-cols-[minmax(220px,3fr)_minmax(220px,3fr)_minmax(280px,4fr)] gap-2 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (comp) setPreviewHoComp(comp);
                    else toast.error('No HO comparative forwarded for this PR yet');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (comp) setPreviewHoComp(comp);
                      else toast.error('No HO comparative forwarded for this PR yet');
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{it.prNo || 'PR (Draft)'}</div>
                    <div className="text-xs text-gray-500 truncate">{it.project}</div>
                  </div>

                  <div className="text-xs text-gray-600">
                    {comp?.hoSelectedVendorId ? (
                      <div>
                        Best quote selected: <span className="font-semibold text-gray-800">{hoVendor || comp.hoSelectedVendorId}</span>
                        {typeof hoTotal === 'number' ? (
                          <>
                            {' '}
                            · Total: <span className="font-semibold text-gray-800">{formatInr(hoTotal)}</span>
                          </>
                        ) : null}
                        {comp.hoForwardedAt ? (
                          <>
                            {' '}
                            · Forwarded: <span className="text-gray-700">{new Date(comp.hoForwardedAt).toISOString().slice(0, 10)}</span>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-500">No HO comparative forwarded for this PR yet.</span>
                    )}
                    <div className="mt-1 text-[10px] text-gray-400">Click row to view HO selected quote (PDF)</div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <textarea
                      className="w-full min-h-[44px] resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="Add note… (stored locally)"
                      value={noteState?.note ?? ''}
                      onChange={(e) => updateNfaNote(it.id, e.target.value)}
                    />
                    {noteState?.updatedAt ? (
                      <div className="mt-1 text-[10px] text-gray-400">
                        Updated: {new Date(noteState.updatedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">No indents found.</div>
            )}
          </div>
        </div>
      )}

      {/* HO Comparative PDF Preview */}
      <Dialog open={Boolean(previewHoComp)} onOpenChange={(v) => { if (!v) setPreviewHoComp(null); }}>
        <DialogContent className="max-w-[1200px] w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>HO Selected Quote (Preview)</DialogTitle>
          </DialogHeader>

          {previewHoComp ? <HOPreview comp={previewHoComp} /> : null}

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setPreviewHoComp(null)}>Close</Button>
              <Button
                className="bg-gray-900 hover:bg-gray-800 text-white"
                onClick={() => {
                  try {
                    window.print();
                  } catch {
                    // ignore
                  }
                }}
              >
                Download / Print
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewIndent)} onOpenChange={(v) => { if (!v) setPreviewIndent(null); }}>
        <DialogContent className="max-w-[1200px] w-[1200px] max-h-[90vh] overflow-y-auto">
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
                indentedBySignature: previewIndent.indentedBySignature,
                indentedByTimestamp: previewIndent.indentedByTimestamp,
                forwardedBy: previewIndent.forwardedBy,
                forwardedBySignature: previewIndent.forwardedBySignature,
                forwardedByTimestamp: previewIndent.forwardedByTimestamp,
                directorsApproval: previewIndent.directorsApproval,
                directorsApprovalSignature: previewIndent.directorsApprovalSignature,
                directorsApprovalTimestamp: previewIndent.directorsApprovalTimestamp,
                remarksNotes: previewIndent.remarksNotes,
                budgetHead: previewIndent.budgetHead,
                items: previewIndent.items,
              }}
              attachments={attachments}
              showDirectorSignature={Boolean(directorsAttachedMap[previewIndent.id])}
            />
          )}
                {previewIndent && (
            <DialogFooter>
              <div className="flex justify-end gap-2 w-full">
                <Button variant="outline" onClick={() => setPreviewIndent(null)}>Close</Button>
                <Button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!previewIndent) return; void attachIndentApproval({ id: previewIndent.id, prNo: previewIndent.prNo }); }}
                  disabled={Boolean((previewIndent && (previewIndent.directorsApprovalSignature || indentApprovalsMap[previewIndent.id])) || (previewIndent && attachingApprovalMap[previewIndent.id]))}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {previewIndent && (previewIndent.directorsApprovalSignature || indentApprovalsMap[previewIndent.id]) ? 'Approved' : (previewIndent && attachingApprovalMap[previewIndent.id]) ? 'Attaching…' : 'Attach Sign'}
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
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

// ─── DiaryPersonRow — one card in the Signature Diary ────────────────────────

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
        {/* Signature */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-1">Signature</label>
          <input ref={sigRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onChange({ ...data, signature: await readImageFile(file) });
              e.target.value = '';
            }}
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
            <Button type="button" variant="outline" size="sm" className="w-full text-[11px] h-8" onClick={() => sigRef.current?.click()}>
              Upload
            </Button>
          )}
        </div>

        {/* Stamp */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-1">Stamp</label>
          <input ref={stampRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onChange({ ...data, stamp: await readImageFile(file) });
              e.target.value = '';
            }}
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
            <Button type="button" variant="outline" size="sm" className="w-full text-[11px] h-8" onClick={() => stampRef.current?.click()}>
              Upload
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Configure Modal ────────────────────────────────────────────────────────

const ConfigureModal = ({
  open,
  onClose,
  indents,
}: {
  open: boolean;
  onClose: () => void;
  indents: Indent[];
}) => {
  // ── User profile ──
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');

  // ── Signature Diary ──
  const [diary, setDiary] = useState<SignatureDiary>({});
  const [newPersonName, setNewPersonName] = useState('');

  // Names detected automatically from indents
  const detectedNames = useMemo(() => {
    const names = new Set<string>();
    for (const ind of indents) {
      if (ind.indentedBy?.trim()) names.add(ind.indentedBy.trim());
      if (ind.forwardedBy?.trim()) names.add(ind.forwardedBy.trim());
      if (ind.directorsApproval?.trim()) names.add(ind.directorsApproval.trim());
    }
    return Array.from(names);
  }, [indents]);

  // All names shown = detected + any extra manually added
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
    if (detectedNames.includes(name)) return; // cannot remove auto-detected
    setDiary((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
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

          {/* ── Current User Profile ── */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserCircle className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-800">Current User Profile</p>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              This profile is used to auto-detect who is granting approvals. Make sure your name matches exactly the name in the indents.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. RAJENDRA SHRINGARPUTALE"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Role / Designation</label>
                <Input
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  placeholder="e.g. Director"
                />
              </div>
            </div>
          </div>

          {/* ── Signature Diary ── */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookUser className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-800">Signature Diary</p>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Upload a signature and/or stamp for each person. Names from current indents are auto-detected.
              Signatures appear in the PR preview rows matching that person's name.
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
                <p className="text-xs text-gray-400 text-center py-2">No names detected yet. Add one below.</p>
              )}

              {/* Add extra person */}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Add person by name…"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } }}
                  className="text-sm h-9"
                />
                <Button type="button" variant="outline" size="sm" className="h-9 gap-1 shrink-0" onClick={addPerson}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
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

export default AdminOpsIndent;
