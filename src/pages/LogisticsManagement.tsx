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

/**
 * LOGISTICS REQUEST WORKFLOW:
 * 
 * 1. CREATE REQUEST → User clicks "New Request" button and fills in details
 * 2. SUBMIT TO ADMIN → Request is sent to Admin Request Management (status: 'pending')
 * 3. ADMIN REVIEWS → Admin reviews in Admin Request Management page
 * 4. ADMIN FORWARDS → Admin forwards back to Logistics department (status: 'in_progress')
 * 5. LOGISTICS HANDLES → Request appears here for logistics team to process
 * 
 * This page shows:
 * - New requests created here (before admin review)
 * - Approved requests forwarded back from admin (ready for action)
 */

// --- TYPES ---
type LocationType = 'Plant' | 'Field' | 'Hub' | 'Deposit';
type PlanStatus = 'Draft' | 'Live' | 'Completed';
type TripStep = 1 | 2 | 3;
type TripStatusBackend = 'created' | 'started' | 'completed' | string;
type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type RequestPriority = 'urgent' | 'high' | 'medium' | 'low';

type ApprovalStageStatus = 'pending' | 'approved' | 'approved_and_forwarded' | 'rejected';

type FuelMetaDataItem = {
  driver_name?: string;
  fuel_amount?: number;
  request_id?: string;
  vehicle_number?: string;
};

type BackendDepartmentRequest = {
  first_department?: string;
  request_details: {
    note: string;
    request_location: string;
    request_type?: string;
    meta_data?: FuelMetaDataItem[];
  };
  date: string;
  created_at: string;
  request_id: string;
  concerned_department_approval_status: ApprovalStageStatus;
  admin_ops_approval_status: ApprovalStageStatus;
  forwarded_department_approval_status: ApprovalStageStatus;
  sender_details: {
    staff_name: string;
    staff_phone: string;
    staff_department: string;
    staff_designation: string;
    staff_id: string;
  };
  forwarded_to_departments: string[];
};

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
  first_department?: string;
  receiverId?: string;
  receiverName?: string;
  receiverDepartment?: string;
  adminNote?: string;
  forwardedBy?: string;
  forwardedAt?: string;
  forwarded_to_departments?: string[];
  // New staff fields
  staff_id?: string;
  staff_name?: string;
  staff_phone?: string;
  staff_department?: string;
  staff_designation?: string;
  // Approval workflow statuses
  concerned_department_approval_status?: ApprovalStageStatus;
  admin_ops_approval_status?: ApprovalStageStatus;
  forwarded_department_approval_status?: ApprovalStageStatus;

  // Request subtype details (optional)
  requestDetailsType?: string;
  fuelMetaData?: Array<{
    driver_name: string;
    fuel_amount: number;
    request_id: string;
    vehicle_number: string;
  }>;
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
const RequestsSection = ({ requests, onApprove, onReject, onUpdateForwardedDepartmentStatus }: { 
  requests: LogisticsRequest[], 
  onApprove: (id: string, note?: string) => void,
  onReject: (id: string) => void,
  onUpdateForwardedDepartmentStatus: (id: string, status: ApprovalStageStatus) => void
}) => {
  const [isAssignResourcesOpen, setIsAssignResourcesOpen] = useState(false);
  const [assignmentDate, setAssignmentDate] = useState<string | null>(null);
  const [assignmentRequest, setAssignmentRequest] = useState<LogisticsRequest | null>(null);
  const [isApproveNoteModalOpen, setIsApproveNoteModalOpen] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [approveTarget, setApproveTarget] = useState<LogisticsRequest | null>(null);

  type Asset = {
    id: string;
    name: string;
    type: string;
    category: 'Vehicle' | 'Equipment';
    schedule: Record<string, number>;
  };

  type ApiVehicle = {
    work_calandar?: any[] | Record<string, any> | null;
    vehicle_information?: {
      type?: string;
      vehicle_number?: string;
    };
    vehicle_id: string;
  };

  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [vehiclesForAssignment, setVehiclesForAssignment] = useState<Asset[]>([]);
  const [isLoadingVehiclesForAssignment, setIsLoadingVehiclesForAssignment] = useState(false);
  const [isAssigningResources, setIsAssigningResources] = useState(false);

  const toApprovalStageStatus = (raw: any): ApprovalStageStatus | null => {
    const s = String(raw || '').trim();
    if (s === 'pending' || s === 'approved' || s === 'approved_and_forwarded' || s === 'rejected') return s;
    return null;
  };

  const shouldRequireApproveNote = (req: LogisticsRequest) => {
    const first = String(req.first_department || '').trim().toLowerCase();
    const concerned = req.concerned_department_approval_status || 'pending';
    return first === 'logistics' && concerned === 'pending';
  };

  const isForwardedToLogistics = (req: Pick<LogisticsRequest, 'forwarded_to_departments'>): boolean => {
    const list = Array.isArray(req.forwarded_to_departments) ? req.forwarded_to_departments : [];
    return list.some(d => String(d).trim().toLowerCase() === 'logistics');
  };

  const BASE_URL = getBaseUrl().replace(/\/$/, '');

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const toDateKey = (raw?: string) => {
    const s = String(raw || '').trim();
    if (!s) return formatDateKey(new Date());
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return formatDateKey(d);
    return s.slice(0, 10);
  };

  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    date.setDate(date.getDate() + days);
    return formatDateKey(date);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNum = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  const buildVehicleSchedule = (raw: any): Record<string, number> => {
    if (!raw) return {};
    if (!Array.isArray(raw) && typeof raw === 'object') {
      const schedule: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!k) continue;
        if (typeof v === 'string') {
          schedule[k] = 0;
        } else if (v && typeof v === 'object') {
          const acres = Number((v as any)?.acres_covered);
          schedule[k] = Number.isFinite(acres) ? acres : 0;
        } else {
          schedule[k] = 0;
        }
      }
      return schedule;
    }

    if (Array.isArray(raw)) {
      const schedule: Record<string, number> = {};
      for (const item of raw) {
        const date = item?.date || item?.day || item?.created_at;
        if (!date) continue;
        const acres = Number(item?.acres_covered);
        schedule[String(date).slice(0, 10)] = Number.isFinite(acres) ? acres : 0;
      }
      return schedule;
    }

    return {};
  };

  const fetchVehiclesForAssignment = async () => {
    setIsLoadingVehiclesForAssignment(true);
    try {
      const res = await fetch(`${BASE_URL}/admin_vehicles/get_all_vehicles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || 'Failed to load vehicles');
        setVehiclesForAssignment([]);
        return;
      }

      const list: ApiVehicle[] = Array.isArray(data) ? data : [];
      const mapped: Asset[] = list.map((v) => {
        const info = v?.vehicle_information || {};
        const vehicleNumber = info?.vehicle_number || '';
        return {
          id: v.vehicle_id,
          name: vehicleNumber || v.vehicle_id,
          type: info?.type || 'Vehicle',
          category: 'Vehicle',
          schedule: buildVehicleSchedule(v?.work_calandar),
        };
      });

      setVehiclesForAssignment(mapped);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load vehicles');
      setVehiclesForAssignment([]);
    } finally {
      setIsLoadingVehiclesForAssignment(false);
    }
  };

  const handleApproveClick = (req: LogisticsRequest) => {
    if (shouldRequireApproveNote(req)) {
      setApproveTarget(req);
      setApproveNote('');
      setIsApproveNoteModalOpen(true);
      return;
    }
    onApprove(req.id);
  };

  const closeApproveNoteModal = () => {
    setIsApproveNoteModalOpen(false);
    setApproveTarget(null);
    setApproveNote('');
  };

  const submitApproveNote = () => {
    if (!approveTarget) return;
    const note = approveNote.trim();
    if (!note) {
      toast.error('Please write a note');
      return;
    }
    onApprove(approveTarget.id, note);
    closeApproveNoteModal();
  };

  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' };
      case 'approved': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' };
      case 'in_progress': return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'In Progress' };
      case 'completed': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' };
      case 'rejected': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' };
    }
  };

  const formatRequestDateTime = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString();
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const aT = new Date(a.requestDate || a.createdAt).getTime();
    const bT = new Date(b.requestDate || b.createdAt).getTime();
    if (Number.isNaN(aT) && Number.isNaN(bT)) return 0;
    if (Number.isNaN(aT)) return 1;
    if (Number.isNaN(bT)) return -1;
    return bT - aT;
  });

  const getRequestedLocationForCalendar = (req: LogisticsRequest): string => {
    const from = String(req.fromLocation || '').trim();
    const to = String(req.toLocation || '').trim();
    if (from && to) return `${from} -> ${to}`;
    return from || to || '';
  };

  const updateVehicleCalendarForLogistics = async (vehicleId: string) => {
    if (!assignmentRequest || !assignmentDate) throw new Error('Missing request/date for assignment');

    const payload = {
      date: assignmentDate,
      acres_covered: 0,
      vehicle_id: vehicleId,
      block_id: '',
      activity: 'Logistics Request',
      farm_id: getRequestedLocationForCalendar(assignmentRequest),
      description: String(assignmentRequest.description || ''),
      requester_id: String(assignmentRequest.staff_id || assignmentRequest.requesterId || ''),
      request_id: String(assignmentRequest.id || ''),
    };

    const res = await fetch(`${BASE_URL}/admin_vehicles/update_vehicle_calander`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Failed to update vehicle calendar');
    if (data?.success === false) throw new Error(data?.message || 'Vehicle calendar did not return success');
    return data;
  };

  const toggleVehicleSelection = (vId: string) => {
    // Selection is local-only; backend reservation is done on Confirm Assignment.
    setSelectedVehicleIds(prev => (
      prev.includes(vId)
        ? prev.filter(id => id !== vId)
        : [...prev, vId]
    ));
  };

  const closeAssignResourcesModal = () => {
    setIsAssignResourcesOpen(false);
    setAssignmentDate(null);
    setAssignmentRequest(null);
    setSelectedVehicleIds([]);
  };

  const handleOpenAssignResources = (req: LogisticsRequest) => {
    const dateKey = toDateKey(req.preferredDate || req.requestDate || req.createdAt);
    setAssignmentRequest(req);
    setAssignmentDate(dateKey);
    setSelectedVehicleIds([]);
    setIsAssignResourcesOpen(true);
    fetchVehiclesForAssignment();
  };

  const chartDates = assignmentDate ? Array.from({ length: 5 }, (_, i) => addDays(assignmentDate, i)) : [];

  const VehicleAvailabilityRow = ({ asset, isSelected, onSelect, disabled }: { asset: Asset, isSelected: boolean, onSelect: () => void, disabled?: boolean }) => {
    return (
      <div
        onClick={disabled ? undefined : onSelect}
        className={cn(
          "grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 p-2 rounded-lg border transition-all cursor-pointer items-center group",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-center gap-3 pr-2">
          <div className={cn(
            "p-2 rounded-md border shadow-sm",
            isSelected ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"
          )}>
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-foreground">{asset.name}</div>
            <div className="text-[10px] text-muted-foreground">{asset.type}</div>
          </div>
        </div>

        {chartDates.map(date => {
          const acresCovered = asset.schedule[date];
          const isBusy = acresCovered !== undefined;
          return (
            <div key={date} className="flex justify-center h-full items-center">
              {isBusy ? (
                <div className="w-full h-8 bg-red-100 border border-red-200 rounded-md flex items-center justify-center group/tooltip relative">
                  <span className="text-[10px] font-bold text-red-700">{Number(acresCovered || 0).toFixed(0)} ac</span>
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    Acres covered: {Number(acresCovered || 0).toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "w-full h-8 border rounded-md flex items-center justify-center transition-colors",
                  date === assignmentDate
                    ? (isSelected ? "bg-green-600 border-green-600 text-white" : "bg-green-100 border-green-200 text-green-700")
                    : "bg-gray-50 border-gray-100"
                )}>
                  {date === assignmentDate && isSelected && <CheckCircle2 className="w-4 h-4" />}
                  {date === assignmentDate && !isSelected && <span className="text-[10px] font-bold">Free</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleConfirmResources = async () => {
    if (!assignmentRequest || !assignmentDate) return;
    if (selectedVehicleIds.length === 0) {
      toast.error('Please select at least one vehicle');
      return;
    }

    setIsAssigningResources(true);
    try {
      // Reserve vehicles on the backend *when confirming*.
      // Backend endpoint for persisting a separate logistics "operation" wasn't provided.
      let lastResp: any = null;
      for (const vehicleId of selectedVehicleIds) {
        // eslint-disable-next-line no-await-in-loop
        lastResp = await updateVehicleCalendarForLogistics(vehicleId);
      }

      if (lastResp?.success === true) {
        const nextStatus = toApprovalStageStatus(lastResp?.request_status);
        if (nextStatus) onUpdateForwardedDepartmentStatus(assignmentRequest.id, nextStatus);
      }

      toast.success(`Resources allocated for request ${assignmentRequest.id}`);
      closeAssignResourcesModal();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to allocate resources');
    } finally {
      setIsAssigningResources(false);
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
  return (
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
                      {/* Section 1: Sender's Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Sender's Details</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Staff ID</p>
                            <p className="text-sm font-medium text-gray-900">{req.staff_id || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Staff Name</p>
                            <p className="text-sm font-medium text-gray-900">{req.staff_name || req.requesterName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{req.staff_phone || req.requesterPhone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Department</p>
                            <p className="text-sm font-medium text-gray-900">{req.staff_department || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Designation</p>
                            <p className="text-sm font-medium text-gray-900">{req.staff_designation || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Request Details */}
                      <div className="space-y-3 md:pl-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Request Details</h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Requested Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatRequestDateTime(req.requestDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Requested Location</p>
                            <p className="text-sm font-medium text-gray-900">
                              {req.toLocation ? `${req.fromLocation} → ${req.toLocation}` : req.fromLocation}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Vehicle Type</p>
                            <p className="text-sm font-medium text-gray-900">{req.vehicleType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Priority</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
                              {priorityConfig.icon} {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Request Notes</p>
                            <p className="text-xs italic text-gray-400 mb-1">(Direct note from sender)</p>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm text-gray-700">{req.description}</div>
                          </div>

                          {req.requestDetailsType?.toLowerCase() === 'fuel' && Array.isArray(req.fuelMetaData) && req.fuelMetaData.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Fuel Requirements</p>
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-semibold text-gray-700">Fuel Requests</div>
                                  <div className="text-xs text-gray-600">
                                    Total: {req.fuelMetaData.reduce((sum, r) => sum + (Number.isFinite(r.fuel_amount) ? r.fuel_amount : 0), 0)} L
                                  </div>
                                </div>

                                <div className="max-h-40 overflow-auto">
                                  <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-100">
                                    <div>Request ID</div>
                                    <div>Vehicle</div>
                                    <div>Driver</div>
                                    <div className="text-right">Liters</div>
                                  </div>
                                  <div className="divide-y divide-gray-100">
                                    {req.fuelMetaData.map((r, idx) => (
                                      <div key={`${r.request_id}-${idx}`} className="grid grid-cols-4 gap-2 py-2 text-xs text-gray-700">
                                        <div className="font-mono truncate">{r.request_id}</div>
                                        <div className="truncate">{r.vehicle_number}</div>
                                        <div className="truncate">{r.driver_name}</div>
                                        <div className="text-right font-medium">{r.fuel_amount}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {req.adminNote && String(req.adminNote).trim() && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Approval Note</p>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm text-blue-900">{req.adminNote}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Request Status */}
                      <div className="space-y-3 md:pl-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Request Status</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Concerned Department</p>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              req.concerned_department_approval_status === 'approved_and_forwarded' ? "bg-green-100 text-green-800 border border-green-200" :
                              req.concerned_department_approval_status === 'rejected' ? "bg-red-100 text-red-800 border border-red-200" :
                              "bg-amber-100 text-amber-800 border border-amber-200"
                            )}>
                              {req.concerned_department_approval_status === 'approved_and_forwarded' ? 'Approved & Forwarded' :
                               req.concerned_department_approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Admin Operations</p>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              (req.admin_ops_approval_status === 'approved_and_forwarded' || req.admin_ops_approval_status === 'approved') ? "bg-green-100 text-green-800 border border-green-200" :
                              req.admin_ops_approval_status === 'rejected' ? "bg-red-100 text-red-800 border border-red-200" :
                              "bg-amber-100 text-amber-800 border border-amber-200"
                            )}>
                              {(req.admin_ops_approval_status === 'approved_and_forwarded' || req.admin_ops_approval_status === 'approved') ? 'Approved' :
                               req.admin_ops_approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Forwarded Department</p>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              req.forwarded_department_approval_status === 'approved_and_forwarded' ? "bg-green-100 text-green-800 border border-green-200" :
                              req.forwarded_department_approval_status === 'rejected' ? "bg-red-100 text-red-800 border border-red-200" :
                              "bg-amber-100 text-amber-800 border border-amber-200"
                            )}>
                              {req.forwarded_department_approval_status === 'approved_and_forwarded' ? 'Approved & Forwarded' :
                               req.forwarded_department_approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                      {/* Buttons based on approval status */}
                      {req.concerned_department_approval_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveClick(req)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Approve & Forward
                          </button>
                          <button
                            onClick={() => onReject(req.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {req.forwarded_department_approval_status === 'pending' &&
                        (req.admin_ops_approval_status === 'approved_and_forwarded' || req.admin_ops_approval_status === 'approved') &&
                        isForwardedToLogistics(req) && (
                        <>
                          <button
                            onClick={() => handleOpenAssignResources(req)}
                            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Create Operation
                          </button>
                          <button
                            onClick={() => onReject(req.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {req.forwarded_department_approval_status === 'approved_and_forwarded' && (
                        <span className="inline-flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
                          ✓ Fully Approved
                        </span>
                      )}

                      {(req.concerned_department_approval_status === 'rejected' || req.admin_ops_approval_status === 'rejected' || req.forwarded_department_approval_status === 'rejected') && (
                        <span className="inline-flex items-center px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </div>

      {/* Assign Resources Modal (same UI as CultivationCalendar) */}
      {isAssignResourcesOpen && assignmentDate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assign Resources</h3>
                <p className="text-sm text-muted-foreground">Vehicle allocation • {new Date(assignmentDate).toDateString()}</p>
                {assignmentRequest && (
                  <p className="text-xs text-muted-foreground mt-1">Request ID: <span className="font-medium text-foreground">{assignmentRequest.id}</span></p>
                )}
              </div>
              <button onClick={closeAssignResourcesModal} className="p-1 hover:bg-muted rounded-md"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2"><Truck className="w-4 h-4" /> Select Vehicles</h4>
                  {selectedVehicleIds.length > 0 && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">{selectedVehicleIds.length} Selected</span>}
                </div>
                <div className="overflow-x-auto bg-white rounded-lg border border-border shadow-sm p-4">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 mb-4 text-xs font-semibold text-muted-foreground">
                      <div className="self-end pb-2">Vehicle Name</div>
                      {chartDates.map(date => (
                        <div key={date} className={cn("text-center pb-2 border-b-2", date === assignmentDate ? "border-primary text-primary" : "border-transparent")}>
                          <div className="text-[10px] uppercase">{getDayName(date)}</div>
                          <div>{getDayNum(date)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {isLoadingVehiclesForAssignment ? <div className="p-4 text-sm text-muted-foreground">Loading vehicles…</div> : vehiclesForAssignment.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No vehicles found.</div> : vehiclesForAssignment.map(vehicle => <VehicleAvailabilityRow key={vehicle.id} asset={vehicle} isSelected={selectedVehicleIds.includes(vehicle.id)} disabled={isAssigningResources} onSelect={() => { toggleVehicleSelection(vehicle.id); }} />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-white flex justify-between items-center">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> Busy</div>
              </div>
              <div className="flex gap-2">
                <button onClick={closeAssignResourcesModal} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">Cancel</button>
                <button type="button" onClick={handleConfirmResources} disabled={isAssigningResources || selectedVehicleIds.length === 0} className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  (selectedVehicleIds.length > 0 && !isAssigningResources) ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                )}>
                  {isAssigningResources ? 'Assigning…' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Note Modal */}
      {isApproveNoteModalOpen && approveTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Approval Note</h3>
                <p className="text-sm text-gray-600 mt-1">Request ID: {approveTarget.id}</p>
              </div>
              <button
                onClick={closeApproveNoteModal}
                className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Write a note (required)</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
                rows={4}
                placeholder="Add approval note..."
              />
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeApproveNoteModal}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitApproveNote}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    requesterName: '',
    requesterPhone: '',
    vehicleType: '',
    fromLocation: '',
    toLocation: '',
    preferredDate: '',
    priority: 'medium' as RequestPriority,
    description: '',
    loadDetails: '',
  });

  const deriveRequestStatus = (r: Pick<LogisticsRequest,
    'concerned_department_approval_status' | 'admin_ops_approval_status' | 'forwarded_department_approval_status'>
  ): RequestStatus => {
    const concerned = r.concerned_department_approval_status || 'pending';
    const adminOps = r.admin_ops_approval_status || 'pending';
    const forwarded = r.forwarded_department_approval_status || 'pending';

    const isApproved = (v: ApprovalStageStatus) => v === 'approved' || v === 'approved_and_forwarded';

    if ([concerned, adminOps, forwarded].some(s => s === 'rejected')) return 'rejected';
    if ([concerned, adminOps, forwarded].every(s => isApproved(s))) return 'approved';
    if (concerned === 'pending') return 'pending';
    return 'in_progress';
  };

  const parseRequestLocation = (raw: string): { fromLocation: string; toLocation: string } => {
    const cleaned = String(raw || '').trim();
    if (!cleaned) return { fromLocation: '—', toLocation: '' };
    const parts = cleaned.split('->').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return { fromLocation: parts[0], toLocation: parts.slice(1).join(' -> ') };
    return { fromLocation: cleaned, toLocation: '' };
  };

  const updateConcernedDepartmentApprovalStatus = async (payload: {
    request_id: string;
    status: 'approved_and_forwarded' | 'rejected';
    note: string;
  }) => {
    const response = await fetch(
      `${getBaseUrl()}/admin_ops_requests/update_concerned_department_approval_status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const maybeMessage = (data && (data.message || data.detail || data.error)) ? String(data.message || data.detail || data.error) : '';
      throw new Error(maybeMessage || `Request failed (${response.status})`);
    }

    return data;
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_ops_requests/get_all_department_requests/logistics`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      const raw = await response.json();
      const list: BackendDepartmentRequest[] = Array.isArray(raw)
        ? raw
        : (
            Array.isArray(raw?.department_requests)
              ? raw.department_requests
              : (Array.isArray(raw?.data)
                  ? raw.data
                  : (Array.isArray(raw?.requests)
                      ? raw.requests
                      : (Array.isArray(raw?.data?.department_requests)
                          ? raw.data.department_requests
                          : [])))
          );

      const mapped: LogisticsRequest[] = list.map((item) => {
        const loc = parseRequestLocation(item?.request_details?.request_location);
        const requestDetailsType = String(item?.request_details?.request_type || '').trim();
        const rawMeta = item?.request_details?.meta_data;
        const fuelMetaData = (requestDetailsType.toLowerCase() === 'fuel' && Array.isArray(rawMeta))
          ? rawMeta.map((m) => ({
              driver_name: String(m?.driver_name || '').trim() || '—',
              fuel_amount: Number.isFinite(Number(m?.fuel_amount)) ? Number(m?.fuel_amount) : 0,
              request_id: String(m?.request_id || '').trim() || '—',
              vehicle_number: String(m?.vehicle_number || '').trim() || '—',
            }))
          : undefined;

        const concerned = item?.concerned_department_approval_status || 'pending';
        const adminOps = item?.admin_ops_approval_status || 'pending';
        const forwarded = item?.forwarded_department_approval_status || 'pending';
        const forwardedToDepartments = Array.isArray(item?.forwarded_to_departments) ? item.forwarded_to_departments : [];

        const base: LogisticsRequest = {
          id: String(item?.request_id || '').trim() || `REQ-${Math.random().toString(16).slice(2)}`,
          requesterId: item?.sender_details?.staff_id || '',
          requesterName: item?.sender_details?.staff_name || '—',
          requesterPhone: item?.sender_details?.staff_phone || '—',
          vehicleType: '—',
          fromLocation: loc.fromLocation,
          toLocation: loc.toLocation,
          // requested date from backend
          requestDate: item?.date || '',
          // keep something valid for the existing modal
          preferredDate: item?.date || '',
          // will be overwritten after derive
          status: 'pending',
          priority: 'medium',
          description: item?.request_details?.note || '',
          createdAt: item?.created_at || '',

          first_department: item?.first_department,

          staff_id: item?.sender_details?.staff_id,
          staff_name: item?.sender_details?.staff_name,
          staff_phone: item?.sender_details?.staff_phone,
          staff_department: item?.sender_details?.staff_department,
          staff_designation: item?.sender_details?.staff_designation,

          concerned_department_approval_status: concerned,
          admin_ops_approval_status: adminOps,
          forwarded_department_approval_status: forwarded,

          forwarded_to_departments: forwardedToDepartments,

          requestDetailsType: requestDetailsType || undefined,
          fuelMetaData,
        };

        return { ...base, status: deriveRequestStatus(base) };
      });

      setRequests(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateForwardedDepartmentStatus = (id: string, status: ApprovalStageStatus) => {
    setRequests(prev => prev.map((req) => {
      if (req.id !== id) return req;
      const next: LogisticsRequest = { ...req, forwarded_department_approval_status: status };
      next.status = deriveRequestStatus(next);
      return next;
    }));
  };

  const handleApproveRequest = async (id: string, note?: string) => {
    const current = requests.find(r => r.id === id);
    if (!current) return;

    const concerned = current.concerned_department_approval_status || 'pending';
    const adminOps = current.admin_ops_approval_status || 'pending';
    const forwarded = current.forwarded_department_approval_status || 'pending';

    const trimmedNote = typeof note === 'string' ? note.trim() : '';

    // First department action (concerned department) must be persisted via backend.
    if (concerned === 'pending') {
      try {
        await updateConcernedDepartmentApprovalStatus({
          request_id: id,
          status: 'approved_and_forwarded',
          note: trimmedNote,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to approve request');
        return;
      }
    }

    setRequests(prev => prev.map(req => {
      if (req.id !== id) return req;

      const c = req.concerned_department_approval_status || 'pending';
      const a = req.admin_ops_approval_status || 'pending';
      const f = req.forwarded_department_approval_status || 'pending';

      let next: LogisticsRequest = { ...req };
      if (c === 'pending') next.concerned_department_approval_status = 'approved_and_forwarded';
      else if (a === 'pending') next.admin_ops_approval_status = 'approved_and_forwarded';
      else if (f === 'pending') next.forwarded_department_approval_status = 'approved_and_forwarded';

      if (trimmedNote) next.adminNote = trimmedNote;

      next.status = deriveRequestStatus(next);
      return next;
    }));

    toast.success('Approved & forwarded');
  };

  const handleRejectRequest = async (id: string) => {
    const current = requests.find(r => r.id === id);
    if (!current) return;

    const concerned = current.concerned_department_approval_status || 'pending';

    // First department rejection must be persisted via backend.
    if (concerned === 'pending') {
      try {
        await updateConcernedDepartmentApprovalStatus({
          request_id: id,
          status: 'rejected',
          note: '',
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to reject request');
        return;
      }
    }

    setRequests(prev => prev.map(req => {
      if (req.id !== id) return req;

      const c = req.concerned_department_approval_status || 'pending';
      const a = req.admin_ops_approval_status || 'pending';
      const f = req.forwarded_department_approval_status || 'pending';

      let next: LogisticsRequest = { ...req };
      if (c === 'pending') next.concerned_department_approval_status = 'rejected';
      else if (a === 'pending') next.admin_ops_approval_status = 'rejected';
      else if (f === 'pending') next.forwarded_department_approval_status = 'rejected';

      next.status = deriveRequestStatus(next);
      return next;
    }));

    toast.error('Rejected');
  };

  const handleSubmitNewRequest = () => {
    // Validate required fields
    if (!newRequest.requesterName || !newRequest.requesterPhone || !newRequest.vehicleType || 
        !newRequest.fromLocation || !newRequest.toLocation || !newRequest.preferredDate || !newRequest.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newReq: LogisticsRequest = {
      id: `REQ-${String(requests.length + 1).padStart(3, '0')}`,
      requesterId: 'U' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
      requesterName: newRequest.requesterName,
      requesterPhone: newRequest.requesterPhone,
      vehicleType: newRequest.vehicleType,
      fromLocation: newRequest.fromLocation,
      toLocation: newRequest.toLocation,
      requestDate: new Date().toISOString(),
      preferredDate: newRequest.preferredDate,
      status: 'pending', // Pending for admin review
      priority: newRequest.priority,
      description: newRequest.description,
      loadDetails: newRequest.loadDetails,
      createdAt: new Date().toISOString(),
      receiverId: 'ADMIN',
      receiverName: 'Admin Review Pending',
      receiverDepartment: 'Administration',
    };

    setRequests(prev => [newReq, ...prev]);
    setIsNewRequestModalOpen(false);
    
    // Reset form
    setNewRequest({
      requesterName: '',
      requesterPhone: '',
      vehicleType: '',
      fromLocation: '',
      toLocation: '',
      preferredDate: '',
      priority: 'medium',
      description: '',
      loadDetails: '',
    });
    
    toast.success('Request sent to Admin for review!');
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
              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Send to Admin Request
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
          <RequestsSection 
            requests={requests} 
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onUpdateForwardedDepartmentStatus={handleUpdateForwardedDepartmentStatus}
          />
        )}
      </div>

      {/* Send to Admin Request Modal */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-gray-900">Send Request to Admin</h3>
                <p className="text-sm text-gray-600 mt-1">Submit a logistics request for admin approval</p>
              </div>
              <button 
                onClick={() => setIsNewRequestModalOpen(false)}
                className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Requester Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requester Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.requesterName}
                    onChange={(e) => setNewRequest({...newRequest, requesterName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Vehicle and Priority Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.vehicleType}
                    onChange={(e) => setNewRequest({...newRequest, vehicleType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Tractor">Tractor</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Heavy Equipment">Heavy Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({...newRequest, priority: e.target.value as RequestPriority})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.fromLocation}
                    onChange={(e) => setNewRequest({...newRequest, fromLocation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="e.g., Plant A, Warehouse 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.toLocation}
                    onChange={(e) => setNewRequest({...newRequest, toLocation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                    placeholder="e.g., Field 12-B, Hub 3"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newRequest.preferredDate}
                  onChange={(e) => setNewRequest({...newRequest, preferredDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Describe the purpose and requirements of this request..."
                />
              </div>

              {/* Load Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Load Details (Optional)
                </label>
                <input
                  type="text"
                  value={newRequest.loadDetails}
                  onChange={(e) => setNewRequest({...newRequest, loadDetails: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="e.g., Cultivation Equipment, 5 tons produce, 200 bags fertilizer"
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
    </div>
  );
};

export default LogisticsManagement;
