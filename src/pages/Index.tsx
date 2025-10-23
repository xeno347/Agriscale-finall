import { Sprout, Clock, AlertCircle, Package, Users } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import FieldCard from "@/components/FieldCard";
import TaskCreationDialog from "@/components/TaskCreationDialog";
import AlertsList from "@/components/AlertsList";
import AnalyticsChart from "@/components/AnalyticsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const fields = [
    {
      plotName: "Plot 1 - North Field",
      status: "active" as const,
      supervisor: "John Smith",
      lastActivity: "Today, 09:30 AM",
      location: "Sector A",
      nextTask: "Fertilizer Application - Tomorrow",
    },
    {
      plotName: "Plot 2 - South Field",
      status: "harvesting" as const,
      supervisor: "Maria Garcia",
      lastActivity: "Today, 08:00 AM",
      location: "Sector B",
      nextTask: "Harvest Completion - Today",
    },
    {
      plotName: "Plot 3 - East Field",
      status: "maintenance" as const,
      supervisor: "David Chen",
      lastActivity: "Yesterday, 03:45 PM",
      location: "Sector C",
      nextTask: "Irrigation System Check",
    },
    {
      plotName: "Plot 4 - West Field",
      status: "idle" as const,
      supervisor: "Sarah Johnson",
      lastActivity: "2 days ago",
      location: "Sector D",
      nextTask: "Soil Testing - Next Week",
    },
  ];

  const supervisors = [
    { name: "John Smith", plots: 3, status: "active" },
    { name: "Maria Garcia", plots: 2, status: "active" },
    { name: "David Chen", plots: 2, status: "active" },
    { name: "Sarah Johnson", plots: 1, status: "inactive" },
  ];

  const inventory = [
    { item: "Nitrogen Fertilizer", stock: 85, unit: "kg", status: "good" },
    { item: "Phosphate", stock: 42, unit: "kg", status: "medium" },
    { item: "Seeds - Wheat", stock: 15, unit: "kg", status: "low" },
    { item: "Pesticide A", stock: 67, unit: "L", status: "good" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Farm Manager Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, Manager</p>
            </div>
            <TaskCreationDialog />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Nitrogen Levels"
              value="72%"
              icon={Sprout}
              trend={{ value: "5% from last week", isPositive: true }}
              variant="success"
            />
            <MetricCard
              title="Harvest Countdown"
              value="1000 days"
              icon={Clock}
              trend={{ value: "On schedule", isPositive: true }}
            />
            <MetricCard
              title="Total Plants"
              value="45,823"
              icon={Sprout}
              trend={{ value: "2% growth", isPositive: true }}
              variant="success"
            />
            <MetricCard
              title="Active Alerts"
              value="3"
              icon={AlertCircle}
              variant="warning"
            />
          </div>
        </section>

        {/* Field Operations */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Field Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fields.map((field, index) => (
              <FieldCard key={index} {...field} />
            ))}
          </div>
        </section>

        {/* Analytics and Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <AnalyticsChart />
          </div>
          <div>
            <AlertsList />
          </div>
        </div>

        {/* Supervisors and Inventory Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supervisors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Supervisor Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {supervisors.map((supervisor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{supervisor.name}</p>
                      <p className="text-sm text-muted-foreground">{supervisor.plots} plots assigned</p>
                    </div>
                    <Badge variant={supervisor.status === "active" ? "default" : "secondary"}>
                      {supervisor.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventory.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.item}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.stock} {item.unit} remaining
                      </p>
                    </div>
                    <Badge
                      variant={item.status === "good" ? "default" : item.status === "medium" ? "secondary" : "destructive"}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
