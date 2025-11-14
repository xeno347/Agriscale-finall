import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Download,
  Users,
  CheckCircle,
  Briefcase,
  IndianRupee,
  Search,
  Calendar,
  Home,
  ShieldAlert,
  Clock,
  LineChart,
} from "lucide-react";
import { AddEmployeeDialog } from "@/components/dashboard/AddEmployeeDialog";
import { Progress } from "@/components/ui/progress";

// ==========================
// MOCK DATA
// ==========================
const employeesData = [
  {
    id: "1",
    initials: "RK",
    name: "Rajesh Kumar",
    empId: "FM001",
    role: "permanent",
    roleType: "permanent",
    status: "active",
    performance: 4.5,
    tasksDone: 156,
    attendance: 96,
    salary: "₹25K/mo",
    joinDate: "15 Mar 2022",
    address: "North Zone, Sector 1, AgriScale Quarters",
    emergencyContact: "+91 99887 76655 (Spouse)",
  },
  {
    id: "2",
    initials: "PS",
    name: "Priya Sharma",
    empId: "FM002",
    role: "agronomist",
    roleType: "agronomist",
    status: "active",
    performance: 4.8,
    tasksDone: 89,
    attendance: 98,
    salary: "₹45K/mo",
    joinDate: "20 Jul 2021",
    address: "South Zone, Block 5, Near Depot",
    emergencyContact: "+91 99776 65544 (Father)",
  },
  {
    id: "3",
    initials: "VS",
    name: "Vijay Singh",
    empId: "FM003",
    role: "seasonal",
    roleType: "seasonal",
    status: "active",
    performance: 4.2,
    tasksDone: 45,
    attendance: 88,
    salary: "₹600/day",
    joinDate: "01 Sep 2025",
    address: "Seasonal Worker Camp, B-Wing",
    emergencyContact: "+91 99665 54433 (Self)",
  },
];

const attendanceData = [
  {
    id: "1",
    name: "Rajesh Kumar",
    initials: "RK",
    clockIn: "07:45 AM",
    clockOut: "05:30 PM",
    location: "Plot A1 - North Zone",
    hours: "9h 45m",
    status: "Present",
  },
  {
    id: "2",
    name: "Priya Sharma",
    initials: "PS",
    clockIn: "08:00 AM",
    clockOut: "06:00 PM",
    location: "Field Office",
    hours: "10h",
    status: "Present",
  },
  {
    id: "3",
    name: "Vijay Singh",
    initials: "VS",
    clockIn: "08:30 AM",
    clockOut: "01:30 PM",
    location: "Plot B2 - South Zone",
    hours: "5h",
    status: "Half Day",
  },
];

const performanceData = [
  {
    id: "1",
    name: "Rajesh Kumar",
    tasksCompleted: 156,
    quality: 92,
    efficiency: 88,
    reliability: 96,
    rating: 4.5,
  },
  {
    id: "2",
    name: "Priya Sharma",
    tasksCompleted: 89,
    quality: 96,
    efficiency: 90,
    reliability: 98,
    rating: 4.8,
  },
  {
    id: "3",
    name: "Vijay Singh",
    tasksCompleted: 45,
    quality: 85,
    efficiency: 80,
    reliability: 88,
    rating: 4.2,
  },
];

// ==========================
// COMPONENTS
// ==========================
const StatCard = ({ title, value, icon: Icon }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const EmployeeCard = ({ emp }: any) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>{emp.initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{emp.name}</CardTitle>
            <p className="text-xs text-muted-foreground">ID: {emp.empId}</p>
          </div>
        </div>
        <Badge variant="outline">{emp.roleType}</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <p>Performance: {emp.performance}/5</p>
        <p>Attendance: {emp.attendance}%</p>
        <p>Tasks: {emp.tasksDone}</p>
        <p>Salary: {emp.salary}</p>
      </div>
      <div className="border-t mt-3 pt-3 text-xs text-muted-foreground">
        <p>Joined: {emp.joinDate}</p>
        <p>{emp.address}</p>
        <p>Emergency: {emp.emergencyContact}</p>
      </div>
    </CardContent>
  </Card>
);

// ==========================
// MAIN PAGE
// ==========================
const EmployeeManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader
        title="Employee Management"
        description="Manage staff, attendance, and performance across all farm zones"
      />

      <Tabs defaultValue="profiles">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles">Employee Profiles</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & Timesheets</TabsTrigger>
          <TabsTrigger value="performance">Performance Tracking</TabsTrigger>
        </TabsList>

        {/* PROFILES */}
        <TabsContent value="profiles">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Employees" value="232" icon={Users} />
            <StatCard title="Active" value="228" icon={CheckCircle} />
            <StatCard title="Permanent Staff" value="120" icon={Briefcase} />
            <StatCard title="Monthly Payroll" value="₹1.05 L" icon={IndianRupee} />
          </div>

          <div className="flex justify-between mb-6">
            <Input placeholder="Search employees..." className="w-64" />
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employeesData.map((e) => (
              <EmployeeCard key={e.id} emp={e} />
            ))}
          </div>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.clockIn}</TableCell>
                      <TableCell>{a.clockOut}</TableCell>
                      <TableCell>{a.hours}</TableCell>
                      <TableCell>{a.location}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === "Present"
                              ? "success"
                              : a.status === "Half Day"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Avg Performance" value="4.6 / 5" icon={LineChart} />
            <StatCard title="Top Performer" value="Priya Sharma" icon={CheckCircle} />
            <StatCard title="Total Tasks" value="290+" icon={Briefcase} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.map((p) => (
                <div key={p.id} className="border-b py-4 last:border-0">
                  <h4 className="font-semibold">{p.name}</h4>
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Quality</p>
                      <Progress value={p.quality} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Efficiency</p>
                      <Progress value={p.efficiency} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reliability</p>
                      <Progress value={p.reliability} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddEmployeeDialog open={isModalOpen} onOpenChange={setIsModalOpen} />
    </PageLayout>
  );
};

export default EmployeeManagement;
