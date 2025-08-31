# Email Connections API Documentation

## Overview

The Email Connections API provides comprehensive functionality for managing multiple Gmail and Google Workspace account connections within the litigation support system. This API enables users to securely connect additional email accounts, monitor their health status, and use them for automated email harvesting.

## Base URL

```
https://api.litigation-support.com/api/v1/email-connections
```

For local development:
```
http://localhost:8000/api/v1/email-connections
```

## Authentication

All endpoints require JWT bearer token authentication. Include the token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

Obtain a JWT token by authenticating with the `/api/v1/auth/login` endpoint.

## Quick Start

### 1. Connect a New Gmail Account

```bash
# Step 1: Initiate OAuth flow
curl -X POST "http://localhost:8000/api/v1/email-connections/oauth/initiate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }'

# Response:
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?...",
  "state": "secure_random_state_123",
  "provider": "google"
}

# Step 2: Redirect user to authorization_url
# Step 3: OAuth callback is handled automatically
# Step 4: List connections to verify
curl -X GET "http://localhost:8000/api/v1/email-connections" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Manage Existing Connections

```bash
# List all connections
curl -X GET "http://localhost:8000/api/v1/email-connections" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific connection
curl -X GET "http://localhost:8000/api/v1/email-connections/1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check connection health
curl -X GET "http://localhost:8000/api/v1/email-connections/1/health" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete connection
curl -X DELETE "http://localhost:8000/api/v1/email-connections/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints

### Connection Management

#### GET /email-connections
**List Email Connections**

Retrieve all email account connections for the authenticated user.

**Response:**
```json
{
  "connections": [
    {
      "id": 1,
      "user_id": 123,
      "email_address": "user@gmail.com",
      "provider": "google",
      "provider_account_id": "google_user_id_123",
      "connection_name": "Work Gmail Account",
      "connection_status": "active",
      "last_sync_at": "2024-01-15T10:30:00Z",
      "error_message": null,
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "scopes_granted": [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ]
    }
  ],
  "total": 1,
  "active": 1,
  "expired": 0,
  "error": 0
}
```

#### GET /email-connections/{connection_id}
**Get Single Connection**

Retrieve details for a specific email connection.

**Parameters:**
- `connection_id` (path): Integer ID of the connection

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "email_address": "user@gmail.com",
  "provider": "google",
  "provider_account_id": "google_user_id_123",
  "connection_name": "Work Gmail Account",
  "connection_status": "active",
  "last_sync_at": "2024-01-15T10:30:00Z",
  "error_message": null,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "scopes_granted": [
    "https://www.googleapis.com/auth/gmail.readonly"
  ]
}
```

#### PUT /email-connections/{connection_id}
**Update Connection**

Update connection settings like name or status.

**Request Body:**
```json
{
  "connection_name": "Updated Account Name",
  "connection_status": "active"
}
```

#### DELETE /email-connections/{connection_id}
**Delete Connection**

Remove an email connection and revoke OAuth tokens.

**Response:**
```json
{
  "message": "Connection deleted successfully",
  "connection_id": 1,
  "email_address": "user@gmail.com"
}
```

### OAuth Flow

#### POST /email-connections/oauth/initiate
**Initiate OAuth Flow**

Start OAuth2 flow to connect a new Google/Gmail account.

**Request Body:**
```json
{
  "provider": "google",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ],
  "redirect_uri": "https://yourapp.com/oauth/callback"
}
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=...&state=...",
  "state": "secure_random_state_string_123456",
  "provider": "google"
}
```

**Implementation Steps:**
1. Call this endpoint to get authorization URL
2. Redirect user to `authorization_url` (typically in popup)
3. User grants permission on Google's consent screen
4. Google redirects to callback URL with authorization code
5. Backend processes callback and creates connection

#### GET /email-connections/oauth/callback
**OAuth Callback Handler**

Process OAuth2 callback from Google (called automatically by redirect).

**Query Parameters:**
- `code`: Authorization code from Google OAuth
- `state`: State parameter for CSRF protection
- `scope`: Space-separated list of granted scopes

**Response:** HTML page with JavaScript to close popup and notify parent window.

### Health Monitoring

#### GET /email-connections/{connection_id}/health
**Check Connection Health**

Verify that a connection is working and tokens are valid.

**Response:**
```json
{
  "connection_id": 1,
  "is_healthy": true,
  "status": "active",
  "last_checked": "2024-01-15T10:30:00Z",
  "error_details": null,
  "token_expires_at": "2024-01-15T11:30:00Z",
  "needs_reauth": false
}
```

#### GET /email-connections/status
**Bulk Connection Status**

Get health status for all connections.

**Response:**
```json
{
  "user_id": 123,
  "total_connections": 3,
  "active_connections": 2,
  "expired_connections": 1,
  "error_connections": 0,
  "connections": [
    {
      "connection_id": 1,
      "email_address": "user1@gmail.com",
      "status": "active",
      "is_active": true,
      "is_expired": false,
      "last_sync_at": "2024-01-15T10:30:00Z",
      "error_message": null
    }
  ]
}
```

## OAuth Scopes

### Required Scopes

- `https://www.googleapis.com/auth/userinfo.email`: Access to user's email address
- `https://www.googleapis.com/auth/userinfo.profile`: Access to basic profile info

### Gmail Access Scopes

- `https://www.googleapis.com/auth/gmail.readonly`: Read-only access to Gmail
- `https://www.googleapis.com/auth/gmail.modify`: Modify Gmail (not typically needed)
- `https://www.googleapis.com/auth/gmail.compose`: Send emails (not typically needed)

### Recommended Scope Combination
```json
{
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email", 
    "https://www.googleapis.com/auth/userinfo.profile"
  ]
}
```

## Connection Status Types

| Status | Description | Action Required |
|--------|-------------|----------------|
| `active` | Connection is working normally | None |
| `expired` | Access token has expired | Automatic refresh or re-authorization |
| `error` | Connection has an error | Check error_message, may need re-auth |
| `revoked` | User revoked access | Must re-authorize connection |

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

**404 Not Found**
```json
{
  "detail": "Email connection not found"
}
```

**400 Bad Request - OAuth**
```json
{
  "detail": "Invalid or expired OAuth state"
}
```

**500 Internal Server Error - OAuth**
```json
{
  "detail": "Failed to create connection: Token exchange failed"
}
```

### OAuth-Specific Errors

**Invalid State**
- Cause: CSRF token validation failed
- Solution: Restart OAuth flow

**Invalid Authorization Code**
- Cause: Code expired or already used
- Solution: Restart OAuth flow

**Insufficient Scope**
- Cause: User didn't grant required permissions
- Solution: Request authorization again with proper scopes

## Rate Limiting

- OAuth initiation: 10 requests per minute per user
- Connection listing: 100 requests per minute per user
- Health checks: 50 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: When limit resets (Unix timestamp)

## Security Considerations

### OAuth Security
- State parameters prevent CSRF attacks
- Tokens are encrypted before database storage  
- Refresh tokens are rotated on use
- OAuth states expire after 1 hour

### API Security
- JWT tokens required for all endpoints
- User isolation - can only access own connections
- OAuth tokens are never returned in API responses
- Failed requests are logged for monitoring

### Best Practices
1. Store OAuth state securely on client side
2. Use HTTPS in production for all OAuth redirects
3. Implement proper error handling for OAuth failures
4. Monitor connection health regularly
5. Handle token refresh automatically

## Client Libraries

### JavaScript/TypeScript
```typescript
import { EmailConnectionsAPI } from '@litigation-support/api-client'

const api = new EmailConnectionsAPI('https://api.litigation-support.com')

// Initiate OAuth flow
const oauthResponse = await api.initiateOAuth({
  provider: 'google',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly']
})

// List connections
const connections = await api.listConnections()
```

### Python
```python
from litigation_support_client import EmailConnectionsAPI

api = EmailConnectionsAPI('https://api.litigation-support.com')

# Initiate OAuth flow
oauth_response = api.initiate_oauth({
    'provider': 'google',
    'scopes': ['https://www.googleapis.com/auth/gmail.readonly']
})

# List connections
connections = api.list_connections()
```

## Testing

### Test Environment
Base URL: `http://localhost:8000/api/v1/email-connections`

### Mock OAuth for Testing
For testing purposes, you can use mock OAuth endpoints that don't require real Google authentication:

```bash
# Set environment variable for testing
export OAUTH_MOCK_MODE=true

# Use test OAuth credentials
export GOOGLE_CLIENT_ID=test_client_id
export GOOGLE_CLIENT_SECRET=test_client_secret
```

### Integration Tests
See `/tests/email_connections/test_api.py` for comprehensive API tests including:
- OAuth flow testing with mocked Google responses
- Connection management operations
- Error scenario handling
- Security validation tests

## Support and Resources

- **API Documentation**: `/docs` (Swagger UI)
- **OpenAPI Schema**: `/api/v1/openapi.json`
- **Health Check**: `/health/connections`
- **Status Dashboard**: Available in the web interface

For additional support, contact the litigation support development team.