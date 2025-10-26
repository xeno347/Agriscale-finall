# app/dependencies.py
from fastapi import Header, HTTPException, status, Depends
from typing import Optional
from .schemas import CurrentUser

# MOCK USER DATABASE (For testing access logic)
MOCK_USERS = {
    "fm-token": CurrentUser(user_id="fm-1", role="FarmManager"),
    "fdm-token": CurrentUser(user_id="fdm-1", role="FieldManager"),
    "sup-token": CurrentUser(user_id="sup-1", role="Supervisor"),
}

async def get_current_user(x_access_token: Optional[str] = Header(None)) -> CurrentUser:
    """
    Retrieves user identity based on a header token.
    (Mocks actual IAM/JWT validation for the prototype).
    """
    if x_access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: X-Access-Token header missing.",
        )

    # In a real app, you would validate the JWT token here
    # For the prototype, we check against our mock database:
    if x_access_token not in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired token.",
        )

    return MOCK_USERS[x_access_token]

def check_role(required_role: str):
    """Creates a dependency function to check if the user has the required role."""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role != required_role:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires role {required_role}.",
            )
        return current_user
    return role_checker

# Note: Requires the 'Depends' utility from FastAPI to work in the router.
# We will assume it's imported in the router files for simplicity here.