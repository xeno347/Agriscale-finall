import { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Calendar as CalendarIcon, 
  Plus, CheckCircle2, 
  Trash2, X, User, Check, 
  ArrowLeft, Save, LayoutList, Download, 
  ShieldCheck, AlertTriangle, FileText, Activity, MoreHorizontal, Clock,
  ChevronRight, Fuel, Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleBusyCalendar from '@/components/logistics/VehicleBusyCalendar';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBaseUrl } from '@/lib/config';

// --- TYPES ---

type LocationType = 'Plant' | 'Field' | 'Hub' | 'Deposit';
type PlanStatus = 'Draft' | 'Live' | 'Completed';
type TripStep = 1 | 2 | 3; // Step 1: Info, Step 2: Timeline/Checks, Step 3: Finalize

interface CalendarEntry {
  date: string;
  activity: string;
  acres_covered: number;
  block_id: string;
  farm_id: string;
}

interface VehicleCalendar {
  vehicle_id: string;
  vehicle_number: string;
  driver: string;
  driver_name: string | null;
  calander: CalendarEntry[];
}

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

// Day Plan Interface
interface DayPlan {
  id: string;
  dayIndex: number;
  date: string;
  start: string; // Plant/Hub name
  fieldId: string;
  endHub: string;
}

// 1. CREATE PLAN MODAL (2-STEP PROCESS)
const CreatePlanModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (p: LogisticsPlan) => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCalendar | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [vehicleData, setVehicleData] = useState<VehicleCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch vehicle calendar data on mount
  useEffect(() => {
    const fetchVehicleCalendar = async () => {
      try {
        const response = await fetch(`${getBaseUrl()}/admin_vehicles/get_vehicle_calander`);
        const data = await response.json();
        setVehicleData(data);
      } catch (error) {
        console.error('Failed to fetch vehicle calendar:', error);
        toast.error('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicleCalendar();
  }, []);

  // Group calendar entries by activity
  const groupByActivity = (calendar: CalendarEntry[]) => {
    const grouped: Record<string, CalendarEntry[]> = {};
    calendar.forEach(entry => {
      if (!grouped[entry.activity]) {
        grouped[entry.activity] = [];
      }
      grouped[entry.activity].push(entry);
    });
    // Sort dates within each activity
    Object.keys(grouped).forEach(activity => {
      grouped[activity].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return grouped;
  }
      { date: makeDat& Activity Selection
  const handleVehicleActivitySelect = (vehicle: VehicleCalendar, activity: string) => {
    setSelectedVehicle(vehicle);
    setSelectedActivity(activitytivity: 'Transport', block_name: 'Block G' },
      { date: makeDate(20), activity: 'Maintenance', block_name: 'Block I' },
      { date: makeDate(28), activity: 'Equipment Pickup', block_name: 'Block H' },
    ],
  };
  
  return (schedules[vehicleId] || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// 1. CREATE PLAN MODAL (2-STEP PROCESS)
const CreatePlanModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (p: LogisticsPlan) => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVehicle, setSelectedVehicle] = useState<typeof AVAILABLE_VEHICLES[0] | null>(null);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);

  // STEP 1: Vehicle Selection
  const handleVehicleSelect = (vehicle: typeof AVAILABLE_VEHICLES[0]) => {
    setSelectedVehicle(vehicle);
    // Initialize a 3-day planning scaffold
    const base = new Date();
    const makeDateLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const initialPlans: DayPlan[] = Array.from({ length: 3 }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return {
        id: `dp-${Date.now()}-${i}`,
        dayIndex: i + 1,
        date: makeDateLabel(d),
        start: i === 0 ? 'Plant' : '',
        fieldId: '',
        endHub: ''
      };
    });
    setDayPlans(initialPlans);
    setStep(2);
  };

  // STEP 2: Trip Planning
  const updateDayPlan = (id: string, field: keyof DayPlan, value: string) => {
    setDayPlans(prev => {
      const next = prev.map(p => p.id === id ? { ...p, [field]: value } : p);
      // Auto propagate start from previous day's endHub
      for (let i = 1; i < next.length; i++) {
        if (next[i - 1].endHub) next[i].start = next[i - 1].endHub;
      }
      return [...next];
    });
  };

  const addDay = () => {
    setDayPlans(prev => {
      const last = prev[prev.length - 1];
      const base = new Date();
      const d = new Date(base);
      d.setDate(base.getDate() + prev.length);
      const makeDateLabel = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newItem: DayPlan = {
        id: `dp-${Date.now()}-${prev.length}`,
        dayIndex: prev.length + 1,
        date: makeDateLabel(d),
        start: last?.endHub || last?.start || 'Hub 1',
        fieldId: '',
        endHub: ''
      };
      return [...prev, newItem];
    });
  };

  const handleLivePlan = () => {
    if (!selectedVehicle) {
      toast.error('Please select a vehicle');
      return;
    }
    if (dayPlans.length === 0) {
      toast.error('Please add at least one day');
      return;
    }
    if (dayPlans.some(p => !p.start || !p.fieldId || !p.endHub)) {
      toast.error('Please fill Start, Field ID and End Hub for all days');
      return;
    }

    // Build stops from day plans
    const builtStops: RouteStop[] = [];
    const first = dayPlans[0];
    builtStops.push({
      id: `s-${Date.now()}-start`,
      date: first.date,
      type: (first.start.toLowerCase().includes('hub') ? 'Hub' : 'Plant'),
      locationName: first.start,
      isReached: false
    });

    dayPlans.forEach((p, idx) => {
      builtStops.push({
        id: `s-${Date.now()}-${idx}-f`,
        date: p.date,
        type: 'Field',
        locationName: `Field ${p.fieldId}`,
        isReached: false
      });
      builtStops.push({
        id: `s-${Date.now()}-${idx}-h`,
        date: p.date,
        type: 'Hub',
        locationName: p.endHub,
        isReached: false,
        inspection: { completed: false, items: STANDARD_CHECKS.map(c => ({ ...c })) }
      });
    });

    onCreate({
      id: `TRIP-${Math.floor(Math.random() * 10000)}`,
      vehicleId: selectedVehicle.vehicle_id,
      vehicleReg: selectedVehicle.vehicle_number,
      vehicleType: selectedActivity || 'General',
      driverName: selectedVehicle.driver_name || 'Driver',
      driverPhone: selectedVehicle.driver,
      stops: builtStops,
      status: 'Live',
      currentStep: 1,
      createdAt: new Date().toLocaleDateString(),
    });
    toast.success("Trip Created & Live!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-xl text-gray-900">Create New Trip</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("px-3 py-1 rounded-full font-bold", step === 1 ? "bg-black text-white" : "bg-gray-200 text-gray-500")}>1. Choose Vehicle</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className={cn("px-3 py-1 rounded-full font-bold", step === 2 ? "bg-black text-white" : "bg-gray-200 text-gray-500")}>2. Plan Trip</span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          
          {/* STEP 1: Vehicle Selection */}
          {step === 1 && (
            <div className="max-w-6xl mx-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Select Vehicle & Activity</h3>
              {loading ? (
                <div className="text-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading vehicles...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicleData.map(vehicle => {
                    const activityGroups = groupByActivity(vehicle.calander);
                    const hasSchedule = vehicle.calander.length > 0;
                    
                    return (
                      <div key={vehicle.vehicle_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white"><Truck className="w-6 h-6" /></div>
                            <div>
                              <div className="text-lg font-bold text-gray-900">{vehicle.vehicle_number}</div>
                              <div className="text-sm text-gray-500">Vehicle</div>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{vehicle.driver_name || 'Driver'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="text-xs">{vehicle.driver}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          {hasSchedule ? (
                            <>
                              <div className="text-xs font-bold uppercase text-gray-500 mb-3">Select Activity</div>
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {Object.entries(activityGroups).map(([activity, entries]) => (
                                  <div 
                                    key={activity} 
                                    className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all"
                                    onClick={() => handleVehicleActivitySelect(vehicle, activity)}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-sm font-bold text-gray-900">{activity}</div>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-fu
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-xs text-gray-400 mb-2">No scheduled work</div>
                              <button 
                                onClick={() => handleVehicleActivitySelect(vehicle, 'General')}
                                className="text-xs text-blue-600 hover:underline font-medium"
                              >
                                Plan New Trip
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Trip Planning */}
          {step === 2 && selectedVehicle && selectedActivity && (
            <div className="max-w-4xl mx-auto">
              {/* Selected Vehicle Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Truck className="w-6 h-6" /></div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{selectedVehicle.vehicle_number}</div>
                      <div className="text-sm text-gray-500">Driver: {selectedVehicle.driver_name || selectedVehicle.driver} • Activity: <span className="font-medium text-blue-600">{selectedActivity}</span></div>
                    </div>
                  </div>
                  <button onClick={() => { setStep(1); setSelectedVehicle(null); setSelectedActivity(null); }
              </div>
            </div>
          )}

          {/* STEP 2: Trip Planning */}
          {step === 2 && selectedVehicle && (
            <div className="max-w-4xl mx-auto">
              {/* Selected Vehicle Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Truck className="w-6 h-6" /></div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{selectedVehicle.reg}</div>
                      <div className="text-sm text-gray-500">{selectedVehicle.type} • Driver: {selectedVehicle.driver}</div>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Change Vehicle
                  </button>
                </div>
              </div>

              {/* Trip Planning Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-[#2F5233]" /> Daily Trip Plan</h2>
                  <p className="text-sm text-gray-500">Define daily movements: Start → Field → Hub</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                        <tr>
                          <th className="p-3 font-medium pl-6">Day</th>
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Start</th>
                          <th className="p-3 font-medium">Field ID</th>
                          <th className="p-3 font-medium">End Hub</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dayPlans.map((dp, idx) => (
                          <tr key={dp.id} className="group">
                            <td className="p-3 pl-6 text-gray-700 font-mono">Day {dp.dayIndex}</td>
                            <td className="p-3 text-gray-500">{dp.date}</td>
                            <td className="p-3">
                              {idx === 0 ? (
                                <select className="w-full p-2 border border-gray-200 rounded bg-white text-sm" value={dp.start} onChange={e => updateDayPlan(dp.id, 'start', e.target.value)}>
                                  <option value="Plant">Plant</option>
                                  <option value="Depot">Depot</option>
                                  <option value="Hub 1">Hub 1</option>
                                  <option value="Hub 2">Hub 2</option>
                                </select>
                              ) : (
                                <div className="text-gray-700">{dp.start || '—'}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <input className="w-full p-2 border border-gray-200 rounded bg-white text-sm" placeholder="e.g. 123456" value={dp.fieldId} onChange={e => updateDayPlan(dp.id, 'fieldId', e.target.value)} />
                            </td>
                            <td className="p-3">
                              <input className="w-full p-2 border border-gray-200 rounded bg-white text-sm" placeholder="e.g. Hub 3" value={dp.endHub} onChange={e => updateDayPlan(dp.id, 'endHub', e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center">
                    <button type="button" onClick={addDay} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">+ Add Day</button>
                    <div className="text-xs text-gray-500">Start auto-fills from previous day's hub</div>
                  </div>

                  {/* Visual Preview */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                    <div className="text-xs font-bold uppercase text-gray-500 mb-3">Plan Preview</div>
                    <div className="space-y-3">
                      {dayPlans.map((dp) => (
                        <div key={`pv-${dp.id}`} className="flex items-center gap-2 text-sm">
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono">Day {dp.dayIndex}</span>
                          <span className="text-gray-500">{dp.date}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{dp.start || '—'}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="px-2 py-1 rounded bg-green-50 text-green-700">Field {dp.fieldId || '—'}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="px-2 py-1 rounded bg-purple-50 text-purple-700">{dp.endHub || '—'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={handleLivePlan} className="bg-[#2F5233] text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-[#1a331d] shadow-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Make Live
                </button>
              </div>
            </div>
          )}
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


// 2. MONITOR SECTION (The Grid View)
const MonitorSection = ({ plans, onUpdate }: { plans: LogisticsPlan[], onUpdate: (p: LogisticsPlan) => void }) => {
  const [activePlan, setActivePlan] = useState<LogisticsPlan | null>(null);

  return (
    <div>
      {/* Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-20">
          <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No active trips yet</p>
          <p className="text-gray-400 text-sm mt-2">Click "Create Plan" to start planning a new trip</p>
        </div>
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
  const [plans, setPlans] = useState<LogisticsPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = (p: LogisticsPlan) => {
    setPlans([...plans, p]);
  };

  const handleUpdate = (p: LogisticsPlan) => setPlans(plans.map(plan => plan.id === p.id ? p : plan));

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-8 font-sans text-slate-900">
      <div className="w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a] tracking-tight">Logistics Master</h1>
            <p className="text-gray-500 mt-1">Unified Fleet Management System</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#2F5233] text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-[#1a331d] shadow-sm flex items-center gap-2 w-fit"
          >
            <Plus className="w-5 h-5" /> Create Plan
          </button>
        </div>
        
        <MonitorSection plans={plans} onUpdate={handleUpdate} />
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal 
          onClose={() => setShowCreateModal(false)} 
          onCreate={handleCreate} 
        />
      )}
    </div>
  );
};

export default LogisticsManagement;