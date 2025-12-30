import { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Clock, 
  MapPin, 
  Sprout, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Filter
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
  type: 'harvest' | 'maintenance' | 'planting' | 'logistics';
  color: 'orange' | 'red'; 
  priority: Priority;
  status: Status;
  isOverdue?: boolean; // Helper flag for UI
}

interface CalendarData {
  [date: string]: Activity[]; 
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

  return {
    // Past Data
    [formatDateKey(twoDaysAgo)]: [
      { id: 'p1', title: 'Soil pH Test', time: '09:00 AM', location: 'Sector A', type: 'maintenance', color: 'red', priority: 'medium', status: 'done' }
    ],
    // Yesterday (Pending items roll over)
    [formatDateKey(yesterday)]: [
      { id: 'y1', title: 'Machine Maintenance', time: '10:00 AM', location: 'Barn 3', type: 'maintenance', color: 'red', priority: 'critical', status: 'pending' },
      { id: 'y3', title: 'Worker Safety Brief', time: '08:00 AM', location: 'Office', type: 'maintenance', color: 'red', priority: 'medium', status: 'pending' },
    ],
    // Today
    [formatDateKey(today)]: [
      { id: 't1', title: 'Wheat Harvest', time: '06:00 AM', location: 'Field A', type: 'harvest', color: 'orange', priority: 'high', status: 'pending' },
      { id: 't2', title: 'Quality Check', time: '11:00 AM', location: 'Processing Unit', type: 'harvest', color: 'orange', priority: 'medium', status: 'pending' }
    ],
    // Future
    [formatDateKey(tomorrow)]: [
      { id: 'f1', title: 'Logistics Pickup', time: '01:00 PM', location: 'Warehouse', type: 'logistics', color: 'red', priority: 'medium', status: 'pending' }
    ]
  };
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
          const isToday = dateStr === currentDateKey;
          const dayActs = activities[dateStr];
          const hasActivity = dayActs && dayActs.length > 0;
          
          const activityColor = hasActivity ? dayActs[0].color : null;
          // Check if any pending items exist for the red dot
          const hasPending = dayActs?.some(a => a.status === 'pending');

          return (
            <div 
              key={day} 
              onClick={() => onDateClick(dateStr)}
              className="flex items-center justify-center cursor-pointer group relative"
            >
              {hasActivity ? (
                <div className={cn(
                  "w-8 h-8 rounded-md flex flex-col items-center justify-center transition-all shadow-sm relative",
                  activityColor === 'orange' ? "bg-orange-500 text-white" : "bg-red-100 text-red-600 border border-red-200",
                  isToday && "ring-2 ring-primary ring-offset-1"
                )}>
                  <span className="text-xs font-medium leading-none">{day}</span>
                  {activityColor === 'red' && <span className="text-[6px] leading-tight mt-0.5 opacity-80 font-medium">Block..</span>}
                  
                  {/* Status Dot for pending items */}
                  {hasPending && (
                     <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
              ) : (
                <span className={cn(
                  "text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary rounded-full w-7 h-7 flex items-center justify-center transition-colors",
                  isToday && "bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
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
const HarvestCalendar = () => {
  const [baseDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State to hold activities so we can update them interactively
  const [activitiesData, setActivitiesData] = useState<CalendarData>(generateMockData());

  const currentDateKey = formatDateKey(new Date());
  const monthsToDisplay = Array.from({ length: 12 }, (_, i) => new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1));

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Handle Priority Change from Dropdown
  const handlePriorityChange = (id: string, newPriority: Priority, dateKey: string) => {
    setActivitiesData(prev => {
      const updatedList = prev[dateKey].map(item => 
        item.id === id ? { ...item, priority: newPriority } : item
      );
      return { ...prev, [dateKey]: updatedList };
    });
  };

  // Logic: Get Activities for Popup
  const displayedActivities = useMemo(() => {
    if (!selectedDate) return [];

    let currentActs = activitiesData[selectedDate] 
      ? activitiesData[selectedDate].map(a => ({...a, dateKey: selectedDate})) 
      : [];

    // IF TODAY: Combine with past pending items
    if (selectedDate === currentDateKey) {
      const allDates = Object.keys(activitiesData);
      allDates.forEach(dateKey => {
        if (dateKey < currentDateKey) {
           const pastPending = activitiesData[dateKey]
             .filter(a => a.status === 'pending')
             .map(a => ({ ...a, isOverdue: true, dateKey: dateKey })); // Keep track of original dateKey to update it later
           
           if (pastPending.length > 0) {
             currentActs = [...currentActs, ...pastPending];
           }
        }
      });
    }
    return currentActs;
  }, [selectedDate, activitiesData, currentDateKey]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300 min-h-screen bg-gray-50/50">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Harvest Calendar</h1>
          <p className="text-muted-foreground mt-1">
             Today is <span className="font-semibold text-primary">{new Date().toDateString()}</span>
          </p>
        </div>
        
        <button className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
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
          <div className="bg-background border border-border w-full max-w-lg rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(selectedDate).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  {selectedDate === currentDateKey && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Today</span>}
                </h2>
                {selectedDate === currentDateKey && (
                   <span className="text-[10px] text-muted-foreground mt-1 ml-6">Managing today's and pending tasks</span>
                )}
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub Header */}
            <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>{displayedActivities.length} Activities Found</span>
            </div>

            {/* List Content */}
            <div className="p-4 overflow-y-auto min-h-[300px] bg-gray-50/50">
              {displayedActivities.length > 0 ? (
                <div className="space-y-3">
                  {displayedActivities.map((act) => (
                    <div 
                      key={act.id} 
                      className={cn(
                        "p-3 rounded-lg border shadow-sm transition-all hover:shadow-md",
                        act.isOverdue 
                          ? "bg-red-50/40 border-red-200" 
                          : "bg-white border-border"
                      )}
                    >
                      {/* Top Row: Title & Priority Dropdown */}
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex items-start gap-2 flex-1">
                           {act.isOverdue && (
                               <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                           )}
                           <div>
                             <h4 className={cn("font-semibold text-sm text-foreground", act.status === 'done' && "line-through opacity-70")}>
                               {act.title}
                             </h4>
                             {act.isOverdue && <p className="text-[10px] text-red-500 font-medium">Pending from previous day</p>}
                           </div>
                        </div>

                        {/* PRIORITY DROPDOWN */}
                        {act.status !== 'done' ? (
                          <div className="relative">
                            <select
                              value={act.priority}
                              onChange={(e) => handlePriorityChange(act.id, e.target.value as Priority, (act as any).dateKey)}
                              className={cn(
                                "appearance-none text-[10px] font-bold uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors",
                                // Dynamic Color Styling based on selection
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
                            {/* Custom Arrow Icon for the select */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 6L0.535898 0L7.4641 0L4 6Z" fill="currentColor" className="opacity-50"/>
                              </svg>
                            </div>
                          </div>
                        ) : (
                          // Static badge if done
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 uppercase">
                            {act.priority}
                          </span>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-dashed border-gray-200 pt-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {act.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> {act.location}
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center h-full">
                  <Sprout className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-sm">No activities found for this period.</p>
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

export default HarvestCalendar;