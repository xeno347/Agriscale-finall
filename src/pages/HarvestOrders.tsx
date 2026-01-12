import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Package, Plus, Truck, 
  CheckCircle2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---
interface HarvestOrder {
  id: string;
  ho_no: string;
  farming_model: 'own_lease' | 'contract';
  land_id: string;
  farmer: string;
  date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface TripSheet {
  id: string;
  trip_no: string;
  order_ref: string; // Links to Harvest Order
  vehicle: string;
  driver: string;
  status: 'dispatched' | 'arrived' | 'completed';
}

// --- MOCK DATA ---
const MOCK_ORDERS: HarvestOrder[] = [
  { id: 'ho1', ho_no: 'HO-001', farming_model: 'own_lease', land_id: 'L001', farmer: 'Ramesh P', date: '2024-12-20', status: 'in_progress' },
  { id: 'ho2', ho_no: 'HO-002', farming_model: 'contract', land_id: 'L005', farmer: 'Suresh K', date: '2024-12-22', status: 'scheduled' },
];

const MOCK_TRIPS: TripSheet[] = [
  { id: 't1', trip_no: 'TR-101', order_ref: 'HO-001', vehicle: 'MH-12-AB-1234', driver: 'Raju', status: 'arrived' },
  { id: 't2', trip_no: 'TR-102', order_ref: 'HO-001', vehicle: 'MH-14-XY-9876', driver: 'Sham', status: 'dispatched' },
];

// --- MAIN COMPONENT ---
const HarvestOrders = () => {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'orders' | 'trips'>('orders');
  
  // Modals State
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  const [isTripModalOpen, setTripModalOpen] = useState(false);

  // Stats for the top cards
  const stats = {
    active_orders: MOCK_ORDERS.filter(o => o.status === 'in_progress').length,
    trips_transit: MOCK_TRIPS.filter(t => t.status === 'dispatched').length,
    completed_today: 5 // Mock value
  };

  // --- ACTIONS ---
  const handleMainAction = () => {
    if (activeTab === 'orders') setOrderModalOpen(true);
    if (activeTab === 'trips') setTripModalOpen(true);
  };

  const closeModal = () => {
    setOrderModalOpen(false);
    setTripModalOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent, type: string) => {
    e.preventDefault();
    toast.success(`${type} created successfully`);
    closeModal();
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Harvest Operations</h1>
          <p className="text-muted-foreground mt-1">
            Manage Harvest Orders and Trip Logistics
          </p>
        </div>
        <button 
          onClick={handleMainAction}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'orders' && "Create Order"}
          {activeTab === 'trips' && "Dispatch Trip"}
        </button>
      </div>

      {/* --- OVERVIEW CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-border p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Active Orders</p>
            <h3 className="text-2xl font-bold text-blue-600">{stats.active_orders}</h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg"><Package className="w-5 h-5 text-blue-600"/></div>
        </div>
        <div className="bg-white border border-border p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Trips in Transit</p>
            <h3 className="text-2xl font-bold text-orange-600">{stats.trips_transit}</h3>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg"><Truck className="w-5 h-5 text-orange-600"/></div>
        </div>
        <div className="bg-white border border-border p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Completed Today</p>
            <h3 className="text-2xl font-bold text-green-600">{stats.completed_today}</h3>
          </div>
          <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600"/></div>
        </div>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {[
            { id: 'orders', label: '1. Harvest Orders', icon: Package },
            { id: 'trips', label: '2. Trip Sheets', icon: Truck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="min-h-[400px]">
        
        {/* 1. ORDERS TABLE */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-left-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Order No</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Farming Model</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Land / Farmer</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_ORDERS.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-foreground">{order.ho_no}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs border", order.farming_model === 'contract' ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-blue-50 border-blue-200 text-blue-700")}>
                        {order.farming_model === 'contract' ? 'Contract' : 'Own Lease'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.land_id}</span>
                        <span className="text-xs text-muted-foreground">{order.farmer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(order.date), 'dd MMM yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", order.status === 'in_progress' ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700")}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. TRIP SHEETS TABLE */}
        {activeTab === 'trips' && (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Trip No</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Order Ref</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Vehicle / Driver</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_TRIPS.map((trip) => (
                  <tr key={trip.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 font-bold text-foreground">{trip.trip_no}</td>
                    <td className="px-6 py-4 text-primary font-medium">{trip.order_ref}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{trip.vehicle}</span>
                        <span className="text-xs text-muted-foreground">{trip.driver}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", trip.status === 'dispatched' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                        {trip.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs text-muted-foreground hover:text-foreground underline">View Slip</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* --- MODALS (POPUPS) --- */}
      
      {/* 1. Create Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Create Harvest Order</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            <form onSubmit={(e) => handleFormSubmit(e, 'Order')} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Land Code</label>
                <input required className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. L001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Farmer Name</label>
                <input required className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Farmer Name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Scheduled Date</label>
                <input type="date" required className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">Create Order</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Trip Modal */}
      {isTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-md rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Dispatch New Trip</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            <form onSubmit={(e) => handleFormSubmit(e, 'Trip Sheet')} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Harvest Order ID</label>
                <select className="w-full px-3 py-2 border rounded-md text-sm">
                  {MOCK_ORDERS.map(o => <option key={o.id} value={o.id}>{o.ho_no}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle No</label>
                <input required className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. MH-12-AB-1234" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Driver Name</label>
                <input required className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Driver Name" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90">Dispatch Trip</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HarvestOrders;