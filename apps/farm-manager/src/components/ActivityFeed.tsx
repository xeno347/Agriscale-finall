import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, TrendingUp, Package } from "lucide-react";

interface Activity {
  id: string;
  type: "success" | "warning" | "info" | "inventory";
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "success",
    title: "Plot 3 Harvest Complete",
    description: "Successfully harvested 500kg of produce",
    time: "2 hours ago",
  },
  {
    id: "2",
    type: "warning",
    title: "Low Inventory Alert",
    description: "Fertilizer stock below minimum threshold",
    time: "3 hours ago",
  },
  {
    id: "3",
    type: "info",
    title: "New Planting Cycle",
    description: "Plot 2 started new planting season",
    time: "5 hours ago",
  },
  {
    id: "4",
    type: "inventory",
    title: "Inventory Updated",
    description: "Received shipment of seeds and tools",
    time: "1 day ago",
  },
];

const iconMap = {
  success: CheckCircle,
  warning: AlertCircle,
  info: TrendingUp,
  inventory: Package,
};

const colorMap = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  inventory: "text-primary",
};

export const ActivityFeed = () => {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = iconMap[activity.type];
            return (
              <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                <div className={`mt-1 ${colorMap[activity.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
