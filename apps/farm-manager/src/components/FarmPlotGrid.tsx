import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plot {
  id: string;
  name: string;
  supervisor: string;
  status: "active" | "planting" | "harvesting" | "fallow";
  area: string;
}

const plots: Plot[] = [
  { id: "1", name: "Plot 1", supervisor: "John Smith", status: "active", area: "5 acres" },
  { id: "2", name: "Plot 2", supervisor: "Sarah Johnson", status: "planting", area: "3 acres" },
  { id: "3", name: "Plot 3", supervisor: "Mike Wilson", status: "harvesting", area: "4 acres" },
  { id: "4", name: "Plot 4", supervisor: "Emily Brown", status: "active", area: "6 acres" },
  { id: "5", name: "Plot 5", supervisor: "David Lee", status: "fallow", area: "2 acres" },
  { id: "6", name: "Plot 6", supervisor: "Lisa Chen", status: "active", area: "4 acres" },
];

const statusColors = {
  active: "bg-success text-white",
  planting: "bg-info text-white",
  harvesting: "bg-warning text-white",
  fallow: "bg-muted text-muted-foreground",
};

export const FarmPlotGrid = () => {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Farm Plots Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plots.map((plot) => (
            <div
              key={plot.id}
              className="p-4 border rounded-lg bg-card hover:shadow-elevated transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{plot.name}</h3>
                  <p className="text-sm text-muted-foreground">{plot.area}</p>
                </div>
                <Badge className={statusColors[plot.status]}>
                  {plot.status}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Supervisor:</p>
                <p className="font-medium text-foreground">{plot.supervisor}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
