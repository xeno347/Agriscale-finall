import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ---------------------------------------------
// AUTO SR NUMBER GENERATOR
// ---------------------------------------------
const generateSR = (prefix: string, index: number) =>
  `${prefix}-${String(index + 1).padStart(3, "0")}`;

// ---------------------------------------------
// MAIN PAGE
// ---------------------------------------------
export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("inventory");

  // DATA STATES ---------------------------------------------------
  const [inventory, setInventory] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  // DIALOG STATES --------------------------------------------------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteData, setDeleteData] = useState<any>(null);

  // TEMP FORM FIELDS ----------------------------------------------
  const [form, setForm] = useState<any>({});

  const resetForm = () => {
    setForm({});
    setEditData(null);
  };

  // OPEN ADD FORM -------------------------------------------------
  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // OPEN EDIT FORM ------------------------------------------------
  const openEditDialog = (row: any) => {
    setEditData(row);
    setForm(row);
    setDialogOpen(true);
  };

  // OPEN DELETE CONFIRMATION --------------------------------------
  const openDeleteDialog = (row: any) => {
    setDeleteData(row);
  };

  // SAVE FORM ------------------------------------------------------
  const saveForm = () => {
    let listSetter: any;
    let list: any[] = [];

    if (activeTab === "inventory") {
      listSetter = setInventory;
      list = inventory;
    } else if (activeTab === "purchase") {
      listSetter = setPurchaseOrders;
      list = purchaseOrders;
    } else if (activeTab === "suppliers") {
      listSetter = setSuppliers;
      list = suppliers;
    } else if (activeTab === "allocation") {
      listSetter = setAllocations;
      list = allocations;
    } else if (activeTab === "requests") {
      listSetter = setRequests;
      list = requests;
    }

    // UPDATE
    if (editData) {
      listSetter(list.map((i) => (i.sr === editData.sr ? form : i)));
    } else {
      const prefix =
        activeTab === "inventory"
          ? "IN"
          : activeTab === "purchase"
          ? "PO"
          : activeTab === "suppliers"
          ? "SUP"
          : activeTab === "allocation"
          ? "AL"
          : "REQ";

      const newSR = generateSR(prefix, list.length);

      listSetter([...list, { ...form, sr: newSR }]);
    }

    setDialogOpen(false);
    resetForm();
  };

  // DELETE ROW ------------------------------------------------------
  const deleteRow = () => {
    if (!deleteData) return;

    if (activeTab === "inventory") {
      setInventory(inventory.filter((i) => i.sr !== deleteData.sr));
    } else if (activeTab === "purchase") {
      setPurchaseOrders(purchaseOrders.filter((i) => i.sr !== deleteData.sr));
    } else if (activeTab === "suppliers") {
      setSuppliers(suppliers.filter((i) => i.sr !== deleteData.sr));
    } else if (activeTab === "allocation") {
      setAllocations(allocations.filter((i) => i.sr !== deleteData.sr));
    } else if (activeTab === "requests") {
      setRequests(requests.filter((i) => i.sr !== deleteData.sr));
    }

    setDeleteData(null);
  };

  // ---------------------------------------------
  // UI FORM FIELDS (SHARED ACROSS ALL MODULES)
  // ---------------------------------------------
  const renderFormFields = () => (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div>
        <Label>Name / Title</Label>
        <Input
          value={form.name || ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Enter name"
        />
      </div>

      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          value={form.quantity || ""}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          placeholder="0"
        />
      </div>

      <div>
        <Label>Category</Label>
        <Select
          onValueChange={(v) => setForm({ ...form, category: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={form.category || "Select category"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Seeds">Seeds</SelectItem>
            <SelectItem value="Fertilizer">Fertilizer</SelectItem>
            <SelectItem value="Pesticide">Pesticide</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Supplier</Label>
        <Input
          value={form.supplier || ""}
          onChange={(e) => setForm({ ...form, supplier: e.target.value })}
        />
      </div>

      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={form.date || ""}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </div>

      <div>
        <Label>Time</Label>
        <Input
          type="time"
          value={form.time || ""}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
        />
      </div>

      <div className="col-span-2">
        <Label>Description</Label>
        <Textarea
          value={form.description || ""}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          placeholder="Write description..."
        />
      </div>
    </div>
  );

  // ---------------------------------------------
  // TABLE TEMPLATE
  // ---------------------------------------------
  const renderTable = (data: any[]) => (
    <table className="w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">SR</th>
          <th className="p-2 border">Name</th>
          <th className="p-2 border">Qty</th>
          <th className="p-2 border">Category</th>
          <th className="p-2 border">Supplier</th>
          <th className="p-2 border">Date</th>
          <th className="p-2 border">Time</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.map((i) => (
          <tr key={i.sr}>
            <td className="p-2 border">{i.sr}</td>
            <td className="p-2 border">{i.name}</td>
            <td className="p-2 border">{i.quantity}</td>
            <td className="p-2 border">{i.category}</td>
            <td className="p-2 border">{i.supplier}</td>
            <td className="p-2 border">{i.date}</td>
            <td className="p-2 border">{i.time}</td>
            <td className="p-2 border flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditDialog(i)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openDeleteDialog(i)}
              >
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------
  return (
    <PageLayout>
      {/* Page title */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Inventory Management</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Button className="mb-4" onClick={openAddDialog}>
            + Add Inventory
          </Button>
          {renderTable(inventory)}
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="purchase">
          <Button className="mb-4" onClick={openAddDialog}>
            + Add Purchase Order
          </Button>
          {renderTable(purchaseOrders)}
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <Button className="mb-4" onClick={openAddDialog}>
            + Add Supplier
          </Button>
          {renderTable(suppliers)}
        </TabsContent>

        {/* Allocation */}
        <TabsContent value="allocation">
          <Button className="mb-4" onClick={openAddDialog}>
            + New Allocation
          </Button>
          {renderTable(allocations)}
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests">
          <Button className="mb-4" onClick={openAddDialog}>
            + New Request
          </Button>
          {renderTable(requests)}
        </TabsContent>
      </Tabs>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editData ? "Edit Entry" : "Add New"}
            </DialogTitle>
          </DialogHeader>

          {renderFormFields()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveForm}>
              {editData ? "Save Changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== DELETE MODAL ===================== */}
      <Dialog open={!!deleteData} onOpenChange={setDeleteData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
          </DialogHeader>

          <p>Are you sure you want to delete {deleteData?.name}?</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteData(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteRow}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
