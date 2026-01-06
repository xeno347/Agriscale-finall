import { useState, useEffect, useMemo, useRef } from 'react';
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
  Hash,
  AlertTriangle,
  CloudRain,
  MapPin,
  User,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { toast } from 'sonner';

// ✅ Import the Sidebar
import { TaskSidebar, SidebarTask } from '@/components/cultivation/TaskSidebar';

// --- Types ---
interface ApiActivity {
  index: number;
  activity: string;
  field_assignment: {
    [date: string]: Array<{
      farm_id: string;
      assigned_area: number;
      status?: string;
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
  calander_id: string;
  farm_id: string;
  assignments: Array<{
    farm_id: string;
    assigned_area: number;
    status?: string;
  }>;
}

interface CalendarData {
  [date: string]: CalendarActivity[];
}

// --- Asset Types ---
interface Asset {
  id: string;
  name: string;
  type: string;
  category: 'Vehicle' | 'Equipment';
  schedule: Record<string, string>;
}

type ApiVehicle = {
  servise_history?: any[];
  fuel_logs?: any[];
  created_at?: string;
  work_calandar?: any[] | Record<string, any> | null;
  vehicle_information?: {
    owned_by?: string;
    company?: string;
    model?: string;
    type?: string;
    last_service_date?: string;
    vehicle_number?: string;
  };
  vehicle_id: string;
  assigned_staff?: any;
};

type ApiInventoryItem = {
  last_updated?: string;
  unit?: string;
  threshold?: number;
  Invent_id?: string;
  category?: string;
  stock?: number;
  item?: string;
  id?: string;
};

type InventoryItemsResponse = {
  inventory_items?: ApiInventoryItem[];
};

type FarmsById = Record<string, ApiFarm>;
type PendingByDate = Record<string, Record<string, boolean>>;

// --- Helper Functions ---
const normalizeAssignmentStatus = (raw?: string) => {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'unassigned';
  if (s === 'unaasigned') return 'unassigned';
  return s;
};

const isPendingAssignmentStatus = (raw?: string) => normalizeAssignmentStatus(raw) === 'pending';
const isCompletedAssignmentStatus = (raw?: string) => normalizeAssignmentStatus(raw) === 'completed';
const isOverdueAssignmentStatus = (raw?: string) => normalizeAssignmentStatus(raw) === 'overdue';

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

// --- NEW COMPONENT: Weekly Field Visit Calendar ---
const WeeklyFieldVisits = ({ activities }: { activities: CalendarData }) => {
  const today = new Date();
  // Calculate start of week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      date: d,
      dateKey: formatDateKey(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate()
    };
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Weekly Field Visits
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {weekDays[0].dayName} {weekDays[0].dayNum} - {weekDays[6].dayName} {weekDays[6].dayNum}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const isToday = day.dateKey === formatDateKey(new Date());
          const dayActivities = activities[day.dateKey] || [];
          
          // Filter ONLY for "Visit" activities
          const visits = dayActivities.filter(act => 
            act.activity.toLowerCase().includes('visit')
          );

          return (
            <div key={day.dateKey} className={cn("flex flex-col gap-2 min-h-[140px] rounded-lg p-2 border transition-colors", isToday ? "bg-blue-50/50 border-blue-200" : "bg-gray-50/50 border-gray-100")}>
              <div className={cn("text-center text-xs font-bold mb-1", isToday ? "text-blue-700" : "text-gray-500")}>
                {day.dayName} <span className="ml-1 text-sm">{day.dayNum}</span>
              </div>

              {visits.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[120px] pr-1">
                  {visits.map((visit, idx) => {
                    const isCompleted = visit.assignments.some(a => isCompletedAssignmentStatus(a.status));
                    
                    return (
                      <div key={`${visit.calander_id}-${idx}`} className="group relative">
                        {/* Task Card */}
                        <div className={cn(
                          "p-2 rounded-md border text-xs cursor-pointer shadow-sm hover:shadow-md transition-all",
                          isCompleted ? "bg-green-100 border-green-200 text-green-800" : "bg-white border-gray-200 text-gray-700"
                        )}>
                          <div className="font-bold truncate mb-0.5">{visit.activity}</div>
                          <div className="flex justify-between items-center text-[10px] opacity-80">
                            <span>{visit.farm_id}</span>
                            {isCompleted ? <CheckCircle2 className="w-3 h-3"/> : <Watch className="w-3 h-3"/>}
                          </div>
                        </div>

                        {/* HOVER TOOLTIP: Field Input Details */}
                        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto p-0 overflow-hidden transform scale-95 group-hover:scale-100 origin-bottom duration-200">
                          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-xs text-gray-700">Visit Report</span>
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", isCompleted ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                              {isCompleted ? "Submitted" : "Pending"}
                            </span>
                          </div>
                          
                          <div className="p-3 space-y-3">
                            {/* Meta */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span>{visit.farm_id || "Unassigned Field"}</span>
                            </div>

                            {/* Inputs */}
                            {isCompleted ? (
                              <div className="space-y-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <User className="w-3 h-3 text-blue-600 mt-0.5" />
                                  <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Field Officer</span>
                                    <span className="text-xs font-semibold text-gray-800">Ramesh Kumar</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <FileText className="w-3 h-3 text-blue-600 mt-0.5" />
                                  <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Observations</span>
                                    <p className="text-[10px] text-gray-700 leading-tight">
                                      Crop growth is consistent. Slight moisture deficit in Zone 2. No pests detected.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <ImageIcon className="w-3 h-3 text-blue-600 mt-0.5" />
                                  <div>
                                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Attachments</span>
                                    <span className="text-[10px] text-blue-600 underline cursor-pointer">View 3 Images</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-2">
                                <div className="inline-flex bg-gray-100 p-2 rounded-full mb-1">
                                  <ClipboardList className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-[10px] text-gray-400 italic">No input data yet.</p>
                              </div>
                            )}
                          </div>
                          {/* Triangle Pointer */}
                          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-300 text-[10px] italic">
                  No visits
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- NEW: Inline Field Visit Timeline kept on the same page (no separate route) ---
const InlineTimeline = ({ activities }: { activities: CalendarData }) => {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const today = new Date();
  today.setHours(0,0,0,0);
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - today.getDay());

  const weeks = Array.from({ length: 8 }).map((_, i) => {
    const d = new Date(startOfThisWeek);
    d.setDate(startOfThisWeek.getDate() + i * 7);
    return { start: d, key: formatDateKey(d), label: `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}` };
  });

  const selectedWeek = weeks[selectedWeekIndex];

  const totalVisits = selectedWeek
    ? (() => {
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(selectedWeek.start);
          d.setDate(selectedWeek.start.getDate() + i);
          const k = formatDateKey(d);
          const acts = activities[k] || [];
          return acts.filter((a) => a.activity.toLowerCase().includes('visit')).length;
        });
        return days.reduce((s, n) => s + n, 0);
      })()
    : 0;

  return (
    <div className="bg-white border border-border rounded-lg p-4 shadow-sm flex gap-4">
      <div className="w-56 border-r pr-3">
        <div className="text-sm font-semibold mb-3">Weeks</div>
        <div className="space-y-2">
          {weeks.map((w, idx) => (
            <button
              key={w.key}
              onClick={() => setSelectedWeekIndex(idx)}
              className={cn(
                "w-full text-left p-2 rounded-md transition-colors",
                idx === selectedWeekIndex ? "bg-green-50 border border-green-200" : "hover:bg-gray-50"
              )}
            >
              <div className="text-xs font-bold">{w.label}</div>
              <div className="text-[11px] text-muted-foreground">{w.key}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-bold">Week details</h4>
            <div className="text-xs text-muted-foreground">{selectedWeek?.label} • {totalVisits} visits</div>
          </div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>

        <div className="border rounded-md p-3 bg-gray-50 min-h-[120px]">
          {selectedWeek ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(selectedWeek.start);
                d.setDate(selectedWeek.start.getDate() + i);
                const k = formatDateKey(d);
                const acts = activities[k] || [];
                const visits = acts.filter((a) => a.activity.toLowerCase().includes('visit'));
                return (
                  <div key={k} className="flex items-center justify-between p-2 bg-white border rounded">
                    <div className="text-sm">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div className="text-xs text-muted-foreground">{visits.length} visit(s)</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No week selected</div>
          )}
        </div>
      </div>
    </div>
  );
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

          const normalizedAssignments = Array.isArray(assignments)
            ? assignments
                .filter((a) => !!a && typeof a === 'object')
                .map((a: any) => ({
                  farm_id: String(a?.farm_id || '').trim(),
                  assigned_area: Number(a?.assigned_area) || 0,
                  status: normalizeAssignmentStatus(a?.status),
                }))
                .filter((a) => !!a.farm_id)
            : [];

          const byFarm = new Map<string, { farm_id: string; assigned_area: number; status: string }>();
          for (const a of normalizedAssignments) {
            const existing = byFarm.get(a.farm_id);
            if (!existing) {
              byFarm.set(a.farm_id, {
                farm_id: a.farm_id,
                assigned_area: Number(a.assigned_area) || 0,
                status: normalizeAssignmentStatus(a.status),
              });
              continue;
            }
            const nextArea = (Number(existing.assigned_area) || 0) + (Number(a.assigned_area) || 0);
            const nextStatus =
              isCompletedAssignmentStatus(existing.status) || isCompletedAssignmentStatus(a.status)
                ? 'completed'
                : isPendingAssignmentStatus(existing.status) || isPendingAssignmentStatus(a.status)
                  ? 'pending'
                  : isOverdueAssignmentStatus(existing.status) || isOverdueAssignmentStatus(a.status)
                    ? 'overdue'
                    : normalizeAssignmentStatus(existing.status);
            byFarm.set(a.farm_id, {
              farm_id: existing.farm_id,
              assigned_area: nextArea,
              status: nextStatus,
            });
          }

          for (const farm of byFarm.values()) {
            const rowKey = `${planKey}__${plan.plan_id}__${plan.block_id}__${activity.index}__${activity.activity}__${farm.farm_id}`;
            calendarByDate[dateStr].set(rowKey, {
              index: activity.index,
              activity: activity.activity,
              block_id: plan.block_id,
              plan_id: plan.plan_id,
              calander_id: planKey,
              farm_id: farm.farm_id,
              assignments: [farm],
            });
          }
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
    return {};
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

  const hasAnyPendingOnDate = (dateStr: string) => {
    const dayActs = activities[dateStr];
    const fromApi = Array.isArray(dayActs)
      ? dayActs.some((act) => Array.isArray(act.assignments) && act.assignments.some((a) => isPendingAssignmentStatus(a?.status)))
      : false;
    const fromLocal = !!pendingByDate?.[dateStr] && Object.keys(pendingByDate[dateStr]).length > 0;
    return fromApi || fromLocal;
  };

  const hasAnyOverdueOnDate = (dateStr: string) => {
    const dayActs = activities[dateStr];
    return Array.isArray(dayActs)
      ? dayActs.some((act) => Array.isArray(act.assignments) && act.assignments.some((a) => isOverdueAssignmentStatus(a?.status)))
      : false;
  };

  const isAllCompletedOnDate = (dateStr: string) => {
    const dayActs = activities[dateStr];
    if (!Array.isArray(dayActs) || dayActs.length === 0) return false;
    return dayActs.every(
      (act) => Array.isArray(act.assignments) && act.assignments.some((a) => isCompletedAssignmentStatus(a?.status))
    );
  };

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
          const dayActs = activities[dateStr];
          const hasActivity = dayActs && dayActs.length > 0;
          const hasHarvesting = Array.isArray(dayActs) && dayActs.some((a) => isHarvestActivity(a.activity));
          const hasOverdue = hasAnyOverdueOnDate(dateStr);
          const hasPending = hasAnyPendingOnDate(dateStr);
          const allCompleted = isAllCompletedOnDate(dateStr);

          let bgClass = "hover:bg-secondary";
          let textClass = "text-muted-foreground/60";

          if (hasOverdue) {
            bgClass = "bg-red-100 text-red-700 border border-red-200";
            textClass = "text-red-700";
          } else if (hasPending) {
            bgClass = "bg-orange-100 text-orange-800 border border-orange-200";
            textClass = "text-orange-800";
          } else if (allCompleted) {
            bgClass = "bg-green-600 text-white shadow-md shadow-green-200";
            textClass = "text-white";
          } else if (hasActivity) {
            bgClass = "bg-gray-100 text-gray-700";
            textClass = "text-gray-700";
          } else if (isToday) {
            bgClass = "bg-green-600 text-white shadow-md shadow-green-200";
            textClass = "text-white";
          }
          return (
            <div
              key={day}
              onClick={() => onDateClick(dateStr)}
              className="flex items-center justify-center cursor-pointer group relative"
            >
              {(isToday || hasActivity) ? (
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
  // keep Field Visit timeline on the same page — toggle it instead of navigating away
  const [showFieldVisit, setShowFieldVisit] = useState(false);
  // (if you still use useNavigate elsewhere, keep/import it at the top; otherwise it's not required)
  const [baseDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedActivityIds, setExpandedActivityIds] = useState<Record<string, boolean>>({});
  
  // New State for Assignment
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [assignmentStep, setAssignmentStep] = useState<1 | 2>(1);
  // Vehicles: Multi-select array
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  // Equipment: Map of ID -> Count (e.g. {e1: 2, e3: 1})
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({});

  const [vehiclesForAssignment, setVehiclesForAssignment] = useState<Asset[]>([]);
  const [isLoadingVehiclesForAssignment, setIsLoadingVehiclesForAssignment] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<ApiInventoryItem[]>([]);
  const [isLoadingInventoryItems, setIsLoadingInventoryItems] = useState(false);
  const [isAssigningTask, setIsAssigningTask] = useState(false);

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

  // --- Logic to Populate Sidebar Data (from API or Mock) ---
  const { pendingToday, carryForward, earlyCompletion } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = formatDateKey(today);

    const pending: SidebarTask[] = [];
    const carry: SidebarTask[] = [];
    const early: SidebarTask[] = [];

    // Parse API Data
    if (Object.keys(activitiesData).length > 0) {
      Object.entries(activitiesData).forEach(([dateStr, activities]) => {
        const activityDate = new Date(dateStr);
        activityDate.setHours(0,0,0,0);

        activities.forEach((act, idx) => {
          const totalArea = act.assignments.reduce((sum, a) => sum + (Number(a.assigned_area) || 0), 0);
          
          // Generate a detailed string for "Land" to support the complex filters
          // Format: Cluster X - Zone Y - Block Z - Field A
          // We mock this format because the API only gives `block_id` and `farm_id`
          // In a real app, you would join actual data: 
          // `Cluster ${act.cluster} - Zone ${act.zone} - Block ${act.block_id} - Field ${act.farm_id}`
          const landStr = `Cluster A - Zone 1 - Block ${act.block_id || 'Gen'} - Field ${act.farm_id}`;

          const taskItem: SidebarTask = {
            id: `${act.plan_id}-${act.index}-${idx}`,
            taskNo: `TSK-${act.index.toString().padStart(3, '0')}`,
            activity: act.activity,
            date: dateStr,
            land: landStr,
            workAllocated: parseFloat(totalArea.toFixed(2)),
            workDone: 0 // API doesn't return progress for planned tasks, so 0
          };

          if (dateStr === todayStr) {
            pending.push(taskItem);
          } else if (activityDate < today) {
            carry.push(taskItem);
          } else if (activityDate > today) {
            early.push(taskItem);
          }
        });
      });
    }

    // Note: If pending/carry/early are empty, the Sidebar component handles fallback to Dummy Data internally for demo purposes.
    return { pendingToday: pending, carryForward: carry, earlyCompletion: early };
  }, [activitiesData]);

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsAssignmentOpen(false);
    setAssignmentStep(1);
    setSelectedVehicleIds([]);
    setEquipmentCounts({});
  };

  const closeAssignmentModal = () => {
    setIsAssignmentOpen(false);
    setAssignmentStep(1);
    setSelectedVehicleIds([]);
    setEquipmentCounts({});
  };

  const isTaskPending = (task: CalendarActivity) => {
    const list = Array.isArray(task.assignments) ? task.assignments : [];
    const fromApi = list.some((a) => isPendingAssignmentStatus(a?.status));
    if (fromApi) return true;
    if (!selectedDate) return false;
    const taskKey = getTaskKey(task);
    return !!pendingByDate?.[selectedDate]?.[taskKey];
  };

  const isTaskCompleted = (task: CalendarActivity) => {
    const list = Array.isArray(task.assignments) ? task.assignments : [];
    return list.some((a) => isCompletedAssignmentStatus(a?.status));
  };

  const isTaskOverdue = (task: CalendarActivity) => {
    const list = Array.isArray(task.assignments) ? task.assignments : [];
    return list.some((a) => isOverdueAssignmentStatus(a?.status));
  };

  const isTaskAssignable = (task: CalendarActivity) => !isTaskPending(task) && !isTaskCompleted(task);

  const getInventoryItemId = (item: ApiInventoryItem): string => {
    return String(item?.id || item?.Invent_id || item?.item || '');
  };

  const fetchInventoryItems = async () => {
    setIsLoadingInventoryItems(true);
    try {
      const res = await fetch(`${BASE_URL}/inventory_management/get_inventory_items`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || 'Failed to load inventory items');
        setInventoryItems([]);
        return;
      }

      const items: ApiInventoryItem[] = Array.isArray(data?.inventory_items)
        ? data.inventory_items
        : Array.isArray((data as InventoryItemsResponse)?.inventory_items)
          ? (data as InventoryItemsResponse).inventory_items!
          : [];

      setInventoryItems(items);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load inventory items');
      setInventoryItems([]);
    } finally {
      setIsLoadingInventoryItems(false);
    }
  };

  const buildVehicleSchedule = (raw: any): Record<string, string> => {
    if (!raw) return {};
    if (!Array.isArray(raw) && typeof raw === 'object') {
      const schedule: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!k) continue;
        if (typeof v === 'string') {
          schedule[k] = v;
        } else if (v && typeof v === 'object') {
          const task = (v as any)?.activity || (v as any)?.activity_type || (v as any)?.task || (v as any)?.type;
          schedule[k] = String(task || 'Busy');
        } else {
          schedule[k] = 'Busy';
        }
      }
      return schedule;
    }
    if (Array.isArray(raw)) {
      const schedule: Record<string, string> = {};
      for (const item of raw) {
        const date = item?.date || item?.day || item?.created_at;
        if (!date) continue;
        const task = item?.activity || item?.activity_type || item?.task || item?.type;
        schedule[String(date).slice(0, 10)] = String(task || 'Busy');
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

  const getTaskKey = (task: CalendarActivity) => {
    return `${task.calander_id}__${task.plan_id}__${task.block_id}__${task.index}__${task.activity}__${task.farm_id}`;
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

  const anyAssignableSelected = selectedActivities.some((t) => {
    if (!isTaskAssignable(t)) return false;
    return !!selectedTaskKeys[getTaskKey(t)];
  });

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

  const handleAssignTasksClick = () => {
    if (!anyAssignableSelected) return;
    setAssignmentStep(1);
    setIsAssignmentOpen(true);
    fetchVehiclesForAssignment();
    fetchInventoryItems();
  };

  const toggleVehicleSelection = (vId: string) => {
    setSelectedVehicleIds(prev => 
      prev.includes(vId) ? prev.filter(id => id !== vId) : [...prev, vId]
    );
  };

  const updateEquipmentCount = (eId: string, delta: number, max?: number) => {
    setEquipmentCounts(prev => {
      const current = prev[eId] || 0;
      const boundedMax = typeof max === 'number' && Number.isFinite(max) ? Math.max(0, Math.floor(max)) : undefined;
      const rawNext = current + delta;
      const next = Math.max(0, boundedMax !== undefined ? Math.min(boundedMax, rawNext) : rawNext);
      if (next === 0) {
        const { [eId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [eId]: next };
    });
  };

  const handleConfirmAssignment = async () => {
    if (!selectedDate) return;
    if (selectedVehicleIds.length === 0) return;

    const selectedTasks = selectedActivities.filter((t) => selectedTaskKeys[getTaskKey(t)] && isTaskAssignable(t));
    if (selectedTasks.length === 0) {
      toast.error('Please select at least one task');
      return;
    }

    const assignedByFarmActivity = new Map<string, { farm_id: string; activity: string; assigned_acres: number; date: string }>();
    const assignedByCalendarFarmActivity = new Map<string, Map<string, { farm_id: string; activity: string; assigned_acres: number; date: string }>>();
    const feildIdSet = new Set<string>();

    for (const task of selectedTasks) {
      const activity = String(task?.activity || '').trim();
      const calanderId = String(task?.calander_id || '').trim();
      const assignments = Array.isArray(task.assignments) ? task.assignments : [];
      for (const a of assignments) {
        const farmId = String(a?.farm_id || '');
        if (!farmId) continue;
        feildIdSet.add(farmId);

        const acres = Number(a?.assigned_area) || 0;
        const key = `${farmId}__${activity}`;
        const existing = assignedByFarmActivity.get(key);
        if (!existing) {
          assignedByFarmActivity.set(key, { farm_id: farmId, activity: activity || 'Activity', assigned_acres: acres, date: selectedDate });
        } else {
          assignedByFarmActivity.set(key, { ...existing, assigned_acres: (Number(existing.assigned_acres) || 0) + acres });
        }

        if (calanderId) {
          const perCalendar = assignedByCalendarFarmActivity.get(calanderId) ?? new Map();
          const calKey = `${farmId}__${activity}`;
          const calExisting = perCalendar.get(calKey);
          if (!calExisting) {
            perCalendar.set(calKey, { farm_id: farmId, activity: activity || 'Activity', assigned_acres: acres, date: selectedDate });
          } else {
            perCalendar.set(calKey, { ...calExisting, assigned_acres: (Number(calExisting.assigned_acres) || 0) + acres });
          }
          assignedByCalendarFarmActivity.set(calanderId, perCalendar);
        }
      }
    }

    const feildIds = Array.from(feildIdSet);
    const assignedAcres = Array.from(assignedByFarmActivity.values());

    const vehicles = selectedVehicleIds.map((vehicleId) => {
      const v = vehiclesForAssignment.find((x) => x.id === vehicleId);
      return { vehicle_id: vehicleId, vehicle_number: v?.name || vehicleId };
    });

    const equipment = Object.entries(equipmentCounts)
      .filter(([, qty]) => (Number(qty) || 0) > 0)
      .map(([equipmentId, qty]) => {
        const item = inventoryItems.find((it) => getInventoryItemId(it) === equipmentId);
        return { equipment_id: equipmentId, equipment_name: item?.item || equipmentId, quantity: Math.max(0, Math.floor(Number(qty) || 0)) };
      });

    const payload = { feild_id: feildIds, assigned_acres: assignedAcres, vehicles, equipment };

    setIsAssigningTask(true);
    try {
      const res = await fetch(`${BASE_URL}/admin_cultivation/assign-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || 'Failed to assign task');
        return;
      }

      if (data?.success === true) {
        const updateCalls = Array.from(assignedByCalendarFarmActivity.entries()).map(async ([calanderId, map]) => {
          const updatePayload = { calander_id: calanderId, assigned_acres: Array.from(map.values()) };
          const updateRes = await fetch(`${BASE_URL}/admin_cultivation/update_task_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
          });
          if (!updateRes.ok) throw new Error('Failed to update task status');
          return await updateRes.json();
        });

        if (updateCalls.length > 0) await Promise.allSettled(updateCalls);

        setPendingByDate((prev) => {
          const current = prev[selectedDate] ?? {};
          const nextForDate: Record<string, boolean> = { ...current };
          for (const t of selectedTasks) nextForDate[getTaskKey(t)] = true;
          return { ...prev, [selectedDate]: nextForDate };
        });

        toast.success('Task assigned successfully');
        setSelectedTaskKeys({});
        setSelectedVehicleIds([]);
        setEquipmentCounts({});
        setIsAssignmentOpen(false);
      } else {
        toast.error(data?.message || 'Failed to assign task');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to assign task');
    } finally {
      setIsAssigningTask(false);
    }
  };

  const getChartDates = () => {
    if (!selectedDate) return [];
    const dates = [];
    for (let i = 0; i < 5; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  };

  const chartDates = getChartDates();

  const VehicleAvailabilityRow = ({ asset, isSelected, onSelect }: { asset: Asset, isSelected: boolean, onSelect: () => void }) => {
    const isBusyOnSelected = !!asset.schedule[selectedDate!];
    return (
      <div 
        onClick={() => !isBusyOnSelected && onSelect()}
        className={cn("grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 p-2 rounded-lg border transition-all cursor-pointer items-center group", isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : isBusyOnSelected ? "border-transparent opacity-60 cursor-not-allowed" : "border-border hover:border-primary/50")}
      >
        <div className="flex items-center gap-3 pr-2">
          <div className={cn("p-2 rounded-md border shadow-sm", isSelected ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground")}><Truck className="w-4 h-4" /></div>
          <div className="min-w-0"><div className="text-sm font-semibold truncate text-foreground">{asset.name}</div><div className="text-[10px] text-muted-foreground">{asset.type}</div></div>
        </div>
        {chartDates.map(date => {
          const taskName = asset.schedule[date];
          const isBusy = !!taskName;
          return (
            <div key={date} className="flex justify-center h-full items-center">
              {isBusy ? (
                <div className="w-full h-8 bg-red-100 border border-red-200 rounded-md flex items-center justify-center group/tooltip relative">
                  <span className="text-[10px] font-bold text-red-700">Busy</span>
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none z-10">{taskName}</div>
                </div>
              ) : (
                <div className={cn("w-full h-8 border rounded-md flex items-center justify-center transition-colors", date === selectedDate ? (isSelected ? "bg-green-600 border-green-600 text-white" : "bg-green-100 border-green-200 text-green-700") : "bg-gray-50 border-gray-100")}>
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

  const EquipmentQuantityRow = ({ item, count }: { item: ApiInventoryItem; count: number }) => {
    const id = getInventoryItemId(item);
    const title = item?.item || id || 'Item';
    const category = item?.category || 'Inventory';
    const unit = item?.unit || '';
    const maxQty = Number(item?.stock ?? 0);
    const maxSafe = Number.isFinite(maxQty) ? Math.max(0, Math.floor(maxQty)) : 0;

    return (
      <div className={cn("flex items-center justify-between p-3 rounded-lg border transition-all", count > 0 ? "border-orange-200 bg-orange-50" : "border-border hover:border-gray-300 bg-white")}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-md border shadow-sm", count > 0 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-gray-50 text-muted-foreground")}><Wrench className="w-4 h-4" /></div>
          <div><div className="text-sm font-semibold text-foreground">{title}</div><div className="text-[10px] text-muted-foreground">{category}{maxSafe > 0 ? ` • Available: ${maxSafe}${unit ? ` ${unit}` : ''}` : ' • Out of stock'}</div></div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-md border border-gray-200 p-1 shadow-sm">
          <button onClick={() => updateEquipmentCount(id, -1, maxSafe)} disabled={count === 0} className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"><Minus className="w-3 h-3" /></button>
          <span className="w-4 text-center text-sm font-bold text-foreground">{count}</span>
          <button onClick={() => updateEquipmentCount(id, 1, maxSafe)} disabled={maxSafe === 0 || count >= maxSafe} className="p-1 hover:bg-gray-100 rounded text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"><Plus className="w-3 h-3" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 min-h-screen bg-gray-50/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Cultivation Calendar</h1>
          <p className="text-muted-foreground mt-1">Manage your cultivation schedule and track pending tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFieldVisit((s) => !s)} className="px-3 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">{showFieldVisit ? 'Hide Field Visit' : 'View Field Visit'}</button>
          <button className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 bg-white border border-border px-4 py-2 rounded-lg w-fit shadow-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-600 rounded shadow-sm" /><span className="text-xs text-foreground">All Done</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded shadow-sm" /><span className="text-xs text-foreground">Pending</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-200 rounded shadow-sm" /><span className="text-xs text-foreground">Overdue</span></div>
      </div>

      {/* ✅ ADDED: Weekly Field Visit Calendar Section (inline) */}
      {!loading && !error && (
        <div className="space-y-6">
          <WeeklyFieldVisits activities={activitiesData} />
          {showFieldVisit && (
            <InlineTimeline activities={activitiesData} />
          )}
        </div>
      )}

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

      {/* --- SIDEBAR INTEGRATION --- */}
      <TaskSidebar 
        pendingToday={pendingToday} 
        carryForward={carryForward} 
        earlyCompletion={earlyCompletion}
      />

      {/* --- MODALS --- */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-muted-foreground" /><span>{new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</span></h2>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Total Tasks: <span className="font-semibold text-foreground">{selectedActivities.length}</span></span>
                  <span>•</span>
                  <span>Pending: <span className="font-semibold text-orange-600">{selectedActivities.filter((act) => isTaskPending(act)).length}</span></span>
                </div>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {/* ... Table Header and Body (Same as before) ... */}
              <div className="px-5 py-3 border-b border-border bg-gray-50 flex justify-end items-center gap-4">
                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Progress Guide:</span>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-green-500"></div>Today</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-purple-500"></div>Tom (Done)</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-gray-300"></div>Tom (Pending)</span>
                </div>
              </div>

              <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px] gap-2 px-5 py-3 border-b border-border bg-gray-50/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                <div className="flex justify-center"><input type="checkbox" className="h-4 w-4" checked={allSelected} onChange={toggleSelectAll} disabled={selectedActivities.length === 0} /></div>
                <div>Activity</div>
                <div>Farm ID</div>
                <div>Assigned Acres</div>
                <div>Status</div>
                <div></div>
              </div>

              <div className="overflow-y-auto flex-1">
                {selectedActivities.length > 0 ? (
                  <div className="divide-y divide-border">
                    {selectedActivities.map((act, idx) => {
                      const taskKey = getTaskKey(act);
                      const isExpanded = expandedActivityIds[taskKey];
                      const pendingTask = isTaskPending(act);
                      const completedTask = isTaskCompleted(act);
                      const overdueTask = !completedTask && isTaskOverdue(act);
                      const totalArea = Array.isArray(act.assignments) ? act.assignments.reduce((sum, a) => sum + (Number(a.assigned_area) || 0), 0) : 0;
                      
                      const isEven = idx % 2 === 0;
                      const percentText = isEven ? "100%" : "50%";
                      
                      return (
                        <div key={idx} className={cn("group transition-colors", completedTask ? "bg-green-50 hover:bg-green-50/80" : overdueTask ? "bg-red-50 hover:bg-red-50/80" : "bg-white hover:bg-gray-50/50")}>
                          <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_40px] gap-2 px-5 py-4 items-center">
                            <div className="flex justify-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer" checked={!!selectedTaskKeys[taskKey]} disabled={pendingTask || completedTask} onChange={(e) => { setSelectedTaskKeys((prev) => ({ ...prev, [taskKey]: e.target.checked })); }} /></div>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-gray-100 border border-gray-200 text-gray-500 shrink-0">{getActivityIcon(act.activity)}</div>
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground truncate">{act.activity}</span>
                                {pendingTask && <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">Pending</span>}
                                {overdueTask && <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Overdue</span>}
                                {completedTask && <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Done</span>}
                              </div>
                            </div>
                            <div><span className={cn("inline-flex items-center px-2 py-1 rounded text-[11px] font-bold border", completedTask ? "bg-green-100 text-green-800 border-green-200" : overdueTask ? "bg-red-100 text-red-800 border-red-200" : "bg-gray-50 text-gray-700 border-gray-200")}>{act.farm_id || '—'}</span></div>
                            <div className="text-sm font-medium text-foreground">{totalArea.toFixed(2)} <span className="text-xs text-muted-foreground">Acres</span></div>
                            <div className="pr-4 flex items-center gap-3">
                              {completedTask ? <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold bg-green-100 text-green-800 border border-green-200">Done</span> : (
                                <>
                                  <div className="flex-1"><div className="flex h-3 w-full rounded-sm overflow-hidden bg-gray-200 border border-gray-300 shadow-sm relative"><div className="h-full w-1/2 bg-green-500 border-r border-white/30 flex items-center justify-center"><span className="text-[7px] font-bold text-white leading-none">50%</span></div><div className={cn("h-full w-1/2 transition-colors flex items-center justify-center", isEven ? "bg-purple-500" : "bg-gray-300")}><span className={cn("text-[7px] font-bold leading-none", isEven ? "text-white" : "text-gray-500")}>{isEven ? "50%" : "0%"}</span></div></div></div>
                                  <span className={cn("text-[9px] font-bold min-w-[35px]", isEven ? "text-green-600" : "text-orange-600")}>{percentText}</span>
                                </>
                              )}
                            </div>
                            <div className="flex justify-center"><button onClick={() => toggleActivityExpansion(taskKey)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors">{isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</button></div>
                          </div>
                          {isExpanded && Array.isArray(act.assignments) && act.assignments.length > 0 && (
                            <div className="bg-gray-50/80 border-t border-border px-5 py-3 shadow-inner">
                              <div className="grid grid-cols-2 gap-4">
                                <div><h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Field Assignments</h4><div className="bg-white border border-border rounded-md divide-y divide-border">{act.assignments.map((a, aIdx) => (<div key={`${a.farm_id}-${aIdx}`} className="flex justify-between px-3 py-2 text-xs items-center gap-2"><span className="font-mono text-gray-600 truncate">{a.farm_id}</span><div className="flex items-center gap-2 shrink-0">{isPendingAssignmentStatus(a?.status) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">Pending</span>}{isOverdueAssignmentStatus(a?.status) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Overdue</span>}{isCompletedAssignmentStatus(a?.status) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">Done</span>}<span className="font-medium text-gray-900">{Number(a.assigned_area).toFixed(2)} Ac</span></div></div>))}</div></div>
                                <div className="flex flex-col justify-center items-center text-center p-4 border-2 border-dashed border-gray-200 rounded-md"><Tractor className="w-6 h-6 text-gray-300 mb-1" /><p className="text-xs text-muted-foreground">Vehicle assignment pending</p></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8"><ClipboardList className="w-10 h-10 mb-2 opacity-20" /><p className="text-sm">No scheduled activities for this date.</p></div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border bg-white flex justify-between items-center shrink-0">
              <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{allSelectedKeys.filter((k) => !!selectedTaskKeys[k]).length}</span> tasks selected</div>
              <div className="flex gap-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">Cancel</button>
                {anyAssignableSelected ? <button type="button" onClick={handleAssignTasksClick} className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-green-800 hover:bg-green-900 text-white">Assign Task</button> : <span className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-orange-100 text-orange-800 border border-orange-200">Pending</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGNMENT MODAL (Overlay) --- */}
      {isAssignmentOpen && selectedDate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assign Resources</h3>
                <p className="text-sm text-muted-foreground">Step {assignmentStep} of 2 • {assignmentStep === 1 ? 'Vehicle allocation' : 'Equipment selection'} • {new Date(selectedDate).toDateString()}</p>
              </div>
              <button onClick={closeAssignmentModal} className="p-1 hover:bg-muted rounded-md"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-8">
              {assignmentStep === 1 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2"><Truck className="w-4 h-4" /> Select Vehicles</h4>
                    {selectedVehicleIds.length > 0 && <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">{selectedVehicleIds.length} Selected</span>}
                  </div>
                  <div className="overflow-x-auto bg-white rounded-lg border border-border shadow-sm p-4">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-[1.5fr_repeat(5,1fr)] gap-2 mb-4 text-xs font-semibold text-muted-foreground">
                        <div className="self-end pb-2">Vehicle Name</div>
                        {chartDates.map(date => <div key={date} className={cn("text-center pb-2 border-b-2", date === selectedDate ? "border-primary text-primary" : "border-transparent")}><div className="text-[10px] uppercase">{getDayName(date)}</div><div>{getDayNum(date)}</div></div>)}
                      </div>
                      <div className="space-y-2">
                        {isLoadingVehiclesForAssignment ? <div className="p-4 text-sm text-muted-foreground">Loading vehicles…</div> : vehiclesForAssignment.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No vehicles found.</div> : vehiclesForAssignment.map(vehicle => <VehicleAvailabilityRow key={vehicle.id} asset={vehicle} isSelected={selectedVehicleIds.includes(vehicle.id)} onSelect={() => toggleVehicleSelection(vehicle.id)} />)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2"><Wrench className="w-4 h-4" /> Select Equipment</h4>
                    {Object.values(equipmentCounts).reduce((a,b)=>a+b,0) > 0 && <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded-full border border-orange-200"><Hash className="w-3 h-3" />{Object.values(equipmentCounts).reduce((a,b)=>a+b,0)} Total</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">Vehicles allocated: <span className="font-semibold text-foreground">{selectedVehicleIds.length}</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {isLoadingInventoryItems ? <div className="col-span-full p-4 text-sm text-muted-foreground">Loading inventory items…</div> : inventoryItems.length === 0 ? <div className="col-span-full p-4 text-sm text-muted-foreground">No inventory items found.</div> : inventoryItems.filter((it) => !!getInventoryItemId(it)).map((it) => { const id = getInventoryItemId(it); return <EquipmentQuantityRow key={id} item={it} count={equipmentCounts[id] || 0} />; })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-white flex justify-between items-center">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded-sm"></div> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> Busy</div>
              </div>
              <div className="flex gap-2">
                <button onClick={closeAssignmentModal} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">Cancel</button>
                {assignmentStep === 2 && <button type="button" onClick={() => setAssignmentStep(1)} className="px-4 py-2 text-sm font-medium border rounded-md bg-white hover:bg-muted transition-colors">Back</button>}
                {assignmentStep === 1 ? <button type="button" onClick={() => setAssignmentStep(2)} disabled={selectedVehicleIds.length === 0} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", selectedVehicleIds.length > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed")}>Next</button> : <button onClick={handleConfirmAssignment} disabled={isAssigningTask} className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90">{isAssigningTask ? 'Assigning…' : 'Confirm Assignment'}</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CultivationCalendar;