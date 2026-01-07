import { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  AlertCircle, 
  MapPin,
  Calendar,
  CheckCircle2,
  X,
  Tractor,
  ChevronDown,
  Filter,
  Check,
  Factory, 
  Map as MapIcon, 
  LayoutGrid, 
  Hash,
  Play,
  ListChecks,
  FastForward
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types ---
export interface SidebarTask {
  id: string;
  taskNo: string;
  activity: string;
  date: string;
  land: string;       
  workDone: number;
  workAllocated: number;
}

// --- 50+ DUMMY DATA ITEMS ---
const ACTIVITIES = [
  "Sowing (Wheat)", "Fertilizer App", "Drip Irrigation", "Weeding Manual", 
  "Soil Prep", "Pest Control", "Harvesting", "Pruning", "Mulching"
];

const generateDummyTasks = (count: number, prefix: string, startDate: Date): SidebarTask[] => {
  return Array.from({ length: count }).map((_, i) => {
    const cluster = ['Alpha', 'Beta', 'Gamma'][Math.floor(Math.random() * 3)];
    const zone = Math.floor(Math.random() * 3) + 1; 
    const block = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
    const field = Math.floor(Math.random() * 20) + 1; 
    const allocated = Math.floor(Math.random() * 20) + 5;
    
    return {
      id: `${prefix}-${i}`,
      taskNo: `TSK-${(Math.floor(Math.random() * 1000) + 1000).toString()}`,
      activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
      date: new Date(startDate.getTime() + (Math.random() * 86400000 * (prefix === 'early' ? 5 : -5))).toISOString(),
      land: `Cluster ${cluster} - Zone ${zone} - Block ${block} - Field ${field.toString().padStart(2, '0')}`,
      workAllocated: allocated,
      workDone: Math.floor(Math.random() * allocated),
    };
  });
};

const DUMMY_PENDING = generateDummyTasks(25, 'pending', new Date());
const DUMMY_CARRY_FORWARD = generateDummyTasks(25, 'carry', new Date(new Date().setDate(new Date().getDate() - 2)));
const DUMMY_EARLY = generateDummyTasks(25, 'early', new Date(new Date().setDate(new Date().getDate() + 2)));

const parseLand = (landStr: string) => {
  const parts = landStr.split(' - ');
  return {
    cluster: parts[0] || '',
    zone: parts[1] || '',
    block: parts[2] || '',
    field: parts[3] || ''
  };
};

const FilterDropdown = ({ 
  label, icon: Icon, options, activeValue, onSelect, isOpen, onToggle, colorTheme 
}: { 
  label: string, icon: any, options: { label: string, value: string, count?: number }[], 
  activeValue: string | null, onSelect: (val: string | null) => void, isOpen: boolean, onToggle: () => void, colorTheme: 'orange' | 'red' | 'green'
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="relative flex-1 min-w-[45%]" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] font-semibold border transition-all",
          activeValue 
            ? (colorTheme === 'orange' ? "bg-orange-100 text-orange-800 border-orange-200" : colorTheme === 'red' ? "bg-red-100 text-red-800 border-red-200" : "bg-green-100 text-green-800 border-green-200")
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        )}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Icon className="w-3 h-3 opacity-70" />
          <span className="truncate">{activeValue || label}</span>
        </div>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1 space-y-0.5">
            <button onClick={() => { onSelect(null); onToggle(); }} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-gray-100 rounded text-gray-500 font-medium">Clear Filter</button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onSelect(opt.value); onToggle(); }}
                className={cn("w-full flex items-center justify-between px-2 py-1.5 text-[10px] rounded hover:bg-gray-50 transition-colors", activeValue === opt.value ? "bg-gray-50 font-bold text-gray-900" : "text-gray-700")}
              >
                <span className="truncate">{opt.label}</span>
                {opt.count !== undefined && <span className="text-gray-400 text-[9px] ml-1">({opt.count})</span>}
                {activeValue === opt.value && <Check className="w-3 h-3 text-green-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Draggable Sidebar Helper ---
const DraggablePanel = ({ 
  title, tasks, colorTheme, initialTop, icon: Icon, showAssign = true // ✅ Default showAssign to true
}: { 
  title: string, tasks: SidebarTask[], colorTheme: 'orange' | 'red' | 'green', initialTop: string, icon: any, showAssign?: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: initialTop });
  const [filterType, setFilterType] = useState<'cluster' | 'zone' | 'block' | 'field' | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [sortArea, setSortArea] = useState<'asc' | 'desc' | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startTop = useRef(0);

  const { uniqueClusters, uniqueZones, uniqueBlocks, uniqueFields } = useMemo(() => {
    const clusters = new Map<string, number>();
    const zones = new Map<string, number>();
    const blocks = new Map<string, number>();
    const fields = new Map<string, number>();

    tasks.forEach(t => {
      const { cluster, zone, block, field } = parseLand(t.land);
      if(cluster) clusters.set(cluster, (clusters.get(cluster) || 0) + 1);
      if(zone) zones.set(zone, (zones.get(zone) || 0) + 1);
      if(block) blocks.set(block, (blocks.get(block) || 0) + 1);
      if(field) fields.set(field, (fields.get(field) || 0) + 1);
    });

    const toOptions = (map: Map<string, number>) => Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([val, count]) => ({ label: val, value: val, count }));

    return { uniqueClusters: toOptions(clusters), uniqueZones: toOptions(zones), uniqueBlocks: toOptions(blocks), uniqueFields: toOptions(fields) };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let result = [...tasks];
    if (filterType && filterValue) {
      result = result.filter(t => {
        const parts = parseLand(t.land);
        return parts[filterType] === filterValue;
      });
    }
    if (sortArea) {
      result.sort((a, b) => sortArea === 'desc' ? b.workAllocated - a.workAllocated : a.workAllocated - b.workAllocated);
    }
    return result;
  }, [tasks, filterType, filterValue, sortArea]);

  const handleAssignAll = () => toast.success(`Assigned ${displayedTasks.length} tasks`, { description: `All visible tasks in "${title}" have been assigned.` });
  const handleAssignTask = (taskNo: string) => toast.success(`Task Assigned`, { description: `Task ${taskNo} has been assigned.` });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    const currentTop = parseInt(position.top) || 0; 
    startTop.current = isNaN(currentTop) ? (window.innerHeight * (parseInt(initialTop)/100)) : currentTop;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaY = e.clientY - startY.current;
    const newTop = Math.max(0, Math.min(window.innerHeight - 50, startTop.current + deltaY));
    setPosition({ top: `${newTop}px` });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (Math.abs(e.clientY - startY.current) < 5) setIsOpen(prev => !prev);
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const theme = {
    orange: {
      btn: "bg-orange-500 hover:bg-orange-600 text-white border-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-900",
      sub: "text-orange-600",
      iconBg: "bg-orange-100",
      bar: "bg-orange-400",
      badgeBg: "bg-orange-600",
      badgeText: "text-white",
      assignAll: "bg-orange-600 hover:bg-orange-700 text-white",
      assignItem: "text-orange-600 hover:bg-orange-50 border-orange-200"
    },
    red: {
      btn: "bg-red-500 hover:bg-red-600 text-white border-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      sub: "text-red-600",
      iconBg: "bg-red-100",
      bar: "bg-red-400",
      badgeBg: "bg-white",
      badgeText: "text-red-600",
      assignAll: "bg-red-600 hover:bg-red-700 text-white",
      assignItem: "text-red-600 hover:bg-red-50 border-red-200"
    },
    green: {
      btn: "bg-green-600 hover:bg-green-700 text-white border-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      sub: "text-green-700",
      iconBg: "bg-green-100",
      bar: "bg-green-500",
      badgeBg: "bg-green-700",
      badgeText: "text-white",
      assignAll: "bg-green-600 hover:bg-green-700 text-white",
      assignItem: "text-green-700 hover:bg-green-50 border-green-200"
    }
  }[colorTheme];

  const handleToggleDropdown = (name: string) => { setOpenDropdown(openDropdown === name ? null : name); };

  return (
    <>
      {!isOpen && (
        <div style={{ top: position.top }} className="fixed right-0 z-[60] cursor-grab active:cursor-grabbing transition-transform hover:scale-105" onMouseDown={handleMouseDown}>
          {tasks.length > 0 && (
            <div className="absolute -top-1.5 -left-1.5 z-50">
              <span className="relative flex h-5 w-5">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colorTheme === 'orange' ? 'bg-orange-400' : colorTheme === 'red' ? 'bg-red-400' : 'bg-green-400')}></span>
                <span className={cn("relative inline-flex rounded-full h-5 w-5 text-[9px] font-bold items-center justify-center border-2 border-white shadow-sm", theme.badgeBg, theme.badgeText)}>{tasks.length}</span>
              </span>
            </div>
          )}
          <div className={cn("p-3 rounded-l-xl shadow-lg border-y border-l flex items-center gap-2", theme.btn)}>
            <Icon className="w-5 h-5" />
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-bold writing-vertical-lr hidden group-hover:block">{title}</span>
          </div>
        </div>
      )}

      <div className={cn("fixed top-0 right-0 h-screen w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[70] flex flex-col border-l", isOpen ? "translate-x-0" : "translate-x-full")}>
        <div className={cn("p-4 border-b flex justify-between items-center", theme.bg, theme.border)}>
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", theme.iconBg)}><Icon className={cn("w-5 h-5", theme.sub)} /></div>
            <div><h3 className={cn("font-bold text-base", theme.text)}>{title}</h3><p className={cn("text-xs font-medium", theme.sub)}>{tasks.length} Total</p></div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X className={cn("w-5 h-5", theme.text)} /></button>
        </div>

        <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1"><Filter className="w-3 h-3"/> Filter By</span>
            {(filterValue || sortArea) && <button onClick={() => { setFilterType(null); setFilterValue(null); setSortArea(null); }} className="text-blue-500 hover:underline">Reset</button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FilterDropdown label="Cluster" icon={Factory} options={uniqueClusters} activeValue={filterType === 'cluster' ? filterValue : null} onSelect={(val) => { setFilterType(val ? 'cluster' : null); setFilterValue(val); }} isOpen={openDropdown === 'cluster'} onToggle={() => handleToggleDropdown('cluster')} colorTheme={colorTheme} />
            <FilterDropdown label="Zone" icon={MapIcon} options={uniqueZones} activeValue={filterType === 'zone' ? filterValue : null} onSelect={(val) => { setFilterType(val ? 'zone' : null); setFilterValue(val); }} isOpen={openDropdown === 'zone'} onToggle={() => handleToggleDropdown('zone')} colorTheme={colorTheme} />
            <FilterDropdown label="Block" icon={LayoutGrid} options={uniqueBlocks} activeValue={filterType === 'block' ? filterValue : null} onSelect={(val) => { setFilterType(val ? 'block' : null); setFilterValue(val); }} isOpen={openDropdown === 'block'} onToggle={() => handleToggleDropdown('block')} colorTheme={colorTheme} />
            <FilterDropdown label="Field" icon={Hash} options={uniqueFields} activeValue={filterType === 'field' ? filterValue : null} onSelect={(val) => { setFilterType(val ? 'field' : null); setFilterValue(val); }} isOpen={openDropdown === 'field'} onToggle={() => handleToggleDropdown('field')} colorTheme={colorTheme} />
          </div>
          
          {/* ✅ CONDITIONALLY RENDER ASSIGN ALL BUTTON */}
          {showAssign && (
            <div className="pt-1">
              <button onClick={handleAssignAll} className={cn("w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold shadow-sm transition-all active:scale-95", theme.assignAll)}>
                <ListChecks className="w-4 h-4" />
                Assign All ({displayedTasks.length})
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
          {displayedTasks.length > 0 ? displayedTasks.map((task, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", theme.bar)} />
              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{task.taskNo}</span>
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">{task.activity}</h4>
                </div>
                <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="space-y-2 pl-2 border-t border-gray-50 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Location:</span>
                  <span className="font-medium text-gray-900 truncate max-w-[180px]" title={task.land}>{task.land}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><Tractor className="w-3.5 h-3.5 text-gray-400" /> Allocated:</span>
                  <span className="font-medium text-gray-900">{task.workAllocated} Ac</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> Done:</span>
                  <span className={cn("font-bold", task.workDone > 0 ? "text-green-600" : "text-gray-400")}>{task.workDone} Ac</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1 mb-3">
                  <div className={cn("h-full rounded-full transition-all duration-500", theme.bar)} style={{ width: `${Math.min(100, (task.workDone / task.workAllocated) * 100)}%` }} />
                </div>
                
                {/* ✅ CONDITIONALLY RENDER INDIVIDUAL ASSIGN BUTTON */}
                {showAssign && (
                  <button onClick={() => handleAssignTask(task.taskNo)} className={cn("w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold border transition-colors", theme.assignItem)}>
                    <Play className="w-3 h-3 fill-current" /> Assign Work
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 opacity-20" />
              <p className="text-sm">No matching tasks</p>
              <button onClick={() => { setFilterType(null); setFilterValue(null); }} className="text-xs text-blue-500 hover:underline">Clear Filters</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const TaskSidebar = ({
  pendingToday,
  carryForward,
  earlyCompletion,
  showPending = true,
}: {
  pendingToday: SidebarTask[];
  carryForward: SidebarTask[];
  earlyCompletion?: SidebarTask[];
  showPending?: boolean;
}) => {
  const displayPending = pendingToday.length > 0 ? pendingToday : DUMMY_PENDING;
  const displayCarry = carryForward.length > 0 ? carryForward : DUMMY_CARRY_FORWARD;
  const displayEarly = (earlyCompletion && earlyCompletion.length > 0) ? earlyCompletion : DUMMY_EARLY;

  return (
    <>
      {showPending && (
        <DraggablePanel title="Pending Tasks" tasks={displayPending} colorTheme="orange" initialTop="120px" icon={Clock} showAssign={true} />
      )}
      <DraggablePanel title="Carry Forward" tasks={displayCarry} colorTheme="red" initialTop="200px" icon={AlertCircle} showAssign={true} />
      <DraggablePanel title="Early Completion" tasks={displayEarly} colorTheme="green" initialTop="280px" icon={FastForward} showAssign={false} />
    </>
  );
};