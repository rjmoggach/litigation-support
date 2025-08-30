# Technology Stack

## Project Type
Full-stack web application providing litigation support tools for self-represented litigants. The system consists of a Python FastAPI backend for data processing and API services, a Next.js React frontend for user interaction, and supporting services for document processing and storage management.

## Core Technologies

### Primary Language(s)
- **Backend Language**: Python 3.12+ with async/await support for high-performance concurrent processing
- **Frontend Language**: TypeScript with React for type-safe, maintainable user interfaces
- **Runtime/Compiler**: Python with uvicorn ASGI server, Node.js 20+ for Next.js
- **Language-specific tools**: uv for Python package management, npm for frontend dependencies

### Key Dependencies/Libraries
- **FastAPI**: Modern, fast web framework for building APIs with automatic OpenAPI documentation
- **SQLAlchemy 2.0**: Async-capable ORM for database operations with type safety
- **Pydantic**: Data validation and serialization with automatic API documentation
- **Next.js 15**: React framework with server-side rendering and API routes
- **NextAuth.js**: Authentication library with OAuth provider support
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible, unstyled UI components for consistent user experience

### Application Architecture
**Microservices-adjacent monolith**: Single deployable backend with modular internal structure, separate frontend application, and containerized services for scalability. The architecture supports both development simplicity and production scalability.

- **API Layer**: RESTful API with FastAPI providing OpenAPI documentation
- **Business Logic**: Domain-driven design with separate modules for users, images, contacts, storage, and tags
- **Data Layer**: PostgreSQL with async SQLAlchemy for reliable data persistence
- **Frontend**: Server-side rendered React with client-side hydration for optimal performance

### Data Storage
- **Primary storage**: PostgreSQL 15 for relational data with ACID compliance for legal document integrity
- **File storage**: Multi-backend system supporting local filesystem, AWS S3, and Dropbox for user flexibility
- **Caching**: Redis for session management and performance optimization
- **Data formats**: JSON for API communication, binary storage for documents and images

### External Integrations
- **APIs**: Google OAuth2, Gmail API, Dropbox API, AWS S3, Mailjet for email services
- **Protocols**: HTTP/REST for API communication, WebSocket for real-time updates, OAuth2 for secure authentication
- **Authentication**: Google OAuth for user authentication, JWT tokens for API security
- **Document Processing**: PDF processing with PyMuPDF and pdfplumber, OCR with Tesseract, image processing with Pillow

### Monitoring & Dashboard Technologies
- **Dashboard Framework**: Next.js with React for responsive, accessible user interfaces
- **Real-time Communication**: WebSocket connections for live progress updates during document processing
- **UI Components**: Radix UI for accessibility-compliant components, Framer Motion for smooth animations
- **State Management**: React hooks and context for local state, server state managed through API calls

## Development Environment

### Build & Development Tools
- **Backend Build System**: uv for dependency management and virtual environments
- **Frontend Build System**: Next.js with TypeScript compilation and hot module replacement
- **Package Management**: uv for Python packages, npm for Node.js dependencies
- **Development workflow**: Hot reload in both frontend and backend, Docker Compose for local development environment

### Code Quality Tools
- **Static Analysis**: mypy for Python type checking, ESLint for JavaScript/TypeScript linting
- **Formatting**: Black for Python code formatting, Prettier for frontend code formatting
- **Testing Framework**: pytest for backend testing, Jest (implied) for frontend testing
- **Documentation**: FastAPI automatic OpenAPI/Swagger documentation generation

### Version Control & Collaboration
- **VCS**: Git with GitHub/GitLab for repository hosting
- **Branching Strategy**: Feature branch workflow with pull request reviews
- **Code Review Process**: Required PR reviews before merging to main branch
- **Pre-commit Hooks**: Automated linting and formatting checks before commits

### Dashboard Development
- **Live Reload**: Next.js hot module replacement for frontend, uvicorn --reload for backend
- **Port Management**: Configurable ports (3000 for frontend, 8000 for backend, 5434 for database)
- **Multi-Instance Support**: Docker Compose orchestration for running multiple services simultaneously

## Deployment & Distribution

- **Target Platform(s)**: Containerized deployment with Docker, suitable for cloud platforms (AWS, GCP, Azure) or on-premise
- **Distribution Method**: Docker containers with Docker Compose for orchestration
- **Installation Requirements**: Docker and Docker Compose, minimum 4GB RAM, PostgreSQL-compatible environment
- **Update Mechanism**: Container image updates with blue-green deployment capability

## Technical Requirements & Constraints

### Performance Requirements
- **API Response Time**: <200ms for typical operations, <2 minutes for document processing
- **Concurrent Users**: Support 100+ simultaneous users with horizontal scaling capability
- **Memory Usage**: 512MB baseline per service with configurable limits
- **Storage Throughput**: Handle document uploads up to 100MB with progress tracking

### Compatibility Requirements  
- **Platform Support**: Linux containers, macOS and Windows for development via Docker
- **Browser Support**: Modern browsers with ES2020 support, mobile-responsive design
- **Python Version**: Minimum Python 3.12 for modern async features and type hints
- **Database**: PostgreSQL 15+ for advanced features and performance

### Security & Compliance
- **Security Requirements**: OAuth2 authentication, JWT tokens, HTTPS enforcement, data encryption at rest
- **Compliance Standards**: GDPR-compliant data handling, legal document chain of custody preservation
- **Threat Model**: Protection against unauthorized access, data tampering, and privacy breaches for sensitive legal documents
- **Privacy**: User data ownership, no data sharing, complete local control options

### Scalability & Reliability
- **Expected Load**: 1-1000 users per deployment, 1M+ documents per case, variable processing workloads
- **Availability Requirements**: 99.9% uptime target, graceful degradation during high load
- **Growth Projections**: Horizontal scaling through container orchestration, database read replicas for performance

## Technical Decisions & Rationale

### Decision Log
1. **FastAPI over Django**: Chosen for automatic API documentation, native async support, and superior performance for API-heavy workloads typical in legal document processing
2. **Multi-Storage Backend Architecture**: Implemented pluggable storage system to give self-represented litigants control over where their sensitive legal documents are stored (local, cloud, or personal storage)
3. **PostgreSQL over Document Database**: Selected relational database for ACID compliance and data integrity requirements essential for legal evidence management
4. **Next.js over SPA Framework**: Server-side rendering improves SEO and initial load performance, crucial for users with limited technical resources and slower internet connections
5. **Container-First Deployment**: Docker containers ensure consistent deployment across different hosting environments, important for users who may deploy on various platforms

## Known Limitations
- **Single-Tenant Architecture**: Current design assumes single-user deployments; multi-tenancy would require significant architectural changes
- **File Size Constraints**: Large document processing may require chunking and background processing improvements for files >100MB
- **Mobile App Gap**: Web-responsive design may not fully replace native mobile apps for optimal mobile experience
- **Offline Capability**: Limited offline functionality; may need service worker implementation for better mobile/unreliable connection support