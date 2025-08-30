#!/usr/bin/env python3
"""Script to set admin role for specific user"""

from sqlalchemy.orm import Session
from core.database import SessionLocal
from users.models import User
import json

def set_admin_role(email: str):
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Set admin role
            user.add_role("admin")
            user.is_superuser = True  # Keep backward compatibility
            db.commit()
            print(f"✅ User {email} now has admin role")
            print(f"   Roles: {user.roles}")
        else:
            print(f"❌ User {email} not found")
    finally:
        db.close()

if __name__ == "__main__":
    set_admin_role("rjmoggach@gmail.com")