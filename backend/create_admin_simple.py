#!/usr/bin/env python3
"""Simple script to create admin user"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import os

# Database URL from environment or default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:localdev123@postgres:5432/litigation_support_local")

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        result = db.execute(text("SELECT id, email FROM users WHERE email = :email"), {"email": "rjmoggach@gmail.com"})
        existing_user = result.fetchone()
        
        if existing_user:
            print(f"User rjmoggach@gmail.com already exists with ID: {existing_user[0]}")
            # Update to admin
            db.execute(
                text("UPDATE users SET is_superuser = true, is_active = true, is_verified = true WHERE email = :email"),
                {"email": "rjmoggach@gmail.com"}
            )
            db.commit()
            print("✅ Updated user to admin role")
        else:
            # Create new admin user
            hashed_password = pwd_context.hash("Passw0rd")
            db.execute(text("""
                INSERT INTO users (email, full_name, hashed_password, is_active, is_superuser, is_verified, roles, created_at, updated_at)
                VALUES (:email, :full_name, :password, true, true, true, :roles, NOW(), NOW())
            """), {
                "email": "rjmoggach@gmail.com",
                "full_name": "RJ Moggach",
                "password": hashed_password,
                "roles": '["admin"]'
            })
            db.commit()
            print("✅ Created admin user rjmoggach@gmail.com")
            print("   Password: Passw0rd")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()