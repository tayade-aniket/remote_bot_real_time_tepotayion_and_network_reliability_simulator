from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import User
from app.schemas.auth import LoginRequest, Token, UserCreate, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, verify_access_token
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import uuid

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        # Development fallback demo user
        return {"id": "usr_demo", "username": "operator_demo", "role": "operator"}
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"id": payload.get("id", "usr_1"), "username": payload["sub"], "role": payload.get("role", "operator")}

@router.post("/login", response_model=Token)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    # Standard credentials check or auto-provision demo users for development
    user = db.query(User).filter(User.username == creds.username).first()
    if not user:
        # Auto-provision demo operator/admin/viewer for painless development
        if creds.username in ["admin", "operator", "operator_alice", "operator_bob", "viewer_guest"] or creds.username.startswith("operator_"):
            user = User(
                id=f"usr_{uuid.uuid4().hex[:8]}",
                username=creds.username,
                hashed_password=hash_password(creds.password),
                role="admin" if "admin" in creds.username else "operator"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
            
    if not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
        
    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return Token(access_token=token, username=user.username, role=user.role)

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
