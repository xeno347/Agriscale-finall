import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  easeInOut,
  circInOut,
} from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

// Mock Data
const farms = [
  { id: 1, name: "Amrit Farm", plots: ["Plot A", "Plot B", "Plot C"] },
  { id: 2, name: "Green Valley", plots: ["Plot D", "Plot E"] },
  { id: 3, name: "Harvest Hill", plots: ["Plot F", "Plot G", "Plot H"] },
];

const progressData = [
  { name: "Jan", progress: 40 },
  { name: "Feb", progress: 65 },
  { name: "Mar", progress: 75 },
  { name: "Apr", progress: 90 },
  { name: "May", progress: 80 },
];

const dfdData = [
  { name: "Moisture", value: 45 },
  { name: "Nutrients", value: 80 },
  { name: "Temperature", value: 60 },
  { name: "Yield Potential", value: 75 },
];

// Smooth animation variants
const fadeUpVariant = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeInOut },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.98,
    transition: { duration: 0.4, ease: circInOut },
  },
};

const AIAnalysis: React.FC = () => {
  const [selectedFarm, setSelectedFarm] = useState(farms[0].name);
  const [selectedPlot, setSelectedPlot] = useState("all"); // FIXED

  const handleFarmChange = (farm: string) => {
    setSelectedFarm(farm);
    setSelectedPlot("all"); // reset plot safely
  };

  const selectedFarmObj = farms.find((f) => f.name === selectedFarm);

  return (
    <div className="p-8 bg-gradient-to-br from-white to-green-50 min-h-screen text-gray-800">
      <motion.h1
        className="text-3xl font-bold mb-6 text-green-700"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeInOut }}
      >
        🌾 AI-Powered Farm & Plot Analysis
      </motion.h1>

      {/* Dropdown Section */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Farm Selector */}
        <div className="flex-1">
          <label className="block mb-2 text-gray-600 font-medium">
            Select Farm
          </label>
          <Select value={selectedFarm} onValueChange={handleFarmChange}>
            <SelectTrigger className="bg-white border border-green-200 focus:ring-green-500">
              <SelectValue placeholder="Choose a Farm" />
            </SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.name}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plot Selector */}
        <div className="flex-1">
          <label className="block mb-2 text-gray-600 font-medium">
            Select Plot
          </label>
          <Select
            value={selectedPlot}
            onValueChange={setSelectedPlot}
            disabled={!selectedFarm}
          >
            <SelectTrigger className="bg-white border border-green-200 focus:ring-green-500">
              <SelectValue placeholder="Choose a Plot" />
            </SelectTrigger>

            <SelectContent>
              {/* FIXED: No empty values */}
              <SelectItem value="all">All Plots</SelectItem>

              {selectedFarmObj?.plots.map((plot) => (
                <SelectItem key={plot} value={plot}>
                  {plot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Unified Animated Analysis */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedFarm}-${selectedPlot}`}
          variants={fadeUpVariant}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Card className="shadow-lg rounded-2xl border-green-100 bg-white">
            <CardHeader className="border-b border-green-100">
              <h2 className="text-xl font-semibold text-green-700">
                {selectedPlot !== "all"
                  ? `Analysis for ${selectedPlot} (${selectedFarm})`
                  : `Overall Farm Analysis — ${selectedFarm}`}
              </h2>
              <p className="text-gray-500 text-sm">
                AI-generated insights and analytics.
              </p>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
              {/* Line Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                  Farm Progress Overview
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1e7dd" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="progress"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-700">
                  Resource Efficiency (DFD Metrics)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dfdData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1e7dd" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AIAnalysis;
