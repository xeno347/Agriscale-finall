// src/components/TaskCreationDialog.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  // --- ADDED DialogFooter for better structure ---
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Supervisor, TaskCreate, Plot } from "@/types/api";
import { getSupervisors, createTask, getPlots } from "@/lib/apiService";

interface TaskCreationDialogProps {
  onTaskCreated: () => void;
}

const TaskCreationDialog = ({ onTaskCreated }: TaskCreationDialogProps) => {
  const [open, setOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("");
  const [plotId, setPlotId] = useState("");
  const [plotNumberForTask, setPlotNumberForTask] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Data loading state
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoadingSup, setIsLoadingSup] = useState(false);
  const [isLoadingPlots, setIsLoadingPlots] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setIsLoadingSup(true);
        setIsLoadingPlots(true);
        try {
          const [supData, plotData] = await Promise.all([
            getSupervisors(),
            getPlots(),
          ]);
          setSupervisors(supData);
          setPlots(plotData);
          if (plotData.length === 0) {
            toast.info("No plots found assigned to this Field Manager.");
          }
        } catch (error) {
          console.error("Failed to fetch data for dialog", error);
          toast.error("Failed to load supervisors or plots.");
        } finally {
          setIsLoadingSup(false);
          setIsLoadingPlots(false);
        }
      };
      fetchData();
    } else {
       // Reset form when dialog closes
        setTitle("");
        setTaskType("");
        setPlotId("");
        setPlotNumberForTask("");
        setSupervisorId("");
        setDueDate("");
    }
  }, [open]);

  const handlePlotChange = (selectedPlotId: string) => {
    const selectedPlot = plots.find((p) => p.id === selectedPlotId);
    setPlotId(selectedPlotId);
    setPlotNumberForTask(selectedPlot ? selectedPlot.plot_number : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotNumberForTask) {
      toast.error("Invalid plot selected.");
      return;
    }

    const taskData: TaskCreate = {
      task: title,
      type: taskType,
      plot: plotNumberForTask,
      supervisor_id: supervisorId,
      due_date: dueDate || null,
      status: "Pending",
    };

    try {
      await createTask(taskData);
      toast.success("Task created successfully!");
      onTaskCreated();
      setOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task. Please try again.");
      // Keep dialog open on error
    }
  };

  return (
    // Check if Dialog is closed correctly at the end
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </DialogTrigger>
      {/* Check if DialogContent is closed correctly */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        {/* Check if form is closed correctly */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4"> {/* Added pt-4 */}
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              placeholder="e.g., Weekly pest inspection"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="task-type">Task Type</Label>
            <Select
              required
              value={taskType}
              onValueChange={(value) => setTaskType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Harvesting">Harvesting</SelectItem>
                <SelectItem value="Ploughing">Ploughing</SelectItem>
                <SelectItem value="Fertilizing">Fertilizing</SelectItem>
                <SelectItem value="Irrigation">Irrigation</SelectItem>
                <SelectItem value="Pest Control">Pest Control</SelectItem>
                <SelectItem value="Planting">Planting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assign to Plot */}
          <div className="space-y-2">
            <Label htmlFor="plot">Assign to Plot</Label>
            <Select
              required
              value={plotId}
              onValueChange={handlePlotChange}
              disabled={isLoadingPlots} // Disable while loading
            >
              <SelectTrigger>
                {isLoadingPlots ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Plots...
                  </span>
                ) : (
                  <SelectValue placeholder="Select plot" />
                )}
              </SelectTrigger>
              <SelectContent>
                {!isLoadingPlots && plots.length === 0 && (
                   <div className="p-4 text-center text-sm text-muted-foreground">No plots assigned.</div>
                )}
                {!isLoadingPlots &&
                  plots.map((plot) => (
                    <SelectItem key={plot.id} value={plot.id}>
                      {plot.name} (#{plot.plot_number})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign to Supervisor */}
          <div className="space-y-2">
            <Label htmlFor="supervisor">Assign to Supervisor</Label>
            <Select
              required
              value={supervisorId}
              onValueChange={(value) => setSupervisorId(value)}
              disabled={isLoadingSup} // Disable while loading
            >
              <SelectTrigger>
                {isLoadingSup ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading Supervisors...
                  </span>
                ) : (
                  <SelectValue placeholder="Select supervisor" />
                )}
              </SelectTrigger>
              <SelectContent>
                 {!isLoadingSup && supervisors.length === 0 && (
                   <div className="p-4 text-center text-sm text-muted-foreground">No supervisors found.</div>
                )}
                {!isLoadingSup &&
                  supervisors.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date (Optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Submit Buttons (Moved to DialogFooter) */}
          {/* Check if DialogFooter is closed correctly */}
          <DialogFooter className="pt-4"> {/* Added pt-4 */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            {/* Check if Button is closed correctly */}
            <Button type="submit" disabled={isLoadingPlots || isLoadingSup}>
              Create Task
            </Button>
          </DialogFooter>
        </form> {/* Correct closing tag for form */}
      </DialogContent> {/* Correct closing tag for DialogContent */}
    </Dialog> // Correct closing tag for Dialog
  );
};

// --- MAKE SURE THIS LINE EXISTS AND IS CORRECT ---
export default TaskCreationDialog;
// -------------------------------------------------