import React from "react";
import { AddEmployeeDialog } from "@/components/dashboard/AddEmployeeDialog";
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
  LineChart
} from "lucide-react";
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";
import type { PerformanceData } from "@/components/dashboard/PerformanceCard";

// --- MOCK DATA ---

// Type for Employee Profiles
type Employee = {
  id: string;
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
  email: string;
  phone: string;
  location: string;
  specializations: string[];
};

// Data for Employee Profiles Tab
const employeesData: Employee[] = [
  {
    id: "1",
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
    email: "rajesh.kumar@agriscale.com",
    phone: "+91 98765 43210",
    location: "North Zone - Plot A",
    specializations: ["Tractor Operation", "Irrigation Management"],
  },
  {
    id: "2",
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
    email: "priya.sharma@agriscale.com",
    phone: "+91 87654 32109",
    location: "Multiple Fields",
    specializations: ["Soil Testing", "Crop Advisory", "+1 more"],
  },
  {
    id: "3",
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
    email: "vijay.singh@agriscale.com",
    phone: "+91 76543 21098",
    location: "North Zone - Plot B2",
    specializations: ["Harvesting", "Manual Labour"],
  },
  {
    id: "4",
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
    email: "amit.patel@agriscale.com",
    phone: "+91 65432 10987",
    location: "South Zone - Plot C3",
    specializations: ["Heavy Machinery", "Harvester Operation"],
  },
  {
    id: "5",
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
    email: "sunita.devi@agriscale.com",
    phone: "+91 54321 09876",
    location: "West Zone - Plot D1",
    specializations: ["Spraying Services", "Pest Control"],
  },
];

// Type for Attendance Tab
type AttendanceRecord = {
  id: string;
  initials: string;
  name: string;
  clockIn: string;
  clockOut: string;
  location: string;
  hours: string;
  status: 'present' | 'absent' | 'late';
};

// Data for Attendance Tab
const attendanceData: AttendanceRecord[] = [
  { id: "1", initials: "RK", name: "Rajesh Kumar", clockIn: "07:45 AM", clockOut: "05:30 PM", location: "North Zone - Plot A1", hours: "9.75h", status: 'present' },
  { id: "2", initials: "PS", name: "Priya Sharma", clockIn: "08:00 AM", clockOut: "06:00 PM", location: "Field Office", hours: "10h", status: 'present' },
  { id: "3", initials: "VS", name: "Vijay Singh", clockIn: "08:00 AM", clockOut: "02:00 PM", location: "North Zone - Plot B2", hours: "8h", status: 'present' },
];

// Data for Performance Tab
const performanceData: PerformanceData[] = [
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

// Employee Card for "Profiles" tab
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

        {/* Contact & Location */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span className="truncate">{employee.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{employee.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{employee.location}</span>
          </div>
        </div>

        {/* Specializations */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Specializations</p>
          <div className="flex flex-wrap gap-2">
            {employee.specializations.map((spec, idx) => (
              <Badge key={idx} variant="secondary" className="font-normal">
                {spec}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


// --- MAIN COMPONENT ---

const EmployeeManagement = () => {
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
        {/* TAB 1: PROFILES             */}
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
              <Button className="gap-2 w-full md:w-auto">
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
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Today's Attendance</h3>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
          
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Present" value="228" icon={Check} valueClass="text-success" />
            <StatCard title="Absent" value="4" icon={XCircle} valueClass="text-destructive" />
            <StatCard title="Avg Hours" value="9.3 h" icon={Clock} />
            <StatCard title="Attendance Rate" value="60%" icon={LineChart} />
          </div>

          {/* Attendance Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {row.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.clockIn}</TableCell>
                    <TableCell>{row.clockOut}</TableCell>
                    <TableCell>{row.location}</TableCell>
                                        <TableCell>{row.hours}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'present' ? 'success' : 'destructive'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: PERFORMANCE              */}
        {/* =================================== */}
        <TabsContent value="performance">
          <div className="space-y-6">
            {performanceData.map((data) => (
              <PerformanceCard key={data.id} data={data} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default EmployeeManagement;