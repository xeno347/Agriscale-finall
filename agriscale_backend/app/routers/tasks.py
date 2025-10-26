# app/routers/tasks.py
from fastapi import APIRouter, HTTPException, status , Path, Response,Depends
from typing import List
from .. import schemas
from .. import db
from datetime import date, datetime
import uuid
from ..import dependencies
from decimal import Decimal

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)

# app/routers/tasks.py

@router.get("/", response_model=List[schemas.Task])
async def read_tasks(): # Correct: No dependency here
    """
    Retrieve a list of tasks based on the user's role (Hierarchy Access Control).
    FM sees all. FdM sees tasks assigned to their supervisors.
    """

    # --- 2. ADD THIS MOCK USER FOR TESTING ---
    class MockUser:
        role = "FarmManager" # Hardcode to "FarmManager" to see all tasks
        user_id = "mock_user_id"
    current_user = MockUser()
    # ------------------------------------------

    task_table = db.get_table(db.TASK_TABLE_NAME)
    if not task_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB task table not available")

    # --- DYNAMODB ACCESS STRATEGY ---
    try:
        if current_user.role == "FarmManager":
            # FM sees ALL tasks (Scanning all is inefficient, but simple prototype)
            print("Access: FarmManager (scanning all tasks)")
            response = task_table.scan() 
        elif current_user.role == "FieldManager":
            # FdM should see tasks based on supervisor_id. 
            # This requires a GSI on the 'supervisor_id' attribute in DynamoDB.
            print(f"Access: FieldManager {current_user.user_id} (querying tasks index)")

            # NOTE: ASSUMING A GSI NAMED 'SupervisorIdIndex' EXISTS ON supervisor_id
            response = task_table.query(
                IndexName='SupervisorIdIndex', # <-- REPLACE WITH ACTUAL GSI NAME
                KeyConditionExpression='supervisor_id = :sup_id',
                ExpressionAttributeValues={
                    ':sup_id': current_user.user_id # FdM sees tasks they assigned/manage (using their ID for now)
                }
            )
        else:
             # Deny access to other roles (or modify as required)
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied for this role.")

        # Collect items (simplified pagination check for prototyping)
        items = response.get('Items', [])

        # --- Data Type Handling (as before) ---
        processed_items = []
        for item in items:
            
            # --- START OF FIX ---
            
            # 1. Clean empty date strings
            if item.get('due_date') == '':
                item['due_date'] = None

            # 2. Check if the correct 'supervisor_id' field already exists
            supervisor_id = item.get('supervisor_id')
            
            if not supervisor_id:
                # If it doesn't, THEN try to get it from the old 'sup_id' field
                supervisor_id = item.pop('sup_id', 'unassigned')
            
            # 3. If it's still empty (e.g., was an empty string), set a default
            if not supervisor_id:
                supervisor_id = 'unassigned'
                
            item['supervisor_id'] = supervisor_id # Set the final, clean value
            
            # --- END OF FIX ---

            # Rename 'task_id' (from DB) to 'id' (for Pydantic schema)
            item['id'] = item.pop('task_id', None)
            
            if item['id']:
                # Handle data conversion/defaults here
                processed_items.append(item)

        print(f"Returned {len(processed_items)} tasks for user {current_user.user_id}")
        return processed_items

    except Exception as e:
        print(f"ERROR during access check/query for tasks: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query failed: {e}")
    

@router.post("/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
async def create_task(task: schemas.TaskCreate):
    """Create a new task in DynamoDB."""
    task_table = db.get_table(db.TASK_TABLE_NAME) # TASK_TABLE_NAME should be "Tasks" in db.py
    if not task_table:
        print(f"ERROR in create_task: Could not get table '{db.TASK_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB task table not available")

    new_id = str(uuid.uuid4())
    item_data = task.model_dump()

    # --- CHANGE 2: Use task_id for DynamoDB item ---
    # item_data['id'] = new_id # Remove or comment this
    item_data['task_id'] = new_id # Use task_id here
    # ---------------------------------------------

    if item_data.get('due_date') and isinstance(item_data['due_date'], date):
        item_data['due_date'] = item_data['due_date'].isoformat()

    try:
        print(f"Putting item into {db.TASK_TABLE_NAME}: {item_data}")
        task_table.put_item(Item=item_data)
        print("Item put successfully.")

        # --- CHANGE 3: Rename task_id back to id for response ---
        return_data = item_data.copy()
        return_data['id'] = return_data.pop('task_id')
        # Handle date string conversion back if needed for response
        return return_data
        # --------------------------------------------------------

    except Exception as e:
        print(f"ERROR putting item into DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not create task: {e}")
    
@router.put("/{task_id}", response_model=schemas.Task)
async def update_task_status(
    task_id: str = Path(..., description="The ID of the task to update"),
    task_update: schemas.TaskUpdate = ..., # Get update data from request body
):
    """
    Update the status of an existing task.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    if not task_table:
        print(f"ERROR in update_task_status: Could not get table '{db.TASK_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB task table not available")

    # Use DynamoDB's update_item operation
    try:
        response = task_table.update_item(
            Key={'task_id': task_id}, # Use the correct primary key name 'task_id'
            UpdateExpression="SET #status_attr = :new_status", # Define attribute to set
            ExpressionAttributeNames={'#status_attr': 'status'}, # Use placeholder for reserved words like 'status'
            ExpressionAttributeValues={':new_status': task_update.status}, # Value for the new status
            ReturnValues="ALL_NEW"  # Return the entire item after the update
        )
        updated_item = response.get('Attributes')
        if not updated_item:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found or update failed")

        print(f"Successfully updated status for task {task_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        updated_item['id'] = updated_item.pop('task_id', None)

        # Handle date string conversion back if needed
        due_date_str = updated_item.get('due_date')
        if due_date_str and isinstance(due_date_str, str) and len(due_date_str) > 0:
            try:
                date.fromisoformat(due_date_str) # Validate format
                updated_item['due_date'] = due_date_str # Keep as string for Pydantic response
            except ValueError:
                updated_item['due_date'] = None
        else:
            updated_item['due_date'] = None
        # ------------------------------------

        return updated_item
    except task_table.meta.client.exceptions.ResourceNotFoundException:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found")
    except Exception as e:
        print(f"ERROR updating item in DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update task: {e}")


@router.get("/{task_id}", response_model=schemas.Task)
async def read_task(task_id: str = Path(..., description="The ID of the task to retrieve")):
    """
    Retrieve details for a specific task by its ID.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    if not task_table:
        print(f"ERROR in read_task: Could not get table '{db.TASK_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB task table not available")

    try:
        # Use get_item to fetch a single item by its primary key
        response = task_table.get_item(Key={'task_id': task_id}) # Use the correct primary key 'task_id'
        item = response.get('Item')

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found")

        print(f"Successfully retrieved task {task_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        item['id'] = item.pop('task_id', None)

        # Ensure required fields exist or provide defaults (optional here, as GET should find existing)
        item.setdefault('type', 'Unknown Type')
        item.setdefault('task', 'No description')
        item.setdefault('plot', 'Unassigned')
        item.setdefault('supervisor_id', 'Unassigned')
        item.setdefault('status', 'Pending')

        # Handle date string conversion back if needed
        due_date_str = item.get('due_date')
        if due_date_str and isinstance(due_date_str, str) and len(due_date_str) > 0:
            try:
                date.fromisoformat(due_date_str) # Validate format
                item['due_date'] = due_date_str # Keep as string for Pydantic
            except ValueError:
                item['due_date'] = None
        else:
            item['due_date'] = None
        # ------------------------------------

        return item
    except Exception as e:
        # Catch potential Boto3 errors if needed, e.g., ClientError
        print(f"ERROR retrieving item {task_id} from DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        # Re-raise specific exceptions if needed, otherwise return a generic server error
        if isinstance(e, HTTPException): # Don't mask existing HTTPExceptions
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not retrieve task: {e}")
# -----------------------

@router.post("/", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
async def create_task(task: schemas.TaskCreate):
    """
    Create a new task, performing a stock check if required.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME) # We need the Inventory table too!
    
    if not task_table or not inventory_table:
        print(f"ERROR: DynamoDB tables not configured. Tasks: {db.TASK_TABLE_NAME}, Inventory: {db.INVENTORY_TABLE_NAME}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Required DynamoDB tables are not available.")

    # ----------------------------------------------------
    # --- STOCK CHECK LOGIC ---
    # ----------------------------------------------------
    if task.required_item_id and task.required_quantity is not None:
        required_id = task.required_item_id
        required_qty = task.required_quantity
        
        # 1. Fetch the required inventory item
        inventory_response = inventory_table.get_item(Key={'Invent_id': required_id})
        inventory_item = inventory_response.get('Item')
        
        if not inventory_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                detail=f"Inventory item ID {required_id} not found. Cannot create task.")

        # 2. Extract and convert current stock (DynamoDB stores as Decimal)
        current_stock_decimal = inventory_item.get('stock', Decimal('0'))
        current_stock = float(current_stock_decimal)
        item_unit = inventory_item.get('unit', 'units')

        # 3. Check for sufficient stock
        if current_stock < required_qty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                                detail=f"Insufficient stock for {inventory_item.get('item')}. Needed: {required_qty} {item_unit}, Available: {current_stock} {item_unit}.")

        print(f"Stock check passed for item {required_id}. Available: {current_stock}, Needed: {required_qty}")
    # ----------------------------------------------------

    # ----------------------------------------------------
    # --- TASK CREATION LOGIC ---
    # ----------------------------------------------------
    new_id = str(uuid.uuid4())
    item_data = task.model_dump()
    item_data['task_id'] = new_id # Use task_id for DynamoDB

    # Convert date to string before saving (DynamoDB requirement)
    if item_data.get('due_date') and isinstance(item_data['due_date'], date):
        item_data['due_date'] = item_data['due_date'].isoformat()
        
    # Convert required_quantity to Decimal for DynamoDB storage
    if item_data.get('required_quantity') is not None:
         item_data['required_quantity'] = Decimal(str(item_data['required_quantity']))


    try:
        print(f"Putting item into {db.TASK_TABLE_NAME}: {item_data}")
        task_table.put_item(Item=item_data)
        print("Item put successfully.")

        # Prepare data for return (rename and convert types)
        return_data = item_data.copy()
        return_data['id'] = return_data.pop('task_id')
        if 'required_quantity' in return_data:
             return_data['required_quantity'] = float(return_data['required_quantity'])

        return return_data
    except Exception as e:
        print(f"ERROR putting item into DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not create task: {e}")
    
@router.put("/{task_id}", response_model=schemas.Task)
async def update_task_status(
    task_id: str = Path(..., description="The ID of the task to update"),
    task_update: schemas.TaskUpdate = ..., # Get update data from request body
):
    """
    Update the status of an existing task and atomically decrement inventory if completed.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME) # We need the Inventory table
    
    if not task_table or not inventory_table:
        print(f"ERROR: DynamoDB tables not configured. Tasks: {db.TASK_TABLE_NAME}, Inventory: {db.INVENTORY_TABLE_NAME}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Required DynamoDB tables are not available.")

    # 1. FETCH CURRENT TASK DETAILS (Crucial to know if stock was required)
    try:
        response = task_table.get_item(Key={'task_id': task_id})
        current_task = response.get('Item')
    except Exception as e:
        print(f"ERROR retrieving current task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database access error.")
        
    if not current_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found.")

    # Extract current details needed for stock logic
    new_status = task_update.status
    old_status = current_task.get('status', 'pending')
    required_id = current_task.get('required_item_id')
    required_qty = current_task.get('required_quantity') # This is a Decimal if loaded from DB

    # 2. CHECK FOR STOCK DECREMENT TRIGGER (Status change to 'Completed')
    stock_needs_decrement = (
        new_status.lower() == "completed" and 
        old_status.lower() != "completed" and # Only trigger once
        required_id and 
        required_qty is not None and 
        required_qty > 0
    )

    if stock_needs_decrement:
        item_unit = current_task.get('unit', 'units') 
        
        # Use the Decimal type for the quantity to subtract (DynamoDB number type)
        decrement_decimal = required_qty.copy() * Decimal('-1') 
        
        try:
            # 3. ATOMICALLY DECREMENT STOCK IN INVENTORY TABLE
            inventory_table.update_item(
                Key={'Invent_id': required_id}, # Use the correct Inventory PK
                UpdateExpression="SET #stock = #stock + :change, #last_updated = :ts",
                # Condition: Ensure current stock is >= the absolute required quantity
                ConditionExpression="#stock >= :abs_change", 
                ExpressionAttributeNames={
                    '#stock': 'stock',
                    '#last_updated': 'last_updated'
                },
                ExpressionAttributeValues={
                    ':change': decrement_decimal, # Negative value to subtract
                    ':abs_change': required_qty, # Absolute value to check against stock
                    ':ts': datetime.utcnow().isoformat() + "Z"
                },
                ReturnValues="ALL_NEW"
            )
            print(f"Stock decremented successfully for item {required_id}. Decreased by {required_qty} {item_unit}.")
        except inventory_table.meta.client.exceptions.ConditionalCheckFailedException:
            # If the ConditionExpression fails (stock < required_qty), raise a 400
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete task {task_id}: Insufficient stock. Inventory update aborted."
            )
        except Exception as e:
            print(f"ERROR during inventory update for task {task_id}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inventory update failed: {e}")
    
    # 4. UPDATE TASK STATUS (Only runs if stock check was successful or not needed)
    try:
        response = task_table.update_item(
            Key={'task_id': task_id},
            UpdateExpression="SET #status_attr = :new_status",
            ExpressionAttributeNames={'#status_attr': 'status'},
            ExpressionAttributeValues={':new_status': new_status},
            ReturnValues="ALL_NEW"
        )
        updated_item = response.get('Attributes')
        
        if not updated_item:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found or update failed")

        print(f"Successfully updated status for task {task_id}")

        # Data Type Handling for Response
        updated_item['id'] = updated_item.pop('task_id', None)

        due_date_str = updated_item.get('due_date')
        if due_date_str and isinstance(due_date_str, str) and len(due_date_str) > 0:
            try:
                date.fromisoformat(due_date_str)
                updated_item['due_date'] = due_date_str 
            except ValueError:
                updated_item['due_date'] = None
        else:
            updated_item['due_date'] = None
        
        if 'required_quantity' in updated_item and isinstance(updated_item['required_quantity'], Decimal):
             updated_item['required_quantity'] = float(updated_item['required_quantity'])

        return updated_item
    except task_table.meta.client.exceptions.ResourceNotFoundException:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found")
    except Exception as e:
        print(f"ERROR updating item in DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update task: {e}")
    
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str = Path(..., description="The ID of the task to delete"),
):
    """
    Delete a specific task item by its ID.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    if not task_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB task table not available")

    try:
        response = task_table.delete_item(
            Key={'task_id': task_id},
            ReturnValues="ALL_OLD"
        )
        
        if 'Attributes' not in response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found.")

        print(f"Successfully deleted task {task_id}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        print(f"ERROR deleting item {task_id} from DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not delete task: {e}")
# -----------------------

@router.put("/{task_id}", response_model=schemas.Task)
async def update_task_status(
    task_id: str = Path(..., description="The ID of the task to update"),
    task_update: schemas.TaskUpdate = ..., # Get update data from request body
):
    """
    Update the status of an existing task and atomically decrement inventory if completed.
    """
    task_table = db.get_table(db.TASK_TABLE_NAME)
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME) # We need the Inventory table
    
    if not task_table or not inventory_table:
        print(f"ERROR: DynamoDB tables not configured. Tasks: {db.TASK_TABLE_NAME}, Inventory: {db.INVENTORY_TABLE_NAME}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Required DynamoDB tables are not available.")

    # 1. FETCH CURRENT TASK DETAILS 
    try:
        response = task_table.get_item(Key={'task_id': task_id})
        current_task = response.get('Item')
    except Exception as e:
        print(f"ERROR retrieving current task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database access error.")
        
    if not current_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found.")

    # Extract current details needed for stock logic
    new_status = task_update.status
    old_status = current_task.get('status', 'pending')
    required_id = current_task.get('required_item_id')
    required_qty = current_task.get('required_quantity') # This is a Decimal if loaded from DB

    # 2. CHECK FOR STOCK DECREMENT TRIGGER (Status change to 'Completed')
    stock_needs_decrement = (
        new_status.lower() == "completed" and 
        old_status.lower() != "completed" and # Only trigger once
        required_id and 
        required_qty is not None and 
        # Check if required_qty is a Decimal and greater than zero before proceeding
        isinstance(required_qty, Decimal) and 
        required_qty > 0
    )

    if stock_needs_decrement:
        item_unit = inventory_table.get_item(Key={'Invent_id': required_id}).get('Item', {}).get('unit', 'units') 
        
        # Use the Decimal type for the quantity to subtract (DynamoDB number type)
        decrement_decimal = required_qty.copy() * Decimal('-1') 
        
        try:
            # 3. ATOMICALLY DECREMENT STOCK IN INVENTORY TABLE
            inventory_table.update_item(
                Key={'Invent_id': required_id}, # Use the correct Inventory PK
                UpdateExpression="SET #stock = #stock + :change, #last_updated = :ts",
                # Condition: Ensure current stock is >= the required quantity before subtracting
                ConditionExpression="#stock >= :abs_change", 
                ExpressionAttributeNames={
                    '#stock': 'stock',
                    '#last_updated': 'last_updated'
                },
                ExpressionAttributeValues={
                    ':change': decrement_decimal, # Negative value to subtract
                    ':abs_change': required_qty, # Absolute value to check against stock
                    ':ts': datetime.utcnow().isoformat() + "Z"
                },
                ReturnValues="ALL_NEW"
            )
            print(f"Stock decremented successfully for item {required_id}. Decreased by {required_qty} {item_unit}.")
        except inventory_table.meta.client.exceptions.ConditionalCheckFailedException:
            # If the ConditionExpression fails (stock < required_qty), raise a 400
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete task {task_id}: Insufficient stock. Inventory update aborted."
            )
        except Exception as e:
            print(f"ERROR during inventory update for task {task_id}: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inventory update failed: {e}")
    
    # 4. UPDATE TASK STATUS (Only runs if stock check was successful or not needed)
    try:
        response = task_table.update_item(
            Key={'task_id': task_id},
            UpdateExpression="SET #status_attr = :new_status",
            ExpressionAttributeNames={'#status_attr': 'status'},
            ExpressionAttributeValues={':new_status': new_status},
            ReturnValues="ALL_NEW"
        )
        updated_item = response.get('Attributes')
        
        if not updated_item:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found or update failed")

        print(f"Successfully updated status for task {task_id}")

        # Data Type Handling for Response (essential for Pydantic schema)
        updated_item['id'] = updated_item.pop('task_id', None)

        due_date_str = updated_item.get('due_date')
        if due_date_str and isinstance(due_date_str, str) and len(due_date_str) > 0:
            try:
                date.fromisoformat(due_date_str)
                updated_item['due_date'] = due_date_str 
            except ValueError:
                updated_item['due_date'] = None
        else:
            updated_item['due_date'] = None
        
        if 'required_quantity' in updated_item and isinstance(updated_item['required_quantity'], Decimal):
             updated_item['required_quantity'] = float(updated_item['required_quantity'])

        return updated_item
    except task_table.meta.client.exceptions.ResourceNotFoundException:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with id {task_id} not found")
    except Exception as e:
        print(f"ERROR updating item in DynamoDB table {db.TASK_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update task: {e}")