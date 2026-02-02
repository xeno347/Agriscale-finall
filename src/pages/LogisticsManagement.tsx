import { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Calendar as CalendarIcon, 
  Plus, CheckCircle2, 
  Trash2, X, User, 
  ArrowLeft, LayoutList, Download, 
  ShieldCheck, AlertTriangle, Clock,
  ChevronRight, Fuel, Navigation, Play,
  Search, Filter, ArrowUpDown, ChevronDown,
  FileText, Phone, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBaseUrl } from '@/lib/config';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';

// --- TYPES ---
type LocationType = 'Plant' | 'Field' | 'Hub' | 'Deposit';
type PlanStatus = 'Draft' | 'Live' | 'Completed';
type TripStep = 1 | 2 | 3;
type TripStatusBackend = 'created' | 'started' | 'completed' | string;
type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type RequestPriority = 'urgent' | 'high' | 'medium' | 'low';

interface LogisticsRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  vehicleType: string;
  fromLocation: string;
  toLocation: string;
  requestDate: string;
  preferredDate: string;
  status: RequestStatus;
  priority: RequestPriority;
  description: string;
  loadDetails?: string;
  createdAt: string;
}

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
  startFuelLevel?: string;
  finalData?: {
    finalChecklist: ChecklistItem[];
    vehicleDropLocation: string;
    equipmentDropLocation: string;
    endFuelLevel: string;
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

interface DayPlan {
  id: string;
  dayIndex: number;
  date: string;
  dateISO?: string;
  start: string;
  fieldId: string;
  endHub: string;
}

// --- CONFIG ---
const STANDARD_CHECKS = [
  { id: 'c1', label: 'No Fresh Dents/Scratches', checked: false },
  { id: 'c2', label: 'Tires & Pressure OK', checked: false },
  { id: 'c3', label: 'Lights/Indicators Working', checked: false },
];

const BASE_COORD: [number, number] = [19.0760, 72.8777];

// --- MAP FIX COMPONENT ---
const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// --- PDF GENERATOR ---
const generateTripSheetPDF = (plan: LogisticsPlan) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`TRIP SHEET: ${plan.id}`, 14, 20);
  doc.setFontSize(12);
  doc.text(`Vehicle: ${plan.vehicleReg}`, 14, 30);
  doc.text(`Driver: ${plan.driverName}`, 14, 38);
  doc.text(`Start Fuel: ${plan.startFuelLevel || 'N/A'}`, 14, 46);
  doc.text(`End Fuel: ${plan.finalData?.endFuelLevel || 'N/A'}`, 100, 46);
  doc.text(`Total Distance: ${plan.finalData?.totalDistance || 'N/A'}`, 14, 54);

  const tableData = plan.stops.map(s => [
    s.date, 
    s.type, 
    s.locationName, 
    s.isReached ? 'Reached' : 'Pending'
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Type', 'Location', 'Status']],
    body: tableData,
  });

  doc.save(`TripSheet_${plan.id}.pdf`);
  toast.success("Trip Sheet PDF Downloaded");
};

// --- MAP HELPERS ---
const getDummyCoordsForStop = (stop: RouteStop, index: number): [number, number] => {
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

// --- SUB-COMPONENTS ---

const MapPreview = ({ plan }: { plan: LogisticsPlan }) => {
  const points = plan.stops.map((s, i) => ({ ...s, coords: getDummyCoordsForStop(s, i) }));
  const center = points[0]?.coords || BASE_COORD;
  
  return (
    <div className="h-28 w-full rounded-lg overflow-hidden bg-gray-100 relative z-0 border border-gray-100">
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
        <MapUpdater />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
    </div>
  );
};

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
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 relative">
            <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
              <MapUpdater />
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
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <div className="bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Route Details</h3>
            <div className="space-y-3">
              {points.map((p, idx) => (
                <div key={`pd-${p.id}`} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 whitespace-nowrap">
                    Stop {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.locationName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-600">{p.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatePlanModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (p: LogisticsPlan) => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCalendar | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isPrefilledFromCalendar, setIsPrefilledFromCalendar] = useState(false);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [vehicleData, setVehicleData] = useState<VehicleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const groupByActivity = (calendar: CalendarEntry[]) => {
    const grouped: Record<string, CalendarEntry[]> = {};
    calendar.forEach(entry => {
      if (!grouped[entry.activity]) grouped[entry.activity] = [];
      grouped[entry.activity].push(entry);
    });
    Object.keys(grouped).forEach(activity => {
      grouped[activity].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return grouped;
  };

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

  const updateDayPlan = (id: string, field: keyof DayPlan, value: string) => {
    setDayPlans(prev => {
      const next = prev.map(p => p.id === id ? { ...p, [field]: value } : p);
      for (let i = 1; i < next.length; i++) {
        if (next[i - 1].endHub) next[i].start = next[i - 1].endHub;
      }
      return [...next];
    });
  };

  const addDay = () => {
    if (isPrefilledFromCalendar) return toast.message('Days are pre-populated');
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
    if (!selectedVehicle) return toast.error('Please select a vehicle');
    if (dayPlans.length === 0) return toast.error('Please add at least one day');
    if (dayPlans.some(p => !p.start || !p.fieldId || !p.endHub)) return toast.error('Please fill all fields');

    const plan: Record<string, any> = {};
    for (const p of dayPlans) {
      const dateKey = (p.dateISO && p.dateISO.trim()) ? p.dateISO.trim() : p.date;
      plan[dateKey] = {
        start: p.start,
        feild_id: p.fieldId,
        end_hub: p.endHub,
        check_point: [{ physical_damange: false, equipment_damange: false, fuel_level: 0 }],
      };
    }

    setSaving(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_vehicles/save_logistics_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, vehicle_id: selectedVehicle.vehicle_id }),
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result = await response.json();
      if (!result || result.success !== true) throw new Error('Save failed');

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
        status: 'Draft',
        currentStep: 1,
        createdAt: new Date().toLocaleDateString(),
        tripStatus: 'created'
      });
      toast.success('Operation Created!');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h2 className="font-semibold text-xl text-gray-900">Create New Operation</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {step === 1 && (
            <div className="max-w-6xl mx-auto">
              {loading ? (
                 <div className="text-center py-20"><p>Loading...</p></div>
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
                        </div>
                        <div className="p-4">
                          {hasSchedule ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                               {Object.entries(activityGroups).map(([activity, entries]) => (
                                 <div key={activity} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:bg-blue-50 cursor-pointer" onClick={() => handleVehicleActivitySelect(vehicle, activity)}>
                                   <div className="text-sm font-bold text-gray-900">{activity}</div>
                                 </div>
                               ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                               <button onClick={() => handleVehicleActivitySelect(vehicle, 'General')} className="text-xs text-blue-600 hover:underline font-medium">Plan New Trip</button>
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

          {step === 2 && (
            <div className="max-w-4xl mx-auto">
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-gray-100">
                   <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">Daily Trip Plan</h2>
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
                                   <option value="Hub 1">Hub 1</option>
                                 </select>
                               ) : <div className="text-gray-700">{dp.start || '—'}</div>}
                             </td>
                             <td className="p-3">
                               <input className="w-full p-2 border border-gray-200 rounded text-sm" value={dp.fieldId} onChange={e => !isPrefilledFromCalendar && updateDayPlan(dp.id, 'fieldId', e.target.value)} readOnly={isPrefilledFromCalendar} />
                             </td>
                             <td className="p-3">
                               <input className="w-full p-2 border border-gray-200 rounded bg-white text-sm" value={dp.endHub} onChange={e => updateDayPlan(dp.id, 'endHub', e.target.value)} />
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <button type="button" onClick={addDay} className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium">+ Add Day</button>
                 </div>
                 <div className="mt-6 flex justify-end p-6 bg-gray-50">
                    <button onClick={handleLivePlan} disabled={saving} className="bg-emerald-700 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-sm">{saving ? 'Saving…' : 'Create Operation'}</button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TripExecutionModal = ({ plan, onClose, onUpdate }: { plan: LogisticsPlan, onClose: () => void, onUpdate: (p: LogisticsPlan) => void }) => {
  const [finalLocs, setFinalLocs] = useState({ vDrop: '', eDrop: '', fuel: '', dist: '' });
  const [startFuel, setStartFuel] = useState(plan.startFuelLevel || '');

  const handleStartTrip = () => {
    if (!startFuel) return toast.error("Please enter Start of Day Fuel Level");
    onUpdate({ ...plan, currentStep: 2, status: 'Live', tripStatus: 'started', startFuelLevel: startFuel });
    toast.success("Trip Started!");
  };

  const handleStopReach = (idx: number) => {
    if (idx > 0 && !plan.stops[idx - 1].isReached) return toast.error("Complete previous stops first");
    const newStops = [...plan.stops];
    newStops[idx].isReached = !newStops[idx].isReached;
    onUpdate({ ...plan, stops: newStops });
  };

  const handleSubmitFinal = () => {
    if (!finalLocs.vDrop || !finalLocs.fuel) return toast.error("Please fill all fields");
    const completed: LogisticsPlan = {
      ...plan,
      status: 'Completed',
      tripStatus: 'completed',
      finalData: {
        finalChecklist: [],
        vehicleDropLocation: finalLocs.vDrop,
        equipmentDropLocation: finalLocs.eDrop,
        endFuelLevel: finalLocs.fuel,
        totalDistance: finalLocs.dist,
        completedAt: new Date().toLocaleString()
      }
    };
    onUpdate(completed);
    generateTripSheetPDF(completed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-white border-b p-6 flex justify-between items-center">
          <h2 className="font-semibold text-xl">Operation Execution: {plan.vehicleReg}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {plan.currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Pre-Trip Checks</h3>
                <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Start of Day Fuel Level</label>
                   <div className="relative">
                      <Fuel className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input className="w-full pl-10 p-2 border rounded-md" placeholder="e.g. 100% or 50L" value={startFuel} onChange={(e) => setStartFuel(e.target.value)} />
                   </div>
                </div>
                <button onClick={handleStartTrip} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">Start Operation</button>
              </div>
            </div>
          )}

          {plan.currentStep === 2 && (
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg">Timeline</h3>
                 <button onClick={() => onUpdate({...plan, currentStep: 3})} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Finalize Trip</button>
              </div>
              <div className="space-y-4">
                 {plan.stops.map((stop, idx) => (
                    <div key={idx} className={cn("p-4 bg-white border rounded-xl flex items-center justify-between", stop.isReached ? "border-green-200 bg-green-50" : "border-gray-200")}>
                       <div>
                          <p className="font-bold">{stop.locationName}</p>
                          <p className="text-xs text-gray-500">{stop.type}</p>
                       </div>
                       <button onClick={() => handleStopReach(idx)} className={cn("px-3 py-1.5 rounded text-sm font-medium", stop.isReached ? "bg-green-200 text-green-800" : "bg-gray-100 hover:bg-gray-200")}>{stop.isReached ? "Reached" : "Mark Reached"}</button>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {plan.currentStep === 3 && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border shadow-sm space-y-4">
               <h3 className="font-bold text-lg">Finalize Trip</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">End Fuel Level</label>
                    <input className="w-full p-2 border rounded" value={finalLocs.fuel} onChange={e => setFinalLocs({...finalLocs, fuel: e.target.value})} placeholder="e.g. 45L" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Total Distance</label>
                    <input className="w-full p-2 border rounded" value={finalLocs.dist} onChange={e => setFinalLocs({...finalLocs, dist: e.target.value})} placeholder="e.g. 120km" />
                  </div>
               </div>
               <button onClick={handleSubmitFinal} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Submit & Download Report</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MONITOR SECTION ---
const MonitorSection = ({ plans, onUpdate, onCreateClick, onDelete }: { plans: LogisticsPlan[], onUpdate: (p: LogisticsPlan) => void, onCreateClick: () => void, onDelete: (id: string) => void }) => {
  const [activePlan, setActivePlan] = useState<LogisticsPlan | null>(null);
  const [activeMapPlan, setActiveMapPlan] = useState<LogisticsPlan | null>(null);

  const renderTripStatusIcon = (status?: TripStatusBackend) => {
    if (status === 'started') return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <Clock className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div>
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <button onClick={onCreateClick} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Operation</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map(plan => {
            const getStatusConfig = () => {
              if (plan.tripStatus === 'completed') return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' };
              if (plan.tripStatus === 'started') return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'In Progress' };
              return { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Pending' };
            };
            const statusConfig = getStatusConfig();
            
            const hasIncompleteTasks = plan.tripStatus === 'started' && plan.stops.some(s => !s.isReached);

            return (
              <div key={plan.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group relative">
                
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm('Delete plan?')) onDelete(plan.id); }}
                  className="absolute top-3 right-3 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

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
                    <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border mr-6`}>
                      {statusConfig.label}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-700">Route Overview</span>
                      <span className="text-xs text-gray-500">• {plan.stops.length} stops</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed truncate">
                      {plan.stops.slice(0,3).map(s => s.locationName).join(' → ')}{plan.stops.length > 3 ? ' …' : ''}
                    </p>
                  </div>
                </div>

                <div className="px-6 pt-4">
                  <div className="relative">
                    <MapPreview plan={plan} />
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMapPlan(plan); }} className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-md shadow-sm">
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

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
                       {hasIncompleteTasks ? <AlertTriangle className="w-3.5 h-3.5 text-orange-600" /> : renderTripStatusIcon(plan.tripStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${hasIncompleteTasks ? 'text-orange-600' : statusConfig.color}`}>
                         {hasIncompleteTasks ? 'In Progress' : statusConfig.label}
                      </p>
                      <p className="text-xs text-gray-500">Current Status</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-2">
                  {plan.status !== 'Completed' && plan.status !== 'Live' && (
                     <button onClick={() => setActivePlan(plan)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                       <Play className="w-4 h-4" /> Start Operation
                     </button>
                  )}

                  <button onClick={plan.status === 'Completed' ? () => generateTripSheetPDF(plan) : () => setActivePlan(plan)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    {plan.status === 'Completed' ? <><Download className="w-4 h-4" /> Download Report</> : <><LayoutList className="w-4 h-4" /> Manage Operation</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {activePlan && (
        <TripExecutionModal plan={activePlan} onClose={() => setActivePlan(null)} onUpdate={(p) => { onUpdate(p); setActivePlan(p); }} />
      )}
      {activeMapPlan && (
        <MapModal plan={activeMapPlan} onClose={() => setActiveMapPlan(null)} />
      )}
    </div>
  );
};

// --- REQUESTS SECTION ---
const RequestsSection = ({ requests, onApprove, onReject }: { 
  requests: LogisticsRequest[], 
  onApprove: (id: string) => void,
  onReject: (id: string) => void 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'status'>('date');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'none'>('status');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pending', 'approved', 'in_progress']));

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredRequests = requests.filter(req => 
    req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.vehicleType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
    if (sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.status.localeCompare(b.status);
  });

  const groupedRequests: Record<string, LogisticsRequest[]> = {};
  if (groupBy !== 'none') {
    sortedRequests.forEach(req => {
      const key = groupBy === 'status' ? req.status : req.priority;
      if (!groupedRequests[key]) groupedRequests[key] = [];
      groupedRequests[key].push(req);
    });
  } else {
    groupedRequests['all'] = sortedRequests;
  }

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

  const getGroupLabel = (key: string) => {
    if (groupBy === 'status') return getStatusConfig(key as RequestStatus).label;
    if (groupBy === 'priority') return key.charAt(0).toUpperCase() + key.slice(1);
    return 'All Requests';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by requester, location, vehicle, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="date">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="status">Group by Status</option>
            <option value="priority">Group by Priority</option>
            <option value="none">No Grouping</option>
          </select>
        </div>

        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold text-gray-900">{requests.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Filtered:</span>
            <span className="font-semibold text-gray-900">{filteredRequests.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Pending:</span>
            <span className="font-semibold text-amber-700">{requests.filter(r => r.status === 'pending').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">In Progress:</span>
            <span className="font-semibold text-purple-700">{requests.filter(r => r.status === 'in_progress').length}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedRequests).map(([groupKey, groupRequests]) => {
          const isExpanded = expandedGroups.has(groupKey);
          
          return (
            <div key={groupKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {groupBy !== 'none' && (
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", !isExpanded && "-rotate-90")} />
                    <h3 className="font-semibold text-gray-900">{getGroupLabel(groupKey)}</h3>
                    <span className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                      {groupRequests.length}
                    </span>
                  </div>
                </button>
              )}

              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {groupRequests.map((req) => {
                    const statusConfig = getStatusConfig(req.status);
                    const priorityConfig = getPriorityConfig(req.priority);

                    return (
                      <div key={req.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-6">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900 text-lg">{req.requesterName}</h4>
                                  <span className="text-xs text-gray-500 font-mono">{req.id}</span>
                                  <span className={cn("px-2.5 py-1 rounded-md text-xs font-medium border", priorityConfig.bg, priorityConfig.color)}>
                                    {priorityConfig.icon} {req.priority.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{req.requesterPhone}</span>
                                </div>
                              </div>
                              <div className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border", statusConfig.bg, statusConfig.color, statusConfig.border)}>
                                {statusConfig.label}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center gap-2 flex-1">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <div>
                                  <p className="text-xs text-gray-500">From</p>
                                  <p className="font-medium text-gray-900">{req.fromLocation}</p>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                              <div className="flex items-center gap-2 flex-1">
                                <MapPin className="w-4 h-4 text-red-600" />
                                <div>
                                  <p className="text-xs text-gray-500">To</p>
                                  <p className="font-medium text-gray-900">{req.toLocation}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500">Vehicle Type</p>
                                  <p className="text-sm font-medium text-gray-900">{req.vehicleType}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500">Preferred Date</p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(req.preferredDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500">Load</p>
                                  <p className="text-sm font-medium text-gray-900">{req.loadDetails || 'Standard'}</p>
                                </div>
                              </div>
                            </div>

                            {req.description && (
                              <div className="pt-2">
                                <p className="text-sm text-gray-600 italic">"{req.description}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => onApprove(req.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => onReject(req.id)}
                                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === 'approved' && (
                              <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
                                Create Plan
                              </button>
                            )}
                            <button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium">
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {groupRequests.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No requests in this category</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No requests found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- BUILD STOPS FUNCTION ---
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

// --- MAIN LAYOUT ---
const LogisticsManagement = () => {
  const [requests, setRequests] = useState<LogisticsRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const mockRequests: LogisticsRequest[] = [
        {
          id: 'REQ-001',
          requesterId: 'U001',
          requesterName: 'Ramesh Kumar',
          requesterPhone: '+91 98765 43210',
          vehicleType: 'Tractor',
          fromLocation: 'Plant A',
          toLocation: 'Field 12-B',
          requestDate: '2026-02-02T10:30:00',
          preferredDate: '2026-02-05',
          status: 'pending',
          priority: 'urgent',
          description: 'Need tractor for cultivation. Monsoon preparation.',
          loadDetails: 'Cultivation Equipment',
          createdAt: '2026-02-02T10:30:00',
        },
        {
          id: 'REQ-002',
          requesterId: 'U002',
          requesterName: 'Suresh Patil',
          requesterPhone: '+91 98765 43211',
          vehicleType: 'Truck',
          fromLocation: 'Field 8-A',
          toLocation: 'Hub 1',
          requestDate: '2026-02-01T14:00:00',
          preferredDate: '2026-02-04',
          status: 'approved',
          priority: 'high',
          description: 'Transport harvested produce to storage',
          loadDetails: '5 tons produce',
          createdAt: '2026-02-01T14:00:00',
        },
        {
          id: 'REQ-003',
          requesterId: 'U003',
          requesterName: 'Vijay Deshmukh',
          requesterPhone: '+91 98765 43212',
          vehicleType: 'JCB',
          fromLocation: 'Hub 2',
          toLocation: 'Field 15-C',
          requestDate: '2026-02-02T09:00:00',
          preferredDate: '2026-02-03',
          status: 'in_progress',
          priority: 'medium',
          description: 'Land leveling required',
          loadDetails: 'Heavy machinery',
          createdAt: '2026-02-02T09:00:00',
        },
        {
          id: 'REQ-004',
          requesterId: 'U004',
          requesterName: 'Anil Sharma',
          requesterPhone: '+91 98765 43213',
          vehicleType: 'Pickup',
          fromLocation: 'Plant B',
          toLocation: 'Field 3-A',
          requestDate: '2026-01-30T11:00:00',
          preferredDate: '2026-02-01',
          status: 'completed',
          priority: 'low',
          description: 'Fertilizer delivery',
          loadDetails: '500kg fertilizer',
          createdAt: '2026-01-30T11:00:00',
        },
      ];
      setRequests(mockRequests);
    } catch (e) {
      toast.error('Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveRequest = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'approved' as RequestStatus } : req
    ));
    toast.success('Request approved');
  };

  const handleRejectRequest = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'rejected' as RequestStatus } : req
    ));
    toast.error('Request rejected');
  };

  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Logistics Management</h1>
                <p className="text-sm text-gray-600 mt-0.5">Manage requests and operations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingRequestsCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {pendingRequestsCount} pending request{pendingRequestsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
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
          <RequestsSection 
            requests={requests} 
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
          />
        )}
      </div>
    </div>
  );
};

export default LogisticsManagement;
