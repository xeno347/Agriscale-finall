import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone } from "lucide-react";

const supervisors = [
  { id: "1", name: "John Smith", email: "john@farm.com", phone: "+1 234-567-8900", plots: ["Plot 1"], status: "active" },
  { id: "2", name: "Sarah Johnson", email: "sarah@farm.com", phone: "+1 234-567-8901", plots: ["Plot 2"], status: "active" },
  { id: "3", name: "Mike Wilson", email: "mike@farm.com", phone: "+1 234-567-8902", plots: ["Plot 3"], status: "active" },
  { id: "4", name: "Emily Brown", email: "emily@farm.com", phone: "+1 234-567-8903", plots: ["Plot 4"], status: "active" },
  { id: "5", name: "David Lee", email: "david@farm.com", phone: "+1 234-567-8904", plots: ["Plot 5"], status: "active" },
  { id: "6", name: "Lisa Chen", email: "lisa@farm.com", phone: "+1 234-567-8905", plots: ["Plot 6"], status: "active" },
];

const Supervisors = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Supervisors</h1>
          <p className="text-muted-foreground">Manage field supervisors and assignments</p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Supervisor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {supervisors.map((supervisor) => (
          <Card key={supervisor.id} className="shadow-soft hover:shadow-elevated transition-all duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 bg-gradient-primary">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {supervisor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">{supervisor.name}</CardTitle>
                  <Badge className="mt-1 bg-success text-white">
                    {supervisor.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{supervisor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{supervisor.phone}</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-foreground mb-1">Assigned Plots:</p>
                <div className="flex flex-wrap gap-1">
                  {supervisor.plots.map((plot) => (
                    <Badge key={plot} variant="outline">
                      {plot}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Supervisors;
