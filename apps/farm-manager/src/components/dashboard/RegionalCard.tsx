import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RegionalCardProps {
  zone: string;
  manager: string;
  crops: string;
  acres: number;
  yieldPercentage: number;
  alerts: number;
}

export const RegionalCard = ({ 
  zone, 
  manager, 
  crops, 
  acres, 
  yieldPercentage,
  alerts 
}: RegionalCardProps) => {
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{zone}</h3>
            <p className="text-sm text-muted-foreground">Manager: {manager}</p>
            <p className="text-xs text-muted-foreground mt-1">{crops} • {acres} acres</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{yieldPercentage}%</p>
            <p className="text-xs text-muted-foreground">Yield Achievement</p>
          </div>
        </div>
        {alerts > 0 && (
          <Badge variant="destructive" className="text-xs">
            {alerts} alert{alerts > 1 ? 's' : ''}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
