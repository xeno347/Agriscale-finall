import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Calendar as CalendarIcon,
  MapPin,
  Tractor,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import getBaseUrl from "@/lib/config";
import { toast } from "sonner";

interface Task {
  id: string;
  task_id: string;
  task_no: string;
  activity: string;
  date: string;
  farm_id: string;
  feild_id: string;
  work_allocated: number;
  work_done: number;
  status: "Pending" | "In Progress" | "Completed";
}

type ApiTask = {
  allocation_schema?: Record<string, unknown>;
  created_at?: string;
  task_id: string;
  feild_id?: string[];
  assigned_acres?: Array<{
    activity?: string;
    assigned_acres?: number;
    farm_id?: string;
  }>;
  vehicles?: Array<{ vehicle_id?: string; vehicle_number?: string }>;
  equipment?: Array<{ equipment_name?: string; equipment_id?: string; quantity?: number }>;
};

type WsNewTaskAssigned = {
  event: "NEW_TASK_ASSIGNED";
  task: {
    feild_id?: string[];
    assigned_acres?: Array<{
      farm_id: string;
      assigned_acres: number;
      activity?: string;
    }>;
    vehicles?: Array<{
      vehicle_id: string;
      vehicle_number: string;
    }>;
    equipment?: Array<{
      equipment_id: string;
      equipment_name: string;
      quantity: number;
    }>;
    task_id: string;
    created_at?: string;
    allocation_schema?: Record<string, unknown>;
  };
};

type WsMessage = WsNewTaskAssigned | { event?: string; [k: string]: unknown };

const toWsUrl = (baseUrl: string) => {
  const base = String(baseUrl || "").replace(/\/$/, "");
  try {
    const url = new URL(`${base}/ws/tasks`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  } catch {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fallbackBase = base.startsWith("http") ? base : `${origin}${base.startsWith("/") ? "" : "/"}${base}`;
    const url = new URL(`${fallbackBase.replace(/\/$/, "")}/ws/tasks`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }
};

const wsTaskToRows = (t: WsNewTaskAssigned["task"]): Task[] => {
  const taskId = String(t?.task_id || "");
  const createdAt = String(t?.created_at || "");
  const date = createdAt ? createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const assigned = Array.isArray(t?.assigned_acres) ? t.assigned_acres : [];

  const shortNo = taskId
    ? taskId.replace(/-/g, "").slice(0, 8).toUpperCase()
    : `${Date.now()}`;

  if (assigned.length > 0) {
    return assigned.map((a, idx) => {
      const farmId = String(a?.farm_id || "").trim() || "—";
      const activity = String(a?.activity || "").trim() || "Assigned Task";
      const allocated = Number(a?.assigned_acres) || 0;
      const compositeId = `${taskId || shortNo}__${farmId}__${activity}`;
      return {
        id: compositeId,
        task_id: taskId || shortNo,
        task_no: `TSK-${shortNo}-${idx + 1}`,
        activity,
        date,
        farm_id: farmId,
        feild_id: farmId,
        work_allocated: Number.isFinite(allocated) && allocated > 0 ? allocated : 0,
        work_done: 0,
        status: "Pending",
      };
    });
  }

  const fields = Array.isArray(t?.feild_id) ? t.feild_id.filter(Boolean) : [];
  if (fields.length > 0) {
    return fields.map((farmId, idx) => {
      const safeFarm = String(farmId).trim() || "—";
      const compositeId = `${taskId || shortNo}__${safeFarm}`;
      return {
        id: compositeId,
        task_id: taskId || shortNo,
        task_no: `TSK-${shortNo}-${idx + 1}`,
        activity: "Assigned Task",
        date,
        farm_id: safeFarm,
        feild_id: safeFarm,
        work_allocated: 0,
        work_done: 0,
        status: "Pending",
      };
    });
  }

  return [
    {
      id: taskId || `${Date.now()}`,
      task_id: taskId || shortNo,
      task_no: `TSK-${shortNo}`,
      activity: "Assigned Task",
      date,
      farm_id: "—",
      feild_id: "—",
      work_allocated: 0,
      work_done: 0,
      status: "Pending",
    },
  ];
};

const apiTaskToRows = (t: ApiTask): Task[] => {
  const taskId = String(t?.task_id || "");
  const createdAt = String(t?.created_at || "");
  const date = createdAt ? createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const assigned = Array.isArray(t?.assigned_acres) ? t.assigned_acres : [];

  const shortNo = taskId
    ? taskId.replace(/-/g, "").slice(0, 8).toUpperCase()
    : `${Date.now()}`;

  if (assigned.length > 0) {
    return assigned.map((a, idx) => {
      const farmId = String(a?.farm_id || "").trim() || "—";
      const activity = String(a?.activity || "").trim() || "Assigned Task";
      const allocated = Number(a?.assigned_acres) || 0;
      const compositeId = `${taskId || shortNo}__${farmId}__${activity}`;
      return {
        id: compositeId,
        task_id: taskId || shortNo,
        task_no: `TSK-${shortNo}-${idx + 1}`,
        activity,
        date,
        farm_id: farmId,
        feild_id: farmId,
        work_allocated: Number.isFinite(allocated) && allocated > 0 ? allocated : 0,
        work_done: 0,
        status: "Pending",
      };
    });
  }

  const fields = Array.isArray(t?.feild_id) ? t.feild_id.filter(Boolean) : [];
  if (fields.length > 0) {
    return fields.map((farmId, idx) => {
      const safeFarm = String(farmId).trim() || "—";
      const compositeId = `${taskId || shortNo}__${safeFarm}`;
      return {
        id: compositeId,
        task_id: taskId || shortNo,
        task_no: `TSK-${shortNo}-${idx + 1}`,
        activity: "Assigned Task",
        date,
        farm_id: safeFarm,
        feild_id: safeFarm,
        work_allocated: 0,
        work_done: 0,
        status: "Pending",
      };
    });
  }

  return [
    {
      id: taskId || `${Date.now()}`,
      task_id: taskId || shortNo,
      task_no: `TSK-${shortNo}`,
      activity: "Assigned Task",
      date,
      farm_id: "—",
      feild_id: "—",
      work_allocated: 0,
      work_done: 0,
      status: "Pending",
    },
  ];
};

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    task_id: "1",
    task_no: "TSK-001",
    activity: "Ploughing",
    date: "2026-01-04",
    farm_id: "F-101 (Block A)",
    feild_id: "F-101 (Block A)",
    work_allocated: 12.5,
    work_done: 0,
    status: "Pending",
  },
  {
    id: "2",
    task_id: "2",
    task_no: "TSK-002",
    activity: "Seeding",
    date: "2026-01-04",
    farm_id: "F-105 (Block B)",
    feild_id: "F-105 (Block B)",
    work_allocated: 8,
    work_done: 4,
    status: "In Progress",
  },
  {
    id: "3",
    task_id: "3",
    task_no: "TSK-003",
    activity: "Irrigation",
    date: "2026-01-04",
    farm_id: "F-202 (Block C)",
    feild_id: "F-202 (Block C)",
    work_allocated: 15,
    work_done: 0,
    status: "Pending",
  },
  {
    id: "4",
    task_id: "4",
    task_no: "TSK-004",
    activity: "Fertilizing",
    date: "2026-01-04",
    farm_id: "F-110 (Block A)",
    feild_id: "F-110 (Block A)",
    work_allocated: 5.5,
    work_done: 5.5,
    status: "Completed",
  },
];

const TasksBeta = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputAcres, setInputAcres] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isFieldVisitOpen, setIsFieldVisitOpen] = useState(true);
  const [isOtherTasksOpen, setIsOtherTasksOpen] = useState(true);

  const isFieldVisitTask = (task: Task) => String(task?.activity || "").toLowerCase().includes("visit");
  const { fieldVisitTasks, otherTasks } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return {
      fieldVisitTasks: list.filter(isFieldVisitTask),
      otherTasks: list.filter((t) => !isFieldVisitTask(t)),
    };
  }, [tasks]);

  const BASE_URL = useMemo(() => getBaseUrl().replace(/\/$/, ""), []);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedByUserRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoadingTasks(true);
      try {
        const res = await fetch(`${BASE_URL}/admin_all_task/get_all_tasks`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });
        const data: any = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(data?.message || "Failed to load tasks");
          setTasks(INITIAL_TASKS);
          return;
        }

        const list: ApiTask[] = Array.isArray(data) ? data : [];
        const mapped = list
          .filter((t) => !!t?.task_id)
          .flatMap(apiTaskToRows)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)));

        setTasks(mapped.length ? mapped : []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        toast.error(e?.message || "Failed to load tasks");
        setTasks(INITIAL_TASKS);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    load();
    return () => controller.abort();
  }, [BASE_URL]);

  useEffect(() => {
    const wsUrl = toWsUrl(BASE_URL);

    const connect = () => {
      if (closedByUserRef.current) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (evt) => {
          let msg: WsMessage | null = null;
          try {
            msg = JSON.parse(String(evt?.data || ""));
          } catch {
            return;
          }
          if (!msg || typeof msg !== "object") return;

          if (msg.event === "NEW_TASK_ASSIGNED" && (msg as WsNewTaskAssigned).task) {
            const incoming = (msg as WsNewTaskAssigned).task;
            const rows = wsTaskToRows(incoming);
            setTasks((prev) => {
              const existing = new Set(prev.map((t) => t.id));
              const toAdd = rows.filter((r) => !existing.has(r.id));
              return toAdd.length ? [...toAdd, ...prev] : prev;
            });
            toast.success("New task assigned", {
              description: rows.length === 1 ? rows[0].task_no : `${rows.length} rows added`,
            });
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (closedByUserRef.current) return;
          if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(() => connect(), 3000);
        };
      } catch {
        if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = window.setTimeout(() => connect(), 3000);
      }
    };

    connect();

    return () => {
      closedByUserRef.current = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [BASE_URL]);

  const handleMarkDoneClick = (task: Task) => {
    setSelectedTask(task);
    setInputAcres(task.work_done ? task.work_done.toString() : "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setInputAcres("");
  };

  const handleSaveProgress = async () => {
    if (!selectedTask) return;

    const acres = parseFloat(inputAcres);

    if (isNaN(acres) || acres < 0) {
      toast.error("Invalid Input", {
        description: "Please enter a valid number of acres.",
      });
      return;
    }

    setIsUpdatingTask(true);
    try {
      const payload = {
        task_id: String(selectedTask.task_id || "").trim(),
        feild_id: String(selectedTask.feild_id || selectedTask.farm_id || "").trim(),
        completed_acres: acres,
      };

      if (!payload.task_id || !payload.feild_id) {
        toast.error("Missing task identifiers", {
          description: "task_id / feild_id not available for this row.",
        });
        return;
      }
      console.log("Payload:", payload); 
      const res = await fetch(`${BASE_URL}/admin_all_task/update_task_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.message || "Failed to update task status");
        return;
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                work_done: acres,
                status:
                  acres >= t.work_allocated
                    ? "Completed"
                    : acres > 0
                    ? "In Progress"
                    : "Pending",
              }
            : t
        )
      );

      toast.success("Task Updated", {
        description: `Recorded ${acres} acres for ${selectedTask.task_no}`,
      });

      closeModal();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update task status");
    } finally {
      setIsUpdatingTask(false);
    }
  };

  return (
    <div className="p-8 space-y-6 min-h-screen bg-gray-50/50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-primary" />
          Tasks <span className="text-sm bg-blue-100 text-blue-700 px-2 rounded">Beta</span>
        </h1>
        <p className="text-sm font-semibold">{new Date().toDateString()}</p>
      </div>

      {/* Section 1: Field Visit Tasks */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">Field Visit Tasks</h2>
            <button
              type="button"
              onClick={() => setIsFieldVisitOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={isFieldVisitOpen}
              aria-controls="field-visit-tasks-table"
            >
              {isFieldVisitOpen ? (
                <>
                  <ChevronDown className="w-4 h-4" /> Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" /> Expand
                </>
              )}
            </button>
          </div>
        </div>

        {isFieldVisitOpen && (
        <table id="field-visit-tasks-table" className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Task</th>
              <th className="px-6 py-3">Activity</th>
              <th className="px-6 py-3">Land</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Allocated</th>
              <th className="px-6 py-3">Done</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingTasks ? (
              <tr className="border-t">
                <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={7}>
                  Loading tasks…
                </td>
              </tr>
            ) : fieldVisitTasks.length === 0 ? (
              <tr className="border-t">
                <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={7}>
                  No field visit tasks found.
                </td>
              </tr>
            ) : (
              fieldVisitTasks.map((task) => (
                <tr key={task.id} className="border-t">
                  <td className="px-6 py-3 font-mono">{task.task_no}</td>
                  <td className="px-6 py-3 flex items-center gap-2">
                    <Tractor className="w-4 h-4 text-gray-400" />
                    {task.activity}
                  </td>
                  <td className="px-6 py-3">
                    <MapPin className="inline w-3 h-3 mr-1" />
                    {task.farm_id}
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className={cn(
                          "h-2 rounded",
                          task.status === "Completed" ? "bg-green-500" : "bg-blue-500"
                        )}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              task.work_allocated > 0
                                ? (task.work_done / task.work_allocated) * 100
                                : 0
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">{task.work_allocated} Ac</td>
                  <td className="px-6 py-3 text-right font-bold">{task.work_done} Ac</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      disabled={task.status === "Completed"}
                      onClick={() => handleMarkDoneClick(task)}
                      className="px-3 py-1 border rounded text-xs hover:bg-gray-900 hover:text-white disabled:opacity-50"
                    >
                      {task.status === "Completed" ? "Completed" : "Update"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Section 2: Other Tasks */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">Other Tasks</h2>
            <button
              type="button"
              onClick={() => setIsOtherTasksOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={isOtherTasksOpen}
              aria-controls="other-tasks-table"
            >
              {isOtherTasksOpen ? (
                <>
                  <ChevronDown className="w-4 h-4" /> Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" /> Expand
                </>
              )}
            </button>
          </div>
        </div>

        {isOtherTasksOpen && (
        <table id="other-tasks-table" className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Task</th>
              <th className="px-6 py-3">Activity</th>
              <th className="px-6 py-3">Land</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Allocated</th>
              <th className="px-6 py-3">Done</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingTasks ? (
              <tr className="border-t">
                <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={7}>
                  Loading tasks…
                </td>
              </tr>
            ) : otherTasks.length === 0 ? (
              <tr className="border-t">
                <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={7}>
                  No other tasks found.
                </td>
              </tr>
            ) : (
              otherTasks.map((task) => (
                <tr key={task.id} className="border-t">
                  <td className="px-6 py-3 font-mono">{task.task_no}</td>
                  <td className="px-6 py-3 flex items-center gap-2">
                    <Tractor className="w-4 h-4 text-gray-400" />
                    {task.activity}
                  </td>
                  <td className="px-6 py-3">
                    <MapPin className="inline w-3 h-3 mr-1" />
                    {task.farm_id}
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className={cn(
                          "h-2 rounded",
                          task.status === "Completed" ? "bg-green-500" : "bg-blue-500"
                        )}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              task.work_allocated > 0
                                ? (task.work_done / task.work_allocated) * 100
                                : 0
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">{task.work_allocated} Ac</td>
                  <td className="px-6 py-3 text-right font-bold">{task.work_done} Ac</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      disabled={task.status === "Completed"}
                      onClick={() => handleMarkDoneClick(task)}
                      className="px-3 py-1 border rounded text-xs hover:bg-gray-900 hover:text-white disabled:opacity-50"
                    >
                      {task.status === "Completed" ? "Completed" : "Update"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between">
              <h3 className="font-bold">Update Task</h3>
              <button onClick={closeModal}>
                <X />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <p className="text-sm">
                  Target: {selectedTask.work_allocated} Acres
                </p>
              </div>
              <input
                type="number"
                value={inputAcres}
                onChange={(e) => setInputAcres(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Acres completed"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveProgress}
                disabled={isUpdatingTask}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded"
              >
                <Save className="inline w-4 h-4 mr-1" />
                {isUpdatingTask ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksBeta;
