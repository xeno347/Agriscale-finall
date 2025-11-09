import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Wand2,
  Sparkles,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  BarChart3,
  Plus,
  Ticket,
  HelpCircle,
  Send,
  Clock,
  CheckCheck,
  AlertTriangle,
  Tractor,
  Bug,
  FlaskConical,
} from "lucide-react";

import { CreateTaskDialog } from "@/components/dashboard/CreateTaskDialog";
import { AiSuggestionsDialog } from "@/components/dashboard/AiSuggestionsDialog";

// === SMALL UTILITY COMPONENTS ===

const AiAssistantBanner = ({
  onViewSuggestions,
}: {
  onViewSuggestions: () => void;
}) => (
  <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 mb-6">
    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Wand2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            AgriScale AI Assistant
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            4 intelligent task suggestions available • Avg. confidence: 85%
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <Button variant="outline" className="gap-2 w-1/2 md:w-auto">
          <Sparkles className="w-4 h-4" /> Generate More
        </Button>
        <Button className="gap-2 w-1/2 md:w-auto" onClick={onViewSuggestions}>
          View Suggestions <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface TaskStatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColorClass?: string;
}
const TaskStatCard = ({
  title,
  value,
  icon: Icon,
  iconColorClass,
}: TaskStatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-secondary">
        <Icon className={`w-5 h-5 ${iconColorClass || "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// === MOCK DATA ===

const tokenStats = [
  { title: "Open Queries", value: "2", icon: Ticket, iconColorClass: "text-yellow-600" },
  { title: "Resolved Today", value: "5", icon: CheckCheck, iconColorClass: "text-green-600" },
  { title: "Avg. Resolution", value: "4.2h", icon: Clock, iconColorClass: "text-blue-600" },
  { title: "Pending on You", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
];

const tokenData = [
  { id: "TKN-001", task: "TSK-1023", subject: "Irrigation pump is broken", submittedBy: "Rajesh Kumar", date: "2025-11-09", status: "Open" },
  { id: "TKN-002", task: "TSK-1024", subject: "Incorrect pesticide type delivered", submittedBy: "Priya Sharma", date: "2025-11-08", status: "Resolved" },
  { id: "TKN-003", task: "-", subject: "Payroll question", submittedBy: "Amit Patel", date: "2025-11-08", status: "Open (Pending on Manager)" },
];

// === MAIN PAGE ===

const TaskManagement = () => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <PageLayout>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Task Management
          </h1>
          <p className="text-muted-foreground">
            Manage field managers and regional operations across all zones
          </p>
        </div>
        <Button
          className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto"
          onClick={() => setIsTaskModalOpen(true)}
        >
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
          <TabsTrigger value="token-management" className="gap-2">
            <Ticket className="w-4 h-4" /> Token Management
          </TabsTrigger>
          <TabsTrigger value="raise-query" className="gap-2">
            <HelpCircle className="w-4 h-4" /> Raise Query
          </TabsTrigger>
        </TabsList>

        {/* === Dashboard Tab === */}
        <TabsContent value="dashboard">
          <AiAssistantBanner onViewSuggestions={() => setIsAiModalOpen(true)} />
        </TabsContent>

        {/* === Tasks Tab === */}
        <TabsContent value="tasks">
          <p>Tasks view coming soon...</p>
        </TabsContent>

        {/* === Analytics Tab === */}
        <TabsContent value="analytics">
          <p>Analytics coming soon...</p>
        </TabsContent>

        {/* === Token Management === */}
        <TabsContent value="token-management" className="space-y-6">
          <h2 className="text-2xl font-semibold">Query & Token Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tokenStats.map((stat) => (
              <TaskStatCard key={stat.title} {...stat} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Open Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token ID</TableHead>
                    <TableHead>Related Task</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenData.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.id}</TableCell>
                      <TableCell>{token.task}</TableCell>
                      <TableCell>{token.subject}</TableCell>
                      <TableCell>{token.submittedBy}</TableCell>
                      <TableCell>{token.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            token.status.toLowerCase().includes("open")
                              ? "secondary"
                              : "default"
                          }
                        >
                          {token.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Raise Query Tab === */}
        <TabsContent value="raise-query">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Raise a New Query</CardTitle>
              <CardDescription>
                Describe your issue, and it will be sent to the operations team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query-subject">Subject</Label>
                <Input
                  id="query-subject"
                  placeholder="e.g., Broken equipment, Task clarification..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="query-task">Related Task (Optional)</Label>
                  <Select>
                    <SelectTrigger id="query-task">
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tsk-1023">
                        TSK-1023: Wheat Field Irrigation
                      </SelectItem>
                      <SelectItem value="tsk-1024">
                        TSK-1024: Pest Control Application
                      </SelectItem>
                      <SelectItem value="tsk-1025">
                        TSK-1025: Soil Testing
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="query-priority">Priority</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger id="query-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query-description">Describe your query</Label>
                <Textarea
                  id="query-description"
                  placeholder="Please provide all relevant details..."
                  rows={6}
                />
              </div>

              <Button className="w-full gap-2">
                <Send className="w-4 h-4" />
                Submit Query
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Dialogs === */}
      <CreateTaskDialog
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
      />
      <AiSuggestionsDialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen} />
    </PageLayout>
  );
};

export default TaskManagement;
