import { useState } from 'react';
import { 
  Plus, Upload, Search, Filter, X, 
  Truck, Wrench, CheckCircle2, Car, MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---
interface Vehicle {
  id: string;
  registrationNo: string;
  ownerType: 'Owned' | 'Hired';
  vehicleType: 'Truck' | 'Tractor' | 'Trolley' | 'Tipper' | 'Pickup' | 'Car' | 'Other';
  make: string;
  model: string;
  status: 'Active' | 'In Service';
  lastServiceDate?: string;
}

// --- MOCK DATA ---
const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v1', registrationNo: 'MH12AB1234', ownerType: 'Owned', vehicleType: 'Truck', make: 'Tata', model: 'Prima', status: 'Active', lastServiceDate: '2024-11-10' },
  { id: 'v2', registrationNo: 'MH14XY9876', ownerType: 'Owned', vehicleType: 'Tractor', make: 'Mahindra', model: 'JIVO', status: 'In Service', lastServiceDate: '2024-12-01' },
  { id: 'v3', registrationNo: 'MH12ZZ5555', ownerType: 'Hired', vehicleType: 'Pickup', make: 'Bolero', model: 'Maxx', status: 'Active', lastServiceDate: '2024-10-20' },
];

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'Active').length,
    inService: vehicles.filter(v => v.status === 'In Service').length,
  };

  // --- ACTIONS ---
  
  const handleBulkUpload = () => {
    toast.success("Bulk upload template downloaded");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddModalOpen(false);
    toast.success("Vehicle onboarded successfully");
  };

  const toggleServiceStatus = (id: string) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === id) {
        const newStatus = v.status === 'Active' ? 'In Service' : 'Active';
        toast.info(newStatus === 'In Service' ? `Vehicle sent for servicing` : `Vehicle marked as active`);
        return { ...v, status: newStatus };
      }
      return v;
    }));
  };

  // Filter Logic
  const filteredVehicles = vehicles.filter(v => 
    v.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 relative">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vehicle Management</h1>
          <p className="text-muted-foreground mt-1">Onboard fleet, track maintenance, and manage ownership.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleBulkUpload}
            className="flex items-center gap-2 border border-border bg-white text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* --- STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground uppercase font-bold">Total Fleet</p><h3 className="text-2xl font-bold">{stats.total}</h3></div>
          <div className="p-2 bg-gray-100 rounded-lg"><Car className="w-5 h-5 text-gray-600"/></div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground uppercase font-bold">Active / On Road</p><h3 className="text-2xl font-bold text-green-600">{stats.active}</h3></div>
          <div className="p-2 bg-green-50 rounded-lg"><Truck className="w-5 h-5 text-green-600"/></div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground uppercase font-bold">In Service</p><h3 className="text-2xl font-bold text-orange-600">{stats.inService}</h3></div>
          <div className="p-2 bg-orange-50 rounded-lg"><Wrench className="w-5 h-5 text-orange-600"/></div>
        </div>
      </div>

      {/* --- LIST VIEW --- */}
      <div className="space-y-4">
        {/* Search */}
        <div className="flex gap-4 items-center bg-card border border-border p-3 rounded-lg shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Registration No or Make..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Registration No</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Make / Model</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Ownership</th>
                <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-muted-foreground">Service Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {vehicle.registrationNo}
                  </td>
                  <td className="px-6 py-4">{vehicle.vehicleType}</td>
                  <td className="px-6 py-4 text-muted-foreground">{vehicle.make} {vehicle.model}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs border",
                      vehicle.ownerType === 'Owned' ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-700"
                    )}>
                      {vehicle.ownerType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit",
                      vehicle.status === 'Active' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", vehicle.status === 'Active' ? "bg-green-600" : "bg-orange-600")} />
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {vehicle.status === 'Active' ? (
                      <button 
                        onClick={() => toggleServiceStatus(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors"
                        title="Send to Service Center"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Service
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleServiceStatus(vehicle.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                        title="Mark as Back from Service"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD VEHICLE MODAL (Matching Screenshot) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-lg border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-foreground">Add New Vehicle</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Registration No *</label>
                  <input required className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-gray-50/50" placeholder="MH12AB1234" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Owner Type</label>
                  <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-white">
                    <option>Owned</option>
                    <option>Hired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Vehicle Type</label>
                  <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-white">
                    <option>Truck</option>
                    <option>Tractor</option>
                    <option>Trolley</option>
                    <option>Tipper</option>
                    <option>Pickup</option>
                    <option>Car</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Make</label>
                  <input className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-gray-50/50" placeholder="Tata, Mahindra, etc." />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Model</label>
                <input className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-gray-50/50" />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e293b] rounded-lg hover:bg-[#0f172a] transition-colors"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VehicleManagement;