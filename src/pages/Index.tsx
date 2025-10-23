// Removed useState, AlertCircle, RefreshCcw, X icons
// FIX: Changed import path from alias "@/" to relative "../"
import { FieldDashboardCard } from "../components/FieldDashboardCard"; 
import { Card } from "@/components/ui/card";
import {
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Demo data for dashboard cards
const fieldDashboardData = [
  {
    title: "North Field A", sector: "Sector 1, Block A", status: "low pest activity",
    crop: "Wheat", area: "25.5 acres", stage: "Germination", healthScore: 92,
    temp: 24, ph: 6.8, humidity: 65, waterLevel: 28, waterStatus: "scheduled" as const,
    alerts: [],
  },
  {
    title: "South Field B", sector: "Sector 2, Block B", status: "medium pest activity",
    crop: "Rice", area: "18.3 acres", stage: "Vegetative", healthScore: 78,
    temp: 26, ph: 7.2, humidity: 78, waterLevel: 45, waterStatus: "active" as const,
    alerts: ["Pest activity detected in northwest corner"],
  },
  {
    title: "East Field C", sector: "Sector 3, Block C", status: "high pest activity",
    crop: "Cotton", area: "32.1 acres", stage: "Flowering", healthScore: 65,
    temp: 28, ph: 6.5, humidity: 42, waterLevel: 15, waterStatus: "overdue" as const,
    alerts: ["Critical: Bollworm infestation detected", "Irrigation overdue by 3 days"],
  },
];

const Index = () => { 
  // Removed the useState hook for showBanner

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
      
      {/* Server Unavailable banner section has been removed */}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Field Monitoring Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Real-time field data and crop monitoring</p>
        </div>
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" /> Add Observation
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search fields by name, crop, or location..." className="pl-9" />
          </div>
          <Button variant="outline">
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Filters
          </Button>
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              <SelectItem value="healthy">Healthy ( 85%)</SelectItem>
              <SelectItem value="warning">Warning ( 60%)</SelectItem>
              <SelectItem value="critical">Critical ( 60%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      
      {/* Field Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {fieldDashboardData.map((field) => (
          <FieldDashboardCard key={field.title} {...field} />
        ))}
      </div>
    </div>
  );
};

export default Index;

