import React, { useState } from 'react';
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"; // <-- IMPORT Dialog
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus,
  Download,
  Search,
  Package,
  AlertTriangle,
  PackageX,
  IndianRupee,
  Star,
  Mail,
  Phone,
  User,
  LineChart,
  TrendingUp,
  Wrench,
  Bug,
  UserCheck,
} from "lucide-react";
// Import the dialog we created
import { AddInventoryItemDialog } from "@/components/dashboard/AddInventoryItemDialog";

// --- LOCAL COMPONENTS (for this page only) ---

// 1. Stat Card for Inventory Tab
// ... (Component code remains the same) ...
const InventoryStatCard = ({ title, value, icon: Icon, iconColorClass }: any) => (
  <Card>
    {/* ... Card Content ... */}
  </Card>
);

// 2. Supplier Card for Suppliers Tab
// ... (Component code remains the same) ...
const SupplierCard = ({ name, contactPerson, status, phone, email, categories, rating, paymentTerms }: any) => (
  <Card className="hover:shadow-md transition-shadow">
    {/* ... Card Content ... */}
  </Card>
);

// 3. Purchase Order Card for PO Tab
// ... (Component code remains the same) ...
const PurchaseOrderCard = (props: any) => {
    // ...
};

// 4. Stat Card for Resource Allocations Tab
// ... (Component code remains the same) ...
const AllocationStatCard = ({ title, value, icon: Icon, iconColorClass = "text-muted-foreground" }: any) => (
  <Card>
    {/* ... Card Content ... */}
  </Card>
);

// 5. Request Card for Resource Requests Tab
// ... (Component code remains the same) ...
const RequestCard = (props: any) => {
  // ...
  return (
    <Card>
      {/* ... Card Content ... */}
    </Card>
  );
};


// --- MOCK DATA ---
// ... (inventoryStatData, inventoryItemsData, purchaseOrdersData, suppliersData, resourceStats, requestData) ...
const inventoryStatData = [
  { title: "Total Items", value: "6", icon: Package, iconColorClass: "text-muted-foreground" },
  { title: "Low Stock Alerts", value: "3", icon: AlertTriangle, iconColorClass: "text-yellow-500" },
  { title: "Out of Stock", value: "1", icon: PackageX, iconColorClass: "text-destructive" },
  { title: "Total Value", value: "₹18.41 L", icon: IndianRupee, iconColorClass: "text-green-600" },
];
const inventoryItemsData = [/* ... */];
const purchaseOrdersData = [/* ... */];
const suppliersData = [/* ... */];
const resourceStats = [
  { title: "Active Allocations", value: "3", icon: LineChart, iconColorClass: "text-blue-600" },
  { title: "Total Budget", value: "₹28.50 L", icon: IndianRupee, iconColorClass: "text-green-600" },
  { title: "Budget Utilized", value: "86%", icon: TrendingUp, iconColorClass: "text-yellow-600" },
  { title: "Pending Requests", value: "1", icon: AlertTriangle, iconColorClass: "text-destructive" },
];
const requestData = [
  { title: "Combine Harvester", icon: Wrench, requestedBy: "Rajesh Kumar", zone: "North Zone", priority: "high", status: "pending", quantity: 1, unit: "unit", purpose: "Wheat harvesting", justification: "Current harvester under maintenance, urgent replacement needed", requiredDate: "5/10/2024", estCost: "₹3K", requestDate: "1/10/2024" },
  { title: "Pesticide - Chlorpyrifos", icon: Bug, requestedBy: "Priya Sharma", zone: "South Zone", priority: "emergency", status: "approved", quantity: 50, unit: "litres", purpose: "Pest outbreak control", justification: "Severe pest attack detected, immediate intervention required", requiredDate: "3/10/2024", estCost: "₹43K", requestDate: "2/10/2024", approvalNote: "Approved by Farm Manager on 2/10/2024" },
  { title: "Skilled Technicians", icon: UserCheck, requestedBy: "Amit Patel", zone: "West Zone", priority: "medium", status: "fulfilled", quantity: 5, unit: "workers", purpose: "Drip irrigation system installation", justification: "New field expansion requires irrigation setup", requiredDate: "7/10/2024", estCost: "₹15K", requestDate: "30/9/2024" },
];


// --- MAIN PAGE COMPONENT ---

const InventoryManagement = () => {
  // ADD STATE for all the new modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isNewAllocationModalOpen, setIsNewAllocationModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  return (
    <PageLayout>
      <PageHeader 
        title="Resource & Inventory Management"
        description="Manage inventory, suppliers, and resource allocations"
      />
      
      <Tabs defaultValue="inventory">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="allocations">Resource Allocations</TabsTrigger>
          <TabsTrigger value="requests">Resource Requests</TabsTrigger>
        </TabsList>

        {/* =================================== */}
        {/* TAB 1: INVENTORY (Existing)     */}
        {/* =================================== */}
        <TabsContent value="inventory" className="space-y-6">
          {/* ... (Stat Cards) ... */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* ... (Search and Select) ... */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Select>
                {/* ... */}
              </Select>
              {/* UPDATED: Renamed state */}
              <Button className="gap-2 w-full md:w-auto" onClick={() => setIsAddItemModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
          {/* ... (Inventory Table) ... */}
        </TabsContent>

        {/* =================================== */}
        {/* TAB 2: PURCHASE ORDERS (Existing) */}
        {/* =================================== */}
        <TabsContent value="purchase-orders" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Purchase Orders</h2>
            {/* ADD onClick */}
            <Button className="gap-2" onClick={() => setIsNewOrderModalOpen(true)}>
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </div>
          <div className="space-y-4">
            {purchaseOrdersData.map((po) => (
              <PurchaseOrderCard key={po.poNumber} {...po} />
            ))}
          </div>
        </TabsContent>

        {/* =================================== */}
        {/* TAB 3: SUPPLIERS (Existing)     */}
        {/* =================================== */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Suppliers</h2>
            {/* ADD onClick */}
            <Button className="gap-2" onClick={() => setIsAddSupplierModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliersData.map((supplier) => (
              <SupplierCard key={supplier.name} {...supplier} />
            ))}
          </div>
        </TabsContent>
        
        {/* =================================== */}
        {/* TAB 4: RESOURCE ALLOCATIONS (NEW) */}
        {/* =================================== */}
        <TabsContent value="allocations" className="space-y-6">
          {/* ... (Stat Cards) ... */}
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* ... (Search and Select) ... */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select>
                  {/* ... */}
                </Select>
                {/* ADD onClick */}
                <Button className="gap-2 w-full md:w-auto" onClick={() => setIsNewAllocationModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  New Allocation
                </Button>
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              A table or list of all active resource allocations (e.g., "Tractor 1 to North Zone") would go here.
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* =================================== */}
        {/* TAB 5: RESOURCE REQUESTS (NEW)  */}
        {/* =================================== */}
        <TabsContent value="requests" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Resource Requests</h2>
            {/* ADD onClick */}
            <Button className="gap-2" onClick={() => setIsNewRequestModalOpen(true)}>
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          </div>
          <div className="space-y-4">
            {requestData.map((data) => <RequestCard key={data.title} {...data} />)}
          </div>
        </TabsContent>
        
      </Tabs>
      
      {/* --- ALL DIALOGS --- */}
      
      {/* 1. Add Item Dialog (from previous step) */}
      <AddInventoryItemDialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen} />
      
      {/* 2. New Order Dialog (Placeholder) */}
      <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to create a new purchase order would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>Cancel</Button>
            <Button>Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 3. Add Supplier Dialog (Placeholder) */}
      <Dialog open={isAddSupplierModalOpen} onOpenChange={setIsAddSupplierModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to add a new supplier would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSupplierModalOpen(false)}>Cancel</Button>
            <Button>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 4. New Allocation Dialog (Placeholder) */}
      <Dialog open={isNewAllocationModalOpen} onOpenChange={setIsNewAllocationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resource Allocation</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to create a new resource allocation would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewAllocationModalOpen(false)}>Cancel</Button>
            <Button>Allocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 5. New Request Dialog (Placeholder) */}
      <Dialog open={isNewRequestModalOpen} onOpenChange={setIsNewRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit New Resource Request</DialogTitle>
          </DialogHeader>
          <div className="py-4"><p>A form to submit a new resource request would go here.</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestModalOpen(false)}>Cancel</Button>
            <Button>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </PageLayout>
  );
};

export default InventoryManagement;