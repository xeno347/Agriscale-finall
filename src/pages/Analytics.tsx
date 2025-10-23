import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Package,
  Droplets,
  Bug,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import MetricCard from "@/components/MetricCard.tsx"; // Using aliased path

// Mock Data for Charts
const monthlyYieldData = [
  { name: "Jan", yield: 4000 },
  { name: "Feb", yield: 3000 },
  { name: "Mar", yield: 5000 },
  { name: "Apr", yield: 4500 },
  { name: "May", yield: 6000 },
  { name: "Jun", yield: 5500 },
  { name: "Jul", yield: 7000 },
  { name: "Aug", yield: 6500 },
  { name: "Sep", yield: 7500 },
  { name: "Oct", yield: 8000 },
  { name: "Nov", yield: 7200 },
  { name: "Dec", yield: 8500 },
];

const cropDistributionData = [
  { name: "Wheat", value: 450 },
  { name: "Corn", value: 300 },
  { name: "Soybeans", value: 200 },
  { name: "Other", value: 50 },
];
const CROP_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const plotHealthData = [
  { subject: "Nitrogen", A: 120, fullMark: 150 },
  { subject: "Phosphorus", A: 98, fullMark: 150 },
  { subject: "Potassium", A: 86, fullMark: 150 },
  { subject: "Moisture", A: 99, fullMark: 150 },
  { subject: "Pest Count", A: 40, fullMark: 150 }, // Lower is better
  { subject: "Soil pH", A: 130, fullMark: 150 },
];

const resourceUsageData = [
  { name: "Jan", water: 2400, fertilizer: 1400 },
  { name: "Feb", water: 2210, fertilizer: 1200 },
  { name: "Mar", water: 2290, fertilizer: 1300 },
  { name: "Apr", water: 2000, fertilizer: 1100 },
  { name: "May", water: 2181, fertilizer: 1000 },
  { name: "Jun", water: 2500, fertilizer: 1500 },
  { name: "Jul", water: 2100, fertilizer: 1600 },
];

const Analytics = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your farm's performance and resource usage.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Yield (YTD)"
              value="68,750 kg"
              icon={Package}
              trend={{ value: "+15.2% from last year", isPositive: true }}
              variant="success"
            />
            <MetricCard
              title="Water Usage"
              value="15,681 L"
              icon={Droplets}
              trend={{ value: "-2.1% from last month", isPositive: true }}
            />
            <MetricCard
              title="Avg. Plot Health"
              value="88/100"
              icon={LineChartIcon}
              trend={{ value: "Stable", isPositive: true }}
            />
            <MetricCard
              title="Pest Incidents"
              value="12"
              icon={Bug}
              trend={{ value: "+3 from last week", isPositive: false }}
              variant="warning"
            />
          </div>
        </section>

        {/* Main Yield Chart */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Yield (kg) - Last 12 Months</CardTitle>
              <CardDescription>
                Tracking total harvest output over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyYieldData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="yield" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Secondary Charts (2-col) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Resource Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={resourceUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="water"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="fertilizer"
                      stroke="#ca8a04"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Crop Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Crop Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={cropDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                      label={(entry) => `${entry.name} (${entry.value})`}
                    >
                      {cropDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CROP_COLORS[index % CROP_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Plot Health (Optional) */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Average Plot Health Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 350 }}>
                <ResponsiveContainer>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    data={plotHealthData}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis />
                    <Radar
                      name="Health"
                      dataKey="A"
                      stroke="#16a34a"
                      fill="#16a34a"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Analytics;

