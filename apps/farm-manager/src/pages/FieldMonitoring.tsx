import React, { useState } from 'react'; // <-- 1. IMPORT useState
import { PageLayout } from "@/components/dashboard/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"; // <-- 2. IMPORT Dialog components
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
// ... (Component code remains the same) ...
const FieldStatusCard = ({ data }: { data: any }) => {
  // ...
  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* ... Card Content ... */}
    </Card>
  );
};

// 2. Map Legend (for Tab 2)
// ... (Component code remains the same) ...
const MapLegend = () => (
  <div className="w-64 p-4 space-y-2 border-r">
    {/* ... Legend Content ... */}
  </div>
);

// 3. Plot Box (for Tab 2)
// ... (Component code remains the same) ...
const PlotBox = ({ plotNumber, acreage, statusText, completion, icon: Icon, iconColor, alert }: any) => (
  <div className={`p-2 border ${alert ? 'border-destructive' : 'border-border'} rounded-md text-center`}>
    {/* ... Plot Box Content ... */}
  </div>
);


// --- MOCK DATA ---
// ... (fieldStatusData and plotData remain the same) ...
const fieldStatusData = [
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

const plotData = [
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
  // 3. ADD STATE for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        {/* 4. ADD onClick HANDLER to the button */}
        <Button 
          className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto"
          onClick={() => setIsModalOpen(true)}
        >
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
          {/* ... (Existing Map Content) ... */}
        </TabsContent>
      </Tabs>

      {/* 5. ADD THE DIALOG COMPONENT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Observation</DialogTitle>
            <DialogDescription>
              Record a new observation for a field.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>A form to add a new observation would go here.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button>Save Observation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageLayout>
  );
};

export default FieldMonitoring;