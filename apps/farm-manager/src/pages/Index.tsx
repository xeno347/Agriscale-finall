import { PageLayout } from "@/components/dashboard/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RegionalCard } from "@/components/dashboard/RegionalCard";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, TrendingUp, Wallet, CheckCircle, AlertTriangle, UserPlus, Target } from "lucide-react";

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

          {/* Stats Grid */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Regional Performance */}
            <div className="lg:col-span-2">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Regional Performance Overview
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

            {/* Recent Activities */}
            <div>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <ActivityItem
                    icon={CheckCircle}
                    title="North Zone wheat harvest completed"
                    time="2 hours ago"
                    variant="success"
                  />
                  <ActivityItem
                    icon={AlertTriangle}
                    title="East Zone requires immediate attention"
                    time="4 hours ago"
                    variant="warning"
                  />
                  <ActivityItem
                    icon={UserPlus}
                    title="New Field Manager assigned to Central Zone"
                    time="1 day ago"
                    variant="info"
                  />
                  <ActivityItem
                    icon={Target}
                    title="South Zone exceeded yield targets"
                    time="2 days ago"
                    variant="success"
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
