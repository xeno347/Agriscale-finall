// apps/field-manager/src/lib/apiService.ts
import axios from "axios";
import { 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  InventoryItem, 
  Supervisor, 
  SupervisorCreate, 
  SupervisorUpdate,
  Plot, 
  PlotCreate 
} from "@/types/api";

// CRITICAL FIX: Import base URL constants
import { FASTAPI_BASE_URL } from "./baseurl"; 

// Create an 'instance' of axios with the base URL of your FastAPI backend
const api = axios.create({
  baseURL: FASTAPI_BASE_URL, // <<< FIXED: Uses the imported constant
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Task Functions ---

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

// --- Inventory Functions ---

/** Fetches all inventory items */
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const response = await api.get<InventoryItem[]>("/inventory/");
  return response.data;
};

/** Deletes an inventory item */
export const deleteInventoryItem = async (itemId: string): Promise<void> => {
  await api.delete(`/inventory/${itemId}`);
};

// --- Supervisor Functions ---

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

// --- Plot Functions ---

/** Fetches all plots */
export const getPlots = async (): Promise<Plot[]> => { 
  const response = await api.get<Plot[]>("/plots/");
  return response.data;
};

/** Creates a new plot */
export const createPlot = async (plotData: PlotCreate): Promise<Plot> => { 
  const response = await api.post<Plot>("/plots/", plotData);
  return response.data;
};

/** Fetches a secure, temporary URL for viewing a private S3 image. */
export const getSupervisorPhotoUrl = async (fileKey: string): Promise<string> => {
    const response = await api.get<string>(`/s3/get-photo-url?file_key=${fileKey}`);
    return response.data;
};