import { useState } from "react";
import {
  Package,
  PlusCircle,
  MoreHorizontal,
  Search,
  AlertCircle,
  Boxes,
  Edit,
  Trash2,
  PackagePlus,
} from "lucide-react";
import MetricCard from "../components/MetricCard.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data based on your dashboard
const initialInventoryItems = [
  {
    id: "1",
    item: "Nitrogen Fertilizer",
    category: "Fertilizers",
    stock: 85,
    unit: "kg",
    status: "In Stock",
    lastRestocked: "2023-10-20",
  },
  {
    id: "2",
    item: "Phosphate",
    category: "Fertilizers",
    stock: 42,
    unit: "kg",
    status: "In Stock",
    lastRestocked: "2023-10-18",
  },
  {
    id: "3",
    item: "Seeds - Wheat",
    category: "Seeds",
    stock: 15,
    unit: "kg",
    status: "Low Stock",
    lastRestocked: "2023-10-05",
  },
  {
    id: "4",
    item: "Pesticide A",
    category: "Pesticides",
    stock: 67,
    unit: "L",
    status: "In Stock",
    lastRestocked: "2023-10-15",
  },
  {
    id: "5",
    item: "Tractor Oil",
    category: "Equipment",
    stock: 5,
    unit: "L",
    status: "Low Stock",
    lastRestocked: "2023-09-30",
  },
  {
    id: "6",
    item: "Herbicide B",
    category: "Pesticides",
    stock: 0,
    unit: "L",
    status: "Out of Stock",
    lastRestocked: "2023-09-15",
  },
];

// Helper function to determine badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case "In Stock":
      return "default";
    case "Low Stock":
      return "secondary";
    case "Out of Stock":
      return "destructive";
    default:
      return "outline";
  }
};

const Inventory = () => {
  const [items, setItems] = useState(initialInventoryItems);
  const [filter, setFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const lowStockItems = items.filter(
    (item) => item.status === "Low Stock" || item.status === "Out of Stock"
  ).length;

  const filteredItems = items.filter((item) =>
    item.item.toLowerCase().includes(filter.toLowerCase()) ||
    item.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage your farm's inventory.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Item Types"
              value={items.length.toString()}
              icon={Boxes}
            />
            <MetricCard
              title="Items Low on Stock"
              value={lowStockItems.toString()}
              icon={AlertCircle}
              variant={lowStockItems > 0 ? "warning" : "default"}
            />
          </div>
        </section>

        {/* Inventory Table */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Stock Overview</CardTitle>
              <CardDescription>
                A complete list of all items in your inventory.
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by item or category..."
                  className="pl-9"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              {/* Add New Item Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>
                      Fill in the details for the new stock item.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="item-name" className="text-right">
                        Item Name
                      </Label>
                      <Input id="item-name" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category" className="text-right">
                        Category
                      </Label>
                      <Select>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                          <SelectItem value="Seeds">Seeds</SelectItem>
                          <SelectItem value="Pesticides">Pesticides</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="stock" className="text-right">
                        Stock
                      </Label>
                      <Input id="stock" type="number" className="col-span-2" />
                      <Select>
                        <SelectTrigger className="col-span-1">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="units">units</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={() => setIsDialogOpen(false)}>Save Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.item}</div>
                      <div className="text-sm text-muted-foreground">{item.category}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.stock} {item.unit}
                    </TableCell>
                    <TableCell>{item.lastRestocked}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <PackagePlus className="mr-2 h-4 w-4" /> Restock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItems.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                No items found for "{filter}".
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Inventory;

