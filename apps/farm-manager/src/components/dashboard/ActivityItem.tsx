import { LucideIcon } from "lucide-react";

interface ActivityItemProps {
  icon: LucideIcon;
  title: string;
  time: string;
  variant?: "default" | "success" | "warning" | "info";
}

export const ActivityItem = ({ 
  icon: Icon, 
  title, 
  time, 
  variant = "default" 
}: ActivityItemProps) => {
  const iconColors = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    info: "text-info"
  };

  const bgColors = {
    default: "bg-secondary",
    success: "bg-success/10",
    warning: "bg-warning/10",
    info: "bg-info/10"
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`p-2 rounded-lg ${bgColors[variant]}`}>
        <Icon className={`w-4 h-4 ${iconColors[variant]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
    </div>
  );
};
