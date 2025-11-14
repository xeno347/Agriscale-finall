"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Droplet,
  Tractor,
  Layers,
  Sprout,
  Bug,
  Leaf,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ------------------ MOCK DATA ------------------
const plots = [
  {
    plotNumber: "18",
    acreage: "1.06 acre",
    status: "Harvesting",
    progress: 25,
    crop: "Wheat",
    icon: Tractor,
    color: "text-blue-500",
  },
  {
    plotNumber: "12",
    acreage: "1.04 acre",
    status: "Irrigation",
    progress: 95,
    crop: "Rice",
    icon: Droplet,
    color: "text-yellow-500",
    alert: true,
  },
  {
    plotNumber: "06",
    acreage: "1.02 acre",
    status: "Fertilizing",
    progress: 60,
    crop: "Maize",
    icon: Leaf,
    color: "text-green-500",
  },
  {
    plotNumber: "10",
    acreage: "2.13 acre",
    status: "Pest Control",
    progress: 50,
    crop: "Cotton",
    icon: Bug,
    color: "text-red-500",
    alert: true,
  },
  {
    plotNumber: "17",
    acreage: "2.38 acre",
    status: "Harvesting",
    progress: 45,
    crop: "Soybean",
    icon: Tractor,
    color: "text-blue-500",
  },
  {
    plotNumber: "11",
    acreage: "2.22 acre",
    status: "Ploughing",
    progress: 25,
    crop: "Barley",
    icon: Layers,
    color: "text-purple-500",
  },
  {
    plotNumber: "09",
    acreage: "1.28 acre",
    status: "Fertilizing",
    progress: 85,
    crop: "Sugarcane",
    icon: Leaf,
    color: "text-green-500",
    alert: true,
  },
  {
    plotNumber: "02",
    acreage: "1.58 acre",
    status: "Planting",
    progress: 90,
    crop: "Millet",
    icon: Sprout,
    color: "text-gray-500",
  },
];

// ------------------ PLOT BOX ------------------
const PlotBox = ({
  plot,
  onClick,
}: {
  plot: any;
  onClick: (plot: any) => void;
}) => {
  const Icon = plot.icon;
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(plot)}
      className={`p-3 rounded-xl border shadow-sm cursor-pointer text-center relative transition-all ${
        plot.alert ? "border-destructive" : "border-border"
      }`}
    >
      <div className="flex justify-center items-center gap-2">
        <Icon className={`w-5 h-5 ${plot.color}`} />
        <span className="text-sm font-semibold">#{plot.plotNumber}</span>
      </div>
      <p className="text-xs text-muted-foreground">{plot.acreage}</p>
      <p className="text-xs font-medium">{plot.status}</p>

      {/* Progress bar */}
      <div className="h-2 bg-muted mt-2 rounded-full overflow-hidden">
        <motion.div
          className="h-2 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${plot.progress}%` }}
          transition={{ duration: 1 }}
        />
      </div>

      {/* Alert indicator */}
      {plot.alert && (
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-2 right-2"
        >
          <span className="w-2 h-2 bg-destructive rounded-full block" />
        </motion.div>
      )}
    </motion.div>
  );
};

// ------------------ INTERACTIVE MAP ------------------
const InteractiveFarmMap = () => {
  const [selectedPlot, setSelectedPlot] = useState<any>(null);

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Interactive Farm Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {plots.map((plot) => (
            <PlotBox key={plot.plotNumber} plot={plot} onClick={setSelectedPlot} />
          ))}
        </div>
      </CardContent>

      {/* ------------------ DIALOG ------------------ */}
      <Dialog open={!!selectedPlot} onOpenChange={() => setSelectedPlot(null)}>
        <DialogContent>
          {selectedPlot && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Plot #{selectedPlot.plotNumber} — {selectedPlot.crop}
                </DialogTitle>
                <DialogDescription>
                  {selectedPlot.acreage} | {selectedPlot.status}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Crop Type:</span>
                  <span className="font-medium">{selectedPlot.crop}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Status:</span>
                  <span className="font-medium">{selectedPlot.status}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Progress:</span>
                  <span className="font-medium">{selectedPlot.progress}%</span>
                </div>
                <Progress value={selectedPlot.progress} />

                {selectedPlot.alert && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Attention needed on this plot.
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPlot(null)}>
                  Close
                </Button>
                <Button>View Detailed Report</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InteractiveFarmMap;
