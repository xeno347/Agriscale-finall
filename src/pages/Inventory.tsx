import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit3,
  ArrowDownCircle,
  ArrowUpCircle,
  PackageCheck,
  History,
  Boxes,
  X,
  Upload,
  Trash2,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
};

type StockItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  imageUrl: string;
  location: string;
  description: string;
  transactions: StockTransaction[];
};

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Seeds', 'Fertilizers', 'Pesticides', 'Equipment', 'Tools', 'Packaging'];
const UNITS = ['kg', 'litre', 'bags', 'units', 'boxes', 'rolls'];

const PLACEHOLDER_IMG =
  'https://placehold.co/300x200/e2e8f0/64748b?text=No+Image';

const initialItems: StockItem[] = [
  {
    id: '1',
    name: 'Urea Fertilizer',
    category: 'Fertilizers',
    sku: 'FRT-001',
    unit: 'kg',
    currentStock: 1200,
    minStock: 200,
    imageUrl: 'https://placehold.co/300x200/dcfce7/16a34a?text=Urea+Fertilizer',
    location: 'Warehouse A – Shelf 3',
    description: '46% Nitrogen fertilizer, granular form.',
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
    minStock: 100,
    imageUrl: 'https://placehold.co/300x200/fef9c3/ca8a04?text=Paddy+Seeds',
    location: 'Cold Storage – Bay 1',
    description: 'High-yield IR-36 paddy seed variety.',
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
    minStock: 50,
    imageUrl: 'https://placehold.co/300x200/fee2e2/dc2626?text=Chlorpyrifos',
    location: 'Chemical Store – Rack 2',
    description: 'Broad-spectrum organophosphate insecticide.',
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
    minStock: 3,
    imageUrl: 'https://placehold.co/300x200/dbeafe/1d4ed8?text=Power+Sprayer',
    location: 'Equipment Room – Row A',
    description: '16L battery-operated agricultural sprayer.',
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
    minStock: 500,
    imageUrl: 'https://placehold.co/300x200/f3e8ff/7c3aed?text=HDPE+Bags',
    location: 'Warehouse B – Pallet 5',
    description: 'Woven polypropylene bags for grain storage.',
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
    minStock: 10,
    imageUrl: 'https://placehold.co/300x200/ecfdf5/059669?text=Drip+Tape',
    location: 'Irrigation Store – Shelf 1',
    description: '16mm inline drip tape, 200m per roll.',
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
  const [incomingItem, setIncomingItem] = useState<StockItem | null>(null);
  const [outgoingItem, setOutgoingItem] = useState<StockItem | null>(null);
  const [issuedItem, setIssuedItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

  // ── Low stock derived list ───────────────────────────────
  const lowStockItems = useMemo(
    () => items.filter((i) => i.currentStock < i.minStock && !dismissedAlerts.has(i.id)),
    [items, dismissedAlerts],
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
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Stock
        </Button>
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

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Items', value: items.length, color: 'text-gray-800' },
          {
            label: 'Low Stock',
            value: items.filter((i) => i.currentStock < i.minStock).length,
            color: 'text-red-600',
            onClick: () => { setDismissedAlerts(new Set()); setAlertPanelOpen(true); },
          },
          {
            label: 'Categories',
            value: new Set(items.map((i) => i.category)).size,
            color: 'text-blue-600',
          },
          {
            label: 'Showing',
            value: filtered.length,
            color: 'text-green-600',
          },
        ].map((s) => (
          <div
            key={s.label}
            onClick={(s as any).onClick}
            className={cn(
              'bg-white rounded-xl border border-gray-100 p-3 shadow-sm',
              (s as any).onClick && 'cursor-pointer hover:border-red-300 hover:shadow-md transition-all',
            )}
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
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
              onUpdateStock={() => setUpdateStockItem(item)}
              onIncoming={() => setIncomingItem(item)}
              onOutgoing={() => setOutgoingItem(item)}
              onIssued={() => setIssuedItem(item)}
              onHistory={() => setHistoryItem(item)}
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
        onSave={(data) => {
          setItems((prev) => [
            {
              ...data,
              id: genId(),
              transactions: [],
            },
            ...prev,
          ]);
          setAddOpen(false);
          toast.success(`"${data.name}" added to inventory`);
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
        <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
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
  onIncoming: () => void;
  onOutgoing: () => void;
  onIssued: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

const InventoryCard = ({
  item,
  onEdit,
  onUpdateStock,
  onIncoming,
  onOutgoing,
  onIssued,
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
            Update Stock
          </button>
        </div>

        {/* Secondary action row */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onIncoming}
            className="flex flex-col items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg py-2 transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Incoming
          </button>
          <button
            onClick={onOutgoing}
            className="flex flex-col items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg py-2 transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Outgoing
          </button>
          <button
            onClick={onIssued}
            className="flex flex-col items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg py-2 transition-colors"
          >
            <PackageCheck className="w-4 h-4" />
            Issue
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
type AddStockForm = Omit<StockItem, 'id' | 'transactions'>;

const emptyForm = (): AddStockForm => ({
  name: '',
  category: 'Seeds',
  sku: '',
  unit: 'kg',
  currentStock: 0,
  minStock: 0,
  imageUrl: '',
  location: '',
  description: '',
});

const AddStockModal = ({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddStockForm) => void;
}) => {
  const [form, setForm] = useState<AddStockForm>(emptyForm());

  const set = (k: keyof AddStockForm, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Item name is required');
    if (!form.sku.trim()) return toast.error('SKU is required');
    onSave(form);
    setForm(emptyForm());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Add New Stock Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field label="Item Name *">
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
            <Field label="SKU *">
              <Input placeholder="e.g. FRT-001" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit">
              <SelectField value={form.unit} options={UNITS} onChange={(v) => set('unit', v)} />
            </Field>
            <Field label="Location">
              <Input placeholder="e.g. Warehouse A" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Stock">
              <Input type="number" min={0} value={form.currentStock} onChange={(e) => set('currentStock', Number(e.target.value))} />
            </Field>
            <Field label="Min Stock Level">
              <Input type="number" min={0} value={form.minStock} onChange={(e) => set('minStock', Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Image URL">
            <Input placeholder="https://…" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
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
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave}>
            Add to Inventory
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
    onSave({ type: txType, qty, date: today(), note, by });
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
          <Field label="Performed By">
            <Input placeholder="Staff name" value={by} onChange={(e) => setBy(e.target.value)} />
          </Field>
          <Field label="Note / Reference">
            <Input placeholder="Purchase order, field, reason…" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
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

// ─────────────────────────────────────────────────────────────
// HISTORY MODAL
// ─────────────────────────────────────────────────────────────
const HistoryModal = ({ item, onClose }: { item: StockItem; onClose: () => void }) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          Stock History – {item.name}
        </DialogTitle>
      </DialogHeader>

      {item.transactions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No transactions recorded yet.</p>
      ) : (
        <div className="space-y-2 py-2">
          {item.transactions.map((tx) => (
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
                  {tx.qty > 0 && tx.type !== 'outgoing' && tx.type !== 'issued' ? '+' : ''}
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
