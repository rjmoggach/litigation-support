from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import decode_token
from users import models, schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_active_superuser(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


async def get_current_staff_user(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    """Staff access - includes staff, admin roles and superuser"""
    if not (current_user.has_role("staff") or current_user.has_role("admin") or current_user.is_superuser):
        raise HTTPException(
            status_code=403, detail="Staff access required"
        )
    return current_user


async def get_current_admin_user(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    """Admin access - includes admin role and superuser"""
    if not (current_user.has_role("admin") or current_user.is_superuser):
        raise HTTPException(
            status_code=403, detail="Admin access required"
        )
    return current_user