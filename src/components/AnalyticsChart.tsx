import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const AnalyticsChart = () => {
  const data = [
    { month: "Jan", yield: 4200, resources: 3800 },
    { month: "Feb", yield: 3800, resources: 4200 },
    { month: "Mar", yield: 5100, resources: 3900 },
    { month: "Apr", yield: 4600, resources: 4100 },
    { month: "May", yield: 5400, resources: 3700 },
    { month: "Jun", yield: 6200, resources: 4300 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield & Resource Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Bar dataKey="yield" name="Yield (kg)" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="resources" name="Resources Used" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
