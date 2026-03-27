import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, FileText, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ComparativeModel } from '@/components/purchase/ComparativeStatementPreview';
import logoUrl from '@/Assets/3f-logo.png';
import getBaseUrl from '@/lib/config';

type Props = {
  open: boolean;
  comparative: ComparativeModel | null;
  vendorId?: string; // defaults to comparative.hoSelectedVendorId
  onClose: () => void;
  onConfirm?: (payload: { indentId: string; vendorId: string; createdAt: string; poNo: string }) => void;
  variant?: 'modal' | 'inline';
  inlineSimulatePrint?: boolean;
};

const safe = (v: unknown) => String(v ?? '').trim();

const extractAfterColon = (v: unknown) => {
  const s = safe(v);
  if (!s) return '';
  const idx = s.indexOf(':');
  if (idx < 0) return s;
  return s.slice(idx + 1).trim();
};

const signatureSvgDataUri = (text: string) => {
  const t = String(text ?? '').trim();
  const safeText = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const width = Math.max(280, safeText.length * 8 + 40);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44" viewBox="0 0 ${width} 44">
      <rect x="0.5" y="0.5" width="${width - 1}" height="43" rx="8" fill="#ffffff" stroke="#d1d5db" />
      <text x="${width / 2}" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#111111">${safeText}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

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
  clusterId: string;
  vendorName: string;
  vendorAddr1: string;
  vendorAddr2: string;
  vendorAddr3: string;
  vendorAddr4: string;
  vendorVatRegnNo: string;
  paymentTerms: string;
  incoTerms: string;
  deliveryDate: string;
  shipToGstNo: string;
  shipToContactName: string;
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
  clusterId: '',
  vendorName: '',
  vendorAddr1: DUMMY_VENDOR.addr1,
  vendorAddr2: DUMMY_VENDOR.addr2,
  vendorAddr3: DUMMY_VENDOR.addr3,
  vendorAddr4: DUMMY_VENDOR.addr4,
  vendorVatRegnNo: DUMMY_VENDOR.vatRegnNo,
  paymentTerms: 'Due within 30 Days',
  incoTerms: 'FOB',
  deliveryDate: formatYmd(new Date().toISOString()),
  shipToGstNo: extractAfterColon(DUMMY_COMPANY.gst),
  shipToContactName: '',
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

const PO_DRAFT_STORAGE_KEY = 'farmconnect.poDraft.v1';

type PoDraft = {
  indentId: string;
  vendorId: string;
  savedAt: string;
  page: 1 | 2 | 3;
  p1: Page1State;
  p2: Page2State;
  p3: Page3State;
  authorizedSealAttachedAt?: string;
};

type PoDraftStore = {
  drafts: Record<string, PoDraft>;
};

type ApiPurchaseOrder = {
  order_number?: unknown;
  purchase_quote?: unknown;
  other_terms_and_condition?: unknown;
};

const poDraftKey = (indentId: string, vendorId: string) => `${safe(indentId)}::${safe(vendorId)}`;

const readPoDraftStore = (): PoDraftStore => {
  try {
    const raw = window.localStorage.getItem(PO_DRAFT_STORAGE_KEY);
    if (!raw) return { drafts: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { drafts: {} };
    const drafts = (parsed as any).drafts;
    return drafts && typeof drafts === 'object' ? { drafts } : { drafts: {} };
  } catch {
    return { drafts: {} };
  }
};

const writePoDraftStore = (s: PoDraftStore) => {
  try {
    window.localStorage.setItem(PO_DRAFT_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

const DEFAULT_ANNEXURE2_LEFT =
  `1) Reference:\n` +
  `Supplier’s final quotation No- SABCO/20225-26/37 Dated 06/12/2025.\n\n` +
  `2) Scope of Work:\n` +
  `Total SOW includes the complete Preparation and Supply of Organic Manure as per the Supplier’s offer and Buyer’s approval.\n\n` +
  `3) Basis of Price:\n` +
  `Ex-Works, Supplier’s Godown, C/o Amriyt Agrotech, Jeora Village, Durg, Chhattisgarh; transportation to the site is the Buyer’s responsibility.\n\n` +
  `4) Taxes:\n` +
  `GST @ 5% is applicable and included in the total order value; no additional taxes are payable.\n\n` +
  `5) Delivery Timelines:\n` +
  `Organic Manure must be ready within 3-4 months from order confirmation.\n\n` +
  `6) Commissioning Support:\n` +
  `(Noted as a heading in the table; details as per scope descriptions.)\n\n` +
  `7) Rejected Goods:\n` +
  `Buyer reserves the right to remove and discard defective materials from their premises at no liability for damage or loss.\n\n` +
  `8) Billing Instructions:\n` +
  `Bills must be submitted in triplicate with GST/HSN numbers and PO details, and must be accompanied by a receipted challan.\n\n` +
  `9) Inspection:\n` +
  `Buyer’s responsibility; Supplier must provide 1–2 days’ notice prior to material readiness.\n\n` +
  `10) Warranty:\n` +
  `Supplier guarantees material is new and conforms to agreed specifications/quality standards.`;

const DEFAULT_ANNEXURE2_RIGHT =
  `11) LD Penalty:\n` +
  `Delay penalty of 1% of PO value per week, subject to a maximum of 10% of the total Basic Value.\n\n` +
  `12) Remarks:\n` +
  `Refers to Price Breakup (Annexure 1) and General Terms and Conditions (Annexure 2).\n\n` +
  `13) Site & Billing Address:\n` +
  `SAI BIORESOURCES PRIVATE LIMITED, Khasra No.121/1, Amrit Dairy Farm, Jeora, Durg, 491001.\n\n` +
  `14) Statutory Variance:\n` +
  `Tax variations during the schedule are paid as applicable; increases after the delivery expiry are to the Seller’s account.\n\n` +
  `15) Termination:\n` +
  `Buyer may terminate for breach (slow supply/defective goods) or for its own reasons with due notice.\n\n` +
  `16) Settlement of Disputes:\n` +
  `Handled by a Sole Arbitrator in Hyderabad under the Arbitration and Conciliation Act, 1996.\n\n` +
  `17) Damage of Material:\n` +
  `Any damage during manufacturing or transit must be replaced by the Seller within 3 working days at no cost.\n\n` +
  `18) Limitation of Liability:\n` +
  `Seller’s liability is limited to the Basic Order Price; Buyer is not liable for consequential or punitive damages.\n\n` +
  `19) Governing Laws & Confidentiality:\n` +
  `Governed by Indian laws; Seller must keep all PO data confidential.\n\n` +
  `20) Order and Confirmation:\n` +
  `Seller must confirm acceptance within 2 days; otherwise, the PO is deemed unconditionally accepted.`;

const defaultPage3 = (): Page3State => ({
  annexureTitle: 'GENERAL TERMS AND CONDITIONS — ANNEXURE 2',
  leftColumn: DEFAULT_ANNEXURE2_LEFT,
  rightColumn: DEFAULT_ANNEXURE2_RIGHT,
});

export function MakePurchaseOrderPopup({
  open,
  comparative,
  vendorId,
  onClose,
  onConfirm,
  variant = 'modal',
  inlineSimulatePrint = true,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const [p1, setP1] = useState<Page1State>(() => defaultPage1());
  const [p2, setP2] = useState<Page2State>(() => defaultPage2());
  const [p3, setP3] = useState<Page3State>(() => defaultPage3());

  const [printing, setPrinting] = useState(false);

  const [savingPo, setSavingPo] = useState(false);

  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const draftSavedTimerRef = useRef<number | null>(null);
  const didHydrateDraftRef = useRef(false);

  const [shipToEditing, setShipToEditing] = useState(false);

  const [authorizedSealAttachedAt, setAuthorizedSealAttachedAt] = useState<string>('');

  const [clusters, setClusters] = useState<any[]>([]);
  const [clustersLoading, setClustersLoading] = useState(false);

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

  const prNumber = useMemo(() => {
    return safe((comparative as any)?.pr_number) || safe((comparative as any)?.indentId) || safe((comparative as any)?.id);
  }, [comparative]);

  const comparisonId = useMemo(() => {
    return safe((comparative as any)?.comparisonId) || safe((comparative as any)?.comparison_id) || safe((comparative as any)?.comparision_id);
  }, [comparative]);

  const fetchLatestPurchaseOrderDraft = async (prNo: string, signal?: AbortSignal): Promise<ApiPurchaseOrder | null> => {
    const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('Missing API base URL');

    const url = `${baseUrl}/purchase_flow/get_purchase_orders/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pr_number: prNo }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `HTTP ${res.status}`);
    }

    const data: any = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data?.purchase_orders)
      ? data.purchase_orders
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? data
            : [];

    const ts = (x: any) => {
      const raw = safe(x?.updated_at) || safe(x?.created_at) || safe(x?.saved_at);
      const t = raw ? Date.parse(raw) : NaN;
      return Number.isFinite(t) ? t : 0;
    };

    const latest = [...list].sort((a, b) => ts(b) - ts(a))[0] ?? null;
    return latest as ApiPurchaseOrder | null;
  };

  const savePurchaseOrderToApi = async (payload: {
    comparison_id: string;
    pr_number: string;
    purchase_quote: Record<string, unknown>;
    other_terms_and_condition: Record<string, unknown>;
    order_number?: string;
  }) => {
    const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('Missing API base URL');
    const url = `${baseUrl}/purchase_flow/save_purchase_order`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `HTTP ${res.status}`);
    }

    return res.json().catch(() => null);
  };

  useEffect(() => {
    if (!open) {
      didHydrateDraftRef.current = false;
      setDraftStatus('idle');
      setShipToEditing(false);
      setAuthorizedSealAttachedAt('');
      return;
    }

    setShipToEditing(false);

    const indentId = safe((comparative as any)?.indentId);
    const vId = safe(resolvedVendorId);
    const prNo = safe(prNumber) || indentId;
    if (!prNo || !vId) return;

    if (didHydrateDraftRef.current) return;
    didHydrateDraftRef.current = true;

    const ac = new AbortController();

    (async () => {
      // 1) Server draft (source of truth)
      try {
        const draft = await fetchLatestPurchaseOrderDraft(prNo, ac.signal);
        if (draft) {
          const pq = draft.purchase_quote && typeof draft.purchase_quote === 'object' && !Array.isArray(draft.purchase_quote)
            ? (draft.purchase_quote as any)
            : {};
          const otc =
            draft.other_terms_and_condition &&
            typeof draft.other_terms_and_condition === 'object' &&
            !Array.isArray(draft.other_terms_and_condition)
              ? (draft.other_terms_and_condition as any)
              : {};

          const orderNo = safe((draft as any)?.order_number) || safe(pq?.order_number) || safe(pq?.poNo) || safe(pq?.po_no);

          setDraftStatus('idle');
          setPage(1);
          setP1({ ...defaultPage1(), ...(pq as any), poNo: orderNo } as Page1State);
          setP2({ ...defaultPage2(), ...(otc as any) } as Page2State);
          setP3((prev) => prev || defaultPage3());
          setAuthorizedSealAttachedAt(safe((pq as any)?.authorizedSealAttachedAt) || safe((draft as any)?.authorizedSealAttachedAt));
          return;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        // Silent fallback to local draft, but log for debugging
        console.error('Failed to load PO draft from server:', e);
      }

      // 2) Local fallback (older behavior)
      const store = readPoDraftStore();
      const key = poDraftKey(prNo, vId);
      const d = store.drafts?.[key] as PoDraft | undefined;
      if (!d) {
        setDraftStatus('idle');
        setAuthorizedSealAttachedAt('');
        return;
      }

      setDraftStatus('idle');
      setPage(d.page || 1);
      setP1(d.p1 || defaultPage1());
      setP2(d.p2 || defaultPage2());
      setP3(d.p3 || defaultPage3());
      setAuthorizedSealAttachedAt(safe(d.authorizedSealAttachedAt));
    })();

    return () => ac.abort();
  }, [open, comparative, resolvedVendorId, prNumber]);

  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

  const authorizedSealUrl = '/1761635984396-removebg-preview.png';

  const authorizedSignatureText = useMemo(() => {
    if (!authorizedSealAttachedAt) return '';
    const at = new Date(authorizedSealAttachedAt);
    const time = (() => {
      try {
        return at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      } catch {
        return '';
      }
    })();
    const date = formatYmd(authorizedSealAttachedAt);
    const who = safe(p1.approvedBy) || '—';
    return `Approver | ${who} | ${time || '—'} | ${date || '—'}`;
  }, [authorizedSealAttachedAt, p1.approvedBy]);

  useEffect(() => {
    if (!open) return;

    const base = String(getBaseUrl() ?? '').replace(/\/$/, '');
    if (!base) return;

    const ac = new AbortController();
    setClustersLoading(true);

    (async () => {
      try {
        const resp = await fetch(`${base}/farmer_managment/get_clusters`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
        });

        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
        const result = await resp.json();
        const list = Array.isArray(result?.clusters) ? result.clusters : [];
        setClusters(list);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('Failed to load clusters:', e);
        setClusters([]);
      } finally {
        setClustersLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open]);

  const selectedCluster = useMemo(() => {
    const id = safe(p1.clusterId);
    if (!id) return null;
    return (
      (Array.isArray(clusters) ? clusters : []).find((c: any) => safe(c?.cluster_id) === id || safe(c?.id) === id) ||
      null
    );
  }, [clusters, p1.clusterId]);

  const extractClusterShipAddress = (c: any) => {
    const addr =
      safe(c?.ship_to_address) ||
      safe(c?.shipToAddress) ||
      safe(c?.ship_address) ||
      safe(c?.shipping_address) ||
      safe(c?.cluster_address) ||
      safe(c?.address);
    return addr;
  };

  const extractClusterShipGstNo = (c: any) => {
    const raw =
      safe(c?.ship_to_gst_no) ||
      safe(c?.shipToGstNo) ||
      safe(c?.gst_no) ||
      safe(c?.gstNo) ||
      safe(c?.gstin) ||
      safe(c?.gst);
    return extractAfterColon(raw);
  };

  const extractClusterShipContactName = (c: any) => {
    return (
      safe(c?.ship_to_contact_name) ||
      safe(c?.shipToContactName) ||
      safe(c?.contact_name) ||
      safe(c?.contactName) ||
      safe(c?.contact_person) ||
      safe(c?.contactPerson)
    );
  };

  const extractClusterShipMobile = (c: any) => {
    return (
      safe(c?.ship_to_mobile) ||
      safe(c?.shipToMobile) ||
      safe(c?.mobile_number) ||
      safe(c?.mobileNumber) ||
      safe(c?.mobile) ||
      safe(c?.phone) ||
      safe(c?.phone_no) ||
      safe(c?.phoneNo)
    );
  };

  const extractClusterShipEmail = (c: any) => {
    return (
      safe(c?.ship_to_email) ||
      safe(c?.shipToEmail) ||
      safe(c?.contact_email) ||
      safe(c?.contactEmail) ||
      safe(c?.email)
    );
  };

  useEffect(() => {
    if (!selectedCluster) return;
    const addr = extractClusterShipAddress(selectedCluster);
    const gstNo = extractClusterShipGstNo(selectedCluster);
    const contactName = extractClusterShipContactName(selectedCluster);
    const mobile = extractClusterShipMobile(selectedCluster);
    const email = extractClusterShipEmail(selectedCluster);

    setP1((prev) => {
      const patch: Partial<Page1State> = {};

      if (addr) patch.shipToAddress = addr;

      if (gstNo && (!safe(prev.shipToGstNo) || safe(prev.shipToGstNo) === extractAfterColon(DUMMY_COMPANY.gst))) {
        patch.shipToGstNo = gstNo;
      }

      if (contactName && !safe(prev.shipToContactName)) {
        patch.shipToContactName = contactName;
      }

      if (mobile && (!safe(prev.shipToTel) || safe(prev.shipToTel) === safe(DUMMY_SHIP_TO.tel))) {
        patch.shipToTel = mobile;
      }

      if (email && (!safe(prev.shipToEmail) || safe(prev.shipToEmail) === safe(DUMMY_SHIP_TO.email))) {
        patch.shipToEmail = email;
      }

      return Object.keys(patch).length ? ({ ...prev, ...patch } as Page1State) : prev;
    });
  }, [selectedCluster]);

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

  const effectivePoNo = p1.poNo.trim();

  const sanitizeForFilename = (name: string) =>
    String(name ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ');

  const openPrintWindowAndAppendPages = (opts?: { title?: string }) => {
    const title = sanitizeForFilename(opts?.title || 'Purchase Order');

    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return null;

    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8" />`);
    w.document.write(`<title>${title}</title>`);
    w.document.write(`<base href="${window.location.origin}/" />`);
    w.document.write(`</head><body style="margin:0;"></body></html>`);
    w.document.close();

    // Copy styles (Tailwind + app styles) so the PO renders the same in the print window.
    const styleNodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    for (const node of styleNodes) {
      try {
        w.document.head.appendChild(w.document.importNode(node, true));
      } catch {
        // ignore
      }
    }

    const extra = w.document.createElement('style');
    extra.textContent = `
      @page { margin: 18mm; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-only { display: none !important; }
      @media print {
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        input, textarea { border: none !important; box-shadow: none !important; outline: none !important; }
      }
      .po-page { break-after: page; page-break-after: always; }
      .po-page:last-child { break-after: auto; page-break-after: auto; }
    `;
    w.document.head.appendChild(extra);

    const container = w.document.createElement('div');
    container.style.padding = '0';
    container.style.margin = '0';
    w.document.body.appendChild(container);

    // Build 3 pages by temporarily switching the in-app preview page and cloning the DOM.
    const currentPage = page;
    const pageNums: Array<1 | 2 | 3> = [1, 2, 3];

    for (const p of pageNums) {
      flushSync(() => setPage(p));

      const pageRoot = printRef.current?.firstElementChild as HTMLElement | null;
      if (!pageRoot) continue;

      // cloneNode preserves live values for input/textarea in most browsers; safer than innerHTML.
      const clone = pageRoot.cloneNode(true) as HTMLElement;
      const wrap = w.document.createElement('div');
      wrap.className = 'po-page';
      wrap.appendChild(clone);
      container.appendChild(wrap);
    }

    flushSync(() => setPage(currentPage));
    return w;
  };

  const waitForImages = async (doc: Document) => {
    const imgs = Array.from(doc.images || []);
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              })
      )
    );
  };

  const handlePrint = async (opts?: { title?: string }) => {
    if (printing) return;
    setPrinting(true);
    try {
      const w = openPrintWindowAndAppendPages({ title: opts?.title || 'Purchase Order' });
      if (!w) return;

      // Ensure images (logo/seal) are loaded before printing.
      await waitForImages(w.document);

      w.focus();

      // Some browsers cancel printing if the window is closed too early.
      const closer = () => {
        try {
          w.close();
        } catch {
          // ignore
        }
      };
      w.onafterprint = closer;

      w.print();
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    const t = sanitizeForFilename(effectivePoNo || 'purchase-order');
    void handlePrint({ title: t ? `${t}.pdf` : 'purchase-order.pdf' });
  };

  const handleSaveDraft = async () => {
    if (printing || savingPo) return;
    const vId = safe(resolvedVendorId);
    const prNo = safe(prNumber) || safe((comparative as any)?.indentId);
    if (!prNo || !vId) return;

    // Always persist locally first.
    setDraftStatus('saving');
    const savedAt = new Date().toISOString();
    const store = readPoDraftStore();
    const key = poDraftKey(prNo, vId);
    const next: PoDraft = {
      indentId: prNo,
      vendorId: vId,
      savedAt,
      page,
      p1,
      p2,
      p3,
      authorizedSealAttachedAt: authorizedSealAttachedAt || '',
    };
    writePoDraftStore({ drafts: { ...(store.drafts || {}), [key]: next } });

    if (!comparisonId) {
      toast.error('Missing comparison id');
      setDraftStatus('saved');
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = window.setTimeout(() => setDraftStatus('idle'), 1500);
      return;
    }

    setSavingPo(true);
    try {
      const payload: any = {
        comparison_id: comparisonId,
        pr_number: prNo,
        purchase_quote: {
          ...(p1 as any),
          vendor_id: vId,
          vendor_name: vendorNameFromComparative,
          authorizedSealAttachedAt: authorizedSealAttachedAt || '',
        },
        other_terms_and_condition: {
          ...(p2 as any),
        },
      };

      const existingOrderNo = safe(p1.poNo);
      if (existingOrderNo) payload.order_number = existingOrderNo;

      const apiRes: any = await savePurchaseOrderToApi(payload);
      const orderNo = safe(apiRes?.order_number) || safe(apiRes?.orderNo) || safe(apiRes?.poNo);
      if (orderNo && orderNo !== safe(p1.poNo)) setP1Field('poNo', orderNo as any);

      if (orderNo) {
        const createdAt = safe(apiRes?.created_at) || safe(apiRes?.updated_at) || new Date().toISOString();
        onConfirm?.({ indentId: safe((comparative as any)?.indentId) || prNo, vendorId: vId, createdAt, poNo: orderNo });
      }

      setDraftStatus('saved');
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = window.setTimeout(() => setDraftStatus('idle'), 1500);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '').trim();
      toast.error(`Draft saved locally, but server save failed${msg ? `: ${msg}` : ''}`);
      setDraftStatus('saved');
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
      draftSavedTimerRef.current = window.setTimeout(() => setDraftStatus('idle'), 1500);
    } finally {
      setSavingPo(false);
    }
  };

  const handleConfirm = async () => {
    if (!comparative) return;
    if (!resolvedVendorId) return;
    if (printing || savingPo) return;

    const prNo = safe(prNumber) || safe((comparative as any)?.indentId);
    if (!prNo) return;
    if (!comparisonId) {
      toast.error('Missing comparison id');
      return;
    }

    setSavingPo(true);
    try {
      const payload: any = {
        comparison_id: comparisonId,
        pr_number: prNo,
        purchase_quote: {
          ...(p1 as any),
          vendor_id: safe(resolvedVendorId),
          vendor_name: vendorNameFromComparative,
          authorizedSealAttachedAt: authorizedSealAttachedAt || '',
        },
        other_terms_and_condition: {
          ...(p2 as any),
        },
      };

      const existingOrderNo = safe(p1.poNo);
      if (existingOrderNo) payload.order_number = existingOrderNo;

      const apiRes: any = await savePurchaseOrderToApi(payload);
      const orderNo = safe(apiRes?.order_number) || safe(apiRes?.orderNo) || safe(apiRes?.poNo) || safe(p1.poNo);
      if (orderNo && orderNo !== safe(p1.poNo)) setP1Field('poNo', orderNo as any);

      const createdAt = safe(apiRes?.created_at) || safe(apiRes?.updated_at) || new Date().toISOString();
      onConfirm?.({ indentId: safe(comparative.indentId), vendorId: resolvedVendorId, createdAt, poNo: orderNo });
      onClose();
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '').trim();
      toast.error(`Failed to save purchase order${msg ? `: ${msg}` : ''}`);
    } finally {
      setSavingPo(false);
    }
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

  const renderPageContent = (p: 1 | 2 | 3) =>
    p === 1 ? (
      <div className="max-w-4xl mx-auto">

        {/* ── LETTERHEAD ── */}
        <div className="border-b-2 border-gray-800 pb-3 mb-0">
          <div className="flex items-start gap-3">
            {/* Logo */}
            <img
              src={logoUrl}
              alt="3F Logo"
              width={64}
              height={64}
              className="shrink-0"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: 4,
                backgroundColor: '#fff',
              }}
            />

            {/* Company identity */}
            <div className="flex-1">
              <div className="text-[17px] font-black tracking-wide text-gray-900 uppercase leading-tight">
                {DUMMY_COMPANY.name}
              </div>
              <div className="mt-1 text-[11px] text-gray-600 leading-4">
                <div>{DUMMY_COMPANY.line1}</div>
                <div>{DUMMY_COMPANY.line2}</div>
                <div className="font-semibold text-gray-700 mt-0.5">{DUMMY_COMPANY.gst}</div>
              </div>
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
                  {effectivePoNo || '—'}
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
                  Cluster
                </td>
                <td className="px-3 py-1.5 text-gray-900">
                  <div className="no-print">
                    <Select value={p1.clusterId} onValueChange={(v) => setP1Field('clusterId', v)}>
                      <SelectTrigger className="h-7 text-[11px] rounded-none border-0 bg-transparent shadow-none px-0 py-0 focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder={clustersLoading ? 'Loading…' : 'Select cluster'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(clusters) ? clusters : [])
                          .map((c: any) => ({
                            id: safe(c?.cluster_id) || safe(c?.id),
                            label: safe(c?.cluster_name) || safe(c?.name) || safe(c?.cluster_id) || safe(c?.id),
                          }))
                          .filter((x) => x.id)
                          .map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="print-only hidden">
                    {selectedCluster
                      ? safe(selectedCluster?.cluster_name) ||
                        safe(selectedCluster?.name) ||
                        safe(selectedCluster?.cluster_id) ||
                        safe(selectedCluster?.id)
                      : '—'}
                  </div>
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
            <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] py-1.5 px-3 flex items-center justify-between">
              <div className="text-center flex-1">SHIP TO</div>
              <button
                type="button"
                className="no-print ml-2 text-[10px] font-semibold tracking-normal px-2 py-0.5 rounded border border-white/20 text-white/90 hover:text-white hover:border-white/40"
                onClick={() => setShipToEditing((v) => !v)}
              >
                {shipToEditing ? 'Done' : 'Edit'}
              </button>
            </div>
            <div className="p-3 text-[11px] text-gray-900 space-y-0.5 min-h-[160px]">
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="flex-1">{DUMMY_COMPANY.name}</span>
                </div>

                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-32 shrink-0">Registered Office:</span>
                  {shipToEditing ? (
                    <>
                      <div className="no-print flex-1">
                        <textarea
                          value={p1.shipToAddress}
                          onChange={(e) => setP1Field('shipToAddress', e.target.value as any)}
                          className="w-full min-h-[56px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-white border border-gray-200 rounded-none px-2 py-1 focus:ring-1 focus:ring-gray-400"
                        />
                      </div>
                      <div className="print-only hidden flex-1 whitespace-pre-wrap">{p1.shipToAddress || '—'}</div>
                    </>
                  ) : (
                    <div className="flex-1 whitespace-pre-wrap">{p1.shipToAddress || '—'}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-32 shrink-0">GST No:</span>
                  {shipToEditing ? (
                    <>
                      <div className="no-print flex-1">
                        <Input
                          value={p1.shipToGstNo}
                          onChange={(e) => setP1Field('shipToGstNo', e.target.value)}
                          className="h-6 text-[11px] rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0"
                        />
                      </div>
                      <div className="print-only hidden flex-1">{p1.shipToGstNo || '—'}</div>
                    </>
                  ) : (
                    <span className="flex-1">{p1.shipToGstNo || '—'}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-32 shrink-0">Name:</span>
                  {shipToEditing ? (
                    <>
                      <div className="no-print flex-1">
                        <Input
                          value={p1.shipToContactName}
                          onChange={(e) => setP1Field('shipToContactName', e.target.value)}
                          className="h-6 text-[11px] rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0"
                        />
                      </div>
                      <div className="print-only hidden flex-1">{p1.shipToContactName || '—'}</div>
                    </>
                  ) : (
                    <span className="flex-1">{p1.shipToContactName || '—'}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-32 shrink-0">Mobile Number:</span>
                  {shipToEditing ? (
                    <>
                      <div className="no-print flex-1">
                        <Input
                          value={p1.shipToTel}
                          onChange={(e) => setP1Field('shipToTel', e.target.value)}
                          className="h-6 text-[11px] rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0"
                        />
                      </div>
                      <div className="print-only hidden flex-1">{p1.shipToTel || '—'}</div>
                    </>
                  ) : (
                    <span className="flex-1">{p1.shipToTel || '—'}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 w-32 shrink-0">Email:</span>
                  {shipToEditing ? (
                    <>
                      <div className="no-print flex-1">
                        <Input
                          value={p1.shipToEmail}
                          onChange={(e) => setP1Field('shipToEmail', e.target.value)}
                          className="h-6 text-[11px] rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0"
                        />
                      </div>
                      <div className="print-only hidden flex-1">{p1.shipToEmail || '—'}</div>
                    </>
                  ) : (
                    <span className="flex-1">{p1.shipToEmail || '—'}</span>
                  )}
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
          <div className="grid grid-cols-2">
            {([
              ['Authorized Signatory', p1.approvedBy, (v: string) => setP1Field('approvedBy', v)],
              ['Vendor Signature', p1.verifiedBy, (v: string) => setP1Field('verifiedBy', v)],
            ] as [string, string, (v: string) => void][]).map(([label, val, setter], i) => (
              <div key={label} className={`p-3 ${i === 0 ? 'border-r border-gray-300' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
                  {i === 0 ? (
                    <button
                      type="button"
                      className="no-print text-[10px] font-semibold tracking-normal px-2 py-0.5 rounded border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
                      onClick={() => setAuthorizedSealAttachedAt(new Date().toISOString())}
                    >
                      Attach seal / sign
                    </button>
                  ) : null}
                </div>

                <div className="h-[72px] flex items-end justify-end gap-2 mb-2">
                  {i === 0 && authorizedSealAttachedAt ? (
                    <>
                      <img src={authorizedSealUrl} alt="Seal" className="h-16 w-16 object-contain" />
                      <img
                        src={signatureSvgDataUri(authorizedSignatureText)}
                        alt="Digital signature"
                        className="h-11 w-auto max-w-[320px] object-contain"
                      />
                    </>
                  ) : null}
                </div>

                <div className="border-t border-gray-400 pt-1">
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
    ) : p === 2 ? (
      <div className="max-w-4xl mx-auto">
        {/* ── LETTERHEAD (same as Page 1) ── */}
        <div className="border-b-2 border-gray-800 pb-3 mb-0">
          <div className="flex items-start gap-3">
            <img
              src={logoUrl}
              alt="3F Logo"
              width={64}
              height={64}
              className="shrink-0"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: 4,
                backgroundColor: '#fff',
              }}
            />

            <div className="flex-1">
              <div className="text-[17px] font-black tracking-wide text-gray-900 uppercase leading-tight">{DUMMY_COMPANY.name}</div>
              <div className="mt-1 text-[11px] text-gray-600 leading-4">
                <div>{DUMMY_COMPANY.line1}</div>
                <div>{DUMMY_COMPANY.line2}</div>
                <div className="font-semibold text-gray-700 mt-0.5">{DUMMY_COMPANY.gst}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── PO TITLE BAR (same as Page 1) ── */}
        <div className="bg-gray-800 text-white text-center font-extrabold tracking-[0.22em] text-[13px] py-2.5 mb-4">PURCHASE ORDER</div>

        <div className="border border-gray-300">
          <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] px-3 py-1.5">OTHER TERMS &amp; CONDITIONS</div>
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
                  </div>

                  <textarea
                    value={p2.taxAutoCalcEnabled ? taxesAutoText : p2.taxes}
                    onChange={(e) => setP2Field(p2.taxAutoCalcEnabled ? 'taxes' : 'taxes', e.target.value as any)}
                    className="w-full min-h-[46px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter taxes terms..."
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
                    className="w-full min-h-[86px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter delivery timelines..."
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
                    className="w-full min-h-[92px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter documents / approvals requirements..."
                  />
                </td>
              </tr>

              <tr className="bg-white">
                <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">7)</td>
                <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Payment Terms</td>
                <td className="px-3 py-1.5 border-t border-gray-300">
                  <textarea
                    value={p2.paymentAutoEnabled ? paymentAutoText : p2.paymentTerms}
                    onChange={(e) => setP2Field('paymentTerms', e.target.value as any)}
                    className="w-full min-h-[120px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter payment terms..."
                  />
                </td>
              </tr>

              <tr className="bg-white">
                <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">8)</td>
                <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Installation Support</td>
                <td className="px-3 py-1.5 border-t border-gray-300">
                  <textarea
                    value={p2.installationSupport}
                    onChange={(e) => setP2Field('installationSupport', e.target.value)}
                    className="w-full min-h-[52px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter installation / support terms..."
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
                    className="w-full min-h-[60px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter inspection terms..."
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
                    className="w-full min-h-[66px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter warranty / guarantee terms..."
                  />
                </td>
              </tr>

              <tr className="bg-white">
                <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">11)</td>
                <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">LD / Penalty</td>
                <td className="px-3 py-1.5 border-t border-gray-300">
                  <textarea
                    value={p2.ldAutoEnabled ? ldAutoText : p2.ldPenalty}
                    onChange={(e) => setP2Field('ldPenalty', e.target.value as any)}
                    className="w-full min-h-[86px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter LD / penalty terms..."
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
                    className="w-full min-h-[66px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 placeholder:text-gray-400"
                    placeholder="Enter remarks..."
                  />
                </td>
              </tr>

              <tr className="bg-white">
                <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">13)</td>
                <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Site &amp; Billing Address</td>
                <td className="px-3 py-1.5 border-t border-gray-300">
                  <textarea
                    value={p2.siteBillingAddress}
                    onChange={(e) => setP2Field('siteBillingAddress', e.target.value)}
                    className="w-full min-h-[180px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 whitespace-pre-wrap placeholder:text-gray-400"
                    placeholder="Enter site & billing address..."
                  />
                </td>
              </tr>

              <tr className="bg-white">
                <td className="px-3 py-1.5 text-center border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">14)</td>
                <td className="px-3 py-1.5 border-r border-t border-gray-300 font-semibold bg-gray-100 text-gray-600">Documents Required</td>
                <td className="px-3 py-1.5 border-t border-gray-300">
                  <textarea
                    value={p2.documentsRequired}
                    onChange={(e) => setP2Field('documentsRequired', e.target.value)}
                    className="w-full min-h-[92px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-transparent border-none p-0 whitespace-pre-wrap placeholder:text-gray-400"
                    placeholder="Enter documents required..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div className="max-w-4xl mx-auto">
        <div className="border-b-2 border-gray-800 pb-3 mb-0">
          <div className="flex items-start gap-3">
            <img
              src={logoUrl}
              alt="3F Logo"
              width={64}
              height={64}
              className="shrink-0"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: 4,
                backgroundColor: '#fff',
              }}
            />
            <div className="flex-1">
              <div className="text-[17px] font-black tracking-wide text-gray-900 uppercase leading-tight">{DUMMY_COMPANY.name}</div>
              <div className="mt-1 text-[11px] text-gray-600 leading-4">
                <div>{DUMMY_COMPANY.line1}</div>
                <div>{DUMMY_COMPANY.line2}</div>
                <div className="font-semibold text-gray-700 mt-0.5">{DUMMY_COMPANY.gst}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 text-white text-center font-extrabold tracking-[0.22em] text-[13px] py-2.5 mb-4">PURCHASE ORDER</div>

        <div className="border border-gray-300">
          <div className="bg-gray-800 text-white font-bold tracking-widest text-[10px] px-3 py-1.5">ANNEXURE 2</div>
          <div className="p-3">
            <Input
              value={p3.annexureTitle}
              onChange={(e) => setP3Field('annexureTitle', e.target.value)}
              className="h-8 text-[11px] rounded-none border border-gray-200 bg-white shadow-none focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 px-2 py-0 font-semibold"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <textarea
                value={p3.leftColumn}
                onChange={(e) => setP3Field('leftColumn', e.target.value)}
                className="w-full min-h-[520px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-white border border-gray-200 rounded-none px-2 py-1 focus:ring-1 focus:ring-gray-400 whitespace-pre-wrap"
                placeholder="Paste Annexure 2 content (left column)…"
              />
              <textarea
                value={p3.rightColumn}
                onChange={(e) => setP3Field('rightColumn', e.target.value)}
                className="w-full min-h-[520px] text-[11px] text-gray-900 outline-none resize-none leading-5 bg-white border border-gray-200 rounded-none px-2 py-1 focus:ring-1 focus:ring-gray-400 whitespace-pre-wrap"
                placeholder="Paste Annexure 2 content (right column)…"
              />
            </div>
          </div>
        </div>
      </div>
    );

  const pageContent = renderPageContent(page);

  if (variant === 'inline') {
    return (
      <div className={inlineSimulatePrint ? 'fc-po-inline-preview' : undefined}>
        {inlineSimulatePrint ? (
          <style>
            {`
              .fc-po-inline-preview .no-print { display: none !important; }
              .fc-po-inline-preview .print-only.hidden { display: block !important; }
              .fc-po-inline-preview .fc-po-preview-page { margin: 0 0 24px 0; }
              .fc-po-inline-preview .fc-po-preview-page:last-child { margin-bottom: 0; }
            `}
          </style>
        ) : null}

        <div className="pointer-events-none">
          <div className="fc-po-preview-page">{renderPageContent(1)}</div>
          <div className="fc-po-preview-page">{renderPageContent(2)}</div>
          <div className="fc-po-preview-page">{renderPageContent(3)}</div>
        </div>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30 rounded-t-xl shrink-0">
          <div className="font-semibold text-sm">Make PO (Purchase Order)</div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span>/3
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={handleDownloadPdf}
              disabled={printing}
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={() => void handlePrint()}
              disabled={printing}
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-8 bg-white text-black" ref={printRef}>
          {pageContent}
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
            <Button variant="outline" onClick={onClose} disabled={printing || savingPo}>
              Cancel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveDraft()}
              disabled={printing || savingPo || !resolvedVendorId || draftStatus === 'saving'}
              className="gap-1.5"
            >
              <FileText className="w-4 h-4" />
              {draftStatus === 'saving' ? 'Saving…' : draftStatus === 'saved' ? 'Saved' : 'Save Draft'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setPage((p) => (p === 1 ? 1 : ((p - 1) as any)))}
              disabled={printing || savingPo || page === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>

            {page < 3 ? (
              <Button
                type="button"
                onClick={() => setPage((p) => (p === 3 ? 3 : ((p + 1) as any)))}
                disabled={printing || savingPo}
                className="gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => void handleConfirm()} disabled={printing || savingPo || !resolvedVendorId}>
                {savingPo ? 'Confirming…' : 'Confirm PO'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
