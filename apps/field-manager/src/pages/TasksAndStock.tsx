"use client";

import React, { useState, useMemo } from "react";
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

// --- Data Types ---
interface Supervisor {
  id: string;
  name: string;
  avatar: string;
}

interface AllTask {
  id: string;
  type: string;
  task: string;
  plot: string;
  supervisorId: string;
  supervisor: string;
  status: string;
}

interface MyTask {
  id: string;
  title: string;
  completed: boolean;
}

interface InventoryItem {
  id: string;
  item: string;
  category: string;
  stock: number;
  unit: string;
  threshold: number;
  lastUpdated: string;
}

// --- Initial Data ---
const supervisors: Supervisor[] = [
  { id: "1", name: "Ravi Kumar", avatar: "/avatars/01.png" },
  { id: "2", name: "Amit Patel", avatar: "/avatars/02.png" },
  { id: "3", name: "Suresh Singh", avatar: "/avatars/03.png" },
  { id: "4", name: "Priya Sharma", avatar: "/avatars/04.png" },
];

const initialAllTasksData: AllTask[] = [
  {
    id: "t1",
    type: "Inspection",
    task: "Weekly pest inspection",
    plot: "Plot 5",
    supervisorId: "1",
    supervisor: "Ravi Kumar",
    status: "Pending",
  },
  {
    id: "t2",
    type: "Harvest",
    task: "Harvest wheat",
    plot: "Plot 12",
    supervisorId: "2",
    supervisor: "Amit Patel",
    status: "In Progress",
  },
  {
    id: "t3",
    type: "Fertilizer",
    task: "Apply NPK",
    plot: "Plot 4",
    supervisorId: "4",
    supervisor: "Priya Sharma",
    status: "Pending",
  },
];

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

const initialInventoryItemsData: InventoryItem[] = [
  {
    id: "1",
    item: "Nitrogen Fertilizer",
    category: "Fertilizers",
    stock: 85,
    unit: "kg",
    threshold: 20,
    lastUpdated: "2025-10-20",
  },
  {
    id: "2",
    item: "Phosphate",
    category: "Fertilizers",
    stock: 42,
    unit: "kg",
    threshold: 15,
    lastUpdated: "2025-10-18",
  },
  {
    id: "3",
    item: "Tractor Oil",
    category: "Equipment",
    stock: 5,
    unit: "L",
    threshold: 10,
    lastUpdated: "2025-09-30",
  },
  {
    id: "4",
    item: "Herbicide B",
    category: "Pesticides",
    stock: 0,
    unit: "L",
    threshold: 5,
    lastUpdated: "2025-09-15",
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
  const [allTasks] = useState<AllTask[]>(initialAllTasksData);
  const [myTasks, setMyTasks] = useState<MyTask[]>(initialMyTasksData);
  const [inventoryItems] = useState<InventoryItem[]>(initialInventoryItemsData);

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = () => {
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
            <Card>
              <CardHeader>
                <CardTitle>Supervisor Progress</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {supervisors.map((sup) => {
                  const tasks = allTasks.filter(
                    (t) => t.supervisorId === sup.id
                  );
                  const total = tasks.length;
                  const completed = tasks.filter(
                    (t) => t.status === "Completed"
                  ).length;
                  const completion =
                    total > 0 ? Math.round((completed / total) * 100) : 0;
                  const pending = total - completed;

                  return (
                    <Card
                      key={sup.id}
                      className="p-4 flex flex-col justify-between border shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={sup.avatar} alt={sup.name} />
                          <AvatarFallback>
                            {sup.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{sup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {total} tasks assigned
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 mt-auto">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Completion</span>
                          <span className="font-medium">{completion}%</span>
                        </div>
                        <Progress value={completion} className="h-2" />
                        <div className="flex justify-between items-center text-xs pt-1">
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-300"
                          >
                            Pending: {pending}
                          </Badge>
                          <Badge
                            variant="default"
                            className="bg-green-600 text-white"
                          >
                            Completed: {completed}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>

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
                      const { status, colorClass, icon: Icon } = getStockStatus(
                        item.stock,
                        item.threshold
                      );
                      const stockPct =
                        item.threshold > 0
                          ? Math.min(
                              100,
                              (item.stock / (item.threshold * 2)) * 100
                            )
                          : item.stock > 0
                          ? 100
                          : 0;

                      return (
                        <TableRow key={item.id} className={cn(colorClass)}>
                          <TableCell>
                            {Icon && <Icon className="w-5 h-5" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.item}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={stockPct}
                                className="h-2 flex-1 bg-muted"
                              />
                              <span className="text-sm font-semibold w-16 text-right">
                                {item.stock} {item.unit}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.threshold} {item.unit}
                          </TableCell>
                          <TableCell>{item.lastUpdated}</TableCell>
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
                                <DropdownMenuItem>Remove</DropdownMenuItem>
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
                      <Button
                        variant="outline"
                        onClick={() => setIsAddTaskOpen(false)}
                      >
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
                    <span
                      className={cn(
                        "text-sm",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
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
