# Email Connections End-to-End Tests

This directory contains comprehensive end-to-end tests for the email connections feature of the litigation support application.

## Overview

The E2E tests cover the complete user journey for email account connections:

- **User Authentication**: Login and session management
- **OAuth Flow**: Adding new email accounts via Google OAuth
- **Connection Management**: View, test, and delete existing connections
- **Status Monitoring**: Connection health and error states
- **Integration Testing**: Email connections with harvesting workflows
- **Error Scenarios**: Network failures, OAuth errors, and edge cases
- **Accessibility**: Screen reader compatibility and keyboard navigation
- **Mobile Responsive**: Touch interactions and mobile layouts
- **Performance**: Large datasets and concurrent operations

## Test Structure

```
tests/e2e/
├── email-connections.spec.ts          # Comprehensive test suite
├── email-connections-simple.spec.ts   # Simplified core tests
├── fixtures/
│   └── email-connections.fixtures.ts  # Test data and utilities
├── setup/
│   ├── global-setup.ts                # Global test setup
│   └── global-teardown.ts             # Global test cleanup
└── README.md                          # This file
```

## Prerequisites

1. **Playwright Installation**: Install Playwright and browsers
   ```bash
   npm run test:e2e:install
   ```

2. **Environment Setup**: Ensure both frontend and backend services are available
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8000`

3. **Test Data**: The tests use mock data and don't require real Google OAuth credentials

## Running Tests

### Basic Test Execution

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug
```

### Specific Test Files

```bash
# Run only the comprehensive test suite
npx playwright test email-connections.spec.ts

# Run only the simplified test suite
npx playwright test email-connections-simple.spec.ts

# Run specific test by name
npx playwright test --grep "should complete basic email connection workflow"
```

### Browser-Specific Testing

```bash
# Test on specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Mobile testing
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Test Configuration

The tests are configured via `playwright.config.ts`:

- **Cross-browser Testing**: Chrome, Firefox, Safari
- **Mobile Testing**: iOS and Android viewports
- **Accessibility Testing**: Specialized configuration
- **Video Recording**: On test failures
- **Screenshots**: On test failures
- **Test Reports**: HTML, JSON, and JUnit formats

## Mock Data and Fixtures

### Test Users
- **Standard User**: `test@example.com` / `testpassword123`
- **Admin User**: `admin@example.com` / `adminpassword123`

### Mock Email Connections
- **Active Connection**: `testgmail@gmail.com` (working state)
- **Expired Connection**: `expired@gmail.com` (needs token refresh)
- **Error Connection**: `error@gmail.com` (token revoked)

### OAuth Mocking
The tests use comprehensive OAuth mocking to simulate:
- Authorization URL generation
- OAuth popup flows
- Token exchange
- User info retrieval
- Error scenarios

## Test Scenarios

### Core User Journey
1. **Login and Navigation**: User authentication and page access
2. **Empty State**: Initial state with no connections
3. **Add Connection**: Complete OAuth flow to add Gmail account
4. **Connection Management**: Test, refresh, and delete connections
5. **Status Monitoring**: Verify different connection states

### Error Scenarios
1. **OAuth Errors**: Failed authorization, invalid codes
2. **Network Errors**: API failures, timeouts
3. **Popup Blocking**: Browser popup restrictions
4. **Session Expiry**: Token refresh and re-authentication

### Edge Cases
1. **Multiple Connections**: Managing many email accounts
2. **Concurrent Operations**: Simultaneous connection operations
3. **Performance**: Large datasets and response times
4. **Mobile Interactions**: Touch events and responsive design

## Debugging Tests

### Debug Mode
```bash
npm run test:e2e:debug
```
This opens the Playwright Inspector for step-by-step debugging.

### Console Logging
Tests include detailed console logging:
```bash
# View detailed logs
npx playwright test --reporter=line
```

### Screenshot and Video
Failed tests automatically capture:
- Screenshots at failure point
- Video recordings of the entire test
- Network logs and console errors

### Test Results
Results are saved to:
- `test-results/html-report/` - Interactive HTML report
- `test-results/test-results.json` - Detailed JSON results
- `test-results/junit-results.xml` - CI/CD compatible results

## CI/CD Integration

The tests are configured for CI/CD environments:

```yaml
# Example GitHub Actions integration
- name: Install Playwright
  run: npm run test:e2e:install

- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/
```

## Maintenance

### Adding New Tests
1. Use the fixture system for consistent test data
2. Follow the existing pattern for page objects
3. Include both success and error scenarios
4. Add accessibility checks for new UI elements

### Updating Mocks
1. Update `fixtures/email-connections.fixtures.ts` for new mock data
2. Modify API response mocks to match backend changes
3. Keep OAuth mocks synchronized with real OAuth flows

### Performance Monitoring
1. Tests include performance assertions
2. Monitor test execution times
3. Add performance tests for new features

## Troubleshooting

### Common Issues

1. **Tests Timeout**: Increase timeout values or check service availability
2. **Popup Blocked**: Ensure test environment allows popups
3. **Mock Failures**: Verify API response formats match expectations
4. **Browser Issues**: Update browsers with `npm run test:e2e:install`

### Environment Issues
- Ensure both frontend and backend services are running
- Check that ports 3000 and 8000 are available
- Verify database connections for backend services

### OAuth Issues
- Tests use mocked OAuth flows, not real Google OAuth
- Ensure mock responses match expected OAuth callback formats
- Check popup window handling in different browsers

## Contributing

When adding new E2E tests:

1. **Follow Patterns**: Use existing test structure and naming
2. **Include Documentation**: Add comments for complex test logic
3. **Test Coverage**: Include both happy path and error scenarios
4. **Accessibility**: Ensure new features are accessible
5. **Mobile Support**: Test responsive design changes

## Related Documentation

- [Email Connections Specification](../../.spec-workflow/specs/email-account-connections/)
- [OAuth Integration Guide](../docs/oauth-integration.md)
- [API Documentation](../docs/api-reference.md)
- [Component Documentation](../src/components/profile/README.md)