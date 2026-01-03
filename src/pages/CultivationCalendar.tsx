import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  X,
  Plus,
  Shovel,
  Tractor,
  Droplets,
  Leaf,
  ClipboardList,
  Wheat,
  Truck,
  CheckCircle2,
  Watch,
  ChevronDown,
  ChevronUp,
  Info,
  Wrench,
  Minus,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { toast } from 'sonner';

// --- Types ---
interface ApiActivity {
  index: number;
  activity: string;
  field_assignment: {
    [date: string]: Array<{
      farm_id: string;
      assigned_area: number;
    }>;
  };
}

interface ApiPlan {
  plan_id: string;
  block_id: string;
  date_mapping: ApiActivity[];
}

interface ApiResponse {
  plan: {
    [key: string]: ApiPlan;
  };
}

interface ApiFarm {
  created_at: string;
  area: number;
  harvest_log: Record<string, unknown>;
  block_id: string;
  priority: number;
  land_data: {
    farming_option: string;
    state: string;
    village: string;
    district: string;
  };
  farmer_id: string;
  farm_id: string;
}

interface FarmsResponse {
  farms: ApiFarm[];
}

interface CalendarActivity {
  index: number;
  activity: string;
  block_id: string;
  plan_id: string;
  assignments: Array<{
    farm_id: string;
    assigned_area: number;
  }>;
}

interface CalendarData {
  [date: string]: CalendarActivity[];
}

// --- Asset Types & Mock Data ---
interface Asset {
  id: string;
  name: string;
  type: string;
  category: 'Vehicle' | 'Equipment';
  schedule: Record<string, string>; // date -> task
}

const MOCK_VEHICLES: Asset[] = [
  { id: 'v1', name: 'John Deere 5310', type: 'Tractor', category: 'Vehicle', schedule: { '2026-01-02': 'Ploughing' } },
  { id: 'v2', name: 'Mahindra JIVO', type: 'Tractor', category: 'Vehicle', schedule: { '2026-01-03': 'Transport' } },
  { id: 'v3', name: 'Kubota Harvester', type: 'Harvester', category: 'Vehicle', schedule: {} },
  { id: 'v4', name: 'Tata Ace Gold', type: 'Truck', category: 'Vehicle', schedule: {} },
  { id: 'v5', name: 'New Holland 3630', type: 'Tractor', category: 'Vehicle', schedule: {} }
];

const MOCK_EQUIPMENT: Asset[] = [
  { id: 'e1', name: 'MB Plough 2-Bottom', type: 'Plough', category: 'Equipment', schedule: {} },
  { id: 'e2', name: 'Rotavator 6ft', type: 'Rotavator', category: 'Equipment', schedule: {} },
  { id: 'e3', name: 'Boom Sprayer 500L', type: 'Sprayer', category: 'Equipment', schedule: {} },
  { id: 'e4', name: 'Seed Drill 9-Row', type: 'Seeder', category: 'Equipment', schedule: {} }
];

type FarmsById = Record<string, ApiFarm>;
type PendingByDate = Record<string, Record<string, boolean>>;

const getActivityIcon = (activity: string) => {
  const key = activity.trim().toLowerCase();
  const iconClass = "w-4 h-4 text-gray-500";
  if (key.includes('bed')) return <Shovel className={iconClass} />;
  if (key.includes('plough')) return <Tractor className={iconClass} />;
  if (key.includes('irrig')) return <Droplets className={iconClass} />;
  if (key.includes('fert') || key.includes('weed')) return <Leaf className={iconClass} />;
  if (key.includes('visit')) return <ClipboardList className={iconClass} />;
  if (key.includes('harvest')) return <Wheat className={iconClass} />;
  return <ClipboardList className={iconClass} />;
};

const isHarvestActivity = (activity: string) => activity.trim().toLowerCase().includes('harvest');

// --- Helper Functions ---
const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
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

// --- API Fetch ---
const BASE_URL = getBaseUrl().replace(/\/$/, '');

const fetchCalendarData = async (): Promise<CalendarData> => {
  const url = `${BASE_URL}/admin_cultivation/fetch_cultivation_calander`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch calendar data');
    const data: ApiResponse = await res.json();
    
    const calendarByDate: Record<string, Map<string, CalendarActivity>> = {};

    for (const planKey in data.plan) {
      const plan = data.plan[planKey];
      plan.date_mapping.forEach((activity) => {
        const fieldAssignment = activity.field_assignment || {};
        Object.entries(fieldAssignment).forEach(([dateStr, assignments]) => {
          if (!calendarByDate[dateStr]) calendarByDate[dateStr] = new Map();

          const activityKey = `${plan.plan_id}__${plan.block_id}__${activity.index}__${activity.activity}`;
          const normalizedAssignments = Array.isArray(assignments) ? assignments : [];

          const existing = calendarByDate[dateStr].get(activityKey);
          if (!existing) {
            calendarByDate[dateStr].set(activityKey, {
              index: activity.index,
              activity: activity.activity,
              block_id: plan.block_id,
              plan_id: plan.plan_id,
              assignments: normalizedAssignments,
            });
            return;
          }

          const seen = new Set(existing.assignments.map((a) => `${a.farm_id}__${a.assigned_area}`));
          const merged = [...existing.assignments];
          for (const a of normalizedAssignments) {
            const k = `${a.farm_id}__${a.assigned_area}`;
            if (!seen.has(k)) {
              seen.add(k);
              merged.push(a);
            }
          }
          calendarByDate[dateStr].set(activityKey, { ...existing, assignments: merged });
        });
      });
    }

    const calendar: CalendarData = {};
    for (const [dateStr, map] of Object.entries(calendarByDate)) {
      calendar[dateStr] = Array.from(map.values()).sort((a, b) => a.index - b.index);
    }
    return calendar;
  } catch (err) {
    console.error('[CultivationCalendar] Fetch error:', err);
    throw err;
  }
};

const fetchFarmsById = async (): Promise<FarmsById> => {
  const url = `${BASE_URL}/farmer_managment/get_farms`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch farms');
    const data: FarmsResponse = await res.json();
    const farms = Array.isArray(data.farms) ? data.farms : [];
    return farms.reduce<FarmsById>((acc, farm) => {
      acc[farm.farm_id] = farm;
      return acc;
    }, {});
  } catch (error) {
    console.error(error);
    return {};
  }
};


// --- Single Month Component ---
const MonthCard = ({
  monthDate,
  activities,
  onDateClick,
  currentDateKey,
  pendingByDate
}: {
  monthDate: Date;
  activities: CalendarData;
  onDateClick: (dateStr: string) => void;
  currentDateKey: string;
  pendingByDate: PendingByDate;
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthName = monthDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col h-full bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="text-center mb-6 pt-2">
        <h3 className="text-sm font-medium text-foreground/80">{monthName} {year}</h3>
      </div>
      <div className="grid grid-cols-7 mb-4">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-center text-muted-foreground/60 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-4 gap-x-1 flex-1 content-start">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(year, month, day);
          cellDate.setHours(0, 0, 0, 0);
          const isToday = cellDate.getTime() === todayDateObj.getTime();
          const isPast = cellDate.getTime() < todayDateObj.getTime();
          const dayActs = activities[dateStr];
          const hasActivity = dayActs && dayActs.length > 0;
          const hasHarvesting = Array.isArray(dayActs) && dayActs.some((a) => isHarvestActivity(a.activity));
          const hasPending = !!pendingByDate?.[dateStr] && Object.keys(pendingByDate[dateStr]).length > 0;
          let bgClass = "hover:bg-secondary";
          let textClass = "text-muted-foreground/60";
          if (isToday) {
            bgClass = "bg-green-600 text-white shadow-md shadow-green-200";
            textClass = "text-white";
          } else if (isPast && hasActivity) {
            bgClass = "bg-red-100 text-red-600 border border-red-200";
            textClass = "text-red-600";
          } else if (hasActivity) {
            bgClass = "bg-gray-100 text-gray-700";
            textClass = "text-gray-700";
          }
          return (
            <div
              key={day}
              onClick={() => onDateClick(dateStr)}
              className="flex items-center justify-center cursor-pointer group relative"
            >
              {(isToday || (isPast && hasActivity) || hasActivity) ? (
                <div className={cn(
                  "w-8 h-8 rounded-md flex flex-col items-center justify-center transition-all shadow-sm relative",
                  bgClass
                )}>
                  <span className={cn("text-xs font-medium leading-none", isToday && "font-bold")}>{day}</span>
                  {hasHarvesting && (
                    <span className={cn(
                      "absolute -bottom-1 -right-1 rounded-full bg-background border border-border p-0.5 shadow-sm",
                      isToday && "bg-white/90"
                    )}>
                      <Wheat className={cn("w-3 h-3", isToday ? "text-green-800" : "text-muted-foreground")} />
                    </span>
                  )}
                  {hasPending && (
                    <span className={cn(
                      "absolute -bottom-1 -left-1 rounded-full bg-background border border-border p-0.5 shadow-sm"
                    )}>
                      <Watch className="w-3 h-3 text-orange-500" />
                    </span>
                  )}
                  {isToday && (
                    <span className="text-[6px] leading-tight mt-0.5 opacity-90 font-medium">Today</span>
                  )}
                </div>
              ) : (
                <span className={cn(
                  "text-xs hover:text-foreground hover:bg-secondary rounded-full w-7 h-7 flex items-center justify-center transition-colors",
                  textClass
                )}>
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main Component ---
const CultivationCalendar = () => {
  const [baseDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedActivityIds, setExpandedActivityIds] = useState<Record<string, boolean>>({});
  
  // New State for Assignment
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  // Vehicles: Multi-select array
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  // Equipment: Map of ID -> Count (e.g. {e1: 2, e3: 1})
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  const [activitiesData, setActivitiesData] = useState<CalendarData>({});
  const [farmsById, setFarmsById] = useState<FarmsById>({});
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<Record<string, boolean>>({});
  const [pendingByDate, setPendingByDate] = useState<PendingByDate>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDateKey = formatDateKey(new Date());
  const monthsToDisplay = Array.from({ length: 12 }, (_, i) => new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1));

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchCalendarData(), fetchFarmsById()]).then((results) => {
      const [calendarResult, farmsResult] = results;

      if (calendarResult.status === 'fulfilled') {
        setActivitiesData(calendarResult.value);
      } else {
        console.error(calendarResult.reason);
        setError('Failed to load calendar data');
      }

      if (farmsResult.status === 'fulfilled') {
        setFarmsById(farmsResult.value);
      } else {
        console.error(farmsResult.reason);
      }

      setLoading(false);
    });
  }, []);

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsAssignmentOpen(false);
    setSelectedVehicleIds([]);
    setEquipmentCounts({});
  };

  const getTaskKey = (task: CalendarActivity) => {
    return `${task.plan_id}__${task.block_id}__${task.index}__${task.activity}`;
  };

  const toggleActivityExpansion = (taskKey: string) => {
    setExpandedActivityIds(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  useEffect(() => {
    if (isModalOpen) setSelectedTaskKeys({});
  }, [isModalOpen, selectedDate]);

  const selectedActivities = selectedDate && activitiesData[selectedDate] ? activitiesData[selectedDate] : [];
  const allSelectedKeys = selectedActivities.map(getTaskKey);
  const anySelected = allSelectedKeys.some((k) => !!selectedTaskKeys[k]);
  const allSelected = allSelectedKeys.length > 0 && allSelectedKeys.every((k) => !!selectedTaskKeys[k]);

  const toggleSelectAll = () => {
    if (allSelectedKeys.length === 0) return;
    if (allSelected) {
      setSelectedTaskKeys({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const k of allSelectedKeys) next[k] = true;
    setSelectedTaskKeys(next);
  };

  // Step 1: Open Assignment Modal
  const handleAssignTasksClick = () => {
    if (!anySelected) return;
    setIsAssignmentOpen(true);
  };

  // Helper: Toggle Vehicle Selection (Multi-select)
  const toggleVehicleSelection = (vId: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(vId) ? prev.filter(id => id !== vId) : [...prev, vId]
    );
  };

  // Helper: Adjust Equipment Quantity
  const updateEquipmentCount = (eId: string, delta: number) => {
    setEquipmentCounts(prev => {
      const current = prev[eId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [eId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [eId]: next };
    });
  };

  // Step 2: Confirm Assignment
  const handleConfirmAssignment = () => {
    if (!selectedDate || selectedVehicleIds.length === 0) return;
    
    const selectedTasks = selectedActivities.filter((t) => selectedTaskKeys[getTaskKey(t)]);
    
    // Update Local State (Simulation)
    setPendingByDate((prev) => {
      const current = prev[selectedDate] ?? {};
      const nextForDate: Record<string, boolean> = { ...current };
      for (const t of selectedTasks) {
        nextForDate[getTaskKey(t)] = true;
      }
      return {
        ...prev,
        [selectedDate]: nextForDate,
      };
    });

    const totalEqCount = Object.values(equipmentCounts).reduce((a, b) => a + b, 0);
    toast.success('Assignment Confirmed', {
      description: `Assigned ${selectedVehicleIds.length} Vehicles ${totalEqCount > 0 ? `& ${totalEqCount} Equipments` : ''} to ${selectedTasks.length} tasks.`
    });

    // Reset and close
    setSelectedTaskKeys({});
    setSelectedVehicleIds([]);
    setEquipmentCounts({});
    setIsAssignmentOpen(false);
  };

  // --- Helper to Generate Dates for Chart ---
  const getChartDates = () => {
    if (!selectedDate) return [];
    const dates = [];
    for (let i = 0; i < 5; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  };

  const chartDates = getChartDates();

  // Reusable Availability Row Component (For Vehicles Only)
  const VehicleAvailabilityRow = ({ 
    asset, 
    isSelected, 
    onSelect
  }: { 
    asset: Asset, 
    isSelected: boolean, 
    onSelect: () => void
  }) => {
    const isBusyOnSelected = !!asset.schedule[selectedDate!];
    
    return (
      <div 
        onClick={() => !isBusyOnSelected && onSelect()}
        className={cn(
          "grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 p-2 rounded-lg border transition-all cursor-pointer items-center group",
          isSelected 
            ? "border-primary bg-primary/5 ring-1 ring-primary" 
            : isBusyOnSelected ? "border-transparent opacity-60 cursor-not-allowed" : "border-border hover:border-primary/50"
        )}
      >
        {/* Vehicle Info */}
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

        {/* Date Status Cols */}
        {chartDates.map(date => {
          const taskName = asset.schedule[date];
          const isBusy = !!taskName;
          
          return (
            <div key={date} className="flex justify-center h-full items-center">
              {isBusy ? (
                <div className="w-full h-8 bg-red-100 border border-red-200 rounded-md flex items-center justify-center group/tooltip relative">
                  <span className="text-[10px] font-bold text-red-700">Busy</span>
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    {taskName}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "w-full h-8 border rounded-md flex items-center justify-center transition-colors",
                  date === selectedDate 
                    ? (isSelected ? "bg-green-600 border-green-600 text-white" : "bg-green-100 border-green-200 text-green-700")
                    : "bg-gray-50 border-gray-100"
                )}>
                  {date === selectedDate && isSelected && <CheckCircle2 className="w-4 h-4" />}
                  {date === selectedDate && !isSelected && <span className="text-[10px] font-bold">Free</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable Quantity Row Component (For Equipment)
  const EquipmentQuantityRow = ({ asset, count }: { asset: Asset, count: number }) => {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all",
        count > 0 ? "border-orange-200 bg-orange-50" : "border-border hover:border-gray-300 bg-white"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-md border shadow-sm",
            count > 0 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-gray-50 text-muted-foreground"
          )}>
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{asset.name}</div>
            <div className="text-[10px] text-muted-foreground">{asset.type}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-md border border-gray-200 p-1 shadow-sm">
          <button 
            onClick={() => updateEquipmentCount(asset.id, -1)}
            disabled={count === 0}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-4 text-center text-sm font-bold text-foreground">{count}</span>
          <button 
            onClick={() => updateEquipmentCount(asset.id, 1)}
            className="p-1 hover:bg-gray-100 rounded text-gray-700"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Cultivation Calendar</h1>
          <p className="text-muted-foreground mt-1">
             Manage your cultivation schedule and track pending tasks.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Nomenclature / Legend */}
      <div className="flex items-center gap-6 bg-white border border-border px-4 py-2 rounded-lg w-fit shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded shadow-sm" />
          <span className="text-xs text-foreground">Present Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded shadow-sm" />
          <span className="text-xs text-foreground">Pending Tasks</span>
        </div>
      </div>

      {/* Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {monthsToDisplay.map((monthDate, index) => (
            <MonthCard
              key={index}
              monthDate={monthDate}
              activities={activitiesData}
              onDateClick={handleDateClick}
              currentDateKey={currentDateKey}
              pendingByDate={pendingByDate}
            />
          ))}
        </div>
      )}

      {/* --- ACTIVITY MODAL (TABLE LAYOUT) --- */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                  <span>{new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </h2>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Total Tasks: <span className="font-semibold text-foreground">{selectedActivities.length}</span></span>
                  <span>•</span>
                  <span>Pending: <span className="font-semibold text-orange-600">
                    {selectedActivities.filter(act => !!pendingByDate?.[selectedDate]?.[getTaskKey(act)]).length}
                  </span></span>
                </div>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Content - TABLE LAYOUT */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {/* Nomenclature for Table */}
              <div className="px-5 py-3 border-b border-border bg-gray-50 flex justify-end items-center gap-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> Progress Guide:
                </span>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-green-500"></div>Today</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-purple-500"></div>Tom (Done)</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-gray-300"></div>Tom (Pending)</span>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px] gap-2 px-5 py-3 border-b border-border bg-gray-50/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                <div className="flex justify-center">
                  <input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={toggleSelectAll} disabled={selectedActivities.length === 0} />
                </div>
                <div>Activity</div>
                <div>Block ID</div>
                <div>Total Area</div>
                <div>Workspan</div>
                <div></div> {/* Expansion Toggle */}
              </div>

              {/* Table Body */}
              <div className="overflow-y-auto flex-1">
                {selectedActivities.length > 0 ? (
                  <div className="divide-y divide-border">
                    {selectedActivities.map((act, idx) => {
                      const taskKey = getTaskKey(act);
                      const isExpanded = expandedActivityIds[taskKey];
                      const totalArea = Array.isArray(act.assignments) 
                        ? act.assignments.reduce((sum, a) => sum + (Number(a.assigned_area) || 0), 0)
                        : 0;
                      
                      // Mock Progress %
                      const isEven = idx % 2 === 0; // Even = Done, Odd = Pending
                      const percentText = isEven ? "100%" : "50%";
                      const statusText = isEven ? "Completed" : "In Progress";
                      
                      return (
                        <div key={idx} className="group bg-white hover:bg-gray-50/50 transition-colors">
                          <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px] gap-2 px-5 py-4 items-center">
                            
                            {/* Checkbox */}
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer"
                                checked={!!selectedTaskKeys[taskKey]}
                                onChange={(e) => {
                                  setSelectedTaskKeys((prev) => ({ ...prev, [taskKey]: e.target.checked }));
                                }}
                              />
                            </div>

                            {/* Activity Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-gray-100 border border-gray-200 text-gray-500 shrink-0">
                                {getActivityIcon(act.activity)}
                              </div>
                              <span className="text-sm font-semibold text-foreground truncate">{act.activity}</span>
                            </div>

                            {/* Block ID */}
                            <div>
                              <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                BLOCK {act.block_id || 'GEN'}
                              </span>
                            </div>

                            {/* Area */}
                            <div className="text-sm font-medium text-foreground">
                              {totalArea.toFixed(2)} <span className="text-xs text-muted-foreground">Acres</span>
                            </div>

                            {/* Progress Bar (Workspan) */}
                            <div className="pr-4 flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex h-3 w-full rounded-sm overflow-hidden bg-gray-200 border border-gray-300 shadow-sm relative">
                                  {/* Segment 1: Today */}
                                  <div className="h-full w-1/2 bg-green-500 border-r border-white/30 flex items-center justify-center">
                                    <span className="text-[7px] font-bold text-white leading-none">50%</span>
                                  </div>
                                  {/* Segment 2: Tomorrow */}
                                  <div 
                                    className={cn(
                                      "h-full w-1/2 transition-colors flex items-center justify-center",
                                      isEven ? "bg-purple-500" : "bg-gray-300"
                                    )}
                                  >
                                    <span className={cn("text-[7px] font-bold leading-none", isEven ? "text-white" : "text-gray-500")}>
                                      {isEven ? "50%" : "0%"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className={cn("text-[9px] font-bold min-w-[35px]", isEven ? "text-green-600" : "text-orange-600")}>
                                {percentText}
                              </span>
                            </div>

                            {/* Expand Button */}
                            <div className="flex justify-center">
                              <button 
                                onClick={() => toggleActivityExpansion(taskKey)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Details */}
                          {isExpanded && Array.isArray(act.assignments) && act.assignments.length > 0 && (
                            <div className="bg-gray-50/80 border-t border-border px-5 py-3 shadow-inner">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Field Assignments</h4>
                                  <div className="bg-white border border-border rounded-md divide-y divide-border">
                                    {act.assignments.map((a, aIdx) => (
                                      <div key={`${a.farm_id}-${aIdx}`} className="flex justify-between px-3 py-2 text-xs">
                                        <span className="font-mono text-gray-600">{a.farm_id}</span>
                                        <span className="font-medium text-gray-900">{Number(a.assigned_area).toFixed(2)} Ac</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Placeholder for vehicle info or other details if needed */}
                                <div className="flex flex-col justify-center items-center text-center p-4 border-2 border-dashed border-gray-200 rounded-md">
                                  <Tractor className="w-6 h-6 text-gray-300 mb-1" />
                                  <p className="text-xs text-muted-foreground">Vehicle assignment pending</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                    <ClipboardList className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">No scheduled activities for this date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-white flex justify-between items-center shrink-0">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{allSelectedKeys.filter((k) => !!selectedTaskKeys[k]).length}</span> tasks selected
              </div>
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTasksClick}
                  disabled={!anySelected}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    anySelected
                      ? "bg-green-800 hover:bg-green-900 text-white"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Assign Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGNMENT MODAL (VEHICLE + EQUIPMENT) --- */}
      {isAssignmentOpen && selectedDate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assign Resources</h3>
                <p className="text-sm text-muted-foreground">Select Vehicle and Equipment for {new Date(selectedDate).toDateString()}</p>
              </div>
              <button onClick={() => setIsAssignmentOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content: Split Layout */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-8">
              
              {/* SECTION 1: VEHICLES (Multi-Select + Calendar) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Select Vehicles
                  </h4>
                  {selectedVehicleIds.length > 0 && (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                      {selectedVehicleIds.length} Selected
                    </span>
                  )}
                </div>
                
                <div className="overflow-x-auto bg-white rounded-lg border border-border shadow-sm p-4">
                  <div className="min-w-[600px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 mb-4 text-xs font-semibold text-muted-foreground">
                      <div className="self-end pb-2">Vehicle Name</div>
                      {chartDates.map(date => (
                        <div key={date} className={cn("text-center pb-2 border-b-2", date === selectedDate ? "border-primary text-primary" : "border-transparent")}>
                          <div className="text-[10px] uppercase">{getDayName(date)}</div>
                          <div>{getDayNum(date)}</div>
                        </div>
                      ))}
                    </div>

                    {/* Vehicle Rows */}
                    <div className="space-y-2">
                      {MOCK_VEHICLES.map(vehicle => (
                        <VehicleAvailabilityRow 
                          key={vehicle.id} 
                          asset={vehicle} 
                          isSelected={selectedVehicleIds.includes(vehicle.id)} 
                          onSelect={() => toggleVehicleSelection(vehicle.id)} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EQUIPMENT (Abundance Counter) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> Select Equipment
                  </h4>
                  {Object.values(equipmentCounts).reduce((a,b)=>a+b,0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full border border-orange-200">
                      <Hash className="w-3 h-3" />
                      {Object.values(equipmentCounts).reduce((a,b)=>a+b,0)} Total
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MOCK_EQUIPMENT.map(equipment => (
                    <EquipmentQuantityRow 
                      key={equipment.id} 
                      asset={equipment} 
                      count={equipmentCounts[equipment.id] || 0} 
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-white flex justify-between items-center">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> Busy</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsAssignmentOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmAssignment}
                  disabled={selectedVehicleIds.length === 0}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    selectedVehicleIds.length > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Confirm Assignment
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CultivationCalendar;