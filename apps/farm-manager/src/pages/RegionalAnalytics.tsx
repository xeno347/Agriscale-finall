import React from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils"; // Make sure to import cn (or similar utility)

// --- MOCK DATA ---
const regionalData = [
  {
    zone: "North Zone",
    manager: "Rajesh Kumar",
    yieldProgress: 78,
    budgetUtilization: 76,
    fields: 25,
    area: 500,
    alerts: 3,
  },
  {
    zone: "South Zone",
    manager: "Priya Sharma",
    yieldProgress: 82,
    budgetUtilization: 75,
    fields: 30,
    area: 750,
    alerts: 5,
  },
  {
    zone: "West Zone",
    manager: "Amit Patel",
    yieldProgress: 85,
    budgetUtilization: 73,
    fields: 20,
    area: 400,
    alerts: 1,
  },
  {
    zone: "East Zone",
    manager: "Sunita Devi",
    yieldProgress: 70,
    budgetUtilization: 60,
    fields: 18,
    area: 350,
    alerts: 7,
  },
];

// --- LOCAL COMPONENTS ---

// Helper for Progress Bars
const ProgressBarItem = ({ label, value, colorClass }: { label: string, value: number, colorClass?: string }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}%</span>
    </div>
    {/* This applies the color to the progress bar's inner div.
      '[&>div]:bg-green-600' applies to the green bar.
      Default (no class) uses the primary blue.
    */}
    <Progress 
      value={value} 
      className={cn("h-2", colorClass)} 
    />
  </div>
);

// Stat Item Helper
const StatItem = ({ label, value, unit, valueClass }: { label: string, value: string | number, unit?: string, valueClass?: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-2xl font-bold", valueClass)}>
      {value}
      {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
    </p>
  </div>
);

// Main Card Component for the grid
const RegionalAnalyticsCard = ({ data }: { data: (typeof regionalData)[0] }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{data.zone} Analytics</CardTitle>
        <p className="text-sm text-muted-foreground">Managed by {data.manager}</p>
      </CardHeader>
      <CardContent>
        {/* Progress Bars */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          <ProgressBarItem 
            label="Yield Progress" 
            value={data.yieldProgress} 
            colorClass="[&>div]:bg-green-600" // Tailwind trick to color the inner bar
          />
          <ProgressBarItem 
            label="Budget Utilization" 
            value={data.budgetUtilization} 
            // No colorClass = default blue
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 pt-4 border-t">
          <StatItem label="Fields" value={data.fields} />
          <StatItem label="Area" value={data.area} unit="acres" />
          <StatItem label="Alerts" value={data.alerts} valueClass="text-destructive" />
        </div>
      </CardContent>
    </Card>
  );
};


// --- MAIN PAGE COMPONENT ---

const RegionalAnalytics = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="Regional Analytics"
        description="Manage field managers and regional operations across all zones"
      />
      
      <h2 className="text-2xl font-semibold mb-4">Regional Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {regionalData.map((region) => (
          <RegionalAnalyticsCard key={region.zone} data={region} />
        ))}
      </div>
    </PageLayout>
  );
};

export default RegionalAnalytics;