import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Thermometer,
  Droplet,
  AlertTriangle,
  Tractor, // Harvesting
  Layers, // Ploughing
  Sprout, // Planting
  Bug, // Pest Control
  Leaf, // Fertilizing
  ChevronDown,
  Dot,
  MapPin
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Field Status Card (for Tab 1)
interface FieldStatusCardProps {
  title: string;
  subtitle: string;
  pestActivity: 'low' | 'medium' | 'high';
  crop: string;
  stage: string;
  healthScore: number;
  area: number;
  temp: number;
  ph: number;
  irrigation: number;
  irrigationStatus: 'scheduled' | 'active' | 'overdue';
  alerts: { type: 'warning' | 'critical', message: string }[];
}

const FieldStatusCard = ({ data }: { data: FieldStatusCardProps }) => {
  const pestBadges: Record<typeof data.pestActivity, 'success' | 'warning' | 'destructive'> = {
    'low': 'success',
    'medium': 'warning',
    'high': 'destructive',
  };
  const irrigationBadges: Record<typeof data.irrigationStatus, 'default' | 'success' | 'destructive'> = {
    'scheduled': 'default',
    'active': 'success',
    'overdue': 'destructive',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{data.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.subtitle}</p>
          </div>
          <Badge variant={pestBadges[data.pestActivity]}>{data.pestActivity} pest activity</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Crop/Area Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Crop</p>
            <p className="font-medium">{data.crop}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stage</p>
            <p className="font-medium">{data.stage}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Area</p>
            <p className="font-medium">{data.area} acres</p>
          </div>
        </div>
        
        {/* Health Score */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Health Score</span>
            <span>{data.healthScore}%</span>
          </div>
          <Progress value={data.healthScore} className="h-2" />
        </div>

        {/* Sensor Data */}
        <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Temp</p>
              <p className="font-medium">{data.temp}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" /> {/* Placeholder for pH icon */}
            <div>
              <p className="text-xs text-muted-foreground">pH</p>
              <p className="font-medium">{data.ph}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Irrigation</p>
              <p className="font-medium">{data.irrigation}%</p>
              <Badge variant={irrigationBadges[data.irrigationStatus]} className="text-xs h-4 px-1.5 py-0">
                {data.irrigationStatus}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground">Alerts</h4>
            {data.alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                <p className={alert.type === 'critical' ? 'text-destructive' : 'text-warning'}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <Button variant="link" className="p-0 h-auto">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. Map Legend (for Tab 2)
const activityLegendData = [
  { name: "Harvesting", icon: Tractor, color: "text-blue-500" },
  { name: "Irrigation", icon: Droplet, color: "text-yellow-500" },
  { name: "Ploughing", icon: Layers, color: "text-purple-500" },
  { name: "Planting", icon: Sprout, color: "text-gray-500" },
  { name: "Fertilizing", icon: Leaf, color: "text-green-500" },
  { name: "Pest Control", icon: Bug, color: "text-red-500" },
];
const MapLegend = () => (
  <div className="w-64 p-4 space-y-2 border-r">
    <h4 className="font-semibold">Activity Status</h4>
    {activityLegendData.map((item) => (
      <div key={item.name} className="flex items-center gap-2">
        <item.icon className={`w-4 h-4 ${item.color}`} />
        <span className="text-sm">{item.name}</span>
      </div>
    ))}
  </div>
);

// 3. Plot Box (for Tab 2)
interface PlotBoxProps {
  plotNumber: string;
  acreage: string;
  statusText: string;
  completion: number;
  icon: React.ElementType;
  iconColor: string;
  alert?: boolean;
}
const PlotBox = ({ plotNumber, acreage, statusText, completion, icon: Icon, iconColor, alert }: PlotBoxProps) => (
  <div className={`p-2 border ${alert ? 'border-destructive' : 'border-border'} rounded-md text-center`}>
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium">PLOT NO. {plotNumber}</span>
      {alert && <AlertTriangle className="w-4 h-4 text-destructive" />}
    </div>
    <p className="text-xs text-muted-foreground">({acreage})</p>
    <div className="flex justify-center my-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <p className="text-xs">{statusText}</p>
    <p className="text-xs font-medium">{completion}% complete</p>
  </div>
);


// --- MOCK DATA ---

// Tab 1 Data
const fieldStatusData: FieldStatusCardProps[] = [
  {
    title: "North Field A", subtitle: "Sector 1, Block A", pestActivity: 'low',
    crop: "Wheat", stage: "Germination", healthScore: 92, area: 25.5,
    temp: 24, ph: 6.8, irrigation: 65, irrigationStatus: 'scheduled',
    alerts: []
  },
  {
    title: "South Field B", subtitle: "Sector 2, Block B", pestActivity: 'medium',
    crop: "Rice", stage: "Vegetative", healthScore: 78, area: 18.3,
    temp: 26, ph: 7.2, irrigation: 78, irrigationStatus: 'active',
    alerts: [
      { type: 'warning', message: "Pest activity detected in northwest corner" }
    ]
  },
  {
    title: "East Field C", subtitle: "Sector 3, Block C", pestActivity: 'high',
    crop: "Cotton", stage: "Flowering", healthScore: 65, area: 32.1,
    temp: 28, ph: 6.5, irrigation: 42, irrigationStatus: 'overdue',
    alerts: [
      { type: 'critical', message: "Critical: Bollworm infestation detected" },
      { type: 'critical', message: "Irrigation overdue by 3 days" }
    ]
  }
];

// Tab 2 Data
const plotData: PlotBoxProps[] = [
  // A subset of plots from the image to demonstrate
  { plotNumber: "18", acreage: "1.06acre", statusText: "Harvesting", completion: 25, icon: Tractor, iconColor: "text-blue-500" },
  { plotNumber: "12", acreage: "1.04acre", statusText: "Irrigation", completion: 95, icon: Droplet, iconColor: "text-yellow-500", alert: true },
  { plotNumber: "06", acreage: "1.02acre", statusText: "Fertilizing", completion: 60, icon: Leaf, iconColor: "text-green-500" },
  { plotNumber: "10", acreage: "2.13acre", statusText: "Pest Control", completion: 50, icon: Bug, iconColor: "text-red-500", alert: true },
  { plotNumber: "17", acreage: "2.38acre", statusText: "Harvesting", completion: 45, icon: Tractor, iconColor: "text-blue-500" },
  { plotNumber: "11", acreage: "2.22acre", statusText: "Ploughing", completion: 25, icon: Layers, iconColor: "text-purple-500" },
  { plotNumber: "09", acreage: "1.28acre", statusText: "Fertilizing", completion: 85, icon: Leaf, iconColor: "text-green-500", alert: true },
  { plotNumber: "02", acreage: "1.58acre", statusText: "Planting", completion: 90, icon: Sprout, iconColor: "text-gray-500" },
];

// --- MAIN PAGE COMPONENT ---

const FieldMonitoring = () => {
  return (
    <PageLayout>
      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Field Monitoring</h1>
          <p className="text-muted-foreground">
            Manage field managers and regional operations across all zones
          </p>
        </div>
        <Button className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Add Observation
        </Button>
      </div>
      
      <Tabs defaultValue="monitoring">
        <TabsList className="mb-4">
          <TabsTrigger value="monitoring">Field Monitoring</TabsTrigger>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: FIELD MONITORING         */}
        {/* =================================== */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:w-auto md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search fields by name, crop, or location..." className="pl-9 w-full" />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Fields" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="north">North Field A</SelectItem>
                  <SelectItem value="south">South Field B</SelectItem>
                  <SelectItem value="east">East Field C</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldStatusData.map((data) => (
              <FieldStatusCard key={data.title} data={data} />
            ))}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: INTERACTIVE MAP          */}
        {/* =================================== */}
        <TabsContent value="map">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">AMRIT DAIRY FARM MAP</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    TOTAL AREA: 44 Acre • PLOT AREA: 40.80 Acre • ROAD AREA: 3.20 Acre
                  </p>
                </div>
                <Badge variant="outline">Real-time Monitoring</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex border rounded-lg">
                <MapLegend />
                <div className="flex-1 p-4 bg-secondary/30 relative">
                  {/* Map Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {plotData.map((plot) => (
                      <PlotBox key={plot.plotNumber} {...plot} />
                    ))}
                  </div>
                  
                  {/* Simple representation of other map elements */}
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 bg-gray-200 p-4 rounded text-center text-sm font-medium">
                    MAIN<br/>ROAD
                  </div>
                  <div className="absolute bottom-4 right-4 bg-yellow-100 border border-yellow-300 p-6 rounded text-center text-lg font-medium">
                    DAIRY LAND
                    <p className="text-sm">Processing & Storage</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default FieldMonitoring;