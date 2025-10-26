import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, MapPin, Trash2, Edit } from "lucide-react";
import { SupervisorDialog } from "@/components/SupervisorDialog";

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedPlots: string[];
}

const Supervisors = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      assignedPlots: ["Plot A", "Plot B"],
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+0987654321",
      assignedPlots: ["Plot C"],
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);

  const handleSave = (supervisor: Supervisor) => {
    if (editingSupervisor) {
      setSupervisors(supervisors.map(s => s.id === supervisor.id ? supervisor : s));
    } else {
      setSupervisors([...supervisors, { ...supervisor, id: Date.now().toString() }]);
    }
    setEditingSupervisor(null);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setSupervisors(supervisors.filter(s => s.id !== id));
  };

  const handleEdit = (supervisor: Supervisor) => {
    setEditingSupervisor(supervisor);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingSupervisor(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisors</h1>
          <p className="text-muted-foreground mt-1">
            Manage supervisors and assign plots for monitoring
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supervisor
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {supervisors.map((supervisor) => (
          <Card key={supervisor.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{supervisor.name}</CardTitle>
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
                    <Trash2 className="h-4 w-4" />
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
                {supervisor.assignedPlots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supervisor.assignedPlots.map((plot) => (
                      <Badge key={plot} variant="secondary">
                        {plot}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No plots assigned</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
