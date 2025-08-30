# Tasks Document

- [x] 1. Create EmailConnection database model in backend/email_connections/models.py
  - File: backend/email_connections/models.py
  - Define EmailConnection SQLAlchemy model with encrypted token storage
  - Add relationship to User model and proper indexes
  - Purpose: Establish database schema for storing account connections
  - _Leverage: backend/users/models.py, core/database.py_
  - _Requirements: 1.1, 5.1_

- [x] 2. Add email_connections relationship to User model in backend/users/models.py
  - File: backend/users/models.py (modify existing)
  - Add email_connections relationship to User class
  - Update User model to support multiple connected accounts
  - Purpose: Enable navigation from User to connected email accounts
  - _Leverage: existing User model patterns_
  - _Requirements: 1.1, 5.1_

- [x] 3. Create database migration for EmailConnection table
  - File: backend/alembic/versions/[timestamp]_add_email_connections.py
  - Generate Alembic migration for new EmailConnection table
  - Include proper indexes and foreign key constraints
  - Purpose: Update database schema to support email connections
  - _Leverage: existing Alembic migrations in backend/alembic/versions/_
  - _Requirements: 1.1_

- [x] 4. Create Pydantic schemas in backend/email_connections/schemas.py
  - File: backend/email_connections/schemas.py
  - Define schemas for EmailConnectionCreate, EmailConnectionResponse, ConnectionStatus
  - Add OAuth flow schemas for connection requests and responses
  - Purpose: Provide type safety and validation for API endpoints
  - _Leverage: backend/users/schemas.py patterns_
  - _Requirements: 1.2, 2.1_

- [x] 5. Create token encryption utilities in backend/email_connections/utils.py
  - File: backend/email_connections/utils.py
  - Implement encrypt_token() and decrypt_token() functions
  - Add token validation and expiry checking utilities
  - Purpose: Secure storage and retrieval of OAuth tokens
  - _Leverage: core/security.py encryption patterns_
  - _Requirements: 5.2, 5.3_

- [x] 6. Implement EmailConnectionService in backend/email_connections/services.py
  - File: backend/email_connections/services.py
  - Create connection management business logic
  - Add methods for create_connection, refresh_tokens, check_health
  - Purpose: Centralize email connection management logic
  - _Leverage: backend/users/services.py patterns_
  - _Requirements: 2.1, 2.2, 4.1_

- [x] 7. Create OAuth flow handler in backend/email_connections/oauth.py
  - File: backend/email_connections/oauth.py
  - Implement Google OAuth flow for additional accounts
  - Add token exchange and validation logic
  - Purpose: Handle OAuth authorization for non-primary accounts
  - _Leverage: existing Google OAuth patterns from auth system_
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Create API endpoints in backend/email_connections/api.py
  - File: backend/email_connections/api.py
  - Implement REST endpoints for connection CRUD operations
  - Add OAuth callback handling endpoint
  - Purpose: Provide API interface for email connection management
  - _Leverage: backend/users/api.py patterns_
  - _Requirements: 1.2, 2.1, 3.1_

- [x] 9. Add dependency injection setup in backend/email_connections/deps.py
  - File: backend/email_connections/deps.py
  - Create dependency functions for service injection
  - Add connection authorization middleware
  - Purpose: Enable proper dependency injection and security
  - _Leverage: backend/users/deps.py patterns_
  - _Requirements: 1.2, 5.2_

- [x] 10. Register email_connections routes in backend/api/v1/endpoints.py
  - File: backend/api/v1/endpoints.py (modify existing)
  - Include email_connections router in main API router
  - Configure route prefixes and tags
  - Purpose: Make email connection endpoints available via API
  - _Leverage: existing router registration patterns_
  - _Requirements: 1.2_

- [x] 11. Create EmailConnectionsManager React component
  - File: frontend/src/components/profile/email-connections-manager.tsx
  - Build main UI component for managing email connections
  - Add connection list, status indicators, and action buttons
  - Purpose: Provide primary user interface for email account management
  - _Leverage: frontend/src/components/ui/ components, existing profile form patterns_
  - _Requirements: 1.1, 1.4, 2.2_

- [ ] 12. Create AddEmailAccountDialog component
  - File: frontend/src/components/profile/add-email-account-dialog.tsx
  - Implement modal dialog for initiating OAuth flow
  - Add provider selection and permission explanation
  - Purpose: Guide users through account connection process
  - _Leverage: existing dialog components and form patterns_
  - _Requirements: 1.1, 3.3_

- [ ] 13. Create ConnectionStatusIndicator component
  - File: frontend/src/components/profile/connection-status-indicator.tsx
  - Display connection health with visual indicators
  - Show last sync time and error states
  - Purpose: Provide clear visual feedback on connection status
  - _Leverage: existing UI components and status patterns_
  - _Requirements: 2.2, 4.2_

- [x] 14. Create email connections API client functions
  - File: frontend/src/lib/api/email-connections.ts
  - Implement client-side API calls for connection management
  - Add OAuth initiation and callback handling
  - Purpose: Connect React components to backend API endpoints
  - _Leverage: existing API client patterns in frontend/src/lib/api/_
  - _Requirements: 1.2, 2.1, 3.1_

- [ ] 15. Create OAuth flow utilities in frontend/src/lib/oauth-utils.ts
  - File: frontend/src/lib/oauth-utils.ts
  - Implement client-side OAuth flow helpers
  - Add popup window management and callback processing
  - Purpose: Handle OAuth authorization flows in the browser
  - _Leverage: existing auth utilities and NextAuth patterns_
  - _Requirements: 3.1, 3.2_

- [ ] 16. Extend NextAuth configuration for additional account handling
  - File: frontend/src/lib/auth.ts (modify existing)
  - Add support for storing additional account tokens in session
  - Extend JWT callback to handle multiple account data
  - Purpose: Integrate additional accounts with existing auth system
  - _Leverage: existing NextAuth configuration and Google provider_
  - _Requirements: 1.3, 3.1_

- [x] 17. Add email connections section to ProfileForm component
  - File: frontend/src/app/(site)/profile/_components/profile-form.tsx (modify existing)
  - Integrate EmailConnectionsManager into profile page
  - Add proper spacing and layout with existing sections
  - Purpose: Make email connection management accessible from profile
  - _Leverage: existing ProfileForm component structure_
  - _Requirements: 1.1_

- [x] 18. Create email connections types in frontend/src/types/email-connections.ts
  - File: frontend/src/types/email-connections.ts
  - Define TypeScript interfaces for connection data structures
  - Add OAuth flow and API response types
  - Purpose: Provide type safety for email connection features
  - _Leverage: existing type definitions in frontend/src/types/_
  - _Requirements: 1.2, 2.1_

- [ ] 19. Add connection health monitoring service
  - File: backend/email_connections/monitoring.py
  - Implement background service for checking connection health
  - Add automated token refresh and error detection
  - Purpose: Maintain connection reliability without user intervention
  - _Leverage: existing background task patterns_
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 20. Create unit tests for EmailConnection model
  - File: backend/tests/test_email_connections/test_models.py
  - Write tests for model creation, validation, and relationships
  - Test token encryption/decryption functionality
  - Purpose: Ensure model reliability and data integrity
  - _Leverage: existing test patterns in backend/tests/_
  - _Requirements: 1.1, 5.2_

- [ ] 21. Create unit tests for EmailConnectionService
  - File: backend/tests/test_email_connections/test_services.py
  - Test connection management business logic
  - Mock external OAuth API calls and database operations
  - Purpose: Verify service layer functionality and error handling
  - _Leverage: existing service test patterns_
  - _Requirements: 2.1, 2.2, 4.1_

- [ ] 22. Create API endpoint integration tests
  - File: backend/tests/test_email_connections/test_api.py
  - Test complete API workflows including OAuth flows
  - Verify proper authentication and authorization
  - Purpose: Ensure API endpoints work correctly end-to-end
  - _Leverage: existing API test patterns_
  - _Requirements: 1.2, 3.1, 5.1_

- [ ] 23. Create React component tests
  - File: frontend/src/components/profile/__tests__/email-connections-manager.test.tsx
  - Test component rendering, user interactions, and state management
  - Mock API calls and OAuth flows
  - Purpose: Verify UI components behave correctly
  - _Leverage: existing React test patterns and utilities_
  - _Requirements: 1.1, 1.4, 2.2_

- [ ] 24. Add OAuth callback route handler
  - File: frontend/src/app/api/auth/oauth-callback/route.ts
  - Handle OAuth authorization codes from additional account flows
  - Process tokens and store connection data
  - Purpose: Complete OAuth flow for additional email accounts
  - _Leverage: existing API route patterns_
  - _Requirements: 3.1, 3.2_

- [ ] 25. Create end-to-end tests for complete user journey
  - File: frontend/tests/e2e/email-connections.spec.ts
  - Test full workflow: connect account, manage connections, use for harvesting
  - Include error scenarios and edge cases
  - Purpose: Verify complete feature functionality
  - _Leverage: existing E2E test framework and patterns_
  - _Requirements: All requirements_

- [ ] 26. Update API documentation and OpenAPI schema
  - File: Various API documentation files
  - Add email connections endpoints to OpenAPI specification
  - Update API documentation with examples and schemas
  - Purpose: Provide complete API documentation for new endpoints
  - _Leverage: existing OpenAPI documentation patterns_
  - _Requirements: 1.2_

- [ ] 27. Add error handling and user feedback improvements
  - File: Multiple files (components and services)
  - Implement comprehensive error handling across all layers
  - Add user-friendly error messages and recovery guidance
  - Purpose: Ensure robust error handling and good user experience
  - _Leverage: existing error handling patterns_
  - _Requirements: 2.3, 4.3, 4.4_

- [ ] 28. Integration testing with email harvesting system
  - File: Integration test files
  - Test email connections integration with existing harvesting features
  - Verify multi-account harvesting works correctly
  - Purpose: Ensure new connections work with existing email collection
  - _Leverage: existing email harvesting integration points_
  - _Requirements: 1.5, 4.1_