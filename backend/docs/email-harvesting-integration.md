# Email Harvesting Integration

## Overview

The Email Harvesting Integration connects the email connections system with the existing case management and document storage systems. This allows users to automatically collect emails from connected Gmail/Google Workspace accounts and store them as evidence documents within specific legal cases.

## Architecture

### Components

1. **Email Connections System** (`email_connections/`)
   - Manages OAuth connections to Gmail accounts
   - Handles token refresh and connection health monitoring
   - Provides secure access to Gmail API

2. **Email Harvesting Service** (`email_connections/harvesting_service.py`)
   - Orchestrates email collection from multiple connections
   - Integrates with case management system
   - Creates document records for harvested emails

3. **Case Management Integration** (`cases/models.py`)
   - `CaseDocument` model supports `DocumentType.email`
   - Stores email metadata and relationships to cases
   - Integrates with existing document workflow

### Data Flow

```
Gmail API → Email Connections → Harvesting Service → Case Documents → Legal Cases
```

## Features

### 1. Multi-Account Email Harvesting

- Harvest emails from multiple connected Gmail accounts simultaneously
- Selective connection targeting (choose specific accounts)
- Automatic handling of connection failures and token refresh

### 2. Case Integration

- Associate harvested emails with specific legal cases
- Store emails as `CaseDocument` records with type `email`
- Maintain proper document metadata (date, parties, etc.)

### 3. Duplicate Prevention

- Automatic detection of already-harvested emails
- Prevents duplicate document creation
- Maintains data integrity across multiple harvest operations

### 4. Error Handling & Recovery

- Graceful handling of expired or revoked connections
- Automatic token refresh attempts
- Detailed error reporting and recovery guidance

### 5. Statistics & Monitoring

- Track harvesting activity across users and cases
- Monitor connection health and performance
- Generate harvesting reports and analytics

## API Endpoints

### Test Harvesting Capability

```http
POST /api/v1/email-connections/harvest/test
```

Tests if email harvesting is properly configured and working for the authenticated user.

**Response:**
```json
{
  "total_connections": 3,
  "active_connections": 2,
  "working_connections": 2,
  "harvesting_ready": true,
  "connection_tests": [
    {
      "connection_id": 1,
      "email": "user@example.com",
      "status": "working",
      "profile_email": "user@example.com",
      "has_messages": true
    }
  ]
}
```

### Harvest Emails for Case

```http
POST /api/v1/email-connections/harvest/case/{case_id}
```

Harvests emails from connected accounts for a specific case.

**Parameters:**
- `case_id` (path): ID of the case to harvest emails for
- `connection_ids` (query, optional): Specific connection IDs to use
- `max_messages_per_connection` (query, default: 10): Max messages per connection
- `search_query` (query, optional): Gmail search query filter

**Response:**
```json
{
  "success": true,
  "harvested_count": 15,
  "connections_used": 2,
  "connection_results": [
    {
      "connection_id": 1,
      "email_address": "user@example.com",
      "messages_fetched": 10,
      "messages_harvested": 8,
      "processed_messages": [...]
    }
  ],
  "errors": []
}
```

### Get Harvesting Statistics

```http
GET /api/v1/email-connections/harvest/stats?case_id={case_id}
```

Returns statistics about email harvesting activity.

**Response:**
```json
{
  "total_emails_harvested": 125,
  "cases_with_emails": 5,
  "emails_by_date": {
    "2024-01-15": 12,
    "2024-01-16": 8,
    "2024-01-17": 15
  },
  "latest_harvest_date": "2024-01-17T15:30:00Z"
}
```

## Usage Examples

### Basic Email Harvesting

```python
from email_connections.harvesting_service import EmailHarvestingService
from sqlalchemy.orm import Session

# Initialize service
harvesting_service = EmailHarvestingService(db_session)

# Test if harvesting is ready
capability_test = await harvesting_service.test_harvesting_capability(user_id=123)
if capability_test["harvesting_ready"]:
    print("Harvesting is ready!")
    print(f"Working connections: {capability_test['working_connections']}")

# Harvest emails for a case
results = await harvesting_service.harvest_emails_for_case(
    case_id=456,
    user_id=123,
    max_messages_per_connection=20
)

print(f"Harvested {results['harvested_count']} emails")
print(f"Used {results['connections_used']} connections")
```

### Selective Connection Harvesting

```python
# Harvest from specific connections only
results = await harvesting_service.harvest_emails_for_case(
    case_id=456,
    user_id=123,
    connection_ids=[1, 3, 5],  # Only these connections
    max_messages_per_connection=50
)
```

### Get Harvesting Statistics

```python
# Get overall user stats
user_stats = harvesting_service.get_harvesting_stats(user_id=123)

# Get stats for specific case
case_stats = harvesting_service.get_harvesting_stats(user_id=123, case_id=456)

print(f"Total emails harvested: {user_stats['total_emails_harvested']}")
print(f"Cases with emails: {user_stats['cases_with_emails']}")
```

## Database Schema Integration

### CaseDocument Model Enhancement

The existing `CaseDocument` model supports email documents:

```python
class CaseDocument(Base):
    __tablename__ = "case_documents"
    
    # ... existing fields ...
    document_type = Column(Enum(DocumentType), nullable=False, index=True)
    # DocumentType.email is supported
    
    # Email-specific metadata stored in file_path or JSON fields
```

### Email Document Storage

Harvested emails are stored as `CaseDocument` records with:

- `document_type`: `DocumentType.email`
- `original_filename`: `email_{message_id}.json`
- `stored_filename`: `{date}_email_{message_id}.json`
- `party_type`: Configurable (default: `PartyType.respondent`)
- `mime_type`: `application/json`
- `file_path`: Virtual path to email content
- `document_date`: Email send/receive date

## Error Handling

### Connection Errors

The system handles various connection error scenarios:

1. **Expired Tokens**: Automatic refresh attempt, fallback to re-authorization
2. **Revoked Access**: Clear error message with re-authorization instructions
3. **API Quota Limits**: Retry with backoff, user notification
4. **Service Unavailable**: Temporary error handling with retry options

### Error Response Format

All harvesting endpoints use consistent error format:

```json
{
  "error": {
    "code": "CONNECTION_EXPIRED",
    "message": "Connection 123 has expired",
    "user_message": "Your email account connection has expired.",
    "recovery_action": "re_authorize",
    "technical_details": "Connection 123 (user@example.com) requires token refresh"
  }
}
```

## Security Considerations

### Token Security

- All OAuth tokens are encrypted at rest using AES-256
- Tokens are decrypted only when needed for API calls
- Automatic token rotation and refresh handling

### Access Control

- Users can only harvest emails from their own connected accounts
- Case-based access control ensures proper document permissions
- API endpoints require proper authentication and authorization

### Data Privacy

- Email content is processed but not logged in plaintext
- Sensitive information is sanitized in error messages
- Audit trail for all harvesting activities

## Testing

### Backend Tests

Located in `tests/test_email_connections/test_harvesting_integration.py`:

- Unit tests for `EmailHarvestingService`
- Integration tests with case management system
- Error handling and recovery scenarios
- Multi-connection harvesting workflows

### Frontend E2E Tests

Located in `tests/e2e/email-harvesting-integration.spec.ts`:

- End-to-end harvesting workflows
- UI integration testing
- Error handling in user interface
- Performance and reliability testing

### Running Tests

```bash
# Backend tests
cd backend
python -m pytest tests/test_email_connections/test_harvesting_integration.py -v

# Frontend E2E tests
cd frontend
npm run test:e2e -- tests/e2e/email-harvesting-integration.spec.ts
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Process multiple messages per connection
2. **Parallel Connections**: Harvest from multiple accounts simultaneously
3. **Duplicate Detection**: Efficient checking to prevent re-processing
4. **Rate Limiting**: Respect Gmail API quotas and limits

### Monitoring

- Track harvesting performance metrics
- Monitor API quota usage
- Alert on connection failures
- Performance analytics and reporting

## Future Enhancements

### Planned Features

1. **Advanced Search**: Full Gmail search API integration
2. **Scheduled Harvesting**: Automated periodic email collection
3. **Content Analysis**: AI-powered email content classification
4. **Bulk Operations**: Mass email import and processing
5. **Export Capabilities**: Email data export in various formats

### API Extensions

1. **Webhook Integration**: Real-time email notifications
2. **Advanced Filtering**: Rule-based email selection
3. **Custom Metadata**: User-defined email tagging and categorization
4. **Integration APIs**: Connect with external legal tools

## Troubleshooting

### Common Issues

1. **No Active Connections**
   - Verify email connections are active and not expired
   - Check OAuth token validity
   - Re-authorize connections if needed

2. **Harvesting Fails**
   - Check Gmail API quotas
   - Verify connection permissions and scopes
   - Review error logs for specific failure reasons

3. **Duplicate Documents**
   - Check duplicate detection logic
   - Verify case ID and connection mapping
   - Review database constraints

### Debug Tools

1. **Capability Test**: Use `/harvest/test` endpoint
2. **Connection Health**: Check individual connection status
3. **Error Logs**: Review detailed error information
4. **Statistics**: Monitor harvesting activity and success rates

## Support

For issues related to email harvesting integration:

1. Check the error handling documentation above
2. Review the test cases for expected behavior
3. Use the debug endpoints to diagnose connection issues
4. Consult the API documentation for proper usage patterns