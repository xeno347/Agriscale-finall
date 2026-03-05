import { Fragment, useEffect, useMemo, useState } from 'react';
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
import { getBaseUrl } from '@/lib/config';

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
  netPrQtyOverride?: number;
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
  indentedSignature?: string;
  forwardedSignature?: string;
  directorSignature?: string;
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

const getApiBaseUrl = () => String(getBaseUrl() ?? '').replace(/\/$/, '');

type QuotationStatus = 'saved' | 'draft' | 'no_comparative_statement' | 'forwarded' | 'unknown';

const forwardComparativeStatement = async (prNumber: string): Promise<boolean> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API base URL is not set');

  const url = `${baseUrl}/purchase_flow/forward_comparative_statement`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pr_number: prNumber }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data: any = await res.json().catch(() => null);
  const raw = (data as any)?.success;
  if (raw === true) return true;
  if (raw === 'True' || raw === 'true' || raw === 1) return true;
  return false;
};

const fetchIndentQuotationStatus = async (prNumber: string): Promise<QuotationStatus> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API base URL is not set');

  const url = `${baseUrl}/purchase_flow/indent_quotation_status`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pr_number: prNumber }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data: any = await res.json().catch(() => null);
  const statusRaw = String(data?.status ?? '').trim();
  if (statusRaw === 'saved' || statusRaw === 'draft' || statusRaw === 'no_comparative_statement' || statusRaw === 'forwarded') return statusRaw;
  return 'unknown';
};

const str = (value: unknown): string => String(value ?? '').trim();
const maybeStr = (value: unknown): string | undefined => {
  const s = str(value);
  return s ? s : undefined;
};

const num = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : undefined;
};

const dateOnly = (value: unknown): string => {
  const s = str(value);
  // handles ISO timestamps like 2026-02-26T12:08:00.985597
  if (s.includes('T')) return s.split('T')[0];
  return s || today();
};

const fetchIndentsForPr = async (): Promise<Indent[]> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API base URL is not set');

  const url = `${baseUrl}/purchase_flow/get_indent_for_purchase_requisition`;

  const doFetch = (method: 'GET' | 'POST') =>
    fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
      },
    });

  let res = await doFetch('GET');
  if (res.status === 405) res = await doFetch('POST');

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data: any = await res.json().catch(() => null);
  const list: any[] = Array.isArray(data?.indents_for_pr) ? data.indents_for_pr : [];

  return list.map((x) => {
    const indentData = x?.indent_data ?? {};
    const itemRows: any[] = Array.isArray(indentData?.item_row) ? indentData.item_row : [];

    const prNo = str(x?.pr_number) || genId();
    const indentedByName = str(x?.indented_by?.name_id);
    const forwardedByName = str(x?.forwarded_by?.name_id);
    const approvedByName = str(x?.approved_by?.name_id);

    const items: PRLineItem[] = itemRows.map((r) => {
      const srNo = num(r?.sr_no) ?? 0;
      const totalQtyRequired = num(r?.total_qty_required) ?? 0;
      const lessQtyAvailableInStock = num(r?.less_qty_available_in_stock);
      const netPrQtyOverride = num(r?.net_pr_qty);
      const ratePerItem = num(r?.rate_per_item);

      return {
        id: `${prNo}-${srNo || genId()}`,
        srNo: srNo || 0,
        itemCode: maybeStr(r?.item_code),
        partName: str(r?.part_name) || 'Item',
        specification: maybeStr(r?.specification),
        uom: str(r?.uom) || 'No',
        totalQtyRequired,
        lessQtyAvailableInStock,
        procurementLeadTimeWeeks: num(r?.procurement_lead_time_weeks),
        materialRequiredByDate: maybeStr(r?.material_required_by_date),
        indigenousOrImported: maybeStr(r?.indigenous_or_imported),
        ratePerItem,
        preferredVendorName: maybeStr(r?.preferred_vendor_name),
        validityOfWarrantyAndGuarantee: maybeStr(r?.validity_of_warranty_and_guarantee),
        fullLifeHr: maybeStr(r?.full_life_hr),
        actualLifeHr: maybeStr(r?.actual_life_hr),
        reasonForReplacement: maybeStr(r?.reason_for_replacement),
        repairingPossibility: maybeStr(r?.repairing_possibility),
        netPrQtyOverride,
      };
    });

    return {
      id: prNo,
      project: str(indentData?.project) || '—',
      prNo,
      date: dateOnly(x?.created_at),
      department: maybeStr(x?.department),
      indentedBy: indentedByName || approvedByName || '—',
      forwardedBy: forwardedByName || '—',
      directorsApproval: approvedByName || '—',
      indentedSignature: maybeStr(x?.indented_by?.signature),
      forwardedSignature: maybeStr(x?.forwarded_by?.signature),
      directorSignature: maybeStr(x?.approved_by?.signature),
      remarksNotes: maybeStr(x?.notes),
      budgetHead: '',
      items,
      status: 'draft',
    };
  });
};

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

const netPrQty = (it: PRLineItem) => {
  if (Number.isFinite(it.netPrQtyOverride as any)) return Math.max(0, Number(it.netPrQtyOverride));
  return Math.max(0, (it.totalQtyRequired || 0) - (it.lessQtyAvailableInStock || 0));
};
const approxValue = (it: PRLineItem) => netPrQty(it) * (it.ratePerItem || 0);
const totalValue = (items: PRLineItem[]) => items.reduce((s, it) => s + approxValue(it), 0);

const PRPreview = ({
  indent,
  attachments,
  onAddQuote,
  onRemoveQuote,
  readOnly,
  approved,
}: {
  indent: Omit<Indent, 'id' | 'status'>;
  attachments?: SignatureDiary;
  onAddQuote?: (lineItemId: string, quote: Quote) => void;
  onRemoveQuote?: (lineItemId: string, quoteId: string) => void;
  readOnly?: boolean;
  approved?: boolean;
}) => {
  const sigFor = (name: string) => attachments?.[name] ?? null;
  return (
    <div className="min-w-[980px]">
      <div className="border border-gray-300 bg-white relative">
        {approved ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="border-4 border-green-700/30 text-green-700/30 rounded-lg px-10 py-4 font-extrabold text-5xl tracking-[0.25em]">
              APPROVED
            </div>
          </div>
        ) : null}
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
                  {onAddQuote && !readOnly ? (
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
                              {onRemoveQuote && !readOnly ? (
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
                  ) : indent.indentedSignature ? (
                    <span className="text-[10px] text-gray-700 text-center leading-tight">{indent.indentedSignature}</span>
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
                  ) : indent.forwardedSignature ? (
                    <span className="text-[10px] text-gray-700 text-center leading-tight">{indent.forwardedSignature}</span>
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
                  ) : indent.directorSignature ? (
                    <span className="text-[10px] text-gray-700 text-center leading-tight">{indent.directorSignature}</span>
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

type ComparativeVendor = {
  id: string;
  name: string;
  directoryVendorId?: string;
  phone?: string;
  location?: string;
  address?: string;
};

type ComparativeItem = {
  id: string;
  srNo?: number;
  partName?: string;
  uom?: string;
  qty: number;
  gstPercent?: number;
};

type ComparativeQuote = {
  vendorId: string;
  unitRateByItemId: Record<string, number>;
};

type Comparative = {
  indentId: string;
  title?: string;
  subTitle?: string;
  vendors?: ComparativeVendor[];
  items?: ComparativeItem[];
  quotes?: ComparativeQuote[];
  gstPercent?: number;
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
  technicalRecommendationVendorId?: string;
  // some older pages used a slightly different key
  technicalRecommendedVendorId?: string;
  lastSavedAt?: string;
  isDraft?: boolean;
};

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

const numOr0 = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

const ComparativeStatementPreview = ({ c, showForwardedStamp }: { c: Comparative; showForwardedStamp?: boolean }) => {
  const vendors = Array.isArray(c?.vendors) ? c.vendors : [];
  const items = Array.isArray(c?.items) ? c.items : [];
  const quotes = Array.isArray(c?.quotes) ? c.quotes : [];

  const techRecId = String((c as any)?.technicalRecommendationVendorId ?? (c as any)?.technicalRecommendedVendorId ?? '').trim();
  const techRecName = techRecId ? (vendors.find((v) => String(v.id) === techRecId)?.name || techRecId) : '';

  const quoteByVendorId: Record<string, ComparativeQuote | undefined> = {};
  for (const q of quotes) quoteByVendorId[String((q as any)?.vendorId ?? '')] = q;

  const gstPctForItem = (it: ComparativeItem) => {
    const ip = numOr0((it as any)?.gstPercent);
    if (ip) return ip;
    return numOr0((c as any)?.gstPercent);
  };

  const baseForVendor = (vendorId: string) => {
    const q = quoteByVendorId[vendorId];
    return items.reduce((sum, it) => {
      const unit = numOr0(q?.unitRateByItemId?.[it.id]);
      return sum + unit * numOr0(it.qty);
    }, 0);
  };

  const gstForVendor = (vendorId: string) => {
    const q = quoteByVendorId[vendorId];
    return items.reduce((sum, it) => {
      const unit = numOr0(q?.unitRateByItemId?.[it.id]);
      const amt = unit * numOr0(it.qty);
      const gp = gstPctForItem(it);
      return sum + amt * (gp / 100);
    }, 0);
  };

  const freightForVendor = (vendorId: string) => numOr0((c as any)?.freightCharges?.[vendorId]);
  const otherForVendor = (vendorId: string) => numOr0((c as any)?.otherCharges?.[vendorId]);

  const grandTotalForVendor = (vendorId: string) => {
    return baseForVendor(vendorId) + gstForVendor(vendorId) + freightForVendor(vendorId) + otherForVendor(vendorId);
  };

  if (!vendors.length || !items.length) {
    return (
      <div className="text-sm text-gray-500">
        No comparative statement details found for this PR.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded bg-white relative">
      {showForwardedStamp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-4 border-green-800/30 text-green-800/30 rounded-lg px-10 py-4 font-extrabold text-5xl tracking-[0.25em]">
            FORWARDED
          </div>
        </div>
      ) : null}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Comparative Statement</div>
        <div className="text-xs text-gray-500">
          {c.isDraft ? 'Draft' : 'Saved'}{c.lastSavedAt ? ` · ${new Date(c.lastSavedAt).toLocaleString()}` : ''}
        </div>
      </div>

      {techRecId ? (
        <div className="px-3 py-2 border-b border-gray-200 text-xs">
          <span className="font-semibold text-gray-700">Technical recommendation:</span>{' '}
          <span className="text-gray-900">{techRecName}</span>
        </div>
      ) : null}

      <div className="overflow-auto">
        <table className="w-max min-w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1 text-left">Sr</th>
              <th className="border border-gray-200 px-2 py-1 text-left">Item</th>
              <th className="border border-gray-200 px-2 py-1 text-right">Qty</th>
              <th className="border border-gray-200 px-2 py-1 text-center">UoM</th>
              {vendors.map((v) => (
                <Fragment key={v.id}>
                  <th className="border border-gray-200 px-2 py-1 text-right">{v.name} (Unit)</th>
                  <th className="border border-gray-200 px-2 py-1 text-right">{v.name} (Amt)</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td className="border border-gray-200 px-2 py-1 text-left">{(it as any)?.srNo ?? idx + 1}</td>
                <td className="border border-gray-200 px-2 py-1 text-left">{String((it as any)?.partName ?? '')}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{numOr0(it.qty)}</td>
                <td className="border border-gray-200 px-2 py-1 text-center">{String((it as any)?.uom ?? '')}</td>
                {vendors.map((v) => {
                  const q = quoteByVendorId[v.id];
                  const unit = numOr0(q?.unitRateByItemId?.[it.id]);
                  const amt = unit * numOr0(it.qty);
                  return (
                    <Fragment key={`${it.id}-${v.id}`}>
                      <td className="border border-gray-200 px-2 py-1 text-right">{unit ? unit.toLocaleString() : '—'}</td>
                      <td className="border border-gray-200 px-2 py-1 text-right">{amt ? formatInr(amt) : '—'}</td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}

            <tr className="bg-gray-50">
              <td className="border border-gray-200 px-2 py-1 font-semibold text-right" colSpan={4}>Base total</td>
              {vendors.map((v) => (
                <Fragment key={`base-${v.id}`}>
                  <td className="border border-gray-200 px-2 py-1"></td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-semibold">{formatInr(baseForVendor(v.id))}</td>
                </Fragment>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-200 px-2 py-1 font-semibold text-right" colSpan={4}>Freight</td>
              {vendors.map((v) => (
                <Fragment key={`freight-${v.id}`}>
                  <td className="border border-gray-200 px-2 py-1"></td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatInr(freightForVendor(v.id))}</td>
                </Fragment>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-200 px-2 py-1 font-semibold text-right" colSpan={4}>Other</td>
              {vendors.map((v) => (
                <Fragment key={`other-${v.id}`}>
                  <td className="border border-gray-200 px-2 py-1"></td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatInr(otherForVendor(v.id))}</td>
                </Fragment>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-200 px-2 py-1 font-semibold text-right" colSpan={4}>GST</td>
              {vendors.map((v) => (
                <Fragment key={`gst-${v.id}`}>
                  <td className="border border-gray-200 px-2 py-1"></td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatInr(gstForVendor(v.id))}</td>
                </Fragment>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-200 px-2 py-1 font-extrabold text-right" colSpan={4}>Grand total</td>
              {vendors.map((v) => (
                <Fragment key={`grand-${v.id}`}>
                  <td className="border border-gray-200 px-2 py-1"></td>
                  <td className={`border border-gray-200 px-2 py-1 text-right font-extrabold ${techRecId && v.id === techRecId ? 'text-green-700' : ''}`}>{formatInr(grandTotalForVendor(v.id))}</td>
                </Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const writeComparatives = (all: Record<string, any>) => {
  try {
    window.localStorage.setItem(COMPARATIVE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

const normalize = (v: unknown) => str(v).toLowerCase();

const indentMatchesSearch = (it: Indent, query: string) => {
  const q = normalize(query);
  if (!q) return true;

  const fields: Array<unknown> = [
    it.prNo,
    it.project,
    it.department,
    it.indentedBy,
    it.forwardedBy,
    it.directorsApproval,
    it.remarksNotes,
    it.budgetHead,
    it.date,
  ];

  if (fields.some((f) => normalize(f).includes(q))) return true;

  if (
    (it.items || []).some((li) =>
      [li.itemCode, li.partName, li.specification, li.uom, li.preferredVendorName]
        .filter(Boolean)
        .some((f) => normalize(f).includes(q)),
    )
  ) {
    return true;
  }

  return false;
};

const groupIndentsByDate = (list: Indent[]) => {
  const byDate: Record<string, Indent[]> = {};
  for (const it of list) {
    const d = str(it.date) || '—';
    (byDate[d] ||= []).push(it);
  }

  // newest date first (YYYY-MM-DD lexicographic sort)
  const dates = Object.keys(byDate).sort((a, b) => {
    if (a === b) return 0;
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a < b ? 1 : -1;
  });

  for (const d of dates) {
    byDate[d].sort((a, b) => {
      const ap = str(a.prNo || a.id);
      const bp = str(b.prNo || b.id);
      return ap.localeCompare(bp);
    });
  }

  return dates.map((date) => ({ date, indents: byDate[date] }));
};

const PurchaseRequisition = () => {
  const navigate = useNavigate();
  const [indents, setIndents] = useState<Indent[]>([]);
  const [open, setOpen] = useState(false);
  const [diary, setDiary] = useState<SignatureDiary>({});
  const [searchQuery, setSearchQuery] = useState('');
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

  const [previewComparative, setPreviewComparative] = useState<Comparative | null>(null);

  const [quotationStatusByPr, setQuotationStatusByPr] = useState<Record<
    string,
    { status: QuotationStatus; loading: boolean }
  >>({});

  const [forwardedByPr, setForwardedByPr] = useState<Record<string, boolean>>({});
  const [forwardingByPr, setForwardingByPr] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const load = async () => {
      try {
        const apiIndents = await fetchIndentsForPr();
        setIndents(apiIndents);
      } catch (e: any) {
        const message = e?.message ? String(e.message) : 'Failed to fetch indents';
        toast.error(`Failed to load indents${message ? `: ${message}` : ''}`);
        setIndents(sample);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!indents.length) return;
    let cancelled = false;

    const uniquePrs = Array.from(new Set(indents.map((x) => str(x.prNo || x.id)).filter(Boolean)));
    if (!uniquePrs.length) return;

    const loadStatuses = async () => {
      // mark PRs as loading (refresh every time indents load)
      setQuotationStatusByPr((prev) => {
        const next = { ...prev };
        for (const pr of uniquePrs) {
          next[pr] = { status: next[pr]?.status ?? 'unknown', loading: true };
        }
        return next;
      });

      await Promise.all(
        uniquePrs.map(async (pr) => {
          try {
            const st = await fetchIndentQuotationStatus(pr);
            if (cancelled) return;
            if (st === 'forwarded') {
              setForwardedByPr((p) => ({ ...p, [pr]: true }));
            }
            setQuotationStatusByPr((prev) => ({
              ...prev,
              [pr]: { status: st, loading: false },
            }));
          } catch {
            if (cancelled) return;
            setQuotationStatusByPr((prev) => ({
              ...prev,
              [pr]: { status: 'unknown', loading: false },
            }));
          }
        }),
      );
    };

    void loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [indents]);

  useEffect(() => {
    if (!previewIndent) {
      setPreviewComparative(null);
      return;
    }
    const all = readComparatives();
    const key1 = str(previewIndent.id);
    const key2 = str(previewIndent.prNo);
    setPreviewComparative((all as any)[key1] || (all as any)[key2] || null);
  }, [previewIndent]);

  const labelForQuotationStatus = (s: QuotationStatus) => {
    if (s === 'forwarded') return 'Forwarded';
    if (s === 'saved') return 'Saved';
    if (s === 'draft') return 'Draft';
    if (s === 'no_comparative_statement') return 'Not started';
    return 'Unknown';
  };

  const classForQuotationStatus = (s: QuotationStatus) => {
    if (s === 'forwarded') return 'text-green-800';
    if (s === 'saved') return 'text-green-700';
    if (s === 'draft') return 'text-red-600';
    if (s === 'no_comparative_statement') return 'text-gray-900';
    return 'text-gray-500';
  };

  const isForwarded = (pr: string) => Boolean(forwardedByPr[pr]);

  const forwardNow = async (pr: string) => {
    const prNumber = str(pr);
    if (!prNumber) return;
    if (forwardingByPr[prNumber]) return;
    if (forwardedByPr[prNumber]) return;

    setForwardingByPr((p) => ({ ...p, [prNumber]: true }));
    try {
      const ok = await forwardComparativeStatement(prNumber);
      if (!ok) {
        toast.error('Forward failed');
        return;
      }
      setForwardedByPr((p) => ({ ...p, [prNumber]: true }));
      setQuotationStatusByPr((p) => ({
        ...p,
        [prNumber]: { status: 'forwarded', loading: false },
      }));
      toast.success('Forwarded');
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '').trim();
      toast.error(`Forward failed${msg ? `: ${msg}` : ''}`);
    } finally {
      setForwardingByPr((p) => ({ ...p, [prNumber]: false }));
    }
  };

  const signaturesPresent = (it: Indent) => {
    if (it.indentedSignature || it.forwardedSignature || it.directorSignature) {
      return {
        indented: Boolean(it.indentedSignature),
        forwarded: Boolean(it.forwardedSignature),
        director: Boolean(it.directorSignature),
      };
    }
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
    const prKey = str(indent.prNo || indent.id);
    if (isForwarded(prKey)) {
      toast.error('Already forwarded. Quotations are locked.');
      return;
    }
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
    navigate(`/purchase-requisition/${encodeURIComponent(indent.id)}/quotation`);
  };

  const indentsAfterSearch = useMemo(() => {
    const q = str(searchQuery);
    if (!q) return indents;
    return indents.filter((it) => indentMatchesSearch(it, q));
  }, [indents, searchQuery]);

  const newIndents = useMemo(() => indentsAfterSearch.filter((it) => it.status === 'draft'), [indentsAfterSearch]);
  const processIndents = useMemo(
    () => indentsAfterSearch.filter((it) => it.status !== 'po' && hasAnyQuotes(it)),
    [indentsAfterSearch],
  );
  const poIndents = useMemo(() => indentsAfterSearch.filter((it) => it.status === 'po'), [indentsAfterSearch]);

  const newGroups = useMemo(() => groupIndentsByDate(newIndents), [newIndents]);
  const processGroups = useMemo(() => groupIndentsByDate(processIndents), [processIndents]);
  const poGroups = useMemo(() => groupIndentsByDate(poIndents), [poIndents]);

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

      <div className="mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search indents (PR no, project, person, item…)"
          className="max-w-xl bg-white"
        />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            New Indent ({newIndents.length})
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'process' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Process ({processIndents.length})
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-2 rounded-t-md ${activeTab === 'po' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Purchase Order ({poIndents.length})
          </button>
        </div>

        <div className="bg-white rounded border">
          <div className="divide-y divide-gray-100">
            {activeTab === 'new' && newGroups.map((g) => (
              <Fragment key={`new-${g.date}`}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">{g.date}</div>
                {g.indents.map((it) => {
                  const s = signaturesPresent(it);
                  const pr = str(it.prNo || it.id);
                  const qs = quotationStatusByPr[pr];
                  const qStatus = qs?.status ?? 'unknown';
                  const qLoading = qs?.loading ?? false;
                  const forwarding = Boolean(forwardingByPr[pr]);
                  const forwarded = isForwarded(pr);
                  const forwardEnabled = !qLoading && qStatus === 'saved' && !forwarding && !forwarded;
                  return (
                    <div key={it.id}>
                      <div className={`relative flex items-center justify-between py-3 px-4 ${forwarded ? 'bg-green-100/50' : ''}`}>
                        {forwarded ? (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="text-green-800/50 font-extrabold text-3xl tracking-[0.35em]">FORWARDED</div>
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                          <div className="text-xs text-gray-500 truncate">Indented by {it.indentedBy} · Forwarded by {it.forwardedBy}</div>
                          <div className="text-xs text-gray-500 truncate">
                            Quotation:{' '}
                            {qLoading ? (
                              <span className="font-semibold text-gray-500">Checking…</span>
                            ) : (
                              <span className={`font-semibold ${classForQuotationStatus(qStatus)}`}>{labelForQuotationStatus(qStatus)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                            <FilePlus className="w-4 h-4" /> Preview
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            disabled={!forwardEnabled}
                            title={
                              forwarded
                                ? 'Already forwarded'
                                : qLoading
                                  ? 'Checking quotation status'
                                  : qStatus === 'saved'
                                    ? 'Forward comparative statement'
                                    : 'Forward is enabled after final save'
                            }
                            onClick={() => void forwardNow(pr)}
                          >
                            {forwarding ? 'Forwarding…' : forwarded ? 'Forwarded' : 'Forward'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openQuotationPage(it)}
                            className="gap-2"
                            disabled={forwarded}
                            title={forwarded ? 'Cannot add quotation after forwarding' : 'Add / edit comparative statement'}
                          >
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
              </Fragment>
            ))}

            {activeTab === 'process' && processGroups.map((g) => (
              <Fragment key={`process-${g.date}`}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">{g.date}</div>
                {g.indents.map((it) => {
                  const pr = str(it.prNo || it.id);
                  const qs = quotationStatusByPr[pr];
                  const qStatus = qs?.status ?? 'unknown';
                  const qLoading = qs?.loading ?? false;
                  const forwarding = Boolean(forwardingByPr[pr]);
                  const forwarded = isForwarded(pr);
                  const forwardEnabled = !qLoading && qStatus === 'saved' && !forwarding && !forwarded;
                  return (
                    <div key={it.id}>
                      <div className={`relative flex items-center justify-between py-3 px-4 ${forwarded ? 'bg-green-100/50' : ''}`}>
                        {forwarded ? (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="text-green-800/50 font-extrabold text-3xl tracking-[0.35em]">FORWARDED</div>
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                          <div className="text-xs text-gray-500 truncate">Quoted items: {it.items.reduce((c, li) => c + ((li.quotes?.length) || 0), 0)}</div>
                          <div className="text-xs text-gray-500 truncate">
                            Quotation:{' '}
                            {qLoading ? (
                              <span className="font-semibold text-gray-500">Checking…</span>
                            ) : (
                              <span className={`font-semibold ${classForQuotationStatus(qStatus)}`}>{labelForQuotationStatus(qStatus)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                            <FilePlus className="w-4 h-4" /> Preview
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            disabled={!forwardEnabled}
                            title={
                              forwarded
                                ? 'Already forwarded'
                                : qLoading
                                  ? 'Checking quotation status'
                                  : qStatus === 'saved'
                                    ? 'Forward comparative statement'
                                    : 'Forward is enabled after final save'
                            }
                            onClick={() => void forwardNow(pr)}
                          >
                            {forwarding ? 'Forwarding…' : forwarded ? 'Forwarded' : 'Forward'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openQuotationPage(it)}
                            className="gap-2"
                            disabled={forwarded}
                            title={forwarded ? 'Cannot add quotation after forwarding' : 'Add / edit comparative statement'}
                          >
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
              </Fragment>
            ))}

            {activeTab === 'po' && poGroups.map((g) => (
              <Fragment key={`po-${g.date}`}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">{g.date}</div>
                {g.indents.map((it) => {
                  const pr = str(it.prNo || it.id);
                  const qs = quotationStatusByPr[pr];
                  const qStatus = qs?.status ?? 'unknown';
                  const qLoading = qs?.loading ?? false;
                  const forwarding = Boolean(forwardingByPr[pr]);
                  const forwarded = isForwarded(pr);
                  const forwardEnabled = !qLoading && qStatus === 'saved' && !forwarding && !forwarded;
                  return (
                    <div key={it.id} className={`relative flex items-center justify-between py-3 px-4 ${forwarded ? 'bg-green-100/50' : ''}`}>
                      {forwarded ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="text-green-800/50 font-extrabold text-3xl tracking-[0.35em]">FORWARDED</div>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{it.prNo} — {it.project}</div>
                        <div className="text-xs text-gray-500 truncate">PO Date: {it.purchaseOrder?.date} · Total: {it.purchaseOrder ? formatInr(it.purchaseOrder.totalValue) : '—'}</div>
                        <div className="text-xs text-gray-500 truncate">
                          Quotation:{' '}
                          {qLoading ? (
                            <span className="font-semibold text-gray-500">Checking…</span>
                          ) : (
                            <span className={`font-semibold ${classForQuotationStatus(qStatus)}`}>{labelForQuotationStatus(qStatus)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled={!forwardEnabled}
                          title={
                            forwarded
                              ? 'Already forwarded'
                              : qLoading
                                ? 'Checking quotation status'
                                : qStatus === 'saved'
                                  ? 'Forward comparative statement'
                                  : 'Forward is enabled after final save'
                          }
                          onClick={() => void forwardNow(pr)}
                        >
                          {forwarding ? 'Forwarding…' : forwarded ? 'Forwarded' : 'Forward'}
                        </Button>
                        <Button variant="outline" onClick={() => setPreviewIndent(it)} className="gap-2">
                          <FilePlus className="w-4 h-4" /> View PO
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
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
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PR Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto pr-1">
            {previewIndent ? (
              <div className="space-y-4">
                <PRPreview
                  indent={{
                    project: previewIndent.project,
                    prNo: previewIndent.prNo,
                    date: previewIndent.date,
                    department: previewIndent.department,
                    indentedBy: previewIndent.indentedBy,
                    forwardedBy: previewIndent.forwardedBy,
                    directorsApproval: previewIndent.directorsApproval,
                    indentedSignature: previewIndent.indentedSignature,
                    forwardedSignature: previewIndent.forwardedSignature,
                    directorSignature: previewIndent.directorSignature,
                    remarksNotes: previewIndent.remarksNotes || '',
                    budgetHead: previewIndent.budgetHead || '',
                    items: previewIndent.items,
                  }}
                  attachments={diary}
                  onAddQuote={(lineItemId, quote) => addQuote(previewIndent.id, lineItemId, quote)}
                  onRemoveQuote={(lineItemId, quoteId) => removeQuote(previewIndent.id, lineItemId, quoteId)}
                  readOnly={isForwarded(str(previewIndent.prNo || previewIndent.id))}
                  approved={signaturesPresent(previewIndent).director}
                />

                {previewComparative ? (
                  <ComparativeStatementPreview
                    c={previewComparative}
                    showForwardedStamp={
                      isForwarded(str(previewIndent.prNo || previewIndent.id)) &&
                      ((previewComparative?.quotes?.length || 0) > 0)
                    }
                  />
                ) : (
                  <div className="text-sm text-gray-500">No comparative statement saved for this PR yet.</div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewIndent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseRequisition;
