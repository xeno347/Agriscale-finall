import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Crop,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  LineChart,
  CalendarCheck,
  Loader2,
  AlertOctagon,
  Plus,
  Leaf,
  Droplet,
  Bug,
  ClipboardCheck,
  Thermometer,
  CloudRain,
  Droplets,
  Zap,
  Download,
  FileText,
  PieChart
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Reusable Stat Card (for top rows)
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColorClass?: string;
}
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: StatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className="p-3 bg-secondary rounded-lg">
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

// 2. Crop Timeline Card (for Tab 1)
interface CropTimelineCardProps {
  title: string;
  subtitle: string;
  status: 'on-track' | 'at-risk';
  stage: 'vegetative' | 'fruiting' | 'flowering' | 'maturity';
  sowingDate: string;
  expectedHarvest: string;
  area: string;
  expectedYield: string;
  stageProgress: number;
  healthScore: number;
  seedBatch: string;
}
const CropTimelineCard = (props: CropTimelineCardProps) => {
  const statusColors = {
    'on-track': 'text-green-600',
    'at-risk': 'text-red-600',
  };
  const stageColors = {
    'vegetative': 'text-green-600',
    'fruiting': 'text-orange-600',
    'flowering': 'text-blue-600',
    'maturity': 'text-purple-600',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{props.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{props.subtitle}</p>
          </div>
          <Badge variant={props.status === 'on-track' ? 'success' : 'destructive'}>
            {props.status}
          </Badge>
        </div>
        <p className={`text-sm font-medium capitalize ${stageColors[props.stage]}`}>{props.stage}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Sowing Date</p>
            <p className="font-medium">{props.sowingDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected Harvest</p>
            <p className="font-medium">{props.expectedHarvest}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Area</p>
            <p className="font-medium">{props.area}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected Yield</p>
            <p className="font-medium">{props.expectedYield}</p>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Stage Progress</span>
            <span>{props.stageProgress}%</span>
          </div>
          <Progress value={props.stageProgress} className="h-2" />
        </div>
        
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Health Score</span>
            <span>{props.healthScore}%</span>
          </div>
          <Progress value={props.healthScore} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">Seed Batch: {props.seedBatch}</p>
          <Button variant="link" className="p-0 h-auto">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 3. Intervention Card (for Tab 2)
interface InterventionCardProps {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  location: string;
  description: string;
  status: 'pending' | 'completed' | 'in-progress';
  scheduled: string;
  assignedTo: string;
  completed?: string;
  resources: string[];
  notes?: string;
}
const InterventionCard = (props: InterventionCardProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${props.iconBg}`}>
            <props.icon className={`w-5 h-5 ${props.iconColor}`} />
          </div>
          <div>
            <CardTitle className="text-lg">{props.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{props.location}</p>
          </div>
        </div>
        <Badge variant={
          props.status === 'completed' ? 'success' :
          props.status === 'in-progress' ? 'warning' : 'default'
        }>
          {props.status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">{props.description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="font-medium">{props.scheduled}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Assigned To</p>
          <p className="font-medium">{props.assignedTo}</p>
        </div>
        {props.completed && (
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="font-medium">{props.completed}</p>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-xs text-muted-foreground mb-1">Required Resources</p>
        <div className="flex flex-wrap gap-2">
          {props.resources.map(res => <Badge key={res} variant="secondary">{res}</Badge>)}
        </div>
      </div>
      
      {props.notes && (
        <p className="text-sm text-muted-foreground mt-4 border-t pt-3">
          <span className="font-medium">Notes:</span> {props.notes}
        </p>
      )}

      <div className="flex items-center justify-between mt-4 border-t pt-4">
        <Button variant="link" className="p-0 h-auto">Edit Schedule</Button>
        {props.status === 'pending' && <Button>Mark In-Progress</Button>}
        {props.status === 'in-progress' && <Button>Mark Completed</Button>}
      </div>
    </CardContent>
  </Card>
);

// 4. Batch Card (for Tab 3)
interface BatchCardProps {
  batchId: string;
  cropName: string;
  grade: string;
  sowingDate: string;
  harvestDate: string;
  totalArea: string;
  totalYield: string;
  fields: string[];
  certifications: string[];
  growingConditions: { avgTemp: string; rainfall: string; irrigation: string; fertilizer: string };
  seedSource: string;
  storage: string;
  marketValue: string;
  buyer: string;
}
const BatchCard = (props: BatchCardProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{props.batchId}</CardTitle>
          <p className="text-sm text-muted-foreground">{props.cropName}</p>
        </div>
        <Badge variant="success" className="text-base px-3 py-1">
          Grade {props.grade}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      {/* Top Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 border-b pb-4">
        <div>
          <p className="text-xs text-muted-foreground">Sowing Date</p>
          <p className="font-medium">{props.sowingDate}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Harvest Date</p>
          <p className="font-medium">{props.harvestDate}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Area</p>
          <p className="font-medium">{props.totalArea}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Yield</p>
          <p className="font-medium">{props.totalYield}</p>
        </div>
      </div>

      {/* Mid Row Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Fields Involved</p>
          <div className="flex flex-wrap gap-2">
            {props.fields.map(f => <Badge key={f} variant="outline">{f}</Badge>)}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Certifications</p>
          <div className="flex flex-wrap gap-2">
            {props.certifications.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
          </div>
        </div>
      </div>

      {/* Growing Conditions */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Growing Conditions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Temp</p>
              <p className="font-medium">{props.growingConditions.avgTemp}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Rainfall</p>
              <p className="font-medium">{props.growingConditions.rainfall}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Irrigation</p>
              <p className="font-medium">{props.growingConditions.irrigation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fertilizer</p>
              <p className="font-medium">{props.growingConditions.fertilizer}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
        <div>
          <p className="text-xs text-muted-foreground">Seed Source</p>
          <p className="font-medium">{props.seedSource}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Storage Location</p>
          <p className="font-medium">{props.storage}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Market Value</p>
          <p className="font-medium">{props.marketValue}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Buyer</p>
          <p className="font-medium">{props.buyer}</p>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-6 border-t pt-4">
        <Button variant="ghost" className="gap-2">
          <FileText className="w-4 h-4" /> Quality Report
        </Button>
        <Button variant="ghost" className="gap-2">
          <Download className="w-4 h-4" /> Export Details
        </Button>
      </div>
    </CardContent>
  </Card>
);


// --- MOCK DATA ---

// Tab 1: Crop Timeline
const cropTimelineStats = [
  { title: "Active Cycles", value: "4", icon: Crop, iconColorClass: "text-green-600" },
  { title: "On Track", value: "3", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "At Risk", value: "1", icon: AlertTriangle, iconColorClass: "text-warning" },
  { title: "Avg Health Score", value: "86%", icon: LineChart, iconColorClass: "text-blue-600" },
];
const cropTimelineData: CropTimelineCardProps[] = [
  { title: "Wheat - HD-3086 (Pusa Gautami)", subtitle: "Plot A1", status: "on-track", stage: "vegetative", sowingDate: "15/10/2024", expectedHarvest: "20/3/2025", area: "25 hectares", expectedYield: "112.5 tons", stageProgress: 45, healthScore: 92, seedBatch: "WH-2024-001" },
  { title: "Cotton - Bt Cotton (RCH-2)", subtitle: "Plot B2", status: "on-track", stage: "fruiting", sowingDate: "20/5/2024", expectedHarvest: "15/11/2024", area: "30 hectares", expectedYield: "45 tons", stageProgress: 75, healthScore: 88, seedBatch: "CT-2024-012" },
  { title: "Rice - Basmati 1121", subtitle: "Plot C1", status: "at-risk", stage: "maturity", sowingDate: "10/6/2024", expectedHarvest: "25/10/2024", area: "40 hectares", expectedYield: "200 tons", stageProgress: 95, healthScore: 75, seedBatch: "RC-2024-005" },
  { title: "Sugarcane - CoLk 94184", subtitle: "Plot D1", status: "on-track", stage: "vegetative", sowingDate: "15/2/2024", expectedHarvest: "10/2/2025", area: "50 hectares", expectedYield: "3500 tons", stageProgress: 60, healthScore: 90, seedBatch: "SG-2024-008" },
];

// Tab 2: Stage Interventions
const interventionStats = [
  { title: "Scheduled", value: "2", icon: CalendarCheck, iconColorClass: "text-blue-600" },
  { title: "In Progress", value: "1", icon: Loader2, iconColorClass: "text-yellow-600" },
  { title: "Completed", value: "1", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "Urgent Today", value: "2", icon: AlertOctagon, iconColorClass: "text-destructive" },
];
const interventionData: InterventionCardProps[] = [
  { title: "Fertilization", icon: Leaf, iconBg: "bg-green-100", iconColor: "text-green-600", location: "North Zone - Plot A1 • Vegetative Stage", description: "Apply Nitrogen fertilizer (Urea) - 50 kg/hectare", status: "pending", scheduled: "10/11/2024", assignedTo: "Rajesh Kumar", resources: ["Urea - 1250 kg", "Spreader equipment"] },
  { title: "Irrigation", icon: Droplet, iconBg: "bg-blue-100", iconColor: "text-blue-600", location: "North Zone - Plot A1 • Vegetative Stage", description: "Flood irrigation for 4 hours", status: "completed", scheduled: "8/11/2024", assignedTo: "Vijay Singh", completed: "8/11/2024", resources: [], notes: "Completed successfully, soil moisture optimal." },
  { title: "Pesticide", icon: Bug, iconBg: "bg-orange-100", iconColor: "text-orange-600", location: "South Zone - Plot B2 • Fruiting Stage", description: "Apply bollworm control spray", status: "in-progress", scheduled: "9/11/2024", assignedTo: "Sunita Devi", resources: ["Pesticide spray", "Spraying equipment", "PPE kits"] },
  { title: "Inspection", icon: ClipboardCheck, iconBg: "bg-purple-100", iconColor: "text-purple-600", location: "West Zone - Plot C1 • Maturity Stage", description: "Check grain moisture content for harvest readiness", status: "pending", scheduled: "7/11/2024", assignedTo: "Priya Sharma (Agronomist)", resources: ["Moisture meter"] },
];

// Tab 3: Batch Tracking
const batchData: BatchCardProps[] = [
  { batchId: "#WH-2023-045", cropName: "PBW-343", grade: "A+", sowingDate: "20/10/2023", harvestDate: "15/3/2024", totalArea: "50 hectares", totalYield: "225 tons", fields: ["North Zone - Plot A1", "North Zone - Plot A2"], certifications: ["Organic Certified", "Good Agricultural Practices (GAP)"], growingConditions: { avgTemp: "18-25°C", rainfall: "245 mm", irrigation: "450 mm", fertilizer: "125 kg/ha" }, seedSource: "Punjab Agricultural University", storage: "Cold Storage Unit 1", marketValue: "₹56.25 L", buyer: "Delhi Flour Mills Ltd." },
  { batchId: "#RC-2023-021", cropName: "1509", grade: "A+", sowingDate: "15/6/2023", harvestDate: "20/10/2023", totalArea: "80 hectares", totalYield: "380 tons", fields: ["West Zone - Plot C1", "West Zone - Plot C2"], certifications: ["Export Quality", "Geographical Indication (GI) Tag"], growingConditions: { avgTemp: "28-32°C", rainfall: "890 mm", irrigation: "850 mm", fertilizer: "180 kg/ha" }, seedSource: "IARI New Delhi", storage: "Warehouse B - Climate Controlled", marketValue: "₹1.90 Cr", buyer: "Export to Middle East - (Al-Khaleej Trading)" },
];


// --- MAIN PAGE COMPONENT ---

const CropCycleMonitoring = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="Crop Cycle Monitoring"
        description="Manage field managers and regional operations across all zones"
      />
      
      <Tabs defaultValue="crop-timeline">
        <TabsList className="mb-4">
          <TabsTrigger value="crop-timeline">Crop Timeline</TabsTrigger>
          <TabsTrigger value="stage-interventions">Stage Interventions</TabsTrigger>
          <TabsTrigger value="batch-tracking">Batch Tracking</TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: CROP TIMELINE            */}
        {/* =================================== */}
        <TabsContent value="crop-timeline" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cropTimelineStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cropTimelineData.map((data) => <CropTimelineCard key={data.title} {...data} />)}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: STAGE INTERVENTIONS      */}
        {/* =================================== */}
        <TabsContent value="stage-interventions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Stage-Based Interventions</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schedule Intervention
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {interventionStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <div className="space-y-4">
            {interventionData.map((data) => <InterventionCard key={data.title} {...data} />)}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: BATCH TRACKING           */}
        {/* =================================== */}
        <TabsContent value="batch-tracking" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Historical Batch Tracking</h2>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
          <div className="space-y-4">
            {batchData.map((data) => <BatchCard key={data.batchId} {...data} />)}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default CropCycleMonitoring;