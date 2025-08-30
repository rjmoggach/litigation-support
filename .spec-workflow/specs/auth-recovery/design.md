# Design Document

## Overview

The authentication recovery system rebuilds the authentication infrastructure for the litigation support application, implementing a comprehensive protected route system using Next-Auth v5 on the frontend integrated with FastAPI's JWT-based authentication on the backend. The design ensures all routes are protected by default, with only the login page accessible to unauthenticated users. The system supports both credential-based and Google OAuth authentication flows with automatic token refresh and session management.

## Steering Document Alignment

### Technical Standards (tech.md)
The design follows Next.js 14+ App Router patterns with server components, uses TypeScript for type safety, implements JWT tokens with refresh rotation, and maintains separation between authentication logic and business logic.

### Project Structure (structure.md)
Authentication code is organized into dedicated modules: frontend auth configuration in `src/auth.ts` and `src/lib/auth.ts`, middleware in `src/middleware.ts`, backend auth endpoints in `users/api.py`, and security utilities in `core/security.py`.

## Code Reuse Analysis

### Existing Components to Leverage
- **Next-Auth Configuration** (`src/lib/auth.ts`): Existing provider setup with callbacks will be enhanced with better error handling
- **FastAPI Auth Endpoints** (`users/api.py`): Login, OAuth login, and refresh endpoints are functional and will be connected
- **Security Utilities** (`core/security.py`): Token creation, verification, and password hashing functions are ready to use
- **User Models** (`users/models.py`): Existing User model with OAuth provider fields supports the authentication flow

### Integration Points
- **Next-Auth Providers**: Google OAuth and Credentials providers are configured and need connection fixes
- **Backend API**: FastAPI endpoints at `/api/v1/auth/*` handle authentication and token management
- **Database**: PostgreSQL stores user accounts, refresh tokens, and OAuth provider information
- **Session Storage**: JWT tokens stored in Next-Auth session with automatic refresh logic

## Architecture

The authentication system uses a layered architecture with clear separation of concerns. The frontend uses Next-Auth for session management, the middleware layer enforces route protection, and the backend provides JWT-based authentication with refresh token rotation.

### Modular Design Principles
- **Single File Responsibility**: Each auth module handles one aspect (providers, callbacks, middleware, API routes)
- **Component Isolation**: Login components separated from auth logic, reusable auth hooks
- **Service Layer Separation**: Authentication service separate from user service and data access
- **Utility Modularity**: Token handling, validation, and session management in focused modules

```mermaid
graph TD
    Browser[Browser Client] --> Middleware[Next.js Middleware]
    Middleware --> AuthCheck{Authenticated?}
    AuthCheck -->|No| LoginPage[Login Page]
    AuthCheck -->|Yes| ProtectedApp[Protected Application]
    
    LoginPage --> NextAuth[Next-Auth Provider]
    NextAuth --> GoogleOAuth[Google OAuth]
    NextAuth --> Credentials[Credentials Provider]
    
    GoogleOAuth --> OAuthEndpoint[/auth/oauth-login]
    Credentials --> LoginEndpoint[/auth/login]
    
    OAuthEndpoint --> UserService[User Service]
    LoginEndpoint --> UserService
    
    UserService --> Database[(PostgreSQL)]
    UserService --> TokenService[Token Service]
    
    ProtectedApp --> APICall[API Request]
    APICall --> TokenValidation[Token Validation]
    TokenValidation --> RefreshCheck{Token Expired?}
    RefreshCheck -->|Yes| RefreshEndpoint[/auth/refresh]
    RefreshCheck -->|No| APIResponse[API Response]
    RefreshEndpoint --> TokenService
```

## Components and Interfaces

### Enhanced Middleware Component
- **Purpose:** Enforce authentication on all routes except public paths
- **Interfaces:** 
  - `middleware(request: NextRequest): NextResponse`
  - Checks session validity via Next-Auth
  - Redirects to login if unauthenticated
- **Dependencies:** next-auth, next/server
- **Reuses:** Existing middleware structure, adds auth validation

### Auth Provider Wrapper
- **Purpose:** Provide authentication context to the application
- **Interfaces:**
  - `useSession()`: Returns current session
  - `signIn()`: Initiates login flow
  - `signOut()`: Clears session and tokens
- **Dependencies:** next-auth/react
- **Reuses:** Existing SessionProvider component

### Protected Route Component
- **Purpose:** Wrap pages that require authentication
- **Interfaces:**
  - `ProtectedRoute({ children, requiredRoles? })`
  - Validates session and user roles
  - Shows loading during auth check
- **Dependencies:** Auth Provider, useSession hook
- **Reuses:** Will be new component using existing patterns

### Token Refresh Service
- **Purpose:** Automatically refresh expired access tokens
- **Interfaces:**
  - `refreshAccessToken(refreshToken: string): Promise<TokenPair>`
  - Called by Next-Auth JWT callback
- **Dependencies:** Backend refresh endpoint
- **Reuses:** Existing refresh logic in auth callbacks

## Data Models

### Session Model (Frontend)
```typescript
interface Session {
  user: {
    id: string
    email: string
    name: string
    image?: string
    is_verified: boolean
    is_superuser: boolean
    is_active: boolean
    roles: string[]
    avatar_url?: string
  }
  accessToken: string
  refreshToken: string
  accessTokenExpires: number
  refreshTokenExpires: number
}
```

### Token Response (Backend)
```python
class TokenWithRefresh:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
```

### OAuth Login Request
```python
class OAuthLogin:
    email: str
    provider: str  # "google"
    provider_id: str
    name: Optional[str]
```

## Error Handling

### Error Scenarios

1. **Invalid Credentials**
   - **Handling:** Return 401 with clear message
   - **User Impact:** "Invalid email or password" displayed on login form

2. **Expired Access Token**
   - **Handling:** Automatically refresh using refresh token
   - **User Impact:** Seamless continuation, no interruption

3. **Expired Refresh Token**
   - **Handling:** Clear session, redirect to login
   - **User Impact:** "Session expired, please log in again" message

4. **Backend Unavailable**
   - **Handling:** Show error with retry option
   - **User Impact:** "Service temporarily unavailable" with retry button

5. **OAuth Provider Error**
   - **Handling:** Fall back to credentials login
   - **User Impact:** "Google sign-in unavailable, use email/password"

6. **Unverified Email**
   - **Handling:** Block login, prompt verification
   - **User Impact:** "Please verify your email before logging in"

## Testing Strategy

### Unit Testing
- Test token validation and refresh logic
- Test middleware authentication checks
- Mock Next-Auth session for component testing
- Test error handling in auth callbacks

### Integration Testing
- Test full login flow with backend
- Test OAuth flow with mock provider
- Test token refresh cycle
- Test session synchronization across tabs

### End-to-End Testing
- Test login with valid credentials
- Test login with Google OAuth
- Test protected route access
- Test logout and session cleanup
- Test token expiration and refresh