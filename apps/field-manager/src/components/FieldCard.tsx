import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User } from "lucide-react";

interface FieldCardProps {
  plotName: string;
  status: "active" | "maintenance" | "harvesting" | "idle";
  supervisor: string;
  lastActivity: string;
  location: string;
  nextTask?: string;
}

const FieldCard = ({ plotName, status, supervisor, lastActivity, location, nextTask }: FieldCardProps) => {
  const statusConfig = {
    active: { color: "bg-success text-success-foreground", label: "Active" },
    maintenance: { color: "bg-warning text-warning-foreground", label: "Maintenance" },
    harvesting: { color: "bg-accent text-accent-foreground", label: "Harvesting" },
    idle: { color: "bg-muted text-muted-foreground", label: "Idle" },
  };

  return (
    <Card className="hover:shadow-lg transition-all hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">{plotName}</CardTitle>
          <Badge className={statusConfig[status].color}>
            {statusConfig[status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{supervisor}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Last activity: {lastActivity}</span>
        </div>
        {nextTask && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Next Task</p>
            <p className="text-sm font-medium text-foreground mt-1">{nextTask}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FieldCard;
