import React, { useState } from 'react'; // <-- 1. IMPORT useState
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Calendar,
  Fuel,
  TrendingUp,
  User,
  Settings,
  Clock,
  CheckCircle,
  TruckIcon,
  Tractor,
  PackageCheck,
  Package,
  IndianRupee,
  Search,
  Plus,
  ArrowRight,
  Save,
  Timer,
  Wallet
} from "lucide-react";

// --- LOCAL COMPONENTS ---

// 1. Reusable Stat Card
// ... (Component code remains the same) ...
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground", bgColorClass = "bg-secondary" }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgColorClass}`}>
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);


// 2. Vehicle Card (for Fleet Management tab)
// ... (Component code remains the same) ...
const VehicleCard = ({ name, plate, icon: Icon, status, driver, mileage, fuel, route, nextMaintenance }: any) => (
  <Card className="hover:shadow-md transition-shadow">
    {/* ... Card Content ... */}
  </Card>
);

// 3. Optimization Card (for Route Optimization tab)
// ... (Component code remains the same) ...
const OptimizationCard = (props: any) => (
  <Card>
    {/* ... Card Content ... */}
  </Card>
);


// --- MOCK DATA ---
// ... (fleetStats, vehicleData, deliveryStats, deliveryData, optimizationStats, optimizationData) ...
const fleetStats = [
  { title: "Total Fleet", value: "4", icon: TruckIcon },
  { title: "Active Vehicles", value: "3", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "Avg Fuel Level", value: "63%", icon: Fuel, iconColorClass: "text-yellow-600" },
  { title: "In Maintenance", value: "1", icon: Settings, iconColorClass: "text-warning" },
];

const vehicleData = [
  { name: "Transport Truck 1", plate: "HR-01-AB-1234", icon: Truck, status: "active", driver: "Ramesh Kumar", mileage: 45000, fuel: 75, route: ["En route to Delhi Market", "Farm → Delhi Mandi"], nextMaintenance: "15/11/2024" },
  { name: "Tractor Unit 3", plate: "PB-12-CD-5678", icon: Tractor, status: "active", driver: "Sukhdev Singh", mileage: 32000, fuel: 60, route: ["North Zone - Plot A", "North Zone Field Operation"], nextMaintenance: "20/11/2024" },
  { name: "Pickup Truck 2", plate: "UP-32-EF-9012", icon: Truck, status: "active", driver: "Vijay Sharma", mileage: 28000, fuel: 85, route: ["Supply Depot", "Supply Runs"], nextMaintenance: "25/11/2024" },
  { name: "Harvester Transport", plate: "RJ-14-GH-3456", icon: Truck, status: "maintenance", driver: "Amit Patel", mileage: 52000, fuel: 30, route: ["Service Center"], nextMaintenance: "5/11/2024" },
];

const deliveryStats = [
  { title: "Total Deliveries", value: "4", icon: Package },
  { title: "In Transit", value: "1", icon: Truck, iconColorClass: "text-blue-600" },
  { title: "Delivered Today", value: "1", icon: PackageCheck, iconColorClass: "text-success" },
  { title: "Est. Value", value: "₹3.80 L", icon: IndianRupee, iconColorClass: "text-green-600" },
];

const deliveryData = [
  { id: 1, type: "outbound", product: "Wheat Grain", qty: "5,000 kg", route: "North Zone Storage → Delhi Azadpur Mandi", driver: "Ramesh Kumar", schedule: "7/11/2024 06:00 AM", value: "₹1.75 L", status: "in-transit" },
  { id: 2, type: "inbound", product: "Fertilizer (Urea)", qty: "2,000 kg", route: "IFFCO Depot, Panipat → Farm Storage", driver: "Vijay Sharma", schedule: "7/11/2024 09:00 AM", value: "₹48K", status: "scheduled" },
  { id: 3, type: "outbound", product: "Fresh Vegetables", qty: "800 kg", route: "South Zone - Plot B2 → Local Sabzi Mandi", driver: "Vijay Sharma", schedule: "7/11/2024 04:00 AM", value: "₹32K", status: "delivered" },
  { id: 4, type: "inbound", product: "Seeds (Cotton)", qty: "500 kg", route: "Seed Corporation, Ludhiana → West Zone Storage", driver: "Sukhdev Singh", schedule: "8/11/2024 10:00 AM", value: "₹1.25 L", status: "scheduled" },
];

const optimizationStats = [
  { title: "Total Savings", value: "₹3K", icon: Wallet, iconColorClass: "text-green-600", bgColorClass: "bg-green-100" },
  { title: "Fuel Saved", value: "15.5 L", icon: Fuel, iconColorClass: "text-blue-600", bgColorClass: "bg-blue-100" },
  { title: "Time Saved", value: "65 min", icon: Timer, iconColorClass: "text-yellow-600", bgColorClass: "bg-yellow-100" },
];

const optimizationData = [
  { name: "Transport Truck 1", efficiency: "22% more efficient", currentRoute: "Farm → NH-1 → Delhi (via Panipat)", currentDist: "185 km", optimRoute: "Farm → Bypass Road → Delhi (direct)", optimDist: "145 km", distSaved: "40 km", fuelSaved: "12 L", timeSaved: "45 min", costSaved: "₹2K" },
  { name: "Tractor Unit 3", efficiency: "21% more efficient", currentRoute: "Plot A1 → A2 → A3 → B1 → Storage", currentDist: "28 km", optimRoute: "Plot A1 → B1 → A2 → A3 → Storage", optimDist: "22 km", distSaved: "6 km", fuelSaved: "3.5 L", timeSaved: "20 min", costSaved: "₹700" },
];


// --- MAIN PAGE COMPONENT ---

const LogisticsManagement = () => {
  // 3. ADD STATE for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader 
        title="Logistics Management"
        description="Manage field managers and regional operations across all zones"
      />
      
      <Tabs defaultValue="fleet-management">
        <TabsList className="mb-4">
          <TabsTrigger value="fleet-management">Fleet Management</TabsTrigger>
          <TabsTrigger value="delivery-scheduling">Delivery Scheduling</TabsTrigger>
          <TabsTrigger value="route-optimization">Route Optimization</TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: FLEET MANAGEMENT         */}
        {/* =================================== */}
        <TabsContent value="fleet-management" className="space-y-6">
          {/* ... (Existing Fleet Content) ... */}
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: DELIVERY SCHEDULING      */}
        {/* =================================== */}
        <TabsContent value="delivery-scheduling" className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search deliveries..." className="pl-9 w-full md:w-64" />
            </div>
            {/* 4. ADD onClick HANDLER to the button */}
            <Button 
              className="gap-2 w-full md:w-auto"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Schedule Delivery
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deliveryStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <Card>
            {/* ... (Existing Delivery Table) ... */}
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: ROUTE OPTIMIZATION       */}
        {/* =================================== */}
        <TabsContent value="route-optimization" className="space-y-6">
          {/* ... (Existing Optimization Content) ... */}
        </TabsContent>
      </Tabs>

      {/* 5. ADD THE DIALOG COMPONENT */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Delivery</DialogTitle>
            <DialogDescription>
              Fill out the details to schedule a new inbound or outbound delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>A form to schedule a delivery would go here.</p>
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

export default LogisticsManagement;