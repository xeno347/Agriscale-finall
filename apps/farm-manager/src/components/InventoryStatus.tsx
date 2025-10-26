import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface InventoryItem {
  name: string;
  current: number;
  max: number;
  unit: string;
}

const inventory: InventoryItem[] = [
  { name: "Seeds", current: 750, max: 1000, unit: "kg" },
  { name: "Fertilizer", current: 320, max: 500, unit: "kg" },
  { name: "Tools", current: 45, max: 50, unit: "units" },
  { name: "Equipment", current: 12, max: 15, unit: "units" },
];

export const InventoryStatus = () => {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-xl">Inventory Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {inventory.map((item) => {
            const percentage = (item.current / item.max) * 100;
            const isLow = percentage < 40;
            
            return (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className={`text-sm font-medium ${isLow ? 'text-warning' : 'text-muted-foreground'}`}>
                    {item.current}/{item.max} {item.unit}
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
