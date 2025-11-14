import { useState } from "react";
import {
  Card,
  CardContent,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Download } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function AttendanceManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dummy Data
  const attendanceData = [
    {
      id: "FM001",
      name: "Rajesh Kumar",
      status: "Present",
      checkIn: "08:00",
      checkOut: "17:00",
      location: "Field A – North Block",
      hours: "9 hrs",
    },
    {
      id: "FM002",
      name: "Priya Sharma",
      status: "Late",
      checkIn: "09:30",
      checkOut: "17:00",
      location: "Packing Section",
      hours: "7.5 hrs",
    },
    {
      id: "FM003",
      name: "Arjun Patel",
      status: "Absent",
      checkIn: "-",
      checkOut: "-",
      location: "-",
      hours: "-",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Management</h1>

      {/* TABS - Only Daily Attendance */}
      <Tabs defaultValue="daily">
        <div className="flex flex-col md:flex-row justify-between mb-4">
          <TabsList>
            <TabsTrigger value="daily" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Daily Attendance
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 mt-2 md:mt-0">
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Mark Attendance
            </Button>

            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* DAILY ATTENDANCE TABLE */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {attendanceData.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.id}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>
                        <Badge>{emp.status}</Badge>
                      </TableCell>
                      <TableCell>{emp.checkIn}</TableCell>
                      <TableCell>{emp.checkOut}</TableCell>
                      <TableCell>{emp.location}</TableCell>
                      <TableCell>{emp.hours}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MARK ATTENDANCE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>Fill in the attendance details.</DialogDescription>
          </DialogHeader>

          {/* FORM START */}
          <div className="space-y-4 py-2">

            {/* Select Employee */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FM001">Rajesh Kumar</SelectItem>
                  <SelectItem value="FM002">Priya Sharma</SelectItem>
                  <SelectItem value="FM003">Arjun Patel</SelectItem>
                  <SelectItem value="FM004">Sunita Verma</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Halfday">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check-in */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-in Time</label>
              <input type="time" className="w-full border rounded-md p-2" />
            </div>

            {/* Check-out */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Check-out Time</label>
              <input type="time" className="w-full border rounded-md p-2" />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <input
                type="text"
                placeholder="Enter location"
                className="w-full border rounded-md p-2"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                className="w-full border rounded-md p-2"
                placeholder="Add notes..."
              />
            </div>

          </div>
          {/* FORM END */}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
