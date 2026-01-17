"""Authentication routes: register, login, refresh, logout."""

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)

router = APIRouter()


# --- Request/Response Schemas ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


# --- Temporary in-memory store (replace with DB) ---

# TODO: Replace with actual database
_users_db: dict[str, dict] = {}


# --- Routes ---


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> AuthResponse:
    """Register a new teacher account."""
    # Check if user exists
    if request.email in _users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    import uuid
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "password_hash": hash_password(request.password),
    }
    _users_db[request.email] = user

    # Generate tokens
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)

    return AuthResponse(
        user=UserResponse(id=user_id, email=request.email, name=request.name),
        tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token),
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    """Authenticate and receive tokens."""
    # Find user
    user = _users_db.get(request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Generate tokens
    access_token = create_access_token(subject=user["id"])
    refresh_token = create_refresh_token(subject=user["id"])

    return AuthResponse(
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"]),
        tokens=TokenResponse(access_token=access_token, refresh_token=refresh_token),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(request: RefreshRequest) -> TokenResponse:
    """Exchange a refresh token for new access and refresh tokens."""
    payload = decode_token(request.refresh_token)

    if payload is None or not verify_token_type(payload, "refresh"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Generate new tokens
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
async def logout() -> dict[str, str]:
    """
    Logout (client-side token invalidation).

    Note: With stateless JWTs, true server-side logout requires a token
    blocklist in Redis. For now, client should discard tokens.
    """
    # TODO: Add refresh token to Redis blocklist
    return {"message": "Successfully logged out"}
