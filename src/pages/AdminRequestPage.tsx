import React, { useEffect, useState } from 'react';
import { 
  FileText, CheckCircle2, MessageSquare, 
  Plus, ArrowRight, UserCheck, Settings,
  Building2, Send, X, ClipboardCheck, User, Phone, Package,
  MapPin, Calendar, Truck, Search, ChevronDown, AlertTriangle, ChevronRight,
  ArrowLeft, Layers3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBaseUrl } from '@/lib/config';
import { toast } from 'sonner';

/**
 * ADMIN REQUEST WORKFLOW:
 * 
 * 1. DEPARTMENT SUBMITS → User creates request in their department (e.g., Logistics, Inventory)
 * 2. ADMIN RECEIVES → Request appears in Admin Request Management page with status: 'pending'
 * 3. ADMIN REVIEWS → Admin reviews department approval, adds notes, and approves
 * 4. ADMIN FORWARDS → Admin selects department(s) to forward the approved request
 * 5. DEPARTMENT RECEIVES → Forwarded request appears back in the selected department(s) for action
 * 
 * Status Flow: pending → approved → in_progress (forwarded)
 */

type RequestStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
type RequestPriority = 'urgent' | 'high' | 'medium' | 'low';
type RequestType = 'logistics' | 'inventory' | 'maintenance' | 'procurement' | 'other';
type TaskStepType = 'inventory' | 'logistics' | 'inspection' | 'cultivation' | 'other';

type ApprovalStageStatus = 'pending' | 'approved' | 'approved_and_forwarded' | 'rejected' | string;

type BackendAdminOpsRequest = {
  first_department?: string;
  request_details?: {
    note?: string;
    request_location?: string;
    request_type?: string;
    meta_data?: Array<{
      driver_name?: string;
      fuel_amount?: number;
      request_id?: string;
      vehicle_number?: string;
    }>;
  };
  date?: string;
  created_at?: string;
  request_id?: string;
  concerned_department_approval_status?: ApprovalStageStatus;
  concerned_department_note?: string;
  forwarded_department_approval_status?: ApprovalStageStatus;
  admin_ops_approval_status?: ApprovalStageStatus;
  admin_ops_note?: string;
  sender_details?: {
    staff_name?: string;
    staff_phone?: string;
    staff_department?: string;
    staff_designation?: string;
    staff_id?: string;
  };
  forwarded_to_departments?: string[];
};

interface AdminRequestData {
  id: string;
  adminOpsApprovalStatus: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  requesterDepartment: string;
  requestType: RequestType;
  requestDetailsType?: string;
  fuelMetaData?: Array<{
    driver_name: string;
    fuel_amount: number;
    request_id: string;
    vehicle_number: string;
  }>;
  title: string;
  description: string;
  vehicleType?: string;
  fromLocation?: string;
  toLocation?: string;
  preferredDate?: string;
  loadDetails?: string;
  priority: RequestPriority;
  status: RequestStatus;
  createdAt: string;
  deptApprovals: string;
  deptReason: string;
  adminNotes: string;
  forwardedTo?: string;
  forwardedAt?: string;
  receiverId?: string;
  receiverName?: string;
  receiverDepartment?: string;
}

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
    inspectionFields: Array<{
      id: string;
      fieldName: string;
      inputType: string;
      mandatory: boolean;
    }>;
    landId: string;
    cultivationTaskType: string;
    dueDate: string;
    otherDescription: string;
  };
}

const taskStepTypeMeta: Record<TaskStepType, {
  label: string;
  badge: string;
  shell: string;
  panel: string;
  hint: string;
}> = {
  inventory: {
    label: 'Inventory',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    shell: 'border-emerald-200 bg-emerald-50/60',
    panel: 'border-emerald-200 bg-white',
    hint: 'Material, stock, quantity, and unit planning',
  },
  logistics: {
    label: 'Logistics',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    shell: 'border-amber-200 bg-amber-50/60',
    panel: 'border-amber-200 bg-white',
    hint: 'Vehicle, route, pickup, and delivery coordination',
  },
  inspection: {
    label: 'Inspection',
    badge: 'bg-sky-100 text-sky-700 border-sky-200',
    shell: 'border-sky-200 bg-sky-50/60',
    panel: 'border-sky-200 bg-white',
    hint: 'Checklist, site review, and compliance verification',
  },
  cultivation: {
    label: 'Cultivation',
    badge: 'bg-lime-100 text-lime-800 border-lime-200',
    shell: 'border-lime-200 bg-lime-50/60',
    panel: 'border-lime-200 bg-white',
    hint: 'Farm activity, crop cycle, and field work planning',
  },
  other: {
    label: 'Other',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    shell: 'border-slate-200 bg-slate-50/70',
    panel: 'border-slate-200 bg-white',
    hint: 'Free-form task details and custom instructions',
  },
};

type StaffRecord = {
  staff_id?: string;
  staff_information?: {
    staff_name?: string;
    staff_department?: string;
    staff_designation?: string;
  };
};

const normalizeDesignation = (value?: string) => String(value || '').trim().toLowerCase();
const formatDesignationLabel = (value?: string) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const AdminRequestPage = () => {
  const [requests, setRequests] = useState<AdminRequestData[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [forwardingRequestId, setForwardingRequestId] = useState<string | null>(null);
  const [createTaskRequestId, setCreateTaskRequestId] = useState<string | null>(null);
  const [taskFlowsByRequest, setTaskFlowsByRequest] = useState<Record<string, TaskFlowStep[]>>({});
  const [taskAssignmentByRequest, setTaskAssignmentByRequest] = useState<Record<string, { designation: string; staffId: string; staffName: string }>>({});
  const [staffByDesignation, setStaffByDesignation] = useState<Record<string, StaffRecord[]>>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [resourcePopup, setResourcePopup] = useState<{
    requestId: string;
    stepId: string;
    type: 'inventory' | 'logistics';
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentEditingNotes, setCurrentEditingNotes] = useState<{id: string, notes: string} | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, string[]>>({});

  const parseRequestLocation = (raw?: string): { fromLocation?: string; toLocation?: string } => {
    const cleaned = String(raw || '').trim();
    if (!cleaned) return { fromLocation: undefined, toLocation: undefined };
    const parts = cleaned.split('->').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return { fromLocation: parts[0], toLocation: parts.slice(1).join(' -> ') };
    return { fromLocation: cleaned, toLocation: undefined };
  };

  const normalizeRequestType = (raw?: string): RequestType => {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'logistics') return 'logistics';
    if (v === 'inventory') return 'inventory';
    if (v === 'maintenance') return 'maintenance';
    if (v === 'procurement') return 'procurement';
    return 'other';
  };

  const titleFromNote = (note?: string): string => {
    const cleaned = String(note || '').trim();
    if (!cleaned) return 'Request';
    // Use first sentence-ish / first chunk as a title.
    const firstLine = cleaned.split(/\r?\n/)[0] || cleaned;
    const clipped = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
    return clipped;
  };

  const createTaskStep = (stepNumber: number): TaskFlowStep => ({
    id: `${Date.now()}-${stepNumber}-${Math.random().toString(16).slice(2)}`,
    stepNumber,
    type: '',
    expanded: true,
    details: {
      assignee: '',
      assigneeDesignation: '',
      title: `Step ${stepNumber}`,
      notes: '',
      inventoryItems: {},
      vehicleIds: [],
      inspectionInputType: 'text',
      inspectionFields: [],
      landId: '',
      cultivationTaskType: '',
      dueDate: '',
      otherDescription: '',
    },
  });

  const getInventoryItemId = (item: any) => String(item?.id || item?.Invent_id || item?.item_id || item?.item || '');
  const getVehicleId = (vehicle: any) => String(vehicle?.vehicle_id || vehicle?.id || '');

  const getInventoryItemName = (item: any) => String(item?.item_name || item?.name || item?.item || getInventoryItemId(item) || 'Unknown item');
  const getVehicleName = (vehicle: any) => String(vehicle?.vehicle_information?.vehicle_number || vehicle?.vehicle_number || vehicle?.name || getVehicleId(vehicle) || 'Unknown vehicle');

  useEffect(() => {
    const fetchSharedResources = async () => {
      try {
        const [invRes, vehRes, farmRes] = await Promise.all([
          fetch(`${getBaseUrl()}/inventory_management/get_inventory_items`),
          fetch(`${getBaseUrl()}/admin_vehicles/get_all_vehicles`),
          fetch(`${getBaseUrl()}/farmer_managment/get_farms`),
        ]);

        const invJson = await invRes.json().catch(() => ({}));
        const vehJson = await vehRes.json().catch(() => ({}));
        const farmJson = await farmRes.json().catch(() => ({}));

        const invList = Array.isArray(invJson?.inventory_items) ? invJson.inventory_items : [];
        const vehList = Array.isArray(vehJson) ? vehJson : Array.isArray(vehJson?.vehicles) ? vehJson.vehicles : [];
        const farmList = Array.isArray(farmJson?.farms) ? farmJson.farms : [];

        setInventoryItems(invList.length > 0 ? invList : [
          { id: 'inv-1', item_name: 'Fertilizer A', stock: 50, unit: 'kg' },
          { id: 'inv-2', item_name: 'Pesticide B', stock: 30, unit: 'ltr' },
        ]);
        setVehicles(vehList.length > 0 ? vehList : [
          { vehicle_id: 'veh-1', vehicle_information: { vehicle_number: 'TR-001', company: 'AgroCo' }, work_calandar: {} },
          { vehicle_id: 'veh-2', vehicle_information: { vehicle_number: 'TR-002', company: 'AgroCo' }, work_calandar: {} },
        ]);
        setFarms(farmList.length > 0 ? farmList : [
          { farm_id: 'farm-1', farmer_id: 'farmer-1', area: 2.5, priority: 1, land_data: { village: 'Village A', district: 'District X' } },
          { farm_id: 'farm-2', farmer_id: 'farmer-2', area: 1.75, priority: 2, land_data: { village: 'Village B', district: 'District Y' } },
        ]);
      } catch {
        setInventoryItems([
          { id: 'inv-1', item_name: 'Fertilizer A', stock: 50, unit: 'kg' },
          { id: 'inv-2', item_name: 'Pesticide B', stock: 30, unit: 'ltr' },
        ]);
        setVehicles([
          { vehicle_id: 'veh-1', vehicle_information: { vehicle_number: 'TR-001', company: 'AgroCo' }, work_calandar: {} },
          { vehicle_id: 'veh-2', vehicle_information: { vehicle_number: 'TR-002', company: 'AgroCo' }, work_calandar: {} },
        ]);
        setFarms([
          { farm_id: 'farm-1', farmer_id: 'farmer-1', area: 2.5, priority: 1, land_data: { village: 'Village A', district: 'District X' } },
          { farm_id: 'farm-2', farmer_id: 'farmer-2', area: 1.75, priority: 2, land_data: { village: 'Village B', district: 'District Y' } },
        ]);
      }
    };

    fetchSharedResources();
  }, []);

  const fetchAllStaff = async () => {
    const response = await fetch(`${getBaseUrl()}/admin_staff/get_all_staff`);

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : Array.isArray(data?.staffs) ? data.staffs : Array.isArray(data?.data) ? data.data : [];

    const grouped = list.reduce((acc: Record<string, StaffRecord[]>, staff: StaffRecord) => {
      const designation = normalizeDesignation(staff?.staff_information?.staff_designation);
      if (!designation) return acc;
      acc[designation] = [...(acc[designation] || []), staff];
      return acc;
    }, {});

    setStaffByDesignation(grouped);
  };

  const initializeTaskFlow = async (requestId: string) => {
    setCreateTaskRequestId(requestId);
    try {
      await fetchAllStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff');
      setStaffByDesignation({});
    }
  };

  const updateTaskAssignment = (requestId: string, patch: Partial<{ designation: string; staffId: string; staffName: string }>) => {
    setTaskAssignmentByRequest((prev) => ({
      ...prev,
      [requestId]: {
        designation: prev[requestId]?.designation || '',
        staffId: prev[requestId]?.staffId || '',
        staffName: prev[requestId]?.staffName || '',
        ...patch,
      },
    }));
  };

  const buildStepsDict = (steps: TaskFlowStep[]) => {
    return steps.reduce<Record<string, any>>((acc, step, index) => {
      if (!step.type) return acc;

      const stepKey = `step_${index + 1}`;

      if (step.type === 'inventory') {
        const data = Object.entries(step.details.inventoryItems)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([itemId, quantity]) => {
            const item = inventoryItems.find((entry) => getInventoryItemId(entry) === itemId);
            return {
              item_name: String(item ? getInventoryItemName(item) : itemId),
              quantity: Number(quantity) || 0,
              unit: String(item?.unit || '—'),
              equipment_id: String(getInventoryItemId(item) || itemId),
            };
          });

        acc[stepKey] = { type: 'inventory', data, status: 'pending' };
        return acc;
      }

      if (step.type === 'logistics') {
        const data = step.details.vehicleIds
          .map((vehicleId) => {
            const vehicle = vehicles.find((entry) => getVehicleId(entry) === vehicleId);
            if (!vehicle) return null;
            return {
              vehicle_id: getVehicleId(vehicle),
              vehicle_number: String(vehicle?.vehicle_information?.vehicle_number || getVehicleName(vehicle)),
            };
          })
          .filter(Boolean);

        acc[stepKey] = { type: 'logistics', data, status: 'pending' };
        return acc;
      }

      if (step.type === 'cultivation') {
        const selectedLand = farms.find((farm) => String(farm?.farm_id || farm?.id || '') === step.details.landId);
        acc[stepKey] = {
          type: 'cultivation',
          data: selectedLand
            ? [{ farm_id: String(selectedLand?.farm_id || selectedLand?.id || ''), activity: String(step.details.cultivationTaskType || ''), due_date: String(step.details.dueDate || '') }]
            : [],
          status: 'pending',
        };
        return acc;
      }

      if (step.type === 'inspection') {
        acc[stepKey] = {
          type: 'inspection',
          data: step.details.inspectionFields.map((field) => ({
            field_name: String(field.fieldName || ''),
            input_type: String(field.inputType || 'text'),
            mandetory: Boolean(field.mandatory),
          })),
          status: 'pending',
        };
        return acc;
      }

      acc[stepKey] = {
        type: 'others',
        data: [{ description: String(step.details.otherDescription || '') }],
        status: 'pending',
      };
      return acc;
    }, {});
  };

  const updateTaskStep = (requestId: string, stepId: string, patch: Partial<TaskFlowStep>) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
    }));
  };

  const updateTaskStepDetails = (requestId: string, stepId: string, patch: Partial<TaskFlowStep['details']>) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => (
        step.id === stepId
          ? { ...step, details: { ...step.details, ...patch } }
          : step
      )),
    }));
  };

  const addInspectionField = (requestId: string, stepId: string) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          details: {
            ...step.details,
            inspectionFields: [
              ...step.details.inspectionFields,
              {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                fieldName: '',
                inputType: 'text',
                mandatory: false,
              },
            ],
          },
        };
      }),
    }));
  };

  const updateInspectionField = (
    requestId: string,
    stepId: string,
    fieldId: string,
    patch: Partial<{ fieldName: string; inputType: string; mandatory: boolean }>
  ) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          details: {
            ...step.details,
            inspectionFields: step.details.inspectionFields.map((field) => (
              field.id === fieldId ? { ...field, ...patch } : field
            )),
          },
        };
      }),
    }));
  };

  const removeInspectionField = (requestId: string, stepId: string, fieldId: string) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => {
        if (step.id !== stepId) return step;
        return {
          ...step,
          details: {
            ...step.details,
            inspectionFields: step.details.inspectionFields.filter((field) => field.id !== fieldId),
          },
        };
      }),
    }));
  };

  const addTaskStep = (requestId: string) => {
    setTaskFlowsByRequest((prev) => {
      const current = prev[requestId] || [createTaskStep(1)];
      const next = [...current, createTaskStep(current.length + 1)].map((step, index) => ({
        ...step,
        stepNumber: index + 1,
        details: {
          ...step.details,
          title: step.details.title?.trim() ? step.details.title : `Step ${index + 1}`,
        },
      }));
      return { ...prev, [requestId]: next };
    });
  };

  const removeTaskStep = (requestId: string, stepId: string) => {
    setTaskFlowsByRequest((prev) => {
      const next = (prev[requestId] || []).filter((step) => step.id !== stepId).map((step, index) => ({
        ...step,
        stepNumber: index + 1,
        details: {
          ...step.details,
          title: step.details.title?.trim() ? step.details.title : `Step ${index + 1}`,
        },
      }));
      return { ...prev, [requestId]: next.length > 0 ? next : [createTaskStep(1)] };
    });
  };

  const toggleTaskStep = (requestId: string, stepId: string) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) =>
        step.id === stepId ? { ...step, expanded: !step.expanded } : step
      ),
    }));
  };

  const openResourcePopup = (requestId: string, stepId: string, type: 'inventory' | 'logistics') => {
    setResourcePopup({ requestId, stepId, type });
  };

  const closeResourcePopup = () => setResourcePopup(null);

  const updateInventorySelection = (requestId: string, stepId: string, itemId: string, delta: number, max?: number) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => {
        if (step.id !== stepId) return step;
        const current = Number(step.details.inventoryItems[itemId] || 0);
        const next = Math.max(0, Math.min(typeof max === 'number' ? max : Infinity, current + delta));
        return {
          ...step,
          details: {
            ...step.details,
            inventoryItems: { ...step.details.inventoryItems, [itemId]: next },
          },
        };
      }),
    }));
  };

  const toggleVehicleSelection = (requestId: string, stepId: string, vehicleId: string) => {
    setTaskFlowsByRequest((prev) => ({
      ...prev,
      [requestId]: (prev[requestId] || []).map((step) => {
        if (step.id !== stepId) return step;
        const current = step.details.vehicleIds || [];
        const next = current.includes(vehicleId)
          ? current.filter((id) => id !== vehicleId)
          : [...current, vehicleId];
        return {
          ...step,
          details: {
            ...step.details,
            vehicleIds: next,
          },
        };
      }),
    }));
  };

  const handleAssignTask = (requestId: string) => {
    const steps = taskFlowsByRequest[requestId] || [];
    const assignedSteps = steps.filter((step) => step.type);
    const assignment = taskAssignmentByRequest[requestId];
    const staffId = String(assignment?.staffId || '').trim();

    if (assignedSteps.length === 0) {
      toast.error('Please add at least one task step before assigning it');
      return;
    }

    if (!staffId) {
      toast.error('Please choose an assignee for the task first');
      return;
    }

    const stepsDict = buildStepsDict(assignedSteps);

    fetch(`${getBaseUrl()}/admin_ops_requests/create_on_demand_tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps_dict: stepsDict, staff_id: staffId }),
    })
      .then(async (response) => {
        let payload: any = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(String(payload?.message || payload?.detail || payload?.error || `Request failed (${response.status})`));
        }

        return payload;
      })
      .then(() => {
        toast.success('Task created successfully');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to create task');
      });
  };

  const renderTaskBuilder = (req: AdminRequestData) => {
    const currentFlow = taskFlowsByRequest[req.id] || [];
    const selectedDesignation = taskAssignmentByRequest[req.id]?.designation || '';
    const selectedAssignee = taskAssignmentByRequest[req.id]?.staffId || '';
    const steps = currentFlow;
    const assigneeOptions = selectedDesignation ? (staffByDesignation[selectedDesignation] || []) : [];
    const canCreateSteps = Boolean(selectedDesignation && selectedAssignee);
    const designationOptions = Object.keys(staffByDesignation).sort();

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task builder</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Create task flow</h3>
              <p className="text-sm text-slate-600 mt-1">Build step-by-step work instead of forwarding this request.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateTaskRequestId(null)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {!selectedDesignation && (
            <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              Select a designation and assignee first to unlock step 1.
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</label>
              <select
                value={selectedDesignation}
                onChange={(e) => {
                  const assigneeDesignation = e.target.value;
                  updateTaskAssignment(req.id, { designation: assigneeDesignation, staffId: '', staffName: '' });
                  setTaskFlowsByRequest((prev) => ({
                    ...prev,
                    [req.id]: [],
                  }));
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="">Select designation</option>
                {designationOptions.length > 0 ? designationOptions.map((designation) => (
                  <option key={designation} value={designation}>{formatDesignationLabel(designation)}</option>
                )) : (
                  <option value="" disabled>Loading designations...</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign to</label>
              <select
                value={selectedAssignee}
                onChange={(e) => {
                  const staffId = e.target.value;
                  const matchedStaff = assigneeOptions.find((staff) => String(staff?.staff_id || '') === staffId);
                  const staffName = String(matchedStaff?.staff_information?.staff_name || '');
                  updateTaskAssignment(req.id, { staffId, staffName });
                  if (!selectedDesignation) return;

                  setTaskFlowsByRequest((prev) => ({
                    ...prev,
                    [req.id]: staffId
                      ? [
                          {
                            ...createTaskStep(1),
                            details: {
                              ...createTaskStep(1).details,
                              assignee: staffName,
                              assigneeDesignation: selectedDesignation,
                            },
                          },
                        ]
                      : [],
                  }));
                }}
                disabled={!selectedDesignation}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">{selectedDesignation ? 'Select assignee' : 'Select designation first'}</option>
                {assigneeOptions.length > 0 ? assigneeOptions.map((staff) => {
                  const staffName = String(staff?.staff_information?.staff_name || 'Unknown staff');
                  const staffDesignation = String(staff?.staff_information?.staff_designation || '');
                  return (
                    <option key={staff?.staff_id || staffName} value={String(staff?.staff_id || '')}>
                      {staffName}{staffDesignation ? ` - ${staffDesignation}` : ''}
                    </option>
                  );
                }) : (
                  <option value="" disabled>
                    No staff found for this designation
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {steps.length > 0 ? steps.map((step, index) => {
            const meta = step.type ? taskStepTypeMeta[step.type] : null;
            const selectedInventoryRows = Object.entries(step.details.inventoryItems)
              .filter(([, qty]) => Number(qty) > 0)
              .map(([itemId, qty]) => ({
                itemId,
                qty: Number(qty) || 0,
                item: inventoryItems.find((it) => getInventoryItemId(it) === itemId),
              }));
            const selectedVehicles = step.details.vehicleIds
              .map((vehicleId) => vehicles.find((vehicle) => getVehicleId(vehicle) === vehicleId))
              .filter(Boolean);
            const selectedLand = farms.find((farm) => String(farm?.farm_id || farm?.id || '') === step.details.landId);

            return (
              <div key={step.id} className={cn('relative rounded-2xl border p-4 shadow-sm', meta?.shell || 'border-slate-200 bg-white')}>
                <div className="absolute left-4 top-4 flex flex-col items-center">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold', meta?.badge || 'border-slate-200 bg-slate-100 text-slate-700')}>
                    {step.stepNumber}
                  </div>
                  {index < steps.length - 1 && <div className="mt-2 h-full min-h-10 w-px bg-slate-200" />}
                </div>

                <div className="space-y-4 pt-16">
                    <div className={cn('rounded-xl border p-4', meta?.panel || 'border-slate-200 bg-white')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
                          <select
                            value={step.type}
                            onChange={(e) => updateTaskStep(req.id, step.id, { type: e.target.value as TaskStepType, expanded: true })}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                          >
                            <option value="">Select type</option>
                            <option value="inventory">Inventory</option>
                            <option value="logistics">Logistics</option>
                            <option value="inspection">Inspection</option>
                            <option value="cultivation">Cultivation</option>
                            <option value="other">Others</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          {steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTaskStep(req.id, step.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleTaskStep(req.id, step.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', step.expanded ? 'rotate-180' : '')} />
                            {step.expanded ? 'Collapse' : 'Expand'}
                          </button>
                        </div>
                      </div>

                      {step.type && step.expanded && (
                        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                          {step.type === 'inventory' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Selected items</p>
                                  <p className="text-xs text-slate-500">Inventory layout with selected items table.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openResourcePopup(req.id, step.id, 'inventory')}
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                  Open equipment popup
                                </button>
                              </div>
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  <div>Item</div>
                                  <div>Unit</div>
                                  <div className="text-right">Qty</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {selectedInventoryRows.length > 0 ? selectedInventoryRows.map(({ itemId, qty, item }) => (
                                    <div key={itemId} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-sm">
                                      <div className="min-w-0">
                                        <div className="truncate font-medium text-slate-900">{item ? getInventoryItemName(item) : itemId}</div>
                                        <div className="text-xs text-slate-500">Stock: {Number(item?.stock || 0)}</div>
                                      </div>
                                      <div className="text-slate-600">{String(item?.unit || '—')}</div>
                                      <div className="text-right font-semibold text-slate-900">{qty}</div>
                                    </div>
                                  )) : (
                                    <div className="px-3 py-4 text-sm text-slate-500">No inventory items selected yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {step.type === 'logistics' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Selected vehicles</p>
                                  <p className="text-xs text-slate-500">Logistics layout with selected vehicles table.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openResourcePopup(req.id, step.id, 'logistics')}
                                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
                                >
                                  Open vehicle popup
                                </button>
                              </div>
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  <div>Vehicle</div>
                                  <div>Company</div>
                                  <div className="text-right">Status</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {selectedVehicles.length > 0 ? selectedVehicles.map((vehicle: any) => (
                                    <div key={getVehicleId(vehicle)} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-2 px-3 py-2 text-sm">
                                      <div className="min-w-0 font-medium text-slate-900">{getVehicleName(vehicle)}</div>
                                      <div className="text-slate-600">{String(vehicle?.vehicle_information?.company || '—')}</div>
                                      <div className="text-right text-emerald-700">Selected</div>
                                    </div>
                                  )) : (
                                    <div className="px-3 py-4 text-sm text-slate-500">No vehicles selected yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {step.type === 'inspection' && (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Inspection form</p>
                                <p className="text-xs text-slate-500">Add fields to build a custom inspection form.</p>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                
                                  <button
                                    type="button"
                                    onClick={() => addInspectionField(req.id, step.id)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add field
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {step.details.inspectionFields.length > 0 ? step.details.inspectionFields.map((field, index) => (
                                    <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                                            {index + 1}
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-slate-900">Field row {index + 1}</p>
                                            <p className="text-xs text-slate-500">Configure one form field here.</p>
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeInspectionField(req.id, step.id, field.id)}
                                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                                        >
                                          Remove
                                        </button>
                                      </div>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Field name</label>
                                          <input
                                            value={field.fieldName}
                                            onChange={(e) => updateInspectionField(req.id, step.id, field.id, { fieldName: e.target.value })}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                            placeholder="e.g. Soil condition"
                                          />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                          <div>
                                            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Input type</label>
                                            <select
                                              value={field.inputType}
                                              onChange={(e) => updateInspectionField(req.id, step.id, field.id, { inputType: e.target.value })}
                                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                            >
                                              <option value="text">Short text</option>
                                              <option value="textarea">Long text</option>
                                              <option value="number">Number</option>
                                              <option value="date">Date</option>
                                              <option value="dropdown">Dropdown</option>
                                              <option value="checkbox">Checkbox</option>
                                            </select>
                                          </div>

                                          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:min-h-[42px]">
                                            <input
                                              type="checkbox"
                                              checked={field.mandatory}
                                              onChange={(e) => updateInspectionField(req.id, step.id, field.id, { mandatory: e.target.checked })}
                                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                            />
                                            Mandatory
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )) : (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                      No fields added yet. Use Add field to build the inspection form.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {step.type === 'cultivation' && (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Cultivation details</p>
                                <p className="text-xs text-slate-500">Select land, task type, and due date.</p>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select farm</label>
                                  <select
                                    value={step.details.landId}
                                    onChange={(e) => updateTaskStepDetails(req.id, step.id, { landId: e.target.value })}
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                  >
                                    <option value="">Choose farm</option>
                                    {farms.map((farm: any) => (
                                      <option key={farm.farm_id} value={farm.farm_id}>
                                        {farm?.farmer_name?.farmer_name || farm?.farmer_name || farm?.farmer_id || farm.farm_id}
                                        {farm?.land_data?.village ? ` - ${farm.land_data.village}` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-slate-500">Farmer name</span>
                                      <span className="font-medium text-slate-900">
                                        {selectedLand ? String(selectedLand?.farmer_name?.farmer_name || selectedLand?.farmer_name || selectedLand?.farmer_id || '—') : '—'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-slate-500">Area of land</span>
                                      <span className="font-medium text-slate-900">
                                        {selectedLand && selectedLand?.area != null ? `${selectedLand.area} Acres` : '—'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-slate-500">Type of crop</span>
                                      <span className="font-medium text-slate-900">
                                        {selectedLand ? String(selectedLand?.crop_type || selectedLand?.cropType || selectedLand?.land_data?.crop_type || '—') : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Task type</label>
                                    <select
                                      value={step.details.cultivationTaskType}
                                      onChange={(e) => updateTaskStepDetails(req.id, step.id, { cultivationTaskType: e.target.value })}
                                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                    >
                                      <option value="">Choose task type</option>
                                      <option value="land-preparation">Land preparation</option>
                                      <option value="sowing">Sowing</option>
                                      <option value="irrigation">Irrigation</option>
                                      <option value="spraying">Spraying</option>
                                      <option value="harvesting">Harvesting</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</label>
                                    <input
                                      type="date"
                                      value={step.details.dueDate}
                                      onChange={(e) => updateTaskStepDetails(req.id, step.id, { dueDate: e.target.value })}
                                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {step.type === 'other' && (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Other details</p>
                                <p className="text-xs text-slate-500">Keep it simple with a short description.</p>
                              </div>
                              <textarea
                                value={step.details.otherDescription}
                                onChange={(e) => updateTaskStepDetails(req.id, step.id, { otherDescription: e.target.value })}
                                rows={4}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                                placeholder="Add the task description"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Step 1 will appear here after designation and assignee are selected.
            </div>
          )}
        </div>

        <div className="flex items-center justify-start gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAssignTask(req.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <UserCheck className="h-4 w-4" />
              Assign this task
            </button>
            <button
              type="button"
              onClick={() => addTaskStep(req.id)}
              disabled={!canCreateSteps}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                canCreateSteps
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              )}
            >
              <Plus className="h-4 w-4" />
              Add step
            </button>
          </div>
        </div>

        {resourcePopup && resourcePopup.requestId === req.id && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {resourcePopup.type === 'inventory' ? 'Equipment popup' : 'Vehicle popup'}
                  </p>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {resourcePopup.type === 'inventory' ? 'Select inventory items' : 'Select vehicles'}
                  </h4>
                </div>
                <button type="button" onClick={closeResourcePopup} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-5">
                {resourcePopup.type === 'inventory' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[2fr_1fr_1fr_140px] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <div>Item</div>
                      <div>Stock</div>
                      <div>Unit</div>
                      <div className="text-right">Qty</div>
                    </div>
                    {inventoryItems.map((item) => {
                      const itemId = getInventoryItemId(item);
                      const current = Number(
                        (taskFlowsByRequest[req.id] || []).find((step) => step.id === resourcePopup.stepId)?.details.inventoryItems[itemId] || 0
                      );
                      const step = (taskFlowsByRequest[req.id] || []).find((step) => step.id === resourcePopup.stepId);
                      const max = Number(item?.stock || 0);
                      return (
                        <div key={itemId} className="grid grid-cols-[2fr_1fr_1fr_140px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                          <div>
                            <div className="font-medium text-slate-900">{getInventoryItemName(item)}</div>
                            <div className="text-xs text-slate-500">{itemId}</div>
                          </div>
                          <div className="text-slate-700">{Number(item?.stock || 0)}</div>
                          <div className="text-slate-600">{String(item?.unit || '—')}</div>
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => updateInventorySelection(req.id, resourcePopup.stepId, itemId, -1)} disabled={current === 0} className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">
                              -
                            </button>
                            <div className="w-10 text-center font-semibold text-slate-900">{current}</div>
                            <button type="button" onClick={() => updateInventorySelection(req.id, resourcePopup.stepId, itemId, 1, max)} disabled={max === 0 || current >= max} className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-30">
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[2fr_1fr_1fr_120px] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <div>Vehicle</div>
                      <div>Company</div>
                      <div>Status</div>
                      <div className="text-right">Action</div>
                    </div>
                    {vehicles.map((vehicle) => {
                      const vehicleId = getVehicleId(vehicle);
                      const step = (taskFlowsByRequest[req.id] || []).find((s) => s.id === resourcePopup.stepId);
                      const selected = !!step?.details.vehicleIds.includes(vehicleId);
                      return (
                        <div key={vehicleId} className={cn('grid grid-cols-[2fr_1fr_1fr_120px] items-center gap-2 rounded-xl border px-3 py-3 text-sm shadow-sm', selected ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-white')}>
                          <div>
                            <div className="font-medium text-slate-900">{getVehicleName(vehicle)}</div>
                            <div className="text-xs text-slate-500">{vehicleId}</div>
                          </div>
                          <div className="text-slate-700">{String(vehicle?.vehicle_information?.company || '—')}</div>
                          <div className={selected ? 'text-emerald-700' : 'text-slate-500'}>{selected ? 'Selected' : 'Available'}</div>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => toggleVehicleSelection(req.id, resourcePopup.stepId, vehicleId)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {selected ? 'Remove' : 'Select'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
                <button type="button" onClick={closeResourcePopup} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const deriveUiStatus = (item: BackendAdminOpsRequest): RequestStatus => {
    const concerned = String(item?.concerned_department_approval_status || 'pending');
    const adminOps = String(item?.admin_ops_approval_status || 'pending');
    const forwarded = String(item?.forwarded_department_approval_status || 'pending');
    const forwardedTo = Array.isArray(item?.forwarded_to_departments) ? item.forwarded_to_departments : [];

    const isApproved = (v: string) => v === 'approved' || v === 'approved_and_forwarded';

    if ([concerned, adminOps, forwarded].some(s => s === 'rejected')) return 'rejected';
    if (adminOps === 'pending') return 'pending';
    if (isApproved(adminOps)) {
      return forwardedTo.length > 0 ? 'in_progress' : 'approved';
    }
    return 'pending';
  };

  const fetchAdminRequests = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoadingRequests(true);
    try {
      const response = await fetch(`${getBaseUrl()}/admin_ops_requests/get_admin_ops_requests`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const raw = await response.json();

      const list: BackendAdminOpsRequest[] = Array.isArray(raw)
        ? raw
        : (
            Array.isArray(raw?.admin_ops_requests)
              ? raw.admin_ops_requests
              : (Array.isArray(raw?.data?.admin_ops_requests)
                  ? raw.data.admin_ops_requests
                  : [])
          );

      const mapped: AdminRequestData[] = list.map((item) => {
        const requestId = String(item?.request_id || '').trim() || `REQ-${Math.random().toString(16).slice(2)}`;
        const sender = item?.sender_details || {};
        const note = item?.request_details?.note || '';
        const loc = parseRequestLocation(item?.request_details?.request_location);

        const requestDetailsType = String(item?.request_details?.request_type || '').trim().toLowerCase();
        const rawMeta = item?.request_details?.meta_data;
        const fuelMetaData =
          requestDetailsType === 'fuel' && Array.isArray(rawMeta)
            ? rawMeta.map((m) => ({
                driver_name: String(m?.driver_name || '—'),
                fuel_amount: Number(m?.fuel_amount || 0),
                request_id: String(m?.request_id || '—'),
                vehicle_number: String(m?.vehicle_number || '—'),
              }))
            : undefined;

        const requestType = normalizeRequestType(item?.first_department || sender?.staff_department);
        const status = deriveUiStatus(item);
        const forwardedToList = Array.isArray(item?.forwarded_to_departments) ? item.forwarded_to_departments : [];
        const rawAdminOpsApprovalStatus = String(item?.admin_ops_approval_status || 'pending');
        // Robust filtering: even if backend keeps admin_ops_approval_status="approved",
        // once forwarded_to_departments is non-empty we treat it as "approved_and_forwarded".
        const adminOpsApprovalStatus =
          rawAdminOpsApprovalStatus === 'approved' && forwardedToList.length > 0
            ? 'approved_and_forwarded'
            : rawAdminOpsApprovalStatus;

        const deptApprovals = (() => {
          const concerned = String(item?.concerned_department_approval_status || 'pending');
          if (concerned === 'approved_and_forwarded') return 'Concerned Department Approved';
          if (concerned === 'rejected') return 'Concerned Department Rejected';
          return 'Concerned Department Pending';
        })();

        const deptReason = String(item?.concerned_department_note || '').trim() || '—';

        const forwardedTo = forwardedToList.length > 0 ? forwardedToList.join(', ') : undefined;

        return {
          id: requestId,
          adminOpsApprovalStatus,
          requesterId: String(sender?.staff_id || ''),
          requesterName: String(sender?.staff_name || '—'),
          requesterPhone: String(sender?.staff_phone || '—'),
          requesterDepartment: String(sender?.staff_department || '—'),
          requestType,
          requestDetailsType: requestDetailsType || undefined,
          fuelMetaData,
          title: titleFromNote(note),
          description: String(note || ''),
          vehicleType: requestType === 'logistics' ? '—' : undefined,
          fromLocation: requestType === 'logistics' ? loc.fromLocation : undefined,
          toLocation: requestType === 'logistics' ? loc.toLocation : undefined,
          preferredDate: String(item?.date || ''),
          loadDetails: undefined,
          priority: 'medium',
          status,
          createdAt: String(item?.created_at || ''),
          deptApprovals,
          deptReason,
          adminNotes: String(item?.admin_ops_note || '').trim(),
          forwardedTo,
          receiverDepartment: forwardedTo,
        };
      });

      setRequests(mapped);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
      // If this is just a background refresh, keep the existing UI.
      if (!silent) setRequests([]);
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchAdminRequests();
  }, []);

  const updateAdminOpsApprovalStatus = async (payload: {
    request_id: string;
    status: 'approved' | 'rejected';
    note: string;
  }) => {
    const response = await fetch(
      `${getBaseUrl()}/admin_ops_requests/update_admin_ops_approval_status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const maybeMessage = (data && (data.message || data.detail || data.error))
        ? String(data.message || data.detail || data.error)
        : '';
      throw new Error(maybeMessage || `Request failed (${response.status})`);
    }

    return data;
  };

  const forwardRequestToDepartments = async (payload: {
    request_id: string;
    departments: string[];
  }) => {
    const response = await fetch(
      `${getBaseUrl()}/admin_ops_requests/forward_request_to_departments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const maybeMessage = (data && (data.message || data.detail || data.error))
        ? String(data.message || data.detail || data.error)
        : '';
      throw new Error(maybeMessage || `Request failed (${response.status})`);
    }

    return data;
  };

  const filteredRequests = requests.filter(req => 
    req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show items that still need Admin action or forwarding.
  // Filter by backend status: show only pending/approved; hide approved_and_forwarded.
  const visibleRequests = filteredRequests.filter(req =>
    req.adminOpsApprovalStatus === 'pending' || req.adminOpsApprovalStatus === 'approved'
  );

  const getStatusConfig = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' };
      case 'approved': return { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' };
      case 'in_progress': return { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', label: 'In Progress' };
      case 'completed': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Completed' };
      case 'rejected': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' };
    }
  };

  const getPriorityConfig = (priority: RequestPriority) => {
    switch (priority) {
      case 'urgent': return { color: 'text-red-700', bg: 'bg-red-50', icon: '🔴' };
      case 'high': return { color: 'text-orange-700', bg: 'bg-orange-50', icon: '🟠' };
      case 'medium': return { color: 'text-yellow-700', bg: 'bg-yellow-50', icon: '🟡' };
      case 'low': return { color: 'text-gray-700', bg: 'bg-gray-50', icon: '⚪' };
    }
  };

  const handleApproveRequest = async (req: AdminRequestData) => {
    const note = String(currentEditingNotes?.notes || '').trim();
    if (!note) {
      toast.error('Please add admin notes first');
      return;
    }

    let saved: any = null;
    try {
      saved = await updateAdminOpsApprovalStatus({
        request_id: req.id,
        status: 'approved',
        note,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve request');
      return;
    }

    const savedNote = String(saved?.admin_ops_note || '').trim() || note;
    const savedStatus = String(saved?.admin_ops_approval_status || 'approved');

    setRequests(prev => prev.map(r =>
      r.id === req.id
        ? {
            ...r,
            status: 'approved' as RequestStatus,
            adminOpsApprovalStatus: 'approved',
            adminNotes: savedNote,
          }
        : r
    ));

    setCurrentEditingNotes(null);
    toast.success('✓ Approved! Now select department(s) to forward');
  };

  const toggleDepartment = (requestId: string, dept: string) => {
    setSelectedDepartments(prev => {
      const current = prev[requestId] || [];
      const updated = current.includes(dept)
        ? current.filter(d => d !== dept)
        : [...current, dept];
      return { ...prev, [requestId]: updated };
    });
  };

  const handleForwardMultiple = async (req: AdminRequestData) => {
    const departments = selectedDepartments[req.id] || [];
    
    if (departments.length === 0) {
      toast.error("Please select at least one department");
      return;
    }

    setForwardingRequestId(req.id);

    try {
      await forwardRequestToDepartments({
        request_id: req.id,
        departments,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to forward request');
      setForwardingRequestId(null);
      return;
    }

    setRequests(prev => prev.map(r => 
      r.id === req.id ? { 
        ...r, 
        forwardedTo: departments.join(', '),
        forwardedAt: new Date().toISOString(),
        receiverDepartment: departments.join(', '),
        adminOpsApprovalStatus: 'approved_and_forwarded',
        status: 'in_progress' as RequestStatus
      } : r
    ));
    
    // Clear selected departments for this request
    setSelectedDepartments(prev => {
      const updated = { ...prev };
      delete updated[req.id];
      return updated;
    });
    
    const deptList = departments.length === 1 ? departments[0] : `${departments.length} departments`;
    toast.success(`✓ Request forwarded to ${deptList}. The department(s) will now handle it.`);

    setForwardingRequestId(null);

    // No automatic re-fetch here because this page intentionally hides forwarded items.
    // A re-fetch could bring the item back if backend keeps admin_ops_approval_status="approved".
  };

  const handleReject = async (id: string) => {
    try {
      await updateAdminOpsApprovalStatus({
        request_id: id,
        status: 'rejected',
        note: '',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject request');
      return;
    }

    setRequests(prev => prev.map(req =>
      req.id === id ? { ...req, status: 'rejected' as RequestStatus } : req
    ));
    toast.error('Request rejected');
  };

  const pendingCount = visibleRequests.filter(r => r.adminOpsApprovalStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Admin Request Management</h1>
                <p className="text-sm text-gray-600 mt-0.5">Review incoming requests and forward to departments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-8">
        {loadingRequests ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading requests...</p>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by requester, title, description, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Request Cards */}
          <div className="space-y-6">
            {visibleRequests.map((req) => {
              const statusConfig = getStatusConfig(req.status);
              const priorityConfig = getPriorityConfig(req.priority);

              return (
                <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Workflow Status Bar */}
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'pending' ? '1. Submitted by ' + req.requesterDepartment : '1. Submitted ✓'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'approved' || req.status === 'in_progress' ? "bg-emerald-100 text-emerald-700" : 
                          req.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'approved' || req.status === 'in_progress' ? '2. Admin Reviewed ✓' : 
                            req.status === 'pending' ? '2. Awaiting Review' : '2. Rejected'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full",
                          req.status === 'in_progress' ? "bg-emerald-100 text-emerald-700" : 
                          req.status === 'approved' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        )}>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span className="font-medium">
                            {req.status === 'in_progress' ? '3. Forwarded to ' + req.forwardedTo + ' ✓' : 
                            req.status === 'approved' ? '3. Ready to Forward' : '3. Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Three Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-gray-200">
                    
                    {/* Column 1: Concern Department */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <Building2 className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Request From Department</h2>
                      </div>

                      {/* Request Details */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Request Details</h3>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Request ID:</span>
                            <span className="font-mono font-medium text-gray-900">{req.id}</span>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Requester:</p>
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-900">{req.requesterName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-600">{req.requesterPhone}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Department:</span>
                            <span className="font-medium text-gray-900">{req.requesterDepartment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium text-gray-900 uppercase text-xs">{req.requestType}</span>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Title:</p>
                            <p className="font-medium text-gray-900">{req.title}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Description:</p>
                            <p className="text-gray-800 text-xs leading-relaxed">{req.description}</p>
                          </div>

                          {req.requestDetailsType === 'fuel' && Array.isArray(req.fuelMetaData) && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <p className="text-gray-600 text-sm font-medium">Fuel Requests</p>
                                <p className="text-xs text-gray-600">
                                  Total: <span className="font-semibold text-gray-900">{req.fuelMetaData.reduce((sum, it) => sum + (Number(it.fuel_amount) || 0), 0)} L</span>
                                </p>
                              </div>

                              {req.fuelMetaData.length === 0 ? (
                                <p className="text-xs text-gray-600 mt-2">No fuel requests found.</p>
                              ) : (
                                <div className="mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                                    <div>Request</div>
                                    <div>Vehicle</div>
                                    <div>Driver</div>
                                    <div className="text-right">Liters</div>
                                  </div>
                                  <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                    {req.fuelMetaData.map((it, idx) => (
                                      <div key={`${it.request_id}-${idx}`} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                                        <div className="font-mono text-gray-900 truncate">{it.request_id}</div>
                                        <div className="font-mono text-gray-900 truncate">{it.vehicle_number}</div>
                                        <div className="text-gray-900 truncate">{it.driver_name}</div>
                                        <div className="text-right font-semibold text-gray-900">{Number(it.fuel_amount) || 0}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {req.requestType === 'logistics' && (
                            <>
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                <Truck className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900 font-medium">{req.vehicleType}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                                <div className="text-xs">
                                  <span className="text-gray-900 font-medium">{req.fromLocation}</span>
                                  <span className="text-gray-500 mx-1">→</span>
                                  <span className="text-gray-900 font-medium">{req.toLocation}</span>
                                </div>
                              </div>
                              {req.preferredDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-900 text-xs">{new Date(req.preferredDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Priority:</span>
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", priorityConfig.bg, priorityConfig.color)}>
                              <span>{priorityConfig.icon}</span>
                              <span>{req.priority.toUpperCase()}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Department Approvals */}
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 text-sm">Department Manager Approval</h3>
                            <p className="text-xs text-blue-800 mt-1">{req.deptApprovals}</p>
                          </div>
                        </div>
                        <div className="pl-6">
                          <p className="text-xs text-blue-600 font-medium mb-1">Reason:</p>
                          <p className="text-xs text-blue-700 italic leading-relaxed">"{req.deptReason}"</p>
                        </div>
                      </div>

                      {/* Forwarded Status */}
                      {req.forwardedTo && (
                        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="font-semibold text-emerald-900 text-sm">Approved and Forwarded</p>
                              <p className="text-xs text-emerald-700 mt-0.5">to {req.forwardedTo} Department</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!req.forwardedTo && req.status === 'approved' && (
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-semibold text-blue-900 text-sm">Approved by Admin</p>
                              <p className="text-xs text-blue-700 mt-0.5">Not forwarded to any department yet</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Admin */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <Settings className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Admin</h2>
                      </div>

                      {/* Request Summary */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2.5">
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Request Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Request ID:</span>
                            <span className="font-mono font-medium text-gray-900">{req.id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Status:</span>
                            <span className={cn("inline-flex px-2.5 py-1 rounded-md text-xs font-medium", statusConfig.bg, statusConfig.color)}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-xs text-gray-900">{new Date(req.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div className="flex-1">
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-700" />
                            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Admin Approval Notes</h3>
                          </div>
                          
                          {req.status === 'pending' && currentEditingNotes?.id === req.id ? (
                            <textarea
                              className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:border-slate-900 focus:ring-2 focus:ring-slate-900 transition-colors outline-none text-sm resize-none"
                              placeholder="Enter your approval notes, instructions, or conditions here..."
                              value={currentEditingNotes.notes}
                              onChange={(e) => setCurrentEditingNotes({...currentEditingNotes, notes: e.target.value})}
                            />
                          ) : req.adminNotes ? (
                            <div className="p-3 bg-white rounded border border-gray-200 min-h-[10rem]">
                              <p className="text-sm text-gray-900 leading-relaxed">{req.adminNotes}</p>
                            </div>
                          ) : (
                            <div className="p-3 bg-white rounded border border-gray-200 min-h-[10rem] flex items-center justify-center">
                              <p className="text-sm text-gray-400 italic">No notes added yet</p>
                            </div>
                          )}
                        </div>
                        
                        {req.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            {currentEditingNotes?.id === req.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={!currentEditingNotes.notes}
                                  className={cn(
                                    "flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2",
                                    currentEditingNotes.notes
                                      ? "bg-slate-900 text-white hover:bg-slate-800"
                                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  )}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve & Forward
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCurrentEditingNotes(null)}
                                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setCurrentEditingNotes({ id: req.id, notes: req.adminNotes })}
                                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                  Review & Add Notes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(req.id)}
                                  className="px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {req.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => initializeTaskFlow(req.id)}
                            className="mt-3 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <Layers3 className="w-4 h-4" />
                            Create Task
                          </button>
                        )}
                      </div>

                      {/* Approved Status */}
                      {(req.status === 'approved' || req.status === 'in_progress') && (
                        <div className="bg-slate-900 rounded-lg p-4 text-white">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <div>
                              <p className="font-semibold text-sm">Approved by Admin</p>
                              {req.forwardedAt && (
                                <p className="text-xs text-slate-300 mt-0.5">{new Date(req.forwardedAt).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Forward to Department */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                        <ArrowRight className="w-5 h-5 text-slate-900" />
                        <h2 className="text-lg font-semibold text-gray-900">Forward to Department</h2>
                      </div>

                      {createTaskRequestId === req.id ? (
                        renderTaskBuilder(req)
                      ) : req.status === 'approved' && !req.forwardedTo ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">Select department(s) to forward:</p>
                          <div className="space-y-2">
                            {['Logistics', 'Inventory', 'Operations', 'Maintenance', 'Procurement'].map((dept) => {
                              const isSelected = selectedDepartments[req.id]?.includes(dept) || false;
                              return (
                                <label 
                                  key={dept}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                    isSelected 
                                      ? "border-slate-900 bg-slate-50" 
                                      : "border-gray-200 hover:bg-gray-50"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDepartment(req.id, dept)}
                                    className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 focus:ring-2"
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{dept}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleForwardMultiple(req)}
                            disabled={
                              !selectedDepartments[req.id]?.length ||
                              forwardingRequestId === req.id
                            }
                            className={cn(
                              "w-full mt-4 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2",
                              (selectedDepartments[req.id]?.length && forwardingRequestId !== req.id)
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            <Send className="w-4 h-4" />
                            {forwardingRequestId === req.id
                              ? 'Forwarding...'
                              : `Forward to Selected Department${selectedDepartments[req.id]?.length > 1 ? 's' : ''}`}
                            {selectedDepartments[req.id]?.length > 0 && (
                              <span className="ml-1">({selectedDepartments[req.id].length})</span>
                            )}
                          </button>
                        </div>
                      ) : req.forwardedTo ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                              <CheckCircle2 className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-600">Forwarded to</p>
                              <p className="text-lg font-semibold text-gray-900 mt-1">{req.forwardedTo}</p>
                              {req.receiverName && (
                                <p className="text-sm text-gray-600 mt-1">{req.receiverName}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : req.status === 'rejected' ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center mx-auto">
                              <X className="w-10 h-10 text-red-500" />
                            </div>
                            <p className="text-sm font-medium text-red-700">Request rejected</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-gray-100 border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto">
                              <FileText className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">Awaiting approval</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {visibleRequests.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No requests found</p>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestPage;