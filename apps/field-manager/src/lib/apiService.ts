// src/lib/apiService.ts
import axios from "axios";
import { Task, TaskCreate, TaskUpdate, InventoryItem, Supervisor, SupervisorCreate, // <-- ADD
  SupervisorUpdate,Plot,         // <-- ADD THIS
  PlotCreate,} from "@/types/api";

// Create an 'instance' of axios with the base URL of your FastAPI backend
const api = axios.create({
  baseURL: "http://localhost:8000", // Your FastAPI server URL
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Task Functions (based on your tasks.py) ---

/** Fetches all tasks */
export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get<Task[]>("/tasks/");
  return response.data;
};

/** Creates a new task */
export const createTask = async (taskData: TaskCreate): Promise<Task> => {
  const response = await api.post<Task>("/tasks/", taskData);
  return response.data;
};

/** Updates a task's status */
export const updateTaskStatus = async (
  taskId: string,
  status: string
): Promise<Task> => {
  const updateData: TaskUpdate = { status };
  const response = await api.put<Task>(`/tasks/${taskId}`, updateData);
  return response.data;
};

/** Deletes a task */
export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}`);
};

// --- Inventory Functions (assuming routes from your main.py) ---
// (We assume your inventory.py has a prefix of '/inventory')

/** Fetches all inventory items */
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const response = await api.get<InventoryItem[]>("/inventory/");
  return response.data;
};

/** Deletes an inventory item */
export const deleteInventoryItem = async (itemId: string): Promise<void> => {
  await api.delete(`/inventory/${itemId}`);
};

// Add other functions for supervisors, etc. as needed

export const getSupervisors = async (): Promise<Supervisor[]> => {
  const response = await api.get<Supervisor[]>("/supervisors/");
  return response.data;
};

/** Creates a new supervisor */
export const createSupervisor = async (
  supervisorData: SupervisorCreate
): Promise<Supervisor> => {
  const response = await api.post<Supervisor>(
    "/supervisors/",
    supervisorData
  );
  return response.data;
};

/** Updates an existing supervisor */
export const updateSupervisor = async (
  id: string,
  supervisorData: SupervisorUpdate
): Promise<Supervisor> => {
  const response = await api.put<Supervisor>(
    `/supervisors/${id}`,
    supervisorData
  );
  return response.data;
};

/** Deletes a supervisor */
export const deleteSupervisor = async (id: string): Promise<void> => {
  await api.delete(`/supervisors/${id}`);
};

/** Fetches all plots */
export const getPlots = async (): Promise<Plot[]> => { // <-- Make sure 'export' is here
  const response = await api.get<Plot[]>("/plots/");
  return response.data;
};

/** Creates a new plot */
export const createPlot = async (plotData: PlotCreate): Promise<Plot> => { // <-- Make sure 'export' is here
  const response = await api.post<Plot>("/plots/", plotData);
  return response.data;
};

export const getSupervisorPhotoUrl = async (fileKey: string): Promise<string> => {
    const response = await api.get<string>(`/s3/get-photo-url?file_key=${fileKey}`);
    return response.data;
};