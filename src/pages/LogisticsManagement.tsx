import { useState, useRef } from 'react';
import { 
  Truck, Upload, Search, Filter, 
  MapPin, Clock, CheckCircle2, 
  AlertCircle, Package, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- TYPES ---
type TripStatus = 'scheduled' | 'loading' | 'in_transit' | 'unloading' | 'completed';

interface Vehicle {
  id: string;
  registrationNumber: string;
  type: 'Truck' | 'Tractor' | 'Pickup';
  driverName: string;
  driverPhone: string;
  status: 'Available' | 'On Trip' | 'Maintenance';
  currentTrip?: {
    id: string;
    from: string;
    to: string;
    startTime: string;
    eta: string;
    cargo: string;
    status: TripStatus;
    progress: number; // 0 to 100
  };
}

// --- INITIAL MOCK DATA ---
const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    registrationNumber: 'MH-12-AB-1234',
    type: 'Truck',
    driverName: 'Raju Singh',
    driverPhone: '+91 98765 00001',
    status: 'On Trip',
    currentTrip: {
      id: 'TR-101',
      from: 'Farm L001 (Nashik)',
      to: 'Central Mill (Pune)',
      startTime: '10:00 AM',
      eta: '04:00 PM',
      cargo: 'Sugarcane (15 Tons)',
      status: 'in_transit',
      progress: 60,
    }
  },
  {
    id: 'v2',
    registrationNumber: 'MH-14-XY-9876',
    type: 'Tractor',
    driverName: 'Sham Lal',
    driverPhone: '+91 98765 00002',
    status: 'On Trip',
    currentTrip: {
      id: 'TR-102',
      from: 'Warehouse A',
      to: 'Farm L005',
      startTime: '01:00 PM',
      eta: '02:30 PM',
      cargo: 'Fertilizers',
      status: 'loading',
      progress: 25,
    }
  },
  {
    id: 'v3',
    registrationNumber: 'MH-12-ZZ-5555',
    type: 'Pickup',
    driverName: 'Vikram Rao',
    driverPhone: '+91 98765 00003',
    status: 'Available',
  },
];

// Tracking Steps Configuration
const TRACKING_STEPS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'loading', label: 'Loading' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'unloading', label: 'Unloading' },
  { id: 'completed', label: 'Completed' },
];

const LogisticsManagement = () => {
  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  
  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats (Dynamic calculation based on state)
  const stats = {
    total: vehicles.length,
    onTrip: vehicles.filter(v => v.status === 'On Trip').length,
    available: vehicles.filter(v => v.status === 'Available').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance').length,
  };

  // --- ACTIONS ---

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simulate backend processing time
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Parsing bulk upload file...',
        success: () => {
          // Simulate adding new data from the "file"
          const newVehicles: Vehicle[] = [
            {
              id: `v-bulk-${Date.now()}-1`,
              registrationNumber: 'MH-04-BK-9999',
              type: 'Truck',
              driverName: 'Amit Verma (Bulk)',
              driverPhone: '+91 90000 11111',
              status: 'Available',
            },
            {
              id: `v-bulk-${Date.now()}-2`,
              registrationNumber: 'MH-12-UP-8888',
              type: 'Pickup',
              driverName: 'Sunil Jadhav (Bulk)',
              driverPhone: '+91 90000 22222',
              status: 'On Trip',
              currentTrip: {
                 id: `TR-BLK-${Date.now()}`,
                 from: 'Nagpur',
                 to: 'Mumbai',
                 startTime: '08:00 AM',
                 eta: '08:00 PM',
                 cargo: 'Oranges (Bulk Upload)',
                 status: 'in_transit',
                 progress: 45
              }
            }
          ];
          
          setVehicles(prev => [...prev, ...newVehicles]);
          
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
          
          return 'Successfully uploaded 2 new vehicles!';
        },
        error: 'Failed to process file'
      }
    );
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssignTaskOpen(false);
    toast.success("Logistics task assigned successfully");
  };

  // Helper to determine step status
  const getStepStatus = (currentStatus: TripStatus, stepId: string) => {
    const statusOrder = ['scheduled', 'loading', 'in_transit', 'unloading', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Filter Logic
  const filteredVehicles = vehicles.filter(v => 
    v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 relative">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Logistics Management</h1>
          <p className="text-muted-foreground mt-1">Track fleet, assign tasks, and monitor deliveries.</p>
        </div>
        <div className="flex gap-3">
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".csv,.xlsx" 
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={triggerFileUpload}
            className="flex items-center gap-2 border border-border bg-white text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button 
            onClick={() => setIsAssignTaskOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Package className="w-4 h-4" />
            Assign Task
          </button>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Fleet</p>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">{stats.total}</h3>
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><Truck className="w-5 h-5"/></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">On Route</p>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-blue-600">{stats.onTrip}</h3>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin className="w-5 h-5"/></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Available</p>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-green-600">{stats.available}</h3>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><CheckCircle2 className="w-5 h-5"/></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">In Maintenance</p>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-orange-600">{stats.maintenance}</h3>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><AlertCircle className="w-5 h-5"/></div>
          </div>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="flex gap-4 items-center bg-card border border-border p-3 rounded-lg shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vehicle no, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
          />
        </div>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
          <Filter className="w-4 h-4" />
          Filter Status
        </button>
      </div>

      {/* --- VEHICLE LIST WITH TRACKING --- */}
      <div className="space-y-4">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            
            {/* Top Row: Vehicle Info */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{vehicle.registrationNumber}</h3>
                  <p className="text-sm text-muted-foreground">{vehicle.type} • {vehicle.driverName}</p>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-2",
                    vehicle.status === 'On Trip' ? "bg-blue-50 text-blue-700" : 
                    vehicle.status === 'Available' ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", 
                      vehicle.status === 'On Trip' ? "bg-blue-600" : 
                      vehicle.status === 'Available' ? "bg-green-600" : "bg-orange-600"
                    )}/>
                    {vehicle.status}
                  </span>
                </div>
              </div>

              {vehicle.currentTrip && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground flex items-center justify-end gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    {vehicle.currentTrip.cargo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Trip ID: {vehicle.currentTrip.id}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-end">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {vehicle.currentTrip.eta}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tracking Bar Section (Only if On Trip) */}
            {vehicle.status === 'On Trip' && vehicle.currentTrip && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <div className="flex justify-between items-center mb-6 px-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    <span className="block text-foreground font-bold mb-0.5">From</span>
                    {vehicle.currentTrip.from}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground text-right">
                    <span className="block text-foreground font-bold mb-0.5">To</span>
                    {vehicle.currentTrip.to}
                  </div>
                </div>

                {/* The Tracking Bar Component */}
                <div className="relative px-4">
                  {/* Progress Line Background */}
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
                  
                  {/* Active Progress Line */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500" 
                    style={{ width: `${(TRACKING_STEPS.findIndex(s => s.id === vehicle.currentTrip!.status) / (TRACKING_STEPS.length - 1)) * 100}%` }}
                  />

                  {/* Steps */}
                  <div className="relative flex justify-between w-full">
                    {TRACKING_STEPS.map((step, index) => {
                      const status = getStepStatus(vehicle.currentTrip!.status, step.id);
                      return (
                        <div key={step.id} className="flex flex-col items-center group">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 z-10 transition-colors duration-300 flex items-center justify-center",
                            status === 'completed' ? "bg-primary border-primary" :
                            status === 'current' ? "bg-white border-primary ring-4 ring-primary/20" :
                            "bg-white border-gray-300"
                          )}>
                            {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={cn(
                            "absolute top-6 text-[10px] font-medium transition-colors duration-300 w-20 text-center",
                            status === 'current' ? "text-primary font-bold" : 
                            status === 'completed' ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Spacer for labels */}
                <div className="h-6" />
              </div>
            )}

            {/* Empty State for Available Vehicles */}
            {vehicle.status === 'Available' && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200 text-center">
                <p className="text-sm text-muted-foreground">Vehicle is parked and ready for assignment.</p>
                <button 
                  onClick={() => setIsAssignTaskOpen(true)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Assign Task Now
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- ASSIGN TASK MODAL --- */}
      {isAssignTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Assign Logistics Task</h3>
              <button onClick={() => setIsAssignTaskOpen(false)}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Vehicle</label>
                <select className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                  <option>MH-12-ZZ-5555 (Available)</option>
                  {vehicles.filter(v => v.status === 'Available').map(v => (
                    <option key={v.id}>{v.registrationNumber} - {v.type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <input required className="w-full px-3 py-2 border rounded-md text-sm bg-background" placeholder="Origin" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <input required className="w-full px-3 py-2 border rounded-md text-sm bg-background" placeholder="Destination" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo Details</label>
                <input required className="w-full px-3 py-2 border rounded-md text-sm bg-background" placeholder="e.g. Fertilizer Bags (500kg)" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAssignTaskOpen(false)} className="px-4 py-2 text-sm border rounded-md hover:bg-muted">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Assign Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LogisticsManagement;