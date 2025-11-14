import React, { useState } from "react";
import { PageLayout } from "@/components/dashboard/PageLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Leaf,
  Droplet,
  Bug,
  ClipboardCheck,
} from "lucide-react";

// --- MOCK DATA ---
const timelineData = [
  { stage: "Sowing", start: "05 Oct 2025", end: "10 Oct 2025", status: "Completed" },
  { stage: "Irrigation", start: "12 Oct 2025", end: "20 Oct 2025", status: "Ongoing" },
  { stage: "Fertilization", start: "25 Oct 2025", end: "28 Oct 2025", status: "Pending" },
  { stage: "Harvesting", start: "20 Dec 2025", end: "05 Jan 2026", status: "Upcoming" },
];

const batchData = [
  { id: "B001", crop: "Wheat", field: "Plot A1", progress: 90, status: "Near Harvest" },
  { id: "B002", crop: "Rice", field: "Plot B2", progress: 60, status: "Growth Stage" },
  { id: "B003", crop: "Maize", field: "Plot C1", progress: 40, status: "Early Growth" },
];

const CropCycleMonitoring = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [observations, setObservations] = useState<any[]>([]);
  const [field, setField] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const handleSave = () => {
    setObservations([
      ...observations,
      {
        id: Date.now().toString(),
        field,
        type,
        notes,
        photo: photo?.name || "",
        date: new Date().toLocaleDateString(),
      },
    ]);
    setIsModalOpen(false);
    setField("");
    setType("");
    setNotes("");
    setPhoto(null);
  };

  return (
    <PageLayout>
      <PageHeader
        title="Crop Cycle Monitoring"
        description="Track crop growth stages, interventions, and batch progress."
      />

      <Tabs defaultValue="crop-timeline">
        <TabsList className="mb-4">
          <TabsTrigger value="crop-timeline">Crop Timeline</TabsTrigger>
          <TabsTrigger value="stage-interventions">Stage Interventions</TabsTrigger>
          <TabsTrigger value="batch-tracking">Batch Tracking</TabsTrigger>
        </TabsList>

        {/* Crop Timeline */}
        <TabsContent value="crop-timeline">
          <Card>
            <CardHeader>
              <CardTitle>Crop Growth Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineData.map((t) => (
                  <div key={t.stage} className="border p-4 rounded-lg">
                    <div className="flex justify-between">
                      <h4 className="font-semibold">{t.stage}</h4>
                      <Badge
                        variant={
                          t.status === "Completed"
                            ? "success"
                            : t.status === "Ongoing"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.start} → {t.end}
                    </p>
                    <Progress
                      value={
                        t.status === "Completed"
                          ? 100
                          : t.status === "Ongoing"
                          ? 60
                          : t.status === "Pending"
                          ? 20
                          : 0
                      }
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage Interventions */}
        <TabsContent value="stage-interventions">
          <div className="flex justify-between mb-4">
            <h3 className="text-xl font-semibold">Field Observations</h3>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Observation
            </Button>
          </div>

          {observations.length === 0 ? (
            <p className="text-muted-foreground">No observations recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {observations.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold">{o.field}</h4>
                    <p className="text-sm">{o.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.notes}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.date}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Batch Tracking */}
        <TabsContent value="batch-tracking">
          <Card>
            <CardHeader>
              <CardTitle>Batch Tracking Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batchData.map((b) => (
                  <div key={b.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">
                        {b.crop} — {b.field}
                      </h4>
                      <Badge variant="outline">{b.status}</Badge>
                    </div>
                    <Progress value={b.progress} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Observation Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Field Observation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Field Name"
              value={field}
              onChange={(e) => setField(e.target.value)}
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Irrigation">
                  <Droplet className="w-4 h-4 inline mr-2" />
                  Irrigation
                </SelectItem>
                <SelectItem value="Fertilization">
                  <Leaf className="w-4 h-4 inline mr-2" />
                  Fertilization
                </SelectItem>
                <SelectItem value="Pest Control">
                  <Bug className="w-4 h-4 inline mr-2" />
                  Pest Control
                </SelectItem>
                <SelectItem value="Harvest Check">
                  <ClipboardCheck className="w-4 h-4 inline mr-2" />
                  Harvest Check
                </SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes or observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default CropCycleMonitoring;
