import { useState } from 'react';
import { 
  Truck, MapPin, Calendar as CalendarIcon, 
  Plus, CheckCircle2, 
  Trash2, X, User, Check, 
  ArrowLeft, Save, LayoutList, Download, 
  ShieldCheck, AlertTriangle, FileText, Activity, MoreHorizontal, Clock,
  ChevronRight, Fuel, Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPES ---

type LocationType = 'Plant' | 'Field' | 'Hub' | 'Deposit';
type PlanStatus = 'Draft' | 'Live' | 'Completed';
type TripStep = 1 | 2 | 3; // Step 1: Info, Step 2: Timeline/Checks, Step 3: Finalize

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface RouteStop {
  id: string;
  date: string;
  type: LocationType;
  locationName: string;
  isReached: boolean;
  // Inspection is only for resting stops (Hub/Plant)
  inspection?: {
    completed: boolean;
    items: ChecklistItem[];
  };
}

interface LogisticsPlan {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  stops: RouteStop[];
  status: PlanStatus;
  currentStep: TripStep; // 1, 2, or 3
  createdAt: string;
  
  // Final Data
  finalData?: {
    finalChecklist: ChecklistItem[];
    vehicleDropLocation: string;
    equipmentDropLocation: string;
    fuelConsumed: string;
    totalDistance: string;
    completedAt: string;
  };
}

// --- MOCK DATA ---

const AVAILABLE_VEHICLES = [
  { id: 'v1', reg: 'MH-12-AB-1234', driver: 'Raju Singh', phone: '+91 98765 43210', type: 'Truck (10 Ton)' },
  { id: 'v2', reg: 'MH-14-XY-9999', driver: 'Sham Lal', phone: '+91 90000 11111', type: 'Tractor' },
  { id: 'v3', reg: 'MH-04-DL-5555', driver: 'Vikram Rao', phone: '+91 99887 77665', type: 'Pickup Van' },
];

const STANDARD_CHECKS = [
  { id: 'c1', label: 'No Fresh Dents/Scratches', checked: false },
  { id: 'c2', label: 'Tires & Pressure OK', checked: false },
  { id: 'c3', label: 'Lights/Indicators Working', checked: false },
];

// --- PDF GENERATOR ---
const generateTripSheetPDF = (plan: LogisticsPlan) => {
  const doc = new jsPDF();
  doc.text(`TRIP SHEET: ${plan.id}`, 14, 20);
  doc.save(`TripSheet_${plan.id}.pdf`);
  toast.success("Trip Sheet PDF Downloaded");
};

// --- COMPONENTS ---

// 1. PLANNING TAB (Create New)
const PlanningTab = ({ onCreate }: { onCreate: (p: LogisticsPlan) => void }) => {
  const [vehicleId, setVehicleId] = useState('');
  const [stops, setStops] = useState<RouteStop[]>([]);

  // AUTO-POPULATE LOGIC
  const handleVehicleSelect = (id: string) => {
    setVehicleId(id);
    if (!id) { setStops([]); return; }
    
    // Simulate fetching schedule: Generate 5 days starting today
    const today = new Date();
    const newStops: RouteStop[] = Array.from({ length: 5 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      let type: LocationType = 'Field';
      if (i === 0) type = 'Plant';
      if (i === 2) type = 'Hub'; 
      if (i === 4) type = 'Deposit';

      return {
        id: `s-${Date.now()}-${i}`,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: type,
        locationName: '', 
        isReached: false
      };
    });
    setStops(newStops);
  };

  const updateStopLocation = (id: string, val: string) => {
    setStops(stops.map(s => s.id === id ? { ...s, locationName: val } : s));
  };

  const handleSubmit = () => {
    if (!vehicleId || stops.some(s => !s.locationName)) {
      toast.error("Please fill in all Resting Locations");
      return;
    }
    const vehicle = AVAILABLE_VEHICLES.find(v => v.id === vehicleId);
    if (!vehicle) return;

    // Attach inspection objects to 'Hub' stops
    const processedStops = stops.map(s => ({
      ...s,
      inspection: (s.type === 'Hub') ? { completed: false, items: STANDARD_CHECKS.map(c => ({...c})) } : undefined
    }));

    onCreate({
      id: `TRIP-${Math.floor(Math.random() * 10000)}`,
      vehicleId: vehicle.id,
      vehicleReg: vehicle.reg,
      vehicleType: vehicle.type,
      driverName: vehicle.driver,
      driverPhone: vehicle.phone,
      stops: processedStops,
      status: 'Live',
      currentStep: 1, // Start at Step 1
      createdAt: new Date().toLocaleDateString(),
    });
    toast.success("Trip Created!");
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-900">Create New Trip</h2>
        <p className="text-sm text-gray-500">Select vehicle to auto-generate schedule.</p>
      </div>
      <div className="p-8 space-y-8">
        <div className="max-w-md">
          <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1. Select Vehicle</label>
          <select className="w-full p-3 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#2F5233] outline-none"
            value={vehicleId} onChange={e => handleVehicleSelect(e.target.value)}>
            <option value="">-- Choose from Fleet --</option>
            {AVAILABLE_VEHICLES.map(v => <option key={v.id} value={v.id}>{v.reg} — {v.driver}</option>)}
          </select>
        </div>
        {stops.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">2. Define Resting Locations</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium pl-6">Date (Auto)</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Resting Location Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stops.map((stop) => (
                    <tr key={stop.id} className="group hover:bg-gray-50/50">
                      <td className="p-3 pl-6 text-gray-500 font-mono bg-gray-50/30">{stop.date}</td>
                      <td className="p-3">
                         <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", stop.type === 'Hub' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>{stop.type}</span>
                      </td>
                      <td className="p-3">
                        <input type="text" placeholder="Enter Location Name" className="bg-white border border-gray-200 rounded p-2 w-full focus:ring-1 focus:ring-[#2F5233] outline-none" 
                          value={stop.locationName} onChange={e => updateStopLocation(stop.id, e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="pt-4 flex justify-end border-t border-gray-100">
          <button onClick={handleSubmit} disabled={stops.length === 0} className="bg-[#2F5233] disabled:opacity-50 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-[#1a331d] shadow-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>
    </div>
  );
};

// --- TRIP EXECUTION MODAL (THE 3-STEP FLOW) ---
const TripExecutionModal = ({ plan, onClose, onUpdate }: { plan: LogisticsPlan, onClose: () => void, onUpdate: (p: LogisticsPlan) => void }) => {
  // Step 3 Local State
  const [finalLocs, setFinalLocs] = useState({ vDrop: '', eDrop: '', fuel: '', dist: '' });

  // -- Handlers --
  const handleStartTrip = () => {
    onUpdate({ ...plan, currentStep: 2 });
    toast.success("Trip Started! Moving to Timeline.");
  };

  const handleStopReach = (idx: number) => {
    if (idx > 0 && !plan.stops[idx - 1].isReached) return toast.error("Complete previous stops first");
    const newStops = [...plan.stops];
    newStops[idx].isReached = !newStops[idx].isReached;
    
    // Check if all stops reached to allow moving to Step 3? 
    // Usually user clicks a button to go to Step 3
    onUpdate({ ...plan, stops: newStops });
  };

  const handleChecklistToggle = (stopIdx: number, itemId: string) => {
    const newStops = [...plan.stops];
    const stop = newStops[stopIdx];
    if (stop.inspection) {
      stop.inspection.items = stop.inspection.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i);
      stop.inspection.completed = stop.inspection.items.every(i => i.checked);
      onUpdate({ ...plan, stops: newStops });
    }
  };

  const handleGoToFinalize = () => {
    const allReached = plan.stops.every(s => s.isReached);
    if (!allReached) return toast.error("Please mark all stops as Reached first.");
    onUpdate({ ...plan, currentStep: 3 });
  };

  const handleSubmitFinal = () => {
    if (!finalLocs.vDrop || !finalLocs.fuel) return toast.error("Please fill all fields");
    const completed = {
      ...plan,
      status: 'Completed' as PlanStatus,
      finalData: {
        finalChecklist: [], // Simplified for this view
        vehicleDropLocation: finalLocs.vDrop,
        equipmentDropLocation: finalLocs.eDrop,
        fuelConsumed: finalLocs.fuel,
        totalDistance: finalLocs.dist,
        completedAt: new Date().toLocaleString()
      }
    };
    onUpdate(completed);
    generateTripSheetPDF(completed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header with Steps Indicator */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-xl text-gray-900">Trip Execution</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("px-3 py-1 rounded-full font-bold", plan.currentStep === 1 ? "bg-black text-white" : "bg-gray-200 text-gray-500")}>1. Info</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className={cn("px-3 py-1 rounded-full font-bold", plan.currentStep === 2 ? "bg-black text-white" : "bg-gray-200 text-gray-500")}>2. Timeline</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className={cn("px-3 py-1 rounded-full font-bold", plan.currentStep === 3 ? "bg-black text-white" : "bg-gray-200 text-gray-500")}>3. Finalize</span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          
          {/* STEP 1: PRE-TRIP INFO (Diagram Step 1) */}
          {plan.currentStep === 1 && (
            <div className="flex flex-col h-full justify-center max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Box 1: Vehicle & Driver */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Vehicle Details & Driver Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Truck className="w-6 h-6" /></div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">{plan.vehicleReg}</div>
                        <div className="text-sm text-gray-500">{plan.vehicleType}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600"><User className="w-6 h-6" /></div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{plan.driverName}</div>
                        <div className="text-sm text-gray-500">{plan.driverPhone}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Box 2: Field Info */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-4">Route Info</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Start Point</span>
                      <span className="font-medium">{plan.stops[0].locationName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">End Point</span>
                      <span className="font-medium">{plan.stops[plan.stops.length-1].locationName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Total Stops</span>
                      <span className="font-medium">{plan.stops.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkpoints Summary */}
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-800">Pre-Trip Checkpoints</span>
                </div>
                <span className="text-sm text-orange-700">Vehicle & Equipment Verification Required</span>
              </div>

              <button 
                onClick={handleStartTrip}
                className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 shadow-lg flex items-center justify-center gap-2"
              >
                Start Trip <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 2: TIMELINE / CHECKLIST (Diagram Step 2) */}
          {plan.currentStep === 2 && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 flex justify-between items-center">
                <h3 className="font-bold text-xl">Journey Timeline</h3>
                <button onClick={handleGoToFinalize} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                  Next: Finalize
                </button>
              </div>

              <div className="relative border-l-2 border-gray-200 ml-6 space-y-10 py-4">
                {plan.stops.map((stop, idx) => (
                  <div key={stop.id} className="pl-10 relative">
                    {/* Node */}
                    <button 
                      onClick={() => handleStopReach(idx)}
                      className={cn(
                        "absolute left-[-9px] top-1 w-6 h-6 rounded-full border-4 transition-all z-10",
                        stop.isReached ? "bg-white border-green-500" : "bg-white border-gray-300"
                      )}
                    />
                    
                    <div className={cn("p-4 rounded-xl border transition-all", stop.isReached ? "bg-white border-green-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-70")}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                           <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-1">
                             <CalendarIcon className="w-3 h-3" /> {stop.date} • {stop.type}
                           </div>
                           <h4 className="text-lg font-bold text-gray-900">{stop.locationName}</h4>
                        </div>
                        {stop.isReached && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">REACHED</span>}
                      </div>

                      {/* RESTING CHECKLIST (The 'Checks' part of diagram) */}
                      {stop.type === 'Hub' && stop.inspection && (
                        <div className="mt-4 bg-orange-50 border border-orange-100 rounded-lg p-4">
                          <h5 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Physical Damage Check
                          </h5>
                          <div className="space-y-2">
                            {stop.inspection.items.map(item => (
                              <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-orange-100/50 rounded transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                                  checked={item.checked}
                                  onChange={() => handleChecklistToggle(idx, item.id)}
                                />
                                <span className={cn("text-sm", item.checked ? "text-gray-900 font-medium" : "text-gray-500")}>{item.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: FINALIZE (Diagram Step 3) */}
          {plan.currentStep === 3 && (
            <div className="max-w-2xl mx-auto flex flex-col h-full justify-center">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Final Trip Data</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle's Last Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input 
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                        placeholder="Enter location..."
                        value={finalLocs.vDrop} onChange={e => setFinalLocs({...finalLocs, vDrop: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Equipment's Last Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input 
                        className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                        placeholder="Enter location..."
                        value={finalLocs.eDrop} onChange={e => setFinalLocs({...finalLocs, eDrop: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Fuel Consumed</label>
                      <div className="relative">
                        <Fuel className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                          className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                          placeholder="e.g. 45 L"
                          value={finalLocs.fuel} onChange={e => setFinalLocs({...finalLocs, fuel: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Total Distance</label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                          className="w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                          placeholder="e.g. 300 KM"
                          value={finalLocs.dist} onChange={e => setFinalLocs({...finalLocs, dist: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmitFinal}
                    className="w-full mt-4 bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 shadow-lg flex items-center justify-center gap-2"
                  >
                    SUBMIT & DOWNLOAD PDF <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// 2. MONITOR TAB (The Grid View)
const MonitorTab = ({ plans, onUpdate }: { plans: LogisticsPlan[], onUpdate: (p: LogisticsPlan) => void }) => {
  const [activePlan, setActivePlan] = useState<LogisticsPlan | null>(null);

  return (
    <div>
      {/* Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No active trips. Go to Planning tab to create one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex items-start gap-4 mb-3">
                <div className="mt-1"><Truck className="w-5 h-5 text-[#2F5233]" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{plan.vehicleReg}</h3>
                  <p className="text-xs text-gray-500 mt-1">{plan.stops.length} stops • {plan.createdAt}</p>
                </div>
              </div>
              <div className="mt-2 mb-6 text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-2"><User className="w-3 h-3 text-gray-400" /> Driver: {plan.driverName}</p>
                <p className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-gray-400" /> Status: <span className={cn("font-medium", plan.status === 'Completed' ? "text-blue-600" : "text-green-600")}>{plan.status}</span>
                </p>
              </div>
              
              <div className="mt-auto">
                {plan.status === 'Completed' ? (
                  <button onClick={() => generateTripSheetPDF(plan)} className="w-full border border-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-medium text-purple-700 hover:bg-purple-50">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                ) : (
                  <button onClick={() => setActivePlan(plan)} className="w-full border border-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <LayoutList className="w-4 h-4" /> Trip Timeline / Execute
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENDER THE MODAL IF ACTIVE */}
      {activePlan && (
        <TripExecutionModal 
          plan={activePlan} 
          onClose={() => setActivePlan(null)} 
          onUpdate={(p) => { onUpdate(p); setActivePlan(p); }} 
        />
      )}
    </div>
  );
};

// --- MAIN LAYOUT ---

const LogisticsManagement = () => {
  const [activeTab, setActiveTab] = useState<'planning' | 'monitor'>('planning');
  const [plans, setPlans] = useState<LogisticsPlan[]>([]);

  const handleCreate = (p: LogisticsPlan) => {
    setPlans([...plans, p]);
    setActiveTab('monitor');
  };

  const handleUpdate = (p: LogisticsPlan) => setPlans(plans.map(plan => plan.id === p.id ? p : plan));

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">Logistics Master</h1>
            <p className="text-gray-500 mt-1">Unified Fleet Management System</p>
          </div>
          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex">
            <button onClick={() => setActiveTab('planning')} className={cn("px-6 py-2.5 text-sm font-bold rounded-md transition-all flex items-center gap-2", activeTab === 'planning' ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700")}>
              <Plus className="w-4 h-4" /> Create Plan
            </button>
            <button onClick={() => setActiveTab('monitor')} className={cn("px-6 py-2.5 text-sm font-bold rounded-md transition-all flex items-center gap-2", activeTab === 'monitor' ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700")}>
              <Activity className="w-4 h-4" /> Monitor
            </button>
          </div>
        </div>
        {activeTab === 'planning' && <PlanningTab onCreate={handleCreate} />}
        {activeTab === 'monitor' && <MonitorTab plans={plans} onUpdate={handleUpdate} />}
      </div>
    </div>
  );
};

export default LogisticsManagement;