import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  addDays,
  isToday,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';
import {
  Calendar,
  Save,
  X,
  Tractor,
  Droplets,
  Sprout,
  Scissors,
  Footprints,
  Flower2,
  Layers,
  Shovel,
  Hammer,
  Rows3,
  Rows4,
  MapPin,
  Info,
  AlertCircle,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  ChevronDown,
  Plus,
  Lock,
  Eye,
  EyeOff,
  LandPlot,
  UserSquare2,
  Wheat,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area'; // New component
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import getBaseUrl from '@/lib/config';

type LivePlanStepStatus = 'idle' | 'loading' | 'success' | 'error';

type RentalServiceOption = {
  id: string;
  name: string;
  isLive: boolean;
};

type CropType = 'paddy' | 'ragi' | 'napier';

type CropPlannerCard = {
  id: string;
  cropType: CropType | '';
  plannerId: string;
  color: string;
  selectedFarmTags: string[];
  selectNew: boolean;
  selectOld: boolean;
  selectAll: boolean;
  mappedStartDate?: string;
  showOnCalendar: boolean;
  mappingLocked: boolean;
  locked: boolean;
};

type BlockPlannerCards = Record<string, CropPlannerCard[]>;
type BlockLandsMap = Record<string, LandTag[]>;

type LandTag = {
  id: string;
  owner: string;
  area: number;
  landType: 'new' | 'old';
  cropType: CropType;
};

// ============================================================================
// TYPES
// ============================================================================

export type ActivityCategory = 
  | 'Land Preparation'
  | 'Crop Care'
  | 'Irrigation'
  | 'Plantation'
  | 'Other';

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  icon: string;
}

export type FrequencyType = 'once' | 'every_n_days' | 'weekly';

export interface PlannerActivity {
  id: string;
  sno: number;
  activityId: string;
  dayOffset: number;
  frequency: FrequencyType;
  frequencyValue?: number;
  workQty: number;
}

export interface MasterPlanner {
  id: string;
  name: string;
  activities: PlannerActivity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  acres: number;
}

export interface PlannedActivity {
  date: Date;
  activityId: string;
  activityName: string;
  category: ActivityCategory;
  icon: string;
  workQty: number;
}

export interface CultivationPlan {
  id: string;
  farmId: string;
  farmName: string;
  masterPlannerId: string;
  masterPlannerName: string;
  startDate: Date;
  activities: PlannedActivity[];
  carryForwardProbability: number;
  createdAt: Date;
}

// ============================================================================
// CONSTANTS - ACTIVITIES LIST (Re-adding needed constant for helpers)
// ============================================================================

export const ACTIVITIES: Activity[] = [
    { id: 'bed-making-land', name: 'Bed Making', category: 'Land Preparation', icon: 'Rows3' },
    { id: 'bed-making-other', name: 'Bed Making', category: 'Other', icon: 'Rows4' },
    { id: 'field-visits', name: 'Field Visits', category: 'Crop Care', icon: 'Footprints' },
    { id: 'harvesting', name: 'Harvesting', category: 'Other', icon: 'Scissors' },
    { id: 'initial-ploughing', name: 'Initial Ploughing', category: 'Land Preparation', icon: 'Tractor' },
    { id: 'interweeding-fertilization', name: 'Interweeding + Fertilization', category: 'Crop Care', icon: 'Flower2' },
    { id: 'irrigation', name: 'Irrigation', category: 'Irrigation', icon: 'Droplets' },
    { id: 'mulching', name: 'Mulching', category: 'Crop Care', icon: 'Layers' },
    { id: 'ploughing', name: 'Ploughing', category: 'Plantation', icon: 'Shovel' },
    { id: 'soil-pulverization', name: 'Soil Pulverization', category: 'Land Preparation', icon: 'Hammer' },
    { id: 'sowing', name: 'Sowing', category: 'Plantation', icon: 'Sprout' },
];

// ============================================================================
// DEMO DATA (Restored fully)
// ============================================================================

export const demoMasterPlanners: MasterPlanner[] = [
  {
    id: 'planner-1',
    name: 'Tomato Cultivation Plan',
    activities: [
      { id: 'a1', sno: 1, activityId: 'initial-ploughing', dayOffset: 0, frequency: 'once', workQty: 5 },
      { id: 'a2', sno: 2, activityId: 'soil-pulverization', dayOffset: 3, frequency: 'once', workQty: 5 },
      { id: 'a3', sno: 3, activityId: 'bed-making-land', dayOffset: 5, frequency: 'once', workQty: 5 },
      { id: 'a4', sno: 4, activityId: 'sowing', dayOffset: 7, frequency: 'once', workQty: 5 },
      { id: 'a5', sno: 5, activityId: 'irrigation', dayOffset: 7, frequency: 'every_n_days', frequencyValue: 3, workQty: 5 },
      { id: 'a6', sno: 6, activityId: 'field-visits', dayOffset: 14, frequency: 'weekly', workQty: 5 },
      { id: 'a7', sno: 7, activityId: 'interweeding-fertilization', dayOffset: 21, frequency: 'every_n_days', frequencyValue: 14, workQty: 3 },
      { id: 'a8', sno: 8, activityId: 'mulching', dayOffset: 30, frequency: 'once', workQty: 5 },
      { id: 'a9', sno: 9, activityId: 'harvesting', dayOffset: 90, frequency: 'every_n_days', frequencyValue: 7, workQty: 2 },
    ],
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'planner-2',
    name: 'Rice Paddy Schedule',
    activities: [
      { id: 'b1', sno: 1, activityId: 'ploughing', dayOffset: 0, frequency: 'once', workQty: 10 },
      { id: 'b2', sno: 2, activityId: 'bed-making-land', dayOffset: 5, frequency: 'once', workQty: 10 },
      { id: 'b3', sno: 3, activityId: 'sowing', dayOffset: 10, frequency: 'once', workQty: 10 },
      { id: 'b4', sno: 4, activityId: 'irrigation', dayOffset: 10, frequency: 'every_n_days', frequencyValue: 2, workQty: 10 },
      { id: 'b5', sno: 5, activityId: 'harvesting', dayOffset: 100, frequency: 'once', workQty: 10 },
    ],
    createdAt: new Date('2024-11-20'),
    updatedAt: new Date('2024-11-25'),
  },
];

// ============================================================================
// ICON COMPONENT
// ============================================================================
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Tractor,
  Droplets,
  Sprout,
  Scissors,
  Footprints,
  Flower2,
  Layers,
  Shovel,
  Hammer,
  Rows3,
  Rows4,
};

interface ActivityIconProps {
  iconName: string;
  className?: string;
}

const ActivityIcon: React.FC<ActivityIconProps> = ({ iconName, className = 'h-4 w-4' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) {
    return <Calendar className={className} />;
  }
  return <IconComponent className={className} />;
};

// ============================================================================
// HELPER FUNCTIONS (Restored fully)
// ============================================================================
const MAX_PLAN_DAYS = 120;

const generatePlannedActivities = (
  masterPlan: MasterPlanner,
  startDate: Date
): PlannedActivity[] => {
  const activities: PlannedActivity[] = [];
  masterPlan.activities.forEach((plannerActivity) => {
    const activity = ACTIVITIES.find((a) => a.id === plannerActivity.activityId);
    if (!activity) return;
    if (plannerActivity.frequency === 'once') {
      const activityDate = addDays(startDate, plannerActivity.dayOffset);
      if (plannerActivity.dayOffset <= MAX_PLAN_DAYS) {
        activities.push({
          date: activityDate,
          activityId: activity.id,
          activityName: activity.name,
          category: activity.category,
          icon: activity.icon,
          workQty: plannerActivity.workQty,
        });
      }
    } else if (plannerActivity.frequency === 'every_n_days' && plannerActivity.frequencyValue) {
      let currentOffset = plannerActivity.dayOffset;
      while (currentOffset <= MAX_PLAN_DAYS) {
        const activityDate = addDays(startDate, currentOffset);
        activities.push({
          date: activityDate,
          activityId: activity.id,
          activityName: activity.name,
          category: activity.category,
          icon: activity.icon,
          workQty: plannerActivity.workQty,
        });
        currentOffset += plannerActivity.frequencyValue;
      }
    } else if (plannerActivity.frequency === 'weekly') {
      let currentOffset = plannerActivity.dayOffset;
      while (currentOffset <= MAX_PLAN_DAYS) {
        const activityDate = addDays(startDate, currentOffset);
        activities.push({
          date: activityDate,
          activityId: activity.id,
          activityName: activity.name,
          category: activity.category,
          icon: activity.icon,
          workQty: plannerActivity.workQty,
        });
        currentOffset += 7;
      }
    }
  });
  return activities;
};

const calculateCarryForwardProbability = (activities: PlannedActivity[]): number => {
  if (activities.length === 0) return 0;
  const uniqueDates = new Set(activities.map((a) => format(a.date, 'yyyy-MM-dd'))).size;
  const totalActivities = activities.length;
  const density = totalActivities / uniqueDates;
  const probability = Math.min(Math.round((density - 1) * 20 + 10), 95);
  return Math.max(probability, 5);
};

// ============================================================================
// INFO BOX COMPONENT (Restored)
// ============================================================================

interface InfoBoxProps {
  carryForwardProbability: number;
  selectedDate: Date | null;
  activitiesCount: number;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  carryForwardProbability,
  selectedDate,
  activitiesCount,
}) => {
  return (
    <Card className="fixed top-20 right-4 w-64 shadow-lg z-50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Plan Information
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        {selectedDate && (
          <div className="text-sm">
            <span className="text-muted-foreground">Start Date (Day 0):</span>
            <p className="font-medium">{format(selectedDate, 'dd MMM yyyy')}</p>
          </div>
        )}

        <div className="text-sm">
          <span className="text-muted-foreground">Total Activities:</span>
          <p className="font-medium">{activitiesCount}</p>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Carry Forward Probability:</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  carryForwardProbability > 60 ? 'bg-amber-500' :
                  carryForwardProbability > 30 ? 'bg-yellow-500' :
                  'bg-emerald-500'
                }`}
                style={{ width: `${carryForwardProbability}%` }}
              />
            </div>
            <span className="font-medium text-sm">{carryForwardProbability}%</span>
          </div>
        </div>
        {carryForwardProbability > 50 && (
          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>High activity density may cause delays</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MONTH CALENDAR COMPONENT
// ============================================================================

const MonthCalendar: React.FC<{
  month: Date;
  selectedDate: Date | null;
  onDateClick?: (date: Date) => void;
  isSelectionMode?: boolean;
  highlighted?: { [date: string]: string };
  highlightCounts?: { [date: string]: number };
  highlightColors?: { [date: string]: string };
  highlightCardColors?: { [date: string]: string[] };
  blockedDates?: { [date: string]: boolean };
}> = ({ month, selectedDate, onDateClick, isSelectionMode, highlighted, highlightCounts, highlightColors, highlightCardColors, blockedDates }) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptySlots = Array(startDayOfWeek).fill(null);
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-2 px-3 bg-muted/50">
        <CardTitle className="text-sm font-medium text-center">
          {format(month, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-[10px] font-medium text-muted-foreground text-center py-1"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {emptySlots.map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isPast = isBefore(day, new Date());
            const today = isToday(day);
            const highlight = highlighted && highlighted[format(day, 'yyyy-MM-dd')];
            const highlightCount = highlightCounts ? highlightCounts[format(day, 'yyyy-MM-dd')] || 0 : 0;
            const highlightColor = highlightColors ? highlightColors[format(day, 'yyyy-MM-dd')] : undefined;
            const dateCardColors = highlightCardColors ? (highlightCardColors[format(day, 'yyyy-MM-dd')] || []) : [];
            const cardCount = dateCardColors.length;
            const isBlocked = blockedDates && blockedDates[format(day, 'yyyy-MM-dd')];
            const overlapClass = highlightCount > 5
              ? 'bg-red-200 border border-red-600 text-red-900'
              : highlightCount > 2
              ? 'bg-orange-100 border border-orange-500 text-orange-800'
              : highlightCount > 1
              ? 'bg-green-400 border border-green-700 text-green-950'
              : highlight
              ? 'bg-green-100 border border-green-500'
              : '';
            return (
              <button
                key={day.toISOString()}
                onClick={() => (!isSelectionMode || !isBlocked) && onDateClick && onDateClick(day)}
                disabled={isSelectionMode && isBlocked}
                className={`aspect-square p-0.5 rounded text-[10px] relative transition-all
                  ${(isSelectionMode || highlight) ? 'cursor-pointer hover:bg-primary/10' : 'cursor-default'}
                  ${isSelected ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1' : ''}
                  ${today && !isSelected ? 'bg-accent font-bold' : ''}
                  ${isPast && !isSelected ? 'text-muted-foreground/50' : ''}
                  ${overlapClass}
                  ${isBlocked ? 'bg-red-100 border border-red-500 text-red-700' : ''}
                `}
                style={!isSelected && !isBlocked && highlightColor ? { backgroundColor: highlightColor, borderColor: '#7c3aed' } : undefined}
              >
                {!isSelected && !isBlocked && cardCount > 0 && (
                  <span className="absolute inset-0 p-[2px] pointer-events-none">
                    {cardCount === 1 && (
                      <span className="block h-full w-full rounded" style={{ backgroundColor: dateCardColors[0] }} />
                    )}
                    {cardCount === 2 && (
                      <span className="grid h-full w-full grid-cols-2 gap-[2px]">
                        <span className="rounded" style={{ backgroundColor: dateCardColors[0] }} />
                        <span className="rounded" style={{ backgroundColor: dateCardColors[1] }} />
                      </span>
                    )}
                    {cardCount === 3 && (
                      <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px]">
                        <span className="rounded" style={{ backgroundColor: dateCardColors[0] }} />
                        <span className="rounded" style={{ backgroundColor: dateCardColors[1] }} />
                        <span className="rounded" style={{ backgroundColor: dateCardColors[2] }} />
                        <span />
                      </span>
                    )}
                    {cardCount > 3 && (
                      <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px]">
                        <span className="rounded" style={{ backgroundColor: dateCardColors[0] }} />
                        <span className="rounded" style={{ backgroundColor: dateCardColors[1] }} />
                        <span className="rounded" style={{ backgroundColor: dateCardColors[2] }} />
                        <span className="rounded bg-white/85 border border-slate-300 text-[8px] font-bold text-slate-700 flex items-center justify-center">
                          +{cardCount - 3}
                        </span>
                      </span>
                    )}
                  </span>
                )}
                <span className="block">{format(day, 'd')}</span>
                {highlight && (
                  <span className="block text-[8px] text-green-700 font-semibold truncate">{highlight}</span>
                )}
                {isBlocked && (
                  <span className="block text-[8px] text-red-700 font-semibold truncate">Blocked</span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreateCultivationPlan: React.FC = () => {
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedMasterPlanner, setSelectedMasterPlanner] = useState<MasterPlanner | null>(
    null
  );
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]);
  const [carryForwardProbability, setCarryForwardProbability] = useState<number | null>(null);
  
  // --- New State for Dialog/Selections ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);
  const [masterPlanId, setMasterPlanId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [day0, setDay0] = useState<Date | null>(null);
  const [highlighted, setHighlighted] = useState<{ [date: string]: string }>({});
  const [highlightCounts, setHighlightCounts] = useState<{ [date: string]: number }>({});
  const [highlightColors, setHighlightColors] = useState<{ [date: string]: string }>({});
  const [highlightCardColors, setHighlightCardColors] = useState<{ [date: string]: string[] }>({});
  const [mappedByCard, setMappedByCard] = useState<Record<string, any[]>>({});
  const [activeMappingCard, setActiveMappingCard] = useState<{ blockId: string; cardId: string } | null>(null);
  const [mappingCardLoading, setMappingCardLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [blockedDates, setBlockedDates] = useState<{ [date: string]: boolean }>({});
  const [showBlockedDates, setShowBlockedDates] = useState(true);

  const [livePlanProgressOpen, setLivePlanProgressOpen] = useState(false);
  const [livePlanStep, setLivePlanStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [savePlanStatus, setSavePlanStatus] = useState<LivePlanStepStatus>('idle');
  const [assignFarmsStatus, setAssignFarmsStatus] = useState<LivePlanStepStatus>('idle');
  const [assignContractFarmersStatus, setAssignContractFarmersStatus] = useState<LivePlanStepStatus>('idle');
  const [adjustRentalServicesStatus, setAdjustRentalServicesStatus] = useState<LivePlanStepStatus>('idle');
  const [livePlanError, setLivePlanError] = useState<string | null>(null);

  // --- State for mapped data (no popup) ---
  const [rawMappedData, setRawMappedData] = useState<any[]>([]);

  // Add state for fetched master plans
  const [apiMasterPlans, setApiMasterPlans] = useState<{ id: string; name: string; plan_list: any[] }[]>([]);
  // Add state for fetched blocks
  const [apiBlocks, setApiBlocks] = useState<{ block_id: string; block_name: string; total_area: number }[]>([]);
  // Add state for zones
  const [apiZones, setApiZones] = useState<{ zone_id: string; zone_name: string; total_area: number }[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [blocksInZone, setBlocksInZone] = useState<{ block_id: string; block_name: string; total_area: number }[]>([]);
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [planMode, setPlanMode] = useState<'zone' | 'group'>('zone');
  const [blockPlannerCards, setBlockPlannerCards] = useState<BlockPlannerCards>({});
  const [blockLandsById, setBlockLandsById] = useState<BlockLandsMap>({});

  // Rental services (multi-select)
  const [rentalServices, setRentalServices] = useState<RentalServiceOption[]>([]);
  const [selectedRentalServiceIds, setSelectedRentalServiceIds] = useState<string[]>([]);

  // Plan metadata state and loading
  const [planMetaLoading, setPlanMetaLoading] = useState(false);
  type DayPerTaskMap = Record<string, { days_needed: number; day_offset: number; work_quantity: number }>;
  const [planMeta, setPlanMeta] = useState<{ day_per_task: DayPerTaskMap; average_work_quantity: number } | null>(null);

  const workQtyByActivity = useMemo(() => {
    const map = new Map<string, number>();
    const src = planMeta?.day_per_task;
    if (!src) return map;
    for (const [name, meta] of Object.entries(src)) {
      map.set(String(name).trim().toLowerCase(), Number((meta as any)?.work_quantity) || 0);
    }
    return map;
  }, [planMeta?.day_per_task]);

  const navigate = useNavigate();

  // Fetch master plans from API on mount
  const BASE_URL = getBaseUrl(); // <-- Use shared config
  const CARD_LIGHT_TINTS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fee2e2', '#f3e8ff', '#e0f2fe', '#ecfccb', '#ffe4e6'];

  const addPlannerCard = (blockId: string) => {
    setBlockPlannerCards((prev) => {
      const existing = prev[blockId] || [];
      const newCard: CropPlannerCard = {
        id: `card-${Date.now()}-${Math.random()}`,
        cropType: '',
        plannerId: '',
        color: CARD_LIGHT_TINTS[(existing.length % CARD_LIGHT_TINTS.length)],
        selectedFarmTags: [],
        selectNew: false,
        selectOld: false,
        selectAll: false,
        showOnCalendar: false,
        mappingLocked: false,
        locked: false,
      };
      return { ...prev, [blockId]: [...existing, newCard] };
    });
  };

  const updatePlannerCard = (blockId: string, cardId: string, patch: Partial<CropPlannerCard>) => {
    setBlockPlannerCards((prev) => ({
      ...prev,
      [blockId]: (prev[blockId] || []).map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
    }));
  };

  const removePlannerCard = (blockId: string, cardId: string) => {
    setBlockPlannerCards((prev) => ({
      ...prev,
      [blockId]: (prev[blockId] || []).filter((card) => card.id !== cardId),
    }));
  };

  const getCropTags = (blockId: string, crop: CropType | ''): LandTag[] => {
    if (!crop) return [];
    return (blockLandsById[blockId] || []).filter((land) => land.cropType === crop);
  };

  const toggleCardFarmTag = (blockId: string, cardId: string, tag: string) => {
    setBlockPlannerCards((prev) => ({
      ...prev,
      [blockId]: (prev[blockId] || []).map((card) => {
        if (card.id !== cardId) return card;
        const exists = card.selectedFarmTags.includes(tag);
        return {
          ...card,
          selectedFarmTags: exists ? card.selectedFarmTags.filter((t) => t !== tag) : [...card.selectedFarmTags, tag],
        };
      }),
    }));
  };

  const applyLandFilter = (blockId: string, cardId: string, filter: 'new' | 'old' | 'all', checked: boolean) => {
    setBlockPlannerCards((prev) => {
      const cards = prev[blockId] || [];
      const current = cards.find((c) => c.id === cardId);
      if (!current) return prev;

      const cropTags = getCropTags(blockId, current.cropType);
      let nextSelectNew = current.selectNew;
      let nextSelectOld = current.selectOld;
      let nextSelectAll = current.selectAll;

      if (filter === 'all') {
        nextSelectAll = checked;
        nextSelectNew = checked;
        nextSelectOld = checked;
      } else if (filter === 'new') {
        nextSelectNew = checked;
        nextSelectAll = checked && current.selectOld;
      } else {
        nextSelectOld = checked;
        nextSelectAll = checked && current.selectNew;
      }

      const eligibleTags = cropTags.filter((tag) =>
        nextSelectAll ? true : (nextSelectNew && tag.landType === 'new') || (nextSelectOld && tag.landType === 'old')
      );
      const selectedForFilter = eligibleTags
        .filter((tag) => !isTagUsedInOtherCard(blockId, cardId, tag.id))
        .map((tag) => tag.id);

      return {
        ...prev,
        [blockId]: cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                selectNew: nextSelectNew,
                selectOld: nextSelectOld,
                selectAll: nextSelectAll,
                selectedFarmTags: selectedForFilter,
              }
            : card
        ),
      };
    });
  };

  const isTagUsedInOtherCard = (blockId: string, cardId: string, tagId: string) => {
    return (blockPlannerCards[blockId] || []).some(
      (card) => card.id !== cardId && card.selectedFarmTags.includes(tagId)
    );
  };

  const getFirstCardPlannerId = () => {
    for (const cards of Object.values(blockPlannerCards)) {
      const matched = cards.find((card) => !!card.plannerId);
      if (matched?.plannerId) return matched.plannerId;
    }
    return null;
  };

  useEffect(() => {
    setBlockPlannerCards((prev) => {
      const next: BlockPlannerCards = {};
      selectedFarmIds.forEach((blockId) => {
        next[blockId] = prev[blockId] || [];
      });
      return next;
    });
  }, [selectedFarmIds]);

  useEffect(() => {
    const activeBlockSet = new Set(selectedFarmIds);
    setBlockLandsById((prev) => {
      const next: BlockLandsMap = {};
      selectedFarmIds.forEach((blockId) => {
        next[blockId] = prev[blockId] || [];
      });
      return next;
    });

    if (selectedFarmIds.length === 0) return;

    Promise.all(
      selectedFarmIds.map(async (blockId) => {
        try {
          const resp = await fetch(`${BASE_URL}/admin_cultivation/cultivation_lands_for_block/${blockId}`);
          if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
          const data = await resp.json();
          const landsRaw = Array.isArray(data?.lands) ? data.lands : [];

          const lands: LandTag[] = landsRaw
            .map((item: any, idx: number) => {
              const cropRaw = String(item?.crop_type ?? '').trim().toLowerCase();
              if (cropRaw !== 'paddy' && cropRaw !== 'ragi' && cropRaw !== 'napier') return null;
              const landTypeRaw = String(item?.land_type ?? '').trim().toLowerCase();
              const areaVal = Number(item?.area ?? 0);

              return {
                id: String(item?.farm_id ?? `${blockId}-${idx}`),
                owner: String(item?.farmer_name ?? 'Unknown'),
                area: Number.isFinite(areaVal) ? areaVal : 0,
                cropType: cropRaw as CropType,
                landType: landTypeRaw === 'new' ? 'new' : 'old',
              } as LandTag;
            })
            .filter(Boolean) as LandTag[];

          return { blockId, lands };
        } catch (error) {
          console.error('Failed to fetch lands for block:', blockId, error);
          return { blockId, lands: [] as LandTag[] };
        }
      })
    ).then((results) => {
      setBlockLandsById((prev) => {
        const next = { ...prev };
        results.forEach(({ blockId, lands }) => {
          if (!activeBlockSet.has(blockId)) return;
          next[blockId] = lands;
        });
        return next;
      });
    });
  }, [selectedFarmIds, BASE_URL]);

  useEffect(() => {
    fetch(`${BASE_URL}/admin_cultivation/get_master_cultivation_plans`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && data.plan) {
          const plans = Object.entries(data.plan).map(([id, plan]: any) => ({
            id,
            name: plan.plan_name,
            plan_list: plan.plan_list || [],
          }));
          setApiMasterPlans(plans);
        }
      })
      .catch(err => {
        console.error('Failed to fetch master plans:', err);
      });

    // Fetch blocks
    fetch(`${BASE_URL}/farmer_managment/get_blocks`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.blocks)) {
          setApiBlocks(data.blocks.map((block: any) => ({
            block_id: block.block_id,
            block_name: block.block_name,
            total_area: block.total_area,
          })));
        }
      })
      .catch(err => {
        console.error('Failed to fetch blocks:', err);
      });

    // Fetch zones
    fetch(`${BASE_URL}/farmer_managment/get_zones`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.zones)) {
          setApiZones(data.zones.map((zone: any) => ({
            zone_id: zone.zone_id,
            zone_name: zone.zone_name,
            total_area: zone.total_area,
          })));
        }
      })
      .catch(err => {
        console.error('Failed to fetch zones:', err);
      });

    // Fetch rental services (rate cards)
    fetch(`${BASE_URL}/admin_rental/get_all_rental_rate_cards`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) return;
        const mapped: RentalServiceOption[] = data
          .map((item: any) => {
            const id = String(item?.rental_id ?? '').trim();
            const name = String(item?.service_name ?? '').trim();
            const status = String(item?.status ?? '').trim().toLowerCase();
            if (!id || !name) return null;
            return { id, name, isLive: status === 'live' };
          })
          .filter(Boolean) as RentalServiceOption[];

        // Prefer live services; if none are marked live, show all.
        const live = mapped.filter((s) => s.isLive);
        setRentalServices(live.length ? live : mapped);
      })
      .catch(err => {
        console.error('Failed to fetch rental services:', err);
      });

    // Fetch blocked dates
    fetch(`${BASE_URL}/admin_cultivation/blocked_dates`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.blocked_dates)) {
          const map: { [date: string]: boolean } = {};
          data.blocked_dates.forEach((d: string) => { if (d) map[String(d)] = true; });
          setBlockedDates(map);
        }
      })
      .catch(err => {
        console.error('Failed to fetch blocked dates:', err);
        setBlockedDates({});
      });
  }, []);

  const selectedRentalServices = useMemo(() => {
    if (!selectedRentalServiceIds.length) return [];
    const byId = new Map(rentalServices.map((s) => [s.id, s] as const));
    return selectedRentalServiceIds.map((id) => byId.get(id)).filter(Boolean) as RentalServiceOption[];
  }, [rentalServices, selectedRentalServiceIds]);

  const toggleRentalService = (id: string) => {
    setSelectedRentalServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Helper to get selected master plan from API data
  const selectedApiMasterPlan = useMemo(() => {
    if (!masterPlanId) return null;
    return apiMasterPlans.find((p) => p.id === masterPlanId) || null;
  }, [apiMasterPlans, masterPlanId]);

  // Fallback: calculate average work quantity from master plan (if API meta isn't available)
  const avgWorkQtyFallback = useMemo(() => {
    if (!selectedApiMasterPlan || !selectedApiMasterPlan.plan_list || !selectedApiMasterPlan.plan_list.length) return null;
    // Try to find a numeric workQty property in each activity
    const total = selectedApiMasterPlan.plan_list.reduce((sum: number, act: any) => sum + (Number(act.workQty) || 0), 0);
    return (total / selectedApiMasterPlan.plan_list.length).toFixed(2);
  }, [selectedApiMasterPlan]);

  const avgWorkQtyDisplay = useMemo(() => {
    if (planMetaLoading) return 'Loading...';
    if (typeof planMeta?.average_work_quantity === 'number') {
      return planMeta.average_work_quantity.toFixed(2);
    }
    return avgWorkQtyFallback ?? '--';
  }, [avgWorkQtyFallback, planMeta?.average_work_quantity, planMetaLoading]);

  // Helper to get selected master plan's activities for highlighting (local logic)
  const getHighlights = (baseDate: Date | null, planId: string | null) => {
    if (!baseDate || !planId) return {};
    const plan = demoMasterPlanners.find(p => p.id === planId);
    if (!plan) return {};
    const highlights: { [date: string]: string } = {};
    plan.activities.forEach(activity => {
      // Use activity.dayOffset from the master plan
      const activityDate = addDays(baseDate, activity.dayOffset);
      if (activity.dayOffset <= 120) {
        highlights[format(activityDate, 'yyyy-MM-dd')] = activity.activityId;
      }
    });
    return highlights;
  };
  
  // --- Activity details inspection state (used by openActivityDetails) ---
  const [activityDetailsOpen, setActivityDetailsOpen] = useState(false);
  const [inspectedDate, setInspectedDate] = useState<Date | null>(null);
  const [inspectPresent, setInspectPresent] = useState<any[]>([]);
  const [inspectPending, setInspectPending] = useState<any[]>([]);

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm);
  };

  const handleMasterPlannerSelect = (planner: MasterPlanner) => {
    setSelectedMasterPlanner(planner);
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
  };

  const handleGeneratePlan = () => {
    if (!selectedMasterPlanner || !startDate) return;
    const activities = generatePlannedActivities(selectedMasterPlanner, startDate);
    setPlannedActivities(activities);
    const probability = calculateCarryForwardProbability(activities);
    setCarryForwardProbability(probability);
    toast.success('Plan generated successfully!');
  };

  const handleSavePlan = () => {
    if (!selectedFarm || !selectedMasterPlanner || !startDate) return;
    // Save logic here
    toast.success('Cultivation plan saved successfully!');
  };

  const handleSaveLivePlan = async () => {
    if (!farmId || !masterPlanId) {
      toast.error('Please select a block and master plan first.');
      return;
    }
    if (!selectedRentalServiceIds.length) {
      toast.error('Please select at least one rental service.');
      return;
    }
    if (!rawMappedData.length) {
      toast.error('Generate the plan mapping before saving.');
      return;
    }

    let currentStep: 1 | 2 | 3 | 4 | 5 = 1;

    try {
      setSavingPlan(true);
      setLivePlanError(null);
      setLivePlanStep(1);
      setSavePlanStatus('idle');
      setAssignFarmsStatus('idle');
      setAssignContractFarmersStatus('idle');
      setAdjustRentalServicesStatus('idle');
      setLivePlanProgressOpen(true);

      const base = BASE_URL.replace(/\/$/, '');
      const payload = {
        plan_id: masterPlanId,
        block_id: farmId,
        date_mapping: rawMappedData,
      };

      // Step 1: Plan made and ready (no work needed)
      currentStep = 2;
      setLivePlanStep(2);
      setSavePlanStatus('loading');

      const resp = await fetch(`${base}/admin_cultivation/save_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('Failed to save plan');
      const data = await resp.json();
      if (!(data && data.status === 'success')) {
        throw new Error('Save plan did not return success');
      }
      setSavePlanStatus('success');

      // Step 3: Assigning farms (same payload)
      currentStep = 3;
      setLivePlanStep(3);
      setAssignFarmsStatus('loading');
      const resp2 = await fetch(`${base}/admin_cultivation/feild_assignment_updater`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp2.ok) throw new Error('Failed to assign farms');
      const data2 = await resp2.json();
      if (!(data2 && data2.status === 'success')) {
        throw new Error('Field assignment did not return success');
      }
      setAssignFarmsStatus('success');

      // Step 4: Assigning contract farmers (same payload)
      currentStep = 4;
      setLivePlanStep(4);
      setAssignContractFarmersStatus('loading');
      const resp3 = await fetch(`${base}/admin_cultivation/update_contractor_farmer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp3.ok) throw new Error('Failed to assign contract farmers');
      const data3 = await resp3.json();
      if (!(data3 && data3.status === 'success')) {
        throw new Error('Assign contract farmers did not return success');
      }
      setAssignContractFarmersStatus('success');

      // Step 5: Adjusting rental services
      currentStep = 5;
      setLivePlanStep(5);
      setAdjustRentalServicesStatus('loading');

      const rentalSetPayload = {
        rental_set_id: selectedRentalServiceIds,
        block_id: farmId,
        master_plan_id: masterPlanId,
      };

      const resp4 = await fetch(`${base}/admin_cultivation/update_rental_set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentalSetPayload),
      });
      if (!resp4.ok) throw new Error('Failed to adjust rental services');
      const data4 = await resp4.json();
      if (!(data4 && data4.status === 'success')) {
        throw new Error('Adjust rental services did not return success');
      }
      setAdjustRentalServicesStatus('success');

      toast.success('Plan published successfully!');
    } catch (err) {
      console.error('Failed to save plan:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setLivePlanError(message);
      // Mark the active step as failed (best-effort)
      if (currentStep === 2) setSavePlanStatus('error');
      if (currentStep === 3) setAssignFarmsStatus('error');
      if (currentStep === 4) setAssignContractFarmersStatus('error');
      if (currentStep === 5) setAdjustRentalServicesStatus('error');
      toast.error(message);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const activityCategories = useMemo(
    () => Array.from(new Set(plannedActivities.map((a) => a.category))),
    [plannedActivities]
  );

  const getTotalAreaForDateMapping = () => {
    if (planMode === 'group') {
      const selectedTagIds = new Set<string>();
      Object.values(blockPlannerCards).forEach((cards) => {
        cards.forEach((card) => {
          card.selectedFarmTags.forEach((tagId) => selectedTagIds.add(tagId));
        });
      });

      let totalFromTags = 0;
      Object.values(blockLandsById).forEach((lands) => {
        lands.forEach((land) => {
          if (selectedTagIds.has(land.id)) totalFromTags += Number(land.area || 0);
        });
      });

      if (totalFromTags > 0) return Number(totalFromTags.toFixed(2));

      const selectedBlocksArea = selectedFarmIds.reduce((sum, id) => {
        const block = apiBlocks.find((b) => b.block_id === id);
        return sum + Number(block?.total_area || 0);
      }, 0);
      return Number(selectedBlocksArea.toFixed(2));
    }

    if (planMode === 'zone') {
      const zoneArea = blocksInZone.reduce((sum, block) => sum + Number(block.total_area || 0), 0);
      if (zoneArea > 0) return Number(zoneArea.toFixed(2));
    }

    const singleBlockArea = Number(apiBlocks.find((b) => b.block_id === farmId)?.total_area || 0);
    return Number(singleBlockArea.toFixed(2));
  };

  const setCalendarFromMappings = (source: Record<string, any[]>, selectedCardIds: string[]) => {
    const mappedEntries =
      selectedCardIds.length === 0
        ? Object.values(source).flat()
        : selectedCardIds.flatMap((id) => source[id] || []);

    setRawMappedData(mappedEntries);
    const highlights: { [date: string]: string } = {};
    const counts: { [date: string]: number } = {};
    const colors: { [date: string]: string } = {};
    const cardColorsByDate: { [date: string]: Record<string, string> } = {};
    mappedEntries.forEach((item: any) => {
      if (!item || !item.date || !item.activity) return;
      const dates = Array.isArray(item.date) ? item.date : [item.date];
      dates.forEach((d: string) => {
        if (!d) return;
        highlights[d] = highlights[d] || item.activity;
        counts[d] = (counts[d] || 0) + 1;
        if (!colors[d] && item.card_color) colors[d] = item.card_color;
        if (!cardColorsByDate[d]) cardColorsByDate[d] = {};
        if (item.card_id && item.card_color) {
          cardColorsByDate[d][String(item.card_id)] = String(item.card_color);
        }
      });
    });
    setHighlighted(highlights);
    setHighlightCounts(counts);
    setHighlightColors(colors);
    setHighlightCardColors(
      Object.fromEntries(
        Object.entries(cardColorsByDate).map(([date, byCard]) => [date, Object.values(byCard)])
      )
    );
  };

  const refreshCalendarFromCardViews = (source: Record<string, any[]>, cardsSource: BlockPlannerCards) => {
    const selectedIds: string[] = [];
    Object.values(cardsSource).forEach((cards) => {
      cards.forEach((card) => {
        if (card.showOnCalendar) selectedIds.push(card.id);
      });
    });
    setCalendarFromMappings(source, selectedIds);
  };

  const handleMapSingleCard = async (blockId: string, cardId: string, day0Date: string) => {
    const card = (blockPlannerCards[blockId] || []).find((c) => c.id === cardId);
    if (!card) throw new Error('Card not found');
    if (!card.plannerId) throw new Error('Select master cultivation first');
    if (!card.selectedFarmTags.length) throw new Error('Select at least one land tag');
    if (!day0Date) throw new Error('Select a start date');

    setMappingCardLoading(true);
    try {
      const cardLands = (blockLandsById[blockId] || []).filter((land) => card.selectedFarmTags.includes(land.id));
      const totalArea = cardLands.reduce((sum, land) => sum + Number(land.area || 0), 0);

      const metaResp = await fetch(`${BASE_URL}/admin_cultivation/plan_metadata_finder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_id: blockId, master_plan_id: card.plannerId }),
      });
      if (!metaResp.ok) throw new Error('Failed to fetch plan metadata');
      const metaData = await metaResp.json();
      setPlanMeta(metaData);

      const mapResp = await fetch(`${BASE_URL}/admin_cultivation/date_mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_0_date: day0Date,
          master_cultivation_plan_id: card.plannerId,
          total_area: Number(totalArea.toFixed(2)),
          day_per_task: metaData?.day_per_task ?? {},
        }),
      });
      if (!mapResp.ok) throw new Error('Failed to fetch date mapping');
      const mapData = await mapResp.json();

      const enriched = Array.isArray(mapData?.date_mapping)
        ? mapData.date_mapping.map((item: any) => ({
            ...item,
            card_id: card.id,
            card_color: card.color,
            block_id: blockId,
            crop_type: card.cropType,
            work_quantity: workQtyByActivity.get(String(item?.activity || '').trim().toLowerCase()) ?? 0,
          }))
        : [];

      const nextMapped = { ...mappedByCard, [card.id]: enriched };
      setMappedByCard(nextMapped);
      const nextCards: BlockPlannerCards = {
        ...blockPlannerCards,
        [blockId]: (blockPlannerCards[blockId] || []).map((c) =>
          c.id === cardId ? { ...c, mappedStartDate: day0Date, showOnCalendar: true } : c
        ),
      };
      setBlockPlannerCards(nextCards);
      refreshCalendarFromCardViews(nextMapped, nextCards);
      setSelectionMode(true);
      setDialogOpen(false);
      toast.success('Land mapping generated for this card');
    } finally {
      setMappingCardLoading(false);
    }
  };

  // Handle day click: always remap activities and highlight, no popup
  const handleDayClick = async (date: Date) => {
    if (selectionMode && masterPlanId) {
      if (planMode === 'group' && activeMappingCard) {
        try {
          await handleMapSingleCard(activeMappingCard.blockId, activeMappingCard.cardId, format(date, 'yyyy-MM-dd'));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to map selected card');
        }
        return;
      }
      if (planMode === 'group' && Object.keys(mappedByCard).length > 0) {
        setDay0(date);
        return;
      }
      setDay0(date);
      try {
        const totalArea = getTotalAreaForDateMapping();
        const response = await fetch(`${BASE_URL}/admin_cultivation/date_mapping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_0_date: format(date, 'yyyy-MM-dd'),
            master_cultivation_plan_id: masterPlanId,
            total_area: totalArea,
            day_per_task: planMeta?.day_per_task ?? {},
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch date mapping');
        const data = await response.json();
        if (data && Array.isArray(data.date_mapping)) {
          const enriched = data.date_mapping.map((item: any) => {
            const activityName = String(item?.activity || '').trim();
            const work_quantity = workQtyByActivity.get(activityName.toLowerCase()) ?? 0;
            return { ...item, work_quantity };
          });
          setRawMappedData(enriched);
          const highlights: { [date: string]: string } = {};
          const counts: { [date: string]: number } = {};
          enriched.forEach((item: any) => {
            if (!item || !item.date || !item.activity) return;
            const dates = Array.isArray(item.date) ? item.date : [item.date];
            dates.forEach((d: string) => {
              if (!d) return;
              highlights[d] = highlights[d] || item.activity;
              counts[d] = (counts[d] || 0) + 1;
            });
          });
          setHighlighted(highlights);
          setHighlightCounts(counts);
          toast.success("Plan generated!");
        } else {
          setHighlighted({});
          setHighlightCounts({});
        }
      } catch (err) {
        setHighlighted({});
        setHighlightCounts({});
        console.error('Failed to fetch date mapping:', err);
      }
    }
  };

  const openActivityDetails = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Present: Activities happening exactly on this date
    const present = rawMappedData.filter(d => d.date === dateStr);
    
    // Pending: Activities scheduled strictly before this date
    // You might want to filter this further based on 'status' if your API returned it
    const pending = rawMappedData.filter(d => d.date < dateStr);

    setInspectedDate(date);
    setInspectPresent(present);
    setInspectPending(pending);
    setActivityDetailsOpen(true);
  };

  // Generate 13 months starting from current month
  const months = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 13 }, (_, i) => addMonths(startOfMonth(today), i));
  }, []);

  // `blockedDates` is populated from the API (`/admin_cultivation/blocked_dates`)

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cultivation Plan</h1>
          {day0 && <p className="text-muted-foreground mt-1 text-sm">Start Date: {format(day0, 'PPP')}</p>}
        </div>
        <div className="flex items-center gap-3">
          {day0 && (
            <Button
              size="lg"
              className="gap-2 px-8 py-3 text-white font-extrabold text-lg bg-gradient-to-r from-green-600 via-emerald-500 to-lime-500 shadow-lg shadow-green-300/40 border-2 border-green-700 ring-4 ring-green-200 focus:ring-green-400 focus:outline-none transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-green-700 hover:to-lime-600"
              onClick={handleSaveLivePlan}
              disabled={savingPlan}
            >
              <CircleDot className="h-6 w-6 animate-pulse text-white drop-shadow" />
              {savingPlan ? 'Saving…' : 'Live Plan'}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
            + Create Plan
          </Button>
        </div>
      </div>

      {/* Carry Forward Probability & Average Work Quantity Side by Side */}
      <div className="w-full max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow p-5 flex items-center justify-between">
          <span className="text-lg font-medium text-gray-700">Carry Forward Probability:</span>
          <span className="text-2xl font-bold text-green-700">{carryForwardProbability !== null ? `${carryForwardProbability}%` : '--'}</span>
        </div>
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow p-5 flex items-center justify-between">
          <span className="text-lg font-medium text-gray-700">Average Work Quantity:</span>
          <span className="text-2xl font-bold text-blue-700">{avgWorkQtyDisplay}</span>
        </div>
      </div>

      {/* --- DIALOG: Select Farm/Plan with Tabs --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">Create Cultivation Plan</DialogTitle>
            <DialogDescription>Choose between zone-based or group-based planning.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="zone" className="w-full" onValueChange={(val) => setPlanMode(val as 'zone' | 'group')}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-xl">
              <TabsTrigger value="zone" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                Zone Plan
              </TabsTrigger>
              <TabsTrigger value="group" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                Group Plan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zone" className="space-y-5 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Select Zone</label>
                <Select
                  value={selectedZoneId ?? ''}
                  onValueChange={(val) => {
                    setSelectedZoneId(val);
                    // Fetch blocks in this zone
                    fetch(`${BASE_URL}/farmer_managment/get_zone_details?zone_id=${val}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data && Array.isArray(data.blocks)) {
                          setBlocksInZone(data.blocks);
                        } else {
                          // Fallback: filter blocks by zone (if API doesn't support)
                          setBlocksInZone([]);
                        }
                      })
                      .catch(() => setBlocksInZone([]));
                  }}
                >
                  <SelectTrigger className="border-2 hover:border-green-400 transition-colors">
                    <SelectValue placeholder="Choose a zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {apiZones.map(zone => (
                      <SelectItem key={zone.zone_id} value={zone.zone_id}>
                        <span className="font-medium">{zone.zone_name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{zone.total_area} acres</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedZoneId && blocksInZone.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3">Blocks in this Zone:</p>
                  <div className="flex flex-wrap gap-2">
                    {blocksInZone.map(block => (
                      <Badge key={block.block_id} variant="secondary" className="bg-white border border-green-300 text-green-800 font-medium px-3 py-1">
                        {block.block_name} ({block.total_area} acres)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Select Master Plan</label>
                <Select value={masterPlanId ?? ''} onValueChange={setMasterPlanId}>
                  <SelectTrigger className="border-2 hover:border-green-400 transition-colors">
                    <SelectValue placeholder="Choose a master plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {apiMasterPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <span className="font-medium">{plan.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{plan.plan_list.length} activities</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Select Rental Services</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between border-2 hover:border-green-400 transition-colors"
                      disabled={!rentalServices.length}
                    >
                      <span className="truncate">
                        {selectedRentalServices.length
                          ? `${selectedRentalServices.length} selected`
                          : rentalServices.length
                            ? 'Choose rental services...'
                            : 'No rental services found'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                    <DropdownMenuLabel>Rental Services</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {rentalServices.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s.id}
                        checked={selectedRentalServiceIds.includes(s.id)}
                        onCheckedChange={() => toggleRentalService(s.id)}
                      >
                        {s.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedRentalServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedRentalServices.map((s) => (
                      <Badge key={s.id} variant="secondary" className="bg-green-100 text-green-800 border border-green-300">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-5 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Select Farms (Blocks)</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between border-2 hover:border-blue-400 transition-colors"
                    >
                      <span className="truncate">
                        {selectedFarmIds.length
                          ? `${selectedFarmIds.length} farm(s) selected`
                          : 'Choose farms...'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                    <DropdownMenuLabel>Select Farms</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {apiBlocks.map((block) => (
                      <DropdownMenuCheckboxItem
                        key={block.block_id}
                        checked={selectedFarmIds.includes(block.block_id)}
                        onCheckedChange={() => {
                          setSelectedFarmIds(prev =>
                            prev.includes(block.block_id)
                              ? prev.filter(id => id !== block.block_id)
                              : [...prev, block.block_id]
                          );
                        }}
                      >
                        {block.block_name} ({block.total_area} acres)
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedFarmIds.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-800 mb-3">Selected Farms:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedFarmIds.map(id => {
                        const block = apiBlocks.find(b => b.block_id === id);
                        return block ? (
                          <Badge key={id} variant="secondary" className="bg-white border border-blue-300 text-blue-800 font-medium px-3 py-1">
                            {block.block_name} ({block.total_area} acres)
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedFarmIds.length > 0 && (
                <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Block-wise Crop Planner Cards</p>
                    <p className="text-xs text-blue-700">Pick crop, pick cultivation master, then select farms as tags. Max 2 cards per row.</p>
                  </div>

                  <ScrollArea className="h-[420px] pr-3">
                    <div className="space-y-4">
                      {selectedFarmIds.map((blockId) => {
                        const block = apiBlocks.find((b) => b.block_id === blockId);
                        const cards = blockPlannerCards[blockId] || [];
                        if (!block) return null;

                        return (
                          <div key={blockId} className="rounded-lg border border-blue-200 bg-white p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="font-semibold text-slate-900">{block.block_name}</p>
                              <Badge variant="outline" className="border-blue-300 text-blue-800">{block.total_area} acres</Badge>
                            </div>

                            <div className="mb-3">
                              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => addPlannerCard(blockId)}>
                                <Plus className="h-4 w-4" /> Add Card
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {cards.map((card) => {
                                const cropTags = getCropTags(blockId, card.cropType);
                                const selectedArea = cropTags
                                  .filter((tag) => card.selectedFarmTags.includes(tag.id))
                                  .reduce((sum, tag) => sum + tag.area, 0);
                                return (
                                  <div key={card.id} className="rounded-md border border-slate-200 p-3">
                                    <div className="grid grid-cols-1 gap-2">
                                      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2">
                                        <div className="text-xs font-semibold text-slate-700">Block</div>
                                        <div className="text-right text-xs font-semibold text-slate-900">{block.block_name}</div>
                                        <div className="text-xs font-semibold text-slate-700">Total Land Area</div>
                                        <div className="text-right text-xs font-semibold text-slate-900">{block.total_area} acres</div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        <Select
                                          value={card.cropType || ''}
                                          onValueChange={(value) =>
                                            updatePlannerCard(blockId, card.id, {
                                              cropType: value as CropType,
                                              selectedFarmTags: [],
                                              selectNew: false,
                                              selectOld: false,
                                              selectAll: false,
                                            })
                                          }
                                          disabled={card.locked}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select crop type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="paddy">Paddy</SelectItem>
                                            <SelectItem value="ragi">Ragi</SelectItem>
                                            <SelectItem value="napier">Napier</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Select
                                          value={card.plannerId}
                                          onValueChange={(value) => updatePlannerCard(blockId, card.id, { plannerId: value })}
                                          disabled={card.locked}
                                        >
                                          <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select cultivation master" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {apiMasterPlans.map((plan) => (
                                              <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="rounded-md bg-slate-50 p-2">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <p className="text-xs font-semibold text-slate-700">Farms/Lands Tags</p>
                                          <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1 text-xs text-slate-700">
                                              <Checkbox checked={card.selectNew} onCheckedChange={(v) => applyLandFilter(blockId, card.id, 'new', !!v)} disabled={card.locked} />
                                              New
                                            </label>
                                            <label className="flex items-center gap-1 text-xs text-slate-700">
                                              <Checkbox checked={card.selectOld} onCheckedChange={(v) => applyLandFilter(blockId, card.id, 'old', !!v)} disabled={card.locked} />
                                              Old
                                            </label>
                                            <label className="flex items-center gap-1 text-xs text-slate-700">
                                              <Checkbox checked={card.selectAll} onCheckedChange={(v) => applyLandFilter(blockId, card.id, 'all', !!v)} disabled={card.locked} />
                                              All
                                            </label>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {cropTags.length === 0 ? (
                                            <span className="text-xs text-muted-foreground">
                                              {card.cropType ? 'No lands found for selected crop' : 'Select crop type to see tags'}
                                            </span>
                                          ) : (
                                            cropTags.map((tag) => (
                                              <button
                                                key={tag.id}
                                                type="button"
                                                disabled={card.locked || isTagUsedInOtherCard(blockId, card.id, tag.id)}
                                                onClick={() => toggleCardFarmTag(blockId, card.id, tag.id)}
                                                className={`rounded-full border px-2 py-1 text-xs ${
                                                  card.selectedFarmTags.includes(tag.id)
                                                    ? 'border-green-500 bg-green-100 text-green-800'
                                                    : isTagUsedInOtherCard(blockId, card.id, tag.id)
                                                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                      : tag.landType === 'new'
                                                        ? 'border-green-300 bg-green-50 text-green-800'
                                                        : 'border-yellow-300 bg-yellow-50 text-yellow-800'
                                                }`}
                                              >
                                                {tag.owner} - {tag.area} acres
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-xs font-semibold text-slate-700">Selected Area: {selectedArea.toFixed(2)} acres</span>
                                        <Button type="button" variant="outline" size="sm" onClick={() => removePlannerCard(blockId, card.id)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {cards.length === 0 && (
                                <div className="rounded-md border border-dashed border-slate-300 p-4 text-xs text-muted-foreground">
                                  No cards yet. Click + Add Card.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Select Rental Services</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between border-2 hover:border-blue-400 transition-colors"
                      disabled={!rentalServices.length}
                    >
                      <span className="truncate">
                        {selectedRentalServices.length
                          ? `${selectedRentalServices.length} selected`
                          : rentalServices.length
                            ? 'Choose rental services...'
                            : 'No rental services found'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
                    <DropdownMenuLabel>Rental Services</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {rentalServices.map((s) => (
                      <DropdownMenuCheckboxItem
                        key={s.id}
                        checked={selectedRentalServiceIds.includes(s.id)}
                        onCheckedChange={() => toggleRentalService(s.id)}
                      >
                        {s.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedRentalServices.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedRentalServices.map((s) => (
                      <Badge key={s.id} variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-300">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-semibold">
              Cancel
            </Button>
            <Button
              onClick={async () => {
                let selectedPlanForMeta: string | null = masterPlanId;
                // Validate based on plan mode
                if (planMode === 'zone') {
                  if (!selectedZoneId || !masterPlanId) {
                    toast.error('Please select a zone and master plan');
                    return;
                  }
                  // Use first block in zone as farmId for metadata
                  if (blocksInZone.length === 0) {
                    toast.error('No blocks found in selected zone');
                    return;
                  }
                  setFarmId(blocksInZone[0].block_id);
                } else {
                  if (selectedFarmIds.length === 0) {
                    toast.error('Please select at least one farm');
                    return;
                  }
                  const matrixPlanId = getFirstCardPlannerId();
                  if (!matrixPlanId) {
                    toast.error('Please configure at least one card with cultivation master');
                    return;
                  }
                  selectedPlanForMeta = matrixPlanId;
                  setMasterPlanId(matrixPlanId);
                  // Use first selected farm as farmId for metadata
                  setFarmId(selectedFarmIds[0]);
                }

                setPlanMetaLoading(true);
                setPlanMeta(null);
                try {
                  if (planMode === 'group') {
                    const cardsConfigured = selectedFarmIds.flatMap((blockId) =>
                      (blockPlannerCards[blockId] || []).map((card) => ({ ...card, blockId }))
                    ).filter((card) => card.plannerId && card.selectedFarmTags.length > 0);
                    if (cardsConfigured.length === 0) {
                      throw new Error('Please configure at least one card with planner and lands');
                    }
                    setBlockPlannerCards((prev) => {
                      const next: BlockPlannerCards = { ...prev };
                      selectedFarmIds.forEach((blockId) => {
                        next[blockId] = (prev[blockId] || []).map((c) => ({ ...c, locked: true }));
                      });
                      return next;
                    });
                    setDialogOpen(false);
                    setSelectionMode(true);
                    setDay0(null);
                    refreshCalendarFromCardViews(mappedByCard, blockPlannerCards);
                    toast.success('Group card setup complete! Use "Make Land Mapping" on each card.');
                  } else {
                    const blockIdForMeta = blocksInZone[0].block_id;
                    const resp = await fetch(`${BASE_URL}/admin_cultivation/plan_metadata_finder`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ block_id: blockIdForMeta, master_plan_id: selectedPlanForMeta })
                    });
                    if (!resp.ok) throw new Error('Failed to fetch plan metadata');
                    const data = await resp.json();
                    setPlanMeta(data);
                    setDialogOpen(false);
                    setSelectionMode(true);
                    setDay0(null);
                    setHighlighted({});
                    setHighlightCounts({});
                    setRawMappedData([]);
                    toast.success('Zone plan setup complete!');
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to load plan metadata');
                } finally {
                  setPlanMetaLoading(false);
                }
              }}
              disabled={
                planMetaLoading ||
                (planMode === 'zone'
                  ? (!selectedZoneId || !masterPlanId)
                  : selectedFarmIds.length === 0)
              }
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {planMetaLoading ? 'Loading...' : 'Continue to Calendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG: Live Plan Progress --- */}
      <Dialog
        open={livePlanProgressOpen}
        onOpenChange={(open) => {
          // Prevent accidental close while working
          if (savingPlan) return;
          setLivePlanProgressOpen(open);
          if (!open) {
            setLivePlanStep(1);
            setSavePlanStatus('idle');
            setAssignFarmsStatus('idle');
            setAssignContractFarmersStatus('idle');
            setAdjustRentalServicesStatus('idle');
            setLivePlanError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Publishing Live Plan</DialogTitle>
            <DialogDescription>
              Please wait while we save the plan and assign farms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1 */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="mt-0.5">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Step 1: Plan made and ready to save</div>
                <div className="text-sm text-muted-foreground">Ready</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <div className="mt-0.5">
                {savePlanStatus === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : savePlanStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : savePlanStatus === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">Step 2: Saving plan</div>
                <div className="text-sm text-muted-foreground">
                  {savePlanStatus === 'loading'
                    ? 'Saving plan…'
                    : savePlanStatus === 'success'
                      ? 'Plan saved'
                      : savePlanStatus === 'error'
                        ? 'Failed to save plan'
                        : 'Pending'}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <div className="mt-0.5">
                {assignFarmsStatus === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : assignFarmsStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : assignFarmsStatus === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">Step 3: Assigning farms</div>
                <div className="text-sm text-muted-foreground">
                  {assignFarmsStatus === 'loading'
                    ? 'Assigning farms…'
                    : assignFarmsStatus === 'success'
                      ? 'Farms assigned successfully'
                      : assignFarmsStatus === 'error'
                        ? 'Failed to assign farms'
                        : 'Pending'}
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <div className="mt-0.5">
                {assignContractFarmersStatus === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : assignContractFarmersStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : assignContractFarmersStatus === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">Step 4: Assigning contract farmers</div>
                <div className="text-sm text-muted-foreground">
                  {assignContractFarmersStatus === 'loading'
                    ? 'Assigning contract farmers…'
                    : assignContractFarmersStatus === 'success'
                      ? 'Contract farmers assigned successfully'
                      : assignContractFarmersStatus === 'error'
                        ? 'Failed to assign contract farmers'
                        : 'Pending'}
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <div className="mt-0.5">
                {adjustRentalServicesStatus === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : adjustRentalServicesStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : adjustRentalServicesStatus === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">Step 5: Adjusting rental services</div>
                <div className="text-sm text-muted-foreground">
                  {adjustRentalServicesStatus === 'loading'
                    ? 'Adjusting rental services…'
                    : adjustRentalServicesStatus === 'success'
                      ? 'Rental services adjusted successfully'
                      : adjustRentalServicesStatus === 'error'
                        ? 'Failed to adjust rental services'
                        : 'Pending'}
                </div>
              </div>
            </div>

            {livePlanError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {livePlanError}
              </div>
            )}
          </div>

          <DialogFooter>
            {adjustRentalServicesStatus === 'success' ? (
              <Button
                className="bg-green-700 hover:bg-green-800"
                onClick={() => {
                  setLivePlanProgressOpen(false);
                  navigate('/cultivation-plan');
                }}
              >
                Done
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setLivePlanProgressOpen(false)}
                disabled={savingPlan}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Show selected farm and master plan above the calendar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {farmId && (
          <span className="inline-flex items-center px-3 py-1 rounded bg-muted text-foreground text-sm font-medium">
            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
            {apiBlocks.find(b => b.block_id === farmId)?.block_name}
            {apiBlocks.find(b => b.block_id === farmId) && (
              <span className="ml-2 text-xs">{apiBlocks.find(b => b.block_id === farmId)?.total_area} acres</span>
            )}
          </span>
        )}
        {masterPlanId && (
          <span className="inline-flex items-center px-3 py-1 rounded bg-muted text-foreground text-sm font-medium">
            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
            {apiMasterPlans.find(p => p.id === masterPlanId)?.name}
          </span>
        )}

        {selectedRentalServices.length > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-muted text-foreground text-sm font-medium">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Rental Services:</span>
            <span className="font-semibold">
              {selectedRentalServices.length === 1
                ? selectedRentalServices[0].name
                : `${selectedRentalServices.length} selected`}
            </span>
          </span>
        )}

        {planMode === 'zone' && farmId && masterPlanId && !day0 && (
          <span className="text-muted-foreground text-xs animate-pulse font-semibold text-blue-600">
             &larr; Please click a date below to set Day 0
          </span>
        )}
        {planMode === 'group' && activeMappingCard && (
          <span className="text-muted-foreground text-xs animate-pulse font-semibold text-blue-600">
            &larr; Click a date on calendar to map selected card
          </span>
        )}
      </div>

      {planMode === 'group' && selectedFarmIds.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">Configured Cards Mapping</p>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {selectedFarmIds.flatMap((blockId) => {
                const block = apiBlocks.find((b) => b.block_id === blockId);
                const cards = blockPlannerCards[blockId] || [];
                if (!block || cards.length === 0) return [];
                return cards.map((card) => {
                  const selectedArea = (blockLandsById[blockId] || [])
                    .filter((land) => card.selectedFarmTags.includes(land.id))
                    .reduce((sum, land) => sum + Number(land.area || 0), 0);
                  const canMap = !!card.cropType && !!card.plannerId && card.selectedFarmTags.length > 0;
                  const isActive = activeMappingCard?.blockId === blockId && activeMappingCard?.cardId === card.id;
                  return (
                    <div
                      key={`map-card-${card.id}`}
                      className="w-[31%] min-w-[300px] max-w-[360px] shrink-0 rounded-lg border p-3"
                      style={{ backgroundColor: card.color, borderColor: '#c4b5fd' }}
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500"><LandPlot className="h-3.5 w-3.5" /> Block</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[170px]">{block.block_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500"><Wheat className="h-3.5 w-3.5" /> Total Area</span>
                          <span className="font-semibold text-slate-900">{block.total_area} ac</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500"><Sprout className="h-3.5 w-3.5" /> Crop</span>
                          <span className="font-semibold text-slate-900 uppercase">{card.cropType || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-slate-500"><UserSquare2 className="h-3.5 w-3.5" /> Master</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[170px]">{apiMasterPlans.find((p) => p.id === card.plannerId)?.name || '-'}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">Selected: {selectedArea.toFixed(2)} ac</div>
                      {card.mappedStartDate && <div className="mt-1 text-xs text-slate-600">Mapped: {card.mappedStartDate}</div>}

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => setActiveMappingCard(isActive ? null : { blockId, cardId: card.id })}
                          disabled={!canMap || card.mappingLocked || mappingCardLoading}
                        >
                          <Calendar className="mr-1 h-4 w-4" /> Map
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={card.showOnCalendar ? 'default' : 'outline'}
                          onClick={() => {
                            const nextCards: BlockPlannerCards = {
                              ...blockPlannerCards,
                              [blockId]: (blockPlannerCards[blockId] || []).map((c) =>
                                c.id === card.id ? { ...c, showOnCalendar: !c.showOnCalendar } : c
                              ),
                            };
                            setBlockPlannerCards(nextCards);
                            refreshCalendarFromCardViews(mappedByCard, nextCards);
                          }}
                          disabled={!mappedByCard[card.id]?.length}
                        >
                          {card.showOnCalendar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={card.mappingLocked ? 'default' : 'outline'}
                          onClick={() => {
                            const nextLocked = !card.mappingLocked;
                            setBlockPlannerCards((prev) => ({
                              ...prev,
                              [blockId]: (prev[blockId] || []).map((c) =>
                                c.id === card.id ? { ...c, mappingLocked: nextLocked } : c
                              ),
                            }));
                            if (nextLocked && activeMappingCard?.blockId === blockId && activeMappingCard?.cardId === card.id) {
                              setActiveMappingCard(null);
                            }
                          }}
                          disabled={!mappedByCard[card.id]?.length}
                        >
                          <Lock className="mr-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowBlockedDates((prev) => !prev)}
        >
          {showBlockedDates ? 'Hide Block Dates' : 'Show Block Dates'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {months.map((month) => (
          <MonthCalendar
            key={month.toISOString()}
            month={month}
            selectedDate={day0}
            onDateClick={planMetaLoading ? undefined : handleDayClick}
            isSelectionMode={selectionMode}
            highlighted={highlighted}
            highlightCounts={highlightCounts}
            highlightColors={highlightColors}
            highlightCardColors={highlightCardColors}
            blockedDates={showBlockedDates ? blockedDates : {}}
          />
        ))}
      </div>
    </div>
  );
};

export default CreateCultivationPlan;
