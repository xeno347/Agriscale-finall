import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Thermometer,
  Cloudy,
  Wind,
  Droplets,
  AlertTriangle,
  Eye,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

// Helper for status badge
const getBadgeVariant = (status: string) => {
  if (status.includes("high")) return "destructive";
  if (status.includes("medium")) return "secondary";
  return "default";
};

interface FieldCardProps {
  title: string;
  sector: string;
  status: string;
  crop: string;
  area: string;
  stage: string;
  healthScore: number;
  temp: number;
  ph: number;
  humidity: number;
  waterLevel: number;
  waterStatus: "active" | "scheduled" | "overdue";
  alerts: string[];
}

export const FieldDashboardCard = ({
  title,
  sector,
  status,
  crop,
  area,
  stage,
  healthScore,
  temp,
  ph,
  humidity,
  waterLevel,
  waterStatus,
  alerts,
}: FieldCardProps) => {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold mb-1">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{sector}</p>
          </div>
          <Badge variant={getBadgeVariant(status)} className="capitalize">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b pb-4">
          <div>
            <p className="text-xs text-muted-foreground">Crop</p>
            <p className="font-semibold">{crop}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Area</p>
            <p className="font-semibold">{area}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stage</p>
            <p className="font-semibold">{stage}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Health Score</p>
            <p
              className={`font-bold ${
                healthScore > 85
                  ? "text-green-600"
                  : healthScore > 60
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {healthScore}%
            </p>
          </div>
        </div>

        {/* Sensor Data */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-500" />
            <span className="text-sm">{temp}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-sm">pH {ph}</span>
          </div>
          <div className="flex items-center gap-2">
            <Cloudy className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-500" />
            <span className="text-sm">{waterLevel}%</span>
            <Badge
              variant={
                waterStatus === "active"
                  ? "default"
                  : waterStatus === "overdue"
                  ? "destructive"
                  : "outline"
              }
              className="capitalize text-xs"
            >
              {waterStatus}
            </Badge>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Alerts:</h4>
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* View Details Button */}
        <Button variant="outline" className="w-full group">
          View Details
          <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
};