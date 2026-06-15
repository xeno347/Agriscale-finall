import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  PackageCheck,
  History,
  Boxes,
  X,
  Upload,
  Trash2,
  ChevronDown,
  AlertTriangle,
  ClipboardList,
  Undo2,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type StockTransaction = {
  id: string;
  type: 'incoming' | 'outgoing' | 'issued' | 'adjustment';
  qty: number;
  date: string;
  note: string;
  by: string;
  costPerUnit?: number;
};

type StockItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  unit: string;
  currentStock: number;
  stockInPipeline?: number;
  minStock: number;
  imageUrl: string;
  location: string;
  description: string;
  // Vendor tiers (L1, L2, L3)
  vendors: {
    level: string;
    company: string;
    msmeCertificate: string;
    gstNumber: string;
    contact?: string;
  }[];
  // Series number like SBR/INV/P2/
  seriesNumber: string;
  transactions: StockTransaction[];
  fifoList?: { stock: number; per_unit_cost: number; po_number: string }[];
};

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  'All',
  'Seeds',
  'Fertilizer',
  'Agro Chemicals',
  'Implements',
  'Machines',
  'Spare Parts',
  'Tools & Consumables',
  'Irrigation Materials',
  'Packaging Material',
  'Agro Equipments',
  'Electrical items',
  'Civil & Infra Equipments',
  'Storage Materials',
  'IT Assets',
  'Office & Administration',
  'Others',
];
const UNITS = ['KGS', 'Nos', 'L', 'ML', 'Grams', 'Tons', 'BAGS'];
const INVENTORY_LOCATIONS = [
  'Warehouse A',
  'Warehouse B',
  'Cold Storage',
  'Chemical Store',
  'Equipment Room',
  'Irrigation Store',
];
// Category code map with normalization helper.
// Keys in the raw map may vary; we'll normalize lookup to handle variants (case, & vs and, plurals).
const CATEGORY_CODE_MAP_RAW: Record<string, string> = {
  // canonical category labels
  'Seeds': 'SED',
  'Fertilizer': 'FRT',
  'Fertilizers': 'FRT',
  'Agro Chemicals': 'AGC',
  'Implements': 'IMP',
  'Machines': 'MAC',
  'Spare Parts': 'SPR',
  'Tools & Consumables': 'TNC',
  'Tools and Consumables': 'TNC',
  'Tools': 'TNC',
  'Irrigation Materials': 'IRM',
  'Irrigation materials': 'IRM',
  'Packaging Material': 'PKG',
  'Packaging': 'PKG',
  'Agro Equipments': 'AGE',
  'Agro equipments': 'AGE',
  'Agro Equipment': 'AGE',
  'Equipment': 'EQP',
  'Equipments': 'EQP',
  'Electrical items': 'ELC',
  'Electrical Items': 'ELC',
  'Civil & Infra Equipments': 'CIV',
  'Civil and Infra Equipments': 'CIV',
  'Storage Materials': 'STR',
  'IT Assets': 'ITA',
  'IT assets': 'ITA',
  'Office & Administration': 'OFF',
  'Office and Administration': 'OFF',
  'Office and administratin': 'OFF',
  'Pesticides': 'PST',
  'Others': 'OTH',
};

const normalizeCategoryKey = (s: string) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '').trim();

const CATEGORY_CODE_MAP: Record<string, string> = Object.keys(CATEGORY_CODE_MAP_RAW).reduce((acc, k) => {
  acc[normalizeCategoryKey(k)] = CATEGORY_CODE_MAP_RAW[k];
  return acc;
}, {} as Record<string, string>);

const getCategoryCode = (category: string) => {
  if (!category) return 'OTH';
  const key = normalizeCategoryKey(category);
  return CATEGORY_CODE_MAP[key] || 'OTH';
};

const PLACEHOLDER_IMG =
  'https://placehold.co/300x200/e2e8f0/64748b?text=No+Image';
const BASE_URL = getBaseUrl().replace(/\/$/, '');

const initialItems: StockItem[] = [
  {
    id: '1',
    name: 'Urea Fertilizer',
    category: 'Fertilizers',
    sku: 'FRT-001',
    unit: 'kg',
    currentStock: 1200,
    stockInPipeline: 0,
    minStock: 200,
    imageUrl: 'https://placehold.co/300x200/dcfce7/16a34a?text=Urea+Fertilizer',
    location: 'Warehouse A – Shelf 3',
    description: '46% Nitrogen fertilizer, granular form.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't1', type: 'incoming', qty: 500, date: '2026-02-10', note: 'Supplier delivery', by: 'Ramesh K.' },
      { id: 't2', type: 'outgoing', qty: 100, date: '2026-02-14', note: 'Field B application', by: 'Suresh P.' },
      { id: 't3', type: 'issued', qty: 200, date: '2026-02-18', note: 'Issued to cultivation team', by: 'Mohan V.' },
    ],
  },
  {
    id: '2',
    name: 'Paddy Seeds (IR-36)',
    category: 'Seeds',
    sku: 'SED-012',
    unit: 'kg',
    currentStock: 85,
    stockInPipeline: 0,
    minStock: 100,
    imageUrl: 'https://placehold.co/300x200/fef9c3/ca8a04?text=Paddy+Seeds',
    location: 'Cold Storage – Bay 1',
    description: 'High-yield IR-36 paddy seed variety.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't4', type: 'incoming', qty: 300, date: '2026-01-20', note: 'ICAR purchase', by: 'Admin' },
      { id: 't5', type: 'issued', qty: 215, date: '2026-02-01', note: 'Kharif season sowing', by: 'Anil D.' },
    ],
  },
  {
    id: '3',
    name: 'Chlorpyrifos 20% EC',
    category: 'Pesticides',
    sku: 'PST-007',
    unit: 'litre',
    currentStock: 340,
    stockInPipeline: 0,
    minStock: 50,
    imageUrl: 'https://placehold.co/300x200/fee2e2/dc2626?text=Chlorpyrifos',
    location: 'Chemical Store – Rack 2',
    description: 'Broad-spectrum organophosphate insecticide.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't6', type: 'incoming', qty: 200, date: '2026-02-05', note: 'BAYER supply', by: 'Admin' },
      { id: 't7', type: 'outgoing', qty: 60, date: '2026-02-22', note: 'Pest control – Block C', by: 'Rajan T.' },
    ],
  },
  {
    id: '4',
    name: 'Power Sprayer (Knapsack)',
    category: 'Equipment',
    sku: 'EQP-043',
    unit: 'units',
    currentStock: 12,
    stockInPipeline: 0,
    minStock: 3,
    imageUrl: 'https://placehold.co/300x200/dbeafe/1d4ed8?text=Power+Sprayer',
    location: 'Equipment Room – Row A',
    description: '16L battery-operated agricultural sprayer.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't8', type: 'incoming', qty: 5, date: '2026-01-15', note: 'New procurement', by: 'Procurement' },
      { id: 't9', type: 'issued', qty: 3, date: '2026-02-12', note: 'Issued to field team', by: 'Suresh P.' },
    ],
  },
  {
    id: '5',
    name: 'HDPE Bags (50kg)',
    category: 'Packaging',
    sku: 'PKG-021',
    unit: 'bags',
    currentStock: 2500,
    stockInPipeline: 0,
    minStock: 500,
    imageUrl: 'https://placehold.co/300x200/f3e8ff/7c3aed?text=HDPE+Bags',
    location: 'Warehouse B – Pallet 5',
    description: 'Woven polypropylene bags for grain storage.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't10', type: 'incoming', qty: 1000, date: '2026-02-01', note: 'Bulk supply', by: 'Admin' },
    ],
  },
  {
    id: '6',
    name: 'Drip Tape Roll (16mm)',
    category: 'Tools',
    sku: 'TLS-031',
    unit: 'rolls',
    currentStock: 38,
    stockInPipeline: 0,
    minStock: 10,
    imageUrl: 'https://placehold.co/300x200/ecfdf5/059669?text=Drip+Tape',
    location: 'Irrigation Store – Shelf 1',
    description: '16mm inline drip tape, 200m per roll.',
    vendors: [],
    seriesNumber: 'SBR/INV/P2/',
    transactions: [
      { id: 't11', type: 'incoming', qty: 20, date: '2026-02-08', note: 'Order #4412', by: 'Procurement' },
      { id: 't12', type: 'issued', qty: 2, date: '2026-02-20', note: 'New drip layout – Field D', by: 'Mohan V.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────
const genId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().split('T')[0];

const txBadge: Record<StockTransaction['type'], { label: string; color: string }> = {
  incoming: { label: 'Incoming', color: 'bg-green-100 text-green-700' },
  outgoing: { label: 'Outgoing', color: 'bg-red-100 text-red-700' },
  issued: { label: 'Issued', color: 'bg-blue-100 text-blue-700' },
  adjustment: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-700' },
};

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
const Inventory = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [alertPanelOpen, setAlertPanelOpen] = useState(true);
  const prevStockRef = useRef<Record<string, number>>({});
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [updateStockItem, setUpdateStockItem] = useState<StockItem | null>(null);
  const [ledgerItem, setLedgerItem] = useState<StockItem | null>(null);
  const [requestStockOpen, setRequestStockOpen] = useState(false);
  const [requestStockItems, setRequestStockItems] = useState<StockItem[]>([]);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [issuedItemsOpen, setIssuedItemsOpen] = useState(false);
  const [incomingItem, setIncomingItem] = useState<StockItem | null>(null);
  const [outgoingItem, setOutgoingItem] = useState<StockItem | null>(null);
  const [returnEntryItem, setReturnEntryItem] = useState<StockItem | null>(null);
  const [damageItem, setDamageItem] = useState<StockItem | null>(null);
  const [issuedItem, setIssuedItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [openLedgersCount, setOpenLedgersCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAllItems = async () => {
      try {
        const res = await fetch(`${BASE_URL}/inventory/get_all_item`);
        const data: any = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !Array.isArray(data?.items)) {
          throw new Error(data?.message || 'Failed to fetch inventory items');
        }

        const mapped: StockItem[] = data.items.map((it: any, idx: number) => {
          const stockHistory: StockTransaction[] = Array.isArray(it?.stock_history)
            ? it.stock_history.map((entry: any) => {
                const ts = String(entry?.timestamp ?? '');
                const date = ts.includes('T') ? ts.split('T')[0] : ts || today();
                const po = String(entry?.po_number ?? '');
                const cost = entry?.per_unit_cost != null
                  ? `₹${Number(entry.per_unit_cost).toLocaleString('en-IN')}/unit`
                  : null;
                const note = [po ? `PO: ${po}` : '', cost].filter(Boolean).join(' · ');
                return {
                  id: `sh-${po}-${ts}`,
                  type: 'incoming' as const,
                  qty: Number(entry?.stock) || 0,
                  date,
                  note,
                  by: '',
                  costPerUnit: entry?.per_unit_cost != null ? Number(entry.per_unit_cost) : undefined,
                };
              })
            : [];

          return {
            id: String(it?.Invent_id || it?.new_item_code || `inv_${idx}`),
            name: String(it?.item_name || ''),
            category: String(it?.category || 'Others'),
            sku: String(it?.new_item_code || ''),
            unit: String(it?.unit || ''),
            currentStock: Number(it?.stock) || 0,
            stockInPipeline: Number(it?.stock_in_pipeline || it?.pipeline_stock || 0),
            minStock: Number(it?.threshold) || 0,
            imageUrl: String(it?.item_image_url || ''),
            location: String(it?.location || ''),
            description: String(it?.description || ''),
            vendors: [],
            seriesNumber: '',
            transactions: stockHistory,
            fifoList: Array.isArray(it?.fifo_list)
              ? it.fifo_list.map((e: any) => ({
                  stock: Number(e?.stock) || 0,
                  per_unit_cost: Number(e?.per_unit_cost) || 0,
                  po_number: String(e?.po_number || ''),
                }))
              : [],
          };
        });

        setItems(mapped);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load inventory items');
      }
    };

    fetchAllItems();
  }, []);

  useEffect(() => {
    const fetchOpenLedgers = async () => {
      try {
        const res = await fetch(`${BASE_URL}/inventory/get_issue_requests`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data?.issue_requests)) {
          const count = data.issue_requests.filter(
            (r: any) => r.status === 'pending' || r.status === 'issued',
          ).length;
          setOpenLedgersCount(count);
        }
      } catch {
        // silently fail — KPI shows '—'
      }
    };
    fetchOpenLedgers();
  }, []);

  // ── Low stock derived list ───────────────────────────────
  const lowStockItems = useMemo(
    () => items.filter((i) => i.currentStock < i.minStock && !dismissedAlerts.has(i.id)),
    [items, dismissedAlerts],
  );

  const inventoryValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const val = (item.fifoList ?? []).reduce((s, e) => s + e.stock * e.per_unit_cost, 0);
        return sum + val;
      }, 0),
    [items],
  );

  // ── Toast when an item crosses the low-stock threshold ──
  useEffect(() => {
    const prev = prevStockRef.current;
    items.forEach((item) => {
      const wasOk = prev[item.id] === undefined || prev[item.id] >= item.minStock;
      const isLow = item.currentStock < item.minStock;
      if (wasOk && isLow && !dismissedAlerts.has(item.id)) {
        toast.warning(`Low stock: ${item.name} is below minimum (${item.currentStock} / ${item.minStock} ${item.unit})`, {
          duration: 6000,
        });
      }
      prev[item.id] = item.currentStock;
    });
    prevStockRef.current = prev;
  }, [items]);

  // ── Filtered items ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch =
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, search, activeCategory]);

  // ── Helpers to mutate items ─────────────────────────────
  const addTransaction = (itemId: string, tx: Omit<StockTransaction, 'id'>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const delta =
          tx.type === 'incoming' ? tx.qty
          : tx.type === 'adjustment' ? tx.qty
          : -tx.qty;
        return {
          ...it,
          currentStock: Math.max(0, it.currentStock + delta),
          transactions: [{ ...tx, id: genId() }, ...it.transactions],
        };
      }),
    );
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track stock levels, manage incoming & outgoing goods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIssuedItemsOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Issue Items
          </Button>
          <Button
            onClick={() => setAllocationOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            Equipment Allocation
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Product
          </Button>
        </div>
      </div>

      {/* ── Low Stock Alert Panel ── */}
      {lowStockItems.length > 0 && alertPanelOpen && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-200 bg-red-100/60">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum stock level
              </span>
            </div>
            <button
              onClick={() => setAlertPanelOpen(false)}
              className="text-red-400 hover:text-red-700 transition-colors"
              title="Dismiss all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-red-100">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-100/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku} · {item.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Stock / Min</p>
                    <p className="text-sm font-bold text-red-600">
                      {item.currentStock}
                      <span className="text-gray-400 font-normal"> / {item.minStock} {item.unit}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setDismissedAlerts((prev) => new Set([...prev, item.id]))}
                    className="text-red-300 hover:text-red-600 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, SKU or category…"
          className="pl-9 bg-white border-gray-200 shadow-sm h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              activeCategory === cat
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Total Inventory Value */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 text-green-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Inventory Value</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            ₹{inventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Based on FIFO cost</p>
        </div>

        {/* Total Items */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Boxes className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Total Items</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{items.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{new Set(items.map((i) => i.category)).size} categories</p>
        </div>

        {/* Open Ledgers */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Open Ledgers</p>
          </div>
          <p className="text-xl font-bold text-violet-600">
            {openLedgersCount ?? '—'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pending &amp; active issues</p>
        </div>

        {/* Low Stock */}
        <div
          className={cn(
            'bg-white rounded-xl border p-4 shadow-sm cursor-pointer hover:shadow-md transition-all',
            lowStockItems.length > 0 ? 'border-red-200 hover:border-red-300' : 'border-gray-100',
          )}
          onClick={() => { setDismissedAlerts(new Set()); setAlertPanelOpen(true); }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center',
              lowStockItems.length > 0 ? 'bg-red-50' : 'bg-gray-50',
            )}>
              <AlertTriangle className={cn('w-3.5 h-3.5', lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
            <p className="text-xs font-medium text-gray-500">Low Stock</p>
          </div>
          <p className={cn('text-xl font-bold', lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-900')}>
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Below minimum threshold</p>
        </div>
      </div>

      {/* ── Restore alerts link ── */}
      {(!alertPanelOpen || dismissedAlerts.size > 0) && items.some((i) => i.currentStock < i.minStock) && (
        <button
          onClick={() => { setDismissedAlerts(new Set()); setAlertPanelOpen(true); }}
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          {items.filter((i) => i.currentStock < i.minStock).length} low-stock alert{items.filter((i) => i.currentStock < i.minStock).length > 1 ? 's' : ''} hidden — click to restore
        </button>
      )}

      {/* ── Card Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Boxes className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm">Try a different search or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => setEditItem(item)}
              onUpdateStock={() => {
                setRequestStockItems([item]);
                setRequestStockOpen(true);
              }}
              onLedger={() => setLedgerItem(item)}
              onDamage={() => setDamageItem(item)}
              onReturnEntry={() => setReturnEntryItem(item)}
              onHistory={() => { setHistoryItem(item); setHistoryFilter('all'); }}
              onDelete={() => setDeleteItem(item)}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════ */}

      {/* Add New Stock */}
      <AddStockModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (data, imageFile, openingStocks) => {
          try {
            let itemImageUrl = '';
            if (imageFile) {
              const formData = new FormData();
              formData.append('doc', imageFile);
              const uploadRes = await fetch(`${BASE_URL}/inventory/upload_item_image`, {
                method: 'POST',
                body: formData,
              });
              const uploadData: any = await uploadRes.json().catch(() => null);
              if (!uploadRes.ok || !uploadData?.success || !uploadData?.public_url) {
                throw new Error(uploadData?.message || 'Failed to upload item image');
              }
              itemImageUrl = String(uploadData.public_url);
            }

            const validEntries = openingStocks.filter((e) => Number(e.quantity) > 0);

            const createPayload: Record<string, unknown> = {
              item_name: data.name,
              new_item_code: data.sku,
              category: data.category,
              location: data.location,
              unit: data.unit,
              threshold: Number(data.minStock) || 0,
              item_image_url: itemImageUrl,
              description: data.description || '',
            };

            if (validEntries.length > 0) {
              const fifoList = validEntries.map((e) => ({
                stock: Number(e.quantity),
                per_unit_cost: Number(e.costPerUnit) || 0,
                po_number: e.poNumber || '',
              }));
              createPayload.total_opening_stock = fifoList.reduce((sum, e) => sum + e.stock, 0);
              createPayload.fifo_list = fifoList;
            }

            const createRes = await fetch(`${BASE_URL}/inventory/create_new_item`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload),
            });
            const createData: any = await createRes.json().catch(() => null);
            if (!createRes.ok || !createData?.success) {
              throw new Error(createData?.message || 'Failed to create item');
            }

            setItems((prev) => [
              {
                ...data,
                imageUrl: itemImageUrl || data.imageUrl,
                id: genId(),
                transactions: [],
              },
              ...prev,
            ]);
            setAddOpen(false);
            toast.success(createData?.message || `"${data.name}" added to inventory`);
          } catch (e: any) {
            toast.error(e?.message || 'Failed to create item');
            throw e;
          }
        }}
      />

      {/* Edit Item */}
      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditItem(null);
            toast.success('Item updated');
          }}
        />
      )}

      {/* Update Stock (manual adjustment) */}
      {updateStockItem && (
        <TransactionModal
          title="Update Stock (Adjustment)"
          item={updateStockItem}
          txType="adjustment"
          description="Manually correct the current stock level."
          qtyLabel="Adjustment Qty (+/-)"
          onClose={() => setUpdateStockItem(null)}
          onSave={(tx) => {
            addTransaction(updateStockItem.id, tx);
            setUpdateStockItem(null);
            toast.success('Stock adjusted');
          }}
        />
      )}

      {/* Ledger */}
      {ledgerItem && (
        <LedgerModal item={ledgerItem} onClose={() => setLedgerItem(null)} />
      )}

      <RequestStockModal
        open={requestStockOpen}
        onClose={() => setRequestStockOpen(false)}
        selectedItems={requestStockItems}
        onChangeSelectedItems={setRequestStockItems}
        allItems={items}
        onContinue={() => {
          const payloadItems = requestStockItems.map((it) => ({
            itemCode: it.sku,
            uom: it.unit,
            itemName: it.name,
            stock: it.currentStock,
          }));
          setRequestStockOpen(false);
          navigate('/inventory-indents', {
            state: {
              fromInventoryRequest: true,
              items: payloadItems,
            },
          });
        }}
      />

      <EquipmentAllocationModal
        open={allocationOpen}
        items={items}
        onAllocationSuccess={(itemId, quantity) => {
          setItems((prev) =>
            prev.map((stockItem) =>
              stockItem.id === itemId
                ? { ...stockItem, currentStock: Math.max(0, stockItem.currentStock - quantity) }
                : stockItem,
            ),
          );
        }}
        onClose={() => setAllocationOpen(false)}
      />

      {/* Incoming Request */}
      {incomingItem && (
        <TransactionModal
          title="Incoming Stock"
          item={incomingItem}
          txType="incoming"
          description="Record stock received from a supplier or transfer."
          qtyLabel="Quantity Received"
          onClose={() => setIncomingItem(null)}
          onSave={(tx) => {
            addTransaction(incomingItem.id, tx);
            setIncomingItem(null);
            toast.success('Incoming stock recorded');
          }}
        />
      )}

      {/* Outgoing Stock */}
      {outgoingItem && (
        <TransactionModal
          title="Outgoing Stock"
          item={outgoingItem}
          txType="outgoing"
          description="Record stock dispatched or transferred out."
          qtyLabel="Quantity Dispatched"
          onClose={() => setOutgoingItem(null)}
          onSave={(tx) => {
            addTransaction(outgoingItem.id, tx);
            setOutgoingItem(null);
            toast.success('Outgoing stock recorded');
          }}
        />
      )}

      {/* Return Entry */}
      {returnEntryItem && (
        <ReturnEntryModal
          item={returnEntryItem}
          onClose={() => setReturnEntryItem(null)}
        />
      )}

      {/* Damage Entry */}
      {damageItem && (
        <DamageEntryModal
          item={damageItem}
          onClose={() => setDamageItem(null)}
        />
      )}

      {/* Issued Stock */}
      {issuedItem && (
        <TransactionModal
          title="Issue Stock"
          item={issuedItem}
          txType="issued"
          description="Issue stock to a team or field operation."
          qtyLabel="Quantity Issued"
          onClose={() => setIssuedItem(null)}
          onSave={(tx) => {
            addTransaction(issuedItem.id, tx);
            setIssuedItem(null);
            toast.success('Stock issued');
          }}
        />
      )}

      {/* History */}
      {historyItem && (
        <HistoryModal
          item={historyItem}
          filterType={historyFilter}
          onClose={() => { setHistoryItem(null); setHistoryFilter('all'); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteItem && (
        <DeleteConfirmModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => {
            setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
            setDeleteItem(null);
            toast.success(`"${deleteItem.name}" removed from inventory`);
          }}
        />
      )}

      {/* Issued Items */}
      <IssuedItemsModal
        open={issuedItemsOpen}
        items={items}
        onClose={() => setIssuedItemsOpen(false)}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LEDGER MODAL
// ─────────────────────────────────────────────────────────────
type LedgerEntry = {
  quantity: number;
  date: string;
  lock_status?: string;
  input_id: string;
  per_unit_cost: number;
  output: number;
  returned?: number;
  input: number;
  amount: number;
  balance?: number;
  equipment_id: string;
  description: string;
};

const LedgerModal = ({ item, onClose }: { item: StockItem; onClose: () => void }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${BASE_URL}/inventory/get_item_ledger/${item.id}`);
        const data: any = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !Array.isArray(data?.ledger)) {
          throw new Error(data?.message || 'Failed to fetch ledger');
        }
        setEntries(data.ledger);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [item.id]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const getParticulars = (e: LedgerEntry) => {
    if (e.input > 0) return 'Goods Received';
    if (e.output > 0) return 'Stock Issued';
    return 'Stock Adjustment';
  };

  const getRef = (e: LedgerEntry) => {
    const m = e.description.match(/TASK-[A-Z0-9]+/);
    return m ? m[0] : e.equipment_id;
  };

  const getVoucherNo = (e: LedgerEntry, idx: number) => {
    const n = String(idx + 1).padStart(3, '0');
    if (e.input > 0)  return `GRN-${n}`;
    if (e.output > 0) return `ISS-${n}`;
    return `ADJ-${n}`;
  };

  const totalReceived = entries.reduce((s, e) => s + e.input, 0);
  const totalIssued   = entries.reduce((s, e) => s + e.output, 0);
  const totalAmount   = entries.reduce((s, e) => s + e.amount, 0);
  const lastDate      = entries.length > 0 ? fmtDate(entries[entries.length - 1].date) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Stock Ledger</h2>
            <p className="text-sm text-gray-400 mt-0.5">Summary of stock received, issued and balance.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              {item.name} · <span className="font-medium text-gray-700">{item.sku}</span>
            </span>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Table area */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-2 text-sm text-gray-400">
              <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Loading ledger…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-red-500 gap-2">
              <AlertTriangle className="w-8 h-8 opacity-50" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No ledger entries yet</p>
              <p className="text-xs mt-1">Entries will appear here once allocations are created.</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[100px]">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[100px]">Voucher No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[200px]">Particulars / Narration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 min-w-[130px]">Ref. / Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600 min-w-[110px]">Received (Qty)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 min-w-[100px]">Issued (Qty)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 min-w-[110px]">Balance (Qty)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 min-w-[60px]">Unit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 min-w-[100px]">Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={`${entry.input_id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{fmtDate(entry.date)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-blue-600">{getVoucherNo(entry, idx)}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-sm font-semibold text-gray-900">{getParticulars(entry)}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1" title={entry.description}>{entry.description}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{getRef(entry)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {entry.input > 0
                        ? <span className="text-sm font-bold text-green-600">{entry.input.toLocaleString('en-IN')}</span>
                        : <span className="text-gray-300 text-sm">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {entry.output > 0
                        ? <span className="text-sm font-bold text-red-500">{entry.output.toLocaleString('en-IN')}</span>
                        : <span className="text-gray-300 text-sm">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {entry.balance != null
                        ? <span className="text-sm font-bold text-blue-600">{entry.balance.toLocaleString('en-IN')}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-gray-800">
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}

                {/* Total row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                    {totalReceived > 0 ? totalReceived.toLocaleString('en-IN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-500">
                    {totalIssued > 0 ? totalIssued.toLocaleString('en-IN') : '-'}
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: legend + closing stock card */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-end justify-between gap-6">
          <div className="space-y-1.5 text-xs text-gray-600">
            <p><span className="font-bold text-green-600">Received (Qty)</span> = Quantity added to stock</p>
            <p><span className="font-bold text-red-500">Issued (Qty)</span> = Quantity issued from stock</p>
            <p><span className="font-bold text-blue-500">Balance (Qty)</span> = Closing available quantity in stock</p>
            <p><span className="font-bold text-gray-700">Value (₹)</span> = Valuation of stock balance</p>
          </div>

          {entries.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 min-w-[230px] text-right shrink-0">
              <p className="text-xs font-semibold text-gray-500">Closing Stock Balance (Qty)</p>
              <p className="text-3xl font-extrabold text-blue-600 mt-1 leading-none">
                {item.currentStock.toLocaleString('en-IN')}
                <span className="text-base font-semibold text-blue-400 ml-1.5">{item.unit}</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">As on {lastDate}</p>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500">Closing Stock Value</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// INVENTORY CARD
// ─────────────────────────────────────────────────────────────
interface CardProps {
  item: StockItem;
  onEdit: () => void;
  onUpdateStock: () => void;
  onLedger: () => void;
  onDamage: () => void;
  onReturnEntry: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

const InventoryCard = ({
  item,
  onEdit,
  onUpdateStock,
  onLedger,
  onDamage,
  onReturnEntry,
  onHistory,
  onDelete,
}: CardProps) => {
  const isLow = item.currentStock < item.minStock;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-40 bg-gray-50 overflow-hidden">
        <img
          src={item.imageUrl || PLACEHOLDER_IMG}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
          }}
        />
        {isLow && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
          {item.category}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Name & SKU */}
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{item.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{item.sku} · {item.location}</p>
        </div>

        {/* Stock Level */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div>
            <p className="text-xs text-gray-400">Current Stock</p>
            <p className={cn('text-lg font-bold', isLow ? 'text-red-600' : 'text-gray-800')}>
              {item.currentStock.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">{item.unit}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Min Level</p>
            <p className="text-sm font-semibold text-gray-600">
              {item.minStock.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">{item.unit}</span>
            </p>
          </div>
        </div>

        {/* FIFO inventory value */}
        {(() => {
          const val = (item.fifoList ?? []).reduce((s, e) => s + e.stock * e.per_unit_cost, 0);
          if (val <= 0) return null;
          return (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-gray-400">Inventory Value</span>
              <span className="font-semibold text-green-700">
                ₹{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })()}

        {/* Stock bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={cn('h-1.5 rounded-full transition-all', isLow ? 'bg-red-500' : 'bg-green-500')}
            style={{ width: `${Math.min(100, (item.currentStock / (item.minStock * 3)) * 100)}%` }}
          />
        </div>

        {/* Primary action row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-2 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onUpdateStock}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-2 transition-colors"
          >
            <Boxes className="w-3.5 h-3.5" />
            Request Stock
          </button>
        </div>

        {/* Secondary action row */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onDamage}
            className="flex flex-col items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg py-2 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Damage
          </button>
          <button
            onClick={onReturnEntry}
            className="flex flex-col items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg py-2 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Return
          </button>
          <button
            onClick={onLedger}
            className="flex flex-col items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg py-2 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Ledger
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <button
            onClick={onHistory}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            View History ({item.transactions.length})
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ADD STOCK MODAL
// ─────────────────────────────────────────────────────────────
type OpeningStockEntry = {
  id: string;
  quantity: string;
  costPerUnit: string;
  poNumber: string;
};

type AddStockForm = Omit<StockItem, 'id' | 'transactions'>;
const emptyForm = (): AddStockForm => ({
  name: '',
  category: 'Seeds',
  sku: 'SBR/INV/SED/001',
  unit: 'KGS',
  currentStock: 0,
  minStock: 0,
  imageUrl: '',
  location: INVENTORY_LOCATIONS[0],
  description: '',
  vendors: [],
  seriesNumber: '',
});

const AddStockModal = ({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddStockForm, imageFile: File | null, openingStocks: OpeningStockEntry[]) => Promise<void> | void;
}) => {
  const [form, setForm] = useState<AddStockForm>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [openingStocks, setOpeningStocks] = useState<OpeningStockEntry[]>([]);

  const set = (k: keyof AddStockForm, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addOpeningStock = () =>
    setOpeningStocks((prev) => [...prev, { id: genId(), quantity: '', costPerUnit: '', poNumber: '' }]);

  const removeOpeningStock = (id: string) =>
    setOpeningStocks((prev) => prev.filter((e) => e.id !== id));

  const updateOpeningStock = (id: string, field: keyof Omit<OpeningStockEntry, 'id'>, value: string) =>
    setOpeningStocks((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  const generatedItemCode = useMemo(() => {
    const code = getCategoryCode(form.category);
    return `SBR/INV/${code}/001`;
  }, [form.category]);

  useEffect(() => {
    if (!open || !form.category) return;
    const fetchItemCode = async () => {
      const categoryCode = getCategoryCode(form.category);
      setCodeLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/inventory/get_new_item_code/${categoryCode}`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.new_item_code) {
          setForm((prev) => ({ ...prev, sku: String(data.new_item_code) }));
        } else {
          setForm((prev) => ({ ...prev, sku: generatedItemCode }));
        }
      } catch {
        setForm((prev) => ({ ...prev, sku: generatedItemCode }));
      } finally {
        setCodeLoading(false);
      }
    };
    fetchItemCode();
  }, [form.category, generatedItemCode, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Item name is required');
    setIsCreating(true);
    try {
      await onSave({
        ...form,
        sku: form.sku || generatedItemCode,
        seriesNumber: `SBR/INV/${getCategoryCode(form.category)}/`,
        vendors: [],
      }, imageFile, openingStocks);
      setForm(emptyForm());
      setImageFile(null);
      setOpeningStocks([]);
    } catch {
      // Error is already handled by parent onSave with toast.
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Create New Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field label="Product Name">
            <Input placeholder="e.g. Urea Fertilizer" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <SelectField
                value={form.category}
                options={CATEGORIES.filter((c) => c !== 'All')}
                onChange={(v) => set('category', v)}
              />
            </Field>
            <Field label="Item Code">
              <Input value={form.sku || generatedItemCode} readOnly className="bg-gray-50" />
              {codeLoading && <p className="text-[11px] text-gray-500 mt-1">Fetching item code...</p>}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit">
              <SelectField value={form.unit} options={UNITS} onChange={(v) => set('unit', v)} />
            </Field>
            <Field label="Location">
              <SelectField value={form.location} options={INVENTORY_LOCATIONS} onChange={(v) => set('location', v)} />
            </Field>
          </div>

          <Field label="Threshold Quantity">
            <Input type="number" min={0} value={form.minStock} onChange={(e) => set('minStock', Number(e.target.value))} />
          </Field>

          {/* ── Opening Stock ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">Opening Stock</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Add one or more opening stock entries</p>
              </div>
              <button
                type="button"
                onClick={addOpeningStock}
                className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            {openingStocks.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-3">No entries yet — click "Add Entry" to begin.</p>
            ) : (
              <div className="space-y-2">
                {openingStocks.map((entry, idx) => (
                  <div key={entry.id} className="rounded-lg bg-white border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Entry {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeOpeningStock(entry.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label={`Stock Qty (${form.unit || 'units'})`}>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={entry.quantity}
                          onChange={(e) => updateOpeningStock(entry.id, 'quantity', e.target.value)}
                        />
                      </Field>
                      <Field label="Cost / Unit (₹)">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={entry.costPerUnit}
                          onChange={(e) => updateOpeningStock(entry.id, 'costPerUnit', e.target.value)}
                        />
                      </Field>
                      <Field label="Supporting PO No.">
                        <Input
                          placeholder="PO-…"
                          value={entry.poNumber}
                          onChange={(e) => updateOpeningStock(entry.id, 'poNumber', e.target.value)}
                        />
                      </Field>
                    </div>
                    {entry.quantity && entry.costPerUnit && Number(entry.quantity) > 0 && Number(entry.costPerUnit) > 0 && (
                      <p className="text-[11px] text-green-700 font-medium">
                        Total value: ₹{(Number(entry.quantity) * Number(entry.costPerUnit)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Product Media (1 image)">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    setImageFile(file);
                    const url = URL.createObjectURL(file);
                    set('imageUrl', url);
                  }
                }}
              />
              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview" className="w-16 h-10 object-cover rounded-md border" />
              )}
            </div>
          </Field>

          <Field label="Description">
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              rows={3}
              placeholder="Short description…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// EDIT ITEM MODAL
// ─────────────────────────────────────────────────────────────
const EditItemModal = ({
  item,
  onClose,
  onSave,
}: {
  item: StockItem;
  onClose: () => void;
  onSave: (updated: StockItem) => void;
}) => {
  const [form, setForm] = useState<StockItem>(item);
  const set = (k: keyof StockItem, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            Edit Item – {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field label="Item Name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <SelectField
                value={form.category}
                options={CATEGORIES.filter((c) => c !== 'All')}
                onChange={(v) => set('category', v)}
              />
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit">
              <SelectField value={form.unit} options={UNITS} onChange={(v) => set('unit', v)} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Stock Level">
              <Input type="number" min={0} value={form.minStock} onChange={(e) => set('minStock', Number(e.target.value))} />
            </Field>
            <Field label="Image URL">
              <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onSave(form)}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// TRANSACTION MODAL  (incoming / outgoing / issued / adjustment)
// ─────────────────────────────────────────────────────────────
const TransactionModal = ({
  title,
  item,
  txType,
  description,
  qtyLabel,
  onClose,
  onSave,
}: {
  title: string;
  item: StockItem;
  txType: StockTransaction['type'];
  description: string;
  qtyLabel: string;
  onClose: () => void;
  onSave: (tx: Omit<StockTransaction, 'id'>) => void;
}) => {
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState('');
  const [by, setBy] = useState('');

  // Issue-specific state
  const [issueTo, setIssueTo] = useState('');
  const [issueFarm, setIssueFarm] = useState('');
  const [issueStartDate, setIssueStartDate] = useState('');
  const [issueEndDate, setIssueEndDate] = useState('');
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; designation: string }>>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [farmList, setFarmList] = useState<Array<{ id: string; label: string }>>([]);
  const [farmLoading, setFarmLoading] = useState(false);

  useEffect(() => {
    if (txType !== 'issued') return;
    const fetchStaff = async () => {
      setStaffLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/admin_staff/get_all_staff`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) {
          setStaffList(
            data.map((s: any) => ({
              id: String(s?.staff_id ?? ''),
              name: String(s?.staff_information?.staff_name ?? ''),
              designation: String(s?.staff_information?.staff_designation ?? ''),
            }))
          );
        }
      } catch {
        // staff list stays empty; user can still type
      } finally {
        setStaffLoading(false);
      }
    };
    const fetchFarms = async () => {
      setFarmLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/farmer_managment/get_farms`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.farms)) {
          setFarmList(
            data.farms.map((f: any) => ({
              id: String(f?.farm_id ?? ''),
              label: f?.land_data?.village
                ? `${f.farm_id} — ${f.land_data.village}`
                : String(f?.farm_id ?? ''),
            }))
          );
        }
      } catch {
        // farm list stays empty
      } finally {
        setFarmLoading(false);
      }
    };
    fetchStaff();
    fetchFarms();
  }, [txType]);

  const colorMap: Record<StockTransaction['type'], string> = {
    incoming: 'text-green-600',
    outgoing: 'text-red-600',
    issued: 'text-purple-600',
    adjustment: 'text-blue-600',
  };
  const btnMap: Record<StockTransaction['type'], string> = {
    incoming: 'bg-green-600 hover:bg-green-700',
    outgoing: 'bg-red-600 hover:bg-red-700',
    issued: 'bg-purple-600 hover:bg-purple-700',
    adjustment: 'bg-blue-600 hover:bg-blue-700',
  };

  const handleSave = () => {
    if (!qty || qty <= 0) return toast.error('Quantity must be greater than 0');
    if (txType === 'issued') {
      if (!issueTo) return toast.error('Please select a staff member');
      if (!issueFarm) return toast.error('Please select a farm');
      if (!issueStartDate || !issueEndDate) return toast.error('Please fill both issue dates');
      if (issueEndDate < issueStartDate) return toast.error('End date must be after start date');
      onSave({ type: txType, qty, date: issueStartDate, note: `${issueStartDate} → ${issueEndDate} | Farm: ${issueFarm}`, by: issueTo });
    } else {
      onSave({ type: txType, qty, date: today(), note, by });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', colorMap[txType])}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">{description}</p>

        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between mb-2">
          <div>
            <p className="font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-400">{item.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Current Stock</p>
            <p className="font-bold text-gray-800">{item.currentStock} {item.unit}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Field label={qtyLabel}>
            <Input
              type="number"
              min={txType === 'adjustment' ? undefined : 1}
              value={qty || ''}
              onChange={(e) => setQty(Number(e.target.value))}
              placeholder="0"
            />
          </Field>

          {txType === 'issued' ? (
            <>
              <Field label="Issue To (Staff)">
                <div className="relative">
                  <select
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                    value={issueTo}
                    onChange={(e) => setIssueTo(e.target.value)}
                    disabled={staffLoading}
                  >
                    <option value="">{staffLoading ? 'Loading staff…' : 'Select staff member'}</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}{s.designation ? ` — ${s.designation}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </Field>

              <Field label="Issued for Farm">
                <div className="relative">
                  <select
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                    value={issueFarm}
                    onChange={(e) => setIssueFarm(e.target.value)}
                    disabled={farmLoading}
                  >
                    <option value="">{farmLoading ? 'Loading farms…' : 'Select farm'}</option>
                    {farmList.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </Field>

              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-3 space-y-3">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Issue Timeline</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <Input
                      type="date"
                      value={issueStartDate}
                      onChange={(e) => setIssueStartDate(e.target.value)}
                    />
                  </Field>
                  <Field label="End Date">
                    <Input
                      type="date"
                      value={issueEndDate}
                      min={issueStartDate || undefined}
                      onChange={(e) => setIssueEndDate(e.target.value)}
                    />
                  </Field>
                </div>
                {issueStartDate && issueEndDate && issueEndDate >= issueStartDate && (
                  <p className="text-[11px] text-purple-600 font-medium">
                    Duration: {Math.round((new Date(issueEndDate).getTime() - new Date(issueStartDate).getTime()) / 86400000) + 1} day(s)
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <Field label="Performed By">
                <Input placeholder="Staff name" value={by} onChange={(e) => setBy(e.target.value)} />
              </Field>
              <Field label="Note / Reference">
                <Input placeholder="Purchase order, field, reason…" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className={cn(btnMap[txType], 'text-white')} onClick={handleSave}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RequestStockModal = ({
  open,
  onClose,
  selectedItems,
  onChangeSelectedItems,
  allItems,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  selectedItems: StockItem[];
  onChangeSelectedItems: (items: StockItem[]) => void;
  allItems: StockItem[];
  onContinue: () => void;
}) => {
  const [addMode, setAddMode] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setAddMode(false);
      setQuery('');
    }
  }, [open]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const selectedIds = new Set(selectedItems.map((i) => i.id));
    return allItems
      .filter((item) => !selectedIds.has(item.id))
      .filter((item) => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allItems, query, selectedItems]);

  const addItem = (item: StockItem) => {
    onChangeSelectedItems([...selectedItems, item]);
    setAddMode(false);
    setQuery('');
  };

  const removeItem = (itemId: string) => {
    onChangeSelectedItems(selectedItems.filter((i) => i.id !== itemId));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Request Stock
          </DialogTitle>
          <p className="text-sm text-gray-500">Add more items to request for stock</p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 py-2">
          {selectedItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <img
                    src={item.imageUrl || PLACEHOLDER_IMG}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover border border-gray-200 shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.sku}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.category} • {item.location}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3 min-h-[96px]">
            {!addMode ? (
              <button
                type="button"
                onClick={() => setAddMode(true)}
                className="w-full h-full min-h-[84px] flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-blue-600"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-medium">Add Item</span>
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Type item name or item code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                  {suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addItem(s)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={s.imageUrl || PLACEHOLDER_IMG}
                            alt={s.name}
                            className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-500 truncate">{s.sku}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-gray-500">No suggestions</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onContinue} disabled={selectedItems.length === 0}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type AllocationRowState = {
  quantity: number;
  providedQuantity: number;
  completed: boolean;
};

type AllocationItem = {
  equipment_name: string;
  equipment_id: string;
  quantity: number;
};

type AllocationDisplayRow = {
  itemId: string;
  itemName: string;
  quantity: number;
  availableStock: number;
  stockInPipeline: number;
};

const EquipmentAllocationModal = ({
  open,
  items,
  onAllocationSuccess,
  onClose,
}: {
  open: boolean;
  items: StockItem[];
  onAllocationSuccess: (itemId: string, quantity: number) => void;
  onClose: () => void;
}) => {
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [allocationItems, setAllocationItems] = useState<AllocationItem[]>([]);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [allocationError, setAllocationError] = useState('');
  const [completingItemId, setCompletingItemId] = useState('');
  const [rowState, setRowState] = useState<Record<string, AllocationRowState>>({});

  useEffect(() => {
    if (!open) {
      setOtp('');
      setVerified(false);
      setAllocationItems([]);
      setLoadingAllocation(false);
      setAllocationError('');
      setCompletingItemId('');
      setRowState({});
      return;
    }

    if (!verified) {
      setAllocationItems([]);
      setAllocationError('');
      setLoadingAllocation(false);
    }
  }, [open, verified]);

  useEffect(() => {
    if (!verified || otp.trim().length !== 4) return;

    const fetchAllocationItems = async () => {
      setLoadingAllocation(true);
      setAllocationError('');
      try {
        const res = await fetch(`${BASE_URL}/inventory/get_equipment_allocation/${otp.trim()}`);
        const data: any = await res.json().catch(() => null);
        if (!res.ok || !data?.success || !Array.isArray(data?.items)) {
          throw new Error(data?.message || 'Failed to fetch equipment allocation');
        }

        setAllocationItems(
          data.items.map((item: any) => ({
            equipment_name: String(item?.equipment_name || ''),
            equipment_id: String(item?.equipment_id || ''),
            quantity: Number(item?.quantity) || 0,
          })),
        );
      } catch (e: any) {
        setAllocationItems([]);
        setAllocationError(e?.message || 'Failed to fetch equipment allocation');
        toast.error(e?.message || 'Failed to fetch equipment allocation');
      } finally {
        setLoadingAllocation(false);
      }
    };

    fetchAllocationItems();
  }, [verified, otp]);

  const handleVerify = () => {
    if (otp.trim().length !== 4) {
      toast.error('Enter a 4-digit OTP to view the allocation list');
      return;
    }
    setVerified(true);
  };

  useEffect(() => {
    if (!verified) return;

    const nextState: Record<string, AllocationRowState> = {};
    allocationItems.forEach((item) => {
      nextState[item.equipment_id] = {
        quantity: item.quantity,
        providedQuantity: 0,
        completed: false,
      };
    });
    setRowState(nextState);
  }, [verified, allocationItems]);

  const allocationRows = useMemo<AllocationDisplayRow[]>(() => {
    return allocationItems.map((allocationItem) => {
      const inventoryItem = items.find((item) => item.id === allocationItem.equipment_id);
      return {
        itemId: allocationItem.equipment_id,
        itemName: allocationItem.equipment_name || inventoryItem?.name || allocationItem.equipment_id,
        quantity: allocationItem.quantity,
        availableStock: inventoryItem?.currentStock ?? 0,
        stockInPipeline: inventoryItem?.stockInPipeline ?? 0,
      };
    });
  }, [allocationItems, items]);

  const updateRow = (itemId: string, patch: Partial<AllocationRowState>) => {
    setRowState((prev) => ({
      ...prev,
      [itemId]: {
        quantity: 0,
        providedQuantity: 0,
        completed: false,
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const handleComplete = async (item: AllocationDisplayRow) => {
    if (completingItemId) return;

    const current = rowState[item.itemId];
    const quantity = Number(current?.quantity) || 0;

    if (quantity <= 0) {
      toast.error('Enter a quantity before marking the item completed');
      return;
    }

    setCompletingItemId(item.itemId);
    try {
      const res = await fetch(`${BASE_URL}/inventory/update_item_stock_on_allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.itemId,
          quantity_allocated: quantity,
        }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to update allocated stock');
      }

      onAllocationSuccess(item.itemId, quantity);

      updateRow(item.itemId, {
        providedQuantity: quantity,
        completed: true,
      });
      toast.success('Allocation updated successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update allocated stock');
    } finally {
      setCompletingItemId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            Equipment Allocation
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Enter the OTP first. The item list stays hidden until the OTP is provided.
          </p>
        </DialogHeader>

        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-white p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Verify allocation access</p>
              <p className="text-xs text-gray-500">Use the OTP to unlock the equipment list.</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={setOtp}
                containerClassName="justify-start"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleVerify}>
                Verify OTP
              </Button>
            </div>
          </div>

          {verified ? (
            <Badge className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100">OTP verified</Badge>
          ) : (
            <Badge variant="outline" className="w-fit border-dashed text-gray-500">
              Allocation locked
            </Badge>
          )}
        </div>

        {verified ? (
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Item id</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Item name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Quantity</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Available stock</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Stock in pipeline</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Provided quantity</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loadingAllocation ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                        Loading allocation items...
                      </td>
                    </tr>
                  ) : allocationError ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-red-600" colSpan={7}>
                        {allocationError}
                      </td>
                    </tr>
                  ) : allocationRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                        No allocation items found for this OTP.
                      </td>
                    </tr>
                  ) : allocationRows.map((item) => {
                    const state = rowState[item.itemId] || { quantity: item.quantity, providedQuantity: 0, completed: false };

                    return (
                      <tr key={item.itemId} className={state.completed ? 'bg-emerald-50/50 opacity-70' : ''}>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.itemId}</td>
                        <td className="px-4 py-3 text-gray-800">{item.itemName}</td>
                        <td className="px-4 py-3 text-gray-700">{item.quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{item.availableStock.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{item.stockInPipeline.toLocaleString()}</td>
                        <td className="px-4 py-3 w-40">
                          <Input
                            type="number"
                            min={0}
                            value={state.quantity}
                            disabled={state.completed}
                            onChange={(e) => updateRow(item.itemId, { quantity: Number(e.target.value) })}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {state.completed ? state.providedQuantity.toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            className={state.completed ? 'bg-gray-500 hover:bg-gray-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                            onClick={() => handleComplete(item)}
                            disabled={state.completed || completingItemId === item.itemId}
                          >
                            {state.completed ? 'Completed' : completingItemId === item.itemId ? 'Saving...' : 'Completed'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No items are visible until the OTP is verified.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// HISTORY MODAL
// ─────────────────────────────────────────────────────────────
const HistoryModal = ({
  item,
  filterType = 'all',
  onClose,
}: {
  item: StockItem;
  filterType?: 'all' | 'incoming' | 'outgoing';
  onClose: () => void;
}) => {
  const [dateMode, setDateMode] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = filterType === 'all'
    ? item.transactions
    : item.transactions.filter((tx) => tx.type === filterType);

  // Apply date range only for incoming custom mode
  const dateFiltered = (filterType === 'incoming' && dateMode === 'custom')
    ? filtered.filter((tx) => {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
        return true;
      })
    : filtered;

  const titleSuffix =
    filterType === 'incoming' ? ' — Incoming'
    : filterType === 'outgoing' ? ' — Outgoing'
    : '';

  // ── Incoming: totals + group by date (newest first) ──────
  const totalQty   = dateFiltered.reduce((sum, tx) => sum + tx.qty, 0);
  const totalValue = dateFiltered.reduce((sum, tx) => sum + tx.qty * (tx.costPerUnit ?? 0), 0);

  const byDate: [string, StockTransaction[]][] = (() => {
    if (filterType !== 'incoming') return [];
    const map = new Map<string, StockTransaction[]>();
    dateFiltered.forEach((tx) => {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  })();

  return (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          Stock History – {item.name}{titleSuffix}
        </DialogTitle>
      </DialogHeader>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {filterType === 'all' ? 'No transactions recorded yet.' : `No ${filterType} transactions recorded yet.`}
        </p>
      ) : filterType === 'incoming' ? (
        <div className="space-y-4 py-2">

          {/* ── Date range filter ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => { setDateMode('all'); setStartDate(''); setEndDate(''); }}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-xs font-semibold border transition-colors',
                  dateMode === 'all'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400',
                )}
              >
                All Time
              </button>
              <button
                onClick={() => setDateMode('custom')}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-xs font-semibold border transition-colors',
                  dateMode === 'custom'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400',
                )}
              >
                Custom Range
              </button>
            </div>
            {dateMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-500">From</label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-gray-500">To</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Summary card ── */}
          <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-4 py-3">
            <div>
              <p className="text-xs text-green-600 font-medium">Total Incoming Stock</p>
              <p className="text-2xl font-bold text-green-700">
                {totalQty.toLocaleString('en-IN')}
                <span className="text-sm font-normal text-green-500 ml-1">{item.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600 font-medium">Total Value</p>
              <p className="text-2xl font-bold text-green-700">
                ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* ── Grouped rows or empty ── */}
          {byDate.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No entries in the selected range.</p>
          ) : byDate.map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  {txs.reduce((s, t) => s + t.qty, 0).toLocaleString('en-IN')} {item.unit}
                </span>
              </div>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50/40 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <ArrowDownToLine className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        +{tx.qty.toLocaleString('en-IN')} {item.unit}
                      </p>
                      {tx.note && <p className="text-xs text-gray-500 truncate mt-0.5">{tx.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 py-2">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
            >
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 mt-0.5',
                  txBadge[tx.type].color,
                )}
              >
                {txBadge[tx.type].label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {tx.type === 'outgoing' || tx.type === 'issued' ? '-' : '+'}
                  {tx.qty} {item.unit}
                </p>
                {tx.note && <p className="text-xs text-gray-500 truncate">{tx.note}</p>}
                {tx.by && <p className="text-xs text-gray-400">By: {tx.by}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{tx.date}</span>
            </div>
          ))}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// DELETE CONFIRM
// ─────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({
  item,
  onClose,
  onConfirm,
}: {
  item: StockItem;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" />
          Remove Item
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-gray-600">
        Are you sure you want to remove <strong>{item.name}</strong> from inventory? This action cannot be undone.
      </p>
      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
          Yes, Remove
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─────────────────────────────────────────────────────────────
// ISSUED ITEMS MODAL
// ─────────────────────────────────────────────────────────────
type IssueRequest = {
  item_id: string;
  item_name: string;
  issue_id: string;
  quantity: number;
  issue_start_date: string;
  issue_end_date: string;
  status: 'pending' | 'issued' | 'returned' | 'partially_returned' | 'rejected';
  created_at: string;
  staff_id: string;
};

type IssueStatusTab = 'all' | IssueRequest['status'];

const STATUS_TABS: { key: IssueStatusTab; label: string; active: string; badge: string }[] = [
  { key: 'all',               label: 'All',               active: 'bg-gray-800 text-white border-gray-800',         badge: 'bg-white/20 text-white' },
  { key: 'pending',           label: 'Pending',           active: 'bg-amber-500 text-white border-amber-500',       badge: 'bg-white/20 text-white' },
  { key: 'issued',            label: 'Issued',            active: 'bg-blue-600 text-white border-blue-600',         badge: 'bg-white/20 text-white' },
  { key: 'returned',          label: 'Returned',          active: 'bg-emerald-600 text-white border-emerald-600',   badge: 'bg-white/20 text-white' },
  { key: 'partially_returned', label: 'Partial Return',  active: 'bg-violet-600 text-white border-violet-600',     badge: 'bg-white/20 text-white' },
  { key: 'rejected',          label: 'Rejected',          active: 'bg-red-600 text-white border-red-600',           badge: 'bg-white/20 text-white' },
];

const STATUS_PILL: Record<IssueRequest['status'], string> = {
  pending:            'bg-amber-50 text-amber-700 ring-amber-100',
  issued:             'bg-blue-50 text-blue-700 ring-blue-100',
  returned:           'bg-emerald-50 text-emerald-700 ring-emerald-100',
  partially_returned: 'bg-violet-50 text-violet-700 ring-violet-100',
  rejected:           'bg-red-50 text-red-700 ring-red-100',
};

const calcProgress = (start: string, end: string) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return Math.max(0, Math.min(100, ((n - s) / (e - s)) * 100));
};

const IssuedItemsModal = ({
  open,
  items,
  onClose,
}: {
  open: boolean;
  items: StockItem[];
  onClose: () => void;
}) => {
  const [requests, setRequests] = useState<IssueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<IssueStatusTab>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/inventory/get_issue_requests`);
      const data: any = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data?.issue_requests)) {
        setRequests(data.issue_requests);
        const qtys: Record<string, number> = {};
        data.issue_requests.forEach((r: IssueRequest) => { qtys[r.issue_id] = r.quantity; });
        setReturnQtys(qtys);
      } else {
        toast.error(data?.message || 'Failed to fetch issue requests');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to fetch issue requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequests();
      setActiveTab('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getItemImage = (itemId: string) =>
    items.find((i) => i.id === itemId)?.imageUrl || PLACEHOLDER_IMG;

  const filtered = activeTab === 'all' ? requests : requests.filter((r) => r.status === activeTab);
  const countFor = (key: IssueStatusTab) =>
    key === 'all' ? requests.length : requests.filter((r) => r.status === key).length;

  const handleIssue = async (req: IssueRequest) => {
    setActionLoading(req.issue_id);
    try {
      const res = await fetch(`${BASE_URL}/inventory/update_issue_request_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: req.item_id, issue_id: req.issue_id, new_status: 'issued' }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to issue item');
      toast.success(`"${req.item_name}" issued successfully`);
      await fetchRequests();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to issue item');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturn = async (req: IssueRequest) => {
    const qtyReturned = returnQtys[req.issue_id] ?? req.quantity;
    if (!qtyReturned || qtyReturned <= 0) return toast.error('Enter a valid return quantity');
    setActionLoading(req.issue_id);
    try {
      const res = await fetch(`${BASE_URL}/inventory/return_issue_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: req.issue_id, quantity_returned: qtyReturned }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to return item');
      toast.success(`"${req.item_name}" marked as returned`);
      await fetchRequests();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to return item');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <ClipboardList className="w-5 h-5" />
            Issue Requests
          </DialogTitle>
          <p className="text-sm text-gray-500">Manage all inventory issue requests</p>
        </DialogHeader>

        {/* ── Status filter tabs ── */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = countFor(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                  isActive ? tab.active : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {tab.label}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive ? tab.badge : 'bg-gray-100 text-gray-600'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <ClipboardList className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No requests in this category</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 w-14">Image</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Item Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Issued To</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 min-w-[210px]">Issue Timeline</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((req) => {
                    const progress = calcProgress(req.issue_start_date, req.issue_end_date);
                    const isOverdue = new Date(req.issue_end_date).getTime() < Date.now();
                    const isActing = actionLoading === req.issue_id;

                    return (
                      <tr key={req.issue_id} className="hover:bg-gray-50 transition-colors">

                        {/* Image */}
                        <td className="px-4 py-3">
                          <img
                            src={getItemImage(req.item_id)}
                            alt={req.item_name}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG; }}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                          />
                        </td>

                        {/* Item Name */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{req.item_name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{req.item_id}</p>
                        </td>

                        {/* Issued To */}
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-100 max-w-[130px] truncate"
                            title={req.staff_id}
                          >
                            {req.staff_id.slice(0, 8)}…
                          </span>
                        </td>

                        {/* Timeline */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>{req.issue_start_date}</span>
                              <span className={cn('font-semibold', req.status === 'issued' && isOverdue ? 'text-red-600' : 'text-gray-500')}>
                                {req.status === 'issued' && isOverdue ? 'Overdue' : `${Math.round(progress)}%`}
                              </span>
                              <span>{req.issue_end_date}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  req.status === 'returned'           ? 'bg-emerald-500' :
                                  req.status === 'partially_returned' ? 'bg-violet-500'  :
                                  req.status === 'rejected'           ? 'bg-red-400'     :
                                  isOverdue                           ? 'bg-red-500'     :
                                  progress >= 75                      ? 'bg-amber-500'   : 'bg-purple-500'
                                )}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3 font-bold text-gray-800">
                          {req.quantity.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 capitalize', STATUS_PILL[req.status])}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          {req.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleIssue(req)}
                              disabled={isActing}
                              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm whitespace-nowrap"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              {isActing ? 'Issuing…' : 'Issue'}
                            </Button>
                          )}

                          {req.status === 'issued' && (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={1}
                                max={req.quantity}
                                value={returnQtys[req.issue_id] ?? req.quantity}
                                onChange={(e) =>
                                  setReturnQtys((prev) => ({ ...prev, [req.issue_id]: Number(e.target.value) }))
                                }
                                className="h-8 w-16 text-xs text-center px-1"
                                disabled={isActing}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleReturn(req)}
                                disabled={isActing}
                                className="gap-1 bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 shadow-sm whitespace-nowrap"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                                {isActing ? 'Returning…' : 'Return'}
                              </Button>
                            </div>
                          )}

                          {(req.status === 'returned' || req.status === 'partially_returned' || req.status === 'rejected') && (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// DAMAGE ENTRY MODAL
// ─────────────────────────────────────────────────────────────
type DamageType = 'before_application' | 'inventory';

const DAMAGE_OPTIONS: { value: DamageType; label: string; desc: string }[] = [
  { value: 'before_application', label: 'Damage Before Application', desc: 'Item was damaged at the farm before being applied — select the farm below' },
  { value: 'inventory',          label: 'Damage in Inventory',       desc: 'Item was damaged while in storage' },
];

const DamageEntryModal = ({
  item,
  onClose,
}: {
  item: StockItem;
  onClose: () => void;
}) => {
  const [damageQty, setDamageQty]       = useState(0);
  const [perUnitCost, setPerUnitCost]   = useState(0);
  const [reason, setReason]             = useState('');
  const [damageType, setDamageType]     = useState<DamageType | ''>('');

  const [farms, setFarms]               = useState<FarmOption[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  const [saving, setSaving] = useState(false);

  const totalLoss = damageQty > 0 && perUnitCost > 0 ? damageQty * perUnitCost : 0;

  // Fetch farms only when "before_application" damage type selected
  useEffect(() => {
    if (damageType !== 'before_application') { setFarms([]); setSelectedFarmId(''); return; }
    const fetchFarms = async () => {
      setFarmsLoading(true);
      try {
        const res  = await fetch(`${BASE_URL}/admin_ops_requests/get_farm_and_farmer`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.farm_farmer_mapping)) {
          setFarms(data.farm_farmer_mapping.map((f: any) => ({
            farm_id:    String(f.farm_id ?? ''),
            owner_name: String(f.owner_name ?? ''),
            crop_type:  String(f.crop_type ?? ''),
            area:       Number(f.area) || 0,
          })));
        }
      } catch { /* silently fail */ }
      finally { setFarmsLoading(false); }
    };
    fetchFarms();
  }, [damageType]);

  const handleSave = async () => {
    if (damageQty <= 0)    return toast.error('Quantity damaged must be greater than 0');
    if (perUnitCost <= 0)  return toast.error('Per unit cost must be greater than 0');
    if (!damageType)       return toast.error('Please select a damage type');
    if (damageType === 'before_application' && !selectedFarmId) return toast.error('Please select the farm');
    if (!reason.trim())    return toast.error('Please enter a reason for damage');
    setSaving(true);
    try {
      const otherDetails: Record<string, string> =
        damageType === 'before_application'
          ? { damage_type: 'Damage before Application', farm_id: selectedFarmId }
          : { damage_type: 'Damage in inventory' };
      const res  = await fetch(`${BASE_URL}/inventory/item_damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id:             item.id,
          quantity:            damageQty,
          per_unit_cost:       perUnitCost,
          damage_description:  reason.trim(),
          other_details:       otherDetails,
        }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to record damage');
      toast.success(`Damage of ${damageQty} ${item.unit} recorded for "${item.name}"`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record damage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="w-5 h-5" />
            Record Damage
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">Log damaged inventory and calculate total loss.</p>

        {/* Item info bar */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-400">{item.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Current Stock</p>
            <p className="font-bold text-gray-800">{item.currentStock} {item.unit}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Damage type */}
          <Field label="Damage Type">
            <div className="space-y-2">
              {DAMAGE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    damageType === opt.value
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="damageType"
                    value={opt.value}
                    checked={damageType === opt.value}
                    onChange={() => setDamageType(opt.value)}
                    className="mt-0.5 accent-red-600"
                  />
                  <div>
                    <p className={`text-sm font-medium ${damageType === opt.value ? 'text-red-700' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          {/* Farm dropdown — only for before_application */}
          {damageType === 'before_application' && (
            <Field label="Farm Where Damage Occurred">
              <div className="relative">
                <select
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                  value={selectedFarmId}
                  onChange={e => setSelectedFarmId(e.target.value)}
                  disabled={farmsLoading}
                >
                  <option value="">{farmsLoading ? 'Loading farms…' : 'Select farm'}</option>
                  {farms.map(f => (
                    <option key={f.farm_id} value={f.farm_id}>
                      {f.owner_name} — {f.crop_type} — {f.area} acres
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
          )}

          {/* Quantity damaged */}
          <Field label={`Quantity Damaged (${item.unit})`}>
            <Input
              type="number"
              min={1}
              max={item.currentStock}
              value={damageQty || ''}
              onChange={e => setDamageQty(Number(e.target.value))}
              placeholder="0"
            />
          </Field>

          {/* Per unit cost */}
          <Field label="Per Unit Cost (₹)">
            <Input
              type="number"
              min={0}
              value={perUnitCost || ''}
              onChange={e => setPerUnitCost(Number(e.target.value))}
              placeholder="0.00"
            />
          </Field>

          {/* Reason */}
          <Field label="Reason for Damage">
            <Input
              placeholder="Describe how the damage occurred…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </Field>

          {/* Total Loss card */}
          <div className={`rounded-lg border px-4 py-3 flex items-center justify-between transition-colors ${
            totalLoss > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
          }`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Loss</p>
              <p className={`text-2xl font-extrabold leading-tight ${totalLoss > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                ₹{totalLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            {totalLoss > 0 && (
              <div className="text-right text-[11px] text-red-400 space-y-0.5">
                <p>{damageQty} {item.unit}</p>
                <p>× ₹{perUnitCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Recording…' : 'Record Damage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// RETURN ENTRY MODAL
// ─────────────────────────────────────────────────────────────
type FarmOption = {
  farm_id: string;
  owner_name: string;
  crop_type: string;
  area: number;
};

type FarmLedgerEntry = {
  voucher_number: string;
  date: string;
  input: number;
  output: number;
  amount: number;
  unit: string;
  description: string;
  investment: number;
  item_description: { item_code: string; item_unit: string; item_name: string };
};

const ReturnEntryModal = ({
  item,
  onClose,
}: {
  item: StockItem;
  onClose: () => void;
}) => {
  const [farms, setFarms]               = useState<FarmOption[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  const [ledger, setLedger]               = useState<FarmLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState('');

  const [returnQty, setReturnQty] = useState(0);
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);

  // Fetch all farms on mount
  useEffect(() => {
    const fetchFarms = async () => {
      setFarmsLoading(true);
      try {
        const res  = await fetch(`${BASE_URL}/admin_ops_requests/get_farm_and_farmer`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.farm_farmer_mapping)) {
          setFarms(data.farm_farmer_mapping.map((f: any) => ({
            farm_id:    String(f.farm_id ?? ''),
            owner_name: String(f.owner_name ?? ''),
            crop_type:  String(f.crop_type ?? ''),
            area:       Number(f.area) || 0,
          })));
        }
      } catch { /* silently fail */ }
      finally { setFarmsLoading(false); }
    };
    fetchFarms();
  }, []);

  // Fetch investment ledger when farm changes
  useEffect(() => {
    if (!selectedFarmId) { setLedger([]); setSelectedVoucher(''); setReturnQty(0); return; }
    const fetchLedger = async () => {
      setLedgerLoading(true);
      setLedger([]);
      setSelectedVoucher('');
      setReturnQty(0);
      try {
        const res  = await fetch(`${BASE_URL}/inventory/get_farm_investment_ledger/${selectedFarmId}`);
        const data: any = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data?.ledger) && data.ledger.length > 0) {
          setLedger(data.ledger);
        }
      } catch { /* silently fail */ }
      finally { setLedgerLoading(false); }
    };
    fetchLedger();
  }, [selectedFarmId]);

  const selectedEntry = ledger.find(e => e.voucher_number === selectedVoucher);

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  };

  const handleSave = async () => {
    if (!selectedFarmId)    return toast.error('Please select a farm');
    if (!selectedVoucher)   return toast.error('Please select a ledger entry');
    if (returnQty <= 0)     return toast.error('Return quantity must be greater than 0');
    setSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/inventory/inventory_item_return_ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investment:       selectedEntry?.investment ?? 0,
          input:            returnQty,
          item_description: selectedEntry?.item_description ?? {},
          farm_id:          selectedFarmId,
          unit:             selectedEntry?.unit ?? item.unit,
          voucher_number:   selectedVoucher,
        }),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to submit return entry');
      toast.success(`Return of ${returnQty} ${item.unit} recorded for "${item.name}"`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit return entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Undo2 className="w-5 h-5" />
            Return Entry
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 -mt-1">Select the farm and ledger entry for the return.</p>

        {/* Item info bar */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-400">{item.sku}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Current Stock</p>
            <p className="font-bold text-gray-800">{item.currentStock} {item.unit}</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Step 1 — Farm */}
          <Field label="Step 1 · Select Farm">
            <div className="relative">
              <select
                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 pr-8 disabled:bg-gray-50 disabled:text-gray-400"
                value={selectedFarmId}
                onChange={e => setSelectedFarmId(e.target.value)}
                disabled={farmsLoading}
              >
                <option value="">{farmsLoading ? 'Loading farms…' : 'Select a farm'}</option>
                {farms.map(f => (
                  <option key={f.farm_id} value={f.farm_id}>
                    {f.owner_name} — {f.crop_type} — {f.area} acres
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>

          {/* Step 2 — Ledger entry (shown after farm selected) */}
          {selectedFarmId && (
            ledgerLoading ? (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                Loading investment ledger…
              </div>
            ) : ledger.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-5 text-center">
                <p className="text-sm text-gray-400 font-medium">No investments found for this farm</p>
                <p className="text-xs text-gray-300 mt-0.5">No items have been sent to this farm yet</p>
              </div>
            ) : (
              <Field label="Step 2 · Select Ledger Entry">
                <div className="relative">
                  <select
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 pr-8"
                    value={selectedVoucher}
                    onChange={e => {
                      setSelectedVoucher(e.target.value);
                      const entry = ledger.find(l => l.voucher_number === e.target.value);
                      if (entry) setReturnQty(entry.input || 1);
                    }}
                  >
                    <option value="">Select an entry</option>
                    {ledger.map(e => (
                      <option key={e.voucher_number} value={e.voucher_number}>
                        {e.item_description?.item_name?.trim()} — {e.input} {e.unit} — {fmtDate(e.date)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Entry detail card */}
                {selectedEntry && (() => {
                  const perUnit = selectedEntry.input > 0
                    ? selectedEntry.investment / selectedEntry.input
                    : selectedEntry.output > 0
                      ? selectedEntry.investment / selectedEntry.output
                      : null;
                  return (
                    <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5 space-y-1">
                      <p className="text-xs font-semibold text-orange-800">{selectedEntry.item_description?.item_name?.trim()}</p>
                      <div className="flex items-center justify-between text-[11px] text-orange-600">
                        <span className="font-mono">{selectedEntry.item_description?.item_code}</span>
                        <span className="font-semibold">
                          {selectedEntry.input} {selectedEntry.unit} · ₹{selectedEntry.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {perUnit !== null && (
                        <p className="text-[11px] text-orange-500 font-medium">
                          ₹{perUnit.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {selectedEntry.unit}
                        </p>
                      )}
                      <p className="text-[10px] text-orange-400">{fmtDate(selectedEntry.date)}</p>
                    </div>
                  );
                })()}
              </Field>
            )
          )}

          {/* Step 3 — Qty + Note (shown after entry selected) */}
          {selectedVoucher && (
            <>
              <Field label={`Step 3 · Return Quantity (${item.unit})`}>
                <Input
                  type="number"
                  min={1}
                  max={selectedEntry?.input ?? undefined}
                  value={returnQty || ''}
                  onChange={e => setReturnQty(Number(e.target.value))}
                  placeholder="0"
                />
                {selectedEntry && (
                  <p className="text-[11px] text-gray-400 mt-0.5">Originally issued: {selectedEntry.input} {selectedEntry.unit}</p>
                )}
              </Field>
              <Field label="Note (optional)">
                <Input
                  placeholder="Reason for return, condition, etc."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleSave}
            disabled={saving || !selectedVoucher}
          >
            {saving ? 'Submitting…' : 'Submit Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    {children}
  </div>
);

const SelectField = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <div className="relative">
    <select
      className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

export default Inventory;
