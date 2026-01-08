import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  X,
  Truck,
  Wrench,
  Package,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { toast } from 'sonner';

// --- Types ---

// Vehicle Types
interface ApiVehicle {
  vehicle_id: string;
  vehicle_information?: {
    vehicle_number?: string;
    type?: string;
    company?: string;
    model?: string;
  };
  work_calandar?: Record<string, string> | any;
  assigned_staff?: any;
}

// Inventory/Equipment Types
interface ApiInventoryItem {
  id?: string;
  Invent_id?: string;
  item?: string;
  category?: string;
  stock?: number;
  unit?: string;
  last_updated?: string;
}

interface InventoryResponse {
  inventory_items?: ApiInventoryItem[];
}

// --- Helper Functions ---

// --- API Fetching ---

const BASE_URL = getBaseUrl().replace(/\/$/, '');

// New: tasks by date map type
type TasksByDateMap = Record<string, { vehicles: Array<any>; equipment: Array<any> }>;

const fetchVehicles = async (): Promise<ApiVehicle[]> => {
  try {
    const res = await fetch(`${BASE_URL}/admin_vehicles/get_all_vehicles`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
    toast.error('Failed to load vehicles');
    return [];
  }
};

const fetchInventory = async (): Promise<ApiInventoryItem[]> => {
  try {
    const res = await fetch(`${BASE_URL}/inventory_management/get_inventory_items`);
    const data: InventoryResponse | any = await res.json();
    
    // Handle different API response structures safely
    if (Array.isArray(data?.inventory_items)) return data.inventory_items;
    if (Array.isArray(data)) return data;
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

const fetchAllTasks = async (): Promise<any[]> => {
  try {
    const res = await fetch(`${BASE_URL}/admin_all_task/get_all_tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(e);
    toast.error('Failed to load tasks');
    return [];
  }
};

// --- Components ---

const ResourcePopup = ({ 
  date, 
  onClose, 
  vehicles, 
  equipment,
  tasksForDate
}: { 
  date: string, 
  onClose: () => void, 
  vehicles: ApiVehicle[], 
  equipment: ApiInventoryItem[],
  tasksForDate?: { vehicles: Array<any>; equipment: Array<any> }
}) => {
  // If tasks provide explicit assignments for this date, prefer them
  const assignedVehicles = tasksForDate?.vehicles ?? [];
  const assignedEquipment = tasksForDate?.equipment ?? [];

  // Fallback: detect busy vehicles from vehicle schedules (existing logic)
  const busyVehicles = vehicles.filter(v => {
    const schedule = v.work_calandar || {};
    if (Array.isArray(schedule)) {
        return schedule.some((s: any) => s.date === date || s.day === date);
    }
    return !!schedule[date];
  });

  const vehiclesToShow = assignedVehicles.length > 0 ? assignedVehicles : busyVehicles;

  const getVehicleTask = (v: any) => {
    if (v.vehicle_number) return v.vehicle_number;
    if (v.vehicle_id) return v.vehicle_id;
    const schedule = v.work_calandar || {};
    if (schedule[date]) return String(schedule[date]);
    return 'Assigned';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              {new Date(date).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Resource allocation overview</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Assigned Vehicles ({vehiclesToShow.length})
            </h3>

            {vehiclesToShow.length > 0 ? (
              <div className="grid gap-3">
                {vehiclesToShow.map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-white shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{v.vehicle_number || v.vehicle_id}</div>
                        <div className="text-xs text-gray-500">{v.type || v.vehicle_information?.type || ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {getVehicleTask(v)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-xs">
                No vehicles scheduled for this date.
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-600" /> Assigned Equipment ({assignedEquipment.length})
            </h3>

            {assignedEquipment.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assignedEquipment.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{item.equipment_name || item.item || 'Unknown Item'}</div>
                        <div className="text-xs text-gray-500 truncate">{item.category || ''}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-sm font-bold", (item.quantity || item.stock || 0) > 0 ? "text-green-600" : "text-red-500")}>
                        {item.quantity ?? item.stock ?? 0}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">{item.unit || ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-xs">
                No equipment assigned for this date.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// Update MonthGrid to accept tasksByDate
const MonthGrid = ({ 
  monthDate, 
  vehicles,
  onDateSelect,
  tasksByDate
}: { 
  monthDate: Date, 
  vehicles: ApiVehicle[], 
  onDateSelect: (date: string) => void,
  tasksByDate?: TasksByDateMap
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthName = monthDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
      <div className="text-center mb-6">
        <h3 className="text-sm font-bold text-gray-800">{monthName} {year}</h3>
      </div>
      
      <div className="grid grid-cols-7 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-4 gap-x-1 flex-1 content-start">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const current = new Date(year, month, day);
          current.setHours(0,0,0,0);
          const isToday = current.getTime() === today.getTime();

          // Use tasksByDate to detect assigned resources
          const resources = tasksByDate?.[dateStr];
          const vehicleCount = resources?.vehicles?.length ?? 0;
          const equipmentCount = resources?.equipment?.length ?? 0;

          const hasActivity = vehicleCount > 0 || equipmentCount > 0;

          return (
            <div 
              key={day} 
              onClick={() => onDateSelect(dateStr)}
              className="flex justify-center cursor-pointer group"
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex flex-col items-center justify-center transition-all relative border",
                isToday ? "bg-green-600 text-white border-green-600 shadow-md" : 
                hasActivity ? "bg-white border-gray-300 hover:border-blue-400 hover:shadow-sm" : 
                "bg-transparent border-transparent hover:bg-gray-50 text-gray-500"
              )}>
                <span className={cn("text-xs font-medium", isToday && "font-bold")}>{day}</span>
                <div className="flex gap-1 mt-1">
                  {vehicleCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${vehicleCount} Vehicles`} />}
                  {equipmentCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`${equipmentCount} Equipment`} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main Page ---

const ResourceManagement = () => {
  const [vehicles, setVehicles] = useState<ApiVehicle[]>([]);
  const [equipment, setEquipment] = useState<ApiInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New: tasksByDate state
  const [tasksByDate, setTasksByDate] = useState<TasksByDateMap>({});
  
  // Interaction State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Generate 12 months from now (Real Date Logic)
  const baseDate = new Date();
  const months = Array.from({ length: 12 }, (_, i) => new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Fetch Real Data from Existing APIs
      const [vData, eData, tasksData] = await Promise.all([fetchVehicles(), fetchInventory(), fetchAllTasks()]);
      setVehicles(vData);
      setEquipment(eData);

      // Build tasksByDate map from tasksData
      const map: TasksByDateMap = {};
      tasksData.forEach((task: any) => {
        const assigned = Array.isArray(task.assigned_acres) ? task.assigned_acres : [];
        const hasVehicles = Array.isArray(task.vehicles) && task.vehicles.length > 0;
        const hasEquipment = Array.isArray(task.equipment) && task.equipment.length > 0;
        assigned.forEach((a: any) => {
          const date = a?.date;
          if (!date) return;
          if (!map[date]) map[date] = { vehicles: [], equipment: [] };
          if (hasVehicles) {
            task.vehicles.forEach((v: any) => {
              if (!map[date].vehicles.some((x: any) => x.vehicle_id === v.vehicle_id)) map[date].vehicles.push(v);
            });
          }
          if (hasEquipment) {
            task.equipment.forEach((eq: any) => {
              if (!map[date].equipment.some((x: any) => x.equipment_id === eq.equipment_id)) map[date].equipment.push(eq);
            });
          }
        });
      });

      setTasksByDate(map);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">Resource Management</h1>
        <p className="text-gray-500 mt-1">Calendar view of vehicles and equipment inventory status.</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 bg-white border border-gray-200 px-4 py-3 rounded-lg w-fit shadow-sm text-xs font-medium text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Vehicle Assigned
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-600" /> Today
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Layers className="w-3 h-3" /> Select date to view details
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="h-96 flex items-center justify-center text-gray-400">Loading resources...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {months.map((date, i) => (
            <MonthGrid 
              key={i} 
              monthDate={date} 
              vehicles={vehicles} 
              onDateSelect={setSelectedDate}
              tasksByDate={tasksByDate}
            />
          ))}
        </div>
      )}

      {/* Popup Modal */}
      {selectedDate && (
        <ResourcePopup 
          date={selectedDate} 
          onClose={() => setSelectedDate(null)} 
          vehicles={vehicles}
          equipment={equipment}
          tasksForDate={tasksByDate[selectedDate]}
        />
      )}

    </div>
  );
};

export default ResourceManagement;