# cleanup_duplicate_plots.py
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError
from decimal import Decimal # Although not strictly needed for deletion, good practice
from app.db import PLOT_TABLE_NAME # Import the table name

print("Attempting to initialize Boto3 DynamoDB resource...")

try:
    # Use the resource object
    dynamodb_resource = boto3.resource('dynamodb')
    plot_table = dynamodb_resource.Table(PLOT_TABLE_NAME)
    plot_table.load() # Check if table exists
    print(f"Connected to table: {PLOT_TABLE_NAME}")

except (NoCredentialsError, PartialCredentialsError) as e:
    print(f"ERROR: Could not find AWS credentials. Details: {e}")
    exit()
except ClientError as e:
     if e.response['Error']['Code'] == 'ResourceNotFoundException':
        print(f"ERROR: Table '{PLOT_TABLE_NAME}' does not exist.")
     else:
        print(f"ERROR: Boto3 client error connecting to table. Details: {e}")
     exit()
except Exception as e:
    print(f"ERROR: Failed to initialize Boto3 or connect to table. Details: {e}")
    exit()

# --- Scan and Identify Duplicates ---
items_to_keep = {} # Dictionary to store: { plot_number: plot_id_to_keep }
ids_to_delete = [] # List to store plot_ids to delete

print(f"\nScanning table '{PLOT_TABLE_NAME}' for duplicate plot_number entries...")

try:
    # Scan the table (add pagination handling if table is large)
    response = plot_table.scan()
    items = response.get('Items', [])
    # TODO: Add pagination handling here if your table might exceed 1MB scan limit

    if not items:
        print("Table is empty. No cleanup needed.")
        exit()

    print(f"Found {len(items)} total items. Checking for duplicates...")

    for item in items:
        plot_id = item.get('plot_id')
        plot_number = item.get('plot_number')

        if not plot_id or plot_number is None: # Check if plot_number might be empty string or null
            print(f"  WARNING: Skipping item with missing plot_id or plot_number: {item}")
            continue

        if plot_number in items_to_keep:
            # Duplicate plot_number found. Mark this item for deletion.
            ids_to_delete.append(plot_id)
            print(f"  Marking for deletion (Duplicate plot_number '{plot_number}'): plot_id={plot_id}")
        else:
            # First time seeing this plot_number. Keep this item.
            items_to_keep[plot_number] = plot_id
            print(f"  Keeping (First occurrence of plot_number '{plot_number}'): plot_id={plot_id}")

except ClientError as e:
    print(f"ERROR during scan operation: {e}")
    exit()
except Exception as e:
    print(f"An unexpected error occurred during scan: {e}")
    exit()

# --- Delete Marked Items ---
if not ids_to_delete:
    print("\nNo duplicate plot_number entries found. Cleanup complete.")
    exit()

print(f"\nAttempting to delete {len(ids_to_delete)} duplicate items...")

deleted_count = 0
failed_count = 0

# Use batch_writer for efficiency, though individual deletes are simpler for small numbers
# For simplicity here, we'll delete one by one with error handling
for plot_id_to_delete in ids_to_delete:
    try:
        print(f"  Deleting item with plot_id: {plot_id_to_delete}...")
        plot_table.delete_item(
            Key={'plot_id': plot_id_to_delete}
        )
        print(f"    Successfully deleted.")
        deleted_count += 1
    except ClientError as e:
        print(f"    ERROR deleting item {plot_id_to_delete}: {e}")
        failed_count += 1
    except Exception as e:
        print(f"    An unexpected error occurred deleting item {plot_id_to_delete}: {e}")
        failed_count += 1

print(f"\nCleanup finished.")
print(f"  Successfully deleted: {deleted_count} items.")
if failed_count > 0:
    print(f"  Failed to delete: {failed_count} items. Please check logs or DynamoDB console.")
print(f"  Items remaining: {len(items_to_keep)}")