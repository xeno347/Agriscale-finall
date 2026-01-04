import { useState } from "react";
import {
  CheckSquare,
  Calendar as CalendarIcon,
  MapPin,
  Tractor,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  task_no: string;
  activity: string;
  date: string;
  farm_id: string;
  work_allocated: number;
  work_done: number;
  status: "Pending" | "In Progress" | "Completed";
}

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    task_no: "TSK-001",
    activity: "Ploughing",
    date: "2026-01-04",
    farm_id: "F-101 (Block A)",
    work_allocated: 12.5,
    work_done: 0,
    status: "Pending",
  },
  {
    id: "2",
    task_no: "TSK-002",
    activity: "Seeding",
    date: "2026-01-04",
    farm_id: "F-105 (Block B)",
    work_allocated: 8,
    work_done: 4,
    status: "In Progress",
  },
  {
    id: "3",
    task_no: "TSK-003",
    activity: "Irrigation",
    date: "2026-01-04",
    farm_id: "F-202 (Block C)",
    work_allocated: 15,
    work_done: 0,
    status: "Pending",
  },
  {
    id: "4",
    task_no: "TSK-004",
    activity: "Fertilizing",
    date: "2026-01-04",
    farm_id: "F-110 (Block A)",
    work_allocated: 5.5,
    work_done: 5.5,
    status: "Completed",
  },
];

const TasksBeta = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputAcres, setInputAcres] = useState("");

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

  const handleSaveProgress = () => {
    if (!selectedTask) return;

    const acres = parseFloat(inputAcres);

    if (isNaN(acres) || acres < 0) {
      toast.error("Invalid Input", {
        description: "Please enter a valid number of acres.",
      });
      return;
    }

    if (acres > selectedTask.work_allocated) {
      toast.error("Input Error", {
        description: "Work done cannot exceed allocated area.",
      });
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

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Task</th>
              <th className="px-6 py-3">Activity</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Land</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Allocated</th>
              <th className="px-6 py-3">Done</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t">
                <td className="px-6 py-3 font-mono">{task.task_no}</td>
                <td className="px-6 py-3 flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-gray-400" />
                  {task.activity}
                </td>
                <td className="px-6 py-3">
                  <CalendarIcon className="inline w-3 h-3 mr-1" />
                  {task.date}
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
                        task.status === "Completed"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      )}
                      style={{
                        width: `${(task.work_done / task.work_allocated) * 100}%`,
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
            ))}
          </tbody>
        </table>
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
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded"
              >
                <Save className="inline w-4 h-4 mr-1" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksBeta;
