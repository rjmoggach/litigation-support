#!/usr/bin/env python3
"""Script to create admin user"""

from sqlalchemy.orm import Session
from core.database import SessionLocal, engine, Base
from users.models import User
from passlib.context import CryptContext
import sys

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user(email: str, password: str):
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User {email} already exists")
            # Update to admin if not already
            existing_user.is_superuser = True
            existing_user.is_active = True
            existing_user.is_verified = True
            if hasattr(existing_user, 'add_role'):
                existing_user.add_role("admin")
            db.commit()
            print(f"✅ Updated {email} to admin role")
        else:
            # Create new admin user
            hashed_password = pwd_context.hash(password)
            admin_user = User(
                email=email,
                username=email.split('@')[0],
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=True,
                is_verified=True
            )
            if hasattr(admin_user, 'add_role'):
                admin_user.add_role("admin")
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(f"✅ Created admin user {email}")
            print(f"   ID: {admin_user.id}")
            print(f"   Username: {admin_user.username}")
            print(f"   Is Admin: {admin_user.is_superuser}")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user("rjmoggach@gmail.com", "Passw0rd")