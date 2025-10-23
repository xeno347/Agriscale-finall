import { useState } from "react";
import {
  ListTodo,
  Plus,
  Package,
  Calendar as CalendarIcon,
  CheckCircle,
  Circle,
  Tractor,
  FlaskConical,
  Search,
  Users,
  Sprout,
  Wheat,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils"; // Assumes you have a 'lib/utils.ts' for 'cn'
import { format } from "date-fns";

// --- Data for Page ---

const supervisors = [
  { id: "1", name: "Ravi Kumar", avatar: "/avatars/01.png" },
  { id: "2", name: "Amit Patel", avatar: "/avatars/02.png" },
  { id: "3", name: "Suresh Singh", avatar: "/avatars/03.png" },
  { id: "4", name: "Priya Sharma", avatar: "/avatars/04.png" },
];

const plotNumbers = ["Plot 1", "Plot 2", "Plot 3", "Plot 4", "Plot 5", "Plot 12"];

const taskTypes = [
  { value: "inspection", label: "Inspection", icon: Search },
  { value: "harvest", label: "Harvest", icon: Wheat },
  { value: "fertilizer", label: "Fertilizer", icon: FlaskConical },
  { value: "planting", label: "Planting", icon: Sprout },
  { value: "ploughing", label: "Ploughing", icon: Tractor },
];

const initialAllTasks = [
  { id: "t1", type: "Inspection", task: "Weekly pest inspection", plot: "Plot 5", supervisor: "Ravi Kumar" },
  { id: "t2", type: "Harvest", task: "Harvest wheat", plot: "Plot 12", supervisor: "Amit Patel" },
];

const initialMyTasks = [
  { id: "m1", title: "Check fertilizer inventory, stocks, and order if needed", completed: true },
  { id: "m2", title: "Review all pending farm tasks for the week", completed: false },
];

// --- Helper Components ---

const TaskTypeBadge = ({ type }: { type: string }) => {
  const taskConfig = taskTypes.find(t => t.label === type) || { icon: ListTodo };
  const Icon = taskConfig.icon;
  return (
    <Badge variant="outline" className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4" />
      <span>{type}</span>
    </Badge>
  );
};

// --- Main Component ---

const TasksAndStock = () => {
  const [allTasks, setAllTasks] = useState(initialAllTasks);
  const [myTasks, setMyTasks] = useState(initialMyTasks);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

  // State for the "Add Task" dialog
  const [taskType, setTaskType] = useState<string | undefined>();
  const [supervisor, setSupervisor] = useState<string | undefined>();
  const [plot, setPlot] = useState<string | undefined>();
  
  const handleAddTask = () => {
    // Logic to add the new task
    const newTask = {
      id: `t${allTasks.length + 1}`,
      type: taskTypes.find(t => t.value === taskType)?.label || "Task",
      task: `${taskTypes.find(t => t.value === taskType)?.label || "Task"} on ${plot}`,
      plot: plot || "N/A",
      supervisor: supervisors.find(s => s.id === supervisor)?.name || "N/A",
    };
    setAllTasks(prevTasks => [newTask, ...prevTasks]);
    
    // Reset form and close dialog
    setIsTaskDialogOpen(false);
    setTaskType(undefined);
    setSupervisor(undefined);
    setPlot(undefined);
    setDate(new Date());
  };
  
  const toggleMyTask = (id: string) => {
    setMyTasks(tasks =>
      tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const todoTasks = myTasks.filter(t => !t.completed);
  const completedTasks = myTasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-background">
      
      {/* --- Header --- */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Tasks & Stock Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your daily farm operations and inventory.
          </p>
        </div>
      </div>
      {/* ---------------- */}

      {/* --- Main Content Area --- */}
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="farm-ops" className="w-full">
          {/* Tab Headers */}
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid grid-cols-2 w-[300px] md:w-[400px]">
              <TabsTrigger value="farm-ops">Farm Operations</TabsTrigger>
              <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            </TabsList>
          </div>

          {/* --- TAB 1: Farm Operations (Stock + All Tasks) --- */}
          <TabsContent value="farm-ops" className="space-y-6">
            <Card className="bg-green-100 border-green-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Farm Tasks</CardTitle>
                <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Task Type</Label>
                        <Select value={taskType} onValueChange={setTaskType}>
                          <SelectTrigger><SelectValue placeholder="Select task type" /></SelectTrigger>
                          <SelectContent>
                            {taskTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="w-4 h-4" />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Supervisor</Label>
                        <Select value={supervisor} onValueChange={setSupervisor}>
                          <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                          <SelectContent>
                            {supervisors.map(sup => (
                              <SelectItem key={sup.id} value={sup.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={sup.avatar} alt={sup.name} />
                                    <AvatarFallback>{sup.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span>{sup.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Plot Number</Label>
                        <Select value={plot} onValueChange={setPlot}>
                          <SelectTrigger><SelectValue placeholder="Select plot (1-24)" /></SelectTrigger>
                          <SelectContent>
                            {plotNumbers.map(num => (
                              <SelectItem key={num} value={num}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "MM/dd/yyyy") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddTask} className="w-full bg-green-600 hover:bg-green-700">Add Task</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" /> Fertilizer Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Urea</p>
                      <p className="text-2xl font-bold">500 kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Manure</p>
                      <p className="text-2xl font-bold">300 kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Compost</p>
                      <p className="text-2xl font-bold">200 kg</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Npk</p>
                      <p className="text-2xl font-bold">150 kg</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Plot</TableHead>
                      <TableHead>Supervisor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell><TaskTypeBadge type={task.type} /></TableCell>
                        <TableCell className="font-medium">{task.task}</TableCell>
                        <TableCell>{task.plot}</TableCell>
                        <TableCell>{task.supervisor}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- TAB 2: My Tasks (Checklist) --- */}
          <TabsContent value="my-tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  My Tasks
                </CardTitle>
                <CardDescription>Manage your personal tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">To Do ({todoTasks.length})</h3>
                  <div className="space-y-2">
                    {todoTasks.length > 0 ? (
                      todoTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-4 border rounded-lg">
                          <Checkbox
                            id={`task-${task.id}`}
                            // --- THIS IS THE FIX ---
                            checked={task.completed} // Was: task.status === "completed"
                            // -----------------------
                            onCheckedChange={() => toggleMyTask(task.id)}
                            className="mt-1"
                          />
                          <Label htmlFor={`task-${task.id}`} className="font-medium">
                            {task.title}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No pending tasks. Great work!</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Completed ({completedTasks.length})</h3>
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked
                          onCheckedChange={() => toggleMyTask(task.id)}
                          className="mt-1"
                        />
                        <Label
                          htmlFor={`task-${task.id}`}
                          className="font-medium line-through text-muted-foreground"
                        >
                          {task.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TasksAndStock;