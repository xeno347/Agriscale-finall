import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ComparativeQuotationApprovalRow } from '@/components/ho-inbox/ComparativeQuotationApprovalRow';
import { type ComparativeModel } from '@/components/purchase/ComparativeStatementPreview';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';

type ApiTcItemRow = {
  item_name?: unknown;
  UoM?: unknown;
  gst_percentage?: unknown;
  quantity?: unknown;
};

type ApiTcQuoter = {
  vendor_id?: unknown;
  item_costing?: unknown;
  freight_charges?: unknown;
  other_charges?: unknown;
  subtotal?: unknown;
  total_amount?: unknown;
  payment_terms?: unknown;
  delivery_time?: unknown;
  warrenty_garantee?: unknown;
};

type ApiTcComparative = {
  created_at?: unknown;
  quoters?: unknown;
  item_row?: unknown;
  technical_recommendation?: unknown;
  status?: unknown;
  pr_number?: unknown;
  comparision_id?: unknown;
};

const HO_OVERRIDES_KEY = 'farmconnect.hoInboxOverrides.v1';

type HoOverrides = Record<
  string,
  {
    hoSelectedVendorId?: string;
    hoForwardedAt?: string;
    tcApprovedVendorId?: string;
    tcApprovedAt?: string;
  }
>;

const readHoOverrides = (): HoOverrides => {
  try {
    const raw = window.localStorage.getItem(HO_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeHoOverrides = (next: HoOverrides) => {
  try {
    window.localStorage.setItem(HO_OVERRIDES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

const safeTrim = (v: unknown) => String(v ?? '').trim();

const numOr0 = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

const stableItemId = (itemName: string, idx: number) => {
  const base = safeTrim(itemName) || 'item';
  const safe = base.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `it-${idx + 1}-${safe || 'x'}`;
};

const mapTcToModel = (x: ApiTcComparative): ComparativeModel | null => {
  const prNumber = safeTrim((x as any)?.pr_number);
  if (!prNumber) return null;

  const comparisonId = safeTrim((x as any)?.comparision_id);

  const rawItems = Array.isArray((x as any)?.item_row) ? ((x as any).item_row as ApiTcItemRow[]) : [];
  const itemIdByName: Record<string, string> = {};
  const items: ComparativeModel['items'] = rawItems
    .map((r, idx) => {
      const name = safeTrim((r as any)?.item_name);
      const id = stableItemId(name || `item-${idx + 1}`, idx);
      if (name) itemIdByName[name.toLowerCase()] = id;
      return {
        id,
        srNo: idx + 1,
        partName: name,
        uom: safeTrim((r as any)?.UoM),
        qty: numOr0((r as any)?.quantity),
        gstPercent: numOr0((r as any)?.gst_percentage),
      };
    })
    .filter((it) => it.id);

  const rawQuoters = Array.isArray((x as any)?.quoters) ? ((x as any).quoters as ApiTcQuoter[]) : [];

  const vendors: NonNullable<ComparativeModel['vendors']> = [];
  const seenVendor: Record<string, true | undefined> = {};
  for (const q of rawQuoters) {
    const vendorId = safeTrim((q as any)?.vendor_id);
    if (!vendorId || seenVendor[vendorId]) continue;
    seenVendor[vendorId] = true;
    vendors.push({ id: vendorId, name: vendorId, directoryVendorId: vendorId });
  }

  const paymentTerms: Record<string, string> = {};
  const deliveryTimeline: Record<string, string> = {};
  const warranty: Record<string, string> = {};
  const freightCharges: Record<string, number> = {};
  const otherCharges: Record<string, number> = {};

  const quotes: NonNullable<ComparativeModel['quotes']> = rawQuoters
    .map((q) => {
      const vendorId = safeTrim((q as any)?.vendor_id);
      if (!vendorId) return null;

      const pt = safeTrim((q as any)?.payment_terms);
      const dt = safeTrim((q as any)?.delivery_time);
      const wg = safeTrim((q as any)?.warrenty_garantee);
      if (pt) paymentTerms[vendorId] = pt;
      if (dt) deliveryTimeline[vendorId] = dt;
      if (wg) warranty[vendorId] = wg;

      freightCharges[vendorId] = numOr0((q as any)?.freight_charges);
      otherCharges[vendorId] = numOr0((q as any)?.other_charges);

      const itemCosting = (q as any)?.item_costing;
      const unitRateByItemId: Record<string, number> = {};
      if (itemCosting && typeof itemCosting === 'object') {
        for (const [itemName, row] of Object.entries(itemCosting as Record<string, any>)) {
          const key = safeTrim(itemName).toLowerCase();
          const mappedId = itemIdByName[key];
          if (!mappedId) continue;
          const unit = numOr0((row as any)?.per_unit_costing);
          if (mappedId) unitRateByItemId[mappedId] = unit;
        }
      }

      return {
        vendorId,
        unitRateByItemId,
      };
    })
    .filter(Boolean) as any;

  const techRec = safeTrim((x as any)?.technical_recommendation);
  const createdAt = safeTrim((x as any)?.created_at);

  const model: ComparativeModel = {
    indentId: prNumber,
    comparisonId: comparisonId || undefined,
    title: 'Price Comparative Statement',
    subTitle: undefined,
    vendors,
    items,
    quotes,
    freightCharges,
    otherCharges,
    paymentTerms,
    deliveryTimeline,
    priceBasis: {},
    warranty,
    vendorStatus: {},
    technicalRecommendationVendorId: techRec || undefined,
    lastSavedAt: createdAt || undefined,
    isDraft: false,
    hoSelectedVendorId: undefined,
    hoForwardedAt: undefined,
    tcApprovedVendorId: undefined,
    tcApprovedAt: undefined,
  };

  return model;
};

export default function HOInbox() {
  const navigate = useNavigate();
  const [all, setAll] = useState<Record<string, ComparativeModel>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    const load = async () => {
      const baseUrl = String(getBaseUrl() ?? '').replace(/\/$/, '');
      if (!baseUrl) return;

      setLoading(true);
      try {
        const url = `${baseUrl}/purchase_flow/get_TC`;
        const doFetch = (method: 'GET' | 'POST') =>
          fetch(url, {
            method,
            headers: {
              Accept: 'application/json',
            },
            signal: ac.signal,
          });

        let res = await doFetch('GET');
        if (res.status === 405) res = await doFetch('POST');

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const data: unknown = await res.json().catch(() => null);
        const list: ApiTcComparative[] = Array.isArray(data) ? (data as ApiTcComparative[]) : [];
        const mapped = list
          .map(mapTcToModel)
          .filter(Boolean) as ComparativeModel[];

        const overrides = readHoOverrides();

        const next: Record<string, ComparativeModel> = {};
        for (const m of mapped) {
          const o = overrides[m.indentId];
          next[m.indentId] = o ? { ...m, ...o } : m;
        }

        if (!cancelled) setAll(next);
      } catch (e: any) {
        if (cancelled) return;
        const msg = safeTrim(e?.message ?? e);
        toast.error(`Failed to load comparatives${msg ? `: ${msg}` : ''}`);
        setAll({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const comparativeRows = useMemo(() => {
    return Object.values(all)
      .filter((x) => x && x.indentId)
      .sort((a, b) => (b.indentId || '').localeCompare(a.indentId || ''));
  }, [all]);

  const inboxRows = useMemo(() => {
    return comparativeRows.map((x) => ({ kind: 'comparative' as const, key: x.indentId, item: x }));
  }, [comparativeRows]);

  const updateComparative = (indentId: string, patch: Partial<ComparativeModel>) => {
    setAll((prev) => {
      const existing = prev[indentId];
      if (!existing) return prev;
      const merged = { ...existing, ...patch };
      const overrides = readHoOverrides();
      overrides[indentId] = {
        ...overrides[indentId],
        hoSelectedVendorId: merged.hoSelectedVendorId,
        hoForwardedAt: merged.hoForwardedAt,
        tcApprovedVendorId: merged.tcApprovedVendorId,
        tcApprovedAt: merged.tcApprovedAt,
      };
      writeHoOverrides(overrides);
      return { ...prev, [indentId]: merged };
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold">HO Inbox</div>
          <div className="text-xs text-muted-foreground">Select an indent to review quotations and forward to Finance Admin Ops.</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <div className="text-sm font-semibold">Inbox</div>
          <div className="ml-auto text-xs text-muted-foreground">Total: {inboxRows.length}</div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : inboxRows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No comparatives found. Create quotations first to see items here.</div>
        ) : (
          <div className="divide-y divide-border">
            {inboxRows.map((r) => {
              if (r.kind === 'comparative') {
                return (
                  <ComparativeQuotationApprovalRow
                    key={r.key}
                    item={r.item}
                    onOpen={(indentId) => navigate(`/ho/${indentId}`)}
                    onUpdate={updateComparative}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
