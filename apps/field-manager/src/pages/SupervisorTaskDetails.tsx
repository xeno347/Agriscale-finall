// src/pages/SupervisorTaskDetails.tsx
"use client"; // If using Next.js App Router, otherwise remove

import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react"; // Added useCallback
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button"; // Import Button
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components
import { Badge } from "@/components/ui/badge"; // Import Badge
import { format } from "date-fns"; // For formatting dates

// --- API Imports ---
import { getTasks, getSupervisors } from "@/lib/apiService";
import type { Task, Supervisor } from "@/types/api";

const SupervisorTaskDetails = () => {
  // Get supervisorId from URL
  const { supervisorId } = useParams<{ supervisorId: string }>();

  // --- State for Data ---
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]); // Tasks for this specific supervisor
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching Logic ---
  const loadData = useCallback(async () => {
    if (!supervisorId) {
      setError("Supervisor ID not found in URL.");
      setIsLoading(false);
      return;
    }
    // Set loading true only on initial load or retry
    // setIsLoading(true); // Moved to useEffect
    setError(null);
    try {
      console.log("Fetching details for supervisor ID:", supervisorId);

      // Fetch supervisors and all tasks in parallel
      const [allSupervisors, allTasks] = await Promise.all([
        getSupervisors(),
        getTasks(),
      ]);

      // Find the specific supervisor
      const currentSupervisor = allSupervisors.find(s => s.id === supervisorId);
      if (currentSupervisor) {
        setSupervisor(currentSupervisor);
        console.log("Found supervisor:", currentSupervisor.name);
      } else {
        console.error("Supervisor not found with ID:", supervisorId);
        setError(`Supervisor with ID ${supervisorId} not found.`);
        setSupervisor(null); // Clear any previous supervisor data
      }

      // Filter tasks for this supervisor
      const supervisorTasks = allTasks.filter(task => task.supervisor_id === supervisorId);
      setTasks(supervisorTasks);
      console.log(`Found ${supervisorTasks.length} tasks for this supervisor.`);

    } catch (err) {
      console.error("Failed to fetch supervisor/task details:", err);
      setError("Failed to load details. Please try again.");
      setSupervisor(null); // Clear data on error
      setTasks([]);
    } finally {
      // setIsLoading(false); // Moved to useEffect
    }
  }, [supervisorId]); // Depend only on supervisorId

  useEffect(() => {
    setIsLoading(true); // Set loading before fetch
    loadData().finally(() => {
        setIsLoading(false); // Set loading false after fetch completes/fails
    });
  }, [loadData]); // Runs when loadData changes (which is only when supervisorId changes)


  // --- Helper to get status badge color ---
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default"; // Greenish (shadcn default)
      case "in progress":
        return "secondary"; // Bluish/Grayish
      case "pending":
        return "outline"; // Orange/Yellowish (often used for pending)
      default:
        return "destructive"; // Red for unknown/error status
    }
  };

  // --- Render States ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">{error}</h2>
        <Button onClick={() => { setIsLoading(true); loadData(); }} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Tasks for {supervisor ? supervisor.name : `Supervisor ${supervisorId}`}
      </h1>
      {/* Optional: Add more supervisor details here if needed */}
      {supervisor && (
         <p className="text-muted-foreground">Email: {supervisor.email} | Phone: {supervisor.phone}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Task List ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No tasks assigned to this supervisor.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.task}</TableCell>
                    <TableCell>{task.type}</TableCell>
                    <TableCell>{task.plot}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.due_date
                        ? format(new Date(task.due_date + 'T00:00:00'), "PP") // Format date nicely, adjust TZ if needed
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorTaskDetails;