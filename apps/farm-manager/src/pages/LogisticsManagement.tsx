"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";

// Fix leaflet icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ---------- Types ---------- */
type DeliveryStatus = "scheduled" | "in-transit" | "delivered";

type Delivery = {
  id: string;
  product: string;
  qty: string;
  driver: string;
  schedule: string;
  value: string;
  status: DeliveryStatus;
  route: [number, number][];
  notes?: string;
};

/* ---------- Mock Data ---------- */
const initialDeliveries: Delivery[] = [
  {
    id: "d-1",
    product: "Wheat Grain",
    qty: "5,000 kg",
    driver: "Ramesh Kumar",
    schedule: "2025-11-07T06:00",
    value: "₹1.75 L",
    status: "in-transit",
    route: [
      [28.7041, 77.1025],
      [28.882, 76.1],
      [29.0, 76.5],
    ],
    notes: "Keep temperature stable.",
  },
  {
    id: "d-2",
    product: "Fertilizer (Urea)",
    qty: "2,000 kg",
    driver: "Vijay Sharma",
    schedule: "2025-11-07T09:00",
    value: "₹48K",
    status: "scheduled",
    route: [
      [28.7041, 77.1025],
      [28.6, 77.0],
    ],
    notes: "",
  },
  {
    id: "d-3",
    product: "Fresh Vegetables",
    qty: "800 kg",
    driver: "Ravi Yadav",
    schedule: "2025-11-07T04:00",
    value: "₹32K",
    status: "delivered",
    route: [
      [28.7041, 77.1025],
      [28.7, 77.12],
    ],
    notes: "",
  },
];

function centerForRoute(route: [number, number][]) {
  const lat = route.reduce((s, p) => s + p[0], 0) / route.length;
  const lng = route.reduce((s, p) => s + p[1], 0) / route.length;
  return [lat, lng] as [number, number];
}

function FlyToRoute({ latlng }: { latlng: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (latlng) map.flyTo(latlng, 10, { duration: 0.8 });
  }, [latlng]);
  return null;
}

/* --------------------------------------------------
   FIXED FUNCTION — ALWAYS RETURNS [number,number][]
---------------------------------------------------- */
function parseRouteText(text: string): [number, number][] {
  return text
    .split(/[\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      if (parts.length !== 2) return null;

      const lat = Number(parts[0].trim());
      const lng = Number(parts[1].trim());

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return [lat, lng] as [number, number];
    })
    .filter((x): x is [number, number] => Array.isArray(x));
}

function routeToText(route: [number, number][]) {
  return route.map((r) => `${r[0]}, ${r[1]}`).join("\n");
}

/* ---------- Component ---------- */
export default function LogisticsManagement() {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(
    null
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOptimizeDialogOpen, setIsOptimizeDialogOpen] = useState(false);

  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);

  const [form, setForm] = useState({
    product: "",
    qty: "",
    driver: "",
    schedule: "",
    value: "",
    status: "scheduled" as DeliveryStatus,
    routeText: "",
    notes: "",
  });

  const selectedDelivery =
    deliveries.find((d) => d.id === selectedDeliveryId) || null;

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedDelivery) return centerForRoute(selectedDelivery.route);
    return centerForRoute(deliveries[0].route);
  }, [selectedDelivery]);

  /* ---------- CRUD ---------- */
  function handleOpenAdd() {
    setForm({
      product: "",
      qty: "",
      driver: "",
      schedule: "",
      value: "",
      status: "scheduled",
      routeText: "",
      notes: "",
    });
    setIsAddDialogOpen(true);
  }

  function handleAddDelivery() {
    const newDelivery: Delivery = {
      id: `d-${Date.now()}`,
      product: form.product,
      qty: form.qty,
      driver: form.driver,
      schedule: form.schedule,
      value: form.value,
      status: form.status,
      route: parseRouteText(form.routeText),
      notes: form.notes,
    };
    setDeliveries([newDelivery, ...deliveries]);
    setIsAddDialogOpen(false);
  }

  function handleOpenEdit(d: Delivery) {
    setEditingDelivery(d);
    setForm({
      product: d.product,
      qty: d.qty,
      driver: d.driver,
      schedule: d.schedule,
      value: d.value,
      status: d.status,
      routeText: routeToText(d.route),
      notes: d.notes || "",
    });
    setIsEditDialogOpen(true);
  }

  function handleSaveEdit() {
    if (!editingDelivery) return;

    setDeliveries((prev) =>
      prev.map((p) =>
        p.id === editingDelivery.id
          ? {
              ...p,
              product: form.product,
              qty: form.qty,
              driver: form.driver,
              schedule: form.schedule,
              value: form.value,
              status: form.status,
              route: parseRouteText(form.routeText),
              notes: form.notes,
            }
          : p
      )
    );

    setIsEditDialogOpen(false);
    setEditingDelivery(null);
  }

  function handleDelete(id: string) {
    if (confirm("Delete this delivery?")) {
      setDeliveries((prev) => prev.filter((d) => d.id !== id));
    }
  }

  function openOptimizerFor(id: string) {
    setSelectedDeliveryId(id);
    setIsOptimizeDialogOpen(true);
  }

  function handleOptimizeRoute(id: string) {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, route: [...d.route].reverse() } : d
      )
    );
    setIsOptimizeDialogOpen(false);
  }

  /* ---------- UI ---------- */
  return (
    <PageLayout>
      <PageHeader
        title="Logistics Management"
        description="Fleet, deliveries and live tracking"
      />

      {/* ALL TABS */}
      <Tabs defaultValue="fleet-management">
        <TabsList className="mb-4">
          <TabsTrigger value="fleet-management">Fleet Management</TabsTrigger>
          <TabsTrigger value="delivery-scheduling">
            Delivery Scheduling
          </TabsTrigger>
          <TabsTrigger value="route-optimization">
            Route Optimization
          </TabsTrigger>
        </TabsList>

        {/* ======================================================
            FLEET MANAGEMENT TAB
        ======================================================= */}
        <TabsContent value="fleet-management" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Fleet</div>
                <div className="text-2xl font-bold">4</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Active Vehicles
                </div>
                <div className="text-2xl font-bold">3</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  Avg Fuel Level
                </div>
                <div className="text-2xl font-bold">63%</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">
                  In Maintenance
                </div>
                <div className="text-2xl font-bold">1</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fleet Overview</CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Fuel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {[
                    {
                      name: "Truck A",
                      driver: "Ramesh Kumar",
                      plate: "DL 01 AB 1234",
                      fuel: 78,
                      status: "active",
                    },
                    {
                      name: "Truck B",
                      driver: "Vijay Sharma",
                      plate: "HR 26 XY 9876",
                      fuel: 55,
                      status: "active",
                    },
                    {
                      name: "Van C",
                      driver: "Suresh Mehta",
                      plate: "UP 14 GH 4432",
                      fuel: 38,
                      status: "inactive",
                    },
                    {
                      name: "Mini Loader D",
                      driver: "Ravi Yadav",
                      plate: "PB 10 KL 1111",
                      fuel: 82,
                      status: "active",
                    },
                  ].map((v) => (
                    <TableRow key={v.plate}>
                      <TableCell>{v.name}</TableCell>
                      <TableCell>{v.driver}</TableCell>
                      <TableCell>{v.plate}</TableCell>
                      <TableCell>{v.fuel}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            v.status === "active" ? "success" : "destructive"
                          }
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================
            DELIVERY SCHEDULING TAB
        ======================================================= */}
        <TabsContent value="delivery-scheduling" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Input placeholder="Search deliveries..." className="max-w-xs" />
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add Delivery
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Deliveries</CardTitle>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.id}</TableCell>
                      <TableCell>{d.product}</TableCell>
                      <TableCell>{d.qty}</TableCell>
                      <TableCell>{d.driver}</TableCell>
                      <TableCell>
                        {new Date(d.schedule).toLocaleString()}
                      </TableCell>
                      <TableCell>{d.value}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "delivered"
                              ? "secondary"
                              : d.status === "in-transit"
                              ? "success"
                              : "outline"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(d)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openOptimizerFor(d.id)}
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(d.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================
            ROUTE OPTIMIZATION TAB
        ======================================================= */}
        <TabsContent value="route-optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Route Optimization — Map View</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div style={{ height: 420, width: "100%" }}>
                <MapContainer
                  center={mapCenter}
                  zoom={9}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {deliveries.map((d) => (
                    <React.Fragment key={d.id}>
                      <Polyline positions={d.route} />
                      {d.route.map((pt, idx) => (
                        <Marker key={idx} position={pt}>
                          <Popup>
                            <strong>{d.product}</strong>
                            <div>{d.driver}</div>
                            <div>{d.id}</div>
                          </Popup>
                        </Marker>
                      ))}
                    </React.Fragment>
                  ))}

                  <FlyToRoute
                    latlng={
                      selectedDelivery
                        ? centerForRoute(selectedDelivery.route)
                        : null
                    }
                  />
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Selected Delivery</CardTitle>
              </CardHeader>

              <CardContent>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedDeliveryId ?? ""}
                  onChange={(e) =>
                    setSelectedDeliveryId(e.target.value || null)
                  }
                >
                  <option value="">— Select —</option>
                  {deliveries.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} — {d.product}
                    </option>
                  ))}
                </select>

                <Button
                  className="w-full mt-3"
                  onClick={() => {
                    if (!selectedDeliveryId)
                      return alert("Select a delivery first");
                    openOptimizerFor(selectedDeliveryId);
                  }}
                >
                  Optimize Route
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Route Info</CardTitle>
              </CardHeader>

              <CardContent>
                {selectedDelivery ? (
                  <>
                    <p>
                      <strong>{selectedDelivery.product}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDelivery.driver}
                    </p>
                    <Textarea
                      readOnly
                      rows={6}
                      value={routeToText(selectedDelivery.route)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a delivery to view details.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>

              <CardContent>
                <Button className="w-full" onClick={handleOpenAdd}>
                  Create Delivery
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================
          ADD DELIVERY MODAL
      ======================================================= */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Delivery</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Product"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
            <Input
              placeholder="Quantity"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />
            <Input
              placeholder="Driver"
              value={form.driver}
              onChange={(e) => setForm({ ...form, driver: e.target.value })}
            />
            <Input
              placeholder="Schedule"
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            />
            <Input
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />

            <Textarea
              rows={4}
              placeholder="lat,lng"
              value={form.routeText}
              onChange={(e) => setForm({ ...form, routeText: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDelivery}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================
          EDIT DELIVERY MODAL
      ======================================================= */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              placeholder="Product"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
            <Input
              placeholder="Quantity"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />
            <Input
              placeholder="Driver"
              value={form.driver}
              onChange={(e) => setForm({ ...form, driver: e.target.value })}
            />
            <Input
              placeholder="Schedule"
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            />
            <Input
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />

            <Textarea
              rows={4}
              value={form.routeText}
              onChange={(e) => setForm({ ...form, routeText: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingDelivery(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================
          OPTIMIZE ROUTE MODAL
      ======================================================= */}
      <Dialog
        open={isOptimizeDialogOpen}
        onOpenChange={setIsOptimizeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimize Route</DialogTitle>
            <DialogDescription>
              Reverse route (demo optimization)
            </DialogDescription>
          </DialogHeader>

          <p>
            Delivery:{" "}
            <strong>
              {selectedDelivery?.id} — {selectedDelivery?.product}
            </strong>
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOptimizeDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() =>
                selectedDeliveryId
                  ? handleOptimizeRoute(selectedDeliveryId)
                  : alert("Select a delivery")
              }
            >
              Optimize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
