import { useEffect, useState } from 'react';
import { 
  Search, Plus, Minus, 
  Package, AlertTriangle, 
  ArrowUpRight, ArrowDownLeft, X,
  FileText, TrendingUp, Download, Edit, RefreshCw,
  User, Fuel, ChevronDown, ChevronRight
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

type AdminRequestOption = 'fuel' | 'equipment';

type EquipmentCartItem = {
  name: string;
  quantity: number;
};

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
  const [selectedFuelIds, setSelectedFuelIds] = useState<string[]>([]);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedFuelRequest, setSelectedFuelRequest] = useState<FuelRequest | null>(null);
  const [adminFuelSnapshot, setAdminFuelSnapshot] = useState<FuelRequest[] | null>(null);
  const [isSendingAdminRequest, setIsSendingAdminRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    note: '',
    option: 'fuel' as AdminRequestOption,
    priority: 'medium' as RequestPriority,
    equipmentCart: [] as EquipmentCartItem[],
    equipmentName: '',
    equipmentQty: '1',
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
  const fetchFuelRequests = async (): Promise<FuelRequest[] | null> => {
    setIsFuelLoading(true);
    try {
      const url = `${getBaseUrl()}/inventory/get_all_fuel_request`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.fuel_requests)) {
        const mapped: FuelRequest[] = data.fuel_requests.map((fr: any, idx: number) => mapBackendFuelRequest(fr, idx));
        setFuelRequests(mapped);
        return mapped;
      } else {
        toast.error('Failed to load fuel requests');
        return null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching fuel requests', err);
      toast.error('Error fetching fuel requests');
      return null;
    } finally {
      setIsFuelLoading(false);
    }
  };

  const toggleSelectFuel = (id: string) => {
    setSelectedFuelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllFuelRequests = () => {
    setSelectedFuelIds(filteredFuelRequests.map(r => r.request_id));
  };

  const deselectAllFuelRequests = () => {
    setSelectedFuelIds([]);
  };

  const makeFuelRequest = () => {
    if (selectedFuelIds.length === 0) return;
    toast.success(`Processed ${selectedFuelIds.length} fuel request${selectedFuelIds.length > 1 ? 's' : ''}`);
    // Placeholder for real action; closing modal for now
    setSelectedFuelIds([]);
    setIsFuelRequestsOpen(false);
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

  const handleSubmitNewRequest = async () => {
    const note = newRequest.note.trim();

    if (!newRequest.option) {
      toast.error('Please choose an option');
      return;
    }

    if (newRequest.option === 'equipment' && newRequest.equipmentCart.length === 0) {
      toast.error('Please add at least one equipment item');
      return;
    }

    if (newRequest.option === 'fuel' && adminFuelSnapshot === null) {
      toast.error('Please fetch fuel requirements first');
      return;
    }

    if (newRequest.option === 'fuel') {
      const meta_data = (adminFuelSnapshot || []).map((r) => ({
        request_id: r.request_id,
        vehicle_number: r.vehicleNumber,
        fuel_amount: Number(r.requestedAmount) || 0,
        driver_name: r.driverName,
      }));

      setIsSendingAdminRequest(true);
      try {
        const url = `${getBaseUrl()}/admin_ops_requests/make_fuel_request`;
        const body = {
          staff_id: '8c4b07a6-bace-4cf9-9aad-7ecf4ae9244c',
          note,
          request_location: '',
          meta_data,
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`HTTP ${res.status} - ${text}`);
        }

        const data = await res.json().catch(() => null);
        if (data && data.success === false) {
          toast.error(data.message || 'Failed to send fuel request');
          return;
        }

        toast.success('Fuel request sent to Admin');
        setIsNewRequestModalOpen(false);
        setAdminFuelSnapshot(null);
        setNewRequest({
          note: '',
          option: 'fuel',
          priority: 'medium',
          equipmentCart: [],
          equipmentName: '',
          equipmentQty: '1',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error sending fuel request to admin', err);
        toast.error('Error sending fuel request');
      } finally {
        setIsSendingAdminRequest(false);
      }

      return;
    }

    const nowIso = new Date().toISOString();
    const totalEquipmentQty = newRequest.equipmentCart.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const equipmentSummary = newRequest.equipmentCart.map((it) => `${it.name} x${it.quantity}`).join(', ');

    const fuelTotalLiters = adminFuelSnapshot
      ? Math.max(0, adminFuelSnapshot.reduce((sum, r) => sum + (Number(r.requestedAmount) || 0), 0))
      : 0;
    const fuelSummaryText = adminFuelSnapshot
      ? adminFuelSnapshot
          .map((r) => `${r.request_id} (${r.vehicleNumber}) ${r.requestedAmount}L - ${r.status}`)
          .join('\n')
      : '';

    const optionLabel = newRequest.option === 'fuel' ? 'Fuel Request' : 'Equipment Request';

    const newReq: InventoryRequest = {
      id: `IR-${String(inventoryRequests.length + 1).padStart(3, '0')}`,
      requesterId: '—',
      requesterName: '—',
      requesterPhone: '—',

      itemCategory: newRequest.option === 'fuel' ? 'Fuel' : 'Equipment',
      itemName:
        newRequest.option === 'fuel'
          ? `Fuel requirement (${adminFuelSnapshot?.length ?? 0} request${(adminFuelSnapshot?.length ?? 0) !== 1 ? 's' : ''})`
          : `Equipment: ${equipmentSummary}`,
      quantity: newRequest.option === 'fuel'
        ? fuelTotalLiters
        : totalEquipmentQty,
      unit: newRequest.option === 'fuel' ? 'L' : 'units',
      purpose: optionLabel,
      requestDate: nowIso,
      requiredDate: nowIso.slice(0, 10),
      status: 'pending',
      priority: newRequest.priority,
      description:
        newRequest.option === 'fuel'
          ? [note || '—', '', 'Fuel Requests:', fuelSummaryText || '—'].join('\n')
          : (note || optionLabel),
      createdAt: nowIso,

      receiverId: 'ADMIN',
      receiverName: 'Admin Review Pending',
      receiverDepartment: 'Administration',
    };

    setInventoryRequests((prev) => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);
    setAdminFuelSnapshot(null);

    setNewRequest({
      note: '',
      option: 'fuel',
      priority: 'medium',
      equipmentCart: [],
      equipmentName: '',
      equipmentQty: '1',
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

  const pendingInventoryRequestsCount = inventoryRequests.filter(r => r.status === 'pending').length;

  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' };
      case 'approved': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' };
      case 'in_progress': return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'In Progress' };
      case 'completed': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' };
      case 'rejected': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' };
    }
  };

  const getPriorityConfig = (priority: RequestPriority) => {
    switch (priority) {
      case 'urgent': return { color: 'text-red-700', bg: 'bg-red-50', icon: '🔴' };
      case 'high': return { color: 'text-orange-700', bg: 'bg-orange-50', icon: '🟠' };
      case 'medium': return { color: 'text-yellow-700', bg: 'bg-yellow-50', icon: '🟡' };
      case 'low': return { color: 'text-gray-700', bg: 'bg-gray-50', icon: '⚪' };
    }
  };

  const formatRequestDateTime = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString();
  };

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

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aT = new Date(a.requestDate || a.createdAt).getTime();
    const bT = new Date(b.requestDate || b.createdAt).getTime();
    if (Number.isNaN(aT) && Number.isNaN(bT)) return 0;
    if (Number.isNaN(aT)) return 1;
    if (Number.isNaN(bT)) return -1;
    return bT - aT;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
                <p className="text-sm text-gray-600 mt-0.5">Manage requests and stock</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {pendingInventoryRequestsCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {pendingInventoryRequestsCount} pending request{pendingInventoryRequestsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsFuelRequestsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Fuel className="w-4 h-4" />
                Fuel Requests
                {pendingFuelRequests > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    {pendingFuelRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Send to Admin Request
              </button>

              <button
                onClick={() => { setSelectedItem(null); setIsIssueStockOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg font-medium hover:bg-orange-100 transition-colors"
              >
                <Minus className="w-4 h-4" />
                Issue Stock
              </button>
              <button
                onClick={() => { setSelectedItem(null); setIsAddStockOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-8">
        {loadingRequests ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading requests...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div>Request ID</div>
                  <div>Sender</div>
                  <div>Date &amp; Time</div>
                  <div className="md:text-right">Status</div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 bg-white">
                {sortedRequests.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No requests available</p>
                  </div>
                ) : (
                  sortedRequests.map((req) => {
                    const statusConfig = getStatusConfig(req.status);
                    const priorityConfig = getPriorityConfig(req.priority);
                    const dateTime = formatRequestDateTime(req.createdAt || req.requestDate);

                    return (
                      <details key={req.id} className="group">
                        <summary
                          className={cn(
                            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
                            "px-6 py-4 hover:bg-gray-50 transition-colors",
                            "flex items-center gap-4"
                          )}
                        >
                          <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <div className="font-mono text-sm font-semibold text-gray-900 truncate">{req.id}</div>
                            <div className="text-sm font-medium text-gray-900 truncate">{req.requesterName}</div>
                            <div className="text-sm text-gray-600 truncate">{dateTime}</div>
                            <div className="md:text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>

                          <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                        </summary>

                        <div className="px-6 pb-6 pt-4 bg-gray-50 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-x divide-dashed divide-gray-300">
                            {/* Sender Details */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Sender Details</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-500">User ID</p>
                                  <p className="text-sm font-medium text-gray-900">{req.requesterId || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Name</p>
                                  <p className="text-sm font-medium text-gray-900">{req.requesterName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Phone</p>
                                  <p className="text-sm font-medium text-gray-900">{req.requesterPhone}</p>
                                </div>
                              </div>
                            </div>

                            {/* Request Details */}
                            <div className="space-y-3 md:pl-6">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Request Details</h4>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-500">Item</p>
                                  <p className="text-sm font-medium text-gray-900">{req.itemCategory} — {req.itemName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Quantity</p>
                                  <p className="text-sm font-medium text-gray-900">{req.quantity} {req.unit}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Purpose</p>
                                  <p className="text-sm font-medium text-gray-900">{req.purpose || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Required Date</p>
                                  <p className="text-sm font-medium text-gray-900">{formatRequestDateTime(req.requiredDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Priority</p>
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
                                    {priorityConfig.icon} {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                                  </span>
                                </div>
                                {req.description ? (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                                    <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                                      {req.description}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 md:pl-6">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Actions</h4>
                              {req.status === 'pending' ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">No actions available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: NEW REQUEST (SEND TO ADMIN) --- */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Send Request to Admin</h3>
                <p className="text-sm text-gray-600 mt-1">Submit an inventory request for admin approval</p>
              </div>
              <button 
                onClick={() => { setIsNewRequestModalOpen(false); setAdminFuelSnapshot(null); }}
                className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={newRequest.note}
                  onChange={(e) => setNewRequest({ ...newRequest, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                  rows={3}
                  placeholder="Write a note..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setNewRequest({ ...newRequest, option: 'fuel' })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setNewRequest({ ...newRequest, option: 'fuel' }); }}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-colors',
                      newRequest.option === 'fuel' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">Fuel Request</div>
                        <div className="text-xs text-gray-600 mt-0.5">Fetch all fuel requirements</div>
                      </div>
                      <Fuel className={cn('w-5 h-5', newRequest.option === 'fuel' ? 'text-blue-700' : 'text-gray-500')} />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const result = await fetchFuelRequests();
                          if (result) setAdminFuelSnapshot(result);
                        }}
                        disabled={isFuelLoading}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-semibold border transition-colors',
                          isFuelLoading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50 border-gray-200'
                        )}
                      >
                        {isFuelLoading ? 'Fetching…' : 'Fetch'}
                      </button>
                      <div className="text-xs text-gray-600">
                        Pending: <span className="font-semibold">{pendingFuelRequests}</span> • Total: <span className="font-semibold">{fuelRequests.length}</span>
                      </div>
                    </div>

                    {newRequest.option === 'fuel' && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        {adminFuelSnapshot === null ? (
                          <div className="text-xs text-gray-600">Click “Fetch” to attach the current fuel requests.</div>
                        ) : adminFuelSnapshot.length === 0 ? (
                          <div className="text-xs text-gray-600">No fuel requests found.</div>
                        ) : (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-700">Fetched Fuel Requests</div>
                              <div className="text-xs text-gray-600">
                                Count: <span className="font-semibold">{adminFuelSnapshot.length}</span> • Total: <span className="font-semibold">{adminFuelSnapshot.reduce((s, r) => s + (Number(r.requestedAmount) || 0), 0)} L</span>
                              </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-white">
                                  <tr className="text-left text-gray-500">
                                    <th className="px-3 py-2 font-medium">ID</th>
                                    <th className="px-3 py-2 font-medium">Vehicle</th>
                                    <th className="px-3 py-2 font-medium text-right">L</th>
                                    <th className="px-3 py-2 font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {adminFuelSnapshot.map((r) => (
                                    <tr key={r.request_id} className="text-gray-700">
                                      <td className="px-3 py-2 font-mono">{r.request_id}</td>
                                      <td className="px-3 py-2 font-mono">{r.vehicleNumber}</td>
                                      <td className="px-3 py-2 text-right">{r.requestedAmount}</td>
                                      <td className="px-3 py-2">{r.status}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-700 flex items-center justify-between">
                              <span className="font-medium">Total Fuel Requirement</span>
                              <span className="font-semibold">{adminFuelSnapshot.reduce((s, r) => s + (Number(r.requestedAmount) || 0), 0)} L</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setNewRequest({ ...newRequest, option: 'equipment' })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setNewRequest({ ...newRequest, option: 'equipment' }); }}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-colors',
                      newRequest.option === 'equipment' ? 'border-slate-300 bg-slate-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">Equipment Request</div>
                        <div className="text-xs text-gray-600 mt-0.5">Add equipment and quantities to a cart</div>
                      </div>
                      <Package className={cn('w-5 h-5', newRequest.option === 'equipment' ? 'text-slate-700' : 'text-gray-500')} />
                    </div>

                    {newRequest.option === 'equipment' ? (
                      <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newRequest.equipmentName}
                            onChange={(e) => setNewRequest({ ...newRequest, equipmentName: e.target.value })}
                            className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="Equipment name"
                          />
                          <input
                            type="number"
                            min={1}
                            value={newRequest.equipmentQty}
                            onChange={(e) => setNewRequest({ ...newRequest, equipmentQty: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="Qty"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const name = newRequest.equipmentName.trim();
                            const qty = Math.max(1, Number(newRequest.equipmentQty) || 1);
                            if (!name) {
                              toast.error('Enter equipment name');
                              return;
                            }
                            setNewRequest({
                              ...newRequest,
                              equipmentCart: [...newRequest.equipmentCart, { name, quantity: qty }],
                              equipmentName: '',
                              equipmentQty: '1',
                            });
                          }}
                          className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                        >
                          Add to Cart
                        </button>

                        {newRequest.equipmentCart.length > 0 ? (
                          <div className="bg-white border border-gray-200 rounded-lg divide-y">
                            {newRequest.equipmentCart.map((it, idx) => (
                              <div key={`${it.name}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{it.name}</div>
                                  <div className="text-xs text-gray-600">Qty: {it.quantity}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewRequest({
                                      ...newRequest,
                                      equipmentCart: newRequest.equipmentCart.filter((_, i) => i !== idx),
                                    });
                                  }}
                                  className="px-2 py-1 text-xs font-medium border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">Cart is empty</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority of request</label>
                <select
                  value={newRequest.priority}
                  onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value as RequestPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex">
              <button
                onClick={handleSubmitNewRequest}
                disabled={isSendingAdminRequest}
                className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                {isSendingAdminRequest ? 'Sending…' : 'Send Request'}
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
                    onClick={selectAllFuelRequests}
                    disabled={filteredFuelRequests.length === 0 || selectedFuelIds.length === filteredFuelRequests.length}
                    className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllFuelRequests}
                    disabled={selectedFuelIds.length === 0}
                    className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deselect All
                  </button>
                  {selectedFuelIds.length > 0 && (
                    <button
                      onClick={makeFuelRequest}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Make Fuel Request
                    </button>
                  )}
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
                      setSelectedFuelIds([]);
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
                        <th className="px-4 py-4" />
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
                          <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                            <Fuel className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>{fuelSearchQuery ? 'No matching fuel requests found' : 'No fuel requests found'}</p>
                          </td>
                        </tr>
                      ) : (
                        filteredFuelRequests.map((request) => (
                          <tr key={request.request_id} className="hover:bg-muted/20">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedFuelIds.includes(request.request_id)}
                                onChange={() => toggleSelectFuel(request.request_id)}
                              />
                            </td>
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
                  setSelectedFuelIds([]);
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