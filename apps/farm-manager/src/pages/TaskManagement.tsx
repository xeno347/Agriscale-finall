import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Wand2,
  Sparkles,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  BarChart3,
  CheckSquare,
  CalendarCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  BarChartHorizontal,
  Tractor,
  Bug,
  FlaskConical,
  Plus,
  Search,
  ChevronDown,
  User,
  Calendar,
  MoreHorizontal,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle
} from "lucide-react";

// --- LOCAL COMPONENTS (for this page only) ---

// 1. AI Assistant Banner (from previous code)
const AiAssistantBanner = () => (
  <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 mb-6">
    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Wand2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">AgriScale AI Assistant</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            4 intelligent task suggestions available • Avg. confidence: 85%
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <Button variant="outline" className="gap-2 w-1/2 md:w-auto">
          <Sparkles className="w-4 h-4" /> Generate More
        </Button>
        <Button className="gap-2 w-1/2 md:w-auto">
          View Suggestions <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

// 2. Small Stat Card (from previous code)
interface TaskStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}
const TaskStatCard = ({ title, value, icon: Icon, iconBg, iconColor }: TaskStatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// 3. Action Card (from previous code)
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}
const ActionCard = ({ title, description, icon: Icon, iconBg, iconColor }: ActionCardProps) => (
  <Card className="hover:shadow-md transition-shadow cursor-pointer">
    <CardContent className="p-6 flex items-center gap-4">
      <div className={`p-4 rounded-lg ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </CardContent>
  </Card>
);

// 4. Recent Task Item (from previous code)
interface TaskItemProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: 'assigned' | 'in-progress' | 'completed';
  priority: 'high' | 'urgent' | 'medium' | 'low';
}
const TaskItem = ({ title, subtitle, icon: Icon, iconBg, iconColor, status, priority }: TaskItemProps) => {
  const statusVariants: Record<typeof status, 'default' | 'warning' | 'success'> = {
    'assigned': 'default',
    'in-progress': 'warning',
    'completed': 'success',
  };
  const priorityVariants: Record<typeof priority, 'destructive' | 'warning' | 'default'> = {
    'high': 'destructive',
    'urgent': 'destructive',
    'medium': 'warning',
    'low': 'default',
  };
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3 px-4 rounded-lg hover:bg-secondary">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Badge variant={statusVariants[status]} className="capitalize">{status}</Badge>
        <Badge variant={priorityVariants[priority]} className="capitalize">{priority}</Badge>
      </div>
    </div>
  );
};

// 5. NEW: Analytics Stat Card (for Analytics tab)
interface AnalyticsStatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  progress?: number;
}
const AnalyticsStatCard = ({ title, value, icon: Icon, iconBg, iconColor, subtitle, progress }: AnalyticsStatCardProps) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <h3 className="text-3xl font-bold mb-2">{value}</h3>
      {progress != null && <Progress value={progress} className="h-2 mb-2" />}
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </CardContent>
  </Card>
);

// 6. NEW: Manager Performance Item (for Analytics tab)
interface ManagerPerformanceProps {
  initials: string;
  name: string;
  zone: string;
  tasks: number;
  workload: number;
  completion: number;
  efficiency: number;
}
const ManagerPerformanceItem = ({ initials, name, zone, tasks, workload, completion, efficiency }: ManagerPerformanceProps) => (
  <div className="flex items-center gap-4 p-4 border-b">
    <Avatar>
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">{zone}</p>
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">Tasks: {tasks}</p>
      <p className="text-xs text-muted-foreground">Workload: {workload}%</p>
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">Completion</span>
        <span className="text-sm font-medium">{completion}%</span>
      </div>
      <Progress value={completion} className="h-2" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground">Efficiency</span>
        <span className="text-sm font-medium">{efficiency}%</span>
      </div>
      <Progress value={efficiency} className="h-2" />
    </div>
  </div>
);


// --- MOCK DATA ---

// For Dashboard Tab
const taskItems: TaskItemProps[] = [
  // (data from previous step)
  { title: "Wheat Field Irrigation Setup", subtitle: "Rajesh Kumar • Plot A-1 (Wheat)", icon: Tractor, iconBg: "bg-blue-100", iconColor: "text-blue-600", status: "assigned", priority: "high", },
  { title: "Pest Control Application", subtitle: "Priya Sharma • Plot B-3 (Cotton)", icon: Bug, iconBg: "bg-orange-100", iconColor: "text-orange-600", status: "in-progress", priority: "urgent", },
  { title: "Soil Testing and Analysis", subtitle: "Amit Patel • Plot C-2 (Sugarcane)", icon: FlaskConical, iconBg: "bg-green-100", iconColor: "text-green-600", status: "completed", priority: "medium", },
];

// NEW: For Tasks Tab
const tasksListData = [
  { id: 1, title: "Wheat Field Irrigation Setup", plot: "Plot A-1 (Wheat)", icon: Tractor, iconBg: "bg-blue-100", iconColor: "text-blue-600", assignedTo: "Rajesh Kumar", initials: "RK", dueDate: "15/10/2024", priority: "High", status: "Assigned", notes: 0 },
  { id: 2, title: "Pest Control Application", plot: "Plot B-3 (Cotton)", icon: Bug, iconBg: "bg-orange-100", iconColor: "text-orange-600", assignedTo: "Priya Sharma", initials: "PS", dueDate: "16/10/2024", priority: "Urgent", status: "In Progress", notes: 2 },
  { id: 3, title: "Soil Testing and Analysis", plot: "Plot C-2 (Sugarcane)", icon: FlaskConical, iconBg: "bg-green-100", iconColor: "text-green-600", assignedTo: "Amit Patel", initials: "AP", dueDate: "17/10/2024", priority: "Medium", status: "Completed", notes: 1 },
];

// NEW: For Analytics Tab
const analyticsStatData = [
  { title: "Completion Rate", value: "33%", icon: TrendingUp, iconBg: "bg-green-100", iconColor: "text-green-600", progress: 33 },
  { title: "AI Suggestions Used", value: "0", icon: Wand2, iconBg: "bg-blue-100", iconColor: "text-blue-600", subtitle: "0% of total tasks" },
  { title: "Average Duration", value: "2.1 days", icon: Clock, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", subtitle: "Estimated vs actual" },
  { title: "Team Efficiency", value: "89%", icon: Users, iconBg: "bg-orange-100", iconColor: "text-orange-600", subtitle: "Overall team performance" },
];

const managerPerformanceData = [
  { initials: "RK", name: "Rajesh Kumar", zone: "North Zone", tasks: 28, workload: 75, completion: 75, efficiency: 92 },
  { initials: "PS", name: "Priya Sharma", zone: "South Zone", tasks: 22, workload: 60, completion: 80, efficiency: 88 },
  { initials: "AP", name: "Amit Patel", zone: "West Zone", tasks: 18, workload: 45, completion: 100, efficiency: 94 },
];


// --- MAIN PAGE COMPONENT ---

const TaskManagement = () => {
  return (
    <PageLayout>
      {/* --- Page Header (with Add button) --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Task Management</h1>
          <p className="text-muted-foreground">
            Manage field managers and regional operations across all zones
          </p>
        </div>
        <Button className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto invisible">
          <Plus className="w-4 h-4" />
          Add New Task
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListChecks className="w-4 h-4" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: DASHBOARD                */}
        {/* =================================== */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <AiAssistantBanner />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <TaskStatCard title="Total Tasks" value="3" icon={CheckSquare} iconBg="bg-secondary" iconColor="text-muted-foreground" />
              <TaskStatCard title="Assigned" value="1" icon={CalendarCheck} iconBg="bg-yellow-100" iconColor="text-yellow-600" />
              <TaskStatCard title="In Progress" value="1" icon={Loader2} iconBg="bg-orange-100" iconColor="text-orange-600" />
              <TaskStatCard title="Completed" value="1" icon={CheckCircle2} iconBg="bg-green-100" iconColor="text-green-600" />
              <TaskStatCard title="Overdue" value="2" icon={AlertCircle} iconBg="bg-red-100" iconColor="text-red-600" />
              <TaskStatCard title="AI Generated" value="0" icon={Sparkles} iconBg="bg-blue-100" iconColor="text-blue-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ActionCard title="AI Task Suggestions" description="Get intelligent task recommendations" icon={Wand2} iconBg="bg-blue-100" iconColor="text-blue-600" />
              <ActionCard title="Create Manual Task" description="Traditional task assignment" icon={PlusCircle} iconBg="bg-green-100" iconColor="text-green-600" />
              <ActionCard title="Task Analytics" description="Performance insights" icon={BarChartHorizontal} iconBg="bg-orange-100" iconColor="text-orange-600" />
            </div>
            <Card>
              <CardHeader><CardTitle>Recent Tasks</CardTitle></CardHeader>
              <CardContent><div className="divide-y divide-border">{taskItems.map((task) => (<TaskItem key={task.title} {...task} />))}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: TASKS (NEWLY ADDED)      */}
        {/* =================================== */}
        <TabsContent value="tasks">
          <div className="space-y-4">
            {/* Sub-header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Task Management</h2>
                <p className="text-muted-foreground">Assign and manage tasks for field managers across all zones</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" className="gap-2 w-1/2 md:w-auto">
                  <Wand2 className="w-4 h-4" /> AI Suggestions (4)
                </Button>
                <Button className="gap-2 w-1/2 md:w-auto">
                  <Plus className="w-4 h-4" /> Create Task
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search tasks..." className="pl-9 w-full md:w-64" />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="irrigation">Irrigation</SelectItem>
                    <SelectItem value="pest-control">Pest Control</SelectItem>
                    <SelectItem value="soil-testing">Soil Testing</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-Tabs (for status) */}
            <Tabs defaultValue="all" className="pt-4">
              <TabsList>
                <TabsTrigger value="all">All Tasks (3)</TabsTrigger>
                <TabsTrigger value="assigned">Assigned (1)</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress (1)</TabsTrigger>
                <TabsTrigger value="completed">Completed (1)</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Details</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasksListData.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${task.iconBg}`}>
                                <task.icon className={`w-5 h-5 ${task.iconColor}`} />
                              </div>
                              <div>
                                <p className="font-medium">{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.plot}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">{task.initials}</AvatarFallback>
                              </Avatar>
                              <span>{task.assignedTo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className={task.dueDate === "15/10/2024" ? "text-destructive font-medium" : ""}>
                                {task.dueDate}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.priority === "Urgent" ? "destructive" : task.priority === "High" ? "destructive" : "warning"}
                              className={task.priority === "High" ? "bg-orange-500 hover:bg-orange-600" : ""}
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.status === "Completed" ? "success" : task.status === "In Progress" ? "warning" : "default"}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{task.notes} notes</span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
              {/* Add other TabsContent for Assigned, In Progress, Completed if needed */}
            </Tabs>
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: ANALYTICS (NEWLY ADDED)  */}
        {/* =================================== */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Task Analytics</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsStatData.map((stat) => (
                <AnalyticsStatCard key={stat.title} {...stat} />
              ))}
            </div>

            {/* Field Manager Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Field Manager Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {managerPerformanceData.map((manager) => (
                    <ManagerPerformanceItem key={manager.initials} {...manager} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default TaskManagement;