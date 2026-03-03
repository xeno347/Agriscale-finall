import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Forward, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Reuse the same storage used by QuotationComparative
const KEY = 'farmconnect.prComparative.v1';

type QuoteVendor = {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  directoryVendorId?: string;
};

type PrItem = {
  id: string;
  srNo: number;
  partName: string;
  uom: string;
  qty: number;
  gstPercent?: number;
};

type VendorQuote = {
  vendorId: string;
  unitRateByItemId: Record<string, number>;
};

type Comparative = {
  indentId: string;
  title: string;
  subTitle?: string;
  vendors: QuoteVendor[];
  items: PrItem[];
  quotes: VendorQuote[];
  paymentTerms?: Record<string, string>;
  deliveryTimeline?: Record<string, string>;
  priceBasis?: Record<string, string>;
  warranty?: Record<string, string>;
  loading?: Record<string, string>;
  unloading?: Record<string, string>;
  vendorStatus?: Record<string, string>;
  freightCharges?: Record<string, number>;
  otherCharges?: Record<string, number>;
  // HO selection + workflow
  hoSelectedVendorId?: string;
  hoForwardedAt?: string;
  // Technical recommendation (tick)
  technicalRecommendedVendorId?: string;
};

const readAll = (): Record<string, Comparative> => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeAll = (all: Record<string, Comparative>) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
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

export default function HO() {
  const { indentId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<Comparative | null>(null);

  useEffect(() => {
    if (!indentId) return;
    const all = readAll();
    const comp = all[indentId];
    if (!comp) {
      // Seed with dummy data so HO is always viewable even if quotation page wasn't filled yet.
      const seeded: Comparative = {
        indentId,
        title: 'Vendor Comparative Statement for Chhattisgarh 2250 Acres',
        subTitle: 'for ...',
        vendors: [
          { id: 'v1', name: 'VENDOR 1', location: 'Address / location', phone: 'Phone' },
          { id: 'v2', name: 'VENDOR 2', location: 'Address / location', phone: 'Phone' },
        ],
        items: [
          { id: 'i1', srNo: 1, partName: 'Chisel Plough', uom: 'No', qty: 4, gstPercent: 0 },
        ],
        quotes: [
          {
            vendorId: 'v1',
            unitRateByItemId: { i1: 45000 },
          },
          {
            vendorId: 'v2',
            unitRateByItemId: { i1: 42000 },
          },
        ],
        paymentTerms: { v1: '-', v2: '-' },
        deliveryTimeline: { v1: '-', v2: '-' },
        priceBasis: { v1: '-', v2: '-' },
        warranty: { v1: '-', v2: '-' },
        loading: { v1: '-', v2: '-' },
        unloading: { v1: '-', v2: '-' },
        vendorStatus: { v1: '-', v2: '-' },
        freightCharges: { v1: 0, v2: 0 },
        otherCharges: { v1: 0, v2: 0 },
        technicalRecommendedVendorId: 'v2',
        hoSelectedVendorId: 'v2',
      };

      all[indentId] = seeded;
      writeAll(all);
      setModel(seeded);
      return;
    }
    setModel(comp);
  }, [indentId]);

  const vendorOrder = model?.vendors ?? [];

  const amountsByVendor = useMemo(() => {
    if (!model) return {} as Record<string, number[]>;
    const out: Record<string, number[]> = {};
    for (const v of model.vendors) {
      const q = model.quotes.find((x) => x.vendorId === v.id);
      out[v.id] = model.items.map((it) => {
        const unit = q?.unitRateByItemId?.[it.id] ?? 0;
        return unit * it.qty;
      });
    }
    return out;
  }, [model]);

  const baseByVendor = useMemo(() => {
    if (!model) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const v of model.vendors) {
      const amts = amountsByVendor[v.id] || [];
      out[v.id] = amts.reduce((s, a) => s + a, 0);
    }
    return out;
  }, [model, amountsByVendor]);

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

  const gstByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      let sum = 0;
      const q = model?.quotes?.find((x) => x.vendorId === v.id);
      for (const it of model?.items ?? []) {
        const unit = q?.unitRateByItemId?.[it.id] ?? 0;
        const amt = unit * it.qty;
        const gp = Number(isFinite(Number(it.gstPercent)) ? it.gstPercent : 0) || 0;
        sum += amt * (gp / 100);
      }
      out[v.id] = sum;
    }
    return out;
  }, [vendorOrder, model]);

  const subTotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      out[v.id] = (baseByVendor[v.id] || 0) + (freightByVendor[v.id] || 0) + (otherByVendor[v.id] || 0);
    }
    return out;
  }, [vendorOrder, baseByVendor, freightByVendor, otherByVendor]);

  const grandTotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = (subTotalByVendor[v.id] || 0) + (gstByVendor[v.id] || 0);
    return out;
  }, [vendorOrder, subTotalByVendor, gstByVendor]);

  const setSelectedVendor = (vendorId: string) => {
    if (!indentId || !model) return;
    setModel((p) => (p ? { ...p, hoSelectedVendorId: vendorId } : p));

    const all = readAll();
    all[indentId] = { ...model, hoSelectedVendorId: vendorId };
    writeAll(all);
  };

  const forwardToFinance = () => {
    if (!indentId || !model) return;
    if (!model.hoSelectedVendorId) return toast.error('Select a best quote (vendor) first');

    const all = readAll();
    all[indentId] = { ...model, hoForwardedAt: new Date().toISOString() };
    writeAll(all);

    toast.success('Forwarded to Finance Admin Ops');
    navigate('/finance-admin-ops-indents');
  };

  if (!indentId) return <div className="p-6">Invalid indent.</div>;
  if (model === null) return <div className="p-6">No quotation found for this indent.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <div className="text-lg font-bold">HO Review (Best Quote Selection)</div>
            <div className="text-xs text-muted-foreground">Indent: {indentId}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={forwardToFinance}
            disabled={!model.hoSelectedVendorId}
            title={!model.hoSelectedVendorId ? 'Select a vendor first' : 'Forward to Finance Admin Ops'}
          >
            <Forward className="w-4 h-4" /> Forward
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-max min-w-[1100px] border-collapse text-[12px] table-fixed">
          <colgroup>
            <col style={{ width: 60 }} />
            <col style={{ width: 320 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            {vendorOrder.map((v) => (
              <>
                <col key={`${v.id}-col-ur`} style={{ width: 140 }} />
                <col key={`${v.id}-col-amt`} style={{ width: 140 }} />
              </>
            ))}
          </colgroup>

          <thead>
            <tr>
              <th className="border border-border bg-primary/10 text-center px-2 py-2" colSpan={4}>
                <div className="space-y-1">
                  <div className="font-semibold">{model.title || 'Price Comparative Statement'}</div>
                  {model.subTitle ? <div className="text-[11px] text-muted-foreground">{model.subTitle}</div> : null}
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-foreground/80">Indent:</span>
                    <span className="font-medium text-foreground">{indentId}</span>
                  </div>
                </div>
              </th>

              {vendorOrder.map((v) => {
                const selected = model.hoSelectedVendorId === v.id;
                const tech = model.technicalRecommendedVendorId === v.id;
                return (
                  <th key={v.id} className="border border-border bg-secondary/40 px-2 py-2" colSpan={2}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-foreground whitespace-normal break-words leading-snug">
                          {v.name}
                        </div>
                        {(v.location || v.phone) && (
                          <div className="mt-1 text-[11px] text-muted-foreground whitespace-normal break-words">
                            {[v.location, v.phone].filter(Boolean).join(' • ')}
                          </div>
                        )}

                        {tech ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-700 bg-blue-600 px-2 py-1 text-[11px] text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Technical Recommended
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedVendor(v.id)}
                        className={
                          `inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ` +
                          (selected
                            ? 'bg-green-600 text-white border-green-700'
                            : 'bg-background hover:bg-muted border-border text-foreground')
                        }
                        title="Select as best quote"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {selected ? 'HO Selected' : 'Select'}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>

            <tr className="bg-muted/40">
              <th className="border border-border px-2 py-1 w-[60px]">Sr.No</th>
              <th className="border border-border px-2 py-1">Item</th>
              <th className="border border-border px-2 py-1 w-[80px]">QTY</th>
              <th className="border border-border px-2 py-1 w-[80px]">UOM</th>
              {vendorOrder.map((v) => (
                <>
                  <th key={`${v.id}-ur`} className="border border-border bg-info/10 px-2 py-1 w-[140px]">Unit Rate</th>
                  <th key={`${v.id}-amt`} className="border border-border bg-info/10 px-2 py-1 w-[140px]">Amount</th>
                </>
              ))}
            </tr>
          </thead>

          <tbody>
            {model.items.length === 0 ? (
              <tr>
                <td className="border border-gray-300 px-2 py-4 text-center text-gray-500" colSpan={4 + vendorOrder.length * 2}>
                  No items found for this indent.
                </td>
              </tr>
            ) : (
              model.items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <span>{it.partName}</span>
                      <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <span>GST%</span>
                        <span className="font-mono">{Number.isFinite(it.gstPercent as any) ? String(it.gstPercent) : '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{it.qty}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{it.uom}</td>

                  {vendorOrder.map((v) => {
                    const q = model.quotes.find((x) => x.vendorId === v.id);
                    const unit = q?.unitRateByItemId?.[it.id] ?? 0;
                    const amt = unit * it.qty;
                    return (
                      <>
                        <td className="border border-gray-300 px-2 py-1 text-right">{unit ? unit.toLocaleString() : ''}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{amt ? inr(amt) : ''}</td>
                      </>
                    );
                  })}
                </tr>
              ))
            )}

            {vendorOrder.length > 0 && (
              <>
                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-2" colSpan={4}>
                    Base Amount
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-base-ur`} className="border border-border px-2 py-2" />
                      <td key={`${v.id}-base-amt`} className="border border-border px-2 py-2 text-right">
                        {baseByVendor[v.id] ? inr(baseByVendor[v.id]) : ''}
                      </td>
                    </>
                  ))}
                </tr>

                <tr className="bg-background">
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={4}>
                    GST (as per item GST%)
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-gst-ur`} className="border border-border px-2 py-1" />
                      <td key={`${v.id}-gst-amt`} className="border border-border px-2 py-1 text-right">
                        {gstByVendor[v.id] ? inr(gstByVendor[v.id]) : ''}
                      </td>
                    </>
                  ))}
                </tr>

                <tr className="bg-background">
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={4}>
                    Freight Charges
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-freight-ur`} className="border border-border px-2 py-1" />
                      <td key={`${v.id}-freight-amt`} className="border border-border px-2 py-1 text-right">
                        {freightByVendor[v.id] ? inr(freightByVendor[v.id]) : '—'}
                      </td>
                    </>
                  ))}
                </tr>

                <tr className="bg-background">
                  <td className="border border-border px-2 py-1 text-right font-semibold" colSpan={4}>
                    Other Charges
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-other-ur`} className="border border-border px-2 py-1" />
                      <td key={`${v.id}-other-amt`} className="border border-border px-2 py-1 text-right">
                        {otherByVendor[v.id] ? inr(otherByVendor[v.id]) : '—'}
                      </td>
                    </>
                  ))}
                </tr>

                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-1 text-right" colSpan={4}>
                    Sub Total
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-sub-ur`} className="border border-border px-2 py-1" />
                      <td key={`${v.id}-sub-amt`} className="border border-border px-2 py-1 text-right">
                        {subTotalByVendor[v.id] ? inr(subTotalByVendor[v.id]) : ''}
                      </td>
                    </>
                  ))}
                </tr>

                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-1 text-right" colSpan={4}>
                    Total Amount
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-gt-ur`} className="border border-border px-2 py-1" />
                      <td key={`${v.id}-gt-amt`} className="border border-border px-2 py-1 text-right">
                        {grandTotalByVendor[v.id] ? inr(grandTotalByVendor[v.id]) : ''}
                      </td>
                    </>
                  ))}
                </tr>
              </>
            )}

            {/* meta rows (read-only) */}
            {(
              [
                ['Payment Terms', 'paymentTerms'],
                ['Delivery Timeline', 'deliveryTimeline'],
                ['Price Basis', 'priceBasis'],
                ['Warranty/Guarantee', 'warranty'],
                ['Loading of Porta Cabin', 'loading'],
                ['Unloading of Porta Cabin', 'unloading'],
                ['Vendor Status', 'vendorStatus'],
              ] as const
            ).map(([label, key]) => (
              <tr key={key}>
                <td className="border border-gray-300 px-2 py-1 font-semibold align-top" colSpan={4}>
                  {label}
                </td>
                {vendorOrder.map((v) => {
                  const value = String((model as any)[key]?.[v.id] ?? '');
                  return (
                    <td key={`${key}-${v.id}`} className="border border-gray-300 px-2 py-1 align-top text-muted-foreground" colSpan={2}>
                      {value || '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Select the best quote (vendor) and Forward to Finance Admin Ops.
      </div>
    </div>
  );
}
