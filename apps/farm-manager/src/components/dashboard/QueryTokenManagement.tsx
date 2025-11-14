// File: apps/farm-manager/src/components/dashboard/QueryTokenManagement.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

interface Query {
  id: string;
  relatedTask?: string;
  subject: string;
  submittedBy: string;
  date: string;
  status: "Open" | "Resolved" | "Pending on Manager";
  assignedTo?: string;
}

const mockQueries: Query[] = [
  {
    id: "TKN-001",
    relatedTask: "TSK-1023",
    subject: "Irrigation pump is broken",
    submittedBy: "Rajesh Kumar",
    date: "2025-11-09",
    status: "Open",
  },
  {
    id: "TKN-002",
    relatedTask: "TSK-1024",
    subject: "Incorrect pesticide type delivered",
    submittedBy: "Priya Sharma",
    date: "2025-11-08",
    status: "Resolved",
  },
  {
    id: "TKN-003",
    subject: "Payroll question",
    submittedBy: "Amit Patel",
    date: "2025-11-08",
    status: "Pending on Manager",
  },
];

const QueryTokenManagement: React.FC = () => {
  const [queries, setQueries] = useState<Query[]>(mockQueries);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<"Open" | "Resolved" | "Pending on Manager">("Open");

  const openAssignModal = (query: Query) => {
    setSelectedQuery(query);
    setAssignModalOpen(true);
  };

  const handleAssign = () => {
    if (!selectedQuery) return;
    const updated = queries.map((q) =>
      q.id === selectedQuery.id ? { ...q, assignedTo: assignee, status } : q
    );
    setQueries(updated);
    setAssignModalOpen(false);
    setAssignee("");
  };

  const openCount = queries.filter((q) => q.status === "Open").length;
  const resolvedCount = queries.filter((q) => q.status === "Resolved").length;
  const pendingCount = queries.filter((q) => q.status === "Pending on Manager").length;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Query & Token Management</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Open Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-green-600">{resolvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending on Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-yellow-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{queries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Query Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Token ID</th>
                <th className="p-2">Related Task</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Submitted By</th>
                <th className="p-2">Date</th>
                <th className="p-2">Status</th>
                <th className="p-2">Assigned To</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{q.id}</td>
                  <td className="p-2">{q.relatedTask || "-"}</td>
                  <td className="p-2">{q.subject}</td>
                  <td className="p-2">{q.submittedBy}</td>
                  <td className="p-2">{q.date}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        q.status === "Open"
                          ? "bg-blue-100 text-blue-700"
                          : q.status === "Resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="p-2">{q.assignedTo || "-"}</td>
                  <td className="p-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => openAssignModal(q)}>
                      Assign
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Assign Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Assigning: {selectedQuery?.subject}</p>
            <Input
              placeholder="Enter Assignee Name"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Pending on Manager">Pending on Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QueryTokenManagement;
