import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Alert {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  time: string;
}

const AlertsList = () => {
  const alerts: Alert[] = [
    {
      id: "1",
      type: "warning",
      title: "Low Fertilizer Stock",
      description: "Plot 3 fertilizer inventory below 20%",
      time: "2 hours ago",
    },
    {
      id: "2",
      type: "info",
      title: "Irrigation Scheduled",
      description: "Plot 1 irrigation starts tomorrow at 6:00 AM",
      time: "3 hours ago",
    },
    {
      id: "3",
      type: "success",
      title: "Harvest Complete",
      description: "Plot 2 harvest completed successfully",
      time: "5 hours ago",
    },
    {
      id: "4",
      type: "warning",
      title: "Equipment Maintenance Due",
      description: "Tractor #3 requires scheduled maintenance",
      time: "1 day ago",
    },
  ];

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "info":
        return <Clock className="w-4 h-4 text-accent" />;
      case "success":
        return <TrendingUp className="w-4 h-4 text-success" />;
    }
  };

  const getAlertBadge = (type: Alert["type"]) => {
    const config = {
      warning: "bg-warning/10 text-warning border-warning/20",
      info: "bg-accent/10 text-accent border-accent/20",
      success: "bg-success/10 text-success border-success/20",
    };
    return config[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <Badge variant="outline" className={getAlertBadge(alert.type)}>
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AlertsList;
