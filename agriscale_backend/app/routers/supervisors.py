# app/routers/supervisors.py
from fastapi import APIRouter, HTTPException, status,Path, Response,Depends
from typing import List, Dict, Any, Tuple
from .. import schemas
from .. import db
from .. import dependencies
import uuid
# from datetime import datetime # Import if you add timestamps

router = APIRouter(
    prefix="/supervisors",
    tags=["Supervisors"]
)

# app/routers/supervisors.py

@router.get("/", response_model=List[schemas.Supervisor])
async def read_supervisors(): # <--- This one is correct
    """
    Retrieve a list of supervisors based on the user's role (Hierarchy Access Control).
    FarmManager sees all. FieldManager sees only assigned supervisors.
    """
    
    # --- This one is correct ---
    class MockUser:
        role = "FarmManager" # Hardcode to "FarmManager" to see all
        user_id = "mock_user_id"
    current_user = MockUser()
    # ------------------------------------------
    
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)
    if not supervisor_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB supervisor table not available")

    # --- DYNAMODB ACCESS STRATEGY (Filtering) ---
    try:
        if current_user.role == "FarmManager":
            # FM sees ALL supervisors (using scan)
            print(f"Access: FarmManager {current_user.user_id} (scanning all)")
            response = supervisor_table.scan() 
        elif current_user.role == "FieldManager":
            # FdM sees ONLY assigned supervisors (Requires a GSI on 'field_manager_id')
            print(f"Access: FieldManager {current_user.user_id} (querying index)")
            
            # NOTE: You MUST create a Global Secondary Index (GSI) named 'FieldManagerIdIndex' 
            # in DynamoDB using 'field_manager_id' as the Partition Key for this to be efficient.
            response = supervisor_table.query(
                IndexName='FieldManagerIdIndex', # <-- REPLACE WITH YOUR ACTUAL GSI NAME
                KeyConditionExpression='field_manager_id = :fm_id',
                ExpressionAttributeValues={
                    ':fm_id': current_user.user_id # e.g., 'fdm-1'
                }
            )
        else:
            # Deny access to other roles (e.g., Supervisor role shouldn't list all supervisors)
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Access denied for role {current_user.role}.")
        
        # Collect items (simplified pagination check for prototyping)
        items = response.get('Items', [])
        
        # --- Data Type Handling (as before) ---
        response_items = []
        for item in items:
            item['id'] = item.pop('sup_id', None)
            
            # --- ADD THIS FIX ---
            # Clean empty date strings (just in case, good practice)
            if item.get('last_updated') == '':
                item['last_updated'] = None
            # --------------------

            if item['id']:
                 if 'phone' in item and item['phone'] is not None:
                     item['phone'] = str(item['phone'])
                 response_items.append(item)
        
        print(f"Returned {len(response_items)} items for user {current_user.user_id}")
        return response_items
        
    except Exception as e:
        print(f"ERROR during access check/query: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query failed: {e}")
# ---------------------------------------------

@router.post("/", response_model=schemas.Supervisor, status_code=status.HTTP_201_CREATED)
async def create_supervisor(
    supervisor: schemas.SupervisorCreate, # <--- This one is correct
):
    """
    Create a new supervisor. Only allowed by managers (FarmManager/FieldManager).
    Automatically sets field_manager_id if not provided and user is FieldManager.
    """

    # --- This one is correct ---
    class MockUser:
        role = "FarmManager" 
        user_id = "mock_user_id"
    current_user = MockUser()
    # ---

    # 1. Role Check
    if current_user.role not in ["FarmManager", "FieldManager"]:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                             detail=f"Permission denied. Only managers can create supervisors. Current role: {current_user.role}.")
    
    # 2. Database Check
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)
    if not supervisor_table:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB supervisor table not available")

    new_id = str(uuid.uuid4())
    item_data = supervisor.model_dump()
    item_data['sup_id'] = new_id # Use sup_id for DynamoDB

    # 3. Final Hierarchy Enforcement (Auto-set FdM ID)
    # If the user is a Field Manager AND they didn't manually set a field_manager_id in the payload, 
    # link the new supervisor to the creating Field Manager.
    if current_user.role == "FieldManager" and not item_data.get('field_manager_id'):
         item_data['field_manager_id'] = current_user.user_id # Auto-link to the creator's ID
         
    # 4. Standard Saving Logic...
    # ... (rest of the saving logic remains the same)
    
    # Ensure phone number is stored as string
    if 'phone' in item_data and item_data['phone'] is not None:
         item_data['phone'] = str(item_data['phone'])

    try:
        print(f"Putting item into {db.SUPERVISOR_TABLE_NAME}: {item_data}")
        supervisor_table.put_item(Item=item_data)
        print("Item put successfully.")

        # Prepare data for return (rename and convert types)
        return_data = item_data.copy()
        return_data['id'] = return_data.pop('sup_id') 
        
        # Ensure phone is string for response
        if 'phone' in return_data and return_data['phone'] is not None:
             return_data['phone'] = str(return_data['phone']) 

        return return_data
    except Exception as e:
        print(f"ERROR putting item into DynamoDB table {db.SUPERVISOR_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not create supervisor: {e}")
    
@router.get("/{sup_id}", response_model=schemas.Supervisor)
async def read_supervisor(sup_id: str = Path(..., description="The ID (sup_id) of the supervisor to retrieve")):
    """
    Retrieve details for a specific supervisor by their ID.
    """
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)
    if not supervisor_table:
        print(f"ERROR in read_supervisor: Could not get table '{db.SUPERVISOR_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB supervisor table not available")

    try:
        # Use get_item to fetch a single item by its primary key
        response = supervisor_table.get_item(Key={'sup_id': sup_id})
        item = response.get('Item')

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supervisor with id {sup_id} not found")

        print(f"Successfully retrieved supervisor {sup_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        item['id'] = item.pop('sup_id', None)

        # Ensure required fields exist (provide defaults, though get_item should return full item if found)
        item.setdefault('name', 'Unknown Name')
        item.setdefault('email', 'unknown@example.com')
        item.setdefault('assigned_plots', [])

        # Convert Decimal/Number to string for phone
        if 'phone' in item and item['phone'] is not None:
            item['phone'] = str(item['phone'])
        else:
            item.setdefault('phone', 'N/A')
        # ------------------------------------

        return item
    except Exception as e:
        print(f"ERROR retrieving item {sup_id} from DynamoDB table {db.SUPERVISOR_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException): # Don't mask existing HTTPExceptions
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not retrieve supervisor: {e}")
# -----------------------

@router.put("/{sup_id}", response_model=schemas.Supervisor)
async def update_supervisor(
    sup_id: str = Path(..., description="The ID (sup_id) of the supervisor to update"),
    supervisor_update: schemas.SupervisorUpdate = ...,
):
    """
    Update details (name, email, phone, assigned_plots) for an existing supervisor.
    """
    
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)
    if not supervisor_table:
        print(f"ERROR in update_supervisor: Could not get table '{db.SUPERVISOR_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB supervisor table not available")

    # Prepare update parameters dynamically
    update_expression_parts = []
    expression_attribute_names = {}
    expression_attribute_values = {}
    
    # Use model_dump(exclude_none=True) to only get fields explicitly sent in the request
    update_data = supervisor_update.model_dump(exclude_none=True)
    
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided for update.")

    for key, value in update_data.items():
        # Use placeholders to prevent DynamoDB reserved word issues
        attr_name_placeholder = f"#{key}_attr"
        attr_value_placeholder = f":{key}_val"
        
        update_expression_parts.append(f"{attr_name_placeholder} = {attr_value_placeholder}")
        expression_attribute_names[attr_name_placeholder] = key
        
        # Handle Decimal conversion for phone number if needed (optional based on your schema, 
        # but safe to convert for DynamoDB write if the schema were a number)
        if key == 'phone':
             expression_attribute_values[attr_value_placeholder] = str(value)
        else:
             expression_attribute_values[attr_value_placeholder] = value

    update_expression = "SET " + ", ".join(update_expression_parts)

    try:
        response = supervisor_table.update_item(
            Key={'sup_id': sup_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW"
        )
        updated_item = response.get('Attributes')
        
        if not updated_item:
             # If the item wasn't found, update_item usually raises a 404/Validation error, 
             # but this catch handles cases where Attributes is empty.
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supervisor with id {sup_id} not found.")

        print(f"Successfully updated details for supervisor {sup_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        updated_item['id'] = updated_item.pop('sup_id', None)

        # Convert Decimal/Number back to string for phone
        if 'phone' in updated_item and updated_item['phone'] is not None:
             updated_item['phone'] = str(updated_item['phone'])
        # ------------------------------------

        return updated_item
    except supervisor_table.meta.client.exceptions.ResourceNotFoundException:
         # This exception is typically for the table itself, but we include it
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supervisor with id {sup_id} not found.")
    except Exception as e:
        print(f"ERROR updating item {sup_id} in DynamoDB table {db.SUPERVISOR_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update supervisor: {e}")
# ---------------------------------------------

# --- I REMOVED THE DUPLICATE create_supervisor FUNCTION THAT WAS HERE ---

@router.delete("/{sup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supervisor(
    sup_id: str = Path(..., description="The ID (sup_id) of the supervisor to delete"),
):
    """
    Delete a specific supervisor item by its ID.
    """
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)
    if not supervisor_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB supervisor table not available")

    try:
        # Use delete_item operation
        response = supervisor_table.delete_item(
            Key={'sup_id': sup_id},
            ReturnValues="ALL_OLD" # Asks DynamoDB to return the deleted item
        )
        
        # Check if an item was actually deleted (if the 'Attributes' key is missing, it means nothing was there)
        if 'Attributes' not in response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supervisor with id {sup_id} not found.")

        print(f"Successfully deleted supervisor {sup_id}")
        return Response(status_code=status.HTTP_204_NO_CONTENT) # Return 204 No Content
        
    except Exception as e:
        print(f"ERROR deleting item {sup_id} from DynamoDB table {db.SUPERVISOR_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not delete supervisor: {e}")
# -----------------------

@router.get("/metrics", response_model=List[schemas.SupervisorPerformance])
async def get_supervisor_metrics(): # <--- 1. REMOVED dependency
    """
    Retrieves task completion metrics (% score) for supervisors under the current user's hierarchy.
    This endpoint calculates (Completed Tasks / Total Tasks) * 100 for each relevant supervisor.
    """
    
    # --- 2. ADDED MockUser block ---
    class MockUser:
        role = "FarmManager" 
        user_id = "mock_user_id"
    current_user = MockUser()
    # ---------------------------------

    task_table = db.get_table(db.TASK_TABLE_NAME)
    supervisor_table = db.get_table(db.SUPERVISOR_TABLE_NAME)

    if not task_table or not supervisor_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                            detail="Required DynamoDB tables are not available for metrics calculation.")

    try:
        # Step 1: Identify all relevant supervisor IDs for the current user
        supervisor_map: Dict[str, str] = {} # {sup_id: sup_name}

        if current_user.role == "FarmManager":
            # FM: Fetch ALL supervisors
            sup_response = supervisor_table.scan(AttributesToGet=['sup_id', 'name'])
        elif current_user.role == "FieldManager":
            # FdM: Fetch only assigned supervisors (Requires GSI)
            sup_response = supervisor_table.query(
                IndexName='FieldManagerIdIndex', # <-- YOUR ACTUAL GSI NAME
                KeyConditionExpression='field_manager_id = :fm_id',
                ExpressionAttributeValues={':fm_id': current_user.user_id},
                AttributesToGet=['sup_id', 'name']
            )
        else:
            # Supervisor: Only calculate score for self
            # Requires a separate call to get the name, but simplified here
            return [] # For now, block other roles from viewing team performance metrics

        # Map IDs to Names
        for item in sup_response.get('Items', []):
             supervisor_map[item['sup_id']] = item.get('name', 'N/A')

        if not supervisor_map:
            return [] # No supervisors found for this manager

        # Step 2: Fetch ALL relevant tasks (Required GSI on Tasks table)
        # This logic is highly simplified for prototyping; a real app needs batched queries/scans

        # Note: Since the Tasks table is already filtered by access control in GET /tasks/,
        # we are performing a scan here on the tasks table, assuming its GSI mirrors supervisor mapping.
        # However, for metric aggregation, we must query the Tasks table itself.

        # Use the FdM's visibility list (supervisor_map keys) to query tasks
        sup_ids_list = list(supervisor_map.keys())

        # This is complex filtering for prototyping. We'll use a less optimized approach here:
        task_response = task_table.scan(
            FilterExpression=f"supervisor_id IN ({','.join([':id'+str(i) for i in range(len(sup_ids_list))])})",
            ExpressionAttributeValues={f":id{i}": id_val for i, id_val in enumerate(sup_ids_list)}
        )
        all_tasks = task_response.get('Items', [])

        # Step 3: Aggregate Tasks
        metrics: Dict[str, Dict[str, Any]] = {}
        for task in all_tasks:
            sup_id = task['supervisor_id']
            status_val = task['status'].lower()

            if sup_id not in metrics:
                metrics[sup_id] = {'total_tasks': 0, 'completed_tasks': 0, 'name': supervisor_map.get(sup_id, 'N/A')}

            metrics[sup_id]['total_tasks'] += 1
            if status_val == 'completed':
                metrics[sup_id]['completed_tasks'] += 1

        # Step 4: Calculate Percentage and Finalize Output
        final_metrics = []
        for sup_id, data in metrics.items():
            total = data['total_tasks']
            completed = data['completed_tasks']
            percentage = (completed / total) * 100 if total > 0 else 0.0

            final_metrics.append({
                "supervisor_id": sup_id,
                "total_tasks": total,
                "completed_tasks": completed,
                "completion_percentage": round(percentage, 2),
                "name": data['name']
            })

        return final_metrics

    except Exception as e:
        print(f"ERROR calculating supervisor metrics: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Metrics calculation failed: {e}")
# -----------------------------------------