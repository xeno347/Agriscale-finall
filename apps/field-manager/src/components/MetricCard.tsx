import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "warning" | "success";
}

const MetricCard = ({ title, value, icon: Icon, trend, variant = "default" }: MetricCardProps) => {
  const variantStyles = {
    default: "border-l-primary",
    warning: "border-l-warning",
    success: "border-l-success",
  };

  return (
    <Card className={`border-l-4 ${variantStyles[variant]} hover:shadow-md transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className={`text-xs font-medium ${trend.isPositive ? "text-success" : "text-destructive"}`}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${variant === "warning" ? "bg-warning/10" : variant === "success" ? "bg-success/10" : "bg-primary/10"}`}>
            <Icon className={`w-6 h-6 ${variant === "warning" ? "text-warning" : variant === "success" ? "text-success" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
