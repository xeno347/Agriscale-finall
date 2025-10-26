import { InventoryStatus } from "@/components/InventoryStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const recentTransactions = [
  { id: "1", item: "Seeds", type: "out", quantity: "50 kg", date: "2024-01-15", plot: "Plot 2" },
  { id: "2", item: "Fertilizer", type: "in", quantity: "100 kg", date: "2024-01-14", plot: "-" },
  { id: "3", item: "Tools", type: "out", quantity: "5 units", date: "2024-01-13", plot: "Plot 1" },
  { id: "4", item: "Equipment", type: "in", quantity: "2 units", date: "2024-01-12", plot: "-" },
];

const Inventory = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track supplies and resources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryStatus />
        
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.item}</TableCell>
                    <TableCell>
                      <Badge 
                        className={transaction.type === "in" ? "bg-success text-white" : "bg-info text-white"}
                      >
                        {transaction.type === "in" ? "In" : "Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{transaction.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;
