# app/db.py
import boto3
import os
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

# Attempt to get credentials from environment variables
try:
    # Check if environment variables are set (optional check)
    if not all(os.getenv(key) for key in ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION']):
         print("WARNING: AWS credentials environment variables not fully set. Boto3 might use other methods (e.g., ~/.aws/credentials).")

    # Boto3 will automatically look for credentials in environment variables,
    # shared credential file (~/.aws/credentials), or IAM role if on EC2/ECS.
    dynamodb_resource = boto3.resource('dynamodb')
    print("Successfully created DynamoDB resource.") # Add this print statement

except (NoCredentialsError, PartialCredentialsError) as e:
    print(f"ERROR: Could not find AWS credentials. Please configure them (e.g., environment variables). Details: {e}")
    # In a real app, you might want to raise an exception or handle this differently
    dynamodb_resource = None
except Exception as e:
    print(f"ERROR: Failed to initialize Boto3 DynamoDB resource. Details: {e}")
    dynamodb_resource = None

# Example: Define table names (replace with actual names later)
SUPERVISOR_TABLE_NAME = "Supervisor" # Example name
TASK_TABLE_NAME = "Tasks"           # Example name
INVENTORY_TABLE_NAME = "Inventory"   # Example name
PLOT_TABLE_NAME = "Plots"

# Function to get a specific table resource
def get_table(table_name: str):
    if dynamodb_resource:
        try:
            table = dynamodb_resource.Table(table_name)
            # You might add a check here later to see if the table actually exists
            # table.load() # This would raise an error if the table doesn't exist
            return table
        except Exception as e:
             print(f"ERROR: Could not get DynamoDB table '{table_name}'. Details: {e}")
             return None
    else:
        print(f"ERROR: DynamoDB resource not initialized. Cannot get table '{table_name}'.")
        return None