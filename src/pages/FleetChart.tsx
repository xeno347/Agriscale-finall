import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  X, 
  Search,
  Calendar as CalendarIcon,
  Warehouse,
  Droplet
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MAP IMPORTS ---
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Tooltip as LeafletTooltip, 
  useMap,
  LayersControl 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon path issues
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Types ---

interface ApiVehicle {
  vehicle_id: string;
  vehicle_information?: {
    vehicle_number?: string;
    type?: string;
  };
}

interface TaskAssignment {
  id: string; // Unique ID for keying
  location_name: string; 
  status: 'active' | 'completed' | 'pending';
  type: 'farm' | 'hub' | 'maintenance';
  geo_boundary?: [number, number][]; 
  center?: [number, number];
}

interface FuelData {
  input: number;    // Refueled amount (Liters)
  consumed: number; // Used amount (Liters)
}

interface DaySchedule {
  date: string;
  tasks: TaskAssignment[]; // Support multiple tasks
  fuel?: FuelData;
}

// Map: VehicleID -> DateString -> DaySchedule
type ScheduleMap = Record<string, Record<string, DaySchedule>>;

// --- Helper Functions ---

const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const formatDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// --- REAL-WORLD DATA (MUMBAI / MAHARASHTRA) ---

const FIELD_POLYGONS: Record<string, [number, number][]> = {
  // Nashik (Farm A)
  'Farm A (Nashik)': [
    [20.0110, 73.7900], [20.0150, 73.8000], [20.0200, 73.7950], [20.0120, 73.7850]
  ],
  // Pune (Farm B)
  'Farm B (Pune)': [
    [18.3500, 73.8500], [18.3550, 73.8550], [18.3600, 73.8500], [18.3520, 73.8450]
  ],
  // Palghar (Farm C)
  'Farm C (Palghar)': [
    [19.7200, 72.9000], [19.7250, 72.9100], [19.7300, 72.9050], [19.7220, 72.8950]
  ],
  // Alibag (Farm D)
  'Farm D (Alibag)': [
    [18.7000, 73.0500], [18.7050, 73.0600], [18.7100, 73.0550], [18.7020, 73.0450]
  ],
  // Satara (Farm E)
  'Farm E (Satara)': [
    [17.9500, 73.9000], [17.9550, 73.9100], [17.9600, 73.9050], [17.9520, 73.8950]
  ],
  // Hubs
  'Hub Central (Bhiwandi)': [
    [19.3000, 73.0500], [19.3050, 73.0500], [19.3050, 73.0550], [19.3000, 73.0550]
  ],
  'Hub South (Navi Mumbai)': [
    [18.9900, 73.1000], [18.9950, 73.1000], [18.9950, 73.1050], [18.9900, 73.1050]
  ],
  'Transit Hub (Thane)': [
    [19.2000, 72.9800], [19.2020, 72.9820], [19.2020, 72.9780], [19.2000, 72.9780]
  ]
};

const DUMMY_VEHICLES: ApiVehicle[] = [
  { vehicle_id: 'v1', vehicle_information: { vehicle_number: 'MH-04-JD-1111', type: 'Truck' } }, 
  { vehicle_id: 'v2', vehicle_information: { vehicle_number: 'MH-12-PQ-2222', type: 'Tractor' } }, 
  { vehicle_id: 'v3', vehicle_information: { vehicle_number: 'MH-43-AA-3333', type: 'Harvester' } }, 
  { vehicle_id: 'v4', vehicle_information: { vehicle_number: 'MH-01-ZZ-9999', type: 'Van' } }, 
  { vehicle_id: 'v5', vehicle_information: { vehicle_number: 'GJ-06-BB-8888', type: 'Truck' } }, 
];

const generateDummySchedule = (): ScheduleMap => {
  const map: ScheduleMap = {};
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const getCenter = (poly: [number, number][]): [number, number] => {
    const lat = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
    const lng = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
    return [lat, lng];
  };

  const addTask = (vId: string, day: number, loc: string, type: 'farm' | 'hub' | 'maintenance') => {
    if (!map[vId]) map[vId] = {};
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const poly = FIELD_POLYGONS[loc] || FIELD_POLYGONS['Hub Central (Bhiwandi)'];
    
    if (!map[vId][dateStr]) {
      map[vId][dateStr] = {
        date: dateStr,
        tasks: [],
        fuel: { input: 0, consumed: Math.floor(Math.random() * 20) + 5 } // Random consumption
      };
    }

    // Add Fuel Input randomly for some days
    if (Math.random() > 0.7) {
        if(map[vId][dateStr].fuel) map[vId][dateStr].fuel!.input = Math.floor(Math.random() * 50) + 20;
    }

    map[vId][dateStr].tasks.push({
      id: `${vId}-${dateStr}-${Date.now()}-${Math.random()}`,
      location_name: loc,
      status: 'active',
      type: type,
      geo_boundary: poly,
      center: getCenter(poly)
    });
  };

  // --- LOGISTICS SCHEDULE ---

  // V1: MH-04 
  addTask('v1', 1, 'Farm A (Nashik)', 'farm');
  addTask('v1', 2, 'Farm B (Pune)', 'farm');
  
  // MULTI-TASK EXAMPLE: V1 on Day 3 goes to Farm C AND Farm A
  addTask('v1', 3, 'Farm C (Palghar)', 'farm');
  addTask('v1', 3, 'Farm A (Nashik)', 'farm'); // Second task same day
  
  addTask('v1', 4, 'Farm D (Alibag)', 'farm');
  addTask('v1', 8, 'Maintenance', 'maintenance');

  // V2: MH-12
  addTask('v2', 1, 'Hub Central (Bhiwandi)', 'hub');
  addTask('v2', 2, 'Hub Central (Bhiwandi)', 'hub');
  addTask('v2', 3, 'Farm B (Pune)', 'farm');
  addTask('v2', 15, 'Hub South (Navi Mumbai)', 'hub');

  // V3: MH-43
  addTask('v3', 1, 'Farm C (Palghar)', 'farm');
  addTask('v3', 5, 'Farm C (Palghar)', 'farm');
  
  // V4: MH-01
  addTask('v4', 1, 'Maintenance', 'maintenance');
  
  // V5: GJ
  for(let i=1; i<=10; i++) addTask('v5', i, 'Farm A (Nashik)', 'farm');

  return map;
};

const fetchVehicles = async () => DUMMY_VEHICLES;
const fetchSchedule = async () => generateDummySchedule();

// --- Map Components ---

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 13); }, [center, map]); 
  return null;
};

const LocationMapPopup = ({ data, onClose }: { data: TaskAssignment & { vehicle: string, date: string }, onClose: () => void }) => {
  const isHub = data.type === 'hub';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              {isHub ? <Warehouse className="w-5 h-5 text-purple-600" /> : <MapPin className="w-5 h-5 text-red-600" />}
              {data.location_name}
            </h3>
            <p className="text-sm text-gray-500">
              Vehicle <b>{data.vehicle}</b> • {data.date} • <span className="uppercase text-xs font-bold tracking-wider">{data.type} View</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 bg-slate-100 relative">
          <MapContainer center={data.center || [19.0760, 72.8777]} zoom={13} style={{ height: "100%", width: "100%" }}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street Map">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  attribution='&copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <RecenterMap center={data.center || [19.0760, 72.8777]} />
            <Polygon 
              positions={data.geo_boundary || []} 
              pathOptions={{ 
                color: isHub ? '#9333ea' : '#ef4444', 
                fillColor: isHub ? '#a855f7' : '#ef4444', 
                fillOpacity: 0.3, 
                weight: 2
              }}
            >
              <LeafletTooltip permanent direction="center" className={cn("border-0 shadow-md text-xs font-bold px-2 py-1 rounded bg-white/90", isHub ? "text-purple-700" : "text-red-700")}>
                {data.location_name}
              </LeafletTooltip>
            </Polygon>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const FleetChart = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCell, setSelectedCell] = useState<(TaskAssignment & { vehicle: string, date: string }) | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [vData, sData] = await Promise.all([fetchVehicles(), fetchSchedule()]);
      setVehicles(vData);
      setSchedule(sData);
      setLoading(false);
    };
    load();
  }, []);

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const filteredVehicles = vehicles.filter(v => 
    (v.vehicle_information?.vehicle_number || v.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const getCellColor = (type?: string) => {
    switch(type) {
      case 'maintenance': return 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700';
      case 'hub': return 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700';
      default: return 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700';
    }
  };

  const handleHubClick = (vehicleName: string, date: string) => {
    const transitHubPoly = FIELD_POLYGONS['Transit Hub (Thane)'];
    const center = transitHubPoly[0];
    
    setSelectedCell({
      id: 'transit',
      vehicle: vehicleName,
      date: date,
      location_name: "Transit Hub (Thane)",
      status: 'active',
      type: 'hub',
      geo_boundary: transitHubPoly,
      center: center
    });
  };

  return (
    <div className="h-[calc(100vh-1rem)] flex flex-col bg-white overflow-hidden rounded-tl-xl">
      
      {/* Header */}
      <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 bg-white z-20">
        <h1 className="text-xl font-display font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          Fleet Chart
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" placeholder="Search vehicle..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-md text-sm transition-all w-48"
            />
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
            <span className="px-4 text-sm font-bold text-gray-700 w-32 text-center select-none">{currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
            <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading Fleet Data...</div>
        ) : (
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            <table className="border-collapse w-full min-w-max">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="sticky left-0 top-0 z-50 bg-gray-50 border-b border-r border-gray-200 w-48 min-w-[12rem] p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicle No.</th>
                  {days.map((day, i) => (
                    <th key={i} className="border-b border-gray-200 min-w-[10rem] p-2 text-center bg-gray-50">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 font-medium uppercase">{day.toLocaleString('default', { weekday: 'short' })}</span>
                        <span className={cn("text-sm font-bold text-gray-700 w-8 h-8 flex items-center justify-center rounded-full mt-1", day.toDateString() === new Date().toDateString() ? "bg-blue-600 text-white shadow-md" : "")}>{day.getDate()}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredVehicles.map((vehicle) => {
                  const vId = vehicle.vehicle_id;
                  const vName = vehicle.vehicle_information?.vehicle_number || vId;
                  const vSchedule = schedule[vId] || {};

                  return (
                    // WRAPPER for Row spanning 2 rows
                    <>
                    {/* ROW 1: TASKS */}
                    <tr key={`${vId}-tasks`} className="bg-white">
                      <td rowSpan={2} className="sticky left-0 z-40 bg-white border-r border-b border-gray-100 p-4 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] align-middle">
                        <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{vName}</div>
                        <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{vehicle.vehicle_information?.type}</div>
                      </td>

                      {days.map((day, dIndex) => {
                        const dateKey = formatDateKey(day);
                        const nextDateKey = formatDateKey(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1));
                        
                        const dayData = vSchedule[dateKey];
                        const nextDayData = vSchedule[nextDateKey];
                        
                        const tasks = dayData?.tasks || [];
                        const hasTasks = tasks.length > 0;

                        // Hub Connector Logic (Simplified to first task of day)
                        const showHubConnector = hasTasks && nextDayData?.tasks?.length > 0 && tasks[0].type === 'farm' && nextDayData.tasks[0].type === 'farm';

                        return (
                          <td key={`${vId}-t-${dIndex}`} className="border-r border-gray-100 p-1 h-20 relative align-top min-w-[10rem]">
                            {hasTasks ? (
                              <div className="w-full h-full flex flex-col gap-1">
                                {tasks.map((task, tIdx) => (
                                  <button 
                                    key={task.id}
                                    onClick={() => setSelectedCell({ ...task, vehicle: vName, date: dateKey })}
                                    className={cn(
                                      "w-full flex-1 rounded-md border flex flex-col items-start justify-center px-2 transition-all group relative overflow-hidden shadow-sm hover:shadow-md min-h-[36px]",
                                      getCellColor(task.type)
                                    )}
                                  >
                                    <span className="text-xs font-bold truncate w-full text-left">{task.location_name}</span>
                                    <span className="text-[10px] opacity-70 truncate w-full text-left capitalize flex items-center gap-1">
                                      {task.type === 'hub' ? <Warehouse className="w-3 h-3" /> : null}
                                      {task.type}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-200 select-none text-lg">-</div>
                            )}

                            {showHubConnector && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleHubClick(vName, `${dateKey} - ${nextDateKey}`);
                                }}
                                className="absolute top-1/2 -right-3 -translate-y-1/2 z-30 group/hub hover:scale-110 transition-transform"
                                title="View Hub Location"
                              >
                                <div className="bg-[#1e293b] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg border border-white/50 flex items-center justify-center min-w-[36px]">
                                  Hub
                                </div>
                                <div className="h-0.5 w-6 bg-[#1e293b] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 opacity-50"></div>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* ROW 2: FUEL & CONSUMPTION */}
                    <tr key={`${vId}-fuel`} className="bg-gray-50/30">
                        {/* No first TD here because of rowSpan above */}
                        {days.map((day, dIndex) => {
                            const dateKey = formatDateKey(day);
                            const fuel = vSchedule[dateKey]?.fuel;

                            return (
                                <td key={`${vId}-f-${dIndex}`} className="border-r border-b border-gray-100 p-1 h-8 text-center align-middle">
                                    {fuel ? (
                                        <div className="flex items-center justify-between px-2 text-[10px] font-medium text-gray-500">
                                            <span className={cn("flex items-center gap-1", fuel.input > 0 ? "text-green-600 font-bold" : "")}>
                                                In: {fuel.input > 0 ? `${fuel.input}L` : '-'}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-gray-600">
                                                Use: {fuel.consumed}L
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-gray-300">-</div>
                                    )}
                                </td>
                            )
                        })}
                    </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCell && <LocationMapPopup data={selectedCell} onClose={() => setSelectedCell(null)} />}
      
    </div>
  );
};

export default FleetChart;