import { useState } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Map,
  Sprout,
  Wheat,
  Leaf,
  Wallet,
  NotebookText,
  LayoutGrid,
  Layers,
  TreePine,
  TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CropType = 'napier' | 'paddy' | 'ragi' | '';

type LandCard = {
  id: string;
  farmName: string;
  location: string;
  village: string;
  district: string;
  state: string;
  block: string;
  cropType: CropType;
  acres: number;
  leaseStart: string;
  leaseEnd: string;
  leaseAmount: number;
  status: 'Active' | 'Expired' | 'Pending';
  images: string[];
  video: string;
  coordinates: [number, number][];
  farmerName: string;
};

const MOCK_LANDS: LandCard[] = [
  {
    id: 'FLD-001',
    farmName: 'Rampur North Block',
    location: 'Rampur, Bilaspur, Chhattisgarh',
    village: 'Rampur',
    district: 'Bilaspur',
    state: 'Chhattisgarh',
    block: 'Block A',
    cropType: 'napier',
    acres: 12.5,
    leaseStart: '2023-04-01',
    leaseEnd: '2026-03-31',
    leaseAmount: 18000,
    status: 'Active',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Ramnath Patel',
  },
  {
    id: 'FLD-002',
    farmName: 'Seoni East Farm',
    location: 'Seoni, Seoni, Madhya Pradesh',
    village: 'Seoni',
    district: 'Seoni',
    state: 'Madhya Pradesh',
    block: 'Block B',
    cropType: 'paddy',
    acres: 8.0,
    leaseStart: '2022-06-15',
    leaseEnd: '2025-06-14',
    leaseAmount: 14500,
    status: 'Active',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Shyam Verma',
  },
  {
    id: 'FLD-003',
    farmName: 'Durg South Plot',
    location: 'Durg, Durg, Chhattisgarh',
    village: 'Durg',
    district: 'Durg',
    state: 'Chhattisgarh',
    block: 'Block C',
    cropType: 'ragi',
    acres: 6.75,
    leaseStart: '2021-01-10',
    leaseEnd: '2024-01-09',
    leaseAmount: 12000,
    status: 'Expired',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Lalita Bai',
  },
  {
    id: 'FLD-004',
    farmName: 'Korba West Field',
    location: 'Korba, Korba, Chhattisgarh',
    village: 'Korba',
    district: 'Korba',
    state: 'Chhattisgarh',
    block: 'Block A',
    cropType: 'napier',
    acres: 15.0,
    leaseStart: '2024-03-01',
    leaseEnd: '2027-02-28',
    leaseAmount: 22000,
    status: 'Active',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Mohan Singh',
  },
  {
    id: 'FLD-005',
    farmName: 'Jagdalpur Central',
    location: 'Jagdalpur, Bastar, Chhattisgarh',
    village: 'Jagdalpur',
    district: 'Bastar',
    state: 'Chhattisgarh',
    block: 'Block D',
    cropType: 'paddy',
    acres: 10.25,
    leaseStart: '2024-07-01',
    leaseEnd: '2027-06-30',
    leaseAmount: 16500,
    status: 'Pending',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Geeta Yadav',
  },
  {
    id: 'FLD-006',
    farmName: 'Raipur Outer Ring',
    location: 'Raipur, Raipur, Chhattisgarh',
    village: 'Raipur',
    district: 'Raipur',
    state: 'Chhattisgarh',
    block: 'Block B',
    cropType: 'napier',
    acres: 9.5,
    leaseStart: '2023-09-15',
    leaseEnd: '2026-09-14',
    leaseAmount: 19000,
    status: 'Active',
    images: [],
    video: '',
    coordinates: [],
    farmerName: 'Suresh Kumar',
  },
];

const cropMeta: Record<Exclude<CropType, ''>, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  napier: { label: 'Napier', Icon: Leaf, color: 'text-green-700 bg-green-50 ring-green-100' },
  paddy: { label: 'Paddy', Icon: Wheat, color: 'text-yellow-700 bg-yellow-50 ring-yellow-100' },
  ragi: { label: 'Ragi', Icon: Sprout, color: 'text-orange-700 bg-orange-50 ring-orange-100' },
};

const statusMeta: Record<LandCard['status'], { color: string }> = {
  Active: { color: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
  Expired: { color: 'text-red-700 bg-red-50 ring-red-100' },
  Pending: { color: 'text-amber-700 bg-amber-50 ring-amber-100' },
};

const FarmDirectory = () => {
  const [search, setSearch] = useState('');

  const filtered = MOCK_LANDS.filter((land) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      land.farmName.toLowerCase().includes(q) ||
      land.village.toLowerCase().includes(q) ||
      land.district.toLowerCase().includes(q) ||
      land.farmerName.toLowerCase().includes(q) ||
      land.block.toLowerCase().includes(q)
    );
  });

  const totalArea = MOCK_LANDS.reduce((sum, l) => sum + l.acres, 0);
  const totalActive = MOCK_LANDS.filter((l) => l.status === 'Active').length;
  const totalBlocks = new Set(MOCK_LANDS.map((l) => l.block)).size;
  const totalLeaseValue = MOCK_LANDS.filter((l) => l.status === 'Active').reduce((sum, l) => sum + l.leaseAmount, 0);

  const kpis = [
    { label: 'Total Farms', value: MOCK_LANDS.length, icon: LayoutGrid, color: 'text-primary' },
    { label: 'Total Area', value: `${totalArea.toLocaleString('en-IN')} acres`, icon: Layers, color: 'text-blue-600' },
    { label: 'Active Leases', value: totalActive, icon: TreePine, color: 'text-emerald-600' },
    { label: 'Total Blocks', value: totalBlocks, icon: Map, color: 'text-violet-600' },
    { label: 'Annual Lease Value', value: `₹${totalLeaseValue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Farm Directory</h1>
          <p className="text-muted-foreground mt-1">All registered land parcels and their details</p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <span className="text-base leading-none">+</span>
          Add Land
        </Button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by farm name, village, farmer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* ── Land Cards Grid ── */}
      <div className="flex flex-wrap gap-5">
        {filtered.map((land) => {
          const now = Date.now();
          const startMs = new Date(land.leaseStart).getTime();
          const endMs = new Date(land.leaseEnd).getTime();
          const hasRange = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
          const progressPct = hasRange
            ? Math.max(0, Math.min(100, ((now - startMs) / (endMs - startMs)) * 100))
            : 0;

          const crop = land.cropType ? cropMeta[land.cropType] : null;
          const statusStyle = statusMeta[land.status];

          return (
            <div
              key={land.id}
              className="w-[340px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md shrink-0"
            >
              {/* Map / Media area */}
              <div className="h-[140px] w-full bg-gray-100 relative overflow-hidden flex items-center justify-center">
                <Map className="h-10 w-10 text-gray-300" />
                <div className="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] px-2 py-1 inline-flex items-center gap-1">
                  <Map className="h-3 w-3" />
                  Land Mapping
                </div>
                {/* Status badge */}
                <div className={`absolute top-2 left-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusStyle.color}`}>
                  {land.status}
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                {/* Farm name + block */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-gray-950 leading-5">{land.farmName}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground font-medium">{land.id}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {land.block}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{land.location}</span>
                </div>

                {/* Farmer + Crop row */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Farmer: <span className="font-semibold text-gray-800">{land.farmerName}</span>
                  </div>
                  {crop && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${crop.color}`}>
                      <crop.Icon className="h-3 w-3" />
                      {crop.label}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">Acres</div>
                    <div className="text-sm font-bold text-gray-950">{land.acres.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <div className="text-[11px] text-emerald-700">Lease / Annum</div>
                    <div className="text-sm font-bold text-emerald-800">₹{land.leaseAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Lease timeline */}
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Lease Tenure Timeline
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1 text-muted-foreground">
                    <span>{land.leaseStart}</span>
                    <span>{Math.round(progressPct)}%</span>
                    <span>{land.leaseEnd}</span>
                  </div>
                </div>

                {/* Land Media */}
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Land Media
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="h-14 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                      >
                        {land.images[idx] ? (
                          <img src={land.images[idx]} alt={`Land ${idx + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No image</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
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
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Investments
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Land placeholder card */}
        <button
          type="button"
          className="w-[340px] min-h-[430px] rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 transition flex flex-col items-center justify-center gap-3 shrink-0"
        >
          <div className="h-14 w-14 rounded-full border border-gray-300 flex items-center justify-center text-3xl text-gray-400">+</div>
          <div className="text-sm font-medium text-gray-600">Add New Land</div>
          <div className="text-xs text-muted-foreground">Click to register a new land parcel</div>
        </button>
      </div>
    </div>
  );
};

export default FarmDirectory;
