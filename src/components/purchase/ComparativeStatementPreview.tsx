import { Fragment } from 'react';

export type ComparativeVendor = {
  id: string;
  name: string;
  directoryVendorId?: string;
  phone?: string;
  location?: string;
  address?: string;
};

export type ComparativeItem = {
  id: string;
  srNo?: number;
  partName?: string;
  uom?: string;
  qty: number;
  gstPercent?: number;
};

export type ComparativeQuote = {
  vendorId: string;
  unitRateByItemId: Record<string, number>;
};

export type ComparativeModel = {
  indentId: string;
  comparisonId?: string;
  title?: string;
  subTitle?: string;
  vendors?: ComparativeVendor[];
  items?: ComparativeItem[];
  quotes?: ComparativeQuote[];
  gstPercent?: number;
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
  technicalRecommendationVendorId?: string;
  technicalRecommendedVendorId?: string;
  lastSavedAt?: string;
  isDraft?: boolean;
  hoSelectedVendorId?: string;
  hoForwardedAt?: string;
  paymentTerms?: Record<string, string>;
  deliveryTimeline?: Record<string, string>;
  priceBasis?: Record<string, string>;
  warranty?: Record<string, string>;
  vendorStatus?: Record<string, string>;

  // HO approval
  tcApprovedVendorId?: string;
  tcApprovedAt?: string;
};

const formatInr = (value: number) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${Math.round(value)}`;
  }
};

const numOr0 = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

export function ComparativeStatementPreview({
  c,
  showForwardedStamp,
}: {
  c: ComparativeModel;
  showForwardedStamp?: boolean;
}) {
  const vendors = Array.isArray(c?.vendors) ? c.vendors : [];
  const items = Array.isArray(c?.items) ? c.items : [];
  const quotes = Array.isArray(c?.quotes) ? c.quotes : [];

  const techRecId = String((c as any)?.technicalRecommendationVendorId ?? (c as any)?.technicalRecommendedVendorId ?? '').trim();
  const approvedVendorId = String((c as any)?.tcApprovedVendorId ?? '').trim();
  const isApproved = Boolean(approvedVendorId);
  const isRecommendedVendor = (v: ComparativeVendor) => {
    if (!techRecId) return false;
    const internalId = String(v?.id ?? '').trim();
    const directoryId = String(v?.directoryVendorId ?? '').trim();
    return Boolean((internalId && techRecId === internalId) || (directoryId && techRecId === directoryId));
  };

  const isApprovedVendor = (v: ComparativeVendor) => {
    if (!approvedVendorId) return false;
    const internalId = String(v?.id ?? '').trim();
    const directoryId = String(v?.directoryVendorId ?? '').trim();
    return Boolean((internalId && approvedVendorId === internalId) || (directoryId && approvedVendorId === directoryId));
  };

  const techRecVendor = techRecId ? vendors.find((v) => isRecommendedVendor(v)) : undefined;
  const techRecName = techRecId ? (techRecVendor?.name || techRecId) : '';

  const highlightBg = (v: ComparativeVendor) => {
    if (isApproved) return isApprovedVendor(v) ? 'bg-green-200/50' : '';
    return isRecommendedVendor(v) ? 'bg-yellow-200/70' : '';
  };

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

  const vendorLTagByVendorId = (() => {
    const totals = vendors
      .map((v) => ({ vendorId: String(v.id), total: Number(grandTotalForVendor(String(v.id)) ?? 0) || 0 }))
      .filter((x) => x.vendorId);

    const rankable = totals.filter((x) => x.total > 0);
    if (rankable.length === 0) return {} as Record<string, string>;

    rankable.sort((a, b) => a.total - b.total);

    const out: Record<string, string> = {};
    rankable.forEach((x, idx) => {
      out[x.vendorId] = `L${idx + 1}`;
    });
    return out;
  })();

  const statusBgClass = (value: string) => {
    const v = (value || '').toLowerCase();
    if (v.includes('l1') || v.includes('l 1')) return 'bg-green-100';
    return '';
  };

  const statusTextClass = (value: string) => {
    const v = (value || '').toLowerCase();
    if (v.includes('l1') || v.includes('l 1')) return 'font-semibold';
    if (v.includes('l2') || v.includes('l 2')) return 'font-semibold';
    return '';
  };

  if (!vendors.length || !items.length) {
    return <div className="text-sm text-muted-foreground">No comparative statement details found for this indent.</div>;
  }

  return (
    <div className="border border-border rounded bg-card relative">
      {isApproved ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-4 border-green-800/30 text-green-800/30 rounded-lg px-10 py-4 font-extrabold text-5xl tracking-[0.25em]">
            APPROVED
          </div>
        </div>
      ) : showForwardedStamp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="border-4 border-green-800/30 text-green-800/30 rounded-lg px-10 py-4 font-extrabold text-5xl tracking-[0.25em]">
            FORWARDED
          </div>
        </div>
      ) : null}

      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold">Comparative Statement</div>
        <div className="text-xs text-muted-foreground text-right">
          <div>
            {c.isDraft ? 'Draft' : 'Saved'}
            {c.lastSavedAt ? ` · ${new Date(c.lastSavedAt).toLocaleString()}` : ''}
          </div>
          {!isApproved ? (
            <div className="text-[11px] flex items-center justify-end gap-2 mt-0.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-yellow-200/70 border border-yellow-300/80" />
              <span>Recommended</span>
            </div>
          ) : (
            <div className="text-[11px] flex items-center justify-end gap-2 mt-0.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-200/60 border border-green-300/80" />
              <span>Approved</span>
            </div>
          )}
        </div>
      </div>

      {techRecId ? (
        <div className="px-3 py-2 border-b border-border text-xs">
          <span className="font-semibold">Technical recommendation:</span>{' '}
          <span>{techRecName}</span>
        </div>
      ) : null}

      <div className="overflow-auto">
        <table className="table-fixed w-max min-w-full text-[11px] border-collapse">
          <colgroup>
            <col className="w-[44px]" />
            <col className="w-[260px]" />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            {vendors.map((v) => (
              <Fragment key={`col-${v.id}`}>
                <col className="w-[84px]" />
                <col className="w-[120px]" />
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/40">
              <th className="border border-border px-2 py-1 text-left" rowSpan={2}>Sr</th>
              <th className="border border-border px-2 py-1 text-left" rowSpan={2}>Item</th>
              <th className="border border-border px-2 py-1 text-right" rowSpan={2}>Qty</th>
              <th className="border border-border px-2 py-1 text-center" rowSpan={2}>UoM</th>
              {vendors.map((v) => (
                <th
                  key={`vh-${v.id}`}
                  className={`border border-border px-1 py-1 text-center whitespace-nowrap ${highlightBg(v)}`}
                  colSpan={2}
                >
                  <span className="font-semibold truncate inline-block max-w-[200px] align-bottom">{v.name}</span>
                </th>
              ))}
            </tr>
            <tr className="bg-muted/40">
              {vendors.map((v) => (
                <Fragment key={`vh2-${v.id}`}>
                  <th className={`border border-border px-1 py-1 text-right whitespace-nowrap ${highlightBg(v)}`}>Unit</th>
                  <th className={`border border-border px-1 py-1 text-right whitespace-nowrap ${highlightBg(v)}`}>Amt</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td className="border border-border px-2 py-1 text-left whitespace-nowrap">{(it as any)?.srNo ?? idx + 1}</td>
                <td className="border border-border px-2 py-1 text-left truncate">{String((it as any)?.partName ?? '')}</td>
                <td className="border border-border px-2 py-1 text-right whitespace-nowrap tabular-nums">{numOr0(it.qty)}</td>
                <td className="border border-border px-2 py-1 text-center whitespace-nowrap">{String((it as any)?.uom ?? '')}</td>
                {vendors.map((v) => {
                  const q = quoteByVendorId[v.id];
                  const unit = numOr0(q?.unitRateByItemId?.[it.id]);
                  const amt = unit * numOr0(it.qty);
                  return (
                    <Fragment key={`${it.id}-${v.id}`}>
                      <td className={`border border-border px-1 py-1 text-right whitespace-nowrap tabular-nums ${highlightBg(v)}`}>{unit ? unit.toLocaleString() : '—'}</td>
                      <td className={`border border-border px-1 py-1 text-right whitespace-nowrap tabular-nums ${highlightBg(v)}`}>{amt ? formatInr(amt) : '—'}</td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}

            <tr className="bg-muted/40">
              <td className="border border-border px-2 py-1 font-semibold text-right" colSpan={4}>
                Base total
              </td>
              {vendors.map((v) => (
                <td key={`base-${v.id}`} className={`border border-border px-1 py-1 text-right font-semibold whitespace-nowrap tabular-nums ${highlightBg(v)}`} colSpan={2}>
                  {formatInr(baseForVendor(v.id))}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-border px-2 py-1 font-semibold text-right" colSpan={4}>
                Freight
              </td>
              {vendors.map((v) => (
                <td key={`freight-${v.id}`} className={`border border-border px-1 py-1 text-right whitespace-nowrap tabular-nums ${highlightBg(v)}`} colSpan={2}>
                  {formatInr(freightForVendor(v.id))}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-border px-2 py-1 font-semibold text-right" colSpan={4}>
                Other
              </td>
              {vendors.map((v) => (
                <td key={`other-${v.id}`} className={`border border-border px-1 py-1 text-right whitespace-nowrap tabular-nums ${highlightBg(v)}`} colSpan={2}>
                  {formatInr(otherForVendor(v.id))}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-border px-2 py-1 font-semibold text-right" colSpan={4}>
                GST
              </td>
              {vendors.map((v) => (
                <td key={`gst-${v.id}`} className={`border border-border px-1 py-1 text-right whitespace-nowrap tabular-nums ${highlightBg(v)}`} colSpan={2}>
                  {formatInr(gstForVendor(v.id))}
                </td>
              ))}
            </tr>
            <tr className="bg-muted/40">
              <td className="border border-border px-2 py-1 font-semibold text-right" colSpan={4}>
                Grand total
              </td>
              {vendors.map((v) => (
                <td
                  key={`grand-${v.id}`}
                  className={`border border-border px-1 py-1 text-right font-extrabold whitespace-nowrap tabular-nums ${highlightBg(v)}`}
                  colSpan={2}
                >
                  {formatInr(grandTotalForVendor(v.id))}
                </td>
              ))}
            </tr>

            {(
              [
                ['Payment Terms', 'paymentTerms'],
                ['Delivery Timeline', 'deliveryTimeline'],
                ['Price Basis', 'priceBasis'],
                ['Warranty/Guarantee', 'warranty'],
                ['Vendor Status', 'vendorStatus'],
              ] as const
            ).map(([label, key]) => (
              <tr key={key}>
                <td className="border border-border px-2 py-1 font-semibold align-top" colSpan={4}>
                  {label}
                </td>
                {vendors.map((v) => {
                  const vId = String(v.id);
                  const storedStatus = String((c as any)?.vendorStatus?.[vId] ?? '').trim();
                  const value =
                    key === 'vendorStatus'
                      ? storedStatus || String(vendorLTagByVendorId[vId] || '')
                      : String((c as any)?.[key]?.[vId] ?? '');
                  const isStatus = key === 'vendorStatus';
                  const cls = `border border-border px-2 py-1 align-top ${highlightBg(v)} ${isStatus ? statusBgClass(value) : ''}`;
                  return (
                    <td key={`${key}-${vId}`} className={cls} colSpan={2}>
                      {isStatus ? (
                        <div className="min-h-[32px] flex items-center">
                          <span className={`text-[12px] ${statusTextClass(value)}`}>{value || '-'}</span>
                        </div>
                      ) : (
                        <div className="text-[12px] whitespace-pre-wrap break-words">{value || '-'}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
