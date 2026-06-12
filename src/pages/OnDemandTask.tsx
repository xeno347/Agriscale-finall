import { useEffect, useState } from 'react';
import { X, Plus, ChevronDown, UserCheck, Save, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStepType = 'inventory' | 'logistics' | 'inspection' | 'cultivation' | 'other';

interface TaskFlowStep {
  id: string;
  stepNumber: number;
  type: TaskStepType | '';
  expanded: boolean;
  details: {
    assignee: string;
    assigneeDesignation: string;
    title: string;
    notes: string;
    inventoryItems: Record<string, number>;
    vehicleIds: string[];
    inspectionInputType: string;
    inspectionFields: Array<{ id: string; fieldName: string; inputType: string; mandatory: boolean; options: string[] }>;
    landId: string;
    cultivationTaskType: string;
    dueDate: string;
    otherDescription: string;
  };
}

type StaffRecord = {
  staff_id?: string;
  staff_information?: {
    staff_name?: string;
    staff_department?: string;
    staff_designation?: string;
  };
};

interface OnDemandTaskStepApi {
  type?: string;
  data?: any[];
  status?: string;
  equipment_otp?: string;
  handover_proof_delivery?: string;
  task_media?: string[];
}

interface OnDemandTaskApi {
  staff_id?: string;
  steps_dict?: Record<string, OnDemandTaskStepApi>;
  created_at?: string;
  task_id?: string;
}

interface StepViewModel {
  key: string;
  stepNumber: number;
  type: string;
  status: string;
  data: any[];
  title: string;
  equipmentOtp?: string;
  handoverProof?: string;
  taskMedia: string[];
}

interface TaskViewModel {
  taskId: string;
  staffId: string;
  createdAt: string;
  steps: StepViewModel[];
  totalSteps: number;
  completedSteps: number;
}

type AllocationItemForm = {
  id: string;
  inventoryItemId: string;
  totalQty: string;
};

type AllocationRecord = {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  items: Array<{ id: string; inventoryItemId: string; itemName: string; totalQty: number }>;
  distribution: Record<string, Record<string, string>>;
  selectedFarms: Array<{ farmId: string; label: string }>;
  createdAt: string;
};

type ApiAllocationItem = {
  unit: string;
  item_name: string;
  quantity: number;
  farm_allocation: Record<string, { owner_name: string; quantity: number }>;
};

type ApiAllocationSchema = {
  task_id: string;
  allocation_schema: Record<string, ApiAllocationItem>;
  create_at: string;
  allocation_schema_status: 'pending' | 'partial' | 'completed';
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = getBaseUrl().replace(/\/$/, '');

const allocationStatusConfig: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'Pending',   classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  partial:   { label: 'Partial',   classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const taskStepTypeMeta: Record<TaskStepType, { label: string; badge: string; shell: string; panel: string }> = {
  inventory: {
    label: 'Inventory',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    shell: 'border-emerald-200 bg-emerald-50/60',
    panel: 'border-emerald-200 bg-white',
  },
  logistics: {
    label: 'Logistics',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    shell: 'border-amber-200 bg-amber-50/60',
    panel: 'border-amber-200 bg-white',
  },
  inspection: {
    label: 'Inspection',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    shell: 'border-sky-200 bg-sky-50/60',
    panel: 'border-sky-200 bg-white',
  },
  cultivation: {
    label: 'Cultivation',
    badge: 'bg-lime-100 text-lime-800 border-lime-200',
    shell: 'border-lime-200 bg-lime-50/60',
    panel: 'border-lime-200 bg-white',
  },
  other: {
    label: 'Other',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    shell: 'border-slate-200 bg-slate-50/70',
    panel: 'border-slate-200 bg-white',
  },
};

// ─── Display helpers (task list) ──────────────────────────────────────────────

const formatTaskDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toStepNumber = (stepKey: string) => {
  const match = stepKey.match(/step_(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};


const getStepStatusClasses = (status: string) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'in_progress' || s === 'in-progress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'failed' || s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const stepTypeColor: Record<string, string> = {
  inventory: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  logistics: 'bg-amber-100 text-amber-800 border-amber-200',
  inspection: 'bg-sky-100 text-sky-700 border-sky-200',
  cultivation: 'bg-lime-100 text-lime-800 border-lime-200',
  others: 'bg-slate-100 text-slate-700 border-slate-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const renderStepCard = (step: StepViewModel) => {
  const t = String(step.type || '').toLowerCase();
  const isCompleted = step.status === 'completed';

  if (t === 'inventory') return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[2fr_1fr_1fr] bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <div>Item</div><div className="text-center">Qty</div><div className="text-right">Unit</div>
        </div>
        {step.data.map((item, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr] px-3 py-2 text-xs border-t border-slate-100 first:border-t-0 bg-white">
            <div className="font-medium text-slate-900 truncate">{item?.item_name || item?.name || `Item ${i + 1}`}</div>
            <div className="text-center text-slate-700">{item?.quantity ?? '—'}</div>
            <div className="text-right text-slate-500">{item?.unit || '—'}</div>
          </div>
        ))}
      </div>
      {step.equipmentOtp && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Equipment OTP</span>
          <span className="font-mono text-lg font-bold tracking-widest text-slate-900">{step.equipmentOtp}</span>
        </div>
      )}
      {isCompleted && step.handoverProof && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Handover Proof</p>
          <img src={step.handoverProof} alt="Handover proof" className="w-full h-28 rounded-lg object-cover border border-slate-200" />
        </div>
      )}
    </div>
  );

  if (t === 'logistics') return (
    <div className="space-y-2">
      {step.data.map((item, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-base font-bold text-slate-900 tracking-wide">{item?.vehicle_number || `Vehicle ${i + 1}`}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item?.vehicle_id || '—'}</div>
        </div>
      ))}
    </div>
  );

  if (t === 'cultivation') return (
    <div className="space-y-2.5">
      {step.data.map((item, i) => {
        const farmer = item?.farmer_details;
        const farm = item?.farm_details;
        return (
          <div key={i} className="space-y-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Activity</span>
                <span className="font-semibold text-slate-900 capitalize">{item?.activity || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due date</span>
                <span className="text-slate-700">{item?.due_date || '—'}</span>
              </div>
              {farm && <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Village</span>
                  <span className="text-slate-700">{farm?.land_data?.village || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Area</span>
                  <span className="text-slate-700">{farm?.area ? `${farm.area} acres` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Crop</span>
                  <span className="text-slate-700 capitalize">{farm?.crop_type || '—'}</span>
                </div>
              </>}
              {farmer && <>
                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Farmer</span>
                  <span className="font-medium text-slate-900">{farmer?.owner_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Contact</span>
                  <span className="text-slate-700">{farmer?.contact || '—'}</span>
                </div>
              </>}
            </div>
          </div>
        );
      })}
      {isCompleted && step.taskMedia.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Task Media</p>
          <div className="grid grid-cols-3 gap-1.5">
            {step.taskMedia.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Media ${i + 1}`} className="w-full h-16 rounded-md object-cover border border-slate-200 hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (t === 'inspection') return (
    <div className="space-y-2">
      {step.data.map((field, i) => {
        const inputType = String(field?.input_type || '').toLowerCase();
        const hasResponse = field?.response != null && field?.response !== null;
        return (
          <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900 truncate">{field?.field_name || `Field ${i + 1}`}</span>
              <span className={cn('shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border', inputType === 'mcq' ? 'bg-purple-50 text-purple-700 border-purple-200' : inputType === 'image_upload' ? 'bg-rose-50 text-rose-700 border-rose-200' : inputType === 'number' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200')}>
                {inputType === 'image_upload' ? 'Image' : inputType.toUpperCase()}
              </span>
            </div>
            {inputType === 'mcq' && field?.options && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {(field.options as string[]).map((opt, oi) => (
                  <span key={oi} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', hasResponse && field.response === opt ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                    {opt}
                  </span>
                ))}
              </div>
            )}
            {inputType === 'image_upload' && hasResponse && (
              <a href={String(field.response)} target="_blank" rel="noopener noreferrer">
                <img src={String(field.response)} alt={field?.field_name} className="w-full h-20 rounded-md object-cover border border-slate-200 hover:opacity-90 transition-opacity mt-1" />
              </a>
            )}
            {(inputType === 'text' || inputType === 'number') && hasResponse && (
              <div className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 font-medium">{String(field.response)}</div>
            )}
            {!hasResponse && isCompleted && inputType !== 'mcq' && <div className="text-[10px] text-slate-400 italic">No response</div>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 leading-relaxed">
      {step.data.map((item, i) => <p key={i}>{item?.description || item?.note || '—'}</p>)}
    </div>
  );
};

const normalizeTaskSteps = (stepsDict: Record<string, OnDemandTaskStepApi> = {}): StepViewModel[] =>
  Object.entries(stepsDict).map(([key, step]) => {
    const stepNumber = toStepNumber(key);
    const type = String(step?.type || 'other');
    const data = Array.isArray(step?.data) ? step.data : [];
    const status = String(step?.status || 'pending');
    return {
      key, stepNumber, type, status, data,
      title: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      equipmentOtp: step?.equipment_otp,
      handoverProof: step?.handover_proof_delivery,
      taskMedia: Array.isArray(step?.task_media) ? step.task_media : [],
    };
  }).sort((a, b) => a.stepNumber - b.stepNumber);

const normalizeOndemandTask = (task: OnDemandTaskApi): TaskViewModel => {
  const steps = normalizeTaskSteps(task.steps_dict || {});
  const completedSteps = steps.filter(s => String(s.status).toLowerCase() === 'completed').length;
  return { taskId: String(task.task_id || 'Task'), staffId: String(task.staff_id || '—'), createdAt: formatTaskDate(task.created_at), steps, totalSteps: steps.length, completedSteps };
};

const normalizeDesignation = (v?: string) => String(v || '').trim().toLowerCase();
const formatDesignationLabel = (v?: string) => { const c = String(v || '').trim(); return c ? c.charAt(0).toUpperCase() + c.slice(1) : ''; };
const getInventoryItemId = (item: any) => String(item?.id || item?.Invent_id || item?.item_id || item?.item || '');
const getVehicleId = (vehicle: any) => String(vehicle?.vehicle_id || vehicle?.id || '');
const getInventoryItemName = (item: any) => String(item?.item_name || item?.name || item?.item || getInventoryItemId(item) || 'Unknown item');
const getVehicleName = (vehicle: any) => String(vehicle?.vehicle_information?.vehicle_number || vehicle?.vehicle_number || vehicle?.name || getVehicleId(vehicle) || 'Unknown vehicle');

// ─── Component ────────────────────────────────────────────────────────────────

const OnDemandTask = () => {
  // Task list state
  const [ondemandTasks, setOndemandTasks] = useState<TaskViewModel[]>([]);
  const [ondemandTasksLoading, setOndemandTasksLoading] = useState(false);
  const [ondemandTasksError, setOndemandTasksError] = useState<string | null>(null);

  // Shared resources
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);

  // Modal / task builder state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffByDesignation, setStaffByDesignation] = useState<Record<string, StaffRecord[]>>({});
  const [taskAssignment, setTaskAssignment] = useState<{ designation: string; staffId: string; staffName: string }>({ designation: '', staffId: '', staffName: '' });
  const [taskFlowSteps, setTaskFlowSteps] = useState<TaskFlowStep[]>([]);
  const [resourcePopup, setResourcePopup] = useState<{ stepId: string; type: 'inventory' | 'logistics' } | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [activeTab, setActiveTab] = useState<'task' | 'allocation'>('task');

  // Allocation modal state
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationAssignment, setAllocationAssignment] = useState<{ designation: string; staffId: string; staffName: string }>({ designation: '', staffId: '', staffName: '' });
  const [allocationItems, setAllocationItems] = useState<AllocationItemForm[]>([]);
  const [allocationRecords, setAllocationRecords] = useState<AllocationRecord[]>([]);
  const [farmColumnSelectors, setFarmColumnSelectors] = useState<Record<string, string>>({});

  // API allocation list state
  const [apiAllocations, setApiAllocations] = useState<ApiAllocationSchema[]>([]);
  const [apiAllocationsLoading, setApiAllocationsLoading] = useState(false);
  const [apiAllocationsError, setApiAllocationsError] = useState<string | null>(null);

  // Per-allocation editable distribution state (for pending/partial)
  const [apiAllocFarms, setApiAllocFarms] = useState<Record<string, string[]>>({});
  const [apiAllocDistribution, setApiAllocDistribution] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [apiFarmSelectors, setApiFarmSelectors] = useState<Record<string, string>>({});

  // ── Fetch shared resources ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [invRes, vehRes, farmRes] = await Promise.all([
          fetch(`${BASE_URL}/inventory_management/get_inventory_items`),
          fetch(`${BASE_URL}/admin_vehicles/get_all_vehicles`),
          fetch(`${BASE_URL}/admin_ops_requests/get_farm_and_farmer`),
        ]);
        const invJson = await invRes.json().catch(() => ({}));
        const vehJson = await vehRes.json().catch(() => ({}));
        const farmJson = await farmRes.json().catch(() => ({}));
        const invList = Array.isArray(invJson?.inventory_items) ? invJson.inventory_items : [];
        const vehList = Array.isArray(vehJson) ? vehJson : Array.isArray(vehJson?.vehicles) ? vehJson.vehicles : [];
        const farmList = Array.isArray(farmJson?.farm_farmer_mapping) ? farmJson.farm_farmer_mapping : [];
        setInventoryItems(invList.length > 0 ? invList : [{ id: 'inv-1', item_name: 'Fertilizer A', stock: 50, unit: 'kg' }, { id: 'inv-2', item_name: 'Pesticide B', stock: 30, unit: 'ltr' }]);
        setVehicles(vehList.length > 0 ? vehList : [{ vehicle_id: 'veh-1', vehicle_information: { vehicle_number: 'TR-001', company: 'AgroCo' } }, { vehicle_id: 'veh-2', vehicle_information: { vehicle_number: 'TR-002', company: 'AgroCo' } }]);
        setFarms(farmList.length > 0 ? farmList : [{ farm_id: 'farm-1', farmer_id: 'farmer-1', area: 2.5, priority: 1, land_data: { village: 'Village A', district: 'District X' } }]);
      } catch { /* keep defaults */ }
    };
    fetchResources();
  }, []);

  // ── Fetch task list ─────────────────────────────────────────────────────────

  const fetchOnDemandTasks = async () => {
    try {
      setOndemandTasksLoading(true);
      setOndemandTasksError(null);
      const response = await fetch(`${BASE_URL}/admin_all_task/get_all_ondemand_tasks`);
      if (!response.ok) throw new Error(`Failed to load on demand tasks (${response.status})`);
      const data = await response.json().catch(() => null);
      const list = Array.isArray(data) ? data : [];
      setOndemandTasks(list.map(t => normalizeOndemandTask(t as OnDemandTaskApi)));
    } catch (error) {
      setOndemandTasks([]);
      setOndemandTasksError('Unable to load on demand tasks.');
    } finally {
      setOndemandTasksLoading(false);
    }
  };

  useEffect(() => { fetchOnDemandTasks(); }, []);

  // ── Fetch allocations ───────────────────────────────────────────────────────

  const fetchAllocations = async () => {
    try {
      setApiAllocationsLoading(true);
      setApiAllocationsError(null);
      const response = await fetch(`${BASE_URL}/admin_ops_requests/get_on_demand_allocation_schema`);
      if (!response.ok) throw new Error(`Failed to load allocations (${response.status})`);
      const data = await response.json().catch(() => null);
      setApiAllocations(Array.isArray(data?.allocation_schemas) ? data.allocation_schemas : []);
    } catch (e) {
      setApiAllocationsError(e instanceof Error ? e.message : 'Failed to load allocations');
      setApiAllocations([]);
    } finally {
      setApiAllocationsLoading(false);
    }
  };

  useEffect(() => { if (activeTab === 'allocation') fetchAllocations(); }, [activeTab]);

  // ── Task builder helpers ────────────────────────────────────────────────────

  const createTaskStep = (stepNumber: number): TaskFlowStep => ({
    id: `${Date.now()}-${stepNumber}-${Math.random().toString(16).slice(2)}`,
    stepNumber,
    type: '',
    expanded: true,
    details: { assignee: '', assigneeDesignation: '', title: `Step ${stepNumber}`, notes: '', inventoryItems: {}, vehicleIds: [], inspectionInputType: 'text', inspectionFields: [], landId: '', cultivationTaskType: '', dueDate: '', otherDescription: '' },
  });

  const openModal = async () => {
    setIsModalOpen(true);
    setTaskAssignment({ designation: '', staffId: '', staffName: '' });
    setTaskFlowSteps([]);
    setResourcePopup(null);
    try {
      const response = await fetch(`${BASE_URL}/admin_staff/get_all_staff`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json().catch(() => ({}));
      const list = Array.isArray(data) ? data : Array.isArray(data?.staffs) ? data.staffs : Array.isArray(data?.data) ? data.data : [];
      const grouped = list.reduce((acc: Record<string, StaffRecord[]>, staff: StaffRecord) => {
        const designation = normalizeDesignation(staff?.staff_information?.staff_designation);
        if (!designation) return acc;
        acc[designation] = [...(acc[designation] || []), staff];
        return acc;
      }, {});
      setStaffByDesignation(grouped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load staff');
      setStaffByDesignation({});
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTaskAssignment({ designation: '', staffId: '', staffName: '' });
    setTaskFlowSteps([]);
    setResourcePopup(null);
  };

  const buildStepsDict = (steps: TaskFlowStep[]) =>
    steps.reduce<Record<string, any>>((acc, step, index) => {
      if (!step.type) return acc;
      const key = `step_${index + 1}`;
      if (step.type === 'inventory') {
        acc[key] = { type: 'inventory', status: 'pending', data: Object.entries(step.details.inventoryItems).filter(([, qty]) => Number(qty) > 0).map(([itemId, qty]) => { const item = inventoryItems.find(e => getInventoryItemId(e) === itemId); return { item_name: String(item ? getInventoryItemName(item) : itemId), quantity: Number(qty) || 0, unit: String(item?.unit || '—'), equipment_id: String(getInventoryItemId(item) || itemId) }; }) };
        return acc;
      }
      if (step.type === 'logistics') {
        acc[key] = { type: 'logistics', status: 'pending', data: step.details.vehicleIds.map(vid => { const v = vehicles.find(e => getVehicleId(e) === vid); if (!v) return null; return { vehicle_id: getVehicleId(v), vehicle_number: String(v?.vehicle_information?.vehicle_number || getVehicleName(v)) }; }).filter(Boolean) };
        return acc;
      }
      if (step.type === 'cultivation') {
        const land = farms.find(f => String(f?.farm_id || f?.id || '') === step.details.landId);
        acc[key] = { type: 'cultivation', status: 'pending', data: land ? [{ farm_id: String(land?.farm_id || ''), activity: String(step.details.cultivationTaskType || ''), due_date: String(step.details.dueDate || '') }] : [] };
        return acc;
      }
      if (step.type === 'inspection') {
        acc[key] = { type: 'inspection', status: 'pending', data: step.details.inspectionFields.map(f => { const inputType = f.inputType === 'mcq' ? 'MCQ' : f.inputType === 'image' ? 'image_upload' : f.inputType; return { field_name: String(f.fieldName || ''), input_type: inputType, mandetory: Boolean(f.mandatory), ...(f.inputType === 'mcq' && { options: f.options }) }; }) };
        return acc;
      }
      acc[key] = { type: 'others', status: 'pending', data: [{ description: String(step.details.otherDescription || '') }] };
      return acc;
    }, {});

  const updateStep = (stepId: string, patch: Partial<TaskFlowStep>) =>
    setTaskFlowSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...patch } : s));

  const updateStepDetails = (stepId: string, patch: Partial<TaskFlowStep['details']>) =>
    setTaskFlowSteps(prev => prev.map(s => s.id === stepId ? { ...s, details: { ...s.details, ...patch } } : s));

  const addStep = () =>
    setTaskFlowSteps(prev => {
      const next = [...prev, createTaskStep(prev.length + 1)].map((s, i) => ({ ...s, stepNumber: i + 1, details: { ...s.details, title: s.details.title?.trim() ? s.details.title : `Step ${i + 1}` } }));
      return next;
    });

  const removeStep = (stepId: string) =>
    setTaskFlowSteps(prev => {
      const next = prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, stepNumber: i + 1 }));
      return next.length > 0 ? next : [createTaskStep(1)];
    });

  const addInspectionField = (stepId: string) =>
    setTaskFlowSteps(prev => prev.map(s => s.id !== stepId ? s : { ...s, details: { ...s.details, inspectionFields: [...s.details.inspectionFields, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, fieldName: '', inputType: 'text', mandatory: false, options: [] }] } }));

  const updateInspectionField = (stepId: string, fieldId: string, patch: Partial<{ fieldName: string; inputType: string; mandatory: boolean; options: string[] }>) =>
    setTaskFlowSteps(prev => prev.map(s => s.id !== stepId ? s : { ...s, details: { ...s.details, inspectionFields: s.details.inspectionFields.map(f => f.id === fieldId ? { ...f, ...patch } : f) } }));

  const removeInspectionField = (stepId: string, fieldId: string) =>
    setTaskFlowSteps(prev => prev.map(s => s.id !== stepId ? s : { ...s, details: { ...s.details, inspectionFields: s.details.inspectionFields.filter(f => f.id !== fieldId) } }));

  const updateInventorySelection = (stepId: string, itemId: string, delta: number, max?: number) =>
    setTaskFlowSteps(prev => prev.map(s => {
      if (s.id !== stepId) return s;
      const cur = Number(s.details.inventoryItems[itemId] || 0);
      const next = Math.max(0, Math.min(typeof max === 'number' ? max : Infinity, cur + delta));
      return { ...s, details: { ...s.details, inventoryItems: { ...s.details.inventoryItems, [itemId]: next } } };
    }));

  const toggleVehicleSelection = (stepId: string, vehicleId: string) =>
    setTaskFlowSteps(prev => prev.map(s => {
      if (s.id !== stepId) return s;
      const cur = s.details.vehicleIds || [];
      return { ...s, details: { ...s.details, vehicleIds: cur.includes(vehicleId) ? cur.filter(id => id !== vehicleId) : [...cur, vehicleId] } };
    }));

  const handleAssignTask = async () => {
    const assignedSteps = taskFlowSteps.filter(s => s.type);
    const staffId = String(taskAssignment?.staffId || '').trim();
    if (assignedSteps.length === 0) { toast.error('Please add at least one task step'); return; }
    if (!staffId) { toast.error('Please choose an assignee first'); return; }

    setIsCreatingTask(true);
    try {
      const stepsDict = buildStepsDict(assignedSteps);
      const response = await fetch(`${BASE_URL}/admin_ops_requests/create_on_demand_tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps_dict: stepsDict, staff_id: staffId }),
      });
      let payload: any = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok) throw new Error(String(payload?.message || payload?.detail || payload?.error || `Request failed (${response.status})`));
      toast.success('Task created successfully');
      closeModal();
      fetchOnDemandTasks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // ── Allocation modal helpers ──────────────────────────────────────────────────

  const mkId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const createAllocationItem = (): AllocationItemForm => ({
    id: mkId(), inventoryItemId: '', totalQty: '',
  });

  const openAllocationModal = async () => {
    setIsAllocationModalOpen(true);
    setAllocationAssignment({ designation: '', staffId: '', staffName: '' });
    setAllocationItems([createAllocationItem()]);
    if (Object.keys(staffByDesignation).length === 0) {
      try {
        const response = await fetch(`${BASE_URL}/admin_staff/get_all_staff`);
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const list = Array.isArray(data) ? data : Array.isArray(data?.staffs) ? data.staffs : Array.isArray(data?.data) ? data.data : [];
        const grouped = list.reduce((acc: Record<string, StaffRecord[]>, staff: StaffRecord) => {
          const designation = normalizeDesignation(staff?.staff_information?.staff_designation);
          if (!designation) return acc;
          acc[designation] = [...(acc[designation] || []), staff];
          return acc;
        }, {});
        setStaffByDesignation(grouped);
      } catch { /* ignore */ }
    }
  };

  const closeAllocationModal = () => {
    setIsAllocationModalOpen(false);
    setAllocationAssignment({ designation: '', staffId: '', staffName: '' });
    setAllocationItems([]);
  };

  const addAllocationItem = () => setAllocationItems(prev => [...prev, createAllocationItem()]);

  const removeAllocationItem = (id: string) =>
    setAllocationItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

  const updateAllocationItemField = (id: string, patch: Partial<AllocationItemForm>) =>
    setAllocationItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const handleCreateAllocation = () => {
    if (!allocationAssignment.staffId) { toast.error('Please select a responsible person'); return; }
    const validItems = allocationItems.filter(i => i.inventoryItemId && Number(i.totalQty) > 0);
    if (validItems.length === 0) { toast.error('Please add at least one item with a quantity'); return; }
    const newRecord: AllocationRecord = {
      id: mkId(),
      staffId: allocationAssignment.staffId,
      staffName: allocationAssignment.staffName,
      designation: allocationAssignment.designation,
      items: validItems.map(i => {
        const inv = inventoryItems.find(it => getInventoryItemId(it) === i.inventoryItemId);
        return { id: i.id, inventoryItemId: i.inventoryItemId, itemName: inv ? getInventoryItemName(inv) : i.inventoryItemId, totalQty: Number(i.totalQty) };
      }),
      distribution: {},
      selectedFarms: [],
      createdAt: new Date().toLocaleString(),
    };
    setAllocationRecords(prev => [...prev, newRecord]);
    closeAllocationModal();
    toast.success('Allocation created — distribute items to farms in the table below.');
  };

  const handleSaveAllocation = async (alloc: ApiAllocationSchema) => {
    const currentFarms: string[] = apiAllocFarms[alloc.task_id] ?? (() => {
      const s = new Set<string>();
      Object.values(alloc.allocation_schema).forEach(it =>
        Object.keys(it.farm_allocation || {}).forEach(f => s.add(f))
      );
      return [...s];
    })();

    if (currentFarms.length === 0) {
      toast.error('Add at least one farm column before saving.');
      return;
    }

    const requests = Object.entries(alloc.allocation_schema).map(([productId, item]) => {
      const farm_allocation: Record<string, { owner_name: string; quantity: number }> = {};
      for (const farmId of currentFarms) {
        const local = apiAllocDistribution[alloc.task_id]?.[productId]?.[farmId];
        const qty = local !== undefined ? Number(local) : (item.farm_allocation?.[farmId]?.quantity ?? 0);
        if (isNaN(qty) || qty <= 0) continue;
        const farmData = farms.find((f: any) => String(f?.farm_id || '') === farmId);
        const owner_name = String((farmData as any)?.owner_name || item.farm_allocation?.[farmId]?.owner_name || farmId);
        farm_allocation[farmId] = { owner_name, quantity: qty };
      }
      return fetch(`${BASE_URL}/admin_ops_requests/allocate_inventory_to_farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: alloc.task_id, equipment_id: productId, farm_allocation }),
      });
    });

    try {
      const responses = await Promise.all(requests);
      const failed = responses.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`${failed.length} item(s) failed to save. Please try again.`);
      } else {
        toast.success('Allocation saved successfully.');
        fetchAllocations();
      }
    } catch {
      toast.error('Failed to save allocation. Please check your connection.');
    }
  };

  const handleLockAllocation = async (taskId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/admin_ops_requests/lock_allocation_schema_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error('Failed to lock allocation. Please try again.');
        return;
      }
      toast.success('Allocation locked — status is now Completed.');
      fetchAllocations();
    } catch {
      toast.error('Failed to lock allocation. Please check your connection.');
    }
  };

  const updateDistribution = (allocId: string, itemId: string, farmId: string, qty: string) =>
    setAllocationRecords(prev => prev.map(a =>
      a.id !== allocId ? a : {
        ...a,
        distribution: { ...a.distribution, [itemId]: { ...(a.distribution[itemId] || {}), [farmId]: qty } },
      }
    ));

  const addFarmColumn = (allocId: string, farmId: string) => {
    const farm = farms.find((f: any) => String(f?.farm_id || '') === farmId);
    if (!farm) return;
    const label = String((farm as any)?.owner_name || farmId);
    setAllocationRecords(prev => prev.map(a =>
      a.id !== allocId || a.selectedFarms.some(f => f.farmId === farmId)
        ? a
        : { ...a, selectedFarms: [...a.selectedFarms, { farmId, label }] }
    ));
    setFarmColumnSelectors(prev => ({ ...prev, [allocId]: '' }));
  };

  const removeFarmColumn = (allocId: string, farmId: string) =>
    setAllocationRecords(prev => prev.map(a =>
      a.id !== allocId ? a : { ...a, selectedFarms: a.selectedFarms.filter(f => f.farmId !== farmId) }
    ));

  const allocationDesignationOptions = Object.keys(staffByDesignation).sort();
  const allocationAssigneeOptions = allocationAssignment.designation
    ? (staffByDesignation[allocationAssignment.designation] || [])
    : [];

  // ─────────────────────────────────────────────────────────────────────────────

  const designationOptions = Object.keys(staffByDesignation).sort();
  const assigneeOptions = taskAssignment.designation ? (staffByDesignation[taskAssignment.designation] || []) : [];
  const canAddSteps = Boolean(taskAssignment.designation && taskAssignment.staffId);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">On Demand</h1>
          <p className="text-sm text-muted-foreground">Create and track step-wise on-demand tasks and allocations.</p>
        </div>
        {activeTab === 'task' && (
          <button onClick={openModal} className="px-4 py-2 bg-green-800 text-white rounded-md text-sm font-medium hover:bg-green-900 transition-colors">
            Create New Task
          </button>
        )}
        {activeTab === 'allocation' && (
          <button onClick={openAllocationModal} className="px-4 py-2 bg-green-800 text-white rounded-md text-sm font-medium hover:bg-green-900 transition-colors">
            + Create New Allocation
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-gray-200">
        {([
          { key: 'task',       label: 'On Demand Task'       },
          { key: 'allocation', label: 'On Demand Allocation' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── On Demand Task tab ── */}
      {activeTab === 'task' && (
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">On demand tasks</h2>
        {ondemandTasksLoading ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">Loading on demand tasks...</div>
        ) : ondemandTasksError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ondemandTasksError}</div>
        ) : ondemandTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">No on demand tasks found.</div>
        ) : (
          <div className="space-y-4">
            {ondemandTasks.map(task => {
              const pct = task.totalSteps > 0 ? Math.round((task.completedSteps / task.totalSteps) * 100) : 0;
              const isAllDone = task.completedSteps === task.totalSteps && task.totalSteps > 0;
              return (
                <div key={task.taskId} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Task header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold shrink-0">
                        {task.taskId.replace('TASK-', '')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{task.taskId}</span>
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', isAllDone ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200')}>
                            {isAllDone ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Staff: {task.staffId} · {task.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-700">{task.completedSteps}/{task.totalSteps} steps</div>
                        <div className="text-[10px] text-slate-400">{pct}% complete</div>
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Steps rail */}
                  <div className="overflow-x-auto px-5 py-4">
                    <div className="flex items-start gap-0 min-w-max">
                      {task.steps.map((step, index) => (
                        <div key={step.key} className="flex items-start">
                          {/* Step card */}
                          <div className="w-[272px] rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {/* Step card header */}
                            <div className={cn('flex items-center justify-between px-3 py-2 border-b', stepTypeColor[step.type] ? `border-b ${stepTypeColor[step.type].split(' ')[0]}/30` : 'border-slate-100')}>
                              <div className="flex items-center gap-2">
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide', stepTypeColor[step.type] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                                  {step.type === 'others' ? 'Other' : step.type}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">#{step.stepNumber}</span>
                              </div>
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', getStepStatusClasses(step.status))}>
                                {step.status === 'completed' ? '✓ Done' : step.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {/* Step card body */}
                            <div className="p-3">
                              {step.data.length > 0 ? renderStepCard(step) : (
                                <p className="text-xs text-slate-400 italic">No data</p>
                              )}
                            </div>
                          </div>

                          {/* Connector arrow */}
                          {index < task.steps.length - 1 && (
                            <div className="flex items-center self-center mx-1.5 shrink-0">
                              <div className="h-px w-4 bg-slate-300" />
                              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-slate-300" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ── On Demand Allocation tab ── */}
      {activeTab === 'allocation' && (
        <div className="space-y-5">
          {apiAllocationsLoading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-sm text-muted-foreground text-center">
              Loading allocations…
            </div>
          ) : apiAllocationsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{apiAllocationsError}</div>
          ) : apiAllocations.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-lg p-10 text-sm text-muted-foreground text-center">
              No allocations yet. Use "+ Create New Allocation" to get started.
            </div>
          ) : (() => {
            const grouped = apiAllocations.reduce((acc: Record<string, ApiAllocationSchema[]>, a) => {
              const key = a.create_at ? a.create_at.split('T')[0] : 'unknown';
              (acc[key] = acc[key] || []).push(a);
              return acc;
            }, {});
            const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
            return sortedDates.map(dateKey => {
              const dateLabel = (() => {
                const d = new Date(dateKey);
                if (isNaN(d.getTime())) return dateKey;
                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
              })();
              return (
                <div key={dateKey} className="space-y-3">
                  {/* Date divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 px-1">{dateLabel}</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  {/* Cards for this date */}
                  {grouped[dateKey].map(alloc => {
                    const items = Object.entries(alloc.allocation_schema);
                    const statusCfg = allocationStatusConfig[alloc.allocation_schema_status] ?? allocationStatusConfig.pending;
                    const timeStr = (() => {
                      const d = new Date(alloc.create_at);
                      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    })();
                    return (
                      <div key={alloc.task_id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Card header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold shrink-0 tracking-tight">
                              {alloc.task_id.replace(/^TASK-/i, '').slice(0, 5)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{alloc.task_id}</p>
                              <p className="text-[10px] text-slate-400">
                                {items.length} item{items.length !== 1 ? 's' : ''}{timeStr ? ` · ${timeStr}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {alloc.allocation_schema_status !== 'completed' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveAllocation(alloc)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLockAllocation(alloc.task_id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors shadow-sm"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  Lock
                                </button>
                              </>
                            )}
                            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize', statusCfg.classes)}>
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Distribution matrix — read-only for completed, editable for pending/partial */}
                        {alloc.allocation_schema_status === 'completed' ? (() => {
                          const farmIds = [...new Set(
                            Object.values(alloc.allocation_schema)
                              .flatMap(it => Object.keys(it.farm_allocation || {}))
                          )];
                          const getFarmLabel = (farmId: string) => {
                            for (const it of Object.values(alloc.allocation_schema)) {
                              if (it.farm_allocation?.[farmId]?.owner_name) return it.farm_allocation[farmId].owner_name;
                            }
                            return farmId;
                          };
                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="sticky left-0 bg-slate-50 z-10 text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[160px] border-r border-slate-200">Item</th>
                                    {farmIds.map(fid => {
                                      const fd = farms.find((f: any) => String(f?.farm_id || '') === fid);
                                      return (
                                        <th key={fid} className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[120px] border-r border-slate-100">
                                          <div>{getFarmLabel(fid)}</div>
                                          {fd && (
                                            <div className="text-[9px] font-normal normal-case tracking-normal text-slate-400 mt-0.5 capitalize">
                                              {fd.crop_type}{fd.area ? ` · ${fd.area}ac` : ''}
                                            </div>
                                          )}
                                        </th>
                                      );
                                    })}
                                    <th className="sticky right-0 z-10 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[80px] bg-slate-100 border-l border-slate-200">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map(([productId, item]) => {
                                    const total = Object.values(item.farm_allocation || {}).reduce((s, v) => s + (v.quantity || 0), 0);
                                    return (
                                      <tr key={productId} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30 transition-colors">
                                        <td className="sticky left-0 bg-white z-10 px-4 py-2.5 border-r border-slate-200">
                                          <div className="font-medium text-slate-900">{item.item_name}</div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">Total: {item.quantity} {item.unit}</div>
                                        </td>
                                        {farmIds.map(fid => (
                                          <td key={fid} className="px-3 py-2.5 text-center border-r border-slate-100">
                                            <span className="font-semibold text-slate-700">{item.farm_allocation?.[fid]?.quantity ?? '—'}</span>
                                          </td>
                                        ))}
                                        <td className="sticky right-0 z-10 px-3 py-2.5 text-center bg-white border-l border-slate-200">
                                          <span className="font-bold text-emerald-700">{total}/{item.quantity}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })() : (() => {
                          const currentFarms: string[] = apiAllocFarms[alloc.task_id] ?? (() => {
                            const s = new Set<string>();
                            items.forEach(([, it]) => Object.keys(it.farm_allocation || {}).forEach(f => s.add(f)));
                            return [...s];
                          })();
                          const getFarmLabel = (farmId: string): string => {
                            const farm = farms.find((f: any) => String(f?.farm_id || '') === farmId);
                            if (farm) return String((farm as any)?.owner_name || farmId);
                            for (const [, it] of items) {
                              if (it.farm_allocation?.[farmId]?.owner_name) return it.farm_allocation[farmId].owner_name;
                            }
                            return farmId;
                          };
                          const getCellValue = (productId: string, farmId: string): string => {
                            const local = apiAllocDistribution[alloc.task_id]?.[productId]?.[farmId];
                            if (local !== undefined) return local;
                            const apiQty = alloc.allocation_schema[productId]?.farm_allocation?.[farmId]?.quantity;
                            return apiQty != null ? String(apiQty) : '';
                          };
                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="sticky left-0 bg-slate-50 z-10 text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[160px] border-r border-slate-200">Item / Farm →</th>
                                    {currentFarms.map(farmId => {
                                      const fd = farms.find((f: any) => String(f?.farm_id || '') === farmId);
                                      return (
                                      <th key={farmId} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[120px] border-r border-slate-100">
                                        <div className="flex items-center justify-between gap-1">
                                          <div className="text-left min-w-0">
                                            <div className="truncate">{getFarmLabel(farmId)}</div>
                                            {fd && (
                                              <div className="text-[9px] font-normal normal-case tracking-normal text-slate-400 mt-0.5 capitalize">
                                                {fd.crop_type}{fd.area ? ` · ${fd.area}ac` : ''}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setApiAllocFarms(prev => ({ ...prev, [alloc.task_id]: currentFarms.filter(f => f !== farmId) }))}
                                            className="shrink-0 text-slate-300 hover:text-red-500 transition-colors leading-none text-sm font-bold"
                                          >×</button>
                                        </div>
                                      </th>
                                    ); })}
                                    <th className="px-2 py-2 min-w-[180px] border-r border-slate-100">
                                      <div className="flex items-center gap-1">
                                        <select
                                          value={apiFarmSelectors[alloc.task_id] || ''}
                                          onChange={e => setApiFarmSelectors(prev => ({ ...prev, [alloc.task_id]: e.target.value }))}
                                          className="flex-1 rounded border border-dashed border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-500 focus:outline-none focus:border-green-500"
                                        >
                                          <option value="">+ Add farm column</option>
                                          {farms
                                            .filter((f: any) => !currentFarms.includes(String(f?.farm_id || '')))
                                            .map((f: any) => (
                                              <option key={String(f?.farm_id || '')} value={String(f?.farm_id || '')}>
                                                {f?.owner_name || f?.farm_id}{f?.crop_type ? ` · ${f.crop_type}` : ''}{f?.area ? ` (${f.area}ac)` : ''}
                                              </option>
                                            ))}
                                        </select>
                                        {apiFarmSelectors[alloc.task_id] && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const fid = apiFarmSelectors[alloc.task_id];
                                              setApiAllocFarms(prev => ({ ...prev, [alloc.task_id]: [...currentFarms, fid] }));
                                              setApiFarmSelectors(prev => ({ ...prev, [alloc.task_id]: '' }));
                                            }}
                                            className="shrink-0 rounded bg-green-700 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-800"
                                          >Add</button>
                                        )}
                                      </div>
                                    </th>
                                    <th className="sticky right-0 z-10 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-w-[90px] bg-slate-100 border-l border-slate-200">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentFarms.length === 0 && (
                                    <tr>
                                      <td colSpan={100} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                                        No farm columns yet — use "+ Add farm column" above to start distributing.
                                      </td>
                                    </tr>
                                  )}
                                  {items.map(([productId, item]) => {
                                    const allocated = currentFarms.reduce((s, fid) => {
                                      const local = apiAllocDistribution[alloc.task_id]?.[productId]?.[fid];
                                      const val = local !== undefined ? Number(local) : (item.farm_allocation?.[fid]?.quantity ?? 0);
                                      return s + (isNaN(val) ? 0 : val);
                                    }, 0);
                                    const isFullyAllocated = item.quantity > 0 && allocated === item.quantity;
                                    const isOver = allocated > item.quantity;
                                    return (
                                      <tr key={productId} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                                        <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-slate-200">
                                          <div className="font-semibold text-slate-900 truncate max-w-[140px]">{item.item_name}</div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">Need: {item.quantity} {item.unit}</div>
                                        </td>
                                        {currentFarms.map(farmId => (
                                          <td key={farmId} className="px-2 py-2 text-center border-r border-slate-100">
                                            <input
                                              type="number"
                                              min="0"
                                              value={getCellValue(productId, farmId)}
                                              onChange={e => setApiAllocDistribution(prev => ({
                                                ...prev,
                                                [alloc.task_id]: {
                                                  ...(prev[alloc.task_id] || {}),
                                                  [productId]: {
                                                    ...((prev[alloc.task_id] || {})[productId] || {}),
                                                    [farmId]: e.target.value,
                                                  },
                                                },
                                              }))}
                                              placeholder="0"
                                              className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-200 transition-colors"
                                            />
                                          </td>
                                        ))}
                                        <td className="px-2 py-2 border-r border-slate-100 bg-slate-50/30" />
                                        <td className="sticky right-0 z-10 px-3 py-2 text-center bg-white border-l border-slate-200">
                                          <span className={cn('text-xs font-bold block', isOver ? 'text-red-600' : isFullyAllocated ? 'text-emerald-700' : 'text-amber-600')}>
                                            {allocated}/{item.quantity}
                                          </span>
                                          {isFullyAllocated && <span className="text-[10px] text-emerald-600">Done</span>}
                                          {isOver && <span className="text-[10px] text-red-500">+{allocated - item.quantity} over</span>}
                                          {!isFullyAllocated && !isOver && <span className="text-[10px] text-amber-500">{item.quantity - allocated} left</span>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Create Allocation Modal ──────────────────────────────────────────── */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Create On Demand Allocation</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Allocate inventory items across farms and assign a responsible person.</p>
              </div>
              <button onClick={closeAllocationModal} className="p-1.5 rounded-md hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Responsible Person */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Responsible Person</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</label>
                    <select
                      value={allocationAssignment.designation}
                      onChange={e => setAllocationAssignment({ designation: e.target.value, staffId: '', staffName: '' })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      <option value="">Select designation</option>
                      {allocationDesignationOptions.length > 0
                        ? allocationDesignationOptions.map(d => <option key={d} value={d}>{formatDesignationLabel(d)}</option>)
                        : <option value="" disabled>Loading...</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign to</label>
                    <select
                      value={allocationAssignment.staffId}
                      disabled={!allocationAssignment.designation}
                      onChange={e => {
                        const staffId = e.target.value;
                        const matched = allocationAssigneeOptions.find(s => String(s?.staff_id || '') === staffId);
                        setAllocationAssignment(prev => ({ ...prev, staffId, staffName: String(matched?.staff_information?.staff_name || '') }));
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">{allocationAssignment.designation ? 'Select person' : 'Select designation first'}</option>
                      {allocationAssigneeOptions.map(s => (
                        <option key={String(s?.staff_id || '')} value={String(s?.staff_id || '')}>{String(s?.staff_information?.staff_name || 'Unknown')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items to Allocate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Items to Allocate</p>
                  <button type="button" onClick={addAllocationItem} className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                {allocationItems.map((item, itemIdx) => (
                  <div key={item.id} className="flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-xs font-semibold text-slate-700 shrink-0 mb-0.5">{itemIdx + 1}</div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Inventory Item</label>
                      <select
                        value={item.inventoryItemId}
                        onChange={e => updateAllocationItemField(item.id, { inventoryItemId: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                      >
                        <option value="">Select item</option>
                        {inventoryItems.map(inv => (
                          <option key={getInventoryItemId(inv)} value={getInventoryItemId(inv)}>
                            {getInventoryItemName(inv)}{inv?.stock != null ? ` (${inv.stock} ${String(inv?.unit || '')})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="shrink-0">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.totalQty}
                        onChange={e => updateAllocationItemField(item.id, { totalQty: e.target.value })}
                        placeholder="0"
                        className="mt-1 w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    {allocationItems.length > 1 && (
                      <button type="button" onClick={() => removeAllocationItem(item.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 mb-0.5">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <p className="text-[11px] text-slate-400 italic px-1">
                  Farm distribution is set in the matrix after creating the allocation.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 shrink-0">
              <p className="text-xs text-slate-500">{allocationItems.length} item{allocationItems.length !== 1 ? 's' : ''} selected</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeAllocationModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAllocation}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
                >
                  <UserCheck className="h-4 w-4" />
                  Create Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Task Modal ─────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] flex flex-col max-h-[92vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Create On Demand Task</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Build a step-wise task and allocate resources.</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-md hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Designation + Assignee */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Assignee</p>
                {!taskAssignment.designation && (
                  <p className="mb-3 rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    Select a designation and assignee to unlock steps.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</label>
                    <select
                      value={taskAssignment.designation}
                      onChange={e => {
                        setTaskAssignment({ designation: e.target.value, staffId: '', staffName: '' });
                        setTaskFlowSteps([]);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      <option value="">Select designation</option>
                      {designationOptions.length > 0
                        ? designationOptions.map(d => <option key={d} value={d}>{formatDesignationLabel(d)}</option>)
                        : <option value="" disabled>Loading...</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign to</label>
                    <select
                      value={taskAssignment.staffId}
                      disabled={!taskAssignment.designation}
                      onChange={e => {
                        const staffId = e.target.value;
                        const matched = assigneeOptions.find(s => String(s?.staff_id || '') === staffId);
                        const staffName = String(matched?.staff_information?.staff_name || '');
                        setTaskAssignment(prev => ({ ...prev, staffId, staffName }));
                        if (staffId) setTaskFlowSteps([{ ...createTaskStep(1), details: { ...createTaskStep(1).details, assignee: staffName, assigneeDesignation: taskAssignment.designation } }]);
                        else setTaskFlowSteps([]);
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">{taskAssignment.designation ? 'Select assignee' : 'Select designation first'}</option>
                      {assigneeOptions.length > 0
                        ? assigneeOptions.map(s => <option key={String(s?.staff_id || '')} value={String(s?.staff_id || '')}>{String(s?.staff_information?.staff_name || 'Unknown')}</option>)
                        : <option value="" disabled>No staff for this designation</option>}
                    </select>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {taskFlowSteps.length > 0 ? taskFlowSteps.map((step, index) => {
                  const meta = step.type ? taskStepTypeMeta[step.type] : null;
                  const selectedInventoryRows = Object.entries(step.details.inventoryItems).filter(([, qty]) => Number(qty) > 0).map(([itemId, qty]) => ({ itemId, qty: Number(qty), item: inventoryItems.find(it => getInventoryItemId(it) === itemId) }));
                  const selectedVehicles = step.details.vehicleIds.map(vid => vehicles.find(v => getVehicleId(v) === vid)).filter(Boolean);
                  const selectedLand = farms.find(f => String(f?.farm_id || f?.id || '') === step.details.landId);

                  return (
                    <div key={step.id} className={cn('relative rounded-xl border p-3 shadow-sm', meta?.shell || 'border-slate-200 bg-white')}>
                      <div className="absolute left-3 top-3 flex flex-col items-center">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold', meta?.badge || 'border-slate-200 bg-slate-100 text-slate-700')}>
                          {step.stepNumber}
                        </div>
                        {index < taskFlowSteps.length - 1 && <div className="mt-1.5 h-full min-h-8 w-px bg-slate-200" />}
                      </div>

                      <div className="space-y-3 pt-12">
                        <div className={cn('rounded-xl border p-3', meta?.panel || 'border-slate-200 bg-white')}>
                          {/* Step header row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Type</label>
                              <select
                                value={step.type}
                                onChange={e => updateStep(step.id, { type: e.target.value as TaskStepType, expanded: true })}
                                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                              >
                                <option value="">Select type</option>
                                <option value="inventory">Inventory</option>
                                <option value="logistics">Logistics</option>
                                <option value="inspection">Inspection</option>
                                <option value="cultivation">Cultivation</option>
                                <option value="other">Others</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 mt-4">
                              {taskFlowSteps.length > 1 && (
                                <button type="button" onClick={() => removeStep(step.id)} className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                                  Remove
                                </button>
                              )}
                              <button type="button" onClick={() => updateStep(step.id, { expanded: !step.expanded })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', step.expanded ? 'rotate-180' : '')} />
                              </button>
                            </div>
                          </div>

                          {/* Step content */}
                          {step.type && step.expanded && (
                            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                              {/* Inventory */}
                              {step.type === 'inventory' && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-900">Selected items</p>
                                    <button type="button" onClick={() => setResourcePopup({ stepId: step.id, type: 'inventory' })} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                                      Open inventory
                                    </button>
                                  </div>
                                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      <div>Item</div><div>Unit</div><div className="text-right">Qty</div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {selectedInventoryRows.length > 0 ? selectedInventoryRows.map(({ itemId, qty, item }) => (
                                        <div key={itemId} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-xs">
                                          <div className="truncate font-medium text-slate-900">{item ? getInventoryItemName(item) : itemId}</div>
                                          <div className="text-slate-600">{String(item?.unit || '—')}</div>
                                          <div className="text-right font-semibold text-slate-900">{qty}</div>
                                        </div>
                                      )) : <div className="px-3 py-3 text-xs text-slate-500">No items selected yet.</div>}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Logistics */}
                              {step.type === 'logistics' && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-900">Selected vehicles</p>
                                    <button type="button" onClick={() => setResourcePopup({ stepId: step.id, type: 'logistics' })} className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
                                      Open vehicles
                                    </button>
                                  </div>
                                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      <div>Vehicle</div><div>Company</div><div className="text-right">Status</div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {selectedVehicles.length > 0 ? selectedVehicles.map((v: any) => (
                                        <div key={getVehicleId(v)} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-xs">
                                          <div className="truncate font-medium text-slate-900">{getVehicleName(v)}</div>
                                          <div className="text-slate-600">{String(v?.vehicle_information?.company || '—')}</div>
                                          <div className="text-right text-emerald-700">Selected</div>
                                        </div>
                                      )) : <div className="px-3 py-3 text-xs text-slate-500">No vehicles selected yet.</div>}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Inspection */}
                              {step.type === 'inspection' && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-900">Inspection fields</p>
                                    <button type="button" onClick={() => addInspectionField(step.id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                                      <Plus className="h-3 w-3" /> Add field
                                    </button>
                                  </div>
                                  {step.details.inspectionFields.length > 0 ? step.details.inspectionFields.map((field, fi) => (
                                    <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-600">Field {fi + 1}</span>
                                        <button type="button" onClick={() => removeInspectionField(step.id, field.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                                      </div>
                                      <input value={field.fieldName} onChange={e => updateInspectionField(step.id, field.id, { fieldName: e.target.value })} placeholder="Field name" className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none" />
                                      <div className="flex items-center gap-2">
                                        <select value={field.inputType} onChange={e => updateInspectionField(step.id, field.id, { inputType: e.target.value, options: [] })} className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-slate-900 focus:outline-none">
                                          <option value="number">Number</option>
                                          <option value="text">Text</option>
                                          <option value="mcq">MCQ</option>
                                          <option value="image">Image upload</option>
                                        </select>
                                        <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 shrink-0">
                                          <input type="checkbox" checked={field.mandatory} onChange={e => updateInspectionField(step.id, field.id, { mandatory: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300" />
                                          Mandatory
                                        </label>
                                      </div>
                                      {field.inputType === 'mcq' && (
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Options</span>
                                            <button type="button" onClick={() => updateInspectionField(step.id, field.id, { options: [...(field.options || []), ''] })} className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 hover:underline">
                                              <Plus className="h-3 w-3" /> Add option
                                            </button>
                                          </div>
                                          {(field.options || []).length === 0 ? (
                                            <p className="text-[10px] text-slate-400 italic">No options yet — click Add option.</p>
                                          ) : (field.options || []).map((opt, oi) => (
                                            <div key={oi} className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-slate-400 w-4 shrink-0">{oi + 1}.</span>
                                              <input value={opt} onChange={e => { const next = [...(field.options || [])]; next[oi] = e.target.value; updateInspectionField(step.id, field.id, { options: next }); }} placeholder={`Option ${oi + 1}`} className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none" />
                                              <button type="button" onClick={() => { const next = (field.options || []).filter((_, i) => i !== oi); updateInspectionField(step.id, field.id, { options: next }); }} className="text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )) : (
                                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">No fields yet. Use Add field above.</div>
                                  )}
                                </div>
                              )}

                              {/* Cultivation */}
                              {step.type === 'cultivation' && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-slate-900">Cultivation details</p>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Farm</label>
                                    <select value={step.details.landId} onChange={e => updateStepDetails(step.id, { landId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none">
                                      <option value="">Choose farm</option>
                                      {farms.map((f: any) => <option key={f.farm_id} value={f.farm_id}>{f?.owner_name || f?.farm_id}{f?.crop_type ? ` · ${f.crop_type}` : ''}{f?.area ? ` (${f.area}ac)` : ''}</option>)}
                                    </select>
                                  </div>
                                  {selectedLand && (
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs space-y-1">
                                      <div className="flex gap-6"><span className="text-slate-500">Area</span><span className="font-medium text-slate-900">{Number(selectedLand?.area || 0).toFixed(2)} acres</span></div>
                                      <div className="flex gap-6"><span className="text-slate-500">Village</span><span className="font-medium text-slate-900">{selectedLand?.land_data?.village || '—'}</span></div>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Task type</label>
                                      <select value={step.details.cultivationTaskType} onChange={e => updateStepDetails(step.id, { cultivationTaskType: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none">
                                        <option value="">Choose task type</option>
                                        <option value="land-preparation">Land preparation</option>
                                        <option value="sowing">Sowing</option>
                                        <option value="irrigation">Irrigation</option>
                                        <option value="spraying">Spraying</option>
                                        <option value="harvesting">Harvesting</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Due date</label>
                                      <input type="date" value={step.details.dueDate} onChange={e => updateStepDetails(step.id, { dueDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Other */}
                              {step.type === 'other' && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-900 mb-1.5">Description</p>
                                  <textarea value={step.details.otherDescription} onChange={e => updateStepDetails(step.id, { otherDescription: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none" placeholder="Add task description" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 text-center">
                    Step 1 will appear after selecting a designation and assignee.
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-200 shrink-0">
              <button type="button" onClick={handleAssignTask} disabled={isCreatingTask} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                <UserCheck className="h-4 w-4" />
                {isCreatingTask ? 'Creating...' : 'Assign Task'}
              </button>
              <button type="button" onClick={addStep} disabled={!canAddSteps} className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors', canAddSteps ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-gray-200 text-gray-400')}>
                <Plus className="h-4 w-4" /> Add step
              </button>
              <button type="button" onClick={closeModal} className="ml-auto rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resource popup ────────────────────────────────────────────────────── */}
      {resourcePopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{resourcePopup.type === 'inventory' ? 'Inventory popup' : 'Vehicle popup'}</p>
                <h4 className="text-base font-semibold text-slate-900">{resourcePopup.type === 'inventory' ? 'Select inventory items' : 'Select vehicles'}</h4>
              </div>
              <button type="button" onClick={() => setResourcePopup(null)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4">
              {resourcePopup.type === 'inventory' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_130px] gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <div>Item</div><div>Stock</div><div>Unit</div><div className="text-right">Qty</div>
                  </div>
                  {inventoryItems.map(item => {
                    const itemId = getInventoryItemId(item);
                    const current = Number(taskFlowSteps.find(s => s.id === resourcePopup.stepId)?.details.inventoryItems[itemId] || 0);
                    const max = Number(item?.stock || 0);
                    return (
                      <div key={itemId} className="grid grid-cols-[2fr_1fr_1fr_130px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm">
                        <div><div className="font-medium text-slate-900">{getInventoryItemName(item)}</div><div className="text-xs text-slate-500">{itemId}</div></div>
                        <div className="text-slate-700">{max}</div>
                        <div className="text-slate-600">{String(item?.unit || '—')}</div>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => updateInventorySelection(resourcePopup.stepId, itemId, -1)} disabled={current === 0} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">-</button>
                          <div className="w-8 text-center font-semibold text-slate-900 text-sm">{current}</div>
                          <button type="button" onClick={() => updateInventorySelection(resourcePopup.stepId, itemId, 1, max)} disabled={max === 0 || current >= max} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_100px] gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <div>Vehicle</div><div>Company</div><div>Status</div><div className="text-right">Action</div>
                  </div>
                  {vehicles.map(vehicle => {
                    const vehicleId = getVehicleId(vehicle);
                    const step = taskFlowSteps.find(s => s.id === resourcePopup.stepId);
                    const selected = !!step?.details.vehicleIds.includes(vehicleId);
                    return (
                      <div key={vehicleId} className={cn('grid grid-cols-[2fr_1fr_1fr_100px] items-center gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-sm', selected ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white')}>
                        <div><div className="font-medium text-slate-900">{getVehicleName(vehicle)}</div><div className="text-xs text-slate-500">{vehicleId}</div></div>
                        <div className="text-slate-700">{String(vehicle?.vehicle_information?.company || '—')}</div>
                        <div className={selected ? 'text-emerald-700 text-xs font-medium' : 'text-slate-500 text-xs'}>{selected ? 'Selected' : 'Available'}</div>
                        <div className="flex justify-end">
                          <button type="button" onClick={() => toggleVehicleSelection(resourcePopup.stepId, vehicleId)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            {selected ? 'Remove' : 'Select'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 bg-white px-5 py-3">
              <button type="button" onClick={() => setResourcePopup(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnDemandTask;
