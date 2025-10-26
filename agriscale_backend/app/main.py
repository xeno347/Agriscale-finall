# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import supervisors, tasks, inventory,plots
app = FastAPI(title="AgriScale Backend")

# Define the URLs your frontend will run on
origins = [
    "http://localhost:5173", # Default Vite React port
    "http://localhost:8080", # Common dev port
    "http://localhost:3000", # Common dev port
    # Add the URL of your deployed frontend later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allow specific origins
    allow_credentials=True,    # Allow cookies
    allow_methods=["*"],       # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],       # Allow all headers
)
# -------

# Include the supervisor router
app.include_router(supervisors.router)
app.include_router(tasks.router)
app.include_router(inventory.router)
app.include_router(plots.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AgriScale Backend!"}