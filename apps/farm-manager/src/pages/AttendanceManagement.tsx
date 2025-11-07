import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconColorClass?: string;
}

const StatCard = ({ title, value, subtitle, icon: Icon, iconColorClass = "text-muted-foreground" }: StatCardProps) => (
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
  return (
    <PageLayout>
      <PageHeader 
        title="Attendance Management"
        description="Manage field managers and regional operations across all zones"
      />
      
      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 mb-6">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Attendance Management</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Manage attendance for all Field Managers under your supervision. Track daily attendance, monitor work hours, and generate reports for payroll processing.
            </p>
          </div>
        </CardContent>
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
              <SelectTrigger className="w-full md:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                <SelectItem value="north">North Zone</SelectItem>
                <SelectItem value="south">South Zone</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2 w-full md:w-auto">
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today's Attendance - 6/11/2025</CardTitle>
              <Select defaultValue="thursday">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thursday">Thursday</SelectItem>
                  <SelectItem value="wednesday">Wednesday</SelectItem>
                  <SelectItem value="tuesday">Tuesday</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((row) => {
                    let badgeClass = "bg-gray-100 text-gray-800";
                    if (row.status === "Present") badgeClass = "bg-green-100 text-green-700";
                    if (row.status === "Late") badgeClass = "bg-yellow-100 text-yellow-700";
                    if (row.status === "Absent") badgeClass = "bg-red-100 text-red-700";
                    if (row.status === "Halfday") badgeClass = "bg-purple-100 text-purple-700";

                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.id}</p>
                        </TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          <Badge variant="default" className={badgeClass}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.checkIn}</TableCell>
                        <TableCell>{row.checkOut}</TableCell>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>{row.hours}</TableCell>
                        <TableCell>{row.notes}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: WEEKLY REPORT            */}
        {/* =================================== */}
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Weekly attendance summary charts and data will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: MONTHLY REPORT           */}
        {/* =================================== */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Monthly attendance reports for payroll and review will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default AttendanceManagement;
