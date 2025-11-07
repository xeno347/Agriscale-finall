import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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

// 1. Reusable Stat Card (for top rows)
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColorClass?: string;
  bgColorClass?: string;
}
const StatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground", bgColorClass = "bg-secondary" }: StatCardProps) => (
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
interface VehicleCardProps {
  name: string;
  plate: string;
  icon: React.ElementType;
  status: 'active' | 'maintenance';
  driver: string;
  mileage: number;
  fuel: number;
  route: string[];
  nextMaintenance: string;
}
const VehicleCard = ({ name, plate, icon: Icon, status, driver, mileage, fuel, route, nextMaintenance }: VehicleCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-lg">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{name}</CardTitle>
            <p className="text-sm text-muted-foreground">{plate}</p>
          </div>
        </div>
        <Badge variant={status === 'active' ? 'success' : 'warning'}>
          {status}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Driver</p>
          <p className="font-medium">{driver}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mileage</p>
          <p className="font-medium">{mileage.toLocaleString()} km</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Fuel Level</p>
        <Progress value={fuel} className="h-2" />
        <p className="text-xs text-muted-foreground text-right mt-1">{fuel}%</p>
      </div>

      <div className="space-y-2 border-t pt-4">
        {route.map((point, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">{point}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Next Maintenance: {nextMaintenance}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 border-t pt-4">
        <Button variant="outline" className="w-1/2">Track Live</Button>
        <Button variant="outline" className="w-1/2">View Details</Button>
      </div>
    </CardContent>
  </Card>
);

// 3. Optimization Card (for Route Optimization tab)
interface OptimizationCardProps {
  name: string;
  efficiency: string;
  currentRoute: string;
  currentDist: string;
  optimRoute: string;
  optimDist: string;
  distSaved: string;
  fuelSaved: string;
  timeSaved: string;
  costSaved: string;
}
const OptimizationCard = (props: OptimizationCardProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">{props.name}</CardTitle>
        <Badge variant="success" className="bg-green-100 text-green-700">{props.efficiency}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Route Optimization Analysis</p>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-6 p-4 rounded-lg bg-secondary">
        {/* Current Route */}
        <div>
          <p className="text-sm font-medium text-destructive mb-1">Current Route</p>
          <p className="text-sm text-muted-foreground">{props.currentRoute}</p>
          <p className="text-lg font-bold mt-2">{props.currentDist}</p>
          <p className="text-xs text-muted-foreground">Distance</p>
        </div>
        {/* Optimized Route */}
        <div>
          <p className="text-sm font-medium text-green-600 mb-1">Optimized Route</p>
          <p className="text-sm text-muted-foreground">{props.optimRoute}</p>
          <p className="text-lg font-bold mt-2">{props.optimDist}</p>
          <p className="text-xs text-muted-foreground">Distance</p>
        </div>
      </div>

      {/* Savings */}
      <div className="grid grid-cols-4 gap-4 py-4 border-b">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Distance Saved</p>
          <p className="text-xl font-bold text-blue-600">{props.distSaved}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Fuel Saved</p>
          <p className="text-xl font-bold text-blue-600">{props.fuelSaved}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Time Saved</p>
          <p className="text-xl font-bold text-blue-600">{props.timeSaved}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Cost Savings</p>
          <p className="text-xl font-bold text-blue-600">{props.costSaved}</p>
        </div>
      </div>
      <Button className="w-full mt-4">Apply Optimized Route</Button>
    </CardContent>
  </Card>
);


// --- MOCK DATA ---

// Tab 1: Fleet
const fleetStats = [
  { title: "Total Fleet", value: "4", icon: TruckIcon },
  { title: "Active Vehicles", value: "3", icon: CheckCircle, iconColorClass: "text-success" },
  { title: "Avg Fuel Level", value: "63%", icon: Fuel, iconColorClass: "text-yellow-600" },
  { title: "In Maintenance", value: "1", icon: Settings, iconColorClass: "text-warning" },
];

const vehicleData: VehicleCardProps[] = [
  { name: "Transport Truck 1", plate: "HR-01-AB-1234", icon: Truck, status: "active", driver: "Ramesh Kumar", mileage: 45000, fuel: 75, route: ["En route to Delhi Market", "Farm → Delhi Mandi"], nextMaintenance: "15/11/2024" },
  { name: "Tractor Unit 3", plate: "PB-12-CD-5678", icon: Tractor, status: "active", driver: "Sukhdev Singh", mileage: 32000, fuel: 60, route: ["North Zone - Plot A", "North Zone Field Operation"], nextMaintenance: "20/11/2024" },
  { name: "Pickup Truck 2", plate: "UP-32-EF-9012", icon: Truck, status: "active", driver: "Vijay Sharma", mileage: 28000, fuel: 85, route: ["Supply Depot", "Supply Runs"], nextMaintenance: "25/11/2024" },
  { name: "Harvester Transport", plate: "RJ-14-GH-3456", icon: Truck, status: "maintenance", driver: "Amit Patel", mileage: 52000, fuel: 30, route: ["Service Center"], nextMaintenance: "5/11/2024" },
];

// Tab 2: Delivery
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

// Tab 3: Optimization
const optimizationStats = [
  { title: "Total Savings", value: "₹3K", icon: Wallet, iconColorClass: "text-green-600", bgColorClass: "bg-green-100" },
  { title: "Fuel Saved", value: "15.5 L", icon: Fuel, iconColorClass: "text-blue-600", bgColorClass: "bg-blue-100" },
  { title: "Time Saved", value: "65 min", icon: Timer, iconColorClass: "text-yellow-600", bgColorClass: "bg-yellow-100" },
];

const optimizationData: OptimizationCardProps[] = [
  { name: "Transport Truck 1", efficiency: "22% more efficient", currentRoute: "Farm → NH-1 → Delhi (via Panipat)", currentDist: "185 km", optimRoute: "Farm → Bypass Road → Delhi (direct)", optimDist: "145 km", distSaved: "40 km", fuelSaved: "12 L", timeSaved: "45 min", costSaved: "₹2K" },
  { name: "Tractor Unit 3", efficiency: "21% more efficient", currentRoute: "Plot A1 → A2 → A3 → B1 → Storage", currentDist: "28 km", optimRoute: "Plot A1 → B1 → A2 → A3 → Storage", optimDist: "22 km", distSaved: "6 km", fuelSaved: "3.5 L", timeSaved: "20 min", costSaved: "₹700" },
];


// --- MAIN PAGE COMPONENT ---

const LogisticsManagement = () => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {fleetStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vehicleData.map((vehicle) => <VehicleCard key={vehicle.name} {...vehicle} />)}
          </div>
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
            <Button className="gap-2 w-full md:w-auto">
              <Plus className="w-4 h-4" />
              Schedule Delivery
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deliveryStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant={row.type === 'outbound' ? 'outline' : 'secondary'}>{row.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{row.product}</p>
                      <p className="text-xs text-muted-foreground">{row.qty}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{row.route.split('→')[0]} <ArrowRight className="w-3 h-3 inline" /> {row.route.split('→')[1]}</p>
                    </TableCell>
                    <TableCell>{row.driver}</TableCell>
                    <TableCell>
                      <p className="text-sm">{row.schedule.split(' ')[0]}</p>
                      <p className="text-xs text-muted-foreground">{row.schedule.split(' ')[1]}</p>
                    </TableCell>
                    <TableCell>{row.value}</TableCell>
                    <TableCell>
                      <Badge variant={
                        row.status === 'delivered' ? 'success' :
                        row.status === 'in-transit' ? 'warning' : 'default'
                      }>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: ROUTE OPTIMIZATION       */}
        {/* =================================== */}
        <TabsContent value="route-optimization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {optimizationStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </div>
          <div className="space-y-6">
            {optimizationData.map((data) => <OptimizationCard key={data.name} {...data} />)}
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default LogisticsManagement;