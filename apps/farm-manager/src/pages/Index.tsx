import { PageLayout } from "@/components/dashboard/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RegionalCard } from "@/components/dashboard/RegionalCard";
import { TaskTimeline } from "@/components/dashboard/TaskTimeline"; // <-- 1. IMPORT new component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, TrendingUp, Wallet } from "lucide-react";
// ActivityItem and its icons are no longer needed

const Index = () => {
  return (
    <PageLayout>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Farm Manager Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage field managers and regional operations across all zones
            </p>
          </div>

          {/* Stats Grid (Remains the same) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Field Managers"
              value="4"
              subtitle="3 active"
              icon={Users}
            />
            <StatCard
              title="Total Fields Managed"
              value="93"
              subtitle="Across 4 zones"
              icon={MapPin}
            />
            <StatCard
              title="Total Area"
              value="2000"
              subtitle="acres"
              icon={TrendingUp}
            />
            <StatCard
              title="Total Budget"
              value="₹2.00 Cr"
              subtitle="72% utilized"
              icon={Wallet}
            />
          </div>

          {/* 2. UPDATED LAYOUT: Timeline is now lg:col-span-2 (main) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Column: Daily Task Timeline */}
            <div className="lg:col-span-2">
              <TaskTimeline />
            </div>

            {/* Side Column: Regional Performance */}
            <div>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Regional Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RegionalCard
                    zone="North Zone"
                    manager="Rajesh Kumar"
                    crops="Wheat"
                    acres={500}
                    yieldPercentage={78}
                    alerts={3}
                  />
                  <RegionalCard
                    zone="South Zone"
                    manager="Priya Sharma"
                    crops="Rice"
                    acres={750}
                    yieldPercentage={82}
                    alerts={5}
                  />
                  <RegionalCard
                    zone="West Zone"
                    manager="Amit Patel"
                    crops="Cotton"
                    acres={400}
                    yieldPercentage={85}
                    alerts={1}
                  />
                  <RegionalCard
                    zone="East Zone"
                    manager="Sunita Reddy"
                    crops="Sugarcane"
                    acres={350}
                    yieldPercentage={70}
                    alerts={7}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Developed and made by <span className="font-semibold">Zenithra Company</span>
      </div>
    </PageLayout>
  );
};

export default Index;