import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Mail,
  Phone,
  MapPin,
  Check,
  XCircle,
  Clock,
  LineChart,
  Calendar,      // <-- ADDED
  Home,          // <-- ADDED
  ShieldAlert    // <-- ADDED
} from "lucide-react";
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";
import type { PerformanceData } from "@/components/dashboard/PerformanceCard";
import { AddEmployeeDialog } from "@/components/dashboard/AddEmployeeDialog";

// --- MOCK DATA ---

// UPDATED Employee Type
type Employee = {
  id: string;
  empId: string; // <-- ADDED
  initials: string;
  name: string;
  role: string;
  roleType: 'permanent' | 'agronomist' | 'seasonal' | 'operator' | 'contractor';
  status: 'active' | 'inactive';
  performance: number;
  tasksDone: number;
  attendance: number;
  salary: string;
  salaryPeriod: 'mo' | 'day' | 'hr';
  joinDate: string; // <-- ADDED
  address: string; // <-- ADDED
  emergencyContact: string; // <-- ADDED
  assignedStaff: string[]; // <-- ADDED
};

// UPDATED Mock Data
const employeesData: Employee[] = [
  {
    id: "1",
    empId: "FM001",
    initials: "RK",
    name: "Rajesh Kumar",
    role: "permanent",
    roleType: 'permanent',
    status: 'active',
    performance: 4.5,
    tasksDone: 156,
    attendance: 96,
    salary: "₹25K",
    salaryPeriod: 'mo',
    joinDate: "15-03-2022",
    address: "North Zone, Sector 1, AgriScale Quarters",
    emergencyContact: "+91 99887 76655 (Spouse)",
    assignedStaff: ["Suresh", "Rina", "Mohan"],
  },
  {
    id: "2",
    empId: "FM002",
    initials: "PS",
    name: "Priya Sharma",
    role: "agronomist",
    roleType: 'agronomist',
    status: 'active',
    performance: 4.8,
    tasksDone: 89,
    attendance: 98,
    salary: "₹45K",
    salaryPeriod: 'mo',
    joinDate: "20-07-2021",
    address: "South Zone, Block 5, Near Depot",
    emergencyContact: "+91 99776 65544 (Father)",
    assignedStaff: ["Anil", "Sunita"],
  },
  {
    id: "3",
    empId: "FM003",
    initials: "VS",
    name: "Vijay Singh",
    role: "seasonal",
    roleType: 'seasonal',
    status: 'active',
    performance: 4.2,
    tasksDone: 45,
    attendance: 88,
    salary: "₹600",
    salaryPeriod: 'day',
    joinDate: "01-09-2025",
    address: "Seasonal Worker Camp, B-Wing",
    emergencyContact: "+91 99665 54433 (Self)",
    assignedStaff: [],
  },
  {
    id: "4",
    empId: "FM004",
    initials: "AP",
    name: "Amit Patel",
    role: "operator",
    roleType: 'operator',
    status: 'active',
    performance: 4.6,
    tasksDone: 178,
    attendance: 92,
    salary: "₹35K",
    salaryPeriod: 'mo',
    joinDate: "10-01-2023",
    address: "West Zone, Tractor Yard, Unit 2",
    emergencyContact: "+91 99554 43322 (Brother)",
    assignedStaff: ["Harpreet"],
  },
  {
    id: "5",
    empId: "FM005",
    initials: "SD",
    name: "Sunita Devi",
    role: "contractor",
    roleType: 'contractor',
    status: 'active',
    performance: 4.4,
    tasksDone: 67,
    attendance: 92,
    salary: "₹15K",
    salaryPeriod: 'mo',
    joinDate: "05-05-2024",
    address: "Contractor Office, East Zone",
    emergencyContact: "+91 99443 32211 (Manager)",
    assignedStaff: [],
  },
];

// ... (attendanceData and performanceData remain the same) ...
const attendanceData = [
  { id: "1", initials: "RK", name: "Rajesh Kumar", clockIn: "07:45 AM", clockOut: "05:30 PM", location: "North Zone - Plot A1", hours: "9.75h", status: 'present' },
  { id: "2", initials: "PS", name: "Priya Sharma", clockIn: "08:00 AM", clockOut: "06:00 PM", location: "Field Office", hours: "10h", status: 'present' },
  { id: "3", initials: "VS", name: "Vijay Singh", clockIn: "08:00 AM", clockOut: "02:00 PM", location: "North Zone - Plot B2", hours: "8h", status: 'present' },
];
const performanceData = [
  {
    id: "1",
    initials: "RK",
    name: "Rajesh Kumar",
    tasksCompleted: 156,
    rating: 4.5,
    metrics: [
      { label: "Harvest Yield", value: 95, isProgress: true },
      { label: "Completion Time", value: 85, isProgress: true },
      { label: "Quality Score", value: 92, isProgress: true },
      { label: "Reliability", value: 96, isProgress: true },
    ],
    tasksDone: 156
  },
  {
    id: "2",
    initials: "PS",
    name: "Priya Sharma",
    tasksCompleted: 89,
    rating: 4.8,
    metrics: [
      { label: "Harvest Yield", value: 98, isProgress: true },
      { label: "Completion Time", value: 90, isProgress: true },
      { label: "Quality Score", value: 96, isProgress: true },
      { label: "Reliability", value: 98, isProgress: true },
    ],
    tasksDone: 89
  },
  {
    id: "3",
    initials: "VS",
    name: "Vijay Singh",
    tasksCompleted: 45,
    rating: 4.2,
    metrics: [
      { label: "Harvest Yield", value: 88, isProgress: true },
      { label: "Completion Time", value: 78, isProgress: true },
      { label: "Quality Score", value: 85, isProgress: true },
      { label: "Reliability", value: 88, isProgress: true },
    ],
    tasksDone: 45
  },
];


// --- REUSABLE COMPONENTS ---

// Stat Card for top sections
const StatCard = ({ title, value, icon: Icon, valueClass = "" }: { title: string, value: string, icon: React.ElementType, valueClass?: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

// UPDATED Employee Card
const EmployeeCard = ({ employee }: { employee: Employee }) => {
  const roleStyles = {
    permanent: 'text-blue-600',
    agronomist: 'text-orange-600',
    seasonal: 'text-green-600',
    operator: 'text-purple-600',
    contractor: 'text-teal-600',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-muted text-muted-foreground">
                {employee.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{employee.name}</CardTitle>
              {employee.roleType === 'permanent' ? (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {employee.role}
                </Badge>
              ) : (
                <p className={`text-sm font-medium ${roleStyles[employee.roleType]}`}>
                  {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                </p>
              )}
              {/* ADDED EMP ID */}
              <p className="text-xs text-muted-foreground mt-1">ID: {employee.empId}</p>
            </div>
          </div>
          <Badge variant={employee.status === 'active' ? 'success' : 'destructive'}>
            {employee.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-2 my-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Performance</p>
            <p className="font-medium">{employee.performance}/5</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Attendance</p>
            <p className="font-medium">{employee.attendance}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tasks Done</p>
            <p className="font-medium">{employee.tasksDone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Salary</p>
            <p className="font-medium">{employee.salary}/{employee.salaryPeriod}</p>
          </div>
        </div>

        {/* NEW: Personal Details */}
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-xs font-semibold text-muted-foreground">Personal Details</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Joined: {employee.joinDate}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Home className="w-3 h-3 mt-0.5" />
            <span className="truncate">{employee.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="w-3 h-3" />
            <span>Emergency: {employee.emergencyContact}</span>
          </div>
        </div>

        {/* NEW: Assigned Staff */}
        {employee.assignedStaff.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground mb-2">Assigned Staff ({employee.assignedStaff.length})</p>
            <div className="flex flex-wrap gap-2">
              {employee.assignedStaff.map((name, idx) => (
                <Badge key={idx} variant="secondary" className="font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// --- MAIN COMPONENT ---

const EmployeeManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader 
        title="Employee Management"
        description="Manage field managers and regional operations across all zones"
      />

      <Tabs defaultValue="profiles">
        <TabsList className="mb-4">
          <TabsTrigger value="profiles">Employee Profiles</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & Timesheets</TabsTrigger>
          <TabsTrigger value="performance">Performance Tracking</TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: PROFILES (with updated card) */}
        {/* =================================== */}
        <TabsContent value="profiles">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Employees" value="232" icon={Users} />
            <StatCard title="Active" value="228" icon={CheckCircle} />
            <StatCard title="Permanent Staff" value="120" icon={Briefcase} />
            <StatCard title="Monthly Payroll" value="₹1.05 L" icon={IndianRupee} />
          </div>

          {/* Filter/Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-9 w-full md:w-64" />
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="agronomist">Agronomist</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-2 w-full md:w-auto" onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Employee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employeesData.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: ATTENDANCE              */}
        {/* =================================== */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance & Timesheets</CardTitle>
            </CardHeader>
            <CardContent>
              {/* ... (Attendance Table content) ... */}
              <p>Attendance tracking and timesheet management content goes here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: PERFORMANCE              */}
        {/* =================================== */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              {/* ... (Performance Tracking content) ... */}
              <p>Performance review and tracking content goes here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* DIALOG COMPONENT */}
      <AddEmployeeDialog open={isModalOpen} onOpenChange={setIsModalOpen} />

    </PageLayout>
  );
};

export default EmployeeManagement;