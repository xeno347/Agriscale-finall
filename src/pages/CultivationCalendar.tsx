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
  Send,
  Watch,
  Truck,
  CheckCircle2,
  AlertCircle
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

// --- Vehicle Types & Mock Data ---
interface Vehicle {
  id: string;
  name: string;
  type: 'Tractor' | 'Harvester' | 'Truck';
  schedule: Record<string, string>; // date (YYYY-MM-DD) -> Task Name
}

const MOCK_VEHICLES: Vehicle[] = [
  { 
    id: 'v1', name: 'John Deere 5310', type: 'Tractor', 
    schedule: { '2026-01-02': 'Ploughing Field A', '2026-01-05': 'Maintenance' } 
  },
  { 
    id: 'v2', name: 'Mahindra JIVO', type: 'Tractor', 
    schedule: { '2026-01-03': 'Transport' } 
  },
  { 
    id: 'v3', name: 'Kubota Harvester', type: 'Harvester', 
    schedule: { '2026-01-01': 'Harvest Block C', '2026-01-02': 'Harvest Block C' } 
  },
  { 
    id: 'v4', name: 'Tata Ace Gold', type: 'Truck', 
    schedule: {} 
  }
];

type FarmsById = Record<string, ApiFarm>;
type PendingByDate = Record<string, Record<string, boolean>>;

const getActivityIcon = (activity: string) => {
  const key = activity.trim().toLowerCase();
  if (key.includes('bed')) return <Shovel className="w-4 h-4 text-muted-foreground" />;
  if (key.includes('plough')) return <Tractor className="w-4 h-4 text-muted-foreground" />;
  if (key.includes('irrig')) return <Droplets className="w-4 h-4 text-muted-foreground" />;
  if (key.includes('fert') || key.includes('weed')) return <Leaf className="w-4 h-4 text-muted-foreground" />;
  if (key.includes('visit')) return <ClipboardList className="w-4 h-4 text-muted-foreground" />;
  if (key.includes('harvest')) return <Wheat className="w-4 h-4 text-muted-foreground" />;
  return <ClipboardList className="w-4 h-4 text-muted-foreground" />;
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
  
  // New State for Vehicle Selection
  const [isVehicleSelectionOpen, setIsVehicleSelectionOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

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
    setIsVehicleSelectionOpen(false);
    setSelectedVehicleId(null);
  };

  const handleSendHarvestOrder = (activity: CalendarActivity, dateStr: string) => {
    console.log('[CultivationCalendar] Send harvest order', {
      date: dateStr,
      activity,
    });
    toast.success('Harvest order sent');
  };

  const getTaskKey = (task: CalendarActivity) => {
    return `${task.plan_id}__${task.block_id}__${task.index}__${task.activity}`;
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

  // Step 1: Click "Assign Task" opens Vehicle Modal
  const handleAssignTasksClick = () => {
    if (!anySelected) return;
    setIsVehicleSelectionOpen(true);
  };

  // Step 2: Confirm vehicle and save assignment
  const handleConfirmVehicleAssignment = () => {
    if (!selectedDate || !selectedVehicleId) return;
    const selectedTasks = selectedActivities.filter((t) => selectedTaskKeys[getTaskKey(t)]);
    const vehicle = MOCK_VEHICLES.find(v => v.id === selectedVehicleId);

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

    toast.success(`Tasks assigned to ${vehicle?.name}`, {
      description: `${selectedTasks.length} tasks scheduled for ${selectedDate}`
    });

    // Reset and close
    setSelectedTaskKeys({});
    setSelectedVehicleId(null);
    setIsVehicleSelectionOpen(false);
    // Optionally close the main modal too, or keep it open to see changes
    // setIsModalOpen(false); 
  };

  // --- Helper to Generate Dates for Chart ---
  const getChartDates = () => {
    if (!selectedDate) return [];
    // Show selected date + 4 days ahead (5 days total)
    const dates = [];
    for (let i = 0; i < 5; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  };

  const chartDates = getChartDates();

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

      {/* --- ACTIVITY MODAL --- */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-2xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={toggleSelectAll} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors" disabled={selectedActivities.length === 0}>
                    {allSelected ? 'Unselect all' : 'Select all'}
                  </button>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    Selected: {allSelectedKeys.filter((k) => !!selectedTaskKeys[k]).length}/{selectedActivities.length}
                  </span>
                </div>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Content */}
            <div className="p-4 overflow-y-auto bg-gray-50/50 flex-1">
              {selectedActivities.length > 0 ? (
                <ul className="space-y-3">
                  {selectedActivities.map((act, idx) => (
                    <li key={idx} className="p-3 rounded-lg border shadow-sm bg-white relative">
                      {!!pendingByDate?.[selectedDate]?.[getTaskKey(act)] && (
                        <span className="absolute top-2 right-2 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 text-[11px] font-medium">
                          Pending
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={!!selectedTaskKeys[getTaskKey(act)]}
                            onChange={(e) => {
                              const key = getTaskKey(act);
                              setSelectedTaskKeys((prev) => ({ ...prev, [key]: e.target.checked }));
                            }}
                          />
                          <span className="text-xs text-muted-foreground">Select</span>
                        </label>
                        {getActivityIcon(act.activity)}
                        <span className="font-semibold text-foreground">{act.activity}</span>
                      </div>
                      
                      {/* Farm Assignments Details */}
                      {Array.isArray(act.assignments) && act.assignments.length > 0 && (
                        <div className="mt-3 rounded-md border border-border bg-muted/20 overflow-hidden">
                          <div className="grid grid-cols-2 text-[11px] px-3 py-2 border-b border-border bg-white">
                            <span className="text-muted-foreground">Farm ID</span>
                            <span className="text-muted-foreground text-right">Assigned Area</span>
                          </div>
                          <div className="divide-y divide-border">
                            {act.assignments.map((a, aIdx) => (
                              <div key={`${a.farm_id}-${aIdx}`} className="grid grid-cols-2 px-3 py-2 text-xs bg-white">
                                <div className="min-w-0">
                                  <div className="font-mono text-[11px] text-foreground truncate">{a.farm_id}</div>
                                </div>
                                <span className="text-right text-foreground">{(Number(a.assigned_area) || 0).toFixed(2)} acres</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-white/50">
                  <p className="text-xs text-muted-foreground">No activities found for this date.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-white flex justify-end gap-2 shrink-0">
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
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VEHICLE SELECTION MODAL (Availability Chart) --- */}
      {isVehicleSelectionOpen && selectedDate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-3xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Select Vehicle</h3>
                <p className="text-sm text-muted-foreground">Check availability for {new Date(selectedDate).toDateString()}</p>
              </div>
              <button onClick={() => setIsVehicleSelectionOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Availability Chart */}
            <div className="p-6 bg-white overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header Row: Dates */}
                <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider self-end pb-2">Vehicle</div>
                  {chartDates.map(date => (
                    <div key={date} className={cn(
                      "text-center pb-2 border-b-2",
                      date === selectedDate ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground"
                    )}>
                      <div className="text-[10px] uppercase">{getDayName(date)}</div>
                      <div className="text-sm">{getDayNum(date)}</div>
                    </div>
                  ))}
                </div>

                {/* Rows: Vehicles */}
                <div className="space-y-2">
                  {MOCK_VEHICLES.map(vehicle => {
                    const isBusyOnSelected = !!vehicle.schedule[selectedDate];
                    
                    return (
                      <div 
                        key={vehicle.id}
                        onClick={() => !isBusyOnSelected && setSelectedVehicleId(vehicle.id)}
                        className={cn(
                          "grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 p-2 rounded-lg border transition-all cursor-pointer items-center group",
                          selectedVehicleId === vehicle.id 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : isBusyOnSelected ? "border-transparent opacity-60 cursor-not-allowed" : "border-border hover:border-primary/50"
                        )}
                      >
                        {/* Vehicle Info Col */}
                        <div className="flex items-center gap-3 pr-2">
                          <div className="p-2 rounded-md bg-white border shadow-sm">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate text-foreground">{vehicle.name}</div>
                            <div className="text-[10px] text-muted-foreground">{vehicle.type}</div>
                          </div>
                        </div>

                        {/* Date Status Cols */}
                        {chartDates.map(date => {
                          const taskName = vehicle.schedule[date];
                          const isBusy = !!taskName;
                          
                          return (
                            <div key={date} className="flex justify-center h-full items-center">
                              {isBusy ? (
                                <div className="w-full h-8 bg-red-100 border border-red-200 rounded-md flex items-center justify-center group/tooltip relative">
                                  <span className="text-[10px] font-bold text-red-700">Busy</span>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none z-10">
                                    {taskName}
                                  </div>
                                </div>
                              ) : (
                                <div className={cn(
                                  "w-full h-8 border rounded-md flex items-center justify-center transition-colors",
                                  date === selectedDate 
                                    ? (selectedVehicleId === vehicle.id ? "bg-green-600 border-green-600 text-white" : "bg-green-100 border-green-200 text-green-700")
                                    : "bg-gray-50 border-gray-100"
                                )}>
                                  {date === selectedDate && selectedVehicleId === vehicle.id && <CheckCircle2 className="w-4 h-4" />}
                                  {date === selectedDate && selectedVehicleId !== vehicle.id && <span className="text-[10px] font-bold">Free</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-gray-50 flex justify-between items-center">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> Busy</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsVehicleSelectionOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmVehicleAssignment}
                  disabled={!selectedVehicleId}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    selectedVehicleId ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
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