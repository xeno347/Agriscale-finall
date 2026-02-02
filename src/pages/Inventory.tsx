import { useEffect, useState } from 'react';
import { 
  Search, Plus, Minus, 
  Package, AlertTriangle, 
  ArrowUpRight, ArrowDownLeft, X,
  FileText, TrendingUp, Download, Edit, RefreshCw,
  Calendar, User, MapPin, Tag, Fuel, ChevronDown, ChevronRight
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
type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type RequestPriority = 'urgent' | 'high' | 'medium' | 'low';

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

interface InventoryRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  itemCategory: ItemCategory;
  itemName: string;
  quantity: number;
  unit: UnitType;
  purpose: string;
  requestDate: string;
  requiredDate: string;
  status: RequestStatus;
  priority: RequestPriority;
  description: string;
  createdAt: string;
  receiverId?: string;
  receiverName?: string;
  receiverDepartment?: string;
  adminNote?: string;
  forwardedBy?: string;
  forwardedAt?: string;
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
  const [isFuelLoading, setIsFuelLoading] = useState<boolean>(true);
  const [inventoryRequests, setInventoryRequests] = useState<InventoryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // State for UI
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [groupBy, setGroupBy] = useState('status');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pending: true,
    approved: false,
    in_progress: false,
    completed: false,
    rejected: false,
  });
  
  // Modal States
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isIssueStockOpen, setIsIssueStockOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isFuelRequestsOpen, setIsFuelRequestsOpen] = useState(false);
  const [isConfirmDeliveryOpen, setIsConfirmDeliveryOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedFuelRequest, setSelectedFuelRequest] = useState<FuelRequest | null>(null);
  const [newRequest, setNewRequest] = useState({
    requesterName: '',
    requesterPhone: '',
    itemCategory: 'Fertilizer' as ItemCategory,
    itemName: '',
    quantity: '',
    unit: 'kg' as UnitType,
    purpose: '',
    requiredDate: '',
    priority: 'medium' as RequestPriority,
    description: '',
  });

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

  const confirmDelivery = async () => {
    if (!selectedFuelRequest) return;
    const req = selectedFuelRequest;
    try {
      const url = `${getBaseUrl()}/inventory/confirm_fuel_request`;
      const body = {
        vehicle_number: req.vehicleNumber,
        request_id: req.request_id,
        status: 'delivered'
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status} - ${text}`);
      }

      const data = await res.json().catch(() => null);
      if (data && data.success === false) {
        toast.error(data.message || 'Failed to confirm delivery');
        return;
      }

      setFuelRequests(prev => prev.map(r => r.request_id === req.request_id ? { ...r, status: 'delivered' } : r));
      toast.success(`Fuel delivered to ${req.vehicleNumber}`);
      setIsConfirmDeliveryOpen(false);
      setSelectedFuelRequest(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error confirming fuel delivery', err);
      toast.error('Error confirming fuel delivery');
    }
  };

  // Fetch fuel requests (reusable for mount + refresh)
  const fetchFuelRequests = async () => {
    setIsFuelLoading(true);
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
    } finally {
      setIsFuelLoading(false);
    }
  };

  useEffect(() => {
    fetchFuelRequests();
    fetchInventoryRequests();
  }, []);

  // Fetch inventory requests
  const fetchInventoryRequests = async () => {
    setLoadingRequests(true);
    try {
      // Mock data for inventory requests
      const mockRequests: InventoryRequest[] = [
        {
          id: 'IR-001',
          requesterId: 'U001',
          requesterName: 'Ramesh Kumar',
          requesterPhone: '+91 98765 43210',
          itemCategory: 'Fertilizer',
          itemName: 'NPK Fertilizer',
          quantity: 100,
          unit: 'bags',
          purpose: 'Field 12-A Cultivation',
          requestDate: '2026-01-30T08:00:00',
          requiredDate: '2026-02-05',
          status: 'pending',
          priority: 'high',
          description: 'Need NPK fertilizer for upcoming cultivation season',
          createdAt: '2026-01-30T08:00:00',
        },
        {
          id: 'IR-002',
          requesterId: 'U002',
          requesterName: 'Priya Sharma',
          requesterPhone: '+91 98765 43211',
          itemCategory: 'Pesticide',
          itemName: 'Organic Pesticide',
          quantity: 20,
          unit: 'L',
          purpose: 'Pest Control - Block B',
          requestDate: '2026-01-29T10:30:00',
          requiredDate: '2026-02-02',
          status: 'approved',
          priority: 'urgent',
          description: 'Urgent pest control needed in Block B',
          createdAt: '2026-01-29T10:30:00',
          receiverId: 'I001',
          receiverName: 'Inventory Manager',
          receiverDepartment: 'Inventory',
          adminNote: 'Approved - High priority',
          forwardedBy: 'Admin Verma',
          forwardedAt: '2026-01-29T12:00:00',
        },
      ];
      setInventoryRequests(mockRequests);
    } catch (e) {
      toast.error('Failed to load inventory requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmitNewRequest = () => {
    // Validate required fields
    if (!newRequest.requesterName || !newRequest.requesterPhone || !newRequest.itemName || 
        !newRequest.quantity || !newRequest.requiredDate || !newRequest.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newReq: InventoryRequest = {
      id: `IR-${String(inventoryRequests.length + 1).padStart(3, '0')}`,
      requesterId: 'U' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      requesterName: newRequest.requesterName,
      requesterPhone: newRequest.requesterPhone,
      itemCategory: newRequest.itemCategory,
      itemName: newRequest.itemName,
      quantity: parseInt(newRequest.quantity),
      unit: newRequest.unit,
      purpose: newRequest.purpose,
      requestDate: new Date().toISOString(),
      requiredDate: newRequest.requiredDate,
      status: 'pending',
      priority: newRequest.priority,
      description: newRequest.description,
      createdAt: new Date().toISOString(),
      receiverId: 'ADMIN',
      receiverName: 'Admin Review Pending',
      receiverDepartment: 'Administration',
    };

    setInventoryRequests(prev => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);
    
    // Reset form
    setNewRequest({
      requesterName: '',
      requesterPhone: '',
      itemCategory: 'Fertilizer',
      itemName: '',
      quantity: '',
      unit: 'kg',
      purpose: '',
      requiredDate: '',
      priority: 'medium',
      description: '',
    });
    
    toast.success('Request sent to Admin for review!');
  };

  const handleApproveRequest = (id: string) => {
    setInventoryRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'approved' as RequestStatus } : req
    ));
    toast.success('Request approved');
  };

  const handleRejectRequest = (id: string) => {
    setInventoryRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'rejected' as RequestStatus } : req
    ));
    toast.error('Request rejected');
  };

  // Stats
  const pendingFuelRequests = fuelRequests.filter(req => req.status === 'requested').length;
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const lowStockCount = items.filter(item => item.quantity <= item.reorderLevel).length;

  // Filter and group requests
  const filteredRequests = inventoryRequests.filter(req => {
    const query = searchQuery.toLowerCase();
    return (
      req.id.toLowerCase().includes(query) ||
      req.requesterName.toLowerCase().includes(query) ||
      req.itemName.toLowerCase().includes(query) ||
      req.purpose.toLowerCase().includes(query)
    );
  });

  const groupedRequests: Record<RequestStatus, InventoryRequest[]> = {
    pending: filteredRequests.filter(r => r.status === 'pending'),
    approved: filteredRequests.filter(r => r.status === 'approved'),
    in_progress: filteredRequests.filter(r => r.status === 'in_progress'),
    completed: filteredRequests.filter(r => r.status === 'completed'),
    rejected: filteredRequests.filter(r => r.status === 'rejected'),
  };

  const toggleSection = (status: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

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
        {/* SEARCH AND FILTERS */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by requester, location, vehicle, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="requester">Sort by Requester</option>
              </select>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="status">Group by Status</option>
                <option value="priority">Group by Priority</option>
              </select>
            </div>
          </div>

          {/* STATS ROW */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{inventoryRequests.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Filtered: </span>
              <span className="font-semibold">{filteredRequests.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-semibold text-amber-600">{groupedRequests.pending.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">In Progress: </span>
              <span className="font-semibold text-purple-600">{groupedRequests.in_progress.length}</span>
            </div>
          </div>
        </div>

        {/* SEND TO ADMIN BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsNewRequestModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Send to Admin Request
          </button>
        </div>

        {/* GROUPED REQUESTS */}
        {loadingRequests ? (
          <div className="flex items-center justify-center p-12 bg-white border border-border rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PENDING SECTION */}
            {groupedRequests.pending.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection('pending')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.pending ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    <h3 className="text-lg font-semibold">Pending</h3>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                      {groupedRequests.pending.length}
                    </span>
                  </div>
                </button>
                
                {expandedSections.pending && (
                  <div className="divide-y divide-border">
                    {groupedRequests.pending.map((req) => (
                      <div key={req.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* REQUEST ID */}
                          <div className="lg:col-span-2">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Request ID</div>
                            <div className="font-mono text-sm font-semibold">{req.id}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              User ID: {req.requesterId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(req.createdAt), 'dd/MM/yyyy, HH:mm a')}
                            </div>
                          </div>

                          {/* SENDER DETAILS */}
                          <div className="lg:col-span-2">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sender Details</div>
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-sm">{req.requesterName}</div>
                                <div className="text-xs text-muted-foreground mt-1">{req.requesterPhone}</div>
                              </div>
                            </div>
                          </div>

                          {/* RECEIVER DETAILS */}
                          <div className="lg:col-span-2">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receiver Details</div>
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-sm">{req.receiverName || 'Admin Review'}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {req.receiverDepartment || 'Administration'}
                                </div>
                                {req.receiverId && (
                                  <div className="text-xs text-muted-foreground">ID: {req.receiverId}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* REQUEST DETAILS */}
                          <div className="lg:col-span-3">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Request Details</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Item Category</span>
                                  <div className="font-medium">{req.itemCategory}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Purpose</span>
                                  <div className="font-medium">{req.purpose}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Preferred Date</span>
                                  <div className="font-medium">{format(new Date(req.requiredDate), 'dd/MM/yyyy')}</div>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Load</span>
                                  <div className="font-medium">{req.itemName}</div>
                                </div>
                              </div>
                            </div>
                            {req.description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs italic text-muted-foreground">
                                "{req.description}"
                              </div>
                            )}
                          </div>

                          {/* PRIORITY */}
                          <div className="lg:col-span-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</div>
                            <span className={cn(
                              "inline-flex px-3 py-1 rounded-full text-xs font-semibold",
                              req.priority === 'urgent' && 'bg-red-100 text-red-700',
                              req.priority === 'high' && 'bg-orange-100 text-orange-700',
                              req.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                              req.priority === 'low' && 'bg-gray-100 text-gray-700'
                            )}>
                              {req.priority.toUpperCase()}
                            </span>
                          </div>

                          {/* STATUS */}
                          <div className="lg:col-span-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                            <span className="inline-flex px-3 py-1 rounded bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                              Pending
                            </span>
                          </div>

                          {/* ACTIONS */}
                          <div className="lg:col-span-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Actions</div>
                            <div className="flex flex-col gap-2">
                              {req.receiverId !== 'ADMIN' ? (
                                <button
                                  onClick={() => {
                                    setInventoryRequests(prev => prev.map(r => 
                                      r.id === req.id ? { ...r, receiverId: 'ADMIN', receiverName: 'Admin Review Pending' } : r
                                    ));
                                    toast.success('Request sent to Admin for review');
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Send to Admin Request
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* IN PROGRESS SECTION */}
            {groupedRequests.in_progress.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection('in_progress')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.in_progress ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    <h3 className="text-lg font-semibold">In Progress</h3>
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {groupedRequests.in_progress.length}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* APPROVED SECTION */}
            {groupedRequests.approved.length > 0 && (
              <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleSection('approved')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.approved ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    <h3 className="text-lg font-semibold">Approved</h3>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {groupedRequests.approved.length}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {filteredRequests.length === 0 && (
              <div className="p-12 text-center text-muted-foreground bg-white border border-border rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No inventory requests found</p>
              </div>
            )}
          </div>
        )}
      </div>      {/* --- MODAL: NEW REQUEST (SEND TO ADMIN) --- */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Send Request to Admin</h3>
                <p className="text-sm text-gray-600 mt-1">Submit an inventory request for admin approval</p>
              </div>
              <button 
                onClick={() => setIsNewRequestModalOpen(false)}
                className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requester Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.requesterName}
                    onChange={(e) => setNewRequest({...newRequest, requesterName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newRequest.requesterPhone}
                    onChange={(e) => setNewRequest({...newRequest, requesterPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.itemCategory}
                    onChange={(e) => setNewRequest({...newRequest, itemCategory: e.target.value as ItemCategory})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="Fertilizer">Fertilizer</option>
                    <option value="Pesticide">Pesticide</option>
                    <option value="Seeds">Seeds</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.itemName}
                    onChange={(e) => setNewRequest({...newRequest, itemName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="e.g., NPK Fertilizer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={newRequest.quantity}
                    onChange={(e) => setNewRequest({...newRequest, quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.unit}
                    onChange={(e) => setNewRequest({...newRequest, unit: e.target.value as UnitType})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="g">g</option>
                    <option value="units">units</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({...newRequest, priority: e.target.value as RequestPriority})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRequest.purpose}
                  onChange={(e) => setNewRequest({...newRequest, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="e.g., Field 12-A Cultivation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newRequest.requiredDate}
                  onChange={(e) => setNewRequest({...newRequest, requiredDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                  rows={3}
                  placeholder="Describe the purpose and urgency of this request..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setIsNewRequestModalOpen(false)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewRequest}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Send to Admin
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex items-start gap-2 ml-4">
                  <button
                    onClick={() => fetchFuelRequests()}
                    disabled={isFuelLoading}
                    title="Refresh"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 text-muted-foreground ${isFuelLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsFuelRequestsOpen(false);
                      setFuelSearchQuery('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground"/>
                  </button>
                </div>
            </div>
            
              {/* Fuel Requests Table or Loading */}
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                {isFuelLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-3" />
                    <p className="text-sm text-muted-foreground">Loading fuel requests...</p>
                  </div>
                ) : (
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
                )}
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