from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "operator"

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
