from contextlib import asynccontextmanager
from api.v1.endpoints import api_router
from core.config import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from email_connections.monitoring import start_health_monitoring, stop_health_monitoring, get_health_monitor_status

@asynccontextmanager
async def lifespan(app: FastAPI):
    await start_health_monitoring()
    yield
    await stop_health_monitoring()

app = FastAPI(
    title="Litigation Support API",
    description="""
    Litigation Support API provides comprehensive case management, evidence collection, 
    and email harvesting capabilities for legal professionals.
    
    ## Key Features
    
    * **Case Management**: Create, update, and organize legal cases
    * **Email Connections**: Connect multiple Gmail/Google Workspace accounts for evidence collection
    * **Contact Management**: Organize and manage case-related contacts  
    * **Document Storage**: Secure storage and management of case documents
    * **Email Harvesting**: Automated email collection and processing
    * **User Authentication**: Secure JWT-based authentication system
    
    ## Authentication
    
    This API uses JWT bearer token authentication. Obtain a token by authenticating
    with the `/api/v1/auth/login` endpoint and include it in subsequent requests.
    
    ## Email Connections
    
    The email connections feature allows users to:
    - Connect multiple Gmail/Google Workspace accounts via OAuth2
    - Monitor connection health and status
    - Test connections and view recent emails
    - Use connected accounts for automated email harvesting
    
    All OAuth flows are secured with state validation and encrypted token storage.
    """,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    contact={
        "name": "Litigation Support Team",
        "email": "support@litigation-support.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI Backend", "version": settings.VERSION}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/health/connections")
async def connection_health_status():
    return get_health_monitor_status()
