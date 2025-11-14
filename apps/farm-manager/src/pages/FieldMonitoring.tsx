"use client";

import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Thermometer,
  Droplet,
  AlertTriangle,
  Sprout,
  Map,
} from "lucide-react";
import InteractiveFarmMap from "@/components/InteractiveFarmMap";// ✅ integrated map component

// ---------- Field Status Card ----------
const FieldStatusCard = ({ data }: { data: any }) => (
  <Card className="hover:shadow-md transition-all">
    <CardHeader>
      <CardTitle className="flex justify-between items-center">
        <span>{data.title}</span>
        <Badge
          variant={
            data.healthScore >= 85
              ? "success"
              : data.healthScore >= 70
              ? "warning"
              : "destructive"
          }
        >
          {data.healthScore}%
        </Badge>
      </CardTitle>
      <p className="text-sm text-muted-foreground">{data.subtitle}</p>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Sprout className="w-4 h-4 text-green-600" />
        <span>{data.crop}</span> • <span>{data.stage}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Thermometer className="w-4 h-4 text-orange-500" />
        <span>{data.temp}°C</span> | pH: {data.ph}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Droplet className="w-4 h-4 text-blue-500" />
        <Progress value={data.irrigation} className="flex-1" />
        <span>{data.irrigation}%</span>
      </div>
      {data.alerts.length > 0 && (
        <div className="space-y-1">
          {data.alerts.map((alert: any, i: number) => (
            <div
              key={i}
              className={`text-sm flex items-center gap-1 ${
                alert.type === "critical"
                  ? "text-destructive"
                  : "text-yellow-600"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {alert.message}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ---------- Map Legend ----------
const MapLegend = () => (
  <div className="p-4 border rounded-md bg-card shadow-sm">
    <h3 className="font-semibold mb-2 flex items-center gap-2">
      <Map className="w-4 h-4 text-green-600" /> Legend
    </h3>
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 bg-green-500 rounded-full" /> Healthy
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 bg-yellow-500 rounded-full" /> Warning
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 bg-red-500 rounded-full" /> Critical
      </div>
    </div>
  </div>
);

// ---------- Mock Data ----------
const initialFieldStatusData = [
  {
    title: "North Field A",
    subtitle: "Sector 1, Block A",
    pestActivity: "low",
    crop: "Wheat",
    stage: "Germination",
    healthScore: 92,
    area: 25.5,
    temp: 24,
    ph: 6.8,
    irrigation: 65,
    irrigationStatus: "scheduled",
    alerts: [],
  },
  {
    title: "South Field B",
    subtitle: "Sector 2, Block B",
    pestActivity: "medium",
    crop: "Rice",
    stage: "Vegetative",
    healthScore: 78,
    area: 18.3,
    temp: 26,
    ph: 7.2,
    irrigation: 78,
    irrigationStatus: "active",
    alerts: [
      { type: "warning", message: "Pest activity detected in northwest corner" },
    ],
  },
  {
    title: "East Field C",
    subtitle: "Sector 3, Block C",
    pestActivity: "high",
    crop: "Cotton",
    stage: "Flowering",
    healthScore: 65,
    area: 32.1,
    temp: 28,
    ph: 6.5,
    irrigation: 42,
    irrigationStatus: "overdue",
    alerts: [
      { type: "critical", message: "Critical: Bollworm infestation detected" },
      { type: "critical", message: "Irrigation overdue by 3 days" },
    ],
  },
];

// ---------- Main Component ----------
const FieldMonitoring = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [observations, setObservations] = useState(initialFieldStatusData);

  const [newObs, setNewObs] = useState({
    title: "",
    subtitle: "",
    crop: "",
    stage: "",
    temp: "",
    ph: "",
    irrigation: "",
    healthScore: "",
  });

  const handleSave = () => {
    if (!newObs.title || !newObs.crop) return;

    const obs = {
      ...newObs,
      temp: Number(newObs.temp) || 25,
      ph: Number(newObs.ph) || 7.0,
      irrigation: Number(newObs.irrigation) || 50,
      healthScore: Number(newObs.healthScore) || 80,
      pestActivity: "low",
      area: 10,
      irrigationStatus: "scheduled",
      alerts: [],
    };

    setObservations((prev) => [...prev, obs]);
    setNewObs({
      title: "",
      subtitle: "",
      crop: "",
      stage: "",
      temp: "",
      ph: "",
      irrigation: "",
      healthScore: "",
    });
    setIsModalOpen(false);
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Field Monitoring
          </h1>
          <p className="text-muted-foreground">
            Manage and observe real-time field health across all zones.
          </p>
        </div>
        <Button
          className="gap-2 shrink-0 mt-4 md:mt-0 w-full md:w-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Observation
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="monitoring">
        <TabsList className="mb-4">
          <TabsTrigger value="monitoring">Field Monitoring</TabsTrigger>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
        </TabsList>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:w-auto md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search fields by name, crop, or location..."
                  className="pl-9 w-full"
                />
              </div>
              <Select>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Fields" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="north">North Field A</SelectItem>
                  <SelectItem value="south">South Field B</SelectItem>
                  <SelectItem value="east">East Field C</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {observations.map((data, idx) => (
              <FieldStatusCard key={idx} data={data} />
            ))}
          </div>
        </TabsContent>

        {/* Interactive Map Tab */}
        <TabsContent value="map" className="space-y-6">
          <MapLegend />
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5 text-green-600" />
                Interactive Farm Layout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InteractiveFarmMap /> {/* ✅ integrated here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Observation Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Observation</DialogTitle>
            <DialogDescription>
              Record a new observation for a field.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Input
              placeholder="Field Title (e.g., North Field D)"
              value={newObs.title}
              onChange={(e) => setNewObs({ ...newObs, title: e.target.value })}
            />
            <Input
              placeholder="Subtitle (e.g., Sector 4, Block D)"
              value={newObs.subtitle}
              onChange={(e) =>
                setNewObs({ ...newObs, subtitle: e.target.value })
              }
            />
            <Input
              placeholder="Crop (e.g., Maize)"
              value={newObs.crop}
              onChange={(e) => setNewObs({ ...newObs, crop: e.target.value })}
            />
            <Input
              placeholder="Stage (e.g., Vegetative)"
              value={newObs.stage}
              onChange={(e) => setNewObs({ ...newObs, stage: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Temp (°C)"
                value={newObs.temp}
                onChange={(e) => setNewObs({ ...newObs, temp: e.target.value })}
              />
              <Input
                placeholder="Soil pH"
                value={newObs.ph}
                onChange={(e) => setNewObs({ ...newObs, ph: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Irrigation (%)"
                value={newObs.irrigation}
                onChange={(e) =>
                  setNewObs({ ...newObs, irrigation: e.target.value })
                }
              />
              <Input
                placeholder="Health Score (%)"
                value={newObs.healthScore}
                onChange={(e) =>
                  setNewObs({ ...newObs, healthScore: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Observation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default FieldMonitoring;
