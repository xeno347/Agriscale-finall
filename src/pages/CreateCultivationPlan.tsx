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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area'; // New component
import getBaseUrl from '@/lib/config';

type LivePlanStepStatus = 'idle' | 'loading' | 'success' | 'error';

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
  blockedDates?: { [date: string]: boolean };
}> = ({ month, selectedDate, onDateClick, isSelectionMode, highlighted, highlightCounts, blockedDates }) => {
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
              >
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
  const [savingPlan, setSavingPlan] = useState(false);

  const [livePlanProgressOpen, setLivePlanProgressOpen] = useState(false);
  const [livePlanStep, setLivePlanStep] = useState<1 | 2 | 3>(1);
  const [savePlanStatus, setSavePlanStatus] = useState<LivePlanStepStatus>('idle');
  const [assignFarmsStatus, setAssignFarmsStatus] = useState<LivePlanStepStatus>('idle');
  const [livePlanError, setLivePlanError] = useState<string | null>(null);

  // --- State for mapped data (no popup) ---
  const [rawMappedData, setRawMappedData] = useState<any[]>([]);

  // Add state for fetched master plans
  const [apiMasterPlans, setApiMasterPlans] = useState<{ id: string; name: string; plan_list: any[] }[]>([]);
  // Add state for fetched blocks
  const [apiBlocks, setApiBlocks] = useState<{ block_id: string; block_name: string; total_area: number }[]>([]);

  // Plan metadata state and loading
  const [planMetaLoading, setPlanMetaLoading] = useState(false);
  const [planMeta, setPlanMeta] = useState<{ average_work_quantity_per_day: number; total_area: number; day_per_task: number } | null>(null);

  const navigate = useNavigate();

  // Fetch master plans from API on mount
  const BASE_URL = getBaseUrl(); // <-- Use shared config

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
  }, []);

  // Helper to get selected master plan from API data
  const selectedApiMasterPlan = useMemo(() => {
    if (!masterPlanId) return null;
    return apiMasterPlans.find((p) => p.id === masterPlanId) || null;
  }, [apiMasterPlans, masterPlanId]);

  // Calculate average work quantity for all activities in the selected API master plan
  const avgWorkQty = useMemo(() => {
    if (!selectedApiMasterPlan || !selectedApiMasterPlan.plan_list || !selectedApiMasterPlan.plan_list.length) return null;
    // Try to find a numeric workQty property in each activity
    const total = selectedApiMasterPlan.plan_list.reduce((sum: number, act: any) => sum + (Number(act.workQty) || 0), 0);
    return (total / selectedApiMasterPlan.plan_list.length).toFixed(2);
  }, [selectedApiMasterPlan]);

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
    if (!rawMappedData.length) {
      toast.error('Generate the plan mapping before saving.');
      return;
    }

    try {
      setSavingPlan(true);
      setLivePlanError(null);
      setLivePlanStep(1);
      setSavePlanStatus('idle');
      setAssignFarmsStatus('idle');
      setLivePlanProgressOpen(true);

      const base = BASE_URL.replace(/\/$/, '');
      const payload = {
        plan_id: masterPlanId,
        block_id: farmId,
        date_mapping: rawMappedData,
      };

      // Step 1: Plan made and ready (no work needed)
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
      toast.success('Plan saved and farms assigned successfully!');
    } catch (err) {
      console.error('Failed to save plan:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setLivePlanError(message);
      if (livePlanStep === 2) setSavePlanStatus('error');
      if (livePlanStep === 3) setAssignFarmsStatus('error');
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

  // Handle day click: always remap activities and highlight, no popup
  const handleDayClick = async (date: Date) => {
    if (selectionMode && masterPlanId) {
      setDay0(date);
      try {
        const response = await fetch(`${BASE_URL}/admin_cultivation/date_mapping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_0_date: format(date, 'yyyy-MM-dd'),
            master_cultivation_plan_id: masterPlanId,
            day_per_task: planMeta?.day_per_task ?? 1,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch date mapping');
        const data = await response.json();
        if (data && Array.isArray(data.date_mapping)) {
          setRawMappedData(data.date_mapping);
          const highlights: { [date: string]: string } = {};
          const counts: { [date: string]: number } = {};
          data.date_mapping.forEach((item: any) => {
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

  // Generate random blocked dates for demo
  const blockedDates = useMemo(() => {
    const result: { [date: string]: boolean } = {};
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const offset = Math.floor(Math.random() * 365);
      const d = addDays(today, offset);
      result[format(d, 'yyyy-MM-dd')] = true;
    }
    return result;
  }, []);

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
          <span className="text-2xl font-bold text-blue-700">{planMetaLoading ? 'Loading...' : (avgWorkQty !== null ? avgWorkQty : '--')}</span>
        </div>
      </div>

      {/* --- DIALOG: Select Farm/Plan --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Cultivation Plan</DialogTitle>
            <DialogDescription>Select a farm and master plan to begin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Block</label>
              <Select value={farmId ?? ''} onValueChange={setFarmId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a block..." />
                </SelectTrigger>
                <SelectContent>
                  {apiBlocks.map(block => (
                    <SelectItem key={block.block_id} value={block.block_id}>
                      <span className="font-medium">{block.block_name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{block.total_area} acres</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Master Plan</label>
              <Select value={masterPlanId ?? ''} onValueChange={setMasterPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a master plan..." />
                </SelectTrigger>
                <SelectContent>
                  {apiMasterPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <span>{plan.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{plan.plan_list.length} activities</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!farmId || !masterPlanId) return;
                setPlanMetaLoading(true);
                setPlanMeta(null);
                try {
                  const resp = await fetch(`${BASE_URL}/admin_cultivation/plan_metadata_finder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block_id: farmId, master_plan_id: masterPlanId })
                  });
                  if (!resp.ok) throw new Error('Failed to fetch plan metadata');
                  const data = await resp.json();
                  setPlanMeta(data);
                  setDialogOpen(false);
                  setSelectionMode(true);
                  // Reset previous selection data if any
                  setDay0(null);
                  setHighlighted({});
                  setHighlightCounts({});
                  setRawMappedData([]);
                } catch (err) {
                  toast.error('Failed to load plan metadata');
                } finally {
                  setPlanMetaLoading(false);
                }
              }}
              disabled={!farmId || !masterPlanId || planMetaLoading}
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

            {livePlanError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {livePlanError}
              </div>
            )}
          </div>

          <DialogFooter>
            {assignFarmsStatus === 'success' ? (
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
        {farmId && masterPlanId && !day0 && (
          <span className="text-muted-foreground text-xs animate-pulse font-semibold text-blue-600">
             &larr; Please click a date below to set Day 0
          </span>
        )}
      </div>

      {/* Legend for overlap colors */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-green-500 bg-green-100" aria-label="1 task per day" />
          <span>Light green: 1 task on the date</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-green-700 bg-green-400" aria-label="2 tasks per day" />
          <span>Darker green: 2 tasks on the date</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-orange-500 bg-orange-100" aria-label=">2 tasks per day" />
          <span>Orange: 3-5 tasks on the date</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded border border-red-600 bg-red-200" aria-label=">5 tasks per day" />
          <span>Dark red: 6+ tasks on the date</span>
        </div>
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
            blockedDates={blockedDates}
          />
        ))}
      </div>
    </div>
  );
};

export default CreateCultivationPlan;