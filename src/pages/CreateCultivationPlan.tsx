import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  isToday,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';
import {
  Calendar,
  Save,
  X,
  Sprout,
  Layers,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
  Plus,
  Lock,
  Eye,
  EyeOff,
  LandPlot,
  UserSquare2,
  Wheat,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
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
import ResourceAllocationPanel from '@/components/cultivation/ResourceAllocationPanel';
import { fetchLands, findAmritAgrotech } from '@/components/land/api';
import type { Land } from '@/components/land/types';

type LivePlanStepStatus = 'idle' | 'loading' | 'success' | 'error';
type CardSaveStatus = 'pending' | 'assigning' | 'saving' | 'done' | 'error';

type RentalServiceOption = {
  id: string;
  name: string;
  isLive: boolean;
};

type CropPlannerCard = {
  id: string;
  landIds: string[];
  plannerId: string;
  color: string;
  mappedStartDate?: string;
  showOnCalendar: boolean;
  mappingLocked: boolean;
  locked: boolean;
};

const landLabel = (land: Land) =>
  [land.land_data.village, land.land_data.district].filter(Boolean).join(', ') || land.farm_id;

// ============================================================================
// MONTH CALENDAR COMPONENT (single large month)
// ============================================================================

const MonthCalendar: React.FC<{
  month: Date;
  selectedDate: Date | null;
  onDateClick?: (date: Date) => void;
  isSelectionMode?: boolean;
  highlighted?: { [date: string]: string };
  hoverDetailsByDate?: {
    [date: string]: Array<{ cardLabel: string; acres: number; color: string; activities: string[] }>;
  };
}> = ({ month, selectedDate, onDateClick, isSelectionMode, highlighted, hoverDetailsByDate }) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptySlots = Array(startDayOfWeek).fill(null);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MAX_VISIBLE_CARDS = 3;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="min-h-32 rounded-lg" />
        ))}
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isPast = isBefore(day, startOfDay(new Date()));
          const today = isToday(day);
          const cardDetails = hoverDetailsByDate ? (hoverDetailsByDate[dateKey] || []) : [];
          const fallbackLabel = !cardDetails.length && highlighted ? highlighted[dateKey] : undefined;
          const hasActivity = cardDetails.length > 0 || !!fallbackLabel;
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick && onDateClick(day)}
              className={cn(
                'min-h-32 rounded-lg border p-2 text-left align-top transition-all overflow-hidden',
                (isSelectionMode || hasActivity) ? 'cursor-pointer hover:bg-emerald-50' : 'cursor-default',
                isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-1'
                  : 'border-slate-200 bg-white',
                today && !isSelected ? 'ring-1 ring-emerald-400' : '',
                isPast && !isSelected ? 'text-muted-foreground/50' : ''
              )}
            >
              <span className="block text-sm font-semibold">{format(day, 'd')}</span>
              {cardDetails.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {cardDetails.slice(0, MAX_VISIBLE_CARDS).map((d, idx) => (
                    <div
                      key={`${dateKey}-pill-${idx}`}
                      className="truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: d.color }}
                      title={`${d.cardLabel} — ${d.activities.join(', ')} (${d.acres.toFixed(2)} ac)`}
                    >
                      {d.activities.join(', ')}
                    </div>
                  ))}
                  {cardDetails.length > MAX_VISIBLE_CARDS && (
                    <span className="text-[10px] font-bold text-slate-500">
                      +{cardDetails.length - MAX_VISIBLE_CARDS} more
                    </span>
                  )}
                </div>
              )}
              {fallbackLabel && (
                <div className="mt-1.5 truncate rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {fallbackLabel}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreateCultivationPlan: React.FC = () => {
  // --- New State for Dialog/Selections ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [masterPlanId, setMasterPlanId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [day0, setDay0] = useState<Date | null>(null);
  const [highlighted, setHighlighted] = useState<{ [date: string]: string }>({});
  const [hoverDetailsByDate, setHoverDetailsByDate] = useState<{
    [date: string]: Array<{ cardLabel: string; acres: number; color: string; activities: string[] }>;
  }>({});
  const [mappedByCard, setMappedByCard] = useState<Record<string, any[]>>({});
  const [mappedByCardRaw, setMappedByCardRaw] = useState<Record<string, any[]>>({});
  const [activeMappingCard, setActiveMappingCard] = useState<string | null>(null);
  const [mappingCardLoading, setMappingCardLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(() => startOfMonth(new Date()));

  const [livePlanUiRunning, setLivePlanUiRunning] = useState(false);
  const [livePlanUiCardIndex, setLivePlanUiCardIndex] = useState<number>(-1);
  const [livePlanUiStage, setLivePlanUiStage] = useState<'idle' | 'assigning' | 'saving' | 'done'>('idle');
  const [livePlanUiDescription, setLivePlanUiDescription] = useState<string>('Ready to start saving plan.');
  const [livePlanUiSavedAcres, setLivePlanUiSavedAcres] = useState<number>(0);
  const [livePlanProgressOpen, setLivePlanProgressOpen] = useState(false);
  const [livePlanStep, setLivePlanStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [savePlanStatus, setSavePlanStatus] = useState<LivePlanStepStatus>('idle');
  const [assignFarmsStatus, setAssignFarmsStatus] = useState<LivePlanStepStatus>('idle');
  const [assignContractFarmersStatus, setAssignContractFarmersStatus] = useState<LivePlanStepStatus>('idle');
  const [adjustRentalServicesStatus, setAdjustRentalServicesStatus] = useState<LivePlanStepStatus>('idle');
  const [livePlanError, setLivePlanError] = useState<string | null>(null);
  const [resourcePanelOpen, setResourcePanelOpen] = useState(false);
  const [saveFlowCards, setSaveFlowCards] = useState<Array<{
    id: string;
    label: string;
    acres: number;
    status: CardSaveStatus;
    landLabel: string;
    masterName: string;
    color: string;
    farmIds: string[];
    planId: string;
    dateMapping: any[];
  }>>([]);
  const [saveFlowDescription, setSaveFlowDescription] = useState<string>('Preparing save flow...');
  const [saveFlowTotalAcres, setSaveFlowTotalAcres] = useState<number>(0);
  const [saveFlowSavedAcres, setSaveFlowSavedAcres] = useState<number>(0);

  // --- State for mapped data (no popup) ---
  const [rawMappedData, setRawMappedData] = useState<any[]>([]);

  // Add state for fetched master plans (pre-filtered to Napier below)
  const [apiMasterPlans, setApiMasterPlans] = useState<{ id: string; name: string; plan_list: any[] }[]>([]);
  // AmritAgrotech's lands — replaces the old block/zone hierarchy
  const [amritFarmerId, setAmritFarmerId] = useState<string | null>(null);
  const [lands, setLands] = useState<Land[]>([]);
  const [plannerCards, setPlannerCards] = useState<CropPlannerCard[]>([]);
  const usedLandIds = useMemo(
    () => Array.from(new Set(plannerCards.flatMap((c) => c.landIds))),
    [plannerCards]
  );

  // Rental services (multi-select)
  const [rentalServices, setRentalServices] = useState<RentalServiceOption[]>([]);
  const [selectedRentalServiceIds, setSelectedRentalServiceIds] = useState<string[]>([]);

  const navigate = useNavigate();

  // Fetch master plans from API on mount
  const BASE_URL = getBaseUrl(); // <-- Use shared config
  const CARD_LIGHT_TINTS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fee2e2', '#f3e8ff', '#e0f2fe', '#ecfccb', '#ffe4e6'];

  const addPlannerCard = () => {
    setPlannerCards((prev) => {
      const newCard: CropPlannerCard = {
        id: `card-${Date.now()}-${Math.random()}`,
        landIds: [],
        plannerId: '',
        color: CARD_LIGHT_TINTS[prev.length % CARD_LIGHT_TINTS.length],
        showOnCalendar: false,
        mappingLocked: false,
        locked: false,
      };
      return [...prev, newCard];
    });
  };

  const updatePlannerCard = (cardId: string, patch: Partial<CropPlannerCard>) => {
    setPlannerCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, ...patch } : card)));
  };

  const removePlannerCard = (cardId: string) => {
    setPlannerCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const isLandUsedInOtherCard = (cardId: string, landId: string) => {
    return plannerCards.some((card) => card.id !== cardId && card.landIds.includes(landId));
  };

  const toggleCardLand = (cardId: string, landId: string) => {
    setPlannerCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const exists = card.landIds.includes(landId);
        return {
          ...card,
          landIds: exists ? card.landIds.filter((id) => id !== landId) : [...card.landIds, landId],
        };
      })
    );
  };

  const getFirstCardPlannerId = () => {
    const matched = plannerCards.find((card) => !!card.plannerId);
    return matched?.plannerId || null;
  };

  useEffect(() => {
    // Load AmritAgrotech's lands (replaces the old block/zone hierarchy)
    (async () => {
      try {
        const farmer = await findAmritAgrotech();
        if (!farmer) return;
        setAmritFarmerId(farmer.farmer_id);
        const fetchedLands = await fetchLands(farmer.farmer_id);
        setLands(fetchedLands);
      } catch (err) {
        console.error('Failed to fetch AmritAgrotech lands:', err);
      }
    })();

    fetch(`${BASE_URL}/admin_cultivation/get_master_cultivation_plans`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (data && data.plan) {
          const plans = Object.entries(data.plan)
            .map(([id, plan]: any) => ({
              id,
              name: plan.plan_name,
              plan_list: plan.plan_list || [],
              crop_type: String(plan.crop_type || '').toLowerCase(),
            }))
            .filter((p) => p.crop_type === 'napier');
          setApiMasterPlans(plans);
        }
      })
      .catch(err => {
        console.error('Failed to fetch master plans:', err);
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

  // --- Activity details inspection state (used by openActivityDetails) ---
  const [activityDetailsOpen, setActivityDetailsOpen] = useState(false);
  const [inspectedDate, setInspectedDate] = useState<Date | null>(null);
  const [inspectPresent, setInspectPresent] = useState<any[]>([]);
  const [inspectPending, setInspectPending] = useState<any[]>([]);

  const handleSaveLivePlan = async () => {
    const cards = plannerCards
      .map((card, idx) => {
        const cardLands = lands.filter((l) => card.landIds.includes(l.farm_id));
        const acres = cardLands.reduce((sum, l) => sum + Number(l.area || 0), 0);
        const label = cardLands.map(landLabel).join(', ');
        return {
          id: card.id,
          label: `${label || 'Land'} - Card ${idx + 1}`,
          acres: Number(acres.toFixed(2)),
          status: 'pending' as CardSaveStatus,
          landLabel: label || '-',
          masterName: apiMasterPlans.find((p) => p.id === card.plannerId)?.name || '-',
          color: card.color || '#f8fafc',
          farmIds: [...card.landIds],
          planId: String(card.plannerId || ''),
          dateMapping: Array.isArray(mappedByCardRaw[card.id]) ? mappedByCardRaw[card.id] : (Array.isArray(mappedByCard[card.id]) ? mappedByCard[card.id] : []),
        };
      })
      .filter((c) => c.acres > 0 && c.planId && c.farmIds.length > 0 && c.dateMapping.length > 0);

    if (cards.length === 0) {
      toast.error('No mapped cards found to save. Please map cards first.');
      return;
    }

    const total = Number(cards.reduce((sum, c) => sum + c.acres, 0).toFixed(2));
    setSaveFlowCards(cards);
    setSaveFlowTotalAcres(total);
    setSaveFlowSavedAcres(0);
    setSaveFlowDescription('Preparing planner save queue...');
    setLivePlanProgressOpen(true);
    setSavingPlan(true);
    setLivePlanError(null);

    let saved = 0;
    const base = BASE_URL.replace(/\/$/, '');

    for (const card of cards) {
      try {
        setSaveFlowCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'saving' } : c)));
        setSaveFlowDescription(`Saving plan for ${card.acres} acres`);

        const payload = {
          farm_id: card.farmIds,
          date_mapping: card.dateMapping,
          plan_id: card.planId,
        };

        const saveResp = await fetch(`${base}/admin_cultivation/save_plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!saveResp.ok) throw new Error(`Save plan failed for ${card.label}`);
        const saveBody = await saveResp.json();
        if (!(saveBody && saveBody.status === 'success')) {
          throw new Error(`Save plan returned non-success for ${card.label}`);
        }

        saved += card.acres;
        setSaveFlowSavedAcres(Number(saved.toFixed(2)));
        setSaveFlowCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'done' } : c)));
      } catch (error) {
        setSaveFlowCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'error' } : c)));
        setLivePlanError(error instanceof Error ? error.message : 'Failed during card save flow');
        setSavingPlan(false);
        toast.error(error instanceof Error ? error.message : 'Failed during card save flow');
        return;
      }
    }

    setSaveFlowDescription('All card plans saved successfully.');
    setSavingPlan(false);
  };

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const getTotalAreaForDateMapping = () => {
    const total = usedLandIds.reduce((sum, id) => {
      const land = lands.find((l) => l.farm_id === id);
      return sum + Number(land?.area || 0);
    }, 0);
    return Number(total.toFixed(2));
  };

  const setCalendarFromMappings = (source: Record<string, any[]>, selectedCardIds: string[]) => {
    const mappedEntries =
      selectedCardIds.length === 0
        ? Object.values(source).flat()
        : selectedCardIds.flatMap((id) => source[id] || []);

    setRawMappedData(mappedEntries);
    const highlights: { [date: string]: string } = {};
    const hoverByDate: {
      [date: string]: Record<string, { cardLabel: string; acres: number; color: string; activities: Set<string> }>;
    } = {};
    mappedEntries.forEach((item: any) => {
      if (!item || !item.date || !item.activity) return;
      const dates = Array.isArray(item.date) ? item.date : [item.date];
      dates.forEach((d: string) => {
        if (!d) return;
        highlights[d] = highlights[d] || item.activity;
        if (!hoverByDate[d]) hoverByDate[d] = {};
        const key = String(item.card_id || 'unknown');
        if (!hoverByDate[d][key]) {
          hoverByDate[d][key] = {
            cardLabel: String(item.card_label || `Card ${key}`),
            acres: Number(item.selected_area || 0),
            color: String(item.card_color || '#94a3b8'),
            activities: new Set<string>(),
          };
        }
        hoverByDate[d][key].activities.add(String(item.activity));
      });
    });
    setHighlighted(highlights);
    setHoverDetailsByDate(
      Object.fromEntries(
        Object.entries(hoverByDate).map(([date, byCard]) => [
          date,
          Object.values(byCard).map((entry) => ({
            cardLabel: entry.cardLabel,
            acres: entry.acres,
            color: entry.color,
            activities: Array.from(entry.activities),
          })),
        ])
      )
    );
  };

  const refreshCalendarFromCardViews = (source: Record<string, any[]>, cardsSource: CropPlannerCard[]) => {
    const selectedIds = cardsSource.filter((card) => card.showOnCalendar).map((card) => card.id);
    setCalendarFromMappings(source, selectedIds);
  };

  const handleMapSingleCard = async (cardId: string, day0Date: string) => {
    const card = plannerCards.find((c) => c.id === cardId);
    if (!card) throw new Error('Card not found');
    if (!card.landIds.length) throw new Error('Select at least one land');
    if (!card.plannerId) throw new Error('Select master cultivation first');
    if (!day0Date) throw new Error('Select a start date');

    setMappingCardLoading(true);
    try {
      const cardLands = lands.filter((land) => card.landIds.includes(land.farm_id));
      const totalArea = cardLands.reduce((sum, land) => sum + Number(land.area || 0), 0);
      const label = cardLands.map(landLabel).join(', ');

      const mapResp = await fetch(`${BASE_URL}/admin_cultivation/date_mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_0_date: day0Date,
          master_cultivation_plan_id: card.plannerId,
          total_area: Number(totalArea.toFixed(2)),
        }),
      });
      if (!mapResp.ok) throw new Error('Failed to fetch date mapping');
      const mapData = await mapResp.json();

      const rawList = Array.isArray(mapData?.date_mapping) ? mapData.date_mapping : [];
      const enriched = rawList.map((item: any) => ({
        ...item,
        card_id: card.id,
        card_label: `${label || 'Land'} - NAPIER`,
        card_color: card.color,
        selected_area: Number(totalArea.toFixed(2)),
        farm_ids: card.landIds,
        crop_type: 'napier',
      }));

      const nextMapped = { ...mappedByCard, [card.id]: enriched };
      setMappedByCard(nextMapped);
      setMappedByCardRaw((prev) => ({ ...prev, [card.id]: rawList }));
      const nextCards = plannerCards.map((c) =>
        c.id === cardId ? { ...c, mappedStartDate: day0Date, showOnCalendar: true } : c
      );
      setPlannerCards(nextCards);
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
      if (activeMappingCard) {
        try {
          await handleMapSingleCard(activeMappingCard, format(date, 'yyyy-MM-dd'));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to map selected card');
        }
        return;
      }
      if (Object.keys(mappedByCard).length > 0) {
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
          }),
        });
        if (!response.ok) throw new Error('Failed to fetch date mapping');
        const data = await response.json();
        if (data && Array.isArray(data.date_mapping)) {
          setRawMappedData(data.date_mapping);
          const highlights: { [date: string]: string } = {};
          data.date_mapping.forEach((item: any) => {
            if (!item || !item.date || !item.activity) return;
            const dates = Array.isArray(item.date) ? item.date : [item.date];
            dates.forEach((d: string) => {
              if (!d) return;
              highlights[d] = highlights[d] || item.activity;
            });
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

  const goToPrevMonth = () => setCalendarViewMonth((m) => addMonths(m, -1));
  const goToNextMonth = () => setCalendarViewMonth((m) => addMonths(m, 1));

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cultivation Plan</h1>
          {day0 && <p className="text-muted-foreground mt-1 text-sm">Start Date: {format(day0, 'PPP')}</p>}
        </div>
        <div className="flex items-center gap-3">
          {(day0 || Object.keys(mappedByCard).length > 0) && (
            <Button
              size="lg"
              className="gap-2 px-8 py-3 text-white font-extrabold text-lg bg-gradient-to-r from-green-600 via-emerald-500 to-lime-500 shadow-lg shadow-green-300/40 border-2 border-green-700 ring-4 ring-green-200 focus:ring-green-400 focus:outline-none transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-green-700 hover:to-lime-600"
              onClick={handleSaveLivePlan}
              disabled={savingPlan}
            >
              <CircleDot className="h-6 w-6 animate-pulse text-white drop-shadow" />
              Live Plan
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2">
            + Create Plan
          </Button>
        </div>
      </div>

      {/* --- DIALOG: Select Farm/Plan with Tabs --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto border-0 shadow-2xl">
          <div className="-m-6 mb-4 rounded-t-lg bg-emerald-700 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                <Sprout className="h-6 w-6" />
                Create Cultivation Plan
              </DialogTitle>
              <DialogDescription className="text-white/80">
                Pick your lands, configure planner cards, and set a start date.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 mt-2">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <Layers className="h-4 w-4" /> Crop Planner Cards
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  onClick={() => addPlannerCard()}
                >
                  <Plus className="h-4 w-4" /> Add Card
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                For each card: pick one or more lands and a Napier cultivation master, then set a start date.
              </p>

              {plannerCards.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500">
                  No cards yet. Click "Add Card" to start planning.
                </div>
              ) : (
                <ScrollArea className="h-[460px] pr-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plannerCards.map((card) => {
                      const cardLands = lands.filter((l) => card.landIds.includes(l.farm_id));
                      const selectedArea = cardLands.reduce((sum, l) => sum + Number(l.area || 0), 0);

                      return (
                        <div key={card.id} className="rounded-xl border border-gray-200 p-3 bg-white">
                          <div className="grid grid-cols-1 gap-2">
                            {/* Step 1: Lands */}
                            <div className="rounded-lg bg-white border border-gray-200 p-2">
                              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-700">
                                <LandPlot className="h-3.5 w-3.5" /> Select Land(s)
                              </p>
                              {lands.length === 0 ? (
                                <p className="px-1 py-2 text-xs text-muted-foreground">No lands found for AmritAgrotech</p>
                              ) : (
                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-emerald-700 text-white">
                                        <th className="px-2 py-1.5 text-left font-semibold">Land</th>
                                        <th className="px-2 py-1.5 text-left font-semibold">Area</th>
                                        <th className="px-2 py-1.5 text-left font-semibold">Plots</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {lands.map((land) => {
                                        const selected = card.landIds.includes(land.farm_id);
                                        const usedElsewhere = isLandUsedInOtherCard(card.id, land.farm_id);
                                        const disabled = card.locked || usedElsewhere;
                                        return (
                                          <tr
                                            key={land.farm_id}
                                            onClick={() => !disabled && toggleCardLand(card.id, land.farm_id)}
                                            className={`transition-colors ${
                                              disabled
                                                ? 'opacity-40 cursor-not-allowed'
                                                : selected
                                                  ? 'bg-emerald-50 cursor-pointer'
                                                  : 'cursor-pointer hover:bg-emerald-50/60'
                                            }`}
                                          >
                                            <td className="px-2 py-1.5 font-medium text-slate-800">
                                              <span className="flex items-center gap-1">
                                                {selected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                                                {landLabel(land)}
                                              </span>
                                              <div className="text-[10px] text-slate-400">{land.farm_id}</div>
                                            </td>
                                            <td className="px-2 py-1.5 font-semibold text-slate-700">{land.area} ac</td>
                                            <td className="px-2 py-1.5 text-slate-600">
                                              {(land.land_plots ?? []).length > 0
                                                ? `${(land.land_plots ?? []).length} plot${(land.land_plots ?? []).length === 1 ? '' : 's'}`
                                                : '—'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Step 2: Master Plan (Napier only) */}
                            {apiMasterPlans.length === 0 ? (
                              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                  No Napier cultivation master plan exists yet. Create one in{' '}
                                  <span className="font-semibold">Cultivation Master &rarr; Cultivation Setup</span>{' '}
                                  (tag it as Napier) before it can be selected here.
                                </span>
                              </div>
                            ) : (
                              <div className="relative">
                                <Calendar className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-700" />
                                <Select
                                  value={card.plannerId}
                                  onValueChange={(value) => updatePlannerCard(card.id, { plannerId: value })}
                                  disabled={card.locked || card.landIds.length === 0}
                                >
                                  <SelectTrigger className="h-9 border border-gray-300 pl-8">
                                    <SelectValue placeholder="Select cultivation master (Napier)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {apiMasterPlans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              <Badge className="bg-emerald-700 text-white border-0">
                                Selected Area: {selectedArea.toFixed(2)} acres
                              </Badge>
                              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => removePlannerCard(card.id)}>
                                <X className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="font-semibold gap-1">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              onClick={async () => {
                if (usedLandIds.length === 0) {
                  toast.error('Please add at least one card and select a land');
                  return;
                }
                const matrixPlanId = getFirstCardPlannerId();
                if (!matrixPlanId) {
                  toast.error('Please configure at least one card with cultivation master');
                  return;
                }
                setMasterPlanId(matrixPlanId);

                const cardsConfigured = plannerCards.filter(
                  (card) => card.landIds.length > 0 && card.plannerId
                );
                if (cardsConfigured.length === 0) {
                  toast.error('Please configure at least one card with planner and lands');
                  return;
                }
                const lockedCards = plannerCards.map((c) => ({ ...c, locked: true }));
                setPlannerCards(lockedCards);
                setDialogOpen(false);
                setSelectionMode(true);
                setDay0(null);
                refreshCalendarFromCardViews(mappedByCard, lockedCards);
                toast.success('Group card setup complete! Use "Make Land Mapping" on each card.');
              }}
              disabled={usedLandIds.length === 0}
              className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6"
            >
              <CheckCircle2 className="h-4 w-4" />
              Continue to Calendar
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
            <DialogTitle className="text-xl font-bold">Saving Plan</DialogTitle>
            <DialogDescription>
              Card-wise save progress (UI flow only).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">
                Making planner for total selected area: {saveFlowTotalAcres.toFixed(2)} acres
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Card View</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {saveFlowCards.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border p-2 text-xs"
                    style={{
                      backgroundColor: c.color,
                      borderColor:
                        c.status === 'done'
                          ? '#22c55e'
                          : c.status === 'error'
                            ? '#ef4444'
                          : c.status === 'saving' || c.status === 'assigning'
                            ? '#3b82f6'
                            : '#94a3b8',
                      color: '#1f2937',
                    }}
                  >
                    <div className="rounded bg-white/70 p-2">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className="font-medium text-slate-700">Land</span>
                        <span className="text-right font-bold text-slate-900 truncate">{c.landLabel || '-'}</span>
                        <span className="font-medium text-slate-700">Crop</span>
                        <span className="text-right font-bold text-slate-900">NAPIER</span>
                        <span className="font-medium text-slate-700">Master</span>
                        <span className="text-right font-bold text-slate-900 truncate">{c.masterName || '-'}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-right font-semibold">Selected: {c.acres} ac</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm text-slate-700">{saveFlowDescription}</div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Progress</span>
                <span className="font-semibold text-slate-900">
                  {saveFlowTotalAcres > 0 ? Math.round((saveFlowSavedAcres / saveFlowTotalAcres) * 100) : 0}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${saveFlowTotalAcres > 0 ? (saveFlowSavedAcres / saveFlowTotalAcres) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-600">
                {saveFlowSavedAcres.toFixed(2)} / {saveFlowTotalAcres.toFixed(2)} acres saved
              </div>
            </div>
          </div>

          <div className="hidden space-y-4 py-2">
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
            {!savingPlan && saveFlowTotalAcres > 0 && saveFlowSavedAcres >= saveFlowTotalAcres ? (
              <Button
                className="bg-green-700 hover:bg-green-800"
                onClick={() => {
                  setLivePlanProgressOpen(false);
                  toast.success('UI save flow completed.');
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


      {/* Show selected lands and master plan above the calendar */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {usedLandIds.length > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded bg-muted text-foreground text-sm font-medium">
            <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
            {usedLandIds
              .map((id) => lands.find((l) => l.farm_id === id))
              .filter((l): l is Land => !!l)
              .map(landLabel)
              .join(', ')}
            <span className="ml-2 text-xs">{getTotalAreaForDateMapping()} acres</span>
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

        {activeMappingCard && (
          <span className="text-muted-foreground text-xs animate-pulse font-semibold text-blue-600">
            &larr; Click a date on calendar to map selected card
          </span>
        )}
      </div>

      {plannerCards.length > 0 && (
        <Card className="mb-4 overflow-hidden rounded-xl border-0 shadow-md">
          <div className="flex items-center gap-2 bg-emerald-700 px-4 py-3">
            <Layers className="h-4 w-4 text-white" />
            <CardTitle className="text-sm font-bold text-white">Configured Cards Mapping</CardTitle>
          </div>
          <CardContent className="overflow-x-auto p-4">
            <div className="flex gap-3 min-w-max">
              {plannerCards.map((card) => {
                const cardLands = lands.filter((l) => card.landIds.includes(l.farm_id));
                if (cardLands.length === 0) return null;
                const selectedArea = cardLands.reduce((sum, l) => sum + Number(l.area || 0), 0);
                const canMap = !!card.plannerId && card.landIds.length > 0;
                const isActive = activeMappingCard === card.id;
                return (
                  <div
                    key={`map-card-${card.id}`}
                    className="w-[31%] min-w-[300px] max-w-[360px] shrink-0 rounded-lg border p-3"
                    style={{ backgroundColor: card.color, borderColor: '#c4b5fd' }}
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-slate-500"><LandPlot className="h-3.5 w-3.5" /> Land</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[170px]">{cardLands.map(landLabel).join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-slate-500"><Wheat className="h-3.5 w-3.5" /> Total Area</span>
                        <span className="font-semibold text-slate-900">{selectedArea.toFixed(2)} ac</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-slate-500"><Sprout className="h-3.5 w-3.5" /> Crop</span>
                        <span className="font-semibold text-slate-900 uppercase">Napier</span>
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
                        onClick={() => setActiveMappingCard(isActive ? null : card.id)}
                        disabled={!canMap || card.mappingLocked || mappingCardLoading}
                      >
                        <Calendar className="mr-1 h-4 w-4" /> Map
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={card.showOnCalendar ? 'default' : 'outline'}
                        onClick={() => {
                          const nextCards = plannerCards.map((c) =>
                            c.id === card.id ? { ...c, showOnCalendar: !c.showOnCalendar } : c
                          );
                          setPlannerCards(nextCards);
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
                          setPlannerCards((prev) =>
                            prev.map((c) => (c.id === card.id ? { ...c, mappingLocked: nextLocked } : c))
                          );
                          if (nextLocked && activeMappingCard === card.id) {
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
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Button type="button" variant="ghost" onClick={goToPrevMonth} className="gap-1">
          &lt; Prev
        </Button>
        <div className="text-lg font-semibold text-slate-800">{format(calendarViewMonth, 'MMMM yyyy')}</div>
        <Button type="button" variant="ghost" onClick={goToNextMonth} className="gap-1">
          Next &gt;
        </Button>
      </div>

      <MonthCalendar
        month={calendarViewMonth}
        selectedDate={day0}
        onDateClick={handleDayClick}
        isSelectionMode={selectionMode}
        highlighted={highlighted}
        hoverDetailsByDate={hoverDetailsByDate}
      />

      {/* ResourceAllocationPanel temporarily hidden */}
    </div>
  );
};

export default CreateCultivationPlan;
