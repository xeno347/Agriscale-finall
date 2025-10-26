# app/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime,date

# Schema for creating a supervisor (input)
class SupervisorBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    assigned_plots: List[str] = Field(default_factory=list)
    field_manager_id: Optional[str] = None 
    
class SupervisorCreate(SupervisorBase):
    pass # No extra fields needed for creation initially

# Schema for returning a supervisor (output) - includes ID
class Supervisor(SupervisorBase):
    id: str # Or int, depending on your database

    # This allows the model to be created from ORM objects (like SQLAlchemy)
    class Config:
        from_attributes = True # Changed from orm_mode = True for Pydantic v2+

class TaskBase(BaseModel):
    type: str
    task: str # Description of the task
    plot: str
    supervisor_id: str # ID of the assigned supervisor
    status: str = "Pending" # Default status
    due_date: Optional[date] = None

    required_item_id: Optional[str] = None      # The Invent_id (UUID) of the item needed
    required_quantity: Optional[float] = None

class TaskCreate(TaskBase):
    pass # No extra fields needed for creation initially

class Task(TaskBase):
    id: str # Task ID

    class Config:
        from_attributes = True

class InventoryItemBase(BaseModel):
    item: str # Name of the item
    category: str
    stock: float # Use float for quantities that might not be whole numbers (like kg, L)
    unit: str # e.g., 'kg', 'L', 'units'
    threshold: float = 0 # Optional low stock threshold, default to 0
    last_updated: Optional[datetime] = None # When the stock was last changed

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItem(InventoryItemBase):
    id: str # UUID for the item

    class Config:
        from_attributes = True

class TaskUpdate(BaseModel):
    status: str

class InventoryUpdate(BaseModel):
    # Option 1: Send the CHANGE in stock (e.g., -5 to decrease, +50 to increase)
    stock_change: Optional[float] = None
    # Option 2: Send the NEW absolute stock level
    new_stock: Optional[float] = None
    # Add other fields you might want to update later, like category, threshold etc.
    # category: Optional[str] = None
    # threshold: Optional[float] = None

class SupervisorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    assigned_plots: Optional[List[str]] = None

class CurrentUser(BaseModel):
    user_id: str = Field(..., description="The unique ID of the authenticated user.")
    role: str = Field(..., description="The role of the user (FarmManager, FieldManager, Supervisor).")
# ---------------------------------

class SupervisorPerformance(BaseModel):
    supervisor_id: str
    total_tasks: int
    completed_tasks: int
    completion_percentage: float
    name: Optional[str] = None # Name for dashboard display

class Geolocation(BaseModel):
    latitude: float
    longitude: float

class PlotBase(BaseModel):
    name: str # e.g., "Farm A Plot 1"
    plot_number: str # e.g., "21B", "18", "07A" (matches FieldMonitoring map keys)
    geolocation: Geolocation
    supervisor_id: Optional[str] = None
    field_manager_id: Optional[str] = None # Will be used for filtering

class PlotCreate(PlotBase):
    pass # No extra fields needed for creation initially

class Plot(PlotBase):
    id: str # This will be the plot_id (UUID) from DynamoDB

    class Config:
        from_attributes = True # For Pydantic v2+

    