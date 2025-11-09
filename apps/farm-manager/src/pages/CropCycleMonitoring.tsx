import React, { useState } from 'react'; // <-- 1. IMPORT useState
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"; // <-- 2. IMPORT Dialog components
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

// 1. Reusable Stat Card
// ... (Component code remains the same) ...
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: any) => (
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
// ... (Component code remains the same) ...
const CropTimelineCard = (props: any) => {
  // ...
  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* ... Card Content ... */}
    </Card>
  );
};

// 3. Intervention Card (for Tab 2)
// ... (Component code remains the same) ...
const InterventionCard = (props: any) => (
  <Card>
    {/* ... Card Content ... */}
  </Card>
);

// 4. Batch Card (for Tab 3)
// ... (Component code remains the same) ...
const BatchCard = (props: any) => (
  <Card>
    {/* ... Card Content ... */}
  </Card>
);


// --- MOCK DATA ---
// ... (cropTimelineStats, cropTimelineData, interventionStats, interventionData, batchData) ...
const cropTimelineStats = [
  { title: "Active Cycles", value: "4", icon: Crop, iconColorClass: "text-green-600" },
  { title: "On Track", value: "3", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "At Risk", value: "1", icon: AlertTriangle, iconColorClass: "text-warning" },
  { title: "Avg Health Score", value: "86%", icon: LineChart, iconColorClass: "text-blue-600" },
];
const cropTimelineData = [
  { title: "Wheat - HD-3086 (Pusa Gautami)", subtitle: "Plot A1", status: "on-track", stage: "vegetative", sowingDate: "15/10/2024", expectedHarvest: "20/3/2025", area: "25 hectares", expectedYield: "112.5 tons", stageProgress: 45, healthScore: 92, seedBatch: "WH-2024-001" },
  { title: "Cotton - Bt Cotton (RCH-2)", subtitle: "Plot B2", status: "on-track", stage: "fruiting", sowingDate: "20/5/2024", expectedHarvest: "15/11/2024", area: "30 hectares", expectedYield: "45 tons", stageProgress: 75, healthScore: 88, seedBatch: "CT-2024-012" },
  { title: "Rice - Basmati 1121", subtitle: "Plot C1", status: "at-risk", stage: "maturity", sowingDate: "10/6/2024", expectedHarvest: "25/10/2024", area: "40 hectares", expectedYield: "200 tons", stageProgress: 95, healthScore: 75, seedBatch: "RC-2024-005" },
  { title: "Sugarcane - CoLk 94184", subtitle: "Plot D1", status: "on-track", stage: "vegetative", sowingDate: "15/2/2024", expectedHarvest: "10/2/2025", area: "50 hectares", expectedYield: "3500 tons", stageProgress: 60, healthScore: 90, seedBatch: "SG-2024-008" },
];

const interventionStats = [
  { title: "Scheduled", value: "2", icon: CalendarCheck, iconColorClass: "text-blue-600" },
  { title: "In Progress", value: "1", icon: Loader2, iconColorClass: "text-yellow-600" },
  { title: "Completed", value: "1", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "Urgent Today", value: "2", icon: AlertOctagon, iconColorClass: "text-destructive" },
];
const interventionData = [
  { title: "Fertilization", icon: Leaf, iconBg: "bg-green-100", iconColor: "text-green-600", location: "North Zone - Plot A1 • Vegetative Stage", description: "Apply Nitrogen fertilizer (Urea) - 50 kg/hectare", status: "pending", scheduled: "10/11/2024", assignedTo: "Rajesh Kumar", resources: ["Urea - 1250 kg", "Spreader equipment"] },
  { title: "Irrigation", icon: Droplet, iconBg: "bg-blue-100", iconColor: "text-blue-600", location: "North Zone - Plot A1 • Vegetative Stage", description: "Flood irrigation for 4 hours", status: "completed", scheduled: "8/11/2024", assignedTo: "Vijay Singh", completed: "8/11/2024", resources: [], notes: "Completed successfully, soil moisture optimal." },
  { title: "Pesticide", icon: Bug, iconBg: "bg-orange-100", iconColor: "text-orange-600", location: "South Zone - Plot B2 • Fruiting Stage", description: "Apply bollworm control spray", status: "in-progress", scheduled: "9/11/2024", assignedTo: "Sunita Devi", resources: ["Pesticide spray", "Spraying equipment", "PPE kits"] },
  { title: "Inspection", icon: ClipboardCheck, iconBg: "bg-purple-100", iconColor: "text-purple-600", location: "West Zone - Plot C1 • Maturity Stage", description: "Check grain moisture content for harvest readiness", status: "pending", scheduled: "7/11/2024", assignedTo: "Priya Sharma (Agronomist)", resources: ["Moisture meter"] },
];

const batchData = [
  { batchId: "#WH-2023-045", cropName: "PBW-343", grade: "A+", sowingDate: "20/10/2023", harvestDate: "15/3/2024", totalArea: "50 hectares", totalYield: "225 tons", fields: ["North Zone - Plot A1", "North Zone - Plot A2"], certifications: ["Organic Certified", "Good Agricultural Practices (GAP)"], growingConditions: { avgTemp: "18-25°C", rainfall: "245 mm", irrigation: "450 mm", fertilizer: "125 kg/ha" }, seedSource: "Punjab Agricultural University", storage: "Cold Storage Unit 1", marketValue: "₹56.25 L", buyer: "Delhi Flour Mills Ltd." },
  { batchId: "#RC-2023-021", cropName: "1509", grade: "A+", sowingDate: "15/6/2023", harvestDate: "20/10/2023", totalArea: "80 hectares", totalYield: "380 tons", fields: ["West Zone - Plot C1", "West Zone - Plot C2"], certifications: ["Export Quality", "Geographical Indication (GI) Tag"], growingConditions: { avgTemp: "28-32°C", rainfall: "890 mm", irrigation: "850 mm", fertilizer: "180 kg/ha" }, seedSource: "IARI New Delhi", storage: "Warehouse B - Climate Controlled", marketValue: "₹1.90 Cr", buyer: "Export to Middle East - (Al-Khaleej Trading)" },
];


// --- MAIN PAGE COMPONENT ---

const CropCycleMonitoring = () => {
  // 3. ADD STATE for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          {/* ... (Existing Crop Timeline Content) ... */}
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: STAGE INTERVENTIONS      */}
        {/* =================================== */}
        <TabsContent value="stage-interventions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Stage-Based Interventions</h2>
            {/* 4. ADD onClick HANDLER to the button */}
            <Button 
              className="gap-2"
              onClick={() => setIsModalOpen(true)}
            >
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
          {/* ... (Existing Batch Tracking Content) ... */}
        </TabsContent>
      </Tabs>

      {/* 5. ADD THE DIALOG COMPONENT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Intervention</DialogTitle>
            <DialogDescription>
              Schedule a new intervention (e.g., fertilization, irrigation) for a crop cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>A form to schedule an intervention would go here.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
};

export default CropCycleMonitoring;