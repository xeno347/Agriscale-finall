import { useState } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  subWeeks 
} from 'date-fns';
import { 
  Tractor, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  X, 
  FileText, 
  Filter, 
  Ruler, 
  Database, 
  PieChart 
} from 'lucide-react';
import { cn } from '@/lib/utils';
// If you don't have a progress component, you can replace this import 
// with a simple <progress> HTML tag or keep reading below for the inline style.
// import { Progress } from '@/components/ui/progress'; 

// ----------------------------------------------------------------------
// 1. TYPES & INTERFACES
// ----------------------------------------------------------------------

export interface FieldVisit {
  fieldId: string;
  location: string;
  acres: number;
  lastVisitDate: string;
  latestVisitDate: string;
  dataCollected: string[];
  status: 'completed' | 'pending';
}

export interface WeekData {
  weekId: string;
  startDate: Date;
  endDate: Date;
  totalFields: number;
  visitedFields: number;
  pendingFields: number;
  status: 'completed' | 'in-progress' | 'pending';
  fieldVisits: FieldVisit[];
}

// ----------------------------------------------------------------------
// 2. MOCK DATA GENERATOR
// ----------------------------------------------------------------------

const generateWeekData = (): WeekData[] => {
  const weeks: WeekData[] = [];
  const today = new Date();
  
  for (let i = 0; i < 16; i++) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
    
    const totalFields = Math.floor(Math.random() * 8) + 3;
    const visitedFields = i === 0 
      ? Math.floor(Math.random() * totalFields) 
      : i < 3 
        ? Math.floor(Math.random() * (totalFields - 1)) + 1
        : totalFields;
    const pendingFields = totalFields - visitedFields;
    
    const status = visitedFields === totalFields 
      ? 'completed' 
      : visitedFields > 0 
        ? 'in-progress' 
        : 'pending';
    
    const fieldVisits = Array.from({ length: totalFields }, (_, idx) => {
      const isVisited = idx < visitedFields;
      return {
        fieldId: `FLD-${format(weekStart, 'yyyyMMdd')}-${String(idx + 1).padStart(3, '0')}`,
        location: [
          '123 Harvest Lane, Greenfield County',
          '456 Meadow Road, Springfield Valley',
          '789 Oak Grove Farm, Riverside District',
          '321 Sunny Acres, Hillside Township',
          '654 Golden Wheat Drive, Farmington',
          '987 Prairie View, Countryside Estate',
          '147 Orchard Path, Fruitvale Region',
          '258 Cornfield Street, Agrarian Hills',
        ][idx % 8],
        acres: Math.floor(Math.random() * 150) + 20,
        lastVisitDate: format(subWeeks(weekStart, 4), 'MMM dd, yyyy'),
        latestVisitDate: isVisited ? format(weekStart, 'MMM dd, yyyy') : '-',
        dataCollected: isVisited 
          ? ['Soil moisture', 'Crop health', 'Pest inspection', 'Growth stage'].slice(0, Math.floor(Math.random() * 4) + 1)
          : [],
        status: (isVisited ? 'completed' : 'pending') as 'completed' | 'pending',
      };
    });
    
    weeks.push({
      weekId: `week-${i}`,
      startDate: weekStart,
      endDate: weekEnd,
      totalFields,
      visitedFields,
      pendingFields,
      status,
      fieldVisits,
    });
  }
  
  return weeks;
};

const mockWeekData = generateWeekData();

// ----------------------------------------------------------------------
// 3. SUB-COMPONENTS
// ----------------------------------------------------------------------

// --- 3a. FieldVisitRow (Individual Detail Item) ---
const FieldVisitRow = ({ visit }: { visit: FieldVisit }) => {
  const isCompleted = visit.status === 'completed';
  
  return (
    <div className={cn("p-4 rounded-lg border bg-card transition-all duration-200 animate-in fade-in slide-in-from-right-4", "hover:shadow-md hover:border-primary/20")}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-secondary text-secondary-foreground">{visit.fieldId}</span>
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
            {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isCompleted ? 'Completed' : 'Pending'}
          </div>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-foreground">{visit.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground">{visit.acres} acres</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last: </span>
            <span className="text-foreground">{visit.lastVisitDate}</span>
          </div>
          {isCompleted && (
            <>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-medium">{visit.latestVisitDate}</span>
            </>
          )}
        </div>
        
        {visit.dataCollected.length > 0 && (
          <div className="flex items-start gap-2 pt-2 border-t border-border mt-2">
            <Database className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {visit.dataCollected.map((data, idx) => (
                <span key={idx} className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-secondary-foreground font-medium border border-border">
                  {data}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 3b. DetailPanel (Right Side Panel) ---
const DetailPanel = ({ week, onClose }: { week: WeekData | null; onClose: () => void }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  const filteredVisits = week?.fieldVisits.filter(visit => {
    if (filter === 'all') return true;
    return visit.status === filter;
  }) ?? [];
  
  return (
    <div className="h-full flex flex-col bg-white border-l border-border shadow-2xl">
      <div className="p-5 border-b border-border bg-gray-50/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary"/>
            Visit Details
          </h2>
          {week && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {week ? (
          <>
            <p className="text-xs font-medium text-muted-foreground mb-4 bg-white border border-gray-200 px-3 py-2 rounded-md inline-block">
              Week of {format(week.startDate, 'MMM dd')} - {format(week.endDate, 'MMM dd, yyyy')}
            </p>
            <div className="flex p-1 bg-gray-200/50 rounded-lg">
              {(['all', 'completed', 'pending'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all",
                    filter === f ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="h-8" />
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
        {!week ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-medium text-foreground">No Selection</h3>
            <p className="text-xs text-muted-foreground mt-1">Select a week to view details</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
            <Filter className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-base font-medium text-foreground">No Results</h3>
            <p className="text-xs text-muted-foreground mt-1">No {filter} visits found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVisits.map((visit) => (
              <FieldVisitRow key={visit.fieldId} visit={visit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 3c. WeekCard (Individual List Item) ---
const WeekCard = ({ week, isSelected, onSelect, isCurrent }: { week: WeekData; isSelected: boolean; onSelect: () => void; isCurrent: boolean }) => {
  const progressPercentage = (week.visitedFields / week.totalFields) * 100;
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-5 rounded-xl border bg-card text-left transition-all duration-200 group relative",
        "hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5",
        isSelected ? "border-primary shadow-lg ring-1 ring-primary/20 bg-primary/5" : "border-border shadow-sm"
      )}
    >
      {isCurrent && (
        <span className="absolute -top-2 right-4 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-blue-600 text-white shadow-sm">
          Current Week
        </span>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
          <span className="text-sm font-semibold text-foreground">
            {format(week.startDate, 'MMM dd')} - {format(week.endDate, 'MMM dd, yyyy')}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gray-100"><MapPin className="w-4 h-4 text-gray-600" /></div>
          <div>
            <p className="text-xl font-bold text-foreground">{week.totalFields}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
          <div>
            <p className="text-xl font-bold text-green-700">{week.visitedFields}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Done</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-yellow-100"><Clock className="w-4 h-4 text-yellow-600" /></div>
          <div>
            <p className="text-xl font-bold text-yellow-700">{week.pendingFields}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Completion Rate</span>
          <span className="font-bold text-foreground">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>
      </div>
      
      <div className={cn("flex items-center justify-end mt-4 text-xs font-medium text-primary opacity-0 transition-opacity", (isSelected || "group-hover:opacity-100"))}>
        <span>View Details</span>
        <ChevronRight className="w-3 h-3 ml-1" />
      </div>
    </button>
  );
};

// --- 3d. WeekList (Main List Container) ---
const WeekList = ({ weeks, selectedWeekId, onWeekSelect }: { weeks: WeekData[]; selectedWeekId: string | null; onWeekSelect: (id: string) => void }) => {
  return (
    <div className="h-full flex flex-col bg-gray-50/30">
      <div className="p-6 border-b border-border bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Tractor className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Field Visit Calendar</h1>
            <p className="text-sm text-muted-foreground">Track weekly inspection progress</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="space-y-4 max-w-3xl mx-auto">
          {weeks.map((week, index) => (
            <WeekCard 
              key={week.weekId} 
              week={week} 
              isSelected={selectedWeekId === week.weekId} 
              onSelect={() => onWeekSelect(week.weekId)} 
              isCurrent={index === 0} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 3e. Timeline (Left Navigation) ---
const Timeline = ({ weeks, selectedWeekId, onWeekSelect }: { weeks: WeekData[]; selectedWeekId: string | null; onWeekSelect: (id: string) => void }) => {
  return (
    <div className="h-full overflow-y-auto py-6 flex flex-col items-start bg-gray-50/50 px-4">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
        Timeline
      </div>

      <div className="relative flex-1 w-full">
        {/* vertical line */}
        <div className="absolute top-16 bottom-16 left-8 w-px bg-border" />

        <div className="flex flex-col gap-6 pl-10 pr-2">
          {weeks.map((week, idx) => {
            const isSelected = selectedWeekId === week.weekId;
            const isCurrent = idx === 0;
            return (
              <div key={week.weekId} className="flex items-center gap-3">
                {/* dot */}
                <button
                  onClick={() => onWeekSelect(week.weekId)}
                  className={cn(
                    "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-transform focus:outline-none",
                    isSelected ? "bg-primary border-2 border-white shadow-md scale-110" : "bg-white border-2 border-muted-foreground/40"
                  )}
                  aria-pressed={isSelected}
                />

                {/* label */}
                <div className={cn("flex-1 flex items-center justify-between min-w-0", isSelected ? "" : "opacity-80") }>
                  <div className="min-w-0">
                    <div className={cn("text-sm font-semibold truncate", isSelected ? "text-foreground" : "text-muted-foreground")}>{format(week.startDate, 'MMM dd')} - {format(week.endDate, 'MMM dd')}</div>
                    <div className="text-[11px] text-muted-foreground/70">{week.totalFields} total • {week.visitedFields} done</div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    {isCurrent && <span className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Current</span>}
                    <div className="text-[12px] text-muted-foreground">{Math.round((week.visitedFields / Math.max(1, week.totalFields)) * 100)}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT
// ----------------------------------------------------------------------

const FieldVisits = () => {
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  
  const selectedWeek = mockWeekData.find(w => w.weekId === selectedWeekId) ?? null;
  
  const handleWeekSelect = (weekId: string) => {
    setSelectedWeekId(prev => prev === weekId ? null : weekId);
  };
  
  return (
    <div className="h-screen w-full flex bg-background overflow-hidden border-t">
      {/* 1. Timeline Navigation */}
      <aside className="w-[260px] flex-shrink-0 border-r border-border shadow-inner z-20 hidden md:flex flex-col bg-white">
        <div className="px-6 py-6 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
          <p className="text-xs text-muted-foreground mt-1">Weekly overview</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Timeline 
            weeks={mockWeekData} 
            selectedWeekId={selectedWeekId} 
            onWeekSelect={handleWeekSelect} 
          />
        </div>
      </aside>
      
      {/* 2. Main List Area */}
      <main className="flex-1 min-w-0 bg-background relative z-10">
        <WeekList 
          weeks={mockWeekData} 
          selectedWeekId={selectedWeekId} 
          onWeekSelect={handleWeekSelect} 
        />
      </main>
      
      {/* 3. Detail Panel (Collapsible) */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-full sm:w-96 transform transition-transform duration-300 ease-in-out shadow-2xl
        md:relative md:translate-x-0 md:shadow-none md:w-[450px] flex-shrink-0 border-l
        ${selectedWeekId ? 'translate-x-0' : 'translate-x-full md:hidden'}
      `}>
        <DetailPanel 
          week={selectedWeek} 
          onClose={() => setSelectedWeekId(null)} 
        />
      </aside>
    </div>
  );
};

export default FieldVisits;
