import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Sprout, DollarSign, Users, Package } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Production"
          value="12.8T"
          icon={Sprout}
          trend="+18% vs last month"
          trendUp={true}
        />
        <StatsCard
          title="Revenue"
          value="$45.2K"
          icon={DollarSign}
          trend="+12% vs last month"
          trendUp={true}
        />
        <StatsCard
          title="Labor Cost"
          value="$18.5K"
          icon={Users}
          trend="-5% vs last month"
          trendUp={false}
        />
        <StatsCard
          title="Supply Cost"
          value="$8.3K"
          icon={Package}
          trend="+3% vs last month"
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl">Production Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { month: "January", value: 2.1, change: 5 },
                { month: "February", value: 2.4, change: 14 },
                { month: "March", value: 2.8, change: 17 },
                { month: "April", value: 2.6, change: -7 },
                { month: "May", value: 3.2, change: 23 },
              ].map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{item.month}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{item.value}T</span>
                    <div className={`flex items-center gap-1 text-sm ${item.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {item.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {Math.abs(item.change)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl">Top Performing Plots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { plot: "Plot 3", production: "2.8T", efficiency: 95 },
                { plot: "Plot 1", production: "2.5T", efficiency: 92 },
                { plot: "Plot 6", production: "2.3T", efficiency: 88 },
                { plot: "Plot 4", production: "2.1T", efficiency: 85 },
                { plot: "Plot 2", production: "1.9T", efficiency: 82 },
              ].map((item) => (
                <div key={item.plot} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.plot}</p>
                    <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-primary" 
                        style={{ width: `${item.efficiency}%` }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-sm font-semibold text-foreground">{item.production}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
