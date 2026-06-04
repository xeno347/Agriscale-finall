import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBaseUrl } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type QuoteVendor = {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  directoryVendorId?: string;
};

type SprItem = {
  id: string;
  srNo: number;
  serviceDescription: string;
  qty: number;
  uom: string;
  startDate: string;
  duration: string;
  servicesFrom: string;
  gstPercent?: number;
};

type VendorQuote = {
  vendorId: string;
  unitRateByItemId: Record<string, number>;
};

type SprComparative = {
  indentId: string;
  title: string;
  vendors: QuoteVendor[];
  items: SprItem[];
  quotes: VendorQuote[];
  isDraft?: boolean;
  technicalRecommendationVendorId?: string;
  lastSavedAt?: string;
  lastSavedSource?: 'server' | 'local';
  paymentTerms?: Record<string, string>;
  deliveryTimeline?: Record<string, string>;
  priceBasis?: Record<string, string>;
  warranty?: Record<string, string>;
  vendorStatus?: Record<string, string>;
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
};

type DirectoryVendor = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const SPR_KEY = 'farmconnect.sprComparative.v1';
const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getApiBaseUrl = () => String(getBaseUrl() ?? '').replace(/\/$/, '');
const safeTrim = (v: unknown) => String(v ?? '').trim();
const toIsoNow = () => new Date().toISOString();

const inr = (n: number) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch { return `₹${Math.round(n)}`; }
};

const stableItemId = (name: string, idx: number) => {
  const safe = safeTrim(name).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `spr-${idx + 1}-${safe || 'x'}`;
};

const readAll = (): Record<string, SprComparative> => {
  try {
    const raw = window.localStorage.getItem(SPR_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
};

const writeAll = (all: Record<string, SprComparative>) => {
  try { window.localStorage.setItem(SPR_KEY, JSON.stringify(all)); } catch {}
};

// ─────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────

const fetchComparativeDraft = async (prNumber: string) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('API base URL is not set');
  const res = await fetch(`${baseUrl}/purchase_flow/get_comparative_statement_draft`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ pr_number: prNumber }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: any = await res.json().catch(() => null);
  const items = Array.isArray(data?.items) ? data.items : [];
  return items[0] ?? null;
};

// Fetch SPR items from the indent API — always the source of truth for service fields
const fetchSprItemsFromIndent = async (prNumber: string): Promise<SprItem[]> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return [];
  const res = await fetch(`${baseUrl}/purchase_flow/get_indents`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data: any = await res.json().catch(() => null);
  const indents: any[] = Array.isArray(data?.indents) ? data.indents : [];
  const indent = indents.find((r: any) => safeTrim(r?.pr_number) === prNumber);
  if (!indent) return [];
  const itemRows: any[] = Array.isArray(indent.indent_data?.item_row) ? indent.indent_data.item_row : [];
  return itemRows.map((it: any, idx: number) => ({
    id: stableItemId(safeTrim(it?.service_description), idx),
    srNo: it?.sr_no ?? idx + 1,
    serviceDescription: safeTrim(it?.service_description) || `Service ${idx + 1}`,
    qty: Number(it?.quantity ?? 0) || 0,
    uom: safeTrim(it?.uom) || '',
    startDate: safeTrim(it?.start_date_of_contract) || '',
    duration: safeTrim(it?.duration_of_contract) || '',
    servicesFrom: safeTrim(it?.services_required_from) || '',
    gstPercent: Number(it?.gst_percentage ?? 0) || 0,
  }));
};

const fetchVendorsForDropdown = async (): Promise<DirectoryVendor[]> => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return [];
  const doFetch = (method: 'GET' | 'POST') =>
    fetch(`${baseUrl}/purchase_flow/get_vendors`, { method, headers: { Accept: 'application/json' } });
  let res = await doFetch('GET');
  if (res.status === 405) res = await doFetch('POST');
  if (!res.ok) return [];
  const data: any = await res.json().catch(() => null);
  const list: any[] = Array.isArray(data?.vendors) ? data.vendors : [];
  return list
    .map((v) => ({ id: safeTrim(v?.vendor_id), name: safeTrim(v?.vendor_name), phone: safeTrim(v?.vendor_contact) || undefined, address: safeTrim(v?.vendor_address) || undefined }))
    .filter((v) => v.id && v.name);
};

// ─────────────────────────────────────────────────────────────
// AUTO-GROW TEXTAREA
// ─────────────────────────────────────────────────────────────

function AutoGrowTextarea({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea ref={ref} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className={className ?? 'w-full resize-none overflow-hidden bg-transparent outline-none text-[12px] leading-[1.25]'} rows={1} />
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function SprQuotationComparative() {
  const { indentId } = useParams<{ indentId: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<SprComparative | null>(null);
  const [openRecommendation, setOpenRecommendation] = useState(false);
  const [recommendationVendorId, setRecommendationVendorId] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);
  const [directoryVendors, setDirectoryVendors] = useState<DirectoryVendor[]>([]);

  const normalizedIndentId = useMemo(() => {
    if (!indentId) return '';
    try { return decodeURIComponent(indentId); } catch { return indentId; }
  }, [indentId]);

  // Load vendor directory
  useEffect(() => {
    void fetchVendorsForDropdown().then((list) => { if (list.length) setDirectoryVendors(list); }).catch(() => {});
  }, []);

  // Load model
  useEffect(() => {
    if (!normalizedIndentId) return;
    let cancelled = false;
    const load = async () => {
      // Always fetch items from indent API for accurate SPR fields
      let indentItems: SprItem[] = [];
      try { indentItems = await fetchSprItemsFromIndent(normalizedIndentId); } catch {}
      if (cancelled) return;

      // Try to get vendor/quote data from comparative draft
      try {
        const draft = await fetchComparativeDraft(normalizedIndentId);
        if (cancelled) return;
        if (draft) {
          const createdAt = safeTrim(draft?.created_at);
          const quoters: any[] = Array.isArray(draft?.quoters) ? draft.quoters : [];

          const vendors: QuoteVendor[] = quoters.map((q) => safeTrim(q?.vendor_id)).filter(Boolean)
            .map((vid) => ({ id: vid, directoryVendorId: vid, name: vid }));

          const paymentTerms: Record<string, string> = {};
          const deliveryTimeline: Record<string, string> = {};
          const warranty: Record<string, string> = {};
          const priceBasis: Record<string, string> = {};
          const freightCharges: Record<string, number> = {};
          const otherCharges: Record<string, number> = {};

          const quotes: VendorQuote[] = quoters
            .map((q) => ({ q, vendorId: safeTrim(q?.vendor_id) }))
            .filter((x) => Boolean(x.vendorId))
            .map(({ q, vendorId }) => {
              const unitRateByItemId: Record<string, number> = {};
              const costing = q?.item_costing && typeof q.item_costing === 'object' ? q.item_costing : {};
              for (const it of indentItems) {
                const row = (costing as any)?.[it.serviceDescription];
                const perUnit = Number((row as any)?.per_unit_costing ?? 0);
                unitRateByItemId[it.id] = Number.isFinite(perUnit) ? perUnit : 0;
              }
              freightCharges[vendorId] = Number(q?.freight_charges ?? 0) || 0;
              otherCharges[vendorId] = Number(q?.other_charges ?? 0) || 0;
              const pt = safeTrim(q?.payment_terms); const dt = safeTrim(q?.delivery_time);
              const wg = safeTrim(q?.warrenty_garantee); const pb = safeTrim(q?.price_basis);
              if (pt) paymentTerms[vendorId] = pt;
              if (dt) deliveryTimeline[vendorId] = dt;
              if (wg) warranty[vendorId] = wg;
              if (pb) priceBasis[vendorId] = pb;
              return { vendorId, unitRateByItemId };
            });

          setModel({
            indentId: normalizedIndentId,
            title: 'Service Comparative Statement',
            vendors,
            items: indentItems,
            quotes,
            freightCharges,
            otherCharges,
            paymentTerms,
            deliveryTimeline,
            warranty,
            priceBasis,
            lastSavedAt: createdAt || undefined,
            lastSavedSource: createdAt ? 'server' : undefined,
          });
          return;
        }
      } catch {}
      if (cancelled) return;

      // Local draft fallback — but always override items with indent API data
      const all = readAll();
      if (all[normalizedIndentId]) {
        setModel({ ...all[normalizedIndentId], items: indentItems.length ? indentItems : (all[normalizedIndentId].items ?? []) });
        return;
      }

      // Fresh start: items from indent, NO vendors (user adds manually)
      setModel({
        indentId: normalizedIndentId,
        title: 'Service Comparative Statement',
        vendors: [],
        items: indentItems,
        quotes: [],
        freightCharges: {},
        otherCharges: {},
      });
    };
    void load();
    return () => { cancelled = true; };
  }, [normalizedIndentId]);

  // Hydrate vendor names from directory after directory loads
  useEffect(() => {
    if (!directoryVendors.length) return;
    setModel((p) => {
      if (!p) return p;
      let changed = false;
      const nextVendors = p.vendors.map((v) => {
        if (!v.directoryVendorId) return v;
        const dv = directoryVendors.find((x) => x.id === v.directoryVendorId);
        if (!dv) return v;
        const next = { ...v, name: dv.name || v.name, phone: dv.phone || v.phone, location: dv.address || v.location };
        if (next.name !== v.name || next.phone !== v.phone || next.location !== v.location) changed = true;
        return next;
      });
      return changed ? { ...p, vendors: nextVendors } : p;
    });
  }, [directoryVendors]);

  // ─── Computed totals ──────────────────────────────────────
  const vendorOrder = model?.vendors ?? [];

  const vendorSelectedById = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const v of vendorOrder) out[v.id] = Boolean(v.directoryVendorId);
    return out;
  }, [vendorOrder]);

  const baseByVendor = useMemo(() => {
    if (!model) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      const q = model.quotes.find((x) => x.vendorId === v.id);
      out[v.id] = (model.items || []).reduce((s, it) => s + (q?.unitRateByItemId?.[it.id] ?? 0) * it.qty, 0);
    }
    return out;
  }, [model, vendorOrder]);

  const gstByVendor = useMemo(() => {
    if (!model) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      const q = model.quotes.find((x) => x.vendorId === v.id);
      out[v.id] = (model.items || []).reduce((s, it) => {
        const amt = (q?.unitRateByItemId?.[it.id] ?? 0) * it.qty;
        return s + amt * ((Number(it.gstPercent ?? 0)) / 100);
      }, 0);
    }
    return out;
  }, [model, vendorOrder]);

  const freightByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = Number((model as any)?.freightCharges?.[v.id] ?? 0) || 0;
    return out;
  }, [vendorOrder, model]);

  const otherByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = Number((model as any)?.otherCharges?.[v.id] ?? 0) || 0;
    return out;
  }, [vendorOrder, model]);

  const subtotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = (baseByVendor[v.id] || 0) + (freightByVendor[v.id] || 0) + (otherByVendor[v.id] || 0);
    return out;
  }, [vendorOrder, baseByVendor, freightByVendor, otherByVendor]);

  const grandTotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = (subtotalByVendor[v.id] || 0) + (gstByVendor[v.id] || 0);
    return out;
  }, [vendorOrder, subtotalByVendor, gstByVendor]);

  const vendorLTagByVendorId = useMemo(() => {
    const rankable = vendorOrder.map((v) => ({ id: v.id, total: Number(grandTotalByVendor[v.id] ?? 0) || 0 })).filter((x) => x.total > 0);
    if (!rankable.length) return {} as Record<string, string>;
    rankable.sort((a, b) => a.total - b.total);
    const out: Record<string, string> = {};
    rankable.forEach((x, i) => { out[x.id] = `L${i + 1}`; });
    return out;
  }, [vendorOrder, grandTotalByVendor]);

  const eligibleRecommendationVendors = useMemo(() =>
    vendorOrder.filter((v) => Boolean(v.directoryVendorId)).map((v) => ({
      vendorId: v.id,
      vendorDirectoryId: String(v.directoryVendorId || '').trim(),
      name: v.name,
      total: Number(grandTotalByVendor[v.id] ?? 0) || 0,
      status: String(vendorLTagByVendorId[v.id] || '').trim(),
    })).filter((x) => x.vendorId),
    [vendorOrder, grandTotalByVendor, vendorLTagByVendorId]);

  // ─── Mutators ─────────────────────────────────────────────
  const setVendorRate = (vendorId: string, itemId: string, val: string) => {
    const rate = Number(val);
    setModel((prev) => {
      if (!prev) return prev;
      const quotes = [...prev.quotes];
      const idx = quotes.findIndex((q) => q.vendorId === vendorId);
      if (idx === -1) quotes.push({ vendorId, unitRateByItemId: { [itemId]: Number.isFinite(rate) ? rate : 0 } });
      else quotes[idx] = { ...quotes[idx], unitRateByItemId: { ...quotes[idx].unitRateByItemId, [itemId]: Number.isFinite(rate) ? rate : 0 } };
      return { ...prev, quotes };
    });
  };

  const addVendor = () => setModel((p) => p ? { ...p, vendors: [...p.vendors, { id: genId(), name: `Vendor ${p.vendors.length + 1}` }] } : p);
  const removeVendor = (id: string) => setModel((p) => p ? { ...p, vendors: p.vendors.filter((v) => v.id !== id), quotes: p.quotes.filter((q) => q.vendorId !== id) } : p);

  const updateVendorFromDirectory = (vendorId: string, directoryVendorId: string) => {
    const selected = directoryVendors.find((x) => x.id === directoryVendorId);
    if (!selected) return;
    setModel((p) => p ? { ...p, vendors: p.vendors.map((v) => v.id === vendorId ? { ...v, directoryVendorId, name: selected.name, phone: selected.phone || v.phone, location: selected.address || v.location } : v) } : p);
  };

  const setMeta = (key: 'paymentTerms' | 'deliveryTimeline' | 'priceBasis' | 'warranty' | 'vendorStatus', vendorId: string, value: string) =>
    setModel((p) => p ? { ...p, [key]: { ...(p as any)[key], [vendorId]: value } } as SprComparative : p);

  const setCharge = (key: 'freightCharges' | 'otherCharges', vendorId: string, value: string) => {
    const num = Number(value);
    setModel((p) => {
      if (!p) return p;
      return { ...p, [key]: { ...((p as any)[key] || {}), [vendorId]: Number.isFinite(num) ? num : 0 } } as SprComparative;
    });
  };

  const persist = (next: SprComparative) => {
    if (!normalizedIndentId) return;
    const all = readAll();
    all[normalizedIndentId] = next;
    writeAll(all);
  };

  // ─── Save payload ──────────────────────────────────────────
  const buildPayload = (m: SprComparative) => ({
    pr_number: String(normalizedIndentId || m.indentId || '').trim(),
    indent_type: 'SPR',
    item_row: (m.items || []).map((it) => ({
      item_name: it.serviceDescription,
      quantity: it.qty,
      UoM: it.uom,
      gst_percentage: Number(it.gstPercent ?? 0) || 0,
    })),
    quoters: (m.vendors || []).map((v) => {
      const vendor_id = String(v.directoryVendorId ?? '').trim();
      if (!vendor_id) return null;
      const q = (m.quotes || []).find((x) => x.vendorId === v.id);
      const item_costing: Record<string, { per_unit_costing: number; quanity: number; final_costing: number }> = {};
      for (const it of m.items || []) {
        const unit = Number(q?.unitRateByItemId?.[it.id] ?? 0) || 0;
        item_costing[it.serviceDescription] = { per_unit_costing: unit, quanity: it.qty, final_costing: unit * it.qty };
      }
      return {
        vendor_id, item_costing,
        freight_charges: freightByVendor[v.id] || 0,
        other_charges: otherByVendor[v.id] || 0,
        subtotal: subtotalByVendor[v.id] || 0,
        total_amount: grandTotalByVendor[v.id] || 0,
        payment_terms: String((m.paymentTerms as any)?.[v.id] ?? '').trim() || null,
        delivery_time: String((m.deliveryTimeline as any)?.[v.id] ?? '').trim() || null,
        warrenty_garantee: String((m.warranty as any)?.[v.id] ?? '').trim() || null,
        price_basis: String((m.priceBasis as any)?.[v.id] ?? '').trim() || null,
      };
    }).filter(Boolean),
  });

  const saveDraftToApi = async (payload: any) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/purchase_flow/save_comparative_statement_draft`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json().catch(() => null);
  };

  const saveFinalToApi = async (payload: any) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/purchase_flow/save_comparative_statement`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json().catch(() => null);
  };

  const saveDraft = async () => {
    if (!model || savingDraft) return;
    if (!model.items.length) { toast.error('No service items found'); return; }
    const snapshot = { ...model, isDraft: true, lastSavedAt: toIsoNow(), lastSavedSource: 'local' as const };
    persist(snapshot);
    setModel(snapshot);
    setSavingDraft(true);
    try {
      const apiRes: any = await saveDraftToApi(buildPayload(snapshot));
      const serverSavedAt = safeTrim(apiRes?.created_at || apiRes?.updated_at);
      setModel((p) => p ? { ...p, lastSavedAt: serverSavedAt || p.lastSavedAt || toIsoNow(), lastSavedSource: serverSavedAt ? 'server' : (p.lastSavedSource || 'local') } : p);
      toast.success('Draft saved');
    } catch (e: any) {
      toast.error(`Draft saved locally, server save failed${e?.message ? `: ${e.message}` : ''}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const askRecommendationAndSave = () => {
    if (!model) return;
    if (!model.items.length) { toast.error('No service items found'); return; }
    const alreadyChosen = String(model.technicalRecommendationVendorId || '').trim();
    const alreadyChosenInternal = alreadyChosen ? vendorOrder.find((v) => String(v.directoryVendorId || '').trim() === alreadyChosen)?.id : '';
    setRecommendationVendorId(alreadyChosenInternal || eligibleRecommendationVendors[0]?.vendorId || '');
    setOpenRecommendation(true);
  };

  const confirmRecommendationAndSave = () => {
    if (!model || savingFinal) return;
    const chosenInternal = String(recommendationVendorId || '').trim();
    if (!chosenInternal) { toast.error('Select a vendor'); return; }
    const chosenDirectory = String(model.vendors.find((v) => v.id === chosenInternal)?.directoryVendorId || chosenInternal).trim();
    if (!chosenDirectory) { toast.error('Selected vendor missing Vendor ID'); return; }
    const nextModel = { ...model, isDraft: false, technicalRecommendationVendorId: chosenDirectory, lastSavedAt: toIsoNow(), lastSavedSource: 'local' as const };
    persist(nextModel);
    setSavingFinal(true);
    void saveFinalToApi({ ...buildPayload(nextModel), technical_recommendation: chosenDirectory })
      .then(() => { toast.success('Quotation saved'); setOpenRecommendation(false); navigate('/work-order'); })
      .catch((e: any) => { toast.error(`Saved locally, server save failed${e?.message ? `: ${e.message}` : ''}`); setOpenRecommendation(false); })
      .finally(() => setSavingFinal(false));
  };

  const getDirectoryVendorById = (id?: string) => id ? directoryVendors.find((x) => x.id === id) : undefined;

  if (!indentId) return <div className="p-6">Invalid indent.</div>;
  if (!model) return <div className="p-6">Loading…</div>;

  const FIXED_COLS = 8; // Sr | Service | Qty | UoM | Start Date | Duration | OEM/Prop | GST%

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/work-order')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <div className="text-lg font-bold">SPR Quotation</div>
            <div className="text-xs text-muted-foreground">Indent: {normalizedIndentId}</div>
            {model.lastSavedAt && (
              <div className="text-[11px] text-muted-foreground">
                Last saved: <span className="font-medium text-foreground/80">{new Date(model.lastSavedAt).toLocaleString()}</span>
                {model.lastSavedSource && <span className="text-muted-foreground"> ({model.lastSavedSource})</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={addVendor} disabled={savingDraft || savingFinal}>
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
          <Button variant="outline" className="gap-2" onClick={saveDraft}
            disabled={savingDraft || savingFinal || !model.items.length}>
            {savingDraft ? 'Saving draft…' : 'Save as draft'}
          </Button>
          <Button className="gap-2" onClick={askRecommendationAndSave} disabled={savingDraft || savingFinal}>
            <Save className="w-4 h-4" /> {savingFinal ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Technical recommendation dialog */}
      <Dialog open={openRecommendation} onOpenChange={setOpenRecommendation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Technical Recommendation</DialogTitle>
            <DialogDescription>Select one vendor as the recommendation.</DialogDescription>
          </DialogHeader>
          {eligibleRecommendationVendors.length === 0 ? (
            <div className="text-sm text-muted-foreground">No vendors available. Add and select a vendor first.</div>
          ) : (
            <RadioGroup value={recommendationVendorId} onValueChange={setRecommendationVendorId}>
              {eligibleRecommendationVendors.map((v) => (
                <label key={v.vendorId} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <RadioGroupItem value={v.vendorId} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">Vendor ID: <span className="font-mono text-foreground">{v.vendorDirectoryId || '—'}</span></div>
                    <div className="text-sm font-medium truncate">{v.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Total: <span className="text-foreground">{v.total ? inr(v.total) : '—'}</span> · Status: <span className="font-medium text-foreground">{v.status || '-'}</span>
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRecommendation(false)}>Cancel</Button>
            <Button onClick={confirmRecommendationAndSave} disabled={!eligibleRecommendationVendors.length || !recommendationVendorId || savingFinal}>
              {savingFinal ? 'Saving…' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparative table */}
      <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-max min-w-[1000px] border-collapse text-[12px] table-fixed">
          <colgroup>
            <col style={{ width: 50 }} />   {/* Sr */}
            <col style={{ width: 260 }} />  {/* Service Description */}
            <col style={{ width: 65 }} />   {/* Qty */}
            <col style={{ width: 65 }} />   {/* UoM */}
            <col style={{ width: 95 }} />   {/* Start Date */}
            <col style={{ width: 100 }} />  {/* Duration */}
            <col style={{ width: 85 }} />   {/* OEM/Prop */}
            <col style={{ width: 70 }} />   {/* GST% */}
            {vendorOrder.map((v) => (
              <Fragment key={`${v.id}-cols`}>
                <col style={{ width: 140 }} />
                <col style={{ width: 140 }} />
              </Fragment>
            ))}
          </colgroup>

          <thead>
            {/* Vendor header row */}
            <tr>
              <th className="border border-border bg-primary/10 text-center px-2 py-2" colSpan={FIXED_COLS}>
                <div className="space-y-1">
                  <Input
                    value={model.title || ''}
                    onChange={(e) => setModel((p) => p ? { ...p, title: e.target.value } : p)}
                    className="h-8 bg-background font-semibold text-center"
                    placeholder="Service Comparative Statement"
                  />
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <span>Indent:</span>
                    <span className="font-medium text-foreground">{normalizedIndentId}</span>
                  </div>
                </div>
              </th>
              {vendorOrder.map((v) => {
                const selectedDirVendor = getDirectoryVendorById(v.directoryVendorId);
                const isSelected = Boolean(v.directoryVendorId);
                return (
                  <th key={v.id} className="border border-border bg-secondary/40 px-2 py-2" colSpan={2}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {v.directoryVendorId && (
                          <div className="text-[10px] text-muted-foreground mb-1">
                            Vendor ID: <span className="font-mono text-foreground">{v.directoryVendorId}</span>
                          </div>
                        )}
                        <div className="text-[12px] font-semibold whitespace-normal break-words leading-snug">
                          {selectedDirVendor?.name || (v.name?.trim() ? v.name : 'Select vendor')}
                        </div>
                        <div className="mt-1">
                          <select value={v.directoryVendorId ?? ''} onChange={(e) => updateVendorFromDirectory(v.id, e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring">
                            {directoryVendors.length === 0
                              ? <option value="" disabled>Loading vendors...</option>
                              : <option value="" disabled>Select vendor</option>}
                            {directoryVendors.map((dv) => <option key={dv.id} value={dv.id}>{dv.name}</option>)}
                          </select>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1">
                          <Input value={v.location || ''} onChange={(e) => setModel((p) => p ? { ...p, vendors: p.vendors.map((x) => x.id === v.id ? { ...x, location: e.target.value } : x) } : p)}
                            className="h-7 bg-background text-[11px]" placeholder="Address / location" disabled={!isSelected} />
                          <Input value={v.phone || ''} onChange={(e) => setModel((p) => p ? { ...p, vendors: p.vendors.map((x) => x.id === v.id ? { ...x, phone: e.target.value } : x) } : p)}
                            className="h-7 bg-background text-[11px]" placeholder="Phone" disabled={!isSelected} />
                        </div>
                      </div>
                      <button type="button" className="text-muted-foreground hover:text-destructive mt-1" onClick={() => removeVendor(v.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Column headers */}
            <tr className="bg-muted/40">
              <th className="border border-border px-2 py-1">Sr.</th>
              <th className="border border-border px-2 py-1 text-left">Service Description</th>
              <th className="border border-border px-2 py-1">Qty</th>
              <th className="border border-border px-2 py-1">UoM</th>
              <th className="border border-border px-2 py-1">Start Date</th>
              <th className="border border-border px-2 py-1">Duration</th>
              <th className="border border-border px-2 py-1">OEM / Prop</th>
              <th className="border border-border px-2 py-1">GST %</th>
              {vendorOrder.map((v) => (
                <Fragment key={`${v.id}-headcols`}>
                  <th className="border border-border bg-info/10 px-2 py-1">Unit Rate</th>
                  <th className="border border-border bg-info/10 px-2 py-1">Amount</th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Items */}
            {model.items.length === 0 ? (
              <tr>
                <td className="border border-border px-2 py-8 text-center text-muted-foreground" colSpan={FIXED_COLS + vendorOrder.length * 2}>
                  No service items found for this SPR.
                </td>
              </tr>
            ) : (
              model.items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="border border-border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-border px-2 py-1">{it.serviceDescription}</td>
                  <td className="border border-border px-2 py-1 text-center">{it.qty}</td>
                  <td className="border border-border px-2 py-1 text-center">{it.uom || '—'}</td>
                  <td className="border border-border px-2 py-1 text-center">{it.startDate || '—'}</td>
                  <td className="border border-border px-2 py-1 text-center">{it.duration || '—'}</td>
                  <td className="border border-border px-2 py-1 text-center">{it.servicesFrom || '—'}</td>
                  <td className="border border-border px-2 py-1">
                    <Input
                      className="h-7 w-full bg-background text-right"
                      value={String(Number.isFinite(it.gstPercent as any) ? it.gstPercent : '')}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = Number(raw);
                        setModel((p) => {
                          if (!p) return p;
                          return { ...p, items: p.items.map((x) => x.id === it.id ? { ...x, gstPercent: raw.trim() === '' ? undefined : Number.isFinite(num) ? num : x.gstPercent } : x) };
                        });
                      }}
                      placeholder="0"
                    />
                  </td>
                  {vendorOrder.map((v) => {
                    const q = model.quotes.find((x) => x.vendorId === v.id);
                    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
                    const amt = unit * it.qty;
                    const locked = !vendorSelectedById[v.id];
                    return (
                      <Fragment key={`${it.id}-${v.id}`}>
                        <td className="border border-border px-2 py-1">
                          <Input className="h-8" value={String(unit || '')} onChange={(e) => setVendorRate(v.id, it.id, e.target.value)} placeholder="0" disabled={locked} />
                        </td>
                        <td className="border border-border px-2 py-1 text-right">{amt ? inr(amt) : ''}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))
            )}

            {/* Summary rows */}
            {vendorOrder.length > 0 && (
              <>
                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-2" colSpan={FIXED_COLS}>Base Amount</td>
                  {vendorOrder.map((v) => (
                    <Fragment key={`${v.id}-base`}>
                      <td className="border border-border px-2 py-2"></td>
                      <td className="border border-border px-2 py-2 text-right">{baseByVendor[v.id] ? inr(baseByVendor[v.id]) : ''}</td>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={FIXED_COLS}>GST</td>
                  {vendorOrder.map((v) => (
                    <Fragment key={`${v.id}-gst`}>
                      <td className="border border-border px-2 py-1"></td>
                      <td className="border border-border px-2 py-1 text-right">{gstByVendor[v.id] ? inr(gstByVendor[v.id]) : ''}</td>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={FIXED_COLS}>Freight Charges</td>
                  {vendorOrder.map((v) => (
                    <td key={`${v.id}-freight`} className="border border-border px-2 py-1" colSpan={2}>
                      <Input className="h-8 w-full" value={String(freightByVendor[v.id] || '')} onChange={(e) => setCharge('freightCharges', v.id, e.target.value)} placeholder="0" disabled={!vendorSelectedById[v.id]} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={FIXED_COLS}>Other Charges</td>
                  {vendorOrder.map((v) => (
                    <td key={`${v.id}-other`} className="border border-border px-2 py-1" colSpan={2}>
                      <Input className="h-8 w-full" value={String(otherByVendor[v.id] || '')} onChange={(e) => setCharge('otherCharges', v.id, e.target.value)} placeholder="0" disabled={!vendorSelectedById[v.id]} />
                    </td>
                  ))}
                </tr>
                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-1 text-right" colSpan={FIXED_COLS}>Sub Total</td>
                  {vendorOrder.map((v) => (
                    <td key={`${v.id}-sub`} className="border border-border px-2 py-1 text-right" colSpan={2}>{subtotalByVendor[v.id] ? inr(subtotalByVendor[v.id]) : ''}</td>
                  ))}
                </tr>
                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-1 text-right" colSpan={FIXED_COLS}>Total Amount</td>
                  {vendorOrder.map((v) => (
                    <td key={`${v.id}-gt`} className="border border-border px-2 py-1 text-right" colSpan={2}>{grandTotalByVendor[v.id] ? inr(grandTotalByVendor[v.id]) : ''}</td>
                  ))}
                </tr>
              </>
            )}

            {/* Meta rows */}
            {(['Payment Terms', 'Delivery Timeline', 'Price Basis', 'Warranty/Guarantee', 'Vendor Status'] as const).map((label, i) => {
              const keys = ['paymentTerms', 'deliveryTimeline', 'priceBasis', 'warranty', 'vendorStatus'] as const;
              const key = keys[i];
              return (
                <tr key={key}>
                  <td className="border border-border px-2 py-1 font-semibold align-top" colSpan={FIXED_COLS}>{label}</td>
                  {vendorOrder.map((v) => {
                    const value = key === 'vendorStatus' ? String(vendorLTagByVendorId[v.id] || '') : String((model as any)[key]?.[v.id] ?? '');
                    const locked = !vendorSelectedById[v.id];
                    return (
                      <td key={`${key}-${v.id}`} className="border border-border px-2 py-1 align-top" colSpan={2}>
                        {key === 'vendorStatus' ? (
                          <div className="h-8 flex items-center text-[12px] font-semibold">{value || '-'}</div>
                        ) : (
                          <AutoGrowTextarea value={value} onChange={(t) => { if (!locked) setMeta(key, v.id, t); }} placeholder={locked ? 'Select vendor first' : '-'} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        SPR quotation page. Add vendors using the button above, then enter unit rates per service.
      </div>
    </div>
  );
}
