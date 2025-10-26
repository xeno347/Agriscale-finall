import { StatsCard } from "@/components/StatsCard";
import { FarmPlotGrid } from "@/components/FarmPlotGrid";
import { ActivityFeed } from "@/components/ActivityFeed";
import { InventoryStatus } from "@/components/InventoryStatus";
import { Users, Sprout, Package, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Plots"
          value="6"
          icon={Sprout}
          trend="+2 this month"
          trendUp={true}
        />
        <StatsCard
          title="Supervisors"
          value="6"
          icon={Users}
          trend="All active"
          trendUp={true}
        />
        <StatsCard
          title="Inventory Items"
          value="1,127"
          icon={Package}
          trend="-15% usage"
          trendUp={false}
        />
        <StatsCard
          title="Production"
          value="2.4T"
          icon={TrendingUp}
          trend="+12% this week"
          trendUp={true}
        />
      </div>

      {/* Farm Plots */}
      <FarmPlotGrid />

      {/* Activity and Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed />
        <InventoryStatus />
      </div>
    </div>
  );
};

export default Index;
