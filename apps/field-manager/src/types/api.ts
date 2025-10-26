// src/types/api.ts

// Based on schemas.Task
export interface Task {
  id: string; // The UUID
  type: string;
  task: string; // Description
  plot: string;
  supervisor_id: string;
  status: string; // "Pending", "In Progress", "Completed"
  due_date?: string | null; // ISO date string (e.g., "2025-10-25")
  required_item_id?: string | null;
  required_quantity?: number | null;
}

// Based on schemas.TaskCreate
export interface TaskCreate {
  type: string;
  task: string;
  plot: string;
  supervisor_id: string;
  status?: string;
  due_date?: string | null;
  required_item_id?: string | null;
  required_quantity?: number | null;
}

// Based on schemas.TaskUpdate
export interface TaskUpdate {
  status: string;
}

// Based on schemas.InventoryItem
export interface InventoryItem {
  id: string; // The UUID
  item: string;
  category: string;
  stock: number;
  unit: string;
  threshold: number;
  last_updated?: string | null; // ISO datetime string
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  assigned_plots: string[];
  field_manager_id?: string | null;
}

export interface SupervisorCreate {
  name: string;
  email: string;
  phone: string;
  assigned_plots: string[];
  field_manager_id?: string | null;
}

// Based on schemas.SupervisorUpdate
export interface SupervisorUpdate {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  assigned_plots?: string[] | null;
}

// src/types/api.ts
// ... (at the end of the file)

export interface Geolocation {
  latitude: number;
  longitude: number;
}

export interface Plot {
  id: string; // The UUID primary key
  name: string; // e.g., "Farm A Plot 1"
  plot_number: string; // e.g., "21B"
  geolocation: Geolocation;
  supervisor_id?: string | null;
  field_manager_id?: string | null;
}

export interface PlotCreate {
  name: string;
  plot_number: string;
  geolocation: Geolocation;
  supervisor_id?: string | null;
  field_manager_id?: string | null;
}