import { useState } from 'react';
import { 
  Search, Filter, Plus, Minus, 
  Package, AlertTriangle, History, 
  ArrowUpRight, ArrowDownLeft, X,
  FileText, TrendingUp, Download, Edit,
  Calendar, User, MapPin, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type ItemCategory = 'Fertilizer' | 'Pesticide' | 'Seeds' | 'Fuel' | 'Spare Parts' | 'Equipment';
type UnitType = 'kg' | 'L' | 'g' | 'units' | 'bags';

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  
  // State for UI
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Modal States
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isIssueStockOpen, setIsIssueStockOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

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

  // Stats
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const lowStockCount = items.filter(item => item.quantity <= item.reorderLevel).length;

  // Filter
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
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

    </div>
  );
};

export default Inventory;