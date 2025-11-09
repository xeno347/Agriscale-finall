"use client";

import { useState, useEffect, useCallback } from "react";
import PlotCard from "../components/PlotCard"; // Adjust path if needed
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Wheat, Droplets, Tractor, Sprout, FlaskConical, Bug, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button"; // Import Button

// --- API Imports ---
import { getTasks, getPlots } from "../lib/apiService"; // Added getPlots
import { Task, Plot } from "../types/api";          // Added Plot

// --- Activity Definitions (kept inside this component) ---
type ActivityKey =
  | "harvesting"
  | "irrigation"
  | "ploughing"
  | "planting"
  | "fertilizing"
  | "pest-control"
  | "idle";

const activities: Record<
  ActivityKey,
  { icon: LucideIcon; colorClass: string; colorHex: string; name: string }
> = {
  harvesting: { name: "Harvesting", icon: Wheat, colorClass: "bg-amber-500", colorHex: "#f59e0b" },
  irrigation: { name: "Irrigation", icon: Droplets, colorClass: "bg-blue-500", colorHex: "#3b82f6" },
  ploughing: { name: "Ploughing", icon: Tractor, colorClass: "bg-orange-500", colorHex: "#f97116" },
  planting: { name: "Planting", icon: Sprout, colorClass: "bg-green-500", colorHex: "#22c55e" },
  fertilizing: { name: "Fertilizing", icon: FlaskConical, colorClass: "bg-purple-500", colorHex: "#a855f7" },
  "pest-control": { name: "Pest Control", icon: Bug, colorClass: "bg-red-500", colorHex: "#ef4444" },
  idle: { name: "Idle", icon: Sprout, colorClass: "bg-gray-400", colorHex: "#9ca3af" },
};

// Helper to map task type string to ActivityKey
const mapTaskTypeToActivityKey = (taskType: string): ActivityKey => {
  const lowerType = taskType.toLowerCase();
  if (lowerType.includes("harvest")) return "harvesting";
  if (lowerType.includes("irrigation")) return "irrigation";
  if (lowerType.includes("ploughing")) return "ploughing";
  if (lowerType.includes("planting")) return "planting";
  if (lowerType.includes("fertilizer")) return "fertilizing";
  if (lowerType.includes("pest") || lowerType.includes("inspection")) return "pest-control";
  return "idle";
};
// ------------------------------

// --- Helper type for the final data displayed on the card ---
interface DisplayPlotData {
  id: string; // Plot UUID
  plotNumberDisplay: string; // The number shown on the card (e.g., "08" or "21B")
  acreage: string; // We'll get this from the Plot data eventually
  activityName: string;
  completion: number;
  colorClass: string;
  colorHex: string;
  Icon: LucideIcon;
  name: string; // Plot Name e.g. "Farm A Plot 18"
}

const FieldMonitoring = () => {
  // --- API State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedPlots, setAssignedPlots] = useState<Plot[]>([]); // State for plots assigned to FM
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch data on load (Plots AND Tasks) ---
  const loadData = useCallback(async () => {
    // Only set loading true on initial load
    // Don't set setIsLoading(true) here if relying on the useEffect dependency
    setError(null);
    try {
      // Fetch both plots assigned to this FM and all tasks (tasks will be filtered later)
      const [plotData, taskData] = await Promise.all([
         getPlots(), // Fetches ONLY plots for this FM
         getTasks()  // Fetches tasks (we'll match them to the plots)
      ]);
      setAssignedPlots(plotData);
      setTasks(taskData);
       if (plotData.length === 0) {
         console.log("No plots found assigned to this Field Manager.");
         // You could show a message on the UI here if needed
       }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load field data. Please try again.");
    } finally {
        // Set loading false regardless of initial state, just once after fetch
        setIsLoading(false);
    }
  // --- CORRECTED: Empty dependency array for useCallback ---
  }, []); // loadData itself doesn't depend on changing state

  useEffect(() => {
    // --- CORRECTED: Standard pattern for single initial load ---
    setIsLoading(true); // Set loading true *before* calling loadData
    loadData(); // No need for .finally here as loadData handles setIsLoading(false)
  // --- CORRECTED: useEffect depends on the stable loadData function ---
  }, [loadData]); // Runs once on mount because loadData is stable

  // --- Logic to combine assigned plots with live tasks ---
  const [displayPlots, setDisplayPlots] = useState<DisplayPlotData[]>([]);

  useEffect(() => {
    // Create a map of the *most relevant* active task for each plot NUMBER
    // Key: plot_number (e.g., "21B"), Value: Task object
    const activeTaskMap = new Map<string, Task>();
    for (const task of tasks) {
      if (task.plot && task.status.toLowerCase() !== "completed") {
        activeTaskMap.set(task.plot, task); // task.plot is "21B", "18", etc.
      }
    }

    // Create the final list of plots to display
    const newDisplayPlots: DisplayPlotData[] = [];
    for (const plot of assignedPlots) { // Iterate through ONLY the plots assigned to this FM
      let finalActivityKey: ActivityKey = "idle";
      let finalCompletion = 0;
      let activityName = activities.idle.name;

      // Check if there's an active task for this plot's plot_number
      const liveTask = activeTaskMap.get(plot.plot_number);

      if (liveTask) {
        finalActivityKey = mapTaskTypeToActivityKey(liveTask.type);
        const liveStatus = liveTask.status.toLowerCase();
        finalCompletion = liveStatus === "in progress" ? 50 : 0;
        activityName = activities[finalActivityKey]?.name || activities.idle.name;
      }

      const activityDetails = activities[finalActivityKey] || activities.idle;

      newDisplayPlots.push({
        id: plot.id, // Keep the plot UUID
        plotNumberDisplay: plot.plot_number, // Use the plot_number from the plot data
        // TODO: Add acreage to your Plot schema/table if you want to display it
        acreage: "N/A", // Placeholder - Add 'acreage' field to your Plot schema
        activityName: activityName,
        completion: finalCompletion,
        colorClass: activityDetails.colorClass,
        colorHex: activityDetails.colorHex,
        Icon: activityDetails.icon,
        name: plot.name, // Use the plot name
      });
    }

    // Sort plots for consistent display (optional)
    newDisplayPlots.sort((a, b) => a.plotNumberDisplay.localeCompare(b.plotNumberDisplay));

    setDisplayPlots(newDisplayPlots);
  }, [tasks, assignedPlots]); // Re-run when tasks OR assignedPlots change

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64 mb-6" /> {/* Title Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
     return (
      <div className="p-6 text-center text-red-600">
        <AlertTriangle className="mx-auto h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">{error}</h2>
         {/* Corrected onClick for Try Again button */}
         <Button onClick={() => { setIsLoading(true); loadData(); }} variant="outline" className="mt-4">Try Again</Button>
      </div>
    );
  }
  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
         <h1 className="text-3xl font-bold text-foreground">Field Monitoring</h1>
         {/* Removed Farm Map details - can add back if needed */}
         <Badge className="bg-green-500 text-white px-4 py-2">
            Real-time Monitoring
         </Badge>
      </div>

      {/* Plots Grid - Dynamically built from assignedPlots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {displayPlots.length === 0 && !isLoading && (
            <div className="col-span-full text-center text-muted-foreground py-10">
               No plots assigned to this Field Manager.
            </div>
         )}
         {displayPlots.map((plot) => (
            <PlotCard
              key={plot.id} // Use plot UUID as key
              plotNumber={plot.plotNumberDisplay}
              acreage={plot.acreage} // Will show N/A until added to schema
              activity={plot.activityName}
              completion={plot.completion}
              colorClass={plot.colorClass}
              colorHex={plot.colorHex}
              Icon={plot.Icon}
              // Optional: Pass plot.name if PlotCard can display it
              // plotName={plot.name}
            />
          ))}
      </div>
       {/* Removed Legend and Main Road as layout is dynamic now */}
    </div>
  );
};

export default FieldMonitoring;