import { useState, useMemo } from 'react';
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

// --- Types ---
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Status = 'pending' | 'done';

interface Activity {
  id: string;
  title: string;
  time: string;
  location: string;
  type: 'sowing' | 'irrigation' | 'fertilizer' | 'harvest' | 'maintenance';
  priority: Priority;
  status: Status;
  originalDateKey?: string; 
}

interface CalendarData {
  [date: string]: Activity[]; 
}

interface GroupedActivities {
  previous: Activity[];
  selected: Activity[];
}

// --- Helper Functions ---
const formatDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// --- Dynamic Data Generation ---
const generateMockData = (): CalendarData => {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const data: CalendarData = {
    // PREVIOUS
    [formatDateKey(twoDaysAgo)]: [
      { id: 'p1', title: 'Soil Preparation', time: '08:00 AM', location: 'Plot C-1', type: 'maintenance', priority: 'medium', status: 'done' }
    ],
    [formatDateKey(yesterday)]: [
      { id: 'y1', title: 'Drip Irrigation Check', time: '10:00 AM', location: 'Greenhouse 2', type: 'irrigation', priority: 'critical', status: 'pending' },
      { id: 'y3', title: 'Seed Treatment', time: '02:00 PM', location: 'Lab', type: 'sowing', priority: 'high', status: 'pending' },
    ],
    
    // FUTURE
    [formatDateKey(tomorrow)]: [
      { id: 'f1', title: 'Sapling Inspection', time: '09:00 AM', location: 'Nursery', type: 'maintenance', priority: 'low', status: 'pending' }
    ]
  };

  // --- GENERATE 100+ TASKS FOR TODAY ---
  const todayKey = formatDateKey(today);
  const todayTasks: Activity[] = [];
  
  // 1. Add a few static critical ones first
  todayTasks.push(
    { id: 't-static-1', title: 'Sowing Wheat Variety 4', time: '06:00 AM', location: 'Field A', type: 'sowing', priority: 'high', status: 'pending' },
    { id: 't-static-2', title: 'NPK Fertilizer App', time: '07:30 AM', location: 'Field B', type: 'fertilizer', priority: 'medium', status: 'pending' }
  );

  // 2. Generate 100+ dummy tasks
  const locations = ['Field A', 'Field B', 'Greenhouse 1', 'Nursery', 'Lab', 'Storage Unit', 'Sector 7'];
  const types: Activity['type'][] = ['irrigation', 'maintenance', 'fertilizer', 'sowing'];
  const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

  for (let i = 1; i <= 105; i++) {
    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomPrio = priorities[Math.floor(Math.random() * priorities.length)];
    const hour = 8 + Math.floor(i / 10); // Spread across hours
    const minute = (i * 5) % 60;
    
    todayTasks.push({
      id: `t-auto-${i}`,
      title: `${randomType.charAt(0).toUpperCase() + randomType.slice(1)} Check - Batch ${i}`,
      time: `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,
      location: randomLoc,
      type: randomType,
      priority: randomPrio,
      status: 'pending'
    });
  }

  data[todayKey] = todayTasks;

  return data;
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
          const hasPending = dayActs?.some(a => a.status === 'pending');
          
          let bgClass = "hover:bg-secondary";
          let textClass = "text-muted-foreground/60";
          
          if (isToday) {
             bgClass = "bg-green-600 text-white shadow-md shadow-green-200";
             textClass = "text-white";
          } else if (isPast && hasPending) {
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
              {(isToday || (isPast && hasPending) || hasActivity) ? (
                <div className={cn(
                  "w-8 h-8 rounded-md flex flex-col items-center justify-center transition-all shadow-sm relative",
                  bgClass
                )}>
                  <span className={cn("text-xs font-medium leading-none", isToday && "font-bold")}>{day}</span>
                  {!isToday && isPast && hasPending && (
                    <span className="text-[6px] leading-tight mt-0.5 opacity-90 font-medium">Pending</span>
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
  
  const [activitiesData, setActivitiesData] = useState<CalendarData>(generateMockData());

  const currentDateKey = formatDateKey(new Date());
  const monthsToDisplay = Array.from({ length: 12 }, (_, i) => new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1));

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handlePriorityChange = (id: string, newPriority: Priority, dateKey: string) => {
    setActivitiesData(prev => {
      const updatedList = prev[dateKey].map(item => 
        item.id === id ? { ...item, priority: newPriority } : item
      );
      return { ...prev, [dateKey]: updatedList };
    });
  };

  // --- Logic: Group Activities ---
  const groupedActivities: GroupedActivities = useMemo(() => {
    if (!selectedDate) return { previous: [], selected: [] };

    const groups: GroupedActivities = { previous: [], selected: [] };
    const allDates = Object.keys(activitiesData).sort();
    
    // Check if selected date is today
    const isSelectedToday = selectedDate === currentDateKey;

    // 1. SELECTED DATE TASKS
    if (activitiesData[selectedDate]) {
      groups.selected = activitiesData[selectedDate].map(a => ({ ...a, originalDateKey: selectedDate }));
    }

    // 2. PREVIOUS / OVERDUE TASKS
    // Logic: If looking at TODAY, show all past overdue items in the left column.
    // If looking at a PAST date, we typically just show that date's rolled over items in the main view
    // (User said "pop should not show present day task", implying don't show today's tasks when looking at past)
    
    if (isSelectedToday) {
      const selectedTime = new Date(selectedDate).getTime();
      allDates.forEach(dateKey => {
        const dateTime = new Date(dateKey).getTime();
        if (dateTime < selectedTime) {
          const pendingItems = activitiesData[dateKey]
            .filter(a => a.status === 'pending')
            .map(a => ({ ...a, originalDateKey: dateKey }));
          groups.previous.push(...pendingItems);
        }
      });
    }

    return groups;
  }, [selectedDate, activitiesData, currentDateKey]);

  // Reusable Activity List Item Component
  const ActivityItem = ({ act }: { act: Activity }) => (
    <div 
      className={cn(
        "p-3 rounded-lg border shadow-sm transition-all hover:shadow-md bg-white",
        act.status === 'done' && "opacity-60 bg-gray-50"
      )}
    >
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-start gap-2 flex-1">
           {/* Show alert icon if date key is different (meaning it's from a previous day) */}
           {act.originalDateKey && act.originalDateKey < (selectedDate || '') && (
               <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
           )}
           <div>
             <h4 className={cn("font-semibold text-sm text-foreground", act.status === 'done' && "line-through opacity-70")}>
               {act.title}
             </h4>
             {act.originalDateKey && act.originalDateKey !== selectedDate && (
               <p className="text-[10px] text-muted-foreground font-medium">
                 From: {act.originalDateKey}
               </p>
             )}
           </div>
        </div>

        {act.status !== 'done' ? (
          <div className="relative">
            <select
              value={act.priority}
              onChange={(e) => act.originalDateKey && handlePriorityChange(act.id, e.target.value as Priority, act.originalDateKey)}
              className={cn(
                "appearance-none text-[10px] font-bold uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors",
                act.priority === 'critical' ? "bg-red-100 text-red-700 border-red-200 focus:ring-red-500" :
                act.priority === 'high' ? "bg-orange-100 text-orange-700 border-orange-200 focus:ring-orange-500" :
                act.priority === 'medium' ? "bg-blue-100 text-blue-700 border-blue-200 focus:ring-blue-500" :
                "bg-green-100 text-green-700 border-green-200 focus:ring-green-500"
              )}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        ) : (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 uppercase">
            {act.priority}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-dashed border-gray-200 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {act.time}
          </span>
        </div>
        
        <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            act.status === 'done' ? "text-green-600" : "text-amber-600"
          )}>
            {act.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span className="capitalize">{act.status}</span>
        </div>
      </div>
    </div>
  );

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

      {/* --- ACTIVITY MODAL --- */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-4xl rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  {selectedDate === currentDateKey && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Today</span>}
                </h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Content */}
            <div className="p-4 overflow-y-auto bg-gray-50/50 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                
                {/* COLUMN 1: PREVIOUS (Only visible if Today) */}
                {selectedDate === currentDateKey && (
                  <div className="flex flex-col h-full animate-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-2 mb-3 text-red-600 pb-2 border-b border-red-100">
                      <History className="w-4 h-4" />
                      <h3 className="text-sm font-bold">Previous / Pending</h3>
                      <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {groupedActivities.previous.length}
                      </span>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {groupedActivities.previous.length > 0 ? (
                        groupedActivities.previous.map(act => (
                          <ActivityItem key={act.id} act={act} />
                        ))
                      ) : (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-white/50">
                          <p className="text-xs text-muted-foreground">No pending activities.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* COLUMN 2: SELECTED DATE TASKS */}
                {/* If selecting a past date, this column takes full width or remains as primary focus */}
                <div className={cn(
                  "flex flex-col h-full animate-in slide-in-from-left-2 duration-300 delay-75",
                  selectedDate !== currentDateKey && "col-span-1 md:col-span-2"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 mb-3 pb-2 border-b",
                    selectedDate === currentDateKey ? "text-green-700 border-green-100" : "text-gray-700 border-gray-200"
                  )}>
                    <CalendarDays className="w-4 h-4" />
                    <h3 className="text-sm font-bold">
                      {selectedDate === currentDateKey ? "Present (Today)" : `Scheduled for ${selectedDate}`}
                    </h3>
                    <span className={cn(
                      "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
                      selectedDate === currentDateKey ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {groupedActivities.selected.length}
                    </span>
                  </div>
                  
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                    {groupedActivities.selected.length > 0 ? (
                      groupedActivities.selected.map(act => (
                        <ActivityItem key={act.id} act={act} />
                      ))
                    ) : (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-white/50">
                        <p className="text-xs text-muted-foreground">No activities found.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
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