# app/routers/inventory.py
from fastapi import APIRouter, HTTPException, status, Path, Response,Depends
from .. import dependencies
from typing import List
from .. import schemas
from .. import db
from datetime import datetime
import uuid
from decimal import Decimal

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)

@router.get("/", response_model=List[schemas.InventoryItem])
async def read_inventory_items(
     # Inject current user info
):
    """Retrieve a list of all inventory items, restricted to managers."""
    #--- 2. ADD THIS MOCK USER FOR TESTING ---
    class MockUser:
        role = "FarmManager" # Hardcode to "FarmManager" to see all items
        user_id = "mock_user_id"
    current_user = MockUser()
    # --

    # --- ACCESS CONTROL CHECK ---
    if current_user.role not in ["FarmManager", "FieldManager"]:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                             detail="Access denied. Only Farm Managers and Field Managers can view inventory.")
    # ----------------------------
    
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME) # Should be "Inventory" in db.py
    if not inventory_table:
        print(f"ERROR in read_inventory_items: Could not get table '{db.INVENTORY_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB inventory table not available")

    # --- DYNAMODB SCAN LOGIC (same as before) ---
    try:
        print(f"Scanning table: {db.INVENTORY_TABLE_NAME}")
        response = inventory_table.scan()
        items = response.get('Items', [])
        # ... (rest of scan logic, data handling, and return remains the same) ...

        # --- Data Type Handling ---
        processed_items = []
        for item in items:
            # Rename primary key
            item['id'] = item.pop('Invent_id', None)
            # ... (rest of type conversions) ...
            
            processed_items.append(item)

        return processed_items
    except Exception as e:
        print(f"ERROR scanning DynamoDB table {db.INVENTORY_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not fetch inventory items: {e}")
# Keep the create_inventory_item function below as it was
@router.post("/", response_model=schemas.InventoryItem, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(item: schemas.InventoryItemCreate):
    """Create a new inventory item in DynamoDB."""
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME) # Should be "Inventory" in db.py
    if not inventory_table:
         print(f"ERROR in create_inventory_item: Could not get table '{db.INVENTORY_TABLE_NAME}'")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB inventory table not available")

    new_id = str(uuid.uuid4())
    item_data = item.model_dump()
    item_data['Invent_id'] = new_id
    item_data['last_updated'] = datetime.utcnow().isoformat() + "Z" # Store as ISO string with Z for UTC

    if 'stock' in item_data:
        item_data['stock'] = Decimal(str(item_data['stock']))
    if 'threshold' in item_data:
        item_data['threshold'] = Decimal(str(item_data['threshold']))

    try:
        print(f"Putting item into {db.INVENTORY_TABLE_NAME}: {item_data}")
        inventory_table.put_item(Item=item_data)
        print("Item put successfully.")

        response_data = item_data.copy()
        response_data['id'] = response_data.pop('Invent_id')
        if 'stock' in response_data:
            response_data['stock'] = float(response_data['stock'])
        if 'threshold' in response_data:
            response_data['threshold'] = float(response_data['threshold'])

        return response_data
    except Exception as e:
        print(f"ERROR putting item into DynamoDB table {db.INVENTORY_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not create inventory item: {e}")
    
@router.get("/{Invent_id}", response_model=schemas.InventoryItem)
async def read_inventory_item(Invent_id: str = Path(..., description="The ID (Invent_id) of the inventory item to retrieve")):
    """
    Retrieve details for a specific inventory item by its ID.
    """
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME)
    if not inventory_table:
        print(f"ERROR in read_inventory_item: Could not get table '{db.INVENTORY_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB inventory table not available")

    try:
        # Use get_item to fetch a single item by its primary key
        response = inventory_table.get_item(Key={'Invent_id': Invent_id})
        item = response.get('Item')

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item with id {Invent_id} not found")

        print(f"Successfully retrieved inventory item {Invent_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        item['id'] = item.pop('Invent_id', None)

        # Ensure required fields exist
        item.setdefault('item', 'Unknown Item')
        item.setdefault('category', 'Uncategorized')
        item.setdefault('unit', 'units')

        # Convert Decimal numbers
        if 'stock' in item and isinstance(item['stock'], Decimal):
             item['stock'] = float(item['stock'])
        else:
             item.setdefault('stock', 0.0)

        if 'threshold' in item and isinstance(item['threshold'], Decimal):
             item['threshold'] = float(item['threshold'])
        else:
             item.setdefault('threshold', 0.0)

        # Handle last_updated string/None
        last_updated_str = item.get('last_updated')
        if not (last_updated_str and isinstance(last_updated_str, str) and len(last_updated_str) > 0):
             item['last_updated'] = None
        # Pydantic should handle valid ISO string conversion to datetime

        # ------------------------------------

        return item
    except Exception as e:
        print(f"ERROR retrieving item {Invent_id} from DynamoDB table {db.INVENTORY_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not retrieve inventory item: {e}")
# -----------------------

@router.put("/{Invent_id}", response_model=schemas.InventoryItem)
async def update_inventory_item(
    Invent_id: str = Path(..., description="The ID (Invent_id) of the item to update"),
    item_update: schemas.InventoryUpdate = ... # Get update data from request body
):
    """
    Update an existing inventory item, primarily stock levels.
    """
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME)
    if not inventory_table:
        print(f"ERROR in update_inventory_item: Could not get table '{db.INVENTORY_TABLE_NAME}'")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB inventory table not available")

    # Construct the DynamoDB update expression dynamically based on input
    update_expression_parts = []
    expression_attribute_names = {}
    expression_attribute_values = {}

    # Update stock level (either by change or setting new value)
    if item_update.stock_change is not None:
        update_expression_parts.append("#stock = #stock + :change") # Additive update
        expression_attribute_names['#stock'] = 'stock'
        expression_attribute_values[':change'] = Decimal(str(item_update.stock_change))
    elif item_update.new_stock is not None:
        update_expression_parts.append("#stock = :new_val") # Overwrite value
        expression_attribute_names['#stock'] = 'stock'
        expression_attribute_values[':new_val'] = Decimal(str(item_update.new_stock))

    # Always update last_updated timestamp
    update_expression_parts.append("#last_updated = :ts")
    expression_attribute_names['#last_updated'] = 'last_updated'
    expression_attribute_values[':ts'] = datetime.utcnow().isoformat() + "Z"

    # --- Add logic here for updating other fields like category, threshold if included in InventoryUpdate ---
    # Example:
    # if item_update.category is not None:
    #     update_expression_parts.append("#category = :cat")
    #     expression_attribute_names['#category'] = 'category'
    #     expression_attribute_values[':cat'] = item_update.category
    # ------------------------------------------------------------------------------------------------------

    if not update_expression_parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields provided")

    update_expression = "SET " + ", ".join(update_expression_parts)

    try:
        response = inventory_table.update_item(
            Key={'Invent_id': Invent_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues="ALL_NEW" # Return the entire item after update
        )
        updated_item = response.get('Attributes')
        if not updated_item:
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item {Invent_id} not found or update failed")

        print(f"Successfully updated inventory item {Invent_id}")

        # --- Data Type Handling for Response ---
        # Rename primary key
        updated_item['id'] = updated_item.pop('Invent_id', None)

        # Convert Decimals back to float
        if 'stock' in updated_item and isinstance(updated_item['stock'], Decimal):
             updated_item['stock'] = float(updated_item['stock'])
        if 'threshold' in updated_item and isinstance(updated_item['threshold'], Decimal):
             updated_item['threshold'] = float(updated_item['threshold'])

        # Ensure last_updated exists and is string (Pydantic handles ISO string -> datetime)
        if not (updated_item.get('last_updated') and isinstance(updated_item['last_updated'], str)):
             updated_item['last_updated'] = None
        # ------------------------------------

        return updated_item
    except inventory_table.meta.client.exceptions.ResourceNotFoundException:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item with id {Invent_id} not found")
    except Exception as e:
        print(f"ERROR updating item {Invent_id} in DynamoDB table {db.INVENTORY_TABLE_NAME}: {e}")
        if isinstance(e, HTTPException):
             raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not update inventory item: {e}")
# -----------------------

@router.delete("/{Invent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    Invent_id: str = Path(..., description="The ID (Invent_id) of the item to delete"),
):
    """
    Delete a specific inventory item by its ID.
    """
    inventory_table = db.get_table(db.INVENTORY_TABLE_NAME)
    if not inventory_table:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DynamoDB inventory table not available")

    try:
        response = inventory_table.delete_item(
            Key={'Invent_id': Invent_id},
            ReturnValues="ALL_OLD"
        )
        
        if 'Attributes' not in response:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory item with id {Invent_id} not found.")

        print(f"Successfully deleted inventory item {Invent_id}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        print(f"ERROR deleting item {Invent_id} from DynamoDB table {db.INVENTORY_TABLE_NAME}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not delete inventory item: {e}")
# -----------------------