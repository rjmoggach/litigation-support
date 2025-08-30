from contacts.api import router as contacts_router
from email_connections.api import router as email_connections_router
from fastapi import APIRouter
from images.api import router as images_router
from storage.api import router as storage_router
from tags.api import router as tags_router
from users.api import router as users_router

api_router = APIRouter()

# users endpoints
# users endpoints have mixed prefixes auth|users so prefix not added here
api_router.include_router(users_router, prefix="", tags=["users"])

# storage endpoints
api_router.include_router(storage_router, prefix="/storage", tags=["storage"])

# contacts endpoints
api_router.include_router(contacts_router, prefix="/contacts", tags=["contacts"])

# tags endpoints
api_router.include_router(tags_router, prefix="/tags", tags=["tags"])

# images endpoints
api_router.include_router(images_router, prefix="/images", tags=["images"])

# email connections endpoints
api_router.include_router(email_connections_router, prefix="/email-connections", tags=["email-connections"])
