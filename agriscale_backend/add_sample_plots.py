# add_sample_plots.py
import boto3
import uuid
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError
from app.db import PLOT_TABLE_NAME, get_table # Import get_table
from decimal import Decimal

print("Attempting to initialize Boto3 DynamoDB resource...")

try:
    # Use the resource object for easier item manipulation
    dynamodb_resource = boto3.resource('dynamodb')
    plot_table = dynamodb_resource.Table(PLOT_TABLE_NAME)
    # Check if table exists by trying to load its description
    plot_table.load()
    print(f"Connected to table: {PLOT_TABLE_NAME}")

except (NoCredentialsError, PartialCredentialsError) as e:
    print(f"ERROR: Could not find AWS credentials. Details: {e}")
    exit()
except ClientError as e:
     if e.response['Error']['Code'] == 'ResourceNotFoundException':
        print(f"ERROR: Table '{PLOT_TABLE_NAME}' does not exist. Please run create_plot_table.py first.")
     else:
        print(f"ERROR: Boto3 client error connecting to table. Details: {e}")
     exit()
except Exception as e:
    print(f"ERROR: Failed to initialize Boto3 or connect to table. Details: {e}")
    exit()

# --- Sample Plot Data ---
# IMPORTANT: Assign these plots to the mock Field Manager ID used in plots.py
mock_field_manager_id = "fm_mock_id_1"

sample_plots = [
    {
        "plot_id": str(uuid.uuid4()),
        "name": "Farm A - Plot 18",
        "plot_number": "18",
        # --- CONVERT TO DECIMAL ---
        "geolocation": {"latitude": Decimal('28.1234'), "longitude": Decimal('77.5678')},
        "field_manager_id": mock_field_manager_id,
        "supervisor_id": "sup_mock_id_1"
    },
    {
        "plot_id": str(uuid.uuid4()),
        "name": "Farm A - Plot 21B",
        "plot_number": "21B",
        # --- CONVERT TO DECIMAL ---
        "geolocation": {"latitude": Decimal('28.1235'), "longitude": Decimal('77.5679')},
        "field_manager_id": mock_field_manager_id,
        "supervisor_id": "sup_mock_id_2"
    },
    {
        "plot_id": str(uuid.uuid4()),
        "name": "Farm B - Plot 07A",
        "plot_number": "07A",
        # --- CONVERT TO DECIMAL ---
        "geolocation": {"latitude": Decimal('28.1236'), "longitude": Decimal('77.5680')},
        "field_manager_id": mock_field_manager_id,
        "supervisor_id": "sup_mock_id_1"
    },
    {
        "plot_id": str(uuid.uuid4()),
        "name": "Farm C - Plot 01",
        "plot_number": "01",
        # --- CONVERT TO DECIMAL ---
        "geolocation": {"latitude": Decimal('28.1237'), "longitude": Decimal('77.5681')},
        "field_manager_id": "another_fm_id",
        "supervisor_id": "sup_mock_id_3"
    }
]

print(f"Adding {len(sample_plots)} sample plots to the '{PLOT_TABLE_NAME}' table...")

items_added = 0
items_failed = 0

# Use batch_writer for efficiency
try:
    with plot_table.batch_writer() as batch:
        for plot in sample_plots:
            print(f"  Adding plot: {plot['name']} (Number: {plot['plot_number']})")
            batch.put_item(Item=plot)
            items_added += 1
    print(f"\nSuccessfully added {items_added} plot items.")

except Exception as e:
    # Basic error handling for batch write
    print(f"\nERROR during batch write: {e}")
    # Note: A failure in batch_writer might mean some items were added, some weren't.
    # More robust error handling could track individual failures.
    items_failed = len(sample_plots) # Assume all failed if exception occurs

if items_failed > 0:
    print(f"WARNING: Failed to add {items_failed} items.")