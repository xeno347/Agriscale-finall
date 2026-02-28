import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type QuoteVendor = {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  directoryVendorId?: string; // selected vendor from Vendor Directory
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
  unitRateByItemId: Record<string, number>; // itemId -> unitRate
};

type Comparative = {
  indentId: string;
  title: string;
  subTitle?: string;
  vendors: QuoteVendor[];
  items: PrItem[];
  quotes: VendorQuote[];
  // summary rows
  paymentTerms?: Record<string, string>; // vendorId -> text
  deliveryTimeline?: Record<string, string>;
  priceBasis?: Record<string, string>;
  warranty?: Record<string, string>;
  loading?: Record<string, string>;
  unloading?: Record<string, string>;
  vendorStatus?: Record<string, string>;
  gstPercent?: number; // legacy sheet-level (fallback)
  freightCharges?: Record<string, number>; // vendorId -> amount
  otherCharges?: Record<string, number>; // vendorId -> amount (includes any tax-like extras)
  // legacy fields kept for previously saved data
  baseAmountA?: Record<string, number>;
  baseAmountB?: Record<string, number>;
};

const KEY = 'farmconnect.prComparative.v1';
const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

type DirectoryVendor = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
};

const VENDOR_DIR_KEY = 'farmconnect.vendorDirectory.v1';

const DUMMY_DIRECTORY_VENDORS: DirectoryVendor[] = [
  { id: 'dv-1', name: 'CHHATTISGARH PORTABLE INFRATECH', phone: '9165271111', address: 'Bhilai, Chhattisgarh' },
  { id: 'dv-2', name: 'MAHAKAL PORTABLE CABIN & FABRICATION', phone: '9702430797', address: 'Durg, Chhattisgarh' },
  { id: 'dv-3', name: 'SHREE BALAJI FABRICATION WORKS', phone: '9000000000', address: 'Raipur, Chhattisgarh' },
];

const readVendorDirectory = (): DirectoryVendor[] => {
  try {
    const raw = window.localStorage.getItem(VENDOR_DIR_KEY);
    if (!raw) return DUMMY_DIRECTORY_VENDORS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DUMMY_DIRECTORY_VENDORS;
    const mapped = parsed
      .map((v: any) => ({
        id: String(v?.id ?? ''),
        name: String(v?.name ?? ''),
        phone: v?.phone ? String(v.phone) : undefined,
        address: v?.address ? String(v.address) : undefined,
      }))
      .filter((v: DirectoryVendor) => v.id && v.name.trim());

    return mapped.length ? mapped : DUMMY_DIRECTORY_VENDORS;
  } catch {
    return DUMMY_DIRECTORY_VENDORS;
  }
};

function AutoGrowTextarea({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        'w-full resize-none overflow-hidden bg-transparent outline-none text-[12px] leading-[1.25]'
      }
      rows={1}
    />
  );
}

export default function QuotationComparative() {
  const { indentId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState<Comparative | null>(null);

  const directoryVendors = useMemo(() => readVendorDirectory(), []);

  const updateVendorFromDirectory = (vendorId: string, directoryVendorId: string) => {
    const selected = directoryVendors.find((x) => x.id === directoryVendorId);
    if (!selected) return;
    setModel((p) => {
      if (!p) return p;
      return {
        ...p,
        vendors: p.vendors.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                directoryVendorId,
                name: selected.name,
                phone: selected.phone || v.phone,
                location: selected.address ? selected.address : v.location,
              }
            : v,
        ),
      };
    });
  };

  useEffect(() => {
    if (!indentId) return;
    const all = readAll();
    if (all[indentId]) {
      setModel(all[indentId]);
      return;
    }

    const empty: Comparative = {
      indentId,
      title: 'Price Comparative Statement',
      subTitle: 'for office Porta Cabins at Chhattisgarh',
      vendors: [
        { id: genId(), name: 'CHHATTISGARH PORTABLE INFRATECH', location: '(Bhilai, Chhattisgarh -', phone: '9165271111)' },
        { id: genId(), name: 'MAHAKAL PORTABLE CABIN & FABRICATION', location: '(Khasra, Durg, Chhattisgarh -', phone: '9702430797)' },
      ],
      items: [],
      quotes: [],
      // keep legacy field for older saves, but we don't use a default anymore
      gstPercent: undefined,
      freightCharges: {},
      otherCharges: {},
      baseAmountA: {},
      baseAmountB: {},
    };
    setModel(empty);
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

  const totalByVendor = useMemo(() => {
    if (!model) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const v of model.vendors) {
      const amts = amountsByVendor[v.id] || [];
      out[v.id] = amts.reduce((s, a) => s + a, 0);
    }
    return out;
  }, [model, amountsByVendor]);

  const baseABByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) out[v.id] = totalByVendor[v.id] || 0;
    return out;
  }, [vendorOrder, totalByVendor]);

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

  // NOTE: No default GST. Each item must carry its own GST% (blank => 0).

  // GST is calculated on Base Amount only, and ONLY from per-item GST%.
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

  const taxableSubtotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      // "Sub Total" now means Base + Freight + Other (GST not included)
      out[v.id] = (baseABByVendor[v.id] || 0) + (freightByVendor[v.id] || 0) + (otherByVendor[v.id] || 0);
    }
    return out;
  }, [vendorOrder, baseABByVendor, freightByVendor, otherByVendor]);

  const grandTotalByVendor = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of vendorOrder) {
      out[v.id] = (taxableSubtotalByVendor[v.id] || 0) + (gstByVendor[v.id] || 0);
    }
    return out;
  }, [vendorOrder, taxableSubtotalByVendor, gstByVendor]);

  const setVendorRate = (vendorId: string, itemId: string, val: string) => {
    if (!model) return;
    const rate = Number(val);
    setModel((prev) => {
      if (!prev) return prev;
      const quotes = [...prev.quotes];
      const idx = quotes.findIndex((q) => q.vendorId === vendorId);
      if (idx === -1) {
        quotes.push({ vendorId, unitRateByItemId: { [itemId]: Number.isFinite(rate) ? rate : 0 } });
      } else {
        quotes[idx] = {
          ...quotes[idx],
          unitRateByItemId: { ...(quotes[idx].unitRateByItemId || {}), [itemId]: Number.isFinite(rate) ? rate : 0 },
        };
      }
      return { ...prev, quotes };
    });
  };

  const addVendor = () => {
    if (!model) return;
    setModel((p) => {
      if (!p) return p;
      const vendors = [...p.vendors, { id: genId(), name: `Vendor ${p.vendors.length + 1}` }];
      return { ...p, vendors };
    });
  };

  const removeVendor = (vendorId: string) => {
    if (!model) return;
    setModel((p) => {
      if (!p) return p;
      return {
        ...p,
        vendors: p.vendors.filter((v) => v.id !== vendorId),
        quotes: p.quotes.filter((q) => q.vendorId !== vendorId),
      };
    });
  };

  const updateVendorName = (vendorId: string, name: string) => {
    if (!model) return;
    setModel((p) => {
      if (!p) return p;
      return { ...p, vendors: p.vendors.map((v) => (v.id === vendorId ? { ...v, name } : v)) };
    });
  };

  const setMeta = (
    key:
      | 'paymentTerms'
      | 'deliveryTimeline'
      | 'priceBasis'
      | 'warranty'
      | 'loading'
      | 'unloading'
      | 'vendorStatus',
    vendorId: string,
    value: string,
  ) => {
    if (!model) return;
    setModel((p) => {
      if (!p) return p;
      return { ...p, [key]: { ...(p as any)[key], [vendorId]: value } } as Comparative;
    });
  };

  const setBase = (key: 'baseAmountA' | 'baseAmountB', vendorId: string, value: string) => {
    const num = Number(value);
    setModel((p) => {
      if (!p) return p;
      return { ...p, [key]: { ...(p as any)[key], [vendorId]: Number.isFinite(num) ? num : 0 } } as Comparative;
    });
  };

  const setCharge = (key: 'freightCharges' | 'otherCharges', vendorId: string, value: string) => {
    const num = Number(value);
    setModel((p) => {
      if (!p) return p;
      const cur = (p as any)[key] || {};
      return { ...p, [key]: { ...cur, [vendorId]: Number.isFinite(num) ? num : 0 } } as Comparative;
    });
  };

  const setPercent = (key: 'gstPercent' | 'taxPercent', value: string) => {
    const num = Number(value);
    setModel((p) => {
      if (!p) return p;
      return { ...p, [key]: Number.isFinite(num) ? num : 0 } as Comparative;
    });
  };

  const save = () => {
    if (!indentId || !model) return;
    const all = readAll();
    all[indentId] = model;
    writeAll(all);
    toast.success('Quotation saved');
  };

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

  const emphasizeLx = (value: string) => {
    const raw = value || '';
    // highlight only the L1/L2 token similar to the sheet
    return raw.replace(/\b(L\s*1|L\s*2)\b/gi, (m) => `<b>${m.toUpperCase().replace(/\s+/g, ' ')}</b>`);
  };

  const getDirectoryVendorById = (id?: string) => {
    if (!id) return undefined;
    return directoryVendors.find((x) => x.id === id);
  };

  if (!indentId) {
    return <div className="p-6">Invalid indent.</div>;
  }

  if (!model) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/purchase-requisition')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <div className="text-lg font-bold">Add Quotation</div>
            <div className="text-xs text-muted-foreground">Indent: {indentId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={addVendor}>
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
          <Button className="gap-2" onClick={save}>
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </div>

      {/* Layout table matching provided image */}
      <div className="overflow-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-max min-w-[1100px] border-collapse text-[12px] table-fixed">
          {/* Fix column widths so they never shrink */}
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
                  <Input
                    value={model.title || ''}
                    onChange={(e) => setModel((p) => (p ? { ...p, title: e.target.value } : p))}
                    className="h-8 bg-background font-semibold text-center"
                    placeholder="Price Comparative Statement"
                  />
                  <Input
                    value={model.subTitle || ''}
                    onChange={(e) => setModel((p) => (p ? { ...p, subTitle: e.target.value } : p))}
                    className="h-7 bg-background text-[11px] text-center"
                    placeholder="for ..."
                  />
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-foreground/80">Indent:</span>
                    <span className="font-medium text-foreground">{indentId}</span>
                  </div>
                </div>
              </th>

              {vendorOrder.map((v) => {
                const selectedDirVendor = getDirectoryVendorById(v.directoryVendorId);
                return (
                  <th key={v.id} className="border border-border bg-secondary/40 px-2 py-2" colSpan={2}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Vendor Id (show only after selecting vendor name) */}
                        {v.directoryVendorId ? (
                          <div className="text-[10px] text-muted-foreground mb-1">
                            Vendor ID: <span className="font-mono text-foreground">{v.directoryVendorId}</span>
                          </div>
                        ) : null}

                        {/* FULL name visible (wrapped) */}
                        <div className="text-[12px] font-semibold text-foreground whitespace-normal break-words leading-snug">
                          {selectedDirVendor?.name || (v.name?.trim() ? v.name : 'Select vendor')}
                        </div>

                        {/* Selector kept below for changing vendor */}
                        <div className="mt-1">
                          <select
                            value={v.directoryVendorId ?? ''}
                            onChange={(e) => updateVendorFromDirectory(v.id, e.target.value)}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="" disabled>
                              Select vendor
                            </option>
                            {directoryVendors.map((dv) => (
                              <option key={dv.id} value={dv.id}>
                                {dv.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1">
                          <Input
                            value={v.location || ''}
                            onChange={(e) =>
                              setModel((p) =>
                                p
                                  ? {
                                      ...p,
                                      vendors: p.vendors.map((x) => (x.id === v.id ? { ...x, location: e.target.value } : x)),
                                    }
                                  : p,
                              )
                            }
                            className="h-7 bg-background text-[11px]"
                            placeholder="Address / location"
                          />
                          <Input
                            value={v.phone || ''}
                            onChange={(e) =>
                              setModel((p) =>
                                p
                                  ? {
                                      ...p,
                                      vendors: p.vendors.map((x) => (x.id === v.id ? { ...x, phone: e.target.value } : x)),
                                    }
                                  : p,
                              )
                            }
                            className="h-7 bg-background text-[11px]"
                            placeholder="Phone"
                          />
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
                        <Input
                          className="h-7 w-[70px] bg-white text-right"
                          value={String(Number.isFinite(it.gstPercent as any) ? it.gstPercent : '')}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = Number(raw);
                            setModel((p) => {
                              if (!p) return p;
                              const items = p.items.map((x) =>
                                x.id === it.id
                                  ? {
                                      ...x,
                                      gstPercent: raw.trim() === '' ? undefined : Number.isFinite(num) ? num : x.gstPercent,
                                    }
                                  : x,
                              );
                              return { ...p, items };
                            });
                          }}
                          placeholder="0"
                        />
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
                        <td className="border border-gray-300 px-2 py-1">
                          <Input
                            className="h-8"
                            value={String(unit || '')}
                            onChange={(e) => setVendorRate(v.id, it.id, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{amt ? inr(amt) : ''}</td>
                      </>
                    );
                  })}
                </tr>
              ))
            )}

            {/* Summary section */}
            {vendorOrder.length > 0 && (
              <>
                {/* Base Amount under respective vendor columns */}
                <tr className="bg-primary/10 font-semibold">
                  <td className="border border-border px-2 py-2" colSpan={4}>
                    Base Amount
                  </td>
                  {vendorOrder.map((v) => (
                    <>
                      <td key={`${v.id}-base-ur`} className="border border-border px-2 py-2"></td>
                      <td key={`${v.id}-base-amt`} className="border border-border px-2 py-2 text-right">
                        {baseABByVendor[v.id] ? inr(baseABByVendor[v.id]) : ''}
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
                      <td key={`${v.id}-gst-ur`} className="border border-border px-2 py-1"></td>
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
                      <td key={`${v.id}-freight-ur`} className="border border-border px-2 py-1"></td>
                      <td key={`${v.id}-freight-amt`} className="border border-border px-2 py-1">
                        <Input
                          className="h-8"
                          value={String(freightByVendor[v.id] || '')}
                          onChange={(e) => setCharge('freightCharges', v.id, e.target.value)}
                          placeholder="0"
                        />
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
                      <td key={`${v.id}-other-ur`} className="border border-border px-2 py-1"></td>
                      <td key={`${v.id}-other-amt`} className="border border-border px-2 py-1">
                        <Input
                          className="h-8"
                          value={String(otherByVendor[v.id] || '')}
                          onChange={(e) => setCharge('otherCharges', v.id, e.target.value)}
                          placeholder="0"
                        />
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
                      <td key={`${v.id}-sub-ur`} className="border border-border px-2 py-1"></td>
                      <td key={`${v.id}-sub-amt`} className="border border-border px-2 py-1 text-right">
                        {taxableSubtotalByVendor[v.id] ? inr(taxableSubtotalByVendor[v.id]) : ''}
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
                      <td key={`${v.id}-gt-ur`} className="border border-border px-2 py-1"></td>
                      <td key={`${v.id}-gt-amt`} className="border border-border px-2 py-1 text-right">
                        {grandTotalByVendor[v.id] ? inr(grandTotalByVendor[v.id]) : ''}
                      </td>
                    </>
                  ))}
                </tr>
              </>
            )}

            {/* meta rows */}
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
                  const isStatus = key === 'vendorStatus';
                  const cls = `border border-gray-300 px-2 py-1 align-top ${isStatus ? statusBgClass(value) : ''}`;
                  return (
                    <td key={`${key}-${v.id}`} className={cls} colSpan={2}>
                      {isStatus ? (
                        <div className="min-h-[44px]">
                          <Input
                            className="h-8"
                            value={value}
                            onChange={(e) => setMeta(key, v.id, e.target.value)}
                            placeholder="-"
                          />
                          {value ? (
                            <div
                              className={`mt-1 text-[12px] leading-[1.25] text-gray-900 ${statusTextClass(value)}`}
                              style={{ whiteSpace: 'pre-wrap' }}
                              dangerouslySetInnerHTML={{ __html: emphasizeLx(value) }}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <AutoGrowTextarea
                          value={value}
                          onChange={(t) => setMeta(key, v.id, t)}
                          placeholder="-"
                          className="w-full resize-none overflow-hidden bg-transparent outline-none text-[12px] leading-[1.25]"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Tip: This page is a full page (not a popup). Use Save to store the quotation.
      </div>
    </div>
  );
}
