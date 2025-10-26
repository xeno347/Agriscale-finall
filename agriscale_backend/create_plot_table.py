# create_plot_table.py
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
from app.db import PLOT_TABLE_NAME # Import the table name

print("Attempting to initialize Boto3 DynamoDB resource...")

# Boto3 will automatically look for credentials in environment variables,
try:
    # Use the client for table creation operations
    dynamodb_client = boto3.client('dynamodb')
    # Get the region from the client's config if available, otherwise default or raise error
    session = boto3.Session()
    aws_region = session.region_name
    if not aws_region:
        # Fallback or specific region if needed
        aws_region = 'us-east-1' # Or your desired default region
        print(f"WARN: Could not auto-detect region, using default: {aws_region}")
        # Re-initialize client with the specified region if necessary
        dynamodb_client = boto3.client('dynamodb', region_name=aws_region)

    print(f"DynamoDB client initialized for region: {aws_region}")

except (NoCredentialsError, PartialCredentialsError) as e:
    print(f"ERROR: Could not find AWS credentials. Please configure them. Details: {e}")
    exit()
except Exception as e:
    print(f"ERROR: Failed to initialize Boto3 DynamoDB client. Details: {e}")
    exit()

print(f"Attempting to create table: {PLOT_TABLE_NAME} in region {aws_region}...")

try:
    table = dynamodb_client.create_table(
        TableName=PLOT_TABLE_NAME,
        KeySchema=[
            {
                'AttributeName': 'plot_id',
                'KeyType': 'HASH'
            },
        ],
        AttributeDefinitions=[
            {
                'AttributeName': 'plot_id',
                'AttributeType': 'S'
            },
            {
                'AttributeName': 'field_manager_id',
                'AttributeType': 'S'
            },
            # Add supervisor_id if needed later
            # {
            #     'AttributeName': 'supervisor_id',
            #     'AttributeType': 'S'
            # },
        ],
        GlobalSecondaryIndexes=[
            {
                'IndexName': 'FieldManagerIdIndex',
                'KeySchema': [
                    {'AttributeName': 'field_manager_id', 'KeyType': 'HASH'},
                ],
                'Projection': {
                    'ProjectionType': 'ALL'
                },
                # --- REMOVED ProvisionedThroughput from here ---
            },
            # Add SupervisorIdIndex if needed later
            # {
            #     'IndexName': 'SupervisorIdIndex',
            #     ...
            # },
        ],
        BillingMode='PAY_PER_REQUEST' # Keep this
    )

    # Wait for the table to finish being created
    print("Waiting for table to be created...")
    waiter = dynamodb_client.get_waiter('table_exists')
    waiter.wait(TableName=PLOT_TABLE_NAME)
    print(f"Success! Table '{PLOT_TABLE_NAME}' created.")

except dynamodb_client.exceptions.ResourceInUseException:
    print(f"Table '{PLOT_TABLE_NAME}' already exists. No action taken.")
except Exception as e:
    print(f"An error occurred during table creation: {e}")