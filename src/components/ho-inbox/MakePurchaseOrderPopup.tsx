import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type ComparativeModel } from '@/components/purchase/ComparativeStatementPreview';

type Props = {
  open: boolean;
  comparative: ComparativeModel | null;
  vendorId?: string; // defaults to comparative.hoSelectedVendorId
  onClose: () => void;
  onConfirm?: (payload: { indentId: string; vendorId: string; createdAt: string; poNo: string }) => void;
};

const safe = (v: unknown) => String(v ?? '').trim();

const formatYmd = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const inr = (n: number) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

const numOr0 = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

const baseForVendor = (c: ComparativeModel, vendorId: string) => {
  const items = Array.isArray(c.items) ? c.items : [];
  const q = (c.quotes || []).find((x: any) => String(x?.vendorId ?? '') === vendorId);
  const unitById = (q as any)?.unitRateByItemId || {};
  return items.reduce((sum, it: any) => sum + numOr0(unitById[it.id]) * numOr0(it.qty), 0);
};

const gstForVendor = (c: ComparativeModel, vendorId: string) => {
  const items = Array.isArray(c.items) ? c.items : [];
  const q = (c.quotes || []).find((x: any) => String(x?.vendorId ?? '') === vendorId);
  const unitById = (q as any)?.unitRateByItemId || {};
  return items.reduce((sum, it: any) => {
    const base = numOr0(unitById[it.id]) * numOr0(it.qty);
    const gst = (numOr0((it as any)?.gstPercent) / 100) * base;
    return sum + gst;
  }, 0);
};

const totalForVendor = (c: ComparativeModel, vendorId: string) => {
  const base = baseForVendor(c, vendorId);
  const freight = numOr0((c as any)?.freightCharges?.[vendorId]);
  const other = numOr0((c as any)?.otherCharges?.[vendorId]);
  const gst = gstForVendor(c, vendorId);
  return base + freight + other + gst;
};

type Page1State = {
  poNo: string;
  poDate: string;
  vendorCode: string;
  vatRegnNo: string;
  vendorName: string;
  vendorAddr1: string;
  vendorAddr2: string;
  vendorAddr3: string;
  vendorAddr4: string;
  vendorVatRegnNo: string;
  paymentTerms: string;
  incoTerms: string;
  deliveryDate: string;
  shipToTel: string;
  shipToFax: string;
  shipToPoBox: string;
  shipToEmail: string;
  shipToAddress: string;
  notes: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
};

const defaultPage1 = (): Page1State => ({
  poNo: '',
  poDate: formatYmd(new Date().toISOString()),
  vendorCode: '',
  vatRegnNo: '',
  vendorName: '',
  vendorAddr1: '',
  vendorAddr2: '',
  vendorAddr3: '',
  vendorAddr4: '',
  vendorVatRegnNo: '',
  paymentTerms: 'Due within 30 Days',
  incoTerms: 'FOB',
  deliveryDate: formatYmd(new Date().toISOString()),
  shipToTel: '',
  shipToFax: '',
  shipToPoBox: '',
  shipToEmail: '',
  shipToAddress: '',
  notes:
    'The Delay penalty is applicable once the delivery period will be one week exceeded\nPlease send the original invoice to finance department along with a copy of purchase order\nAny Shipment and invoice without PO no will not be accepted.',
  preparedBy: '',
  verifiedBy: '',
  approvedBy: '',
});

type Page2State = {
  supplierFinalQuotationNo: string;
  supplierFinalQuotationDate: string;
  scopeOfWork: string;
  basisOfPrice: string;
  taxes: string;
  deliveryTimelines: string;
  documents: string;
  paymentTerms: string;
  installationSupport: string;
  inspection: string;
  warranty: string;
  ldPenalty: string;
  remarks: string;
  siteBillingAddress: string;
  documentsRequired: string;
};

const defaultPage2 = (): Page2State => ({
  supplierFinalQuotationNo: 'SABCO/20225-26/37',
  supplierFinalQuotationDate: '',
  scopeOfWork:
    'Total SOW is inclusive of but not limited to the complete Preparation – Supply of Organic Manure as per supplier’s referred offer and Approved by the Buyer',
  basisOfPrice:
    'Ex – Works, Supplier’s Godown, C/o. Amriyt Agrotech, Jeora Village, Durg, Chhattisgarh.\nTransportation up to Project Site shall be in the scope of Buyer.',
  taxes:
    'GST @ 5% as applicable, shall be paid. The total order value mentioned in the price breakup is inclusive of all taxes and there will be no charges or taxes additionally payable over and above this.',
  deliveryTimelines:
    'Time is the essence of this contract. Supplier shall ensure that the Organic Manure is ready to be supplied from SBACO Godown, C/o. Amriyt Agrotech, Jeora Village, Durg, Chhattisgarh, within 3-4 Months from the date of order confirmation. Supplier shall submit all the necessary documents for approval immediately after PO confirmation. Supplier shall submit a detailed delivery schedule in line with technical team’s requirement.',
  documents:
    'The Supplier shall submit all necessary documents to the Buyer within 1-2 days of order confirmation, for Approval and clearance if required by the buyer.\nThe responsibility of getting documents approved from Buyer is in the scope of Supplier. The delay in submission of documents or getting the documents approved shall not be a reason for providing delivery extension.',
  paymentTerms:
    'a) 60% of the Basic order value shall be paid in advance upon acceptance of the Purchase Order (PO) and against submission of Performa invoice (PI).\n\nb) Balance 40% of the order value along with total applicable GST shall be paid on actual supply basis within 7-10 days from the date of receipt of material at site.',
  installationSupport: 'NA',
  inspection:
    'Shall be in the scope of Buyer. Supplier has to inform regarding material readiness and shall raise the inspection call 1-2 days prior to material readiness.',
  warranty:
    'The Supplier guarantees that the Supplied Organic Manure material shall be new, and shall conform to the specifications and quality standards as agreed at the time of purchase.',
  ldPenalty:
    'In the event of a delay in the delivery of the Organic Manure beyond the delivery timeline mentioned in the schedule, LD @ 1% of the PO value per week of delay for each calendar week or part thereof shall be applicable. The LD penalty shall be subject to a maximum of 10% of the total Basic Value of the Purchase Order.',
  remarks:
    '1) Price breakup Annexure-1\n2) All the other terms are as per attached General terms and conditions Annexure 2.',
  siteBillingAddress:
    'SITE & BILLING ADDRESS:\n\nName of the Company: SAI BIORESOURCES PRIVATE LIMITED\nBuilding. No/Flat. No: Khasra No.121/1, Amrit Dairy Farm\nRoad/Street: Kachandur Dhour Road;\nVillage: Jeora,\nDistrict: Durg\nPin code: 491001\nGST No: 22ARPCS5442R1ZM\nName: Rajendra Shriringarpulate\nMobile Number: +91 79748 97686\nEmail: rajendra.s@saiobioenergy.com',
  documentsRequired:
    '1) Invoice\n2) Packing List\n3) Manufacturer\'s Guarantee Certificate\n4) Inspection Release Note\n5) Any Other Documents as may be needed at the time of supply & Handover.',
});

type Page3State = {
  annexureTitle: string;
  leftColumn: string;
  rightColumn: string;
};

const defaultPage3 = (): Page3State => ({
  annexureTitle: 'GENERAL TERMS AND CONDITIONS — ANNEXURE 2',
  leftColumn: '',
  rightColumn: '',
});

export function MakePurchaseOrderPopup({ open, comparative, vendorId, onClose, onConfirm }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const [p1, setP1] = useState<Page1State>(() => defaultPage1());
  const [p2, setP2] = useState<Page2State>(() => defaultPage2());
  const [p3, setP3] = useState<Page3State>(() => defaultPage3());

  const resolvedVendorId = useMemo(() => {
    const v = safe(vendorId) || safe((comparative as any)?.hoSelectedVendorId);
    return v;
  }, [vendorId, comparative]);

  const vendorNameFromComparative = useMemo(() => {
    const vendors = Array.isArray(comparative?.vendors) ? comparative!.vendors : [];
    const match = vendors.find((v: any) => safe(v?.id) === resolvedVendorId);
    return safe(match?.name) || resolvedVendorId;
  }, [comparative, resolvedVendorId]);

  const computedTotals = useMemo(() => {
    if (!comparative || !resolvedVendorId) return null;
    const base = baseForVendor(comparative, resolvedVendorId);
    const gst = gstForVendor(comparative, resolvedVendorId);
    const freight = numOr0((comparative as any)?.freightCharges?.[resolvedVendorId]);
    const other = numOr0((comparative as any)?.otherCharges?.[resolvedVendorId]);
    const gross = base + gst + freight + other;
    return { base, gst, freight, other, gross };
  }, [comparative, resolvedVendorId]);

  const suggestedPoNo = useMemo(() => {
    const pr = safe(comparative?.indentId);
    const today = new Date();
    const y = String(today.getFullYear()).slice(-2);
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const tail = pr ? pr.replace(/[^A-Za-z0-9]/g, '').slice(-6) : '000000';
    return `PO/${y}${m}${d}/${tail}`;
  }, [comparative]);

  const effectivePoNo = p1.poNo.trim() || suggestedPoNo;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html><head><title>Purchase Order</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
        .po-title { text-align: center; color: #6d28d9; font-weight: 800; letter-spacing: .04em; font-size: 18px; margin-bottom: 12px; }
        .hdr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 10px; }
        .label-row { display: flex; gap: 8px; font-size: 11px; }
        .label { width: 140px; color: #111; font-weight: 700; }
        .value { color: #111; }
        .bar { background: #e5e7eb; padding: 6px 10px; font-weight: 700; text-align: center; margin: 10px 0 6px; }
        .box { border: 1px solid #d1d5db; padding: 10px; min-height: 120px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #111; padding: 6px 6px; font-size: 11px; }
        th { background: #e5e7eb; text-align: center; }
        td.num { text-align: right; }
        .sign { border: 1px solid #d1d5db; padding: 10px; height: 44px; }
        .muted { color: #374151; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);

    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handleConfirm = () => {
    if (!comparative) return;
    if (!resolvedVendorId) return;

    const createdAt = new Date().toISOString();
    onConfirm?.({ indentId: safe(comparative.indentId), vendorId: resolvedVendorId, createdAt, poNo: effectivePoNo });
    onClose();
  };

  if (!open) return null;
  if (!comparative) return null;

  const qForVendor = (comparative.quotes || []).find((x: any) => safe(x?.vendorId) === resolvedVendorId);

  const setP1Field = <K extends keyof Page1State>(k: K, v: Page1State[K]) => {
    setP1((p) => ({ ...p, [k]: v }));
  };

  const setP2Field = <K extends keyof Page2State>(k: K, v: Page2State[K]) => {
    setP2((p) => ({ ...p, [k]: v }));
  };

  // (optional) helper
  const setP3Field = <K extends keyof Page3State>(k: K, v: Page3State[K]) => {
    setP3((p) => ({ ...p, [k]: v }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30 rounded-t-xl shrink-0">
          <div className="font-semibold text-sm">Make PO (Purchase Order)</div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span>/3
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 bg-white text-black" ref={printRef}>
          {page === 1 ? (
            <div>
              <div className="text-center font-extrabold tracking-wide text-violet-700 text-lg mb-3">PURCHASE ORDER</div>

              {/* Top info rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-3">
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold w-28">VAT Regn. No.</div>
                    <Input value={p1.vatRegnNo} onChange={(e) => setP1Field('vatRegnNo', e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="font-semibold w-32 text-right">Purchase order No:</div>
                    <Input value={effectivePoNo} onChange={(e) => setP1Field('poNo', e.target.value)} className="h-7 text-xs w-60" />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="font-semibold w-32 text-right">Purchase order date:</div>
                    <Input type="date" value={p1.poDate} onChange={(e) => setP1Field('poDate', e.target.value)} className="h-7 text-xs w-60" />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="font-semibold w-32 text-right">Vendor Code:</div>
                    <Input
                      value={p1.vendorCode || resolvedVendorId}
                      onChange={(e) => setP1Field('vendorCode', e.target.value)}
                      className="h-7 text-xs w-60"
                    />
                  </div>
                </div>
              </div>

              {/* Vendor / Ship To blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="bg-gray-200 text-center font-semibold text-xs py-1">Vendor</div>
                  <div className="border border-gray-300 p-3 min-h-[190px] text-xs">
                    <Input
                      value={p1.vendorName || vendorNameFromComparative}
                      onChange={(e) => setP1Field('vendorName', e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                    <div className="mt-2 space-y-1">
                      <Input value={p1.vendorAddr1} onChange={(e) => setP1Field('vendorAddr1', e.target.value)} className="h-7 text-xs" placeholder="Address line 1" />
                      <Input value={p1.vendorAddr2} onChange={(e) => setP1Field('vendorAddr2', e.target.value)} className="h-7 text-xs" placeholder="Address line 2" />
                      <Input value={p1.vendorAddr3} onChange={(e) => setP1Field('vendorAddr3', e.target.value)} className="h-7 text-xs" placeholder="City / State" />
                      <Input value={p1.vendorAddr4} onChange={(e) => setP1Field('vendorAddr4', e.target.value)} className="h-7 text-xs" placeholder="Country" />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-28">VAT Regn. No.</div>
                        <Input value={p1.vendorVatRegnNo} onChange={(e) => setP1Field('vendorVatRegnNo', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-28">Payment Terms:</div>
                        <Input
                          value={p1.paymentTerms || safe((comparative as any)?.paymentTerms?.[resolvedVendorId])}
                          onChange={(e) => setP1Field('paymentTerms', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-28">Inco Terms:</div>
                        <Input value={p1.incoTerms} onChange={(e) => setP1Field('incoTerms', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-28">Delivery Date:</div>
                        <Input type="date" value={p1.deliveryDate} onChange={(e) => setP1Field('deliveryDate', e.target.value)} className="h-7 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-gray-200 text-center font-semibold text-xs py-1">Ship To</div>
                  <div className="border border-gray-300 p-3 min-h-[190px] text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-16">Tel:</div>
                        <Input value={p1.shipToTel} onChange={(e) => setP1Field('shipToTel', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-16">Fax:</div>
                        <Input value={p1.shipToFax} onChange={(e) => setP1Field('shipToFax', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-16">P.O.Box:</div>
                        <Input value={p1.shipToPoBox} onChange={(e) => setP1Field('shipToPoBox', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold w-16">Email:</div>
                        <Input value={p1.shipToEmail} onChange={(e) => setP1Field('shipToEmail', e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div className="mt-2">
                        <div className="font-semibold mb-1">Address:</div>
                        <Input value={p1.shipToAddress} onChange={(e) => setP1Field('shipToAddress', e.target.value)} className="h-7 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item table */}
              <div className="mt-4 border border-black">
                <div className="grid grid-cols-7 bg-gray-200 text-[11px] font-semibold text-center border-b border-black">
                  <div className="py-1 border-r border-black">Item</div>
                  <div className="py-1 border-r border-black">Material</div>
                  <div className="py-1 border-r border-black col-span-2">Short Text</div>
                  <div className="py-1 border-r border-black">UOM</div>
                  <div className="py-1 border-r border-black">Quantity</div>
                  <div className="py-1">Net Price</div>
                </div>

                {(comparative.items || []).map((it: any, idx: number) => {
                  const unit = numOr0((qForVendor as any)?.unitRateByItemId?.[it.id]);
                  return (
                    <div key={it.id || idx} className="grid grid-cols-7 text-[11px] border-b border-black">
                      <div className="p-2 border-r border-black text-center">{idx + 1}</div>
                      <div className="p-2 border-r border-black" />
                      <div className="p-2 border-r border-black col-span-2">{safe(it.partName) || '—'}</div>
                      <div className="p-2 border-r border-black text-center">{safe(it.uom) || '—'}</div>
                      <div className="p-2 border-r border-black text-right">{numOr0(it.qty) || 0}</div>
                      <div className="p-2 text-right">{unit ? inr(unit) : '—'}</div>
                    </div>
                  );
                })}

                {/* Totals area (mimic right stacked rows) */}
                <div className="grid grid-cols-7 text-[11px]">
                  <div className="col-span-4 border-r border-black" />
                  <div className="col-span-2 border-r border-black">
                    <div className="border-b border-black p-2 font-semibold">Value</div>
                    <div className="border-b border-black p-2 font-semibold">Discount</div>
                    <div className="border-b border-black p-2 font-semibold">Net Total</div>
                    <div className="border-b border-black p-2 font-semibold">VAT</div>
                    <div className="p-2 font-semibold">Gross Total</div>
                  </div>
                  <div className="col-span-1">
                    <div className="border-b border-black p-2 text-right">{computedTotals ? inr(computedTotals.base) : '—'}</div>
                    <div className="border-b border-black p-2 text-right">—</div>
                    <div className="border-b border-black p-2 text-right">{computedTotals ? inr(computedTotals.base) : '—'}</div>
                    <div className="border-b border-black p-2 text-right">{computedTotals ? inr(computedTotals.gst) : '—'}</div>
                    <div className="p-2 text-right">{computedTotals ? inr(computedTotals.gross) : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Notes & Instructions */}
              <div className="mt-6">
                <div className="bg-gray-200 text-center font-semibold text-xs py-1">Notes and Instructions</div>
                <div className="border border-gray-300 p-3">
                  <textarea
                    value={p1.notes}
                    onChange={(e) => setP1Field('notes', e.target.value)}
                    className="w-full min-h-[90px] text-xs outline-none resize-none"
                  />
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="border border-gray-300 p-2">
                  <div className="text-xs font-semibold">Prepared By:</div>
                  <Input value={p1.preparedBy} onChange={(e) => setP1Field('preparedBy', e.target.value)} className="h-7 text-xs mt-2" />
                </div>
                <div className="border border-gray-300 p-2">
                  <div className="text-xs font-semibold">Verified By:</div>
                  <Input value={p1.verifiedBy} onChange={(e) => setP1Field('verifiedBy', e.target.value)} className="h-7 text-xs mt-2" />
                </div>
                <div className="border border-gray-300 p-2">
                  <div className="text-xs font-semibold">Approved By:</div>
                  <Input value={p1.approvedBy} onChange={(e) => setP1Field('approvedBy', e.target.value)} className="h-7 text-xs mt-2" />
                </div>
              </div>
            </div>
          ) : page === 2 ? (
            <div>
              <div className="text-[11px] text-gray-700 mb-2">
                <span className="font-semibold">Other Terms &amp; Conditions</span> governing this order shall be as follows:
              </div>

              <div className="border border-black">
                <div className="grid grid-cols-[52px_170px_1fr] text-[11px]">
                  <div className="bg-gray-200 border-b border-black border-r border-black p-2 text-center font-semibold">#</div>
                  <div className="bg-gray-200 border-b border-black border-r border-black p-2 font-semibold">Reference</div>
                  <div className="bg-gray-200 border-b border-black p-2" />

                  {/* 1 Reference */}
                  <div className="border-b border-black border-r border-black p-2 text-center font-semibold">1)</div>
                  <div className="border-b border-black border-r border-black p-2 font-semibold">Reference</div>
                  <div className="border-b border-black p-2">
                    <div className="text-[11px] mb-2">
                      Supplier’s final quotation No-
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        value={p2.supplierFinalQuotationNo}
                        onChange={(e) => setP2Field('supplierFinalQuotationNo', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="e.g. SABCO/20225-26/37"
                      />
                      <Input
                        type="date"
                        value={p2.supplierFinalQuotationDate}
                        onChange={(e) => setP2Field('supplierFinalQuotationDate', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* 2 Scope of Work */}
                  <div className="border-b border-black border-r border-black p-2 text-center font-semibold">2)</div>
                  <div className="border-b border-black border-r border-black p-2 font-semibold">Scope Of Work</div>
                  <div className="border-b border-black p-2">
                    <textarea
                      value={p2.scopeOfWork}
                      onChange={(e) => setP2Field('scopeOfWork', e.target.value)}
                      className="w-full min-h-[72px] text-xs outline-none resize-none"
                      placeholder="Enter scope of work..."
                    />
                  </div>

                  {/* 3 Basis of Price */}
                  <div className="border-b border-black border-r border-black p-2 text-center font-semibold">3)</div>
                  <div className="border-b border-black border-r border-black p-2 font-semibold">Basis of Price</div>
                  <div className="border-b border-black p-2">
                    <textarea
                      value={p2.basisOfPrice}
                      onChange={(e) => setP2Field('basisOfPrice', e.target.value)}
                      className="w-full min-h-[56px] text-xs outline-none resize-none"
                      placeholder="Enter basis of price..."
                    />
                  </div>

                  {/* 4 Taxes */}
                  <div className="border-b border-black border-r border-black p-2 text-center font-semibold">4)</div>
                  <div className="border-b border-black border-r border-black p-2 font-semibold">Taxes</div>
                  <div className="border-b border-black p-2">
                    <textarea
                      value={p2.taxes}
                      onChange={(e) => setP2Field('taxes', e.target.value)}
                      className="w-full min-h-[56px] text-xs outline-none resize-none"
                      placeholder="Enter tax terms..."
                    />
                  </div>

                  {/* 5 Delivery Timelines */}
                  <div className="border-b border-black border-r border-black p-2 text-center font-semibold">5)</div>
                  <div className="border-b border-black border-r border-black p-2 font-semibold">Delivery Timelines</div>
                  <div className="border-b border-black p-2">
                    <textarea
                      value={p2.deliveryTimelines}
                      onChange={(e) => setP2Field('deliveryTimelines', e.target.value)}
                      className="w-full min-h-[90px] text-xs outline-none resize-none"
                      placeholder="Enter delivery timeline terms..."
                    />
                  </div>

                  {/* Page footer line like scan */}
                  <div className="col-span-3 p-2 text-[10px] text-gray-600 flex items-center justify-end">
                    Page 2 of 3
                  </div>
                </div>
              </div>

              {/* Mimic next page's PO heading section separator (visual continuity) */}
              <div className="mt-6 border-t border-gray-300 pt-4">
                <div className="text-center font-extrabold tracking-wide text-violet-700 text-lg">PURCHASE ORDER</div>
                <div className="mt-3 border border-black">
                  <div className="grid grid-cols-[52px_170px_1fr] text-[11px]">
                    <div className="bg-gray-200 border-b border-black border-r border-black p-2 text-center font-semibold">#</div>
                    <div className="bg-gray-200 border-b border-black border-r border-black p-2 font-semibold">Term</div>
                    <div className="bg-gray-200 border-b border-black p-2" />

                    {/* 6 Documents */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">6)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Documents</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.documents}
                        onChange={(e) => setP2Field('documents', e.target.value)}
                        className="w-full min-h-[74px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 7 Payment Terms */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">7)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Payment Terms</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.paymentTerms}
                        onChange={(e) => setP2Field('paymentTerms', e.target.value)}
                        className="w-full min-h-[74px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 8 Installation & Commissioning Support */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">8)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Installation &amp; Commissioning Support</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.installationSupport}
                        onChange={(e) => setP2Field('installationSupport', e.target.value)}
                        className="w-full min-h-[46px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 9 Inspection */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">9)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Inspection</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.inspection}
                        onChange={(e) => setP2Field('inspection', e.target.value)}
                        className="w-full min-h-[56px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 10 Warranty */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">10)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Warranty</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.warranty}
                        onChange={(e) => setP2Field('warranty', e.target.value)}
                        className="w-full min-h-[56px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 11 LD Penalty */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">11)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">LD Penalty</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.ldPenalty}
                        onChange={(e) => setP2Field('ldPenalty', e.target.value)}
                        className="w-full min-h-[74px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 12 Remarks */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">12)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Remarks</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.remarks}
                        onChange={(e) => setP2Field('remarks', e.target.value)}
                        className="w-full min-h-[56px] text-xs outline-none resize-none"
                      />
                    </div>

                    {/* 13 Site Address & Billing Address */}
                    <div className="border-b border-black border-r border-black p-2 text-center font-semibold">13)</div>
                    <div className="border-b border-black border-r border-black p-2 font-semibold">Site Address &amp; Billing Address</div>
                    <div className="border-b border-black p-2">
                      <textarea
                        value={p2.siteBillingAddress}
                        onChange={(e) => setP2Field('siteBillingAddress', e.target.value)}
                        className="w-full min-h-[120px] text-xs outline-none resize-none"
                        placeholder="SITE & BILLING ADDRESS..."
                      />
                    </div>

                    <div className="col-span-3 border-b border-black p-2 text-[11px] font-semibold">Documents Required:</div>
                    <div className="col-span-3 p-2">
                      <textarea
                        value={p2.documentsRequired}
                        onChange={(e) => setP2Field('documentsRequired', e.target.value)}
                        className="w-full min-h-[80px] text-xs outline-none resize-none"
                        placeholder="1) Invoice\n2) Packing List\n..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center font-extrabold tracking-wide text-gray-900 text-[13px]">
                <Input
                  value={p3.annexureTitle}
                  onChange={(e) => setP3Field('annexureTitle', e.target.value)}
                  className="h-7 text-xs font-semibold text-center"
                />
              </div>

              {/* Two-column page (ditto layout style). Content is editable but left blank by default. */}
              <div className="mt-4 border border-black p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-black p-3">
                    <div className="text-[10px] text-gray-600 mb-2">Column 1</div>
                    <textarea
                      value={p3.leftColumn}
                      onChange={(e) => setP3Field('leftColumn', e.target.value)}
                      className="w-full min-h-[560px] text-[11px] leading-5 outline-none resize-none"
                      placeholder="Paste Annexure 2 content (left column)…"
                    />
                  </div>

                  <div className="border border-black p-3">
                    <div className="text-[10px] text-gray-600 mb-2">Column 2</div>
                    <textarea
                      value={p3.rightColumn}
                      onChange={(e) => setP3Field('rightColumn', e.target.value)}
                      className="w-full min-h-[560px] text-[11px] leading-5 outline-none resize-none"
                      placeholder="Paste Annexure 2 content (right column)…"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-gray-600 flex items-center justify-end">
                Page 3 of 3
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Vendor: <span className="font-medium text-foreground">{p1.vendorName.trim() || vendorNameFromComparative || '—'}</span>
            {computedTotals ? (
              <>
                <span className="opacity-60"> • </span>
                Total: <span className="font-medium text-foreground">{inr(computedTotals.gross)}</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => (p === 1 ? 1 : ((p - 1) as any)))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {page < 3 ? (
              <Button
                type="button"
                onClick={() => setPage((p) => (p === 3 ? 3 : ((p + 1) as any)))}
                className="gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={!resolvedVendorId}>
                Confirm PO
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
