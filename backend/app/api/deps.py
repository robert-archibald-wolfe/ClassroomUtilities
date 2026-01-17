"""FastAPI dependencies for authentication, database, and tenant isolation."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token, verify_token_type

# Security scheme
security = HTTPBearer()


async def get_current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> str:
    """Extract and validate user ID from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_current_tenant_id(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> str:
    """
    Get the tenant ID for the current user.

    For now, tenant_id == user_id (single-teacher tenancy).
    Later, this can be extended to support school/district tenants.
    """
    # TODO: Look up tenant from database based on user
    return user_id


# Type aliases for cleaner route signatures
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentTenantId = Annotated[str, Depends(get_current_tenant_id)]


# Database session dependency (placeholder - implement with actual DB)
async def get_db():
    """
    Get database session.

    TODO: Implement with SQLAlchemy async session.
    """
    # from app.db.session import AsyncSessionLocal
    # async with AsyncSessionLocal() as session:
    #     yield session
    yield None  # Placeholder
