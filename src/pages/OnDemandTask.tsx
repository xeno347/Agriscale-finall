import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import getBaseUrl from '@/lib/config';
import { Badge } from '@/components/ui/badge';

type RowType = 'inventory' | 'transport' | 'cultivation' | 'other';

type OnDemandStepType = 'inventory' | 'logistics' | 'cultivation' | 'others' | string;

interface OnDemandTaskStepApi {
  type?: OnDemandStepType;
  data?: any[];
  status?: string;
}

interface OnDemandTaskApi {
  staff_id?: string;
  steps_dict?: Record<string, OnDemandTaskStepApi>;
  created_at?: string;
  task_id?: string;
}

interface OnDemandRow {
  id: string;
  step: number;
  description: string;
  type: RowType;
  attachments: File[];
  spec: any;
}

interface StepViewModel {
  key: string;
  stepNumber: number;
  type: string;
  status: string;
  data: any[];
  title: string;
  summary: string;
}

interface TaskViewModel {
  taskId: string;
  staffId: string;
  createdAt: string;
  steps: StepViewModel[];
  totalSteps: number;
  completedSteps: number;
}

const BASE_URL = getBaseUrl().replace(/\/$/, '');

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

const getStepSummary = (stepType: string, data: any[]) => {
  const firstEntry = Array.isArray(data) ? data[0] : undefined;

  if (stepType === 'inventory' && firstEntry) {
    return `${firstEntry.item_name || firstEntry.name || 'Inventory item'}${firstEntry.quantity != null ? ` • Qty ${firstEntry.quantity}` : ''}${firstEntry.unit ? ` ${firstEntry.unit}` : ''}`;
  }

  if (stepType === 'logistics' && firstEntry) {
    return `${firstEntry.vehicle_number || firstEntry.vehicle_id || 'Vehicle assigned'}`;
  }

  if ((stepType === 'others' || stepType === 'other') && firstEntry) {
    return String(firstEntry.description || firstEntry.note || 'Other task').trim();
  }

  if (stepType === 'cultivation' && firstEntry) {
    return `${firstEntry.activity || firstEntry.description || 'Cultivation step'}`;
  }

  if (!firstEntry) return 'No step data';
  try {
    return JSON.stringify(firstEntry);
  } catch {
    return 'Step data available';
  }
};

const isInspectionType = (stepType: string) => {
  const normalized = String(stepType || '').toLowerCase();
  return normalized === 'inspection' || normalized === 'inpection';
};

const formatStepItemLabel = (stepType: string, item: any, index: number) => {
  if (!item || typeof item !== 'object') return `Item ${index + 1}`;

  if (stepType === 'inventory') {
    const itemName = item.item_name || item.name || item.item || 'Inventory item';
    const quantity = item.quantity != null ? ` • Qty ${item.quantity}` : '';
    const unit = item.unit ? ` ${item.unit}` : '';
    return `${itemName}${quantity}${unit}`;
  }

  if (stepType === 'logistics') {
    return `${item.vehicle_number || item.vehicle_id || `Vehicle ${index + 1}`}`;
  }

  if (stepType === 'others' || stepType === 'other') {
    return String(item.description || item.note || `Other item ${index + 1}`);
  }

  if (stepType === 'cultivation') {
    return String(item.activity || item.description || `Cultivation item ${index + 1}`);
  }

  if (isInspectionType(stepType)) {
    return String(item.field || item.question || item.label || `Inspection item ${index + 1}`);
  }

  try {
    return JSON.stringify(item);
  } catch {
    return `Item ${index + 1}`;
  }
};

const getStepStatusClasses = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'in_progress' || normalized === 'in-progress') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (normalized === 'failed' || normalized === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const normalizeTaskSteps = (stepsDict: Record<string, OnDemandTaskStepApi> = {}): StepViewModel[] => {
  return Object.entries(stepsDict)
    .map(([key, step]) => {
      const stepNumber = toStepNumber(key);
      const type = String(step?.type || 'other');
      const data = Array.isArray(step?.data) ? step.data : [];
      const status = String(step?.status || 'pending');

      return {
        key,
        stepNumber,
        type,
        status,
        data,
        title: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        summary: getStepSummary(type, data),
      };
    })
    .sort((left, right) => left.stepNumber - right.stepNumber);
};

const getCultivationDueDate = (item: any) => {
  return String(item?.due_date || item?.dueDate || item?.deadline || '—');
};

const renderStepDataContent = (step: StepViewModel) => {
  const stepType = String(step.type || '').toLowerCase();

  if (stepType === 'inventory') {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold">Quantity</th>
              <th className="px-3 py-2 font-semibold">Unit</th>
              <th className="px-3 py-2 font-semibold">Equipment ID</th>
            </tr>
          </thead>
          <tbody>
            {step.data.map((item, index) => (
              <tr key={`${step.key}-${index}`} className="border-t border-slate-200 bg-white">
                <td className="px-3 py-2 font-medium text-slate-900">{item?.item_name || item?.name || item?.item || `Item ${index + 1}`}</td>
                <td className="px-3 py-2 text-slate-700">{item?.quantity ?? '—'}</td>
                <td className="px-3 py-2 text-slate-700">{item?.unit || '—'}</td>
                <td className="px-3 py-2 text-slate-700">{item?.equipment_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (stepType === 'logistics') {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Vehicle Number</th>
              <th className="px-3 py-2 font-semibold">Vehicle ID</th>
            </tr>
          </thead>
          <tbody>
            {step.data.map((item, index) => (
              <tr key={`${step.key}-${index}`} className="border-t border-slate-200 bg-white">
                <td className="px-3 py-2 font-medium text-slate-900">{item?.vehicle_number || `Vehicle ${index + 1}`}</td>
                <td className="px-3 py-2 text-slate-700">{item?.vehicle_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (stepType === 'cultivation') {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Farm</th>
              <th className="px-3 py-2 font-semibold">Activity</th>
              <th className="px-3 py-2 font-semibold">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {step.data.map((item, index) => (
              <tr key={`${step.key}-${index}`} className="border-t border-slate-200 bg-white">
                <td className="px-3 py-2 font-medium text-slate-900">{item?.farm_id || item?.farm || `Farm ${index + 1}`}</td>
                <td className="px-3 py-2 text-slate-700">{item?.activity || item?.description || '—'}</td>
                <td className="px-3 py-2 text-slate-700">{getCultivationDueDate(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isInspectionType(stepType)) {
    return (
      <div className="space-y-2">
        {step.data.map((item, index) => {
          const entries = item && typeof item === 'object' ? Object.entries(item) : [];
          return (
            <div key={`${step.key}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Response {index + 1}</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <tbody>
                    {entries.map(([field, value]) => (
                      <tr key={field} className="border-t border-slate-200 first:border-t-0">
                        <td className="w-1/3 px-3 py-2 font-medium text-slate-900 align-top">{field}</td>
                        <td className="px-3 py-2 text-slate-700 align-top break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (stepType === 'others' || stepType === 'other') {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {step.data.map((item, index) => (
          <div key={`${step.key}-${index}`} className="rounded-md bg-white px-3 py-2 border border-slate-200">
            {item?.description || item?.note || `Other item ${index + 1}`}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      {step.data.map((item, index) => (
        <div key={`${step.key}-${index}`} className="rounded-md bg-white px-3 py-2 border border-slate-200">
          {formatStepItemLabel(stepType, item, index)}
        </div>
      ))}
    </div>
  );
};

const normalizeOndemandTask = (task: OnDemandTaskApi): TaskViewModel => {
  const steps = normalizeTaskSteps(task.steps_dict || {});
  const completedSteps = steps.filter((step) => String(step.status).toLowerCase() === 'completed').length;

  return {
    taskId: String(task.task_id || 'Task'),
    staffId: String(task.staff_id || '—'),
    createdAt: formatTaskDate(task.created_at),
    steps,
    totalSteps: steps.length,
    completedSteps,
  };
};

const OnDemandTask = () => {
  const [rows, setRows] = useState<OnDemandRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskHeader, setTaskHeader] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [ondemandTasks, setOndemandTasks] = useState<TaskViewModel[]>([]);
  const [ondemandTasksLoading, setOndemandTasksLoading] = useState(false);
  const [ondemandTasksError, setOndemandTasksError] = useState<string | null>(null);

  useEffect(() => {
    // initial empty row
    setRows([{ id: String(Date.now()), step: 1, description: '', type: 'other' as RowType, attachments: [], spec: {} }]);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, vehRes, farmRes] = await Promise.all([
          fetch(`${BASE_URL}/inventory_management/get_inventory_items`),
          fetch(`${BASE_URL}/admin_vehicles/get_all_vehicles`),
          fetch(`${BASE_URL}/farmer_managment/get_farms`),
        ]);
        const invJson = await invRes.json().catch(() => ({}));
        const vehJson = await vehRes.json().catch(() => []);
        const farmJson = await farmRes.json().catch(() => ({ farms: [] }));
        const items = Array.isArray(invJson?.inventory_items) ? invJson.inventory_items : [];
        const vlist = Array.isArray(vehJson) ? vehJson : Array.isArray(vehJson?.vehicles) ? vehJson.vehicles : [];
        const flist = Array.isArray(farmJson?.farms) ? farmJson.farms : [];
        // If API returned nothing (dev environment), seed lightweight mock data so selection UIs are visible
        setInventoryItems(items && items.length > 0 ? items : [
          { id: 'inv-1', item_name: 'Fertilizer A', stock: 50 },
          { id: 'inv-2', item_name: 'Pesticide B', stock: 30 },
        ]);
        setVehicles(vlist && vlist.length > 0 ? vlist : [
          { vehicle_id: 'veh-1', vehicle_information: { vehicle_number: 'TR-001', company: 'AgroCo' }, work_calandar: {} },
          { vehicle_id: 'veh-2', vehicle_information: { vehicle_number: 'TR-002', company: 'AgroCo' }, work_calandar: {} },
        ]);
        setFarms(flist && flist.length > 0 ? flist : [
          { farm_id: 'farm-1', farmer_id: 'farmer-1', area: 2.5, priority: 1, land_data: { village: 'Village A', district: 'District X' } },
          { farm_id: 'farm-2', farmer_id: 'farmer-2', area: 1.75, priority: 2, land_data: { village: 'Village B', district: 'District Y' } },
        ]);
      } catch (e) {
        // ignore
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchOnDemandTasks = async () => {
      try {
        setOndemandTasksLoading(true);
        setOndemandTasksError(null);

        const response = await fetch(`${BASE_URL}/admin_all_task/get_all_ondemand_tasks`);
        let data: unknown = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(`Failed to load on demand tasks (${response.status})`);
        }

        const list = Array.isArray(data) ? data : [];
        setOndemandTasks(list.map((task) => normalizeOndemandTask(task as OnDemandTaskApi)));
      } catch (error) {
        console.error('Error fetching on demand tasks:', error);
        setOndemandTasks([]);
        setOndemandTasksError('Unable to load on demand tasks.');
      } finally {
        setOndemandTasksLoading(false);
      }
    };

    fetchOnDemandTasks();
  }, []);

  const addRow = () => {
    setRows((prev) => {
      const next = [...prev, { id: String(Date.now()), step: prev.length + 1, description: '', type: 'other' as RowType, attachments: [], spec: {} }];
      return next.map((r, i) => ({ ...r, step: i + 1 }));
    });
  };

  const updateRow = (id: string, patch: Partial<OnDemandRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.map((r, i) => ({ ...r, step: i + 1 }));
    });
  };

  const handleAttachFiles = (id: string, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    updateRow(id, { attachments: arr });
  };

  const taskProgressSummary = useMemo(
    () => ({
      totalDraftSteps: rows.length,
      attachedFiles: rows.reduce((count, row) => count + row.attachments.length, 0),
    }),
    [rows]
  );

  // Helper: next 5 dates
  const getNextDates = (start = new Date(), count = 5) => {
    const res: string[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      res.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return res;
  };

  const chartDates = getNextDates();

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNum = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  // Vehicle availability grid (single-select per row)
  const VehicleAvailabilityGrid = ({ row }: { row: OnDemandRow }) => {
    const vehicleId = row.spec.vehicleId || '';
    return (
      <div className="w-full bg-white border border-gray-100 rounded-md p-2">
        <div className="grid grid-cols-[1.4fr_repeat(5,1fr)] gap-2 mb-2 text-xs font-semibold text-muted-foreground">
          <div className="self-end pb-1">Vehicle</div>
          {chartDates.map((d) => (
            <div key={d} className="text-center pb-1 border-b-2">{getDayName(d)}<div className="text-[11px]">{getDayNum(d)}</div></div>
          ))}
        </div>
        <div className="space-y-2">
          {vehicles.map((v: any) => {
            const schedule = (v.work_calandar && typeof v.work_calandar === 'object') ? v.work_calandar : (v.work_calandar || {});
            return (
              <div key={v.vehicle_id} className={cn('grid grid-cols-[1.4fr_repeat(5,1fr)] gap-2 items-center p-2 rounded-md', vehicleId === v.vehicle_id ? 'border border-primary bg-primary/5' : 'border border-border bg-white')}>
                <div className="min-w-0"><div className="text-sm font-semibold truncate">{v.vehicle_information?.vehicle_number || v.vehicle_id}</div><div className="text-[11px] text-muted-foreground">{v.vehicle_information?.company || ''}</div></div>
                {chartDates.map((d) => {
                  const busy = schedule && (schedule[d] !== undefined || (Array.isArray(schedule) && schedule.find((it: any) => String(it?.date || '').slice(0,10) === d)));
                  return (
                    <div key={d} className="flex items-center justify-center">
                      <button onClick={() => updateRow(row.id, { spec: { ...row.spec, vehicleId: v.vehicle_id } })} className={cn('w-full h-8 rounded-md text-[11px] font-semibold', busy ? 'bg-red-100 text-red-700 border border-red-200' : (vehicleId === v.vehicle_id ? 'bg-green-600 text-white' : 'bg-gray-50 border border-gray-100'))}>
                        {busy ? `${Number(schedule?.[d] || 0).toFixed(0)}ac` : (vehicleId === v.vehicle_id ? 'Selected' : (d === chartDates[0] ? 'Free' : '-'))}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Inventory selection grid similar to assignment step
  const InventorySelectionGrid = ({ row }: { row: OnDemandRow }) => {
    const selectedMap: Record<string, number> = (row.spec.selectedItemsMap) || {};
    const updateQty = (id: string, delta: number, max?: number) => {
      const cur = Number(selectedMap[id] || 0);
      const next = Math.max(0, Math.min(typeof max === 'number' ? max : Infinity, cur + delta));
      updateRow(row.id, { spec: { ...row.spec, selectedItemsMap: { ...selectedMap, [id]: next } } });
    };
    return (
      <div className="bg-white border border-gray-100 rounded-md p-2">
        <div className="space-y-2">
          {inventoryItems.map((it: any) => {
            const id = String(it?.id || it?.Invent_id || it?.item);
            const stock = Number(it?.stock || 0);
            const qty = Number(selectedMap[id] || 0);
            return (
              <div key={id} className="flex items-center justify-between gap-3 p-2 border rounded-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{String(it?.item_name || it?.name || it?.item || id)}</div>
                  <div className="text-[11px] text-muted-foreground">Stock: {stock}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(id, -1)} disabled={qty === 0} className="p-1 rounded border">-</button>
                  <div className="w-10 text-center font-semibold">{qty}</div>
                  <button onClick={() => updateQty(id, 1, stock)} disabled={stock === 0 || qty >= stock} className="p-1 rounded border">+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSpecificationContent = (row: OnDemandRow) => {
    if (row.type === 'inventory') {
      return (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Inventory specification</h3>
            <p className="text-xs text-muted-foreground">Choose the items and quantities needed for this step.</p>
          </div>
          <InventorySelectionGrid row={row} />
        </div>
      );
    }

    if (row.type === 'transport') {
      return (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Transport specification</h3>
            <p className="text-xs text-muted-foreground">Pick an available vehicle for the required dates.</p>
          </div>
          <VehicleAvailabilityGrid row={row} />
        </div>
      );
    }

    if (row.type === 'cultivation') {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Cultivation specification</h3>
            <p className="text-xs text-muted-foreground">Link the step to a farm and define the activity.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Select farm</label>
              <select value={row.spec.farmId || ''} onChange={(e) => updateRow(row.id, { spec: { ...row.spec, farmId: e.target.value } })} className="w-full mt-2 p-2 border border-gray-200 rounded-md text-sm bg-white">
                <option value="">Choose farm</option>
                {farms.map((f: any) => <option key={f.farm_id} value={f.farm_id}>{f.farm_id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Activity</label>
              <input value={row.spec.activity || ''} onChange={(e) => updateRow(row.id, { spec: { ...row.spec, activity: e.target.value } })} placeholder="e.g., Harvest" className="w-full mt-2 p-2 border border-gray-200 rounded-md text-sm" />
            </div>
          </div>

          {row.spec.farmId ? (
            <div className="p-3 border rounded-md bg-gray-50">
              {(() => {
                const f = farms.find((x: any) => x.farm_id === row.spec.farmId);
                if (!f) return <div className="text-sm text-muted-foreground">Farm details not found</div>;
                return (
                  <div className="text-sm">
                    <div className="font-semibold">Farm: {f.farm_id}</div>
                    <div className="text-xs text-muted-foreground">Farmer: {f.farmer_id || '—'}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                      <div><span className="font-medium">Area:</span> {Number(f.area || 0).toFixed(2)} acres</div>
                      <div><span className="font-medium">Priority:</span> {f.priority ?? '—'}</div>
                      <div><span className="font-medium">Village:</span> {f.land_data?.village || '—'}</div>
                      <div><span className="font-medium">District:</span> {f.land_data?.district || '—'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-muted-foreground">
              Select a farm to preview its location details here.
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Other specification</h3>
          <p className="text-xs text-muted-foreground">Capture any free-form requirements for this step.</p>
        </div>
        <textarea value={row.spec.notes || ''} onChange={(e) => updateRow(row.id, { spec: { ...row.spec, notes: e.target.value } })} className="w-full p-3 border border-gray-200 rounded-md text-sm" rows={6} placeholder="Add specification notes" />
      </div>
    );
  };

  const handleSave = async () => {
    // Validation
    if (!taskHeader || taskHeader.trim().length === 0) {
      window.alert('Task Header is required');
      return;
    }
    if (!assignTo || assignTo.trim().length === 0) {
      window.alert('Please specify who to assign this task to');
      return;
    }
    if (!rows || rows.length === 0) {
      window.alert('Please add at least one step');
      return;
    }
    const emptyStep = rows.find((r) => !r.description || r.description.trim().length === 0);
    if (emptyStep) {
      window.alert(`Step ${emptyStep.step} is missing description`);
      return;
    }

    // Simple demo: send payload (without file upload) to backend or log to console
    const finalPayload = { header: taskHeader.trim(), assign_to: assignTo.trim(), rows };
    console.log('OnDemand payload:', finalPayload);
    // TODO: implement multipart upload for attachments
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">On Demand Tasks</h1>
          <p className="text-sm text-muted-foreground">Create step-wise on-demand tasks and attach resources.</p>
        </div>
        <div>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-800 text-white rounded-md">Create New Task</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">On demand tasks</h2>
            <p className="text-xs text-muted-foreground">Each task is shown as a horizontal step rail. Scroll left or right to see all steps.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Draft steps: {taskProgressSummary.totalDraftSteps}</span>
            <span>Attachments: {taskProgressSummary.attachedFiles}</span>
          </div>
        </div>

        {ondemandTasksLoading ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
            Loading on demand tasks...
          </div>
        ) : ondemandTasksError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {ondemandTasksError}
          </div>
        ) : ondemandTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
            No on demand tasks found.
          </div>
        ) : (
          <div className="space-y-4">
            {ondemandTasks.map((task) => {
              const progressPercent = task.totalSteps > 0 ? Math.round((task.completedSteps / task.totalSteps) * 100) : 0;

              return (
                <div key={task.taskId} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{task.taskId}</h3>
                        <Badge variant="outline" className="bg-white text-xs">Staff {task.staffId}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Created: {task.createdAt}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-700">Progress {progressPercent}%</div>
                      <div className="text-[11px] text-muted-foreground">{task.completedSteps}/{task.totalSteps} steps completed</div>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 mb-4">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max items-stretch gap-4">
                      {task.steps.map((step, index) => (
                        <div key={step.key} className="flex items-stretch gap-4">
                          <div className="min-w-[280px] max-w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Step {step.stepNumber}</div>
                                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                              </div>
                              <Badge variant="outline" className={cn('text-[11px] capitalize', getStepStatusClasses(step.status))}>
                                {step.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-slate-700">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</div>
                                <div className="mt-1 capitalize">{step.type}</div>
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Data</div>
                                {step.data.length > 0 && <div className="mt-2">{renderStepDataContent(step)}</div>}
                              </div>
                            </div>
                          </div>

                          {index < task.steps.length - 1 && (
                            <div className="hidden md:flex min-w-8 items-center">
                              <div className="h-px w-8 bg-slate-300" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4 md:p-6">
          <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl shadow-[0_24px_64px_rgba(15,23,42,0.18)] overflow-auto max-h-[94vh]">
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <h2 className="text-lg font-semibold">Create On Demand Task</h2>
                <p className="text-sm text-muted-foreground">Build a step-wise task and allocate resources.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsModalOpen(false)} aria-label="Close" className="p-2 rounded-md hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Task header and assign */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="text-xs font-semibold">Task Header <span className="text-red-600">*</span></label>
                    <input value={taskHeader} onChange={(e) => setTaskHeader(e.target.value)} placeholder="Enter task title" className="w-full mt-2 p-3 border border-gray-200 rounded-md text-sm shadow-sm" />
                    <p className="text-[12px] text-muted-foreground mt-1">Give this task a short, descriptive title.</p>
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold">Assign To <span className="text-red-600">*</span></label>
                    <input value={assignTo} onChange={(e) => setAssignTo(e.target.value)} placeholder="Person or team" className="w-full mt-2 p-3 border border-gray-200 rounded-md text-sm shadow-sm" />
                    <p className="text-[12px] text-muted-foreground mt-1">Who should be responsible for this task?</p>
                  </div>
                </div>
              </div>

              {rows.map((row) => (
                <div key={row.id} className="p-4 md:p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold text-sm border border-emerald-100">{row.step}</div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Config card</div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Step brief</label>
                            <div className="mt-1.5 rounded-md border border-gray-200 bg-white">
                              <textarea value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} placeholder={`Step ${row.step} — brief description`} className="w-full rounded-t-md border-0 p-2.5 text-sm focus:ring-0 focus:outline-none bg-transparent resize-none" rows={2} />

                              <div className="border-t border-gray-100 px-2.5 py-2">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-md cursor-pointer text-sm hover:bg-slate-100">
                                    <Plus className="w-4 h-4 text-gray-600" />
                                    <span>Attach file</span>
                                    <input type="file" multiple onChange={(e) => handleAttachFiles(row.id, e.target.files)} className="hidden" />
                                  </label>
                                  <span className="text-xs text-muted-foreground">Add supporting documents or images here.</span>
                                </div>

                                {row.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1 max-h-24 overflow-auto">
                                    {row.attachments.map((f, i) => (
                                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-gray-100 bg-slate-50 px-2 py-1.5">
                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{f.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Type</label>
                            <select value={row.type} onChange={(e) => updateRow(row.id, { type: e.target.value as RowType, spec: {} })} className="w-full mt-1.5 h-9 rounded-md border border-gray-300 px-3 text-sm bg-white">
                              <option value="inventory">Inventory</option>
                              <option value="transport">Transport</option>
                              <option value="cultivation">Cultivation</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 h-[320px] overflow-y-auto">
                          <div className="sticky top-0 z-10 bg-white pb-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Specification card</div>
                          </div>
                          <div className="pt-1">{renderSpecificationContent(row)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <button onClick={() => removeRow(row.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <button onClick={addRow} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-sm font-medium text-slate-700"><Plus className="w-4 h-4" /> Add new row</button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm">Save Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnDemandTask;
