"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, MapPin, Trash2, Edit, AlertTriangle } from "lucide-react";
import { SupervisorDialog } from "@/components/SupervisorDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// API and Type Imports
import {
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
  getSupervisorPhotoUrl,
} from "@/lib/apiService";
import type {
  Supervisor,
  SupervisorCreate,
  SupervisorUpdate,
} from "@/types/api";

// --- New Component: Handles fetching and displaying the secure image ---
interface SecureAvatarProps {
    supervisor: Supervisor;
    initials: string;
}

const SecureSupervisorAvatar: React.FC<SecureAvatarProps> = ({ supervisor, initials }) => {
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    
    // Get the photo URL from the supervisor object (type cast is necessary)
    const photoStaticUrl = (supervisor as any).photo_url;
    
    // Logic to extract fileKey from the static URL saved in the database
    // Assumes the URL format: https://bucket.s3.region.amazonaws.com/KEY
    const fileKey = photoStaticUrl 
        ? photoStaticUrl.split('.com/')[1] // Extracts the path (KEY) after the S3 domain
        : null;

    useEffect(() => {
        // Fetch the secure URL only if a photo URL exists and we haven't fetched the secure URL yet
        if (fileKey && !secureUrl) {
            getSupervisorPhotoUrl(fileKey)
                .then(url => setSecureUrl(url))
                .catch(err => {
                    console.error("Failed to fetch secure URL:", err);
                    setSecureUrl(null); 
                });
        }
    }, [fileKey, secureUrl]); 

    return (
        <> 
            {/* CRITICAL: Display AvatarImage or AvatarFallback */}
            {secureUrl ? (
                <AvatarImage src={secureUrl} alt={supervisor.name} />
            ) : (
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                </AvatarFallback>
            )}
        </>
    );
}
// ----------------------------------------------------------------------
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
    formData: SupervisorCreate | SupervisorUpdate,
    supervisorId?: string
  ) => {
    try {
      if (supervisorId) {
        // UPDATE logic
        await updateSupervisor(supervisorId, formData);
        toast.success("Supervisor updated successfully!");
      } else {
        // CREATE logic
        await createSupervisor(formData as SupervisorCreate);
        toast.success("Supervisor created successfully!");
      }
      loadSupervisors(); // Refetch the list
      setDialogOpen(false); // Close the dialog
      setEditingSupervisor(null);
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

  // --- Render Loading/Error States (same as before) ---
  if (isLoading) {
    // ... (Loading state rendering)
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

  if (error) {
    // ... (Error state rendering)
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

            

          // Get the photo URL if it exists (assuming it's named photo_url in the DB response)

          const photoUrl = (supervisor as any).photo_url;

          return (

    <Card key={supervisor.id}>

      <CardHeader>

        <div className="flex items-start justify-between">

          <div className="flex items-center gap-3">

            

            {/* --- FIX: Use a div to define a fixed, structured space for the Avatar --- */}

            <div className="flex-shrink-0 w-10 h-10"> 

                {/* Avatar wrapper provides sizing and overflow control */}

                <Avatar className="w-full h-full"> 

                    <SecureSupervisorAvatar supervisor={supervisor} initials={initials} />

                </Avatar>

            </div>

            {/* --- END FIX --- */}
                    
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