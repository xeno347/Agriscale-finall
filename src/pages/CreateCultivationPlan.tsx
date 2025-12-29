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
  Clock,           // New import
  AlertTriangle,   // New import
  CheckCircle2     // New import
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
  blockedDates?: { [date: string]: boolean };
}> = ({ month, selectedDate, onDateClick, isSelectionMode, highlighted, blockedDates }) => {
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
            const isBlocked = blockedDates && blockedDates[format(day, 'yyyy-MM-dd')];
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
                  ${highlight ? 'bg-green-100 border border-green-500' : ''}
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

  // --- New State for Activity Popup ---
  const [activityDetailsOpen, setActivityDetailsOpen] = useState(false);
  const [inspectedDate, setInspectedDate] = useState<Date | null>(null);
  const [inspectPresent, setInspectPresent] = useState<any[]>([]);
  const [inspectPending, setInspectPending] = useState<any[]>([]);
  const [rawMappedData, setRawMappedData] = useState<any[]>([]);

  // Add state for fetched master plans
  const [apiMasterPlans, setApiMasterPlans] = useState<{ id: string; name: string; plan_list: any[] }[]>([]);
  // Add state for fetched farms
  const [apiFarms, setApiFarms] = useState<{ farm_id: string; area: number; village: string }[]>([]);

  const navigate = useNavigate();

  // Fetch master plans from API on mount
  // Define your backend base URL here
  const BASE_URL = 'http://localhost:8000'; // <-- Change this to your backend URL if different

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

    // Fetch farms
    fetch(`${BASE_URL}/farmer_managment/get_farms`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.farms)) {
          const farms = data.farms.map((farm: any) => ({
            farm_id: farm.farm_id,
            area: farm.area,
            village: farm.land_data?.village || '',
          }));
          setApiFarms(farms);
        }
      })
      .catch(err => {
        console.error('Failed to fetch farms:', err);
      });
  }, []);

  // Helper to get selected master plan (from local demo data)
  const selectedMasterPlan = useMemo(() => demoMasterPlanners.find(p => p.id === masterPlanId), [masterPlanId]);

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
        highlights[format(activityDate, 'yyyy-MM-dd')] = activity.activityId || activity.name;
      }
    });
    return highlights;
  };

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

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const activityCategories = useMemo(
    () => Array.from(new Set(plannedActivities.map((a) => a.category))),
    [plannedActivities]
  );

  // Handle day click
  const handleDayClick = async (date: Date) => {
    // SCENARIO 1: Selecting the Start Date (Day 0)
    if (selectionMode && masterPlanId && !day0) {
      setDay0(date);

      // Call date mapping API
      try {
        const response = await fetch(`${BASE_URL}/admin_cultivation/date_mapping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_0_date: format(date, 'yyyy-MM-dd'),
            master_cultivation_plan_id: masterPlanId,
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch date mapping');
        const data = await response.json();
        
        if (data && Array.isArray(data.date_mapping)) {
          setRawMappedData(data.date_mapping); // Store for popup usage
          
          const highlights: { [date: string]: string } = {};
          data.date_mapping.forEach((item: any) => {
            if (item.date && item.activity) {
              highlights[item.date] = item.activity;
            }
          });
          setHighlighted(highlights);
          toast.success("Plan generated!");
        } else {
          setHighlighted({});
        }
      } catch (err) {
        setHighlighted({});
        console.error('Failed to fetch date mapping:', err);
      }
    } 
    // SCENARIO 2: Clicking a date AFTER plan is generated (Open Popup)
    else if (day0) {
        openActivityDetails(date);
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
        <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
          + Create Plan
        </Button>
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
              <label className="text-sm font-medium">Select Farm</label>
              <Select value={farmId ?? ''} onValueChange={setFarmId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a farm..." />
                </SelectTrigger>
                <SelectContent>
                  {apiFarms.map(farm => (
                    <SelectItem key={farm.farm_id} value={farm.farm_id}>
                      <span className="font-medium">{farm.farm_id}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{farm.area} acres</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{farm.village}</span>
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
              onClick={() => {
                setDialogOpen(false);
                setSelectionMode(true);
                // Reset previous selection data if any
                setDay0(null);
                setHighlighted({});
                setRawMappedData([]);
              }}
              disabled={!farmId || !masterPlanId}
            >
              Continue to Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG: Activity Details (New Feature) --- */}
      <Dialog open={activityDetailsOpen} onOpenChange={setActivityDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
               <Calendar className="w-5 h-5 text-primary" />
               Activities for {inspectedDate ? format(inspectedDate, 'PPP') : ''}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 py-4">
            <div className="space-y-6">
              
              {/* SECTION 1: PRESENT DAY ACTIVITIES */}
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-green-700 bg-green-50 p-2 rounded-lg">
                   <Clock className="w-4 h-4" /> Today's Tasks
                </h3>
                {inspectPresent.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
                    No activities scheduled for this specific date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inspectPresent.map((act, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                               <Sprout className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="font-medium text-sm">{act.activity}</p>
                               <p className="text-xs text-muted-foreground">Scheduled for today</p>
                            </div>
                         </div>
                         <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Scheduled</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: PENDING (PAST) ACTIVITIES */}
              <div>
                 <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-700 bg-amber-50 p-2 rounded-lg">
                   <AlertTriangle className="w-4 h-4" /> Pending Activities (Past)
                </h3>
                {inspectPending.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No pending activities from previous days.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inspectPending.map((act, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg gap-3">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                               <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="font-medium text-sm">{act.activity}</p>
                               <p className="text-xs text-red-500 font-medium">Due: {act.date}</p>
                            </div>
                         </div>
                         
                         {/* PRIORITY DROPDOWN */}
                         <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Priority:</span>
                            <Select defaultValue="low">
                              <SelectTrigger className="w-[110px] h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low" className="text-xs">Low</SelectItem>
                                <SelectItem value="medium" className="text-xs text-blue-600">Medium</SelectItem>
                                <SelectItem value="high" className="text-xs text-orange-600">High</SelectItem>
                                <SelectItem value="critical" className="text-xs text-red-600 font-bold">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setActivityDetailsOpen(false)}>Close</Button>
            <Button>Save Updates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show selected farm and master plan above the calendar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {farmId && (
          <span className="inline-flex items-center px-3 py-1 rounded bg-muted text-foreground text-sm font-medium">
            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
            {apiFarms.find(f => f.farm_id === farmId)?.farm_id}
            {apiFarms.find(f => f.farm_id === farmId) && (
              <span className="ml-2 text-xs">{apiFarms.find(f => f.farm_id === farmId)?.area} acres</span>
            )}
            {apiFarms.find(f => f.farm_id === farmId) && (
              <span className="ml-2 text-xs text-muted-foreground">{apiFarms.find(f => f.farm_id === farmId)?.village}</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {months.map((month) => (
          <MonthCalendar
            key={month.toISOString()}
            month={month}
            selectedDate={day0}
            onDateClick={handleDayClick}
            isSelectionMode={selectionMode}
            highlighted={highlighted}
            blockedDates={blockedDates}
          />
        ))}
      </div>
    </div>
  );
};

export default CreateCultivationPlan;