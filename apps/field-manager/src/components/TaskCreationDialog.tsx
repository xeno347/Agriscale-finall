import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const TaskCreationDialog = () => {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Task created successfully!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input id="task-title" placeholder="Enter task title" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task-type">Task Type</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harvest">Harvest</SelectItem>
                <SelectItem value="ploughing">Ploughing</SelectItem>
                <SelectItem value="fertilizer">Fertilizer Application</SelectItem>
                <SelectItem value="irrigation">Irrigation</SelectItem>
                <SelectItem value="inspection">Field Inspection</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plot">Assign to Plot</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Select plot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plot-1">Plot 1 - North Field</SelectItem>
                <SelectItem value="plot-2">Plot 2 - South Field</SelectItem>
                <SelectItem value="plot-3">Plot 3 - East Field</SelectItem>
                <SelectItem value="plot-4">Plot 4 - West Field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisor">Assign to Supervisor</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="john">John Smith</SelectItem>
                <SelectItem value="maria">Maria Garcia</SelectItem>
                <SelectItem value="david">David Chen</SelectItem>
                <SelectItem value="sarah">Sarah Johnson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input id="due-date" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Add task details and instructions..." 
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreationDialog;
