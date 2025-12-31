import { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Clock, 
  MapPin, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  History,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';

// --- Types ---
interface ApiActivity {
  index: number;
  activity: string;
  date: string[];
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

interface CalendarActivity {
  activity: string;
  block_id: string;
  plan_id: string;
}

interface CalendarData {
  [date: string]: CalendarActivity[];
}

// --- Helper Functions ---
const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// --- API Fetch ---
const BASE_URL = getBaseUrl();

const fetchCalendarData = async (): Promise<CalendarData> => {
  const url = `${BASE_URL}/admin_cultivation/fetch_cultivation_calander`;
  console.log('[CultivationCalendar] Fetching URL:', url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch calendar data');
    const data: ApiResponse = await res.json();
    const calendar: CalendarData = {};
    for (const planKey in data.plan) {
      const plan = data.plan[planKey];
      plan.date_mapping.forEach((activity) => {
        activity.date.forEach((dateStr) => {
          if (!calendar[dateStr]) calendar[dateStr] = [];
          calendar[dateStr].push({
            activity: activity.activity,
            block_id: plan.block_id,
            plan_id: plan.plan_id,
          });
        });
      });
    }
    return calendar;
  } catch (err) {
    console.error('[CultivationCalendar] Fetch error:', err);
    throw err;
  }
};


// --- Single Month Component ---
const MonthCard = ({
  monthDate,
  activities,
  onDateClick,
  currentDateKey
}: {
  monthDate: Date;
  activities: CalendarData;
  onDateClick: (dateStr: string) => void;
  currentDateKey: string;
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
  const [activitiesData, setActivitiesData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDateKey = formatDateKey(new Date());
  const monthsToDisplay = Array.from({ length: 12 }, (_, i) => new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1));

  useEffect(() => {
    setLoading(true);
    fetchCalendarData()
      .then((data) => {
        setActivitiesData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load calendar data');
        setLoading(false);
      });
  }, []);

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Modal content: show all activities for selected date with block_id
  const selectedActivities = selectedDate && activitiesData[selectedDate] ? activitiesData[selectedDate] : [];

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

      {/* Loading/Error State */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <span className="text-muted-foreground">Loading calendar...</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-32">
          <span className="text-red-600">{error}</span>
        </div>
      )}

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
                    <li key={idx} className="p-3 rounded-lg border shadow-sm bg-white">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{act.activity}</span>
                        <span className="ml-auto text-xs text-muted-foreground">Block ID: <span className="font-mono">{act.block_id}</span></span>
                      </div>
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
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CultivationCalendar;