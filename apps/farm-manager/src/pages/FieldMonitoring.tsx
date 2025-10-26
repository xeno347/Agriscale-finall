import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Wheat, 
  Droplets, 
  Tractor, 
  Sprout, 
  FlaskConical, 
  Bug,
  Activity 
} from "lucide-react";

interface Plot {
  id: string;
  number: string;
  area: number;
  activity: "harvesting" | "irrigation" | "ploughing" | "planting" | "fertilizing" | "pest-control";
  progress: number;
}

const plots: Plot[] = [
  { id: "21B", number: "21B", area: 2.11, activity: "harvesting", progress: 80 },
  { id: "18", number: "18", area: 1.05, activity: "harvesting", progress: 45 },
  { id: "17", number: "17", area: 1.3, activity: "harvesting", progress: 60 },
  { id: "08", number: "08", area: 1.35, activity: "irrigation", progress: 60 },
  { id: "21A", number: "21A", area: 2.3, activity: "irrigation", progress: 50 },
  { id: "14", number: "14", area: 1.65, activity: "ploughing", progress: 25 },
  { id: "13", number: "13", area: 2.5, activity: "fertilizing", progress: 70 },
  { id: "07", number: "07", area: 1.28, activity: "pest-control", progress: 85 },
  { id: "19", number: "19", area: 2.45, activity: "ploughing", progress: 15 },
  { id: "06", number: "06", area: 1.54, activity: "planting", progress: 0 },
  { id: "20B", number: "20B", area: 1.84, activity: "fertilizing", progress: 65 },
  { id: "15", number: "15", area: 2.63, activity: "harvesting", progress: 35 },
  { id: "16", number: "16", area: 2.28, activity: "irrigation", progress: 55 },
  { id: "03", number: "03", area: 1.11, activity: "planting", progress: 30 },
];

const activityConfig = {
  harvesting: {
    label: "Harvesting",
    color: "bg-[#F59E0B] border-[#F59E0B]",
    progressColor: "bg-[#F59E0B]",
    icon: Wheat,
    bgColor: "bg-[#FEF3C7]",
  },
  irrigation: {
    label: "Irrigation",
    color: "bg-[#3B82F6] border-[#3B82F6]",
    progressColor: "bg-[#3B82F6]",
    icon: Droplets,
    bgColor: "bg-[#DBEAFE]",
  },
  ploughing: {
    label: "Ploughing",
    color: "bg-[#F97316] border-[#F97316]",
    progressColor: "bg-[#F97316]",
    icon: Tractor,
    bgColor: "bg-[#FFEDD5]",
  },
  planting: {
    label: "Planting",
    color: "bg-[#22C55E] border-[#22C55E]",
    progressColor: "bg-[#22C55E]",
    icon: Sprout,
    bgColor: "bg-[#DCFCE7]",
  },
  fertilizing: {
    label: "Fertilizing",
    color: "bg-[#A855F7] border-[#A855F7]",
    progressColor: "bg-[#A855F7]",
    icon: FlaskConical,
    bgColor: "bg-[#F3E8FF]",
  },
  "pest-control": {
    label: "Pest Control",
    color: "bg-[#EF4444] border-[#EF4444]",
    progressColor: "bg-[#EF4444]",
    icon: Bug,
    bgColor: "bg-[#FEE2E2]",
  },
};

const FieldMonitoring = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Farm Map</h1>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium">TOTAL AREA: <span className="text-foreground">44 Acre</span></p>
            <p className="font-medium">PLOT AREA: <span className="text-foreground">40.80 Acre</span></p>
            <p className="font-medium">ROAD AREA: <span className="text-foreground">3.20 Acre</span></p>
          </div>
        </div>
        <Badge className="bg-success hover:bg-success text-white px-4 py-2 animate-pulse">
          <Activity className="h-4 w-4 mr-2" />
          Real-time Monitoring
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Status Legend */}
        <Card className="shadow-soft lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 text-foreground">Activity Status</h3>
            <div className="space-y-3">
              {Object.entries(activityConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${config.color}`} />
                  <span className="text-sm text-foreground">{config.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Farm Plots Grid */}
        <div className="lg:col-span-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plots.map((plot, index) => {
              const config = activityConfig[plot.activity];
              const Icon = config.icon;
              
              return (
                <Card
                  key={plot.id}
                  className={`${config.bgColor} border-2 ${config.color} shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-in overflow-hidden`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">PLOT NO. {plot.number}</h3>
                        <p className="text-sm text-muted-foreground">{plot.area}acre</p>
                        <p className="text-sm font-medium text-foreground mt-1">{config.label}</p>
                      </div>
                      <div className={`p-2 rounded-full ${config.color} animate-pulse`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="relative h-2 bg-white/50 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full ${config.progressColor} transition-all duration-1000 ease-out rounded-full`}
                          style={{ 
                            width: `${plot.progress}%`,
                            animation: 'slide-in-right 1s ease-out'
                          }}
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground text-center">
                        {plot.progress}% complete
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldMonitoring;
