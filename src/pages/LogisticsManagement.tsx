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
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBaseUrl } from '@/lib/config';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';

// --- TYPES ---

type LocationType = 'Plant' | 'Field' | 'Hub' | 'Deposit';
type PlanStatus = 'Draft' | 'Live' | 'Completed';
type TripStep = 1 | 2 | 3; // Step 1: Info, Step 2: Timeline/Checks, Step 3: Finalize

type TripStatusBackend = 'created' | 'started' | 'completed' | string;

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
  currentStep: TripStep;
  createdAt: string;
  tripStatus?: TripStatusBackend;

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

type BackendPlanEntry = {
  start: string;
  end_hub: string;
  feild_id: string;
  check_point: Array<{
    physical_damange: boolean;
    fuel_level: number;
    equipment_damange: boolean;
  }>;
};

type BackendLogisticsPlan = {
  plan: Record<string, BackendPlanEntry>;
  plan_id: string;
  trip_status: TripStatusBackend;
  created_at: string;
  vehicle_id: string;
};

// Day Plan Interface
interface DayPlan {
  id: string;
  dayIndex: number;
  date: string;
  dateISO?: string;
  start: string; // Plant/Hub name
  fieldId: string;
  endHub: string;
}

// --- MOCK DATA ---

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

// --- MAP HELPERS ---
type LatLngTuple = [number, number];
const BASE_COORD: LatLngTuple = [19.0760, 72.8777]; // Dummy base (Mumbai region)

const getDummyCoordsForStop = (stop: RouteStop, index: number): LatLngTuple => {
  const name = (stop.locationName || '').trim();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 1024;
  const lat = BASE_COORD[0] + ((hash % 40) * 0.0015) + (index * 0.002);
  const lng = BASE_COORD[1] + (((hash >> 3) % 40) * 0.0015);
  return [lat, lng];
};

const typeColor = (t: LocationType) => {
  if (t === 'Plant') return '#16a34a';
  if (t === 'Field') return '#f59e0b';
  if (t === 'Hub') return '#8b5cf6';
  return '#64748b';
};

// Small Map Preview Component for Cards
const MapPreview = ({ plan }: { plan: LogisticsPlan }) => {
  const points = plan.stops.map((s, i) => ({ ...s, coords: getDummyCoordsForStop(s, i) }));
  const center = points[0]?.coords || BASE_COORD;

  return (
    <div className="h-24 w-full rounded-lg overflow-hidden bg-gray-100 relative">
      <MapContainer 
        center={center} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        <TileLayer
          attribution=''
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={points.map(p => p.coords)} color="#2563eb" weight={3} />
        {points.map((p) => (
          <CircleMarker 
            key={p.id} 
            center={p.coords} 
            radius={4} 
            color={typeColor(p.type)} 
            fillColor={typeColor(p.type)} 
            fillOpacity={0.8}
            stroke={false}
          />
        ))}
      </MapContainer>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};

// --- MAP MODAL ---
const MapModal = ({ plan, onClose }: { plan: LogisticsPlan; onClose: () => void }) => {
  const points = plan.stops.map((s, i) => ({ ...s, coords: getDummyCoordsForStop(s, i) }));
  const center = points[0]?.coords || BASE_COORD;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-xl text-gray-900">Route Visualization</h2>
              <p className="text-gray-600 text-sm">{plan.vehicleReg} • {plan.stops.length} waypoints</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2">
            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={points.map(p => p.coords)} color="#2563eb" weight={4} />
              {points.map((p) => (
                <CircleMarker key={p.id} center={p.coords} radius={8} color={typeColor(p.type)} fillColor={typeColor(p.type)} fillOpacity={0.8}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold">{p.type}</div>
                      <div>{p.locationName}</div>
                      <div className="text-xs text-gray-500">{p.date}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
              Route Details
            </h3>
            <div className="space-y-3">
              {points.map((p, idx) => {
                const getStopConfig = () => {
                  if (idx === 0) return { label: 'Start', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
                  if (p.type === 'Field') return { label: `Stop ${Math.ceil(idx/2)}`, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
                  return { label: `Rest ${Math.ceil(idx/2)}`, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
                };
                
                const config = getStopConfig();
                
                return (
                  <div key={`pd-${p.id}`} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text} ${config.border} border whitespace-nowrap`}>
                      {config.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.locationName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{p.type}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{p.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTS ---

// 1. CREATE PLAN MODAL (2-STEP PROCESS)
const CreatePlanModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (p: LogisticsPlan) => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCalendar | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isPrefilledFromCalendar, setIsPrefilledFromCalendar] = useState(false);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [vehicleData, setVehicleData] = useState<VehicleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  };

  // STEP 1: Vehicle & Activity Selection
  const handleVehicleActivitySelect = (vehicle: VehicleCalendar, activity: string) => {
    setSelectedVehicle(vehicle);
    setSelectedActivity(activity);
    const matchingEntries = (vehicle.calander || [])
      .filter(e => e.activity === activity)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (matchingEntries.length > 0) {
      const makeDateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const initialPlans: DayPlan[] = matchingEntries.map((entry, i) => ({
        id: `dp-${Date.now()}-${i}`,
        dayIndex: i + 1,
        date: makeDateLabel(entry.date),
        dateISO: entry.date,
        start: i === 0 ? 'Plant' : '',
        fieldId: entry.farm_id,
        endHub: ''
      }));
      setIsPrefilledFromCalendar(true);
      setDayPlans(initialPlans);
    } else {
      // Fallback: if no calendar dates exist for this activity, allow manual planning
      const base = new Date();
      const makeDateLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const initialPlans: DayPlan[] = Array.from({ length: 3 }).map((_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return {
          id: `dp-${Date.now()}-${i}`,
          dayIndex: i + 1,
          date: makeDateLabel(d),
          dateISO: d.toISOString().slice(0, 10),
          start: i === 0 ? 'Plant' : '',
          fieldId: '',
          endHub: ''
        };
      });
      setIsPrefilledFromCalendar(false);
      setDayPlans(initialPlans);
    }
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
    if (isPrefilledFromCalendar) {
      toast.message('Days are pre-populated from the selected activity schedule');
      return;
    }
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
        dateISO: d.toISOString().slice(0, 10),
        start: last?.endHub || last?.start || 'Hub 1',
        fieldId: '',
        endHub: ''
      };
      return [...prev, newItem];
    });
  };

  const handleLivePlan = async () => {
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

    const plan: Record<
      string,
      {
        start: string;
        feild_id: string;
        end_hub: string;
        check_point: Array<{
          physical_damange: boolean;
          equipment_damange: boolean;
          fuel_level: number;
        }>;
      }
    > = {};

    for (const p of dayPlans) {
      const dateKey = (p.dateISO && p.dateISO.trim()) ? p.dateISO.trim() : p.date;
      plan[dateKey] = {
        start: p.start,
        feild_id: p.fieldId,
        end_hub: p.endHub,
        check_point: [
          {
            physical_damange: false,
            equipment_damange: false,
            fuel_level: 0,
          },
        ],
      };
    }

    setSaving(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_vehicles/save_logistics_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, vehicle_id: selectedVehicle.vehicle_id }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed (${response.status})`);
      }

      const result = await response.json().catch(() => null);
      if (!result || result.success !== true) {
        throw new Error('Save failed');
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
        locationName: `${isPrefilledFromCalendar ? 'Farm' : 'Field'} ${p.fieldId}`,
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

      toast.success('Trip Saved & Live!');
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save plan';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-xl text-gray-900">Create New Operation</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all", step === 1 ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600")}>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                Select Vehicle
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all", step === 2 ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600")}>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                Plan Route
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          
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
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{entries.length} days</span>
                                    </div>
                                    <div className="space-y-1">
                                      {entries.slice(0, 3).map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                          <CalendarIcon className="w-3 h-3 text-gray-400" />
                                          <span>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                          <span className="text-gray-400">•</span>
                                          <span>{entry.acres_covered} acres</span>
                                        </div>
                                      ))}
                                      {entries.length > 3 && (
                                        <div className="text-xs text-gray-400 italic">+{entries.length - 3} more dates</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
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
                  <button onClick={() => { setStep(1); setSelectedVehicle(null); setSelectedActivity(null); setIsPrefilledFromCalendar(false); setDayPlans([]); }} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Change Vehicle
                  </button>
                </div>
              </div>

              {/* Trip Planning Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-[#2F5233]" /> Daily Trip Plan</h2>
                  <p className="text-sm text-gray-500">Define daily movements: Start → Field → Hub</p>
                  {isPrefilledFromCalendar && (
                    <p className="text-xs text-gray-500 mt-2">Date and Field ID are pre-filled from the selected activity schedule. Enter End Hub only.</p>
                  )}
                </div>
                <div className="p-8 space-y-6">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                        <tr>
                          <th className="p-3 font-medium pl-6">Day</th>
                          <th className="p-3 font-medium">Date</th>
                          <th className="p-3 font-medium">Start</th>
                          <th className="p-3 font-medium">{isPrefilledFromCalendar ? 'Farm ID' : 'Field ID'}</th>
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
                              <input
                                className={cn(
                                  "w-full p-2 border border-gray-200 rounded text-sm",
                                  isPrefilledFromCalendar ? "bg-gray-100 text-gray-700" : "bg-white"
                                )}
                                placeholder={isPrefilledFromCalendar ? "Prefilled" : "e.g. 123456"}
                                value={dp.fieldId}
                                readOnly={isPrefilledFromCalendar}
                                onChange={e => {
                                  if (isPrefilledFromCalendar) return;
                                  updateDayPlan(dp.id, 'fieldId', e.target.value);
                                }}
                              />
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
                    <button
                      type="button"
                      onClick={addDay}
                      className={cn(
                        "px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium",
                        isPrefilledFromCalendar ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
                      )}
                    >
                      + Add Day
                    </button>
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
                            <span className="px-2 py-1 rounded bg-green-50 text-green-700">{isPrefilledFromCalendar ? 'Farm' : 'Field'} {dp.fieldId || '—'}</span>
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
                <button
                  onClick={handleLivePlan}
                  disabled={saving}
                  className={cn(
                    "bg-[#2F5233] text-white px-8 py-3 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2",
                    saving ? "opacity-60 cursor-not-allowed" : "hover:bg-[#1a331d]"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving…' : 'Make Live'}
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        
        {/* Header with Steps Indicator */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <LayoutList className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-xl text-gray-900">Operation Execution</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all", plan.currentStep === 1 ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600")}>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                Info
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all", plan.currentStep === 2 ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600")}>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                Timeline
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all", plan.currentStep === 3 ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600")}>
                <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                Finalize
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          
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
const MonitorSection = ({ plans, onUpdate, onCreateClick }: { plans: LogisticsPlan[], onUpdate: (p: LogisticsPlan) => void, onCreateClick: () => void }) => {
  const [activePlan, setActivePlan] = useState<LogisticsPlan | null>(null);
  const [activeMapPlan, setActiveMapPlan] = useState<LogisticsPlan | null>(null);

  const renderTripStatusIcon = (status?: TripStatusBackend) => {
    if (status === 'started') return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'created') return <Clock className="w-4 h-4 text-slate-500" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div>
      {/* Grid */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Operations</h3>
          <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
            Begin fleet management by creating your first logistics operation plan.
          </p>
          <button 
            onClick={onCreateClick}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Create Operation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {plans.map(plan => {
            const getStatusConfig = () => {
              if (plan.tripStatus === 'completed') return { 
                color: 'text-emerald-700', 
                bg: 'bg-emerald-50', 
                border: 'border-emerald-200',
                label: 'Completed'
              };
              if (plan.tripStatus === 'started') return { 
                color: 'text-amber-700', 
                bg: 'bg-amber-50', 
                border: 'border-amber-200',
                label: 'In Progress'
              };
              return { 
                color: 'text-slate-700', 
                bg: 'bg-slate-50', 
                border: 'border-slate-200',
                label: 'Pending'
              };
            };
            
            const statusConfig = getStatusConfig();
            
            return (
              <div key={plan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group">
                {/* Card Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{plan.vehicleReg}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{plan.vehicleType} • {plan.createdAt}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                      {statusConfig.label}
                    </div>
                  </div>
                  
                  {/* Route Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-700">Route Overview</span>
                      <span className="text-xs text-gray-500">• {plan.stops.length} stops</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {plan.stops.slice(0,3).map(s => s.locationName).join(' → ')}{plan.stops.length > 3 ? ' …' : ''}
                    </p>
                  </div>
                </div>

                {/* Map Preview */}
                <div className="px-6 pt-4">
                  <div className="relative">
                    <MapPreview plan={plan} />
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveMapPlan(plan);
                      }}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-md shadow-sm transition-colors duration-200 backdrop-blur-sm"
                      title="View full map"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Driver & Details */}
                <div className="p-6 pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{plan.driverName}</p>
                      <p className="text-xs text-gray-500">Assigned Driver</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      {renderTripStatusIcon(plan.tripStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </p>
                      <p className="text-xs text-gray-500">Current Status</p>
                    </div>
                  </div>
                </div>
                
                {/* Action */}
                <div className="p-6 pt-0">
                  {plan.status === 'Completed' ? (
                    <button 
                      onClick={() => generateTripSheetPDF(plan)} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download Report
                    </button>
                  ) : (
                    <button 
                      onClick={() => setActivePlan(plan)} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <LayoutList className="w-4 h-4" /> Manage Operation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
      {activeMapPlan && (
        <MapModal
          plan={activeMapPlan}
          onClose={() => setActiveMapPlan(null)}
        />
      )}
    </div>
  );
};

// --- MAIN LAYOUT ---

const LogisticsManagement = () => {
  const [plans, setPlans] = useState<LogisticsPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const buildStopsFromBackendPlan = (plan: Record<string, BackendPlanEntry>): RouteStop[] => {
    const dates = Object.keys(plan).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (dates.length === 0) return [];

    const builtStops: RouteStop[] = [];

    const firstDate = dates[0];
    builtStops.push({
      id: `s-${Date.now()}-start`,
      date: firstDate,
      type: (plan[firstDate].start.toLowerCase().includes('hub') ? 'Hub' : 'Plant'),
      locationName: plan[firstDate].start,
      isReached: false,
    });

    dates.forEach((date, idx) => {
      const p = plan[date];
      builtStops.push({
        id: `s-${Date.now()}-${idx}-f`,
        date,
        type: 'Field',
        locationName: `Field ${p.feild_id}`,
        isReached: false,
      });
      builtStops.push({
        id: `s-${Date.now()}-${idx}-h`,
        date,
        type: 'Hub',
        locationName: p.end_hub,
        isReached: false,
        inspection: { completed: false, items: STANDARD_CHECKS.map(c => ({ ...c })) },
      });
    });

    return builtStops;
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_vehicles/get_logistics_plan`);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed (${response.status})`);
      }
      const data = (await response.json()) as BackendLogisticsPlan[];

      const mapped: LogisticsPlan[] = (Array.isArray(data) ? data : []).map((item) => {
        const internalStatus: PlanStatus = item.trip_status === 'completed' ? 'Completed' : item.trip_status === 'started' ? 'Live' : 'Draft';
        const currentStep: TripStep = item.trip_status === 'completed' ? 3 : item.trip_status === 'started' ? 2 : 1;

        const stops = buildStopsFromBackendPlan(item.plan || {});
        if (item.trip_status === 'completed') {
          stops.forEach(s => { s.isReached = true; });
        }

        const createdAt = new Date(item.created_at).toLocaleDateString();
        const vehicleReg = item.vehicle_id ? item.vehicle_id.slice(0, 8) : 'Vehicle';

        return {
          id: item.plan_id,
          vehicleId: item.vehicle_id,
          vehicleReg,
          vehicleType: 'Logistics',
          driverName: '—',
          driverPhone: '—',
          stops,
          status: internalStatus,
          currentStep,
          createdAt,
          tripStatus: item.trip_status,
        };
      });

      setPlans(mapped);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load plans';
      toast.error(message);
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = (p: LogisticsPlan) => {
    setPlans([...plans, p]);
  };

  const handleUpdate = (p: LogisticsPlan) => setPlans(plans.map(plan => plan.id === p.id ? p : plan));

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Logistics Operations</h1>
              </div>
              <p className="text-gray-600 text-sm font-medium">Fleet Management & Route Optimization</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span className="font-medium">{plans.length} Active Operations</span>
                </div>
                <div className="text-gray-300">•</div>
                <div className="text-xs text-gray-500">
                  Last Updated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Operation
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        {loadingPlans ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4">
              <div className="w-12 h-12 border-2 border-gray-300 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Loading Operations</h3>
            <p className="text-xs text-gray-500">Please wait while we fetch your logistics data...</p>
          </div>
        ) : (
          <MonitorSection plans={plans} onUpdate={handleUpdate} onCreateClick={() => setShowCreateModal(true)} />
        )}
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
