# app/routers/plots.py
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from .. import schemas, db, dependencies
import uuid
# Import boto3 exceptions for querying
from botocore.exceptions import ClientError

router = APIRouter(
    prefix="/plots",
    tags=["Plots"]
)

@router.get("/", response_model=List[schemas.Plot])
async def read_plots():
    """
    Retrieve plots assigned to the currently logged-in Field Manager.
    """
    # --- MOCK USER FOR TESTING (Simulate a specific Field Manager) ---
    class MockUser:
        role = "FieldManager" # IMPORTANT: Set role to FieldManager
        user_id = "fm_mock_id_1" # Use a consistent mock ID for testing
    current_user = MockUser()
    # ----------------------------------------------------------------

    plot_table = db.get_table(db.PLOT_TABLE_NAME)
    if not plot_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB plot table not available")

    try:
        if current_user.role == "FieldManager":
            print(f"Querying plots for Field Manager: {current_user.user_id}")
            # Query the GSI to get only plots assigned to this manager
            response = plot_table.query(
                IndexName='FieldManagerIdIndex', # The GSI we created
                KeyConditionExpression='field_manager_id = :fm_id',
                ExpressionAttributeValues={
                    ':fm_id': current_user.user_id
                }
            )
        # Add 'elif current_user.role == "FarmManager":' later if needed
        else:
            print(f"Access denied for role: {current_user.role}")
            # Field Managers should only see their own plots
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this role.")

        items = response.get('Items', [])
        print(f"Found {len(items)} plots for {current_user.user_id}")

        # --- Data Type Handling ---
        processed_items = []
        for item in items:
            item['id'] = item.pop('plot_id') # Rename key for schema
            # Add any other cleaning if needed (e.g., converting Decimals)
            processed_items.append(item)

        return processed_items

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'ResourceNotFoundException':
             print(f"ERROR: GSI 'FieldManagerIdIndex' not found or table '{db.PLOT_TABLE_NAME}' does not exist.")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database index configuration error.")
        else:
            print(f"ERROR during plot query: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query failed: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

# We don't need POST /plots for the Field Manager role,
# so we'll comment it out for now.
# @router.post("/", ...)
# async def create_plot(...):
#    ...