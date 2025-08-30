import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.email import email_service
from core.security import (
    create_access_token,
    create_reset_token,
    create_verification_token,
    decode_token,
    get_password_hash,
    verify_password,
    create_refresh_token,
    hash_refresh_token,
)
from core.storage import get_storage_instance
from storage.models import StoredFile
from users import deps, models, schemas
from images.utils import get_cloudfront_url
from users.models import User
from users.services import (
    check_storage_quota,
    get_or_create_user_profile,
    update_storage_usage,
    get_refresh_token_user,
    store_refresh_token,
    revoke_refresh_token,
    revoke_user_refresh_tokens,
)

router = APIRouter()


@router.post("/auth/register", response_model=schemas.Message)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()

    if user:
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = create_verification_token(user_in.email)

    # Check if this is the first user - if so, make them a superuser
    user_count = db.query(models.User).count()
    is_first_user = user_count == 0
    
    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_active=False,  # User starts inactive until verified
        is_verified=False,
        verification_token=verification_token,
        is_superuser=is_first_user or user_in.is_superuser,  # First user becomes superuser
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Send verification email
    email_service.send_verification_email(user_in.email, verification_token)

    return {"message": "Registration successful. Please check your email to verify your account."}


@router.post("/auth/login", response_model=schemas.TokenWithRefresh)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not verified. Please check your email and verify your account.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive. Please contact support.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    # Create and store refresh token
    raw_refresh_token, token_hash, expires_at = create_refresh_token(user.id)
    store_refresh_token(
        db=db,
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds())
    }


@router.post("/auth/verify-email", response_model=schemas.Message)
def verify_email(verification_data: schemas.EmailVerification, db: Session = Depends(get_db)):
    payload = decode_token(verification_data.token)
    if not payload or payload.get("type") != "verification":
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return {"message": "Email already verified"}

    user.is_verified = True
    user.is_active = True  # Activate user upon verification
    user.verification_token = None
    db.commit()

    return {"message": "Email verified successfully"}


@router.post("/auth/forgot-password", response_model=schemas.Message)
def forgot_password(request_data: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request_data.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a password reset link has been sent"}

    reset_token = create_reset_token(user.email)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    db.commit()

    # Send password reset email
    email_service.send_password_reset_email(user.email, reset_token)

    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/auth/reset-password", response_model=schemas.Message)
def reset_password(reset_data: schemas.PasswordReset, db: Session = Depends(get_db)):
    payload = decode_token(reset_data.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if token matches and hasn't expired
    if (
        not user.reset_token
        or user.reset_token != reset_data.token
        or user.reset_token_expires < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully"}


@router.post("/auth/oauth-login", response_model=schemas.TokenWithUser)
def oauth_login(oauth_data: schemas.OAuthLogin, db: Session = Depends(get_db)):
    """
    OAuth login/signup endpoint that either:
    1. Links OAuth to existing account with same email
    2. Creates new account if email doesn't exist
    """
    import json
    import secrets

    # Find user by email
    user = db.query(models.User).filter(models.User.email == oauth_data.email).first()

    if not user:
        # Create new user with OAuth
        # Generate a secure random password (user won't need it for OAuth login)
        random_password = secrets.token_urlsafe(32)

        user = models.User(
            email=oauth_data.email,
            full_name=oauth_data.name or "",
            hashed_password=get_password_hash(random_password),
            is_active=True,
            is_verified=True,  # OAuth users are pre-verified
            google_id=oauth_data.provider_id if oauth_data.provider == "google" else None,
            oauth_providers=json.dumps([oauth_data.provider]),
            roles='["user"]',  # Default role for new users
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Update OAuth provider information
    if oauth_data.provider == "google":
        user.google_id = oauth_data.provider_id

    # Update oauth_providers list
    providers = []
    if user.oauth_providers:
        try:
            providers = json.loads(user.oauth_providers)
        except:
            providers = []

    if oauth_data.provider not in providers:
        providers.append(oauth_data.provider)
        user.oauth_providers = json.dumps(providers)

    # Mark user as verified since they've authenticated with OAuth
    if not user.is_verified:
        user.is_verified = True
        user.is_active = True

    db.commit()
    db.refresh(user)

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

    # Create and store refresh token
    raw_refresh_token, token_hash, expires_at = create_refresh_token(user.id)
    store_refresh_token(
        db=db,
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )

    # Convert roles from JSON string to list for response
    user_roles = []
    if user.roles:
        try:
            user_roles = json.loads(user.roles)
        except:
            user_roles = ["user"]

    # Get user profile to include avatar URL
    user_profile = get_or_create_user_profile(db, user)
    
    # Get CloudFront URL for avatar if profile picture exists
    avatar_url = None
    if user_profile.profile_picture_file_id:
        from storage.models import StoredFile
        stored_file = db.query(StoredFile).filter(
            StoredFile.id == user_profile.profile_picture_file_id
        ).first()
        if stored_file and stored_file.file_path:
            # Generate CloudFront URL
            import os
            cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', 'media.robertmoggach.com')
            if not cloudfront_domain.startswith('http'):
                cloudfront_domain = f"https://{cloudfront_domain}"
            clean_path = stored_file.file_path.lstrip('/')
            avatar_url = f"{cloudfront_domain}/{clean_path}"

    # Build user response with properly formatted roles
    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "roles": user_roles,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "avatar_url": avatar_url,
    }

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
        "user": user_dict
    }


@router.post("/auth/refresh", response_model=schemas.TokenRefreshResponse)
def refresh_token(
    refresh_data: schemas.TokenRefreshRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using a valid refresh token.
    
    This endpoint allows clients to obtain a new access token without re-authenticating
    by providing a valid refresh token. The refresh token can optionally be rotated
    for enhanced security.
    """
    # Apply rate limiting
    from core.rate_limiter import refresh_token_rate_limit
    refresh_token_rate_limit(request)
    
    # Log refresh attempt for audit purposes
    import logging
    from core.config import settings
    
    logger = logging.getLogger(__name__)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    logger.info(f"Token refresh attempt from IP: {client_ip}")
    
    # Hash the provided refresh token for database lookup
    token_hash = hash_refresh_token(refresh_data.refresh_token)
    
    # Get user associated with this refresh token
    user = get_refresh_token_user(db, token_hash)
    
    if not user:
        logger.warning(f"Invalid refresh token used from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user account is still active
    if not user.is_active:
        logger.warning(f"Refresh token used by inactive user {user.email} from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        logger.warning(f"Refresh token used by unverified user {user.email} from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is not verified",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    # Create new refresh token (token rotation for security)
    raw_refresh_token, new_token_hash, expires_at = create_refresh_token(user.id)
    
    # Store the new refresh token in database
    store_refresh_token(
        db=db,
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=expires_at
    )
    
    # Log successful token refresh
    logger.info(f"Token refresh successful for user {user.email} from IP: {client_ip}")
    
    # Return both new access and refresh tokens
    return {
        "access_token": new_access_token,
        "refresh_token": raw_refresh_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds())
    }


@router.post("/auth/logout", response_model=schemas.Message)
def logout(
    refresh_data: schemas.TokenRefreshRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Logout endpoint that revokes a refresh token.
    
    This endpoint allows clients to securely logout by revoking their refresh token,
    preventing future token refresh operations. Optionally supports revoking all
    tokens for a user for enhanced security.
    """
    # Get client IP for logging
    import logging
    logger = logging.getLogger(__name__)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    logger.info(f"Logout attempt from IP: {client_ip}")
    
    # Hash the provided refresh token for database lookup
    token_hash = hash_refresh_token(refresh_data.refresh_token)
    
    # Attempt to revoke the specific refresh token
    revoked = revoke_refresh_token(db, token_hash)
    
    if revoked:
        logger.info(f"Refresh token successfully revoked from IP: {client_ip}")
    else:
        # Even if token doesn't exist, return success to prevent token enumeration
        logger.info(f"Logout attempt with non-existent token from IP: {client_ip}")
    
    return {"message": "Logout successful"}


@router.post("/auth/logout-all", response_model=schemas.Message)
def logout_all(
    request: Request,
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all devices by revoking all refresh tokens for the current user.
    
    This endpoint requires authentication and revokes all active refresh tokens
    for the authenticated user, effectively logging them out from all devices.
    """
    # Get client IP for logging
    import logging
    logger = logging.getLogger(__name__)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    logger.info(f"Logout all devices requested by user {current_user.email} from IP: {client_ip}")
    
    # Revoke all refresh tokens for the current user
    revoked_count = revoke_user_refresh_tokens(db, current_user.id)
    
    logger.info(f"Successfully revoked {revoked_count} refresh tokens for user {current_user.email} from IP: {client_ip}")
    
    return {"message": f"Logout successful. Revoked {revoked_count} active sessions."}


@router.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(deps.get_current_active_user), db: Session = Depends(get_db)):
    # Convert roles from JSON string to list
    import json
    import os
    from users.services import get_or_create_user_profile
    from storage.models import StoredFile

    user_roles = []
    if current_user.roles:
        try:
            user_roles = json.loads(current_user.roles)
        except:
            user_roles = ["user"]

    # Get user profile to include avatar URL
    user_profile = get_or_create_user_profile(db, current_user)
    
    # Get CloudFront URL for avatar if profile picture exists
    avatar_url = None
    if user_profile.profile_picture_file_id:
        stored_file = db.query(StoredFile).filter(
            StoredFile.id == user_profile.profile_picture_file_id
        ).first()
        if stored_file and stored_file.file_path:
            # Generate CloudFront URL
            cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN', 'media.robertmoggach.com')
            if not cloudfront_domain.startswith('http'):
                cloudfront_domain = f"https://{cloudfront_domain}"
            clean_path = stored_file.file_path.lstrip('/')
            avatar_url = f"{cloudfront_domain}/{clean_path}"

    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "is_verified": current_user.is_verified,
        "roles": user_roles,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "avatar_url": avatar_url,
    }
    
    return schemas.User(**user_dict)


@router.put("/users/me", response_model=schemas.User)
def update_user_me(
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    if user_in.email is not None:
        current_user.email = user_in.email
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.password is not None:
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/admin/users", response_model=schemas.UserListResponse)
def admin_list_users(
    page: int = 1,
    per_page: int = 25,
    search: str = None,
    status: str = None,  # "active", "inactive", "verified", "unverified"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint for paginated user listing with search and filtering"""
    import json
    from sqlalchemy import func, or_
    
    # Base query
    query = db.query(models.User)
    
    # Apply search filter
    if search:
        search_filter = or_(
            models.User.email.ilike(f"%{search}%"),
            models.User.full_name.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Apply status filter
    if status == "active":
        query = query.filter(models.User.is_active == True)
    elif status == "inactive":
        query = query.filter(models.User.is_active == False)
    elif status == "verified":
        query = query.filter(models.User.is_verified == True)
    elif status == "unverified":
        query = query.filter(models.User.is_verified == False)
    
    # Get total count
    total = query.count()
    
    # Calculate pagination
    total_pages = (total + per_page - 1) // per_page
    offset = (page - 1) * per_page
    
    # Get paginated results
    users = query.offset(offset).limit(per_page).all()
    
    # Convert users to proper format with roles
    user_list = []
    for user in users:
        user_roles = []
        if user.roles:
            try:
                user_roles = json.loads(user.roles)
            except:
                user_roles = ["user"]
        
        # Get user profile for avatar URL
        user_profile = get_or_create_user_profile(db, user)
        
        user_dict = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "is_verified": user.is_verified,
            "roles": user_roles,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "avatar_url": user_profile.avatar_url,
        }
        user_list.append(schemas.User(**user_dict))
    
    return schemas.UserListResponse(
        users=user_list,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/users/{user_id}", response_model=schemas.User)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if not current_user.is_superuser and current_user.id != user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    return user


@router.get("/admin/users/{user_id}", response_model=schemas.User)
def admin_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint for single user details"""
    import json
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return user with properly formatted roles
    user_roles = []
    if user.roles:
        try:
            user_roles = json.loads(user.roles)
        except:
            user_roles = ["user"]
    
    # Get user profile for avatar URL
    user_profile = get_or_create_user_profile(db, user)
    
    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "roles": user_roles,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "avatar_url": user_profile.avatar_url,
    }
    
    return schemas.User(**user_dict)


@router.put("/admin/users/{user_id}", response_model=schemas.User)
def admin_update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint to update user status and roles"""
    import json
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    if user_update.is_superuser is not None:
        user.is_superuser = user_update.is_superuser
    
    if user_update.roles is not None:
        user.roles = json.dumps(user_update.roles)
    
    db.commit()
    db.refresh(user)
    
    # Return user with properly formatted roles
    user_roles = []
    if user.roles:
        try:
            user_roles = json.loads(user.roles)
        except:
            user_roles = ["user"]
    
    # Get user profile for avatar URL
    user_profile = get_or_create_user_profile(db, user)
    
    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "roles": user_roles,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "avatar_url": user_profile.avatar_url,
    }
    
    return schemas.User(**user_dict)


@router.delete("/admin/users/{user_id}", response_model=schemas.Message)
async def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint to delete a user (superuser only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deletion of superusers
    if user.is_superuser:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete superuser accounts"
        )
    
    # Prevent deletion of the last user
    user_count = db.query(models.User).count()
    if user_count <= 1:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete the last user in the system"
        )
    
    # Clean up avatar files before deletion
    from users.models import UserProfile
    from storage.models import StoredFile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    
    if user_profile:
        # Delete avatar from storage if it exists
        if user_profile.profile_picture_file_id:
            stored_file = db.query(StoredFile).filter(
                StoredFile.id == user_profile.profile_picture_file_id
            ).first()
            
            if stored_file:
                # Delete from Dropbox storage
                try:
                    storage = get_storage_instance()
                    await storage.delete(stored_file.file_path)
                except Exception as e:
                    print(f"Failed to delete avatar from storage: {str(e)}")
                
                # Delete the stored file record
                db.delete(stored_file)
    
    # Delete the user (CASCADE will handle user_profile)
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.email} has been successfully deleted"}


@router.post("/admin/users/{user_id}/status", response_model=schemas.User)
def admin_toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint to toggle user activation status"""
    import json
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle the is_active status
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    # Return user with properly formatted roles
    user_roles = []
    if user.roles:
        try:
            user_roles = json.loads(user.roles)
        except:
            user_roles = ["user"]
    
    # Get user profile for avatar URL
    user_profile = get_or_create_user_profile(db, user)
    
    user_dict = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified": user.is_verified,
        "roles": user_roles,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "avatar_url": user_profile.avatar_url,
    }
    
    return schemas.User(**user_dict)


@router.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return user


# Admin statistics endpoints
@router.get("/admin/stats", response_model=schemas.UserStatsResponse)
def admin_get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Get user statistics for admin dashboard"""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Get current stats
    total_users = db.query(func.count(models.User.id)).scalar()
    active_users = db.query(func.count(models.User.id)).filter(models.User.is_active == True).scalar()
    inactive_users = db.query(func.count(models.User.id)).filter(models.User.is_active == False).scalar()
    verified_users = db.query(func.count(models.User.id)).filter(models.User.is_verified == True).scalar()
    unverified_users = db.query(func.count(models.User.id)).filter(models.User.is_verified == False).scalar()
    superusers = db.query(func.count(models.User.id)).filter(models.User.is_superuser == True).scalar()
    
    # Get recent registrations (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_registrations = (
        db.query(func.count(models.User.id))
        .filter(models.User.created_at >= seven_days_ago)
        .scalar()
    )
    
    return schemas.UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        verified_users=verified_users,
        unverified_users=unverified_users,
        superusers=superusers,
        recent_registrations=recent_registrations,
    )


@router.get("/admin/recent-users", response_model=list[schemas.RecentUserResponse])
def admin_get_recent_users(
    days: int = 7,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Get recent user registrations"""
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    recent_users = (
        db.query(models.User)
        .filter(models.User.created_at >= cutoff_date)
        .order_by(models.User.created_at.desc())
        .limit(limit)
        .all()
    )
    
    return [
        schemas.RecentUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            created_at=user.created_at
        )
        for user in recent_users
    ]


@router.get("/admin/email/status")
def admin_get_email_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_superuser),
):
    """Admin endpoint for email service testing and status"""
    from core.email import email_service
    
    # Test connection and get delivery stats
    connection_status = email_service.test_connection()
    delivery_stats = email_service.get_delivery_stats()
    
    return {
        "connection": connection_status,
        "delivery_stats": delivery_stats,
        "status": "healthy" if connection_status.get("connected") else "error"
    }


# Profile endpoints
@router.get("/users/me/profile", response_model=schemas.UserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """Get current user's profile"""
    profile = get_or_create_user_profile(db, current_user)
    return profile


@router.put("/users/me/profile", response_model=schemas.UserProfileResponse)
def update_my_profile(
    profile_data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """Update current user's profile"""
    profile = get_or_create_user_profile(db, current_user)

    # Update profile fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/users/{user_id}/profile", response_model=schemas.UserProfileResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    """Get a user's profile (public profiles only unless own profile)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = get_or_create_user_profile(db, user)

    # Check if profile is public or if it's the user's own profile
    if not profile.public_profile and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Profile is private")

    return profile


@router.post("/users/me/profile/picture", response_model=schemas.ProfilePictureUploadResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Upload profile picture"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
        )

    # Validate file size (5MB max)
    file_content = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    try:
        # Get or create user profile
        user_profile = get_or_create_user_profile(db, current_user)

        # Check storage quota
        if not check_storage_quota(user_profile, len(file_content)):
            raise HTTPException(status_code=413, detail="Storage quota exceeded")

        # Upload to S3 storage backend
        file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        # Structure: /users/{email-slug}/avatar.{ext} - replaces existing avatar
        email_slug = current_user.email.replace("@", "-").replace(".", "-")
        clean_filename = f"avatar.{file_extension}"
        storage_path = f"/users/{email_slug}/{clean_filename}"

        # Upload to S3 storage
        storage = get_storage_instance()
        stored_file_info = await storage.put(storage_path, file_content)

        # Create database record
        db_file = StoredFile(
            filename=clean_filename,
            original_filename=file.filename,
            file_path=storage_path,
            file_size=len(file_content),
            content_type=file.content_type,
            dropbox_path=storage_path,
            dropbox_id=getattr(stored_file_info, "id", stored_file_info.get("id")),
            user_profile_id=user_profile.id,
            category="avatar",
        )

        db.add(db_file)
        db.flush()  # Get the ID without committing

        # Update user profile with new avatar
        if user_profile.profile_picture_file_id:
            # Delete old profile picture file record
            old_file = (
                db.query(StoredFile)
                .filter(StoredFile.id == user_profile.profile_picture_file_id)
                .first()
            )
            if old_file:
                # Update storage usage (subtract old file size)
                update_storage_usage(db, user_profile, -old_file.file_size)
                db.delete(old_file)

        user_profile.profile_picture_file_id = db_file.id

        # Generate CloudFront URL for the avatar with cache busting
        base_cloudfront_url = get_cloudfront_url(storage_path)
        # Add timestamp for cache busting
        import time
        timestamp = int(time.time())
        avatar_cloudfront_url = f"{base_cloudfront_url}?v={timestamp}"
        
        # Store the CloudFront URL with cache buster
        user_profile.avatar_url = avatar_cloudfront_url

        # Update storage usage
        update_storage_usage(db, user_profile, len(file_content))

        db.commit()
        db.refresh(db_file)
        db.refresh(user_profile)

        return schemas.ProfilePictureUploadResponse(
            id=db_file.id,
            filename=db_file.filename,
            file_size=db_file.file_size,
            avatar_url=avatar_cloudfront_url,
            message="Profile picture uploaded successfully to S3",
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Avatar upload error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")


@router.post("/users/me/avatar", response_model=schemas.ProfilePictureUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Upload user avatar (alias for profile picture upload)"""
    # Reuse the existing profile picture upload logic
    return await upload_profile_picture(file, db, current_user)


@router.delete("/users/me/profile/picture")
async def delete_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """Delete profile picture"""
    user_profile = get_or_create_user_profile(db, current_user)

    if not user_profile.profile_picture_file_id:
        raise HTTPException(status_code=404, detail="No profile picture found")

    try:
        # Get file record
        file_record = (
            db.query(StoredFile)
            .filter(StoredFile.id == user_profile.profile_picture_file_id)
            .first()
        )

        if file_record:
            # Update storage usage (subtract file size)
            update_storage_usage(db, user_profile, -file_record.file_size)

            # TODO: Delete from storage backend when configured

            # Delete file record
            db.delete(file_record)

        # Clear profile picture references
        user_profile.profile_picture_file_id = None
        user_profile.avatar_url = None

        db.commit()

        return {"message": "Profile picture deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete profile picture: {str(e)}")
