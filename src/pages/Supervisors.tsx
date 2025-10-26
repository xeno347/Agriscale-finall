"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, MapPin, Trash2, Edit, AlertTriangle } from "lucide-react";
import { SupervisorDialog } from "@/components/SupervisorDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// API and Type Imports
import {
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
} from "@/lib/apiService";
import type {
  Supervisor,
  SupervisorCreate,
  SupervisorUpdate,
} from "@/types/api";

const Supervisors = () => {
  // --- API State ---
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Dialog State ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(
    null
  );

  // --- Data Fetching ---
  const loadSupervisors = useCallback(async () => {
    try {
      // Don't set loading to true on refetch, only on initial load
      // setIsLoading(true);
      setError(null);
      const data = await getSupervisors();
      setSupervisors(data);
    } catch (err) {
      console.error("Failed to fetch supervisors:", err);
      setError("Failed to load supervisors. Please try again.");
      toast.error("Failed to load supervisors.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupervisors();
  }, [loadSupervisors]);

  // --- API Handlers ---
  const handleSave = async (
    // This data comes from the dialog's form
    formData: Omit<Supervisor, "id" | "email" | "phone"> & {
      name: string;
      email: string;
      phone: string;
      assigned_plots: string[];
    }
  ) => {
    const supervisorData: SupervisorCreate = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      assigned_plots: formData.assigned_plots,
      // field_manager_id can be added if needed
    };

    try {
      if (editingSupervisor) {
        // UPDATE logic
        await updateSupervisor(editingSupervisor.id, supervisorData);
        toast.success("Supervisor updated successfully!");
      } else {
        // CREATE logic
        await createSupervisor(supervisorData);
        toast.success("Supervisor created successfully!");
      }
      loadSupervisors(); // Refetch the list
      handleDialogClose(); // Close the dialog
    } catch (err) {
      console.error("Failed to save supervisor:", err);
      toast.error("Failed to save supervisor.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this supervisor?")) {
      return;
    }
    try {
      await deleteSupervisor(id);
      toast.success("Supervisor deleted successfully!");
      loadSupervisors(); // Refetch the list
    } catch (err) {
      console.error("Failed to delete supervisor:", err);
      toast.error("Failed to delete supervisor.");
    }
  };

  // --- Dialog Controls ---
  const handleEdit = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupervisor(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSupervisor(null);
  };

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  // --- Render Error State ---
  if (error) {
    return (
      <div className="p-6 space-y-6 text-center text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">{error}</h2>
        <Button onClick={loadSupervisors}>Try Again</Button>
      </div>
    );
  }

  // --- Render Main Content ---
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisors</h1>
          <p className="text-muted-foreground mt-1">
            Manage supervisors and assign plots for monitoring
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supervisor
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {supervisors.map((supervisor) => {
          const initials = supervisor.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

          return (
            <Card key={supervisor.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 flex items-center justify-center h-10 w-10">
                      <span className="font-semibold text-primary">
                        {initials}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {supervisor.name}
                      </CardTitle>
                      <CardDescription>{supervisor.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(supervisor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supervisor.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {supervisor.phone}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" />
                    Assigned Plots
                  </div>
                  {/* UPDATED: from assignedPlots to assigned_plots */}
                  {supervisor.assigned_plots.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {supervisor.assigned_plots.map((plot) => (
                        <Badge key={plot} variant="secondary">
                          {plot}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No plots assigned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* This dialog now correctly passes the API handler */}
      <SupervisorDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        supervisor={editingSupervisor}
      />
    </div>
  );
};

export default Supervisors;