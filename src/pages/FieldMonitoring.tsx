// FIX: Changed import path from alias "@/" to relative "../"
import PlotCard from "../components/PlotCard"; 
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wheat, Droplets, Tractor, Sprout, FlaskConical, Bug, LucideIcon } from "lucide-react";

// --- Data for Interactive Map ---
const plots = [
  { number: "21B", acreage: "2.11acre", activity: "harvesting" as const, completion: 80 },
  { number: "21A", acreage: "2.30acre", activity: "irrigation" as const, completion: 50 },
  { number: "18", acreage: "1.05acre", activity: "harvesting" as const, completion: 45 },
  { number: "17", acreage: "1.3acre", activity: "harvesting" as const, completion: 60 },
  { number: "08-irrigation", numberDisplay: "08", acreage: "1.35acre", activity: "irrigation" as const, completion: 60 },
  { number: "19", acreage: "2.45acre", activity: "ploughing" as const, completion: 15 },
  { number: "20B", acreage: "1.84acre", activity: "fertilizing" as const, completion: 65 },
  { number: "14", acreage: "1.65acre", activity: "ploughing" as const, completion: 25 },
  { number: "13", acreage: "2.50acre", activity: "fertilizing" as const, completion: 70 },
  { number: "07", acreage: "1.28acre", activity: "pest-control" as const, completion: 85 },
  { number: "06", acreage: "1.54acre", activity: "planting" as const, completion: 0 },
  { number: "20A", acreage: "1.89acre", activity: "pest-control" as const, completion: 85 },
  { number: "19A", acreage: "1.86acre", activity: "planting" as const, completion: 25 },
  { number: "15", acreage: "2.63acre", activity: "harvesting" as const, completion: 35 },
  { number: "16", acreage: "2.28acre", activity: "irrigation" as const, completion: 55 },
  { number: "03", acreage: "1.11acre", activity: "planting" as const, completion: 30 },
  { number: "04", acreage: "1.21acre", activity: "planting" as const, completion: 0 },
  { number: "22", acreage: "1.90acre", activity: "planting" as const, completion: 40 },
  { number: "09", acreage: "1.64acre", activity: "irrigation" as const, completion: 35 },
  { number: "10", acreage: "1.43acre", activity: "ploughing" as const, completion: 20 },
  { number: "07A", acreage: "2.57acre", activity: "pest-control" as const, completion: 60 },
  { number: "01", acreage: "0.65acre", activity: "fertilizing" as const, completion: 75 },
  { number: "02", acreage: "0.74acre", activity: "harvesting" as const, completion: 90 },
  { number: "08-planting", numberDisplay: "08", acreage: "1.35acre", activity: "planting" as const, completion: 0 },
];
const activities: Record<string, { icon: LucideIcon; colorClass: string; colorHex: string; name: string }> = {
  harvesting: { name: "Harvesting", icon: Wheat, colorClass: "bg-amber-500", colorHex: "#f59e0b" },
  irrigation: { name: "Irrigation", icon: Droplets, colorClass: "bg-blue-500", colorHex: "#3b82f6" },
  ploughing: { name: "Ploughing", icon: Tractor, colorClass: "bg-orange-500", colorHex: "#f9716" },
  planting: { name: "Planting", icon: Sprout, colorClass: "bg-green-500", colorHex: "#22c55e" },
  fertilizing: { name: "Fertilizing", icon: FlaskConical, colorClass: "bg-purple-500", colorHex: "#a855f7" },
  "pest-control": { name: "Pest Control", icon: Bug, colorClass: "bg-red-500", colorHex: "#ef4444" },
};
const plotMap = new Map(plots.map(plot => [plot.number, plot]));
const plotLayout = [
  "21B", "18", "17", "08-irrigation", "21A", "14", "13", "07", "19", "EMPTY", "EMPTY", "06",
  "20B", "15", "16", "03", "20A", "09", "10", "04", "19A", "22", "07A", "01",
  "EMPTY", "08-planting", "DAIRY", "DAIRY", "EMPTY", "EMPTY", "DAIRY", "DAIRY", "EMPTY", "EMPTY", "02", "EMPTY",
];
// ------------------------------

const FieldMonitoring = () => {
  return (
    // Removed the outer Tabs component and related elements
    <div className="min-h-screen bg-background p-6">
      {/* Header for the Interactive Map */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AMRIT DAIRY FARM MAP</h1>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="font-semibold">TOTAL AREA:</span> 44 Acre</p>
            <p><span className="font-semibold">PLOT AREA:</span> 40.80 Acre</p>
            <p><span className="font-semibold">ROAD AREA:</span> 3.20 Acre</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="bg-green-500 text-white px-4 py-2">Real-time Monitoring</Badge>
          <p className="text-sm text-muted-foreground">AgriScale Management System</p>
        </div>
      </div>

      {/* Interactive Map Layout */}
      <div className="flex gap-6">
        {/* Activity Status Legend */}
        <Card className="p-4 h-fit sticky top-6 hidden lg:block">
          <h3 className="font-bold text-foreground mb-4">Activity Status</h3>
          <div className="space-y-3">
            {Object.values(activities).map((activity) => (
              <div key={activity.name} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${activity.colorClass}`} />
                <span className="text-sm text-foreground">{activity.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Main Road */}
        <div className="relative flex gap-6 flex-1">
          <div className="w-24 bg-blue-200 rounded-lg flex items-center justify-center sticky top-6 h-[calc(100vh-14rem)] hidden md:flex">
            <div className="writing-mode-vertical text-foreground font-bold text-xl tracking-wider transform rotate-180">
              MAIN ROAD
            </div>
          </div>

          {/* Plots Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
            {plotLayout.map((plotKey, index) => {
              if (plotKey === "EMPTY") return <div key={`empty-${index}`} />;
              if (plotKey === "DAIRY") {
                if (plotLayout.indexOf("DAIRY") === index) {
                  return (
                    <div key="dairy" className="col-span-2 row-span-2 bg-amber-100 border-2 border-amber-400 rounded-lg p-6 flex flex-col items-center justify-center min-h-[220px]">
                      <h2 className="text-2xl font-bold text-foreground mb-2">DAIRY LAND</h2>
                      <p className="text-muted-foreground">Processing & Storage</p>
                      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                        <span>N</span> <span>E</span> <span>S</span> <span>W</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }

              const plot = plotMap.get(plotKey);
              if (!plot) return <div key={`missing-${plotKey}`}>Missing {plotKey}</div>;

              const activityDetails = activities[plot.activity] || {
                icon: Sprout, colorClass: "bg-gray-500", colorHex: "#6b7280",
              };

              return (
                <PlotCard
                  key={plotKey}
                  plotNumber={plot.numberDisplay || plot.number}
                  acreage={plot.acreage}
                  activity={plot.activity}
                  completion={plot.completion}
                  colorClass={activityDetails.colorClass}
                  colorHex={activityDetails.colorHex}
                  Icon={activityDetails.icon}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldMonitoring;

