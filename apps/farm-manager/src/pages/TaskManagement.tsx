import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLayout } from "@/components/dashboard/PageLayout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  Ticket,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { AiSuggestionsDialog } from "@/components/dashboard/AiSuggestionsDialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ----------------------------
// ✅ Type Definitions
// ----------------------------
interface Task {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
}

interface Token {
  id: string;
  subject: string;
  submittedBy: string;
  status: string;
  assignedTo?: string;
}

interface Query {
  id: string;
  subject: string;
  priority: string;
  status: string;
  assignedTo?: string;
}

// ----------------------------
// ✅ Stats Cards
// ----------------------------
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="border border-gray-200 shadow-sm">
    <CardContent className="flex items-center gap-4 p-5">
      <div className={`p-2 rounded-md bg-gray-50`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-2xl font-semibold">{value}</h3>
      </div>
    </CardContent>
  </Card>
);

// ----------------------------
// ✅ Mock Data
// ----------------------------
const taskStats = [
  { title: "Active Tasks", value: 24, icon: ListChecks, color: "text-green-600" },
  { title: "Completed Tasks", value: 56, icon: CheckCircle, color: "text-blue-600" },
  { title: "Overdue Tasks", value: 3, icon: AlertTriangle, color: "text-red-600" },
  { title: "Avg Completion", value: "5.2h", icon: Clock, color: "text-yellow-600" },
];

const taskData: Task[] = [
  { id: "TSK-101", title: "Soil Check - Plot A", assignedTo: "Rajesh", status: "In Progress" },
  { id: "TSK-102", title: "Fertilizer Distribution", assignedTo: "Priya", status: "Pending" },
  { id: "TSK-103", title: "Weed Control - Plot B", assignedTo: "Amit", status: "Completed" },
  { id: "TSK-104", title: "Irrigation Maintenance", assignedTo: "Neha", status: "In Progress" },
];

const tokenData: Token[] = [
  { id: "TKN-001", subject: "Pump Broken", submittedBy: "Rajesh Kumar", status: "Open" },
  { id: "TKN-002", subject: "Fertilizer Issue", submittedBy: "Priya Sharma", status: "Resolved" },
  { id: "TKN-003", subject: "Equipment Delay", submittedBy: "Suresh Verma", status: "Pending" },
];

const queryData: Query[] = [
  { id: "QRY-201", subject: "Delay in pesticide", priority: "High", status: "Open" },
  { id: "QRY-202", subject: "Fertilizer shortage", priority: "Medium", status: "In Progress" },
  { id: "QRY-203", subject: "Harvest clarification", priority: "Low", status: "Resolved" },
];

// ----------------------------
// ✅ Analytics Data
// ----------------------------
const taskAnalytics = [
  { name: "Pending", count: 8 },
  { name: "In Progress", count: 10 },
  { name: "Completed", count: 6 },
];

const queryAnalytics = [
  { name: "High", value: 3 },
  { name: "Medium", value: 4 },
  { name: "Low", value: 2 },
];

const COLORS = ["#22c55e", "#facc15", "#60a5fa"];
const availableResolvers = ["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Neha Reddy"];

// ----------------------------
// ✅ Component
// ----------------------------
export default function TaskManagement() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [tokens, setTokens] = useState<Token[]>(tokenData);
  const [queries, setQueries] = useState<Query[]>(queryData);

  const handleAssign = (id: string, resolver: string, type: "token" | "query") => {
    if (type === "token") {
      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, assignedTo: resolver } : t))
      );
    } else {
      setQueries((prev) =>
        prev.map((q) => (q.id === id ? { ...q, assignedTo: resolver } : q))
      );
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Task Management</h1>
          <p className="text-gray-500">Oversee farm operations, tokens, and queries efficiently.</p>
        </div>
        <Button
          onClick={() => setIsTaskModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="bg-transparent border-b border-gray-200 mb-6 flex flex-wrap gap-2">
          <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none">
            <ListChecks className="w-4 h-4 mr-2" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="token-management" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 rounded-none">
            <Ticket className="w-4 h-4 mr-2" /> Token Management
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {taskStats.map((s) => (
              <StatCard key={s.title} {...s} />
            ))}
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskData.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.id}</TableCell>
                      <TableCell>{t.title}</TableCell>
                      <TableCell>{t.assignedTo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskData.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.id}</TableCell>
                      <TableCell>{task.title}</TableCell>
                      <TableCell>{task.assignedTo}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            task.status === "Completed"
                              ? "bg-green-600 text-white"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskAnalytics}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={queryAnalytics}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {queryAnalytics.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* TOKEN + QUERY MANAGEMENT */}
        <TabsContent value="token-management">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-semibold text-gray-900">Token & Query Management</h2>

            {/* TOKEN TABLE */}
            <Card>
              <CardHeader>
                <CardTitle>Active Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.id}</TableCell>
                        <TableCell>{t.subject}</TableCell>
                        <TableCell>{t.submittedBy}</TableCell>
                        <TableCell>
                          {t.assignedTo ? (
                            <Badge>{t.assignedTo}</Badge>
                          ) : (
                            <Select onValueChange={(val) => handleAssign(t.id, val, "token")}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableResolvers.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              t.status === "Resolved"
                                ? "bg-green-600 text-white"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* QUERY TABLE */}
            <Card>
              <CardHeader>
                <CardTitle>Query Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queries.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.id}</TableCell>
                        <TableCell>{q.subject}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${
                              q.priority === "High"
                                ? "bg-red-100 text-red-700"
                                : q.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {q.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {q.assignedTo ? (
                            <Badge>{q.assignedTo}</Badge>
                          ) : (
                            <Select onValueChange={(val) => handleAssign(q.id, val, "query")}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableResolvers.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              q.status === "Resolved"
                                ? "bg-green-600 text-white"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {q.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateTaskDialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen} />
      <AiSuggestionsDialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen} />
    </PageLayout>
  );
}
