import { useEffect, useState } from 'react';
import { 
  Search, Filter, Plus, Minus, 
  Package, AlertTriangle, History, 
  ArrowUpRight, ArrowDownLeft, X,
  FileText, TrendingUp, Download, Edit,
  Calendar, User, MapPin, Tag, Fuel
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import getBaseUrl from '@/lib/config';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type ItemCategory = 'Fertilizer' | 'Pesticide' | 'Seeds' | 'Fuel' | 'Spare Parts' | 'Equipment';
type UnitType = 'kg' | 'L' | 'g' | 'units' | 'bags';
type FuelRequestStatus = 'requested' | 'delivered';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  location: string;
  reorderLevel: number;
  batchNo?: string;
  expiryDate?: string;
  supplier?: string;
  lastUpdated: string;
  storageCondition?: string; // e.g., "Cool Dry Place"
}

interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  issuedTo?: string;
  purpose?: string;
  performedBy: string;
  invoiceNo?: string; // For Inward
  billUrl?: string;   // Mock URL for download
}

interface FuelRequest {
  request_id: string;
  driverName: string;
  vehicleNumber: string;
  requestedAmount: number;
  status: FuelRequestStatus;
  requestDate: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INVENTORY: InventoryItem[] = [
  { 
    id: 'inv-1', sku: 'FERT-001', name: 'Urea (46% N)', category: 'Fertilizer', 
    quantity: 150, unit: 'bags', unitPrice: 280, location: 'Warehouse A', 
    reorderLevel: 50, batchNo: 'B-2023-001', expiryDate: '2026-05-01', lastUpdated: '2025-12-28',
    supplier: 'AgroCorp Ltd', storageCondition: 'Dry Area'
  },
  { 
    id: 'inv-2', sku: 'CHEM-005', name: 'Glyphosate 41%', category: 'Pesticide', 
    quantity: 12, unit: 'L', unitPrice: 450, location: 'Chemical Store', 
    reorderLevel: 20, batchNo: 'GLY-99', expiryDate: '2025-08-15', lastUpdated: '2025-12-10',
    supplier: 'ChemIndia', storageCondition: 'Ventilated Cabinet'
  },
  { 
    id: 'inv-3', sku: 'FUEL-DSL', name: 'Diesel', category: 'Fuel', 
    quantity: 450, unit: 'L', unitPrice: 94, location: 'Fuel Tank 1', 
    reorderLevel: 200, lastUpdated: '2025-12-30',
    supplier: 'Indian Oil'
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', itemId: 'inv-3', itemName: 'Diesel', type: 'OUT', quantity: 45, date: '2025-12-30 08:30', issuedTo: 'MH-12-AB-1234', purpose: 'Ploughing', performedBy: 'Rajesh K', billUrl: '#' },
  { id: 'tx-2', itemId: 'inv-1', itemName: 'Urea (46% N)', type: 'IN', quantity: 200, date: '2025-12-28 14:00', invoiceNo: 'INV-2024-992', performedBy: 'Admin', billUrl: '#' },
];

const MOCK_FUEL_REQUESTS: FuelRequest[] = [
  { request_id: 'FR-001', driverName: 'Rajesh Kumar', vehicleNumber: 'MH-12-AB-1234', requestedAmount: 50, status: 'delivered', requestDate: '2026-01-27 09:30' },
  { request_id: 'FR-002', driverName: 'Suresh Patil', vehicleNumber: 'MH-12-CD-5678', requestedAmount: 75, status: 'requested', requestDate: '2026-01-28 08:15' },
  { request_id: 'FR-003', driverName: 'Amit Sharma', vehicleNumber: 'MH-12-EF-9012', requestedAmount: 40, status: 'requested', requestDate: '2026-01-28 10:20' },
  { request_id: 'FR-004', driverName: 'Vijay Singh', vehicleNumber: 'MH-12-GH-3456', requestedAmount: 60, status: 'delivered', requestDate: '2026-01-26 14:00' },
  { request_id: 'FR-005', driverName: 'Prakash Desai', vehicleNumber: 'MH-12-IJ-7890', requestedAmount: 55, status: 'requested', requestDate: '2026-01-28 11:45' },
];

// Helper: map backend fuel request shape -> FuelRequest
const mapBackendFuelRequest = (b: any, idx: number): FuelRequest => ({
  request_id: b.request_id || (b.vehicle_id ? `${b.vehicle_id}_${b.timestamp || idx}` : `req_${idx}`),
  driverName: b.driver_name || b.driverName || 'Unknown',
  vehicleNumber: b.vehicle_number || b.vehicleNumber || 'Unknown',
  requestedAmount: b.requested_amount ?? b.requestedAmount ?? 0,
  status: b.status || 'requested',
  requestDate: b.timestamp || b.requestDate || new Date().toISOString(),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [fuelRequests, setFuelRequests] = useState<FuelRequest[]>(MOCK_FUEL_REQUESTS);
  
  // State for UI
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Modal States
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isIssueStockOpen, setIsIssueStockOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isFuelRequestsOpen, setIsFuelRequestsOpen] = useState(false);
  const [isConfirmDeliveryOpen, setIsConfirmDeliveryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedFuelRequest, setSelectedFuelRequest] = useState<FuelRequest | null>(null);

  // --- ACTIONS ---
  const handleStockAction = (e: React.FormEvent, type: 'IN' | 'OUT' | 'UPDATE') => {
    e.preventDefault();
    
    // Simulate Action
    const actionMap = {
      IN: "Stock added successfully",
      OUT: "Stock issued successfully",
      UPDATE: "Item details updated successfully"
    };
    
    toast.success(actionMap[type]);
    
    // Close Modals
    setIsAddStockOpen(false);
    setIsIssueStockOpen(false);
    setIsEditItemOpen(false);
    setSelectedItem(null);
  };

  const handleDownloadBill = (txId: string) => {
    toast.info(`Downloading bill for Transaction ${txId}...`);
    // Simulate download delay
    setTimeout(() => toast.success("Download Complete"), 1500);
  };

  const handleStatusChange = (request: FuelRequest) => {
    if (request.status === 'requested') {
      setSelectedFuelRequest(request);
      setIsConfirmDeliveryOpen(true);
    }
  };

  const confirmDelivery = () => {
    if (selectedFuelRequest) {
      setFuelRequests(fuelRequests.map(req => 
        req.request_id === selectedFuelRequest.request_id 
          ? { ...req, status: 'delivered' as FuelRequestStatus }
          : req
      ));
      toast.success(`Fuel delivered to ${selectedFuelRequest.vehicleNumber}`);
      setIsConfirmDeliveryOpen(false);
      setSelectedFuelRequest(null);
    }
  };

  // Fetch fuel requests from backend on mount
  useEffect(() => {
    const fetchFuelRequests = async () => {
      try {
        const url = `${getBaseUrl()}/inventory/get_all_fuel_request`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.success && Array.isArray(data.fuel_requests)) {
          const mapped: FuelRequest[] = data.fuel_requests.map((fr: any, idx: number) => mapBackendFuelRequest(fr, idx));
          setFuelRequests(mapped);
        } else {
          toast.error('Failed to load fuel requests');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching fuel requests', err);
        toast.error('Error fetching fuel requests');
      }
    };

    fetchFuelRequests();
  }, []);

  // Stats
  const pendingFuelRequests = fuelRequests.filter(req => req.status === 'requested').length;
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const lowStockCount = items.filter(item => item.quantity <= item.reorderLevel).length;

  // Filter
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFuelRequests = fuelRequests.filter(request => {
    const query = fuelSearchQuery.toLowerCase();
    return (
      request.request_id.toLowerCase().includes(query) ||
      request.driverName.toLowerCase().includes(query) ||
      request.vehicleNumber.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track stock levels, procurements, and consumption.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setSelectedItem(null); setIsIssueStockOpen(true); }}
            className="flex items-center gap-2 border border-orange-200 bg-orange-50 text-orange-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
          >
            <Minus className="w-4 h-4" />
            Issue Stock
          </button>
          <button 
            onClick={() => { setSelectedItem(null); setIsAddStockOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Stock
          </button>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Inventory Value</p>
              <h3 className="text-2xl font-bold mt-1">₹{totalValue.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total SKUs</p>
              <h3 className="text-2xl font-bold mt-1">{items.length}</h3>
            </div>
            <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Package className="w-5 h-5"/></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold mt-1 text-orange-600">{lowStockCount}</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><AlertTriangle className="w-5 h-5"/></div>
          </div>
        </div>
      </div>

      {/* TABS & LIST */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border pb-4">
          <div className="flex gap-6 w-full sm:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('stock')}
              className={cn(
                "pb-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                activeTab === 'stock' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-4 h-4" /> Current Stock
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "pb-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="w-4 h-4" /> Transaction Log
            </button>
          </div>

          {activeTab === 'stock' && (
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm border border-border rounded-md bg-background"
                />
              </div>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="all">All Categories</option>
                <option value="Fertilizer">Fertilizer</option>
                <option value="Pesticide">Pesticide</option>
                <option value="Fuel">Fuel</option>
              </select>
            </div>
          )}
        </div>

        {/* CURRENT STOCK TABLE */}
        {activeTab === 'stock' && (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Item</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Location</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Stock</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Value</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku} • {item.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{item.location}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("font-bold", item.quantity <= item.reorderLevel ? "text-orange-600" : "text-foreground")}>
                          {item.quantity} {item.unit}
                        </span>
                        {item.quantity <= item.reorderLevel && (
                          <span className="text-[10px] text-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Low</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedItem(item); setIsEditItemOpen(true); }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-md border border-transparent hover:border-blue-100 transition-all"
                          title="Edit Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsIssueStockOpen(true); }}
                          className="p-2 hover:bg-orange-50 text-orange-600 rounded-md border border-transparent hover:border-orange-100 transition-all" 
                          title="Issue Stock"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedItem(item); setIsAddStockOpen(true); }}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-md border border-transparent hover:border-green-100 transition-all" 
                          title="Add Stock"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TRANSACTION LOG TABLE */}
        {activeTab === 'history' && (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Item</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Details</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Quantity</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Invoice/Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                        tx.type === 'IN' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {tx.type === 'IN' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {tx.type === 'IN' ? 'Inward' : 'Issued'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{tx.itemName}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {tx.type === 'IN' ? `Inv: ${tx.invoiceNo || 'N/A'}` : `To: ${tx.issuedTo}`}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{tx.quantity}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownloadBill(tx.id)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Download className="w-3 h-3" /> Download Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD STOCK (INWARD) --- */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-green-700 flex items-center gap-2">
                <ArrowDownLeft className="w-6 h-6" /> Stock Inward (Purchase)
              </h3>
              <button onClick={() => { setIsAddStockOpen(false); setSelectedItem(null); }}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            
            <form onSubmit={(e) => handleStockAction(e, 'IN')} className="space-y-6">
              {/* Section 1: Item Details */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Item Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium block mb-1">Select Item *</label>
                    <select className="w-full px-3 py-2 border rounded-md text-sm bg-white" defaultValue={selectedItem?.id}>
                      <option value="">-- Choose Item --</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} (Cur: {i.quantity})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Quantity Received *</label>
                    <input type="number" required className="w-full px-3 py-2 border rounded-md text-sm bg-white" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Unit Cost (₹)</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-md text-sm bg-white" defaultValue={selectedItem?.unitPrice} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Total Value</label>
                    <input disabled className="w-full px-3 py-2 border rounded-md text-sm bg-gray-100" placeholder="Auto-calculated" />
                  </div>
                </div>
              </div>

              {/* Section 2: Supplier & Invoice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Supplier Name</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. AgroCorp International" defaultValue={selectedItem?.supplier} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Invoice / Bill Number</label>
                  <input required className="w-full px-3 py-2 border rounded-md text-sm" placeholder="INV-202X-000" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Received Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Received By</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Staff Name" />
                </div>
              </div>

              {/* Section 3: Batch Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Batch Number</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Optional" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Expiry Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium block mb-1">Storage Condition / Notes</label>
                  <textarea className="w-full px-3 py-2 border rounded-md text-sm" rows={2} placeholder="e.g. Keep in dry place, fragile..." />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsAddStockOpen(false)} className="px-5 py-2.5 text-sm font-medium border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4" /> Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ISSUE STOCK (OUTWARD) --- */}
      {isIssueStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-2xl rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-orange-700 flex items-center gap-2">
                <ArrowUpRight className="w-6 h-6" /> Issue Stock (Outward)
              </h3>
              <button onClick={() => { setIsIssueStockOpen(false); setSelectedItem(null); }}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            
            <form onSubmit={(e) => handleStockAction(e, 'OUT')} className="space-y-6">
              
              {/* Item Info Card */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Item</p>
                  <p className="font-bold text-lg text-foreground">{selectedItem ? selectedItem.name : "Select Item below"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Available Quantity</p>
                  <p className="font-bold text-lg text-foreground">{selectedItem ? `${selectedItem.quantity} ${selectedItem.unit}` : "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!selectedItem && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium block mb-1">Select Item to Issue *</label>
                    <select className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                      <option>Select Item...</option>
                      {items.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1">Quantity to Issue *</label>
                  <input type="number" required max={selectedItem?.quantity} className="w-full px-3 py-2 border rounded-md text-sm bg-white" placeholder="0.00" />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Issue Date</label>
                  <input type="date" required className="w-full px-3 py-2 border rounded-md text-sm bg-white" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium block mb-1">Issue To (Target) *</label>
                  <div className="relative">
                    <input required className="w-full px-3 py-2 pl-9 border rounded-md text-sm bg-white" placeholder="Farm ID, Vehicle No, or Employee Name" />
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Department</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                    <option>Field Operations</option>
                    <option>Logistics</option>
                    <option>Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Authorized By</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm bg-white" placeholder="Supervisor Name" />
                </div>

                <div className="col-span-2">
                  <label className="text-sm font-medium block mb-1">Purpose / Usage Details</label>
                  <textarea className="w-full px-3 py-2 border rounded-md text-sm bg-white" rows={2} placeholder="e.g. Sowing for Block A, Tractor Servicing..." />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsIssueStockOpen(false)} className="px-5 py-2.5 text-sm font-medium border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT ITEM (UPDATE) --- */}
      {isEditItemOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Edit Item Details
              </h3>
              <button onClick={() => { setIsEditItemOpen(false); setSelectedItem(null); }}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            
            <form onSubmit={(e) => handleStockAction(e, 'UPDATE')} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Item Name</label>
                <input className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">SKU</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.sku} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Category</label>
                  <select className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.category}>
                    <option>Fertilizer</option>
                    <option>Pesticide</option>
                    <option>Fuel</option>
                    <option>Seeds</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Reorder Level</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.reorderLevel} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Location</label>
                  <input className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.location} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Storage Instructions</label>
                <input className="w-full px-3 py-2 border rounded-md text-sm" defaultValue={selectedItem.storageCondition} />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t mt-4">
                <button type="button" onClick={() => setIsEditItemOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FLOATING FUEL REQUEST BUTTON --- */}
      <button
        onClick={() => setIsFuelRequestsOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 z-40 group"
        title="View Fuel Requests"
      >
        <div className="relative">
          <Fuel className="w-6 h-6" />
          {pendingFuelRequests > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {pendingFuelRequests}
            </span>
          )}
        </div>
      </button>

      {/* --- MODAL: FUEL REQUESTS --- */}
      {isFuelRequestsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-4xl rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Fuel className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl">Fuel Requests</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {pendingFuelRequests} pending request{pendingFuelRequests !== 1 ? 's' : ''} • {fuelRequests.length} total
                    </p>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by Request ID, Driver Name, or Vehicle Number..."
                    value={fuelSearchQuery}
                    onChange={(e) => setFuelSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {fuelSearchQuery && (
                    <button
                      onClick={() => setFuelSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsFuelRequestsOpen(false);
                  setFuelSearchQuery('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
              >
                <X className="w-5 h-5 text-muted-foreground"/>
              </button>
            </div>
            
            {/* Fuel Requests Table */}
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Request ID</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Driver</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Vehicle</th>
                    <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Amount (L)</th>
                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-6 py-4 text-center font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFuelRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{fuelSearchQuery ? 'No matching fuel requests found' : 'No fuel requests found'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFuelRequests.map((request) => (
                      <tr key={request.request_id} className="hover:bg-muted/20">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {request.request_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{request.driverName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium">{request.vehicleNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Fuel className="w-4 h-4 text-blue-600" />
                            <span className="font-bold">{request.requestedAmount} L</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(request.requestDate), 'dd MMM yyyy, HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {request.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                              Delivered
                            </span>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(request)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                              Requested
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {fuelSearchQuery ? (
                  <>
                    Showing {filteredFuelRequests.length} of {fuelRequests.length} request{fuelRequests.length !== 1 ? 's' : ''} • 
                    Total: <span className="font-bold text-foreground">{filteredFuelRequests.reduce((sum, req) => sum + req.requestedAmount, 0)} L</span>
                  </>
                ) : (
                  <>
                    Total Fuel Requested: <span className="font-bold text-foreground">{fuelRequests.reduce((sum, req) => sum + req.requestedAmount, 0)} L</span>
                  </>
                )}
              </div>
              <button 
                onClick={() => {
                  setIsFuelRequestsOpen(false);
                  setFuelSearchQuery('');
                }}
                className="px-5 py-2.5 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: MARK AS DELIVERED --- */}
      {isConfirmDeliveryOpen && selectedFuelRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Fuel className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1">Confirm Fuel Delivery</h3>
                <p className="text-sm text-muted-foreground">Mark this fuel request as delivered?</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Request ID:</span>
                <span className="font-mono font-medium">{selectedFuelRequest.request_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Driver:</span>
                <span className="font-medium">{selectedFuelRequest.driverName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="font-mono font-medium">{selectedFuelRequest.vehicleNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-blue-600">{selectedFuelRequest.requestedAmount} L</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsConfirmDeliveryOpen(false);
                  setSelectedFuelRequest(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelivery}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;