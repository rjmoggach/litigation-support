# Tasks Document

## Phase 1: Core Middleware Setup

- [x] 1. Update Next.js middleware for authentication enforcement
  - File: frontend/src/middleware.ts
  - Import auth from auth.ts and check session
  - Define public paths that don't require auth (login, signup, etc.)
  - Redirect unauthenticated users to /login
  - Purpose: Enforce authentication on all protected routes
  - _Leverage: existing middleware.ts structure_
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create auth utilities for session checking
  - File: frontend/src/lib/auth-utils.ts
  - Export helper functions for auth state checking
  - Add role-based access control helpers
  - Purpose: Provide reusable auth check utilities
  - _Leverage: next-auth session types_
  - _Requirements: 1.4, 2.1_

## Phase 2: Fix Backend Integration

- [x] 3. Debug and fix credentials provider connection
  - File: frontend/src/lib/auth.ts
  - Update backend URL to use correct Docker service name
  - Add better error logging for auth failures
  - Verify token parsing and storage
  - Purpose: Ensure credentials login works with backend
  - _Leverage: existing authorize function_
  - _Requirements: 2.1, 2.2_

- [x] 4. Test and fix OAuth login endpoint connection
  - File: frontend/src/lib/auth.ts (signIn callback)
  - Verify OAuth endpoint URL is correct
  - Add error handling for OAuth failures
  - Ensure user data is properly stored in session
  - Purpose: Connect Google OAuth with backend user creation
  - _Leverage: existing OAuth callback logic_
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Fix token refresh mechanism
  - File: frontend/src/lib/auth.ts (jwt callback)
  - Debug token expiry checking logic
  - Verify refresh endpoint connection
  - Add retry logic for failed refreshes
  - Purpose: Ensure seamless token refresh
  - _Leverage: existing refresh token logic_
  - _Requirements: 2.3, 2.4, 2.5_

## Phase 3: Backend Auth Endpoints Verification

- [x] 6. Verify login endpoint functionality
  - File: backend/users/api.py (login endpoint)
  - Test with curl/Postman to ensure it works
  - Check token generation and response format
  - Verify user verification checks
  - Purpose: Ensure backend login endpoint is functional
  - _Leverage: existing login endpoint_
  - _Requirements: 2.1, 2.2_

- [x] 7. Verify OAuth login endpoint
  - File: backend/users/api.py (oauth-login endpoint)
  - Test OAuth user creation flow
  - Verify account linking for existing emails
  - Check token response format
  - Purpose: Ensure OAuth backend integration works
  - _Leverage: existing oauth_login function_
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 8. Test refresh token endpoint
  - File: backend/users/api.py (refresh endpoint)
  - Verify refresh token validation
  - Check new token generation
  - Test token rotation
  - Purpose: Ensure token refresh works correctly
  - _Leverage: existing refresh endpoint_
  - _Requirements: 2.3, 2.4_

## Phase 4: Frontend Components

- [x] 9. Create ProtectedRoute wrapper component
  - File: frontend/src/components/auth/protected-route.tsx
  - Check session and redirect if not authenticated
  - Show loading state during auth check
  - Support role-based access control
  - Purpose: Wrap pages requiring authentication
  - _Leverage: useSession hook from next-auth_
  - _Requirements: 1.1, 1.2_

- [x] 10. Update layout to use auth provider
  - File: frontend/src/app/layout.tsx
  - Ensure SessionProvider wraps the app
  - Add auth state to context
  - Purpose: Provide auth context throughout app
  - _Leverage: existing auth-provider.tsx_
  - _Requirements: 4.1, 4.2_

- [x] 11. Fix login form submission
  - File: frontend/src/components/auth/login-form.tsx
  - Update signIn call with correct parameters
  - Add proper error handling and display
  - Add loading states during authentication
  - Purpose: Ensure login form works correctly
  - _Leverage: existing login-form component_
  - _Requirements: 2.1, 5.2_

- [x] 12. Add Google OAuth button functionality
  - File: frontend/src/components/auth/login-form.tsx
  - Ensure Google sign-in button calls signIn('google')
  - Add error handling for OAuth failures
  - Show appropriate loading states
  - Purpose: Enable Google OAuth login
  - _Leverage: existing OAuth UI components_
  - _Requirements: 3.1, 3.2_

## Phase 5: Session Management

- [x] 13. Implement logout functionality
  - File: frontend/src/components/layout/header.tsx (or relevant component)
  - Add logout button that calls signOut
  - Clear local storage and cookies
  - Redirect to login after logout
  - Purpose: Allow users to log out properly
  - _Leverage: next-auth signOut function_
  - _Requirements: 4.2, 4.4_

- [x] 14. Add session synchronization across tabs
  - File: frontend/src/providers/auth-provider.tsx
  - Listen for storage events
  - Sync session state across browser tabs
  - Handle concurrent session updates
  - Purpose: Keep auth state consistent across tabs
  - _Leverage: existing auth provider_
  - _Requirements: 4.4_

- [x] 15. Implement session timeout warnings
  - File: frontend/src/components/auth/session-timeout.tsx
  - Create component to warn before token expiry
  - Add option to extend session
  - Auto-logout on timeout
  - Purpose: Improve user experience with session management
  - _Leverage: session expiry times from auth.ts_
  - _Requirements: 5.5_

## Phase 6: Error Handling and UI Feedback

- [x] 16. Add comprehensive error handling
  - File: frontend/src/lib/auth-errors.ts
  - Create error classes for different auth failures
  - Map backend errors to user-friendly messages
  - Add error recovery suggestions
  - Purpose: Provide clear error feedback to users
  - _Leverage: existing error patterns_
  - _Requirements: 5.2, 5.3_

- [x] 17. Update UI with auth status indicators
  - File: frontend/src/components/layout/user-menu.tsx
  - Display user name and avatar when logged in
  - Show login button when logged out
  - Add loading states during auth checks
  - Purpose: Show authentication status clearly
  - _Leverage: useSession hook_
  - _Requirements: 5.1, 5.4_

## Phase 7: Testing and Verification

- [x] 18. Test complete authentication flow
  - Test credential login with valid/invalid credentials
  - Test Google OAuth flow
  - Test protected route access
  - Test token refresh cycle
  - Test logout and session cleanup
  - Purpose: Ensure all auth flows work correctly
  - _Leverage: existing test infrastructure_
  - _Requirements: All_

- [x] 19. Fix any remaining issues
  - Debug any failing authentication flows
  - Resolve error messages and UI issues
  - Ensure consistent behavior across browsers
  - Purpose: Polish and finalize authentication system
  - _Leverage: debugging from previous tasks_
  - _Requirements: All_

- [x] 20. Verify production readiness
  - Check environment variables are set correctly
  - Ensure HTTPS is enforced in production
  - Verify token expiry times are appropriate
  - Test with production-like settings
  - Purpose: Ensure system is ready for deployment
  - _Leverage: environment configuration_
  - _Requirements: All non-functional requirements_