import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

const clampPercent = (v: unknown) => {
  const raw = String(v ?? '').trim();
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
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

const DUMMY_COMPANY = {
  name: 'SAI BIORESOURCES PRIVATE LIMITED',
  line1: 'Khasra No.121/1, Amrit Dairy Farm',
  line2: 'Kachandur Dhour Road, Village Jeora, Durg, Chhattisgarh - 491001',
  gst: 'GST No: 22ARPCS5442R1ZM',
};

const DUMMY_VENDOR = {
  addr1: 'Address line 1 (dummy)',
  addr2: 'Address line 2 (dummy)',
  addr3: 'City / State (dummy)',
  addr4: 'Country (dummy)',
  vatRegnNo: 'VATREGN-DUMMY',
};

const DUMMY_SHIP_TO = {
  tel: '+91 90000 00000',
  fax: 'NA',
  poBox: 'NA',
  email: 'store@company.com',
  address: 'Project Site Address (dummy)',
};

const DOCUMENT_REQUIRED_OPTIONS = [
  'Invoice',
  'Packing List',
  "Manufacturer's Guarantee Certificate",
  'Inspection Release Note',
] as const;

const normalizeDocText = (v: unknown) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const selectedDocsFromText = (text: string) => {
  const t = normalizeDocText(text);
  const out = new Set<(typeof DOCUMENT_REQUIRED_OPTIONS)[number]>();
  for (const opt of DOCUMENT_REQUIRED_OPTIONS) {
    if (t.includes(normalizeDocText(opt))) out.add(opt);
  }
  return out;
};

const formatDocsList = (docs: readonly string[]) => docs.map((d, i) => `${i + 1}) ${d}`).join('\n');

const formatTaxTermsText = (gstPct: number, otherPct: number) => {
  const gst = `${gstPct.toFixed(gstPct % 1 === 0 ? 0 : 2)}%`;
  const other = otherPct > 0 ? `${otherPct.toFixed(otherPct % 1 === 0 ? 0 : 2)}%` : '';

  if (other) {
    return `GST @ ${gst} as applicable shall be paid. Other taxes/duties @ ${other} (if applicable) shall be paid.`;
  }
  return `GST @ ${gst} as applicable shall be paid.`;
};

type PaymentInstallment = {
  id: string;
  percent: string;
  label: string;
};

const newInstallment = (seed?: Partial<PaymentInstallment>): PaymentInstallment => {
  const id = seed?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return {
    id,
    percent: seed?.percent ?? '',
    label: seed?.label ?? '',
  };
};

const formatPaymentTermsText = (installments: PaymentInstallment[]) => {
  const cleaned = installments
    .map((x) => ({
      pct: clampPercent(x.percent),
      label: String(x.label ?? '').trim(),
    }))
    .filter((x) => x.pct > 0 && x.label.length > 0);

  const toAlpha = (idx: number) => String.fromCharCode(97 + (idx % 26));

  if (cleaned.length === 0) return '';

  return cleaned
    .map((x, idx) => {
      const pct = `${x.pct.toFixed(x.pct % 1 === 0 ? 0 : 2)}%`;
      const label = x.label.endsWith('.') ? x.label : `${x.label}.`;
      return `${toAlpha(idx)}) ${pct} ${label}`;
    })
    .join('\n\n');
};

const formatLdPenaltyText = (perWeekPct: number, maxPct: number) => {
  const perWeek = `${perWeekPct.toFixed(perWeekPct % 1 === 0 ? 0 : 2)}%`;
  const max = maxPct > 0 ? `${maxPct.toFixed(maxPct % 1 === 0 ? 0 : 2)}%` : '';

  const line1 = `In the event of a delay in the delivery beyond the delivery timeline mentioned in the schedule, LD @ ${perWeek} of the PO value per week of delay for each calendar week or part thereof shall be applicable.`;
  if (max) {
    const line2 = `The LD penalty shall be subject to a maximum of ${max} of the total Basic Value of the Purchase Order.`;
    return `${line1}\n\n${line2}`;
  }
  return line1;
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
  vatRegnNo: DUMMY_COMPANY.gst,
  vendorName: '',
  vendorAddr1: DUMMY_VENDOR.addr1,
  vendorAddr2: DUMMY_VENDOR.addr2,
  vendorAddr3: DUMMY_VENDOR.addr3,
  vendorAddr4: DUMMY_VENDOR.addr4,
  vendorVatRegnNo: DUMMY_VENDOR.vatRegnNo,
  paymentTerms: 'Due within 30 Days',
  incoTerms: 'FOB',
  deliveryDate: formatYmd(new Date().toISOString()),
  shipToTel: DUMMY_SHIP_TO.tel,
  shipToFax: DUMMY_SHIP_TO.fax,
  shipToPoBox: DUMMY_SHIP_TO.poBox,
  shipToEmail: DUMMY_SHIP_TO.email,
  shipToAddress: DUMMY_SHIP_TO.address,
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
  taxAutoCalcEnabled: boolean;
  taxGstPercent: string;
  taxOtherPercent: string;
  deliveryTimelines: string;
  documents: string;
  paymentTerms: string;
  paymentAutoEnabled: boolean;
  paymentInstallments: PaymentInstallment[];
  installationSupport: string;
  inspection: string;
  warranty: string;
  ldPenalty: string;
  ldAutoEnabled: boolean;
  ldPerWeekPercent: string;
  ldMaxPercent: string;
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
  taxes: '',
  taxAutoCalcEnabled: false,
  taxGstPercent: '5',
  taxOtherPercent: '',
  deliveryTimelines:
    'Time is the essence of this contract. Supplier shall ensure that the Organic Manure is ready to be supplied from SBACO Godown, C/o. Amriyt Agrotech, Jeora Village, Durg, Chhattisgarh, within 3-4 Months from the date of order confirmation. Supplier shall submit all the necessary documents for approval immediately after PO confirmation. Supplier shall submit a detailed delivery schedule in line with technical team’s requirement.',
  documents:
    'The Supplier shall submit all necessary documents to the Buyer within 1-2 days of order confirmation, for Approval and clearance if required by the buyer.\nThe responsibility of getting documents approved from Buyer is in the scope of Supplier. The delay in submission of documents or getting the documents approved shall not be a reason for providing delivery extension.',
  paymentTerms:
    'a) 60% of the Basic order value shall be paid in advance upon acceptance of the Purchase Order (PO) and against submission of Performa invoice (PI).\n\nb) Balance 40% of the order value along with total applicable GST shall be paid on actual supply basis within 7-10 days from the date of receipt of material at site.',
  paymentAutoEnabled: false,
  paymentInstallments: [
    newInstallment({ percent: '60', label: 'of the basic order value shall be paid in advance upon acceptance of the Purchase Order (PO)' }),
    newInstallment({ percent: '40', label: 'of the basic order value shall be paid on delivery / invoice submission (as applicable)' }),
  ],
  installationSupport: 'NA',
  inspection:
    'Shall be in the scope of Buyer. Supplier has to inform regarding material readiness and shall raise the inspection call 1-2 days prior to material readiness.',
  warranty:
    'The Supplier guarantees that the Supplied Organic Manure material shall be new, and shall conform to the specifications and quality standards as agreed at the time of purchase.',
  ldPenalty:
    'In the event of a delay in the delivery of the Organic Manure beyond the delivery timeline mentioned in the schedule, LD @ 1% of the PO value per week of delay for each calendar week or part thereof shall be applicable. The LD penalty shall be subject to a maximum of 10% of the total Basic Value of the Purchase Order.',
  ldAutoEnabled: false,
  ldPerWeekPercent: '1',
  ldMaxPercent: '10',
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

    const gstPct = clampPercent(p2.taxGstPercent);
    const otherPct = clampPercent(p2.taxOtherPercent);
    const autoGst = (gstPct / 100) * base;
    const autoOther = (otherPct / 100) * base;
    const autoTax = autoGst + autoOther;

    const tax = p2.taxAutoCalcEnabled ? autoTax : gst;
    const gross = base + tax + freight + other;

    return {
      base,
      gst, // original (item-based) GST
      freight,
      other,
      tax, // effective tax used in totals
      gross,
      auto: {
        gstPct,
        otherPct,
        gstAmount: autoGst,
        otherAmount: autoOther,
        taxAmount: autoTax,
      },
    };
  }, [comparative, resolvedVendorId, p2.taxAutoCalcEnabled, p2.taxGstPercent, p2.taxOtherPercent]);

  const taxesAutoText = useMemo(() => {
    const gstPct = clampPercent(p2.taxGstPercent);
    const otherPct = clampPercent(p2.taxOtherPercent);
    return formatTaxTermsText(gstPct, otherPct);
  }, [p2.taxGstPercent, p2.taxOtherPercent]);

  const paymentAutoText = useMemo(() => {
    return formatPaymentTermsText(Array.isArray(p2.paymentInstallments) ? p2.paymentInstallments : []);
  }, [p2.paymentInstallments]);

  const paymentInstallmentsSummary = useMemo(() => {
    const list = Array.isArray(p2.paymentInstallments) ? p2.paymentInstallments : [];
    const totalPct = list.reduce((sum, x) => sum + clampPercent(x.percent), 0);
    const base = computedTotals?.base ?? 0;
    const totalAmt = (totalPct / 100) * base;
    return { totalPct, totalAmt };
  }, [p2.paymentInstallments, computedTotals?.base]);

  const ldAutoText = useMemo(() => {
    const perWeekPct = clampPercent(p2.ldPerWeekPercent);
    const maxPct = clampPercent(p2.ldMaxPercent);
    return formatLdPenaltyText(perWeekPct, maxPct);
  }, [p2.ldPerWeekPercent, p2.ldMaxPercent]);

  const ldAmounts = useMemo(() => {
    const base = computedTotals?.base ?? 0;
    const perWeekPct = clampPercent(p2.ldPerWeekPercent);
    const maxPct = clampPercent(p2.ldMaxPercent);
    const perWeekAmt = (perWeekPct / 100) * base;
    const maxAmt = (maxPct / 100) * base;
    return { perWeekPct, maxPct, perWeekAmt, maxAmt };
  }, [p2.ldPerWeekPercent, p2.ldMaxPercent, computedTotals?.base]);

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
        @media print { .no-print { display: none !important; } }
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

  const toggleRequiredDoc = (doc: (typeof DOCUMENT_REQUIRED_OPTIONS)[number], shouldInclude: boolean) => {
    const current = selectedDocsFromText(String(p2.documentsRequired ?? ''));
    if (shouldInclude) current.add(doc);
    else current.delete(doc);

    const ordered = DOCUMENT_REQUIRED_OPTIONS.filter((x) => current.has(x));
    setP2Field('documentsRequired', formatDocsList(ordered) as any);
  };

  const updateInstallment = (id: string, patch: Partial<PaymentInstallment>) => {
    setP2((p) => ({
      ...p,
      paymentInstallments: (Array.isArray(p.paymentInstallments) ? p.paymentInstallments : []).map((x) =>
        x.id === id ? ({ ...x, ...patch } as PaymentInstallment) : x
      ),
    }));
  };

  const addInstallment = () => {
    setP2((p) => ({
      ...p,
      paymentInstallments: [...(Array.isArray(p.paymentInstallments) ? p.paymentInstallments : []), newInstallment()],
    }));
  };

  const removeInstallment = (id: string) => {
    setP2((p) => ({
      ...p,
      paymentInstallments: (Array.isArray(p.paymentInstallments) ? p.paymentInstallments : []).filter((x) => x.id !== id),
    }));
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

        <div className="overflow-y-auto flex-1 px-8 py-8 bg-white text-black" ref={printRef}>
          {page === 1 ? (
            <div className="max-w-4xl mx-auto">

              {/* ── LETTERHEAD ── */}
              <div className="border-b-2 border-gray-800 pb-3 mb-0">
                <div className="flex items-start justify-between">
                  {/* Company identity */}
                  <div>
                    <div className="text-[17px] font-black tracking-wide text-gray-900 uppercase leading-tight">
                      {DUMMY_COMPANY.name}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 leading-4">
                      <div>{DUMMY_COMPANY.line1}</div>
                      <div>{DUMMY_COMPANY.line2}</div>
                      <div className="font-semibold text-gray-700 mt-0.5">{DUMMY_COMPANY.gst}</div>
                    </div>
                  </div>
                  {/* Logo placeholder */}
                  <div className="w-16 h-16 border border-gray-300 rounded flex items-center justify-center text-[9px] text-gray-400 font-semibold tracking-wide shrink-0">
                    LOGO
                  </div>
                </div>
              </div>

              {/* ── PO TITLE BAR ── */}
              <div className="bg-gray-800 text-white text-center font-extrabold tracking-[0.22em] text-[13px] py-2.5 mb-4">
                PURCHASE ORDER
              </div>

              {/* ── PO REFERENCE BLOCK ── */}
              <div className="border border-gray-300 mb-4">
                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    <tr>
                      <td className="bg-gray-100 font-semibold text-gray-600 px-3 py-1.5 w-[160px] border-r border-b border-gray-300">
                        Purchase Order No.
                      </td>
                      <td className="px-3 py-1.5 border-r border-b border-gray-300 font-mono font-semibold text-gray-900">
                        {effectivePoNo}
                      </td>
                      <td className="bg-gray-100 font-semibold text-gray-600 px-3 py-1.5 w-[140px] border-r border-b border-gray-300">
                        Date
                      </td>
                      <td className="px-3 py-1.5 border-b border-gray-300 text-gray-900">
                        {p1.poDate || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-gray-100 font-semibold text-gray-600 px-3 py-1.5 border-r border-gray-300">
                        Vendor Code
                      </td>
                      <td className="px-3 py-1.5 border-r border-gray-300 font-mono text-gray-900">
                        {resolvedVendorId || '—'}
                      </td>
                      <td className="bg-gray-100 font-semibold text-gray-600 px-3 py-1.5 border-r border-gray-300">
                        VAT Regn. No.
                      </td>
                      <td className="px-3 py-1.5 text-gray-900">
                        {p1.vatRegnNo || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── VENDOR / SHIP TO ── */}
              <div className="grid grid-cols-2 gap-0 border border-gray-300 mb-4">
                {/* Vendor box */}
                <div className="border-r border-gray-300">
                  <div className="bg-gray-800 text-white text-center font-bold tracking-widest text-[10px] py-1.5">
                    VENDOR
                  </div>
                  <div className="p-3 text-[11px] text-gray-900 space-y-0.5 min-h-[160px]">
                    <div className="font-bold text-[12px] mb-1">{vendorNameFromComparative || '—'}</div>
                    <div className="text-gray-700">{p1.vendorAddr1}</div>
                    <div className="text-gray-700">{p1.vendorAddr2}</div>
                    <div className="text-gray-700">{p1.vendorAddr3}</div>
                    <div className="text-gray-700">{p1.vendorAddr4}</div>
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5">
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-24 shrink-0">VAT Regn. No.</span>
                        <span>{p1.vendorVatRegnNo}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-24 shrink-0">Payment Terms</span>
                        <span>{p1.paymentTerms || safe((comparative as any)?.paymentTerms?.[resolvedVendorId]) || '—'}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-24 shrink-0">Inco Terms</span>
                        <span>{p1.incoTerms}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-24 shrink-0">Delivery Date</span>
                        <span>{p1.deliveryDate || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ship To box */}
                <div>
                  <div className="bg-gray-800 text-white text-center font-bold tracking-widest text-[10px] py-1.5">
                    SHIP TO
                  </div>
                  <div className="p-3 text-[11px] text-gray-900 space-y-0.5 min-h-[160px]">
                    <div className="font-bold text-[12px] mb-1">{DUMMY_COMPANY.name}</div>
                    <div className="space-y-0.5">
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-14 shrink-0">Tel</span>
                        <span>{p1.shipToTel}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-14 shrink-0">Fax</span>
                        <span>{p1.shipToFax}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-14 shrink-0">P.O. Box</span>
                        <span>{p1.shipToPoBox}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-gray-600 w-14 shrink-0">Email</span>
                        <span>{p1.shipToEmail}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="font-semibold text-gray-600 mb-0.5">Address</div>
                        <div>{p1.shipToAddress}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ITEM TABLE ── */}
              <div className="border border-gray-300 mb-4">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-2 py-1.5 text-center font-semibold border-r border-gray-600 w-10">#</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-r border-gray-600 w-16">Material</th>
                      <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-600">Description / Short Text</th>
                      <th className="px-2 py-1.5 text-center font-semibold border-r border-gray-600 w-14">UOM</th>
                      <th className="px-2 py-1.5 text-right font-semibold border-r border-gray-600 w-16">Qty</th>
                      <th className="px-2 py-1.5 text-right font-semibold w-28">Net Price / Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(comparative.items || []).map((it: any, idx: number) => {
                      const unit = numOr0((qForVendor as any)?.unitRateByItemId?.[it.id]);
                      return (
                        <tr key={it.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1.5 text-center border-r border-t border-gray-300">{idx + 1}</td>
                          <td className="px-2 py-1.5 border-r border-t border-gray-300" />
                          <td className="px-2 py-1.5 border-r border-t border-gray-300">{safe(it.partName) || '—'}</td>
                          <td className="px-2 py-1.5 text-center border-r border-t border-gray-300">{safe(it.uom) || '—'}</td>
                          <td className="px-2 py-1.5 text-right border-r border-t border-gray-300 tabular-nums">{numOr0(it.qty) || 0}</td>
                          <td className="px-2 py-1.5 text-right border-t border-gray-300 tabular-nums">{unit ? inr(unit) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-gray-300 flex justify-end">
                  <table className="text-[11px] border-collapse w-64">
                    <tbody>
                      {[
                        ['Base Value', computedTotals ? inr(computedTotals.base) : '—'],
                        ['Discount', '—'],
                        ['Net Total', computedTotals ? inr(computedTotals.base) : '—'],
                        [p2.taxAutoCalcEnabled ? 'Tax (Auto)' : 'GST / VAT', computedTotals ? inr(computedTotals.tax) : '—'],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td className="px-3 py-1 text-gray-600 border-b border-r border-gray-300 w-36">{label}</td>
                          <td className="px-3 py-1 text-right tabular-nums border-b border-gray-300">{value}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-800 text-white font-bold">
                        <td className="px-3 py-1.5 border-r border-gray-600">Gross Total</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{computedTotals ? inr(computedTotals.gross) : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── NOTES & INSTRUCTIONS ── */}
              <div className="border border-gray-300 mb-6">
                <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] px-3 py-1.5">
                  NOTES AND INSTRUCTIONS
                </div>
                <div className="p-3">
                  <textarea
                    value={p1.notes}
                    onChange={(e) => setP1Field('notes', e.target.value)}
                    className="w-full min-h-[80px] text-[11px] text-gray-900 outline-none resize-none leading-5"
                  />
                </div>
              </div>

              {/* ── AUTHORISATION ── */}
              <div className="border border-gray-300">
                <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] px-3 py-1.5">
                  AUTHORISATION
                </div>
                <div className="grid grid-cols-3">
                  {([
                    ['Prepared By', p1.preparedBy, (v: string) => setP1Field('preparedBy', v)],
                    ['Verified By', p1.verifiedBy, (v: string) => setP1Field('verifiedBy', v)],
                    ['Approved By', p1.approvedBy, (v: string) => setP1Field('approvedBy', v)],
                  ] as [string, string, (v: string) => void][]).map(([label, val, setter], i) => (
                    <div key={label} className={`p-3 ${i < 2 ? 'border-r border-gray-300' : ''}`}>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</div>
                      <div className="border-t border-gray-400 pt-1 mt-6">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setter(e.target.value)}
                          placeholder="Name / Designation"
                          className="w-full text-[11px] outline-none border-none bg-transparent text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : page === 2 ? (
            <div className="max-w-4xl mx-auto">
              {/* ── LETTERHEAD (same as Page 1) ── */}
              <div className="border-b-2 border-gray-800 pb-3 mb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[17px] font-black tracking-wide text-gray-900 uppercase leading-tight">
                      {DUMMY_COMPANY.name}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 leading-4">
                      <div>{DUMMY_COMPANY.line1}</div>
                      <div>{DUMMY_COMPANY.line2}</div>
                      <div className="font-semibold text-gray-700 mt-0.5">{DUMMY_COMPANY.gst}</div>
                    </div>
                  </div>
                  <div className="w-16 h-16 border border-gray-300 rounded flex items-center justify-center text-[9px] text-gray-400 font-semibold tracking-wide shrink-0">
                    LOGO
                  </div>
                </div>
              </div>

              {/* ── PO TITLE BAR (same as Page 1) ── */}
              <div className="bg-gray-800 text-white text-center font-extrabold tracking-[0.22em] text-[13px] py-2.5 mb-4">
                PURCHASE ORDER
              </div>

              <div className="border border-gray-300">
                <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] px-3 py-1.5">
                  OTHER TERMS &amp; CONDITIONS
                </div>
                <div className="px-3 py-2 text-[11px] text-gray-700 border-b border-gray-300">
                  <span className="font-semibold text-gray-900">Other Terms &amp; Conditions</span> governing this order shall be as follows:
                </div>

                <table className="w-full text-[11px] border-collapse">
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600 w-10">1)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600 w-44">Reference</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <div className="text-[11px] mb-2">Supplier’s final quotation No-</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Input
                            value={p2.supplierFinalQuotationNo}
                            onChange={(e) => setP2Field('supplierFinalQuotationNo', e.target.value)}
                            className="h-7 text-[11px] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                            placeholder="e.g. SABCO/20225-26/37"
                          />
                          <Input
                            type="date"
                            value={p2.supplierFinalQuotationDate}
                            onChange={(e) => setP2Field('supplierFinalQuotationDate', e.target.value)}
                            className="h-7 text-[11px] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                          />
                        </div>
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">2)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Scope Of Work</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.scopeOfWork}
                          onChange={(e) => setP2Field('scopeOfWork', e.target.value)}
                          className="w-full min-h-[72px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                          placeholder="Enter scope of work..."
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">3)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Basis of Price</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.basisOfPrice}
                          onChange={(e) => setP2Field('basisOfPrice', e.target.value)}
                          className="w-full min-h-[56px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                          placeholder="Enter basis of price..."
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">4)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Taxes</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <div className="no-print mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-600">
                              {p2.taxAutoCalcEnabled && (
                                <div className="flex items-center gap-2 flex-wrap px-2 py-1 rounded-none border border-gray-200 bg-gray-50">
                                  <span className="text-gray-500">GST</span>
                                  <Input
                                    value={p2.taxGstPercent}
                                    onChange={(e) => setP2Field('taxGstPercent', e.target.value)}
                                    inputMode="decimal"
                                    className="h-6 text-[10px] w-14 rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 tabular-nums"
                                    placeholder="%"
                                  />
                                  <span className="text-gray-500">Amt</span>
                                  <span className="text-gray-700 tabular-nums min-w-[84px] text-right">{computedTotals ? inr(computedTotals.auto.gstAmount) : '—'}</span>

                                  <span className="text-gray-300 mx-1">|</span>

                                  <span className="text-gray-500">Other</span>
                                  <Input
                                    value={p2.taxOtherPercent}
                                    onChange={(e) => setP2Field('taxOtherPercent', e.target.value)}
                                    inputMode="decimal"
                                    className="h-6 text-[10px] w-14 rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 tabular-nums"
                                    placeholder="%"
                                  />
                                  <span className="text-gray-500">Amt</span>
                                  <span className="text-gray-700 tabular-nums min-w-[84px] text-right">{computedTotals ? inr(computedTotals.auto.otherAmount) : '—'}</span>

                                  <span className="text-gray-300 mx-1">|</span>

                                  <span className="font-semibold text-gray-800 tabular-nums">Tax</span>
                                  <span className="font-semibold text-gray-800 tabular-nums min-w-[92px] text-right">{computedTotals ? inr(computedTotals.auto.taxAmount) : '—'}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-700 tabular-nums">Gross</span>
                                  <span className="text-gray-700 tabular-nums min-w-[92px] text-right">{computedTotals ? inr(computedTotals.gross) : '—'}</span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setP2Field('taxAutoCalcEnabled', !p2.taxAutoCalcEnabled)}
                              className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                                p2.taxAutoCalcEnabled
                                  ? 'bg-gray-100 border-gray-400 text-gray-800'
                                  : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              {p2.taxAutoCalcEnabled ? '✦ Auto' : '⊘ Auto'}
                            </button>
                          </div>

                          {!p2.taxAutoCalcEnabled && (
                            <div className="mt-1 text-[10px] text-gray-500">
                              Tip: enable <span className="font-semibold">Auto</span> to compute GST/Other on base amount.
                            </div>
                          )}
                        </div>

                        <textarea
                          value={p2.taxAutoCalcEnabled ? taxesAutoText : p2.taxes}
                          onChange={(e) => setP2Field('taxes', e.target.value)}
                          readOnly={p2.taxAutoCalcEnabled}
                          className={`w-full min-h-[56px] text-[11px] outline-none resize-none leading-5 bg-transparent border border-gray-200 rounded-none px-2 py-1 placeholder:text-gray-400 ${
                            p2.taxAutoCalcEnabled ? 'text-gray-700 bg-gray-50' : 'text-gray-900 bg-white'
                          }`}
                          placeholder="Enter applicable tax terms…"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">5)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Delivery Timelines</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.deliveryTimelines}
                          onChange={(e) => setP2Field('deliveryTimelines', e.target.value)}
                          className="w-full min-h-[90px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                          placeholder="Enter delivery timeline terms..."
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">6)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Documents</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.documents}
                          onChange={(e) => setP2Field('documents', e.target.value)}
                          className="w-full min-h-[74px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">7)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Payment Terms</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <div className="no-print mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setP2Field('paymentAutoEnabled', !p2.paymentAutoEnabled)}
                              className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                                p2.paymentAutoEnabled
                                  ? 'bg-gray-100 border-gray-400 text-gray-800'
                                  : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              {p2.paymentAutoEnabled ? '✦ Auto Breakdown' : '⊘ Auto Breakdown'}
                            </button>

                            {p2.paymentAutoEnabled && (
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="font-semibold text-gray-700">
                                  {paymentInstallmentsSummary.totalPct.toFixed(
                                    paymentInstallmentsSummary.totalPct % 1 === 0 ? 0 : 2
                                  )}% allocated
                                </span>
                                {computedTotals && <span className="text-gray-400">• {inr(paymentInstallmentsSummary.totalAmt)}</span>}
                              </div>
                            )}
                          </div>

                          {p2.paymentAutoEnabled && (
                            <div className="mt-2 border border-gray-200 bg-gray-50 px-2 py-2 rounded-none">
                              <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 mb-1">
                                <div className="col-span-1">#</div>
                                <div className="col-span-2">%</div>
                                <div className="col-span-7">Milestone</div>
                                <div className="col-span-2 text-right">Amount</div>
                              </div>

                              <div className="space-y-1.5">
                                {(Array.isArray(p2.paymentInstallments) ? p2.paymentInstallments : []).map((row, idx) => {
                                  const pct = clampPercent(row.percent);
                                  const amt = computedTotals ? (pct / 100) * computedTotals.base : 0;
                                  return (
                                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                                      <div className="col-span-1 text-[10px] text-gray-400 text-right pr-1">
                                        {String.fromCharCode(97 + idx)})
                                      </div>

                                      <div className="col-span-2 flex items-center gap-1">
                                        <Input
                                          value={row.percent}
                                          onChange={(e) => updateInstallment(row.id, { percent: e.target.value })}
                                          inputMode="decimal"
                                          className="h-7 text-[10px] w-full rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 tabular-nums"
                                          placeholder="%"
                                        />
                                      </div>

                                      <div className="col-span-7 flex items-center gap-2">
                                        <Input
                                          value={row.label}
                                          onChange={(e) => updateInstallment(row.id, { label: e.target.value })}
                                          className="h-7 text-[10px] w-full rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0"
                                          placeholder="milestone description…"
                                        />
                                      </div>

                                      <div className="col-span-2 flex items-center justify-end gap-1">
                                        <span className="text-[10px] text-gray-600 tabular-nums">{computedTotals ? inr(amt) : '—'}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeInstallment(row.id)}
                                          disabled={(Array.isArray(p2.paymentInstallments) ? p2.paymentInstallments : []).length <= 1}
                                          className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30 shrink-0 px-1"
                                          title="Remove"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={addInstallment}
                                className="text-[10px] text-gray-700 hover:text-gray-900 font-medium mt-2"
                              >
                                + Add milestone
                              </button>
                            </div>
                          )}
                        </div>

                        <textarea
                          value={p2.paymentAutoEnabled ? paymentAutoText : p2.paymentTerms}
                          onChange={(e) => setP2Field('paymentTerms', e.target.value)}
                          readOnly={p2.paymentAutoEnabled}
                          className={`w-full min-h-[74px] text-[11px] outline-none resize-none leading-5 bg-transparent border border-gray-200 rounded-none px-2 py-1 placeholder:text-gray-400 ${
                            p2.paymentAutoEnabled ? 'text-gray-700 bg-gray-50' : 'text-gray-900 bg-white'
                          }`}
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">8)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Installation &amp; Commissioning Support</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.installationSupport}
                          onChange={(e) => setP2Field('installationSupport', e.target.value)}
                          className="w-full min-h-[46px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">9)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Inspection</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.inspection}
                          onChange={(e) => setP2Field('inspection', e.target.value)}
                          className="w-full min-h-[56px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">10)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Warranty</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.warranty}
                          onChange={(e) => setP2Field('warranty', e.target.value)}
                          className="w-full min-h-[56px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">11)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">LD Penalty</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <div className="no-print flex items-center gap-2 mb-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setP2Field('ldAutoEnabled', !p2.ldAutoEnabled)}
                            className={`ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                              p2.ldAutoEnabled
                                ? 'bg-gray-100 border-gray-400 text-gray-800'
                                : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {p2.ldAutoEnabled ? '✦ Auto' : '⊘ Auto'}
                          </button>

                          {p2.ldAutoEnabled && (
                            <div className="flex items-center gap-2 flex-wrap px-2 py-1 rounded-none border border-gray-200 bg-gray-50">
                              <span className="text-gray-500">LD / week</span>
                              <Input
                                value={p2.ldPerWeekPercent}
                                onChange={(e) => setP2Field('ldPerWeekPercent', e.target.value)}
                                inputMode="decimal"
                                className="h-6 text-[10px] w-14 rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 tabular-nums"
                                placeholder="%"
                              />
                              <span className="text-gray-500">Amt</span>
                              <span className="text-gray-700 tabular-nums min-w-[92px] text-right">{computedTotals ? inr(ldAmounts.perWeekAmt) : '—'} / wk</span>
                              <span className="text-gray-300 mx-1">|</span>
                              <span className="text-gray-500">Max cap</span>
                              <Input
                                value={p2.ldMaxPercent}
                                onChange={(e) => setP2Field('ldMaxPercent', e.target.value)}
                                inputMode="decimal"
                                className="h-6 text-[10px] w-14 rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 tabular-nums"
                                placeholder="%"
                              />
                              <span className="text-gray-500">Amt</span>
                              <span className="text-gray-700 tabular-nums min-w-[92px] text-right">{ldAmounts.maxPct > 0 ? inr(ldAmounts.maxAmt) : 'No cap'}</span>
                            </div>
                          )}
                        </div>

                        <textarea
                          value={p2.ldAutoEnabled ? ldAutoText : p2.ldPenalty}
                          onChange={(e) => setP2Field('ldPenalty', e.target.value)}
                          readOnly={p2.ldAutoEnabled}
                          className={`w-full min-h-[74px] text-[11px] outline-none resize-none leading-5 bg-transparent border border-gray-200 rounded-none px-2 py-1 placeholder:text-gray-400 ${
                            p2.ldAutoEnabled ? 'text-gray-700 bg-gray-50' : 'text-gray-900 bg-white'
                          }`}
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">12)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Remarks</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.remarks}
                          onChange={(e) => setP2Field('remarks', e.target.value)}
                          className="w-full min-h-[56px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0"
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">13)</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Site Address &amp; Billing Address</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.siteBillingAddress}
                          onChange={(e) => setP2Field('siteBillingAddress', e.target.value)}
                          className="w-full min-h-[120px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                          placeholder="SITE & BILLING ADDRESS..."
                        />
                      </td>
                    </tr>

                    <tr className="bg-white">
                      <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">—</td>
                      <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Documents Required</td>
                      <td className="px-3 py-1.5 border-t border-gray-300">
                        <textarea
                          value={p2.documentsRequired}
                          onChange={(e) => setP2Field('documentsRequired', e.target.value)}
                          className="w-full min-h-[80px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                          placeholder="1) Invoice\n2) Packing List\n..."
                        />

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] rounded-none border-gray-400 text-gray-900"
                              >
                                Select documents
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[340px] p-3 rounded-none border-gray-300">
                              <div className="text-[11px] font-semibold text-gray-900">Documents Required</div>
                              <div className="text-[10px] text-gray-600 mt-0.5">Tick the documents to auto-fill the list.</div>

                              <div className="mt-3 space-y-2">
                                {DOCUMENT_REQUIRED_OPTIONS.map((opt) => {
                                  const selected = selectedDocsFromText(String(p2.documentsRequired ?? '')).has(opt);
                                  return (
                                    <label key={opt} className="flex items-start gap-2 text-[11px] cursor-pointer select-none">
                                      <Checkbox
                                        checked={selected}
                                        onCheckedChange={(v) => toggleRequiredDoc(opt, Boolean(v))}
                                        className="mt-0.5"
                                      />
                                      <span className="text-gray-900">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <div className="text-[10px] text-gray-600">
                            {selectedDocsFromText(String(p2.documentsRequired ?? '')).size} selected
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-[10px] text-gray-600 flex items-center justify-end">Page 2 of 3</div>
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
