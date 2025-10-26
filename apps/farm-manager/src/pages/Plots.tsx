import { FarmPlotGrid } from "@/components/FarmPlotGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Plots = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Farm Plots</h1>
          <p className="text-muted-foreground">Manage and monitor all farm plots</p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Plot
        </Button>
      </div>
      
      <FarmPlotGrid />
    </div>
  );
};

export default Plots;
