import { useState, useEffect, useMemo } from 'react';
import {
  Search, MapPin, Map, Sprout, Wheat, Leaf,
  Wallet, NotebookText, LayoutGrid, Layers,
  TreePine, RefreshCw, Shovel, Video, Crosshair,
  TrendingUp, BookOpen, X,
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import getBaseUrl from '@/lib/config';
import PlotMarkingModal from '@/components/farm/PlotMarkingModal';
import FarmActivityModal, { FarmActivityEntry } from '@/components/farm/FarmActivityModal';

const BASE_URL = getBaseUrl().replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type FarmInvestmentEntry = {
  date: string;
  input: number;
  amount: number;
  unit: string;
  description: string;
  investment: number;
  voucher_number: string;
  item_description: {
    item_code: string;
    item_unit: string;
    item_name: string;
  };
};

type VendorScope = {
  start_date: string;
  end_date: string;
  activities: string[];
  vendor_details: { vendor_name: string; vendor_contact: string };
};

type LandPlot = {
  plot_name:        string;
  plot_area:        number;
  plot_coordinates: [number, number][];
  created_at?:      string;
};

type Farm = {
  farm_id: string;
  farmer_id: string;
  block_id: string;
  crop_type: string;
  area: number;
  priority: number;
  created_at: string;
  activities?: FarmActivityEntry[];
  land_data: {
    land_coordinates: [number, number][];
    farming_option: string;
    state: string;
    village: string;
    district: string;
    land_media: { images: string[]; video: string };
  };
  land_plots?: LandPlot[];
  scope_of_work?: Record<string, VendorScope>;
  harvest_log: Record<string, unknown>;
  payment_log: Record<string, unknown>;
  farm_investment_ledger?: FarmInvestmentEntry[];
};

// ─────────────────────────────────────────────────────────────
// MINI MAP — Leaflet satellite with land boundary + plots
// ─────────────────────────────────────────────────────────────
const PLOT_COLORS = ['#f59e0b','#a855f7','#06b6d4','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16'];

const FitBounds = ({ coords }: { coords: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords as L.LatLngTuple[]), { padding: [14, 14] });
    }
  }, [map]);
  return null;
};

const FarmMiniMap = ({
  landCoords,
  plots,
}: {
  landCoords: [number, number][];
  plots?: LandPlot[];
}) => {
  const hasPlots = (plots?.length ?? 0) > 0;
  const allCoords: [number, number][] = hasPlots
    ? [...landCoords, ...plots!.flatMap(p => p.plot_coordinates)]
    : landCoords;
  const center: [number, number] = allCoords.length > 0
    ? [allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length,
       allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length]
    : [20.5937, 78.9629];

  if (landCoords.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 gap-1">
        <Map className="h-8 w-8 text-gray-600" />
        <span className="text-[10px] text-gray-500">No coordinates</span>
      </div>
    );
  }

  return (
    <MapContainer
      key={`${landCoords[0]?.[0]}-${landCoords[0]?.[1]}`}
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      {/* Land boundary */}
      {landCoords.length >= 3 && (
        <Polygon
          positions={landCoords}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: hasPlots ? 0.08 : 0.22,
            weight: 2.5,
          }}
        />
      )}
      {/* Plot polygons */}
      {hasPlots && plots!.map((plot, i) =>
        plot.plot_coordinates.length >= 3 ? (
          <Polygon
            key={i}
            positions={plot.plot_coordinates}
            pathOptions={{
              color: PLOT_COLORS[i % PLOT_COLORS.length],
              fillColor: PLOT_COLORS[i % PLOT_COLORS.length],
              fillOpacity: 0.35,
              weight: 2,
            }}
          />
        ) : null
      )}
      <FitBounds coords={allCoords} />
    </MapContainer>
  );
};

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
type KnownCrop = 'napier' | 'paddy' | 'ragi';

const cropMeta: Record<KnownCrop, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  napier: { label: 'Napier', Icon: Leaf,   color: 'text-green-700 bg-green-50 ring-green-100'    },
  paddy:  { label: 'Paddy',  Icon: Wheat,  color: 'text-yellow-700 bg-yellow-50 ring-yellow-100' },
  ragi:   { label: 'Ragi',   Icon: Sprout, color: 'text-orange-700 bg-orange-50 ring-orange-100' },
};

const farmingOptionMeta: Record<string, { color: string }> = {
  'Lease Farming':    { color: 'text-blue-700 bg-blue-50 ring-blue-200'       },
  'Contract Farming': { color: 'text-purple-700 bg-purple-50 ring-purple-200' },
};

const shortId = (id: string) => (id ?? '').slice(0, 8).toUpperCase();

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
};

const fmtShortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return iso; }
};

const recentActivities = (farm: Farm): FarmActivityEntry[] =>
  [...(farm.activities ?? [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
const FarmDirectory = () => {
  const [farms, setFarms]     = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [plotMarkingFarm, setPlotMarkingFarm]     = useState<Farm | null>(null);
  const [activityModalFarm, setActivityModalFarm] = useState<Farm | null>(null);
  const [ledgerFarm, setLedgerFarm]               = useState<Farm | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${BASE_URL}/farmer_managment/get_farms`)
      .then(r => r.json())
      .then((data: any) => {
        if (Array.isArray(data?.farms)) setFarms(data.farms);
        else throw new Error(data?.message || 'Unexpected response format');
      })
      .catch((e: any) => {
        const msg = e?.message || 'Failed to load farms';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter(f =>
      f.farm_id.toLowerCase().includes(q) ||
      (f.land_data?.village ?? '').toLowerCase().includes(q) ||
      (f.land_data?.district ?? '').toLowerCase().includes(q) ||
      (f.land_data?.state ?? '').toLowerCase().includes(q) ||
      (f.crop_type ?? '').toLowerCase().includes(q) ||
      (f.land_data?.farming_option ?? '').toLowerCase().includes(q)
    );
  }, [farms, search]);

  // KPIs
  const totalArea      = farms.reduce((s, f) => s + (f.area ?? 0), 0);
  const uniqueBlocks   = new Set(farms.map(f => f.block_id)).size;
  const leaseFarms     = farms.filter(f => f.land_data?.farming_option === 'Lease Farming').length;
  const contractFarms  = farms.filter(f => f.land_data?.farming_option === 'Contract Farming').length;
  const totalInvestment = farms.reduce((s, f) =>
    s + (f.farm_investment_ledger ?? []).reduce((si, e) => si + (e.amount ?? 0), 0), 0);

  const kpis = [
    { label: 'Total Farms',        value: farms.length,                                                                   icon: LayoutGrid,  color: 'text-gray-800'    },
    { label: 'Total Area (Acres)',  value: totalArea.toLocaleString('en-IN'),                                              icon: Layers,      color: 'text-blue-600'    },
    { label: 'Unique Blocks',       value: uniqueBlocks,                                                                   icon: Map,         color: 'text-violet-600'  },
    { label: 'Lease Farming',       value: leaseFarms,                                                                     icon: TreePine,    color: 'text-emerald-600' },
    { label: 'Contract Farming',    value: contractFarms,                                                                  icon: Shovel,      color: 'text-orange-600'  },
    { label: 'Total Investment',    value: `₹${totalInvestment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,   icon: TrendingUp,  color: 'text-rose-600'    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Farm Directory</h1>
        <p className="text-muted-foreground mt-1">All registered farm parcels and their details</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by village, district, crop, farm ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin opacity-40" />
          <p className="text-sm">Loading farms…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-red-400">
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-sm">No farms found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 items-start">
          {filtered.map(farm => {
            const ld           = farm.land_data;
            const coords       = ld.land_coordinates ?? [];
            const images       = ld.land_media?.images ?? [];
            const video        = ld.land_media?.video ?? '';
            const cropKey      = (farm.crop_type ?? '').toLowerCase() as KnownCrop;
            const crop         = cropMeta[cropKey] ?? null;
            const optionMeta   = farmingOptionMeta[ld.farming_option ?? ''] ?? { color: 'text-gray-600 bg-gray-50 ring-gray-200' };
            const location     = [ld.village, ld.district, ld.state].filter(Boolean).join(', ');
            const scopeEntries = Object.entries(farm.scope_of_work ?? {});

            // Separate SBR self-scope entries from external vendor entries
            const isSelfScope = (s: VendorScope) =>
              (s.vendor_details?.vendor_name ?? '').toLowerCase().includes('sai') ||
              (s.vendor_details?.vendor_name ?? '').toLowerCase().includes('sbr');

            const selfScopeEntries   = scopeEntries.filter(([k, s]) => k === 'self' || isSelfScope(s));
            const vendorScopeEntries = scopeEntries.filter(([k, s]) => k !== 'self' && !isSelfScope(s));
            const hasSelfScope   = selfScopeEntries.length > 0;
            const hasVendorScope = vendorScopeEntries.length > 0;
            const hasScope       = scopeEntries.length > 0;


            return (
              <div
                key={farm.farm_id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md flex flex-col"
              >
                {/* ── Header: Leaflet satellite map ── */}
                <div className="h-[220px] w-full relative overflow-hidden">
                  <FarmMiniMap landCoords={coords} plots={farm.land_plots} />

                  {/* Farming option badge */}
                  <span className={`absolute top-2 left-2 z-[1000] inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur-sm bg-white/90 ${optionMeta.color}`}>
                    {ld.farming_option || 'Unknown'}
                  </span>

                  {/* Priority badge */}
                  {(farm.priority ?? 0) > 0 && (
                    <span className="absolute top-2 right-2 z-[1000] rounded-full bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5">
                      P{farm.priority}
                    </span>
                  )}

                  {/* Plot count badge */}
                  {(farm.land_plots?.length ?? 0) > 0 && (
                    <span className="absolute bottom-2 right-2 z-[1000] rounded bg-black/60 text-white text-[9px] px-1.5 py-0.5">
                      {farm.land_plots!.length} plots
                    </span>
                  )}
                </div>

                {/* ── Card body ── */}
                <div className="p-4 space-y-3 flex-1 flex flex-col">

                  {/* Farm ID + Block + Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-gray-950 font-mono leading-5">
                        {shortId(farm.farm_id)}…
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {fmtDate(farm.created_at)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-mono font-semibold text-slate-600 ring-1 ring-slate-200 max-w-[120px] truncate">
                      {shortId(farm.block_id)}…
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 mt-0.5" />
                    <span className="text-xs line-clamp-2">{location || '—'}</span>
                  </div>

                  {/* Crop + Area */}
                  <div className="flex items-center justify-between">
                    {crop ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${crop.color}`}>
                        <crop.Icon className="h-3 w-3" />
                        {crop.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 bg-gray-50 text-gray-600 ring-gray-200 capitalize">
                        {farm.crop_type || 'Unknown'}
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Area</div>
                      <div className="text-sm font-bold text-gray-900">
                        {(farm.area ?? 0).toLocaleString('en-IN')} acres
                      </div>
                    </div>
                  </div>

                  {/* ── Scope of Work ── */}

                  {/* SBR self-scope (from scope_of_work or fallback) */}
                  {(hasSelfScope || !hasScope) && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Scope of Work</div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-gray-800">Sai BioResources</div>
                        <span className="text-[10px] font-mono text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5">self</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {hasSelfScope
                          ? (selfScopeEntries[0][1].activities ?? []).slice(0, 4).map(act => (
                              <span key={act} className="rounded-full bg-white border border-emerald-200 text-[10px] px-1.5 py-0.5 text-emerald-700">
                                {act}
                              </span>
                            ))
                          : (
                            <span className="rounded-full bg-white border border-emerald-200 text-[10px] px-2 py-0.5 text-emerald-700 font-medium">
                              All Activities
                            </span>
                          )
                        }
                        {hasSelfScope && (selfScopeEntries[0][1].activities ?? []).length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{selfScopeEntries[0][1].activities.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* External vendor scope */}
                  {hasVendorScope && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Vendor Scope</div>
                      {vendorScopeEntries.map(([vendorId, scope]) => (
                        <div key={vendorId} className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="text-[11px] font-semibold text-gray-800 truncate">
                              {scope.vendor_details?.vendor_name}
                            </div>
                            <span className="shrink-0 text-[10px] font-mono text-muted-foreground">{vendorId}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(scope.activities ?? []).slice(0, 4).map(act => (
                              <span key={act} className="rounded-full bg-white border border-blue-200 text-[10px] px-1.5 py-0.5 text-blue-700">
                                {act}
                              </span>
                            ))}
                            {(scope.activities ?? []).length > 4 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{scope.activities.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}


                  {/* ── Investment Ledger ── */}
                  {(() => {
                    const ledger = farm.farm_investment_ledger ?? [];
                    if (ledger.length === 0) {
                      return (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          <p className="text-[11px] text-gray-400 italic">Investment not started yet</p>
                        </div>
                      );
                    }
                    const totalAmt = ledger.reduce((s, e) => s + (e.amount ?? 0), 0);
                    return (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <TrendingUp className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Investment</p>
                            <p className="text-base font-extrabold text-rose-700 leading-tight">
                              ₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLedgerFarm(farm)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold px-2.5 py-1.5 transition-colors"
                        >
                          <BookOpen className="w-3 h-3" />
                          View Ledger
                        </button>
                      </div>
                    );
                  })()}

                  {/* ── Land Media ── */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Land Media
                    </div>

                    {/* 3 image thumbnails */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map(idx => (
                        <div
                          key={idx}
                          className="h-14 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                        >
                          {images[idx] ? (
                            <img
                              src={images[idx]}
                              alt={`Farm ${idx + 1}`}
                              className="h-full w-full object-cover cursor-pointer"
                              onClick={() => window.open(images[idx], '_blank')}
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No image</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Video — full width spanning all 3 columns */}
                    {video ? (
                      <div className="mt-1.5 rounded-md border border-gray-200 overflow-hidden bg-black">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900">
                          <Video className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-400 font-medium">Land Video</span>
                        </div>
                        <video
                          src={video}
                          controls
                          className="w-full"
                          style={{ maxHeight: '120px', display: 'block' }}
                        />
                      </div>
                    ) : (
                      <div className="mt-1.5 h-10 rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-[10px] text-muted-foreground">No video</span>
                      </div>
                    )}
                  </div>

                  {/* ── Footer actions ── */}
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-auto">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Payments
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <NotebookText className="h-3.5 w-3.5" />
                      Harvest
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlotMarkingFarm(farm)}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      Plot Marking
                    </button>
                  </div>

                  {/* ── Recent Activity timeline ── */}
                  {(() => {
                    const acts = recentActivities(farm);
                    const total = (farm.activities ?? []).length;
                    if (total === 0) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setActivityModalFarm(farm)}
                        className="w-full text-left border-t border-gray-100 pt-3 group/act"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Recent Activity
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold group-hover/act:underline">
                            View all {total} →
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {acts.map((act, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-[11px] font-medium text-gray-700 truncate flex-1">
                                {act.activity}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {fmtShortDate(act.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Modal */}
      {activityModalFarm && (
        <FarmActivityModal
          farmId={activityModalFarm.farm_id}
          location={[
            activityModalFarm.land_data?.village,
            activityModalFarm.land_data?.district,
            activityModalFarm.land_data?.state,
          ].filter(Boolean).join(', ')}
          activities={activityModalFarm.activities ?? []}
          onClose={() => setActivityModalFarm(null)}
        />
      )}

      {/* Plot Marking Modal */}
      {plotMarkingFarm && (
        <PlotMarkingModal
          farmId={plotMarkingFarm.farm_id}
          farmTotalAcres={plotMarkingFarm.area}
          farmLabel={[
            plotMarkingFarm.land_data?.village,
            plotMarkingFarm.land_data?.district,
            plotMarkingFarm.land_data?.state,
          ].filter(Boolean).join(', ')}
          initialCoordinates={plotMarkingFarm.land_data?.land_coordinates ?? []}
          initialPlots={plotMarkingFarm.land_plots ?? []}
          onClose={() => setPlotMarkingFarm(null)}
          onSave={(plot) => {
            toast.success(`Plot "${plot.plot_number}" saved — ${plot.coordinates.length} points · ${plot.acres} acres`);
          }}
        />
      )}

      {/* Investment Ledger Modal */}
      {ledgerFarm && (
        <FarmInvestmentLedgerModal
          farm={ledgerFarm}
          onClose={() => setLedgerFarm(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FARM INVESTMENT LEDGER MODAL
// ─────────────────────────────────────────────────────────────
const FarmInvestmentLedgerModal = ({
  farm,
  onClose,
}: {
  farm: Farm;
  onClose: () => void;
}) => {
  const ledger = farm.farm_investment_ledger ?? [];
  const totalAmt = ledger.reduce((s, e) => s + (e.amount ?? 0), 0);
  const location = [farm.land_data?.village, farm.land_data?.district, farm.land_data?.state]
    .filter(Boolean).join(', ');

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <h2 className="text-lg font-bold text-gray-900">Investment Ledger</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{location || farm.farm_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total Investment</p>
              <p className="text-xl font-extrabold text-rose-600">
                ₹{totalAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {ledger.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No investment entries yet</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[100px]">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[160px]">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[90px]">Item Code</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 min-w-[60px]">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-rose-600 min-w-[100px]">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry, idx) => (
                  <tr key={entry.voucher_number || idx} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{entry.item_description?.item_name?.trim() || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{entry.item_description?.item_code || '—'}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{entry.item_description?.item_unit || entry.unit || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[220px]">
                      <span className="line-clamp-2" title={entry.description}>{entry.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">
                      ₹{(entry.amount ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-700">
                    ₹{totalAmt.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FarmDirectory;
