import React, { useState } from 'react'; // <-- 1. IMPORT useState
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"; // <-- 2. IMPORT Dialog components
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  UserMinus,
  Plus,
  Download,
  Info,
  CalendarDays,
  Filter
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Stat Card (for top row)
// ... (Component code remains the same) ...
const StatCard = ({ title, value, subtitle, icon: Icon, iconColorClass = "text-muted-foreground" }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="p-2 bg-secondary rounded-lg">
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);


// --- MOCK DATA ---
// ... (statData and attendanceData remain the same) ...
const statData = [
  { title: "Total Field Managers", value: "4", subtitle: "managers", icon: Users, iconColorClass: "text-blue-600" },
  { title: "Present", value: "1", subtitle: "", icon: CheckCircle2, iconColorClass: "text-green-600" },
  { title: "Late", value: "1", subtitle: "", icon: Clock, iconColorClass: "text-yellow-600" },
  { title: "Absent", value: "1", subtitle: "", icon: XCircle, iconColorClass: "text-destructive" },
  { title: "Half Day", value: "1", subtitle: "", icon: UserMinus, iconColorClass: "text-purple-600" },
];

const attendanceData = [
  { id: "FM001", name: "Rajesh Kumar", role: "Field Manager", status: "Present", checkIn: "08:00", checkOut: "17:00", location: "Field A - North Block", hours: "9 h", notes: "-" },
  { id: "FM002", name: "Priya Sharma", role: "Field Manager", status: "Late", checkIn: "08:15", checkOut: "17:00", location: "Field B - South Block", hours: "8.75h", notes: "-" },
  { id: "FM003", name: "Arjun Patel", role: "Field Manager", status: "Absent", checkIn: "-", checkOut: "-", location: "-", hours: "0 h", notes: "-" },
  { id: "FM004", name: "Sunita Verma", role: "Field Manager", status: "Halfday", checkIn: "08:00", checkOut: "13:00", location: "Field C - East Block", hours: "5h", notes: "Medical appointment" },
];


// --- MAIN PAGE COMPONENT ---

const AttendanceManagement = () => {
  // 3. ADD STATE for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader 
        title="Attendance Management"
        description="Manage field managers and regional operations across all zones"
      />
      
      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 mb-6">
        {/* ... (Banner Content) ... */}
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statData.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>

      <Tabs defaultValue="daily">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="daily" className="gap-2">
              <CalendarDays className="w-4 h-4" /> Daily Attendance
            </TabsTrigger>
            <TabsTrigger value="weekly">Weekly Report</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Select>
              {/* ... (Select Content) ... */}
            </Select>
            {/* 4. ADD onClick HANDLER to the button */}
            <Button 
              className="gap-2 w-full md:w-auto"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Mark Attendance
            </Button>
            <Button variant="outline" className="gap-2 w-full md:w-auto">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* =================================== */}
        {/* TAB 1: DAILY ATTENDANCE         */}
        {/* =================================== */}
        <TabsContent value="daily">
          <Card>
            {/* ... (Card Header & Table) ... */}
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: WEEKLY REPORT            */}
        {/* =================================== */}
        <TabsContent value="weekly">
          {/* ... (Weekly Report Content) ... */}
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: MONTHLY REPORT           */}
        {/* =================================== */}
        <TabsContent value="monthly">
          {/* ... (Monthly Report Content) ... */}
        </TabsContent>
      </Tabs>

      {/* 5. ADD THE DIALOG COMPONENT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              Manually mark attendance for an employee.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>A form to manually mark attendance would go here.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
};

export default AttendanceManagement;