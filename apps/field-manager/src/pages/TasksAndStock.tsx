"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom"; // Make sure Link is imported
import {
  getTasks,
  getInventoryItems,
  deleteInventoryItem,
  getSupervisors,
} from "@/lib/apiService";
import type { Task, InventoryItem, Supervisor } from "@/types/api";
import TaskCreationDialog from "@/components/TaskCreationDialog";

import {
  ListTodo,
  Plus,
  Package,
  Calendar as CalendarIcon,
  Tractor,
  FlaskConical,
  Search,
  Users,
  Sprout,
  Wheat,
  Filter,
  PackagePlus,
  PackageMinus,
  Edit,
  Trash2,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  CheckCircle,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// --- Data Types ---
interface MyTask {
  id: string;
  title: string;
  completed: boolean;
}

const initialMyTasksData: MyTask[] = [
  {
    id: "m1",
    title: "Check fertilizer inventory, stocks, and order if needed",
    completed: true,
  },
  {
    id: "m2",
    title: "Review all pending farm tasks for the week",
    completed: false,
  },
];

// --- Helpers ---
const getStockStatus = (
  stock: number,
  threshold: number
): { status: "OK" | "Low" | "Out"; colorClass: string; icon?: LucideIcon } => {
  if (stock <= 0)
    return { status: "Out", colorClass: "bg-red-50", icon: XCircle };
  if (stock < threshold)
    return { status: "Low", colorClass: "bg-yellow-50", icon: AlertTriangle };
  return { status: "OK", colorClass: "bg-green-50", icon: CheckCircle };
};

// --- Main ---
const TasksAndStock = () => {
  // API State
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>(initialMyTasksData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // My Tasks Dialog State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Data Fetching
  // --- Data Fetching ---
  const loadData = useCallback(async () => {
    // Only set loading true on initial load
    // REMOVED setIsLoading(true) from here to avoid loops

    setError(null);
    try {
      const [tasksData, inventoryData, supervisorsData] = await Promise.all([
        getTasks(),
        getInventoryItems(),
        getSupervisors(),
      ]);

      setAllTasks(tasksData);
      setInventoryItems(inventoryData);
      setSupervisors(supervisorsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load farm data. Please try again.");
    } finally {
      // Set loading false outside, in the useEffect
    }
  // --- CORRECTED: Empty dependency array ---
  }, []); // loadData itself doesn't depend on changing state

  useEffect(() => {
    // --- CORRECTED: Standard pattern for single initial load ---
    setIsLoading(true); // Set loading true *before* calling loadData
    loadData().finally(() => {
        setIsLoading(false); // Set loading false *after* loadData completes/fails
    });
  // --- CORRECTED: useEffect depends only on the stable loadData function ---
  }, [loadData]); // Runs once on mount because loadData is stable
  // --- END CHANGED ---\
  
  // Handlers
  const handleAddTask = () => { // For "My Tasks"
    if (newTaskTitle.trim() !== "") {
      const newTask: MyTask = {
        id: Math.random().toString(),
        title: newTaskTitle.trim(),
        completed: false,
      };
      setMyTasks((prev) => [...prev, newTask]);
      setNewTaskTitle("");
      setIsAddTaskOpen(false);
    }
  };

  const handleRemoveInventoryItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }
    try {
      await deleteInventoryItem(itemId);
      setInventoryItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("Failed to delete item.");
    }
  };

  // --- Render States ---
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 text-center text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">{error}</h2>
        {/* Added a button to retry fetching data */}
        <Button onClick={() => {setIsLoading(true); loadData();}} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 md:p-6">
        <Tabs defaultValue="farm-ops" className="w-full">
          <TabsList className="flex gap-2 mb-4">
            <TabsTrigger value="farm-ops">Farm Operations</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          </TabsList>

          {/* FARM OPERATIONS TAB */}
          <TabsContent value="farm-ops" className="space-y-6">
            {/* Supervisor Progress */}
            <Card> {/* This Card wraps the Supervisor section */}
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Supervisor Progress</CardTitle>
                {/* Pass loadData to refresh list after creation */}
                <TaskCreationDialog onTaskCreated={loadData} />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {supervisors.map((sup) => {
                  // Calculations...
                  const tasks = allTasks.filter((t) => t.supervisor_id === sup.id);
                  const total = tasks.length;
                  const completed = tasks.filter((t) => t.status.toLowerCase() === "completed").length;
                  const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const pending = total - completed;
                  const initials = sup.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

                  // Link wrapping the individual supervisor card
                  return (
                    <Link
                      key={sup.id} // Key on Link
                      to={`/supervisors/${sup.id}/tasks`}
                      className="block rounded-lg transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {/* This is the individual Card for the supervisor */}
                      <Card className="p-4 flex flex-col justify-between border shadow-sm h-full cursor-pointer">
                        {/* Card Header Content */}
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{sup.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {total} {total === 1 ? 'task' : 'tasks'} assigned
                            </p>
                          </div>
                        </div>
                        {/* Card Footer Content */}
                        <div className="space-y-1 mt-auto">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Completion</span>
                            <span className="font-medium">{completion}%</span>
                          </div>
                          <Progress value={completion} className="h-2" />
                          <div className="flex justify-between items-center text-xs pt-1">
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Pending: {pending}
                            </Badge>
                            <Badge variant="default" className="bg-green-600 text-white">
                              Completed: {completed}
                            </Badge>
                          </div>
                        </div>
                      </Card> {/* <<< Closing tag for the individual supervisor Card */}
                    </Link> // <<< Closing tag for the Link
                  ); // End return for map
                })}
              </CardContent> {/* <<< Closing tag for CardContent */}
            </Card> {/* <<< Closing tag for the outer Card wrapping Supervisor Progress */}

            {/* Stock Management */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => {
                      const { status, colorClass, icon: Icon } = getStockStatus(item.stock, item.threshold);
                      const stockPct = item.threshold > 0 ? Math.min(100, (item.stock / (item.threshold * 2)) * 100) : item.stock > 0 ? 100 : 0;
                      const lastUpdatedFormatted = item.last_updated ? format(new Date(item.last_updated), "yyyy-MM-dd") : "N/A";

                      return (
                        <TableRow key={item.id} className={cn(colorClass)}>
                          <TableCell>{Icon && <Icon className="w-5 h-5" />}</TableCell>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={stockPct} className="h-2 flex-1 bg-muted" />
                              <span className="text-sm font-semibold w-16 text-right">
                                {item.stock} {item.unit}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{item.threshold} {item.unit}</TableCell>
                          <TableCell>{lastUpdatedFormatted}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRemoveInventoryItem(item.id)} className="text-red-600">
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MY TASKS TAB */}
          <TabsContent value="my-tasks" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Tasks</CardTitle>
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                      <DialogDescription>
                        Enter a short title for your new task below.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      className="mt-2"
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddTask}>Add Task</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {myTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        setMyTasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id ? { ...t, completed: !!checked } : t
                          )
                        )
                      }
                    />
                    <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TasksAndStock;