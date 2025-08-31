/**
 * Test fixtures for Email Connections E2E tests
 * 
 * This file contains reusable test fixtures, mock data, and helper utilities
 * for email connections testing.
 */

import { test as base, expect, Page } from '@playwright/test'

// Test data fixtures
export const TEST_USERS = {
  standard: {
    email: 'test@example.com',
    password: 'testpassword123',
    fullName: 'Test User',
    id: 1
  },
  admin: {
    email: 'admin@example.com',
    password: 'adminpassword123',
    fullName: 'Admin User',
    id: 2
  }
} as const

export const MOCK_EMAIL_CONNECTIONS = {
  active: {
    id: 123,
    email_address: 'testgmail@gmail.com',
    provider: 'google',
    provider_account_id: 'mock_google_user_id',
    connection_name: 'Test Gmail User',
    connection_status: 'active',
    created_at: new Date().toISOString(),
    last_sync_at: new Date().toISOString(),
    scopes_granted: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  },
  expired: {
    id: 124,
    email_address: 'expired@gmail.com',
    provider: 'google',
    provider_account_id: 'expired_google_user_id',
    connection_name: 'Expired Gmail User',
    connection_status: 'expired',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    last_sync_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
  },
  error: {
    id: 125,
    email_address: 'error@gmail.com',
    provider: 'google',
    provider_account_id: 'error_google_user_id',
    connection_name: 'Error Gmail User',
    connection_status: 'error',
    error_message: 'Token revoked by user',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
  }
} as const

export const MOCK_OAUTH_DATA = {
  google: {
    provider: 'google',
    authCode: 'test_auth_code_12345',
    state: 'test_state_12345',
    tokens: {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      token_type: 'Bearer'
    },
    userInfo: {
      id: 'mock_google_user_id',
      email: 'testgmail@gmail.com',
      name: 'Test Gmail User',
      verified_email: true,
      picture: 'https://lh3.googleusercontent.com/a/default-user'
    }
  }
} as const

export const API_RESPONSES = {
  connectionsList: (connections: any[] = []) => ({
    connections,
    total: connections.length,
    active: connections.filter(c => c.connection_status === 'active').length,
    expired: connections.filter(c => c.connection_status === 'expired').length,
    error: connections.filter(c => c.connection_status === 'error').length
  }),
  
  oauthInitiate: (state: string = MOCK_OAUTH_DATA.google.state) => ({
    authorization_url: `http://localhost:3000/mock-oauth?state=${state}`,
    state,
    provider: 'google'
  }),
  
  connectionTest: (email: string, status: 'success' | 'failure' = 'success') => ({
    connection_id: 123,
    status,
    email,
    message: status === 'success' ? 'Connection test successful' : 'Connection test failed',
    latest_message: status === 'success' ? {
      from: 'sender@example.com',
      date: new Date().toISOString(),
      subject: 'Test Email Subject',
      snippet: 'This is a test email snippet...'
    } : null,
    has_gmail_scope: status === 'success',
    granted_scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    connection_email: email,
    connection_name: 'Test Gmail User'
  }),
  
  deleteConnection: {
    success: true,
    message: 'Connection deleted successfully'
  }
} as const

// Extended Page class with email connections methods
export class EmailConnectionsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/profile/email-connections')
    await this.page.waitForLoadState('networkidle')
  }

  async login(user = TEST_USERS.standard) {
    await this.page.goto('/login')
    await this.page.waitForLoadState('networkidle')
    
    await this.page.fill('input[name="email"]', user.email)
    await this.page.fill('input[name="password"]', user.password)
    await this.page.click('button[type="submit"]')
    
    await this.page.waitForURL(/\/dashboard|\/profile/)
  }

  async setupConnectionsMock(connections: any[] = [MOCK_EMAIL_CONNECTIONS.active]) {
    await this.page.route('**/api/v1/email-connections', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.connectionsList(connections))
        })
      }
    })
  }

  async setupOAuthMocks() {
    // OAuth initiation
    await this.page.route('**/api/v1/email-connections/oauth/initiate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_RESPONSES.oauthInitiate())
      })
    })

    // OAuth callback
    await this.page.route('**/api/v1/email-connections/oauth/callback**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: this.generateOAuthSuccessHTML()
      })
    })
  }

  private generateOAuthSuccessHTML(): string {
    const connection = MOCK_EMAIL_CONNECTIONS.active
    return `
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Success</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              connection: {
                id: ${connection.id},
                email: '${connection.email_address}',
                name: '${connection.connection_name}',
                status: '${connection.connection_status}'
              }
            }, '*');
          }
          window.close();
        </script>
        <p>Email account connected successfully!</p>
      </body>
      </html>
    `
  }

  async clickAddConnection() {
    await this.page.click('[data-testid="add-email-account-btn"]')
    await expect(this.page.locator('[data-testid="add-email-account-dialog"]')).toBeVisible()
  }

  async connectGoogleAccount() {
    const popupPromise = this.page.waitForEvent('popup')
    await this.page.click('[data-testid="connect-google-btn"]')
    
    const popup = await popupPromise
    await popup.waitForEvent('close', { timeout: 30000 })
    
    await expect(this.page.locator('[data-testid="add-email-account-dialog"]')).not.toBeVisible()
  }

  async verifyConnectionExists(email: string) {
    await expect(this.page.locator(`[data-testid="connection-${email}"]`)).toBeVisible()
    await expect(this.page.locator(`text=${email}`)).toBeVisible()
  }

  async deleteConnection(email: string) {
    await this.page.route('**/api/v1/email-connections/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.deleteConnection)
        })
      }
    })

    await this.page.click(`[data-testid="delete-connection-${email}"]`)
    await expect(this.page.locator('[data-testid="confirm-delete-dialog"]')).toBeVisible()
    await this.page.click('[data-testid="confirm-delete-btn"]')
    
    await expect(this.page.locator(`[data-testid="connection-${email}"]`)).not.toBeVisible()
  }

  async testConnection(email: string) {
    await this.page.route('**/api/v1/email-connections/*/test', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(API_RESPONSES.connectionTest(email))
      })
    })

    await this.page.click(`[data-testid="test-connection-${email}"]`)
    await expect(this.page.locator('[data-testid="connection-test-dialog"]')).toBeVisible()
    await expect(this.page.locator('text=Connection test successful')).toBeVisible()
    
    await this.page.click('[data-testid="close-test-dialog"]')
    await expect(this.page.locator('[data-testid="connection-test-dialog"]')).not.toBeVisible()
  }

  async waitForConnectionsToLoad() {
    await this.page.waitForSelector('[data-testid="email-connections-manager"]')
    await this.page.waitForLoadState('networkidle')
  }

  async getConnectionCount() {
    const connections = this.page.locator('[data-testid^="connection-"]')
    return await connections.count()
  }

  async verifyNoConnections() {
    await expect(this.page.locator('[data-testid="no-connections-message"]')).toBeVisible()
  }

  async verifyConnectionCounts(total: number, active: number, expired: number, error: number) {
    await expect(this.page.locator('[data-testid="connection-total-count"]')).toContainText(total.toString())
    await expect(this.page.locator('[data-testid="connection-active-count"]')).toContainText(active.toString())
    await expect(this.page.locator('[data-testid="connection-expired-count"]')).toContainText(expired.toString())
    await expect(this.page.locator('[data-testid="connection-error-count"]')).toContainText(error.toString())
  }
}

// Custom test fixture that includes our EmailConnectionsPage
type EmailConnectionsFixtures = {
  emailConnectionsPage: EmailConnectionsPage
}

export const test = base.extend<EmailConnectionsFixtures>({
  emailConnectionsPage: async ({ page }, use) => {
    const emailConnectionsPage = new EmailConnectionsPage(page)
    await use(emailConnectionsPage)
  },
})

/**
 * Email Connections Fixtures class for integration testing
 * Supports both basic email connections and advanced harvesting scenarios
 */
export class EmailConnectionsFixtures {
  constructor(private page: Page) {}

  /**
   * Setup basic fixtures for email connections testing
   */
  async setup(): Promise<void> {
    // Setup authentication
    await this.setupAuthentication()
    
    // Setup basic API routes
    await this.setupBasicRoutes()
  }

  private async setupAuthentication(): Promise<void> {
    // Mock authentication session
    await this.page.route('/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USERS.standard,
          accessToken: 'mock_jwt_token_12345',
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })
    })
  }

  private async setupBasicRoutes(): Promise<void> {
    // Basic connections list
    await this.page.route('/api/v1/email-connections', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(API_RESPONSES.connectionsList([MOCK_EMAIL_CONNECTIONS.active]))
        })
      }
    })
  }

  /**
   * Setup mock case for integration testing
   */
  async setupMockCase(): Promise<void> {
    await this.page.route('/api/v1/cases', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cases: [{
            id: 1,
            case_name: 'Mock Integration Test Case',
            case_number: 'MIT-001',
            case_type: 'custody',
            case_status: 'active',
            court_level: 'Superior Court',
            court_location: 'Toronto',
            opposing_party: 'Mock Opponent',
            created_at: new Date().toISOString()
          }]
        })
      })
    })
  }

  /**
   * Setup mock connection with expired tokens
   */
  async setupMockConnectionWithExpiredTokens(): Promise<void> {
    await this.page.route('/api/v1/email-connections', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connections: [{
            id: 1,
            email_address: 'expired@example.com',
            connection_name: 'Expired Connection',
            connection_status: 'expired',
            provider: 'google',
            last_sync_at: '2024-01-01T00:00:00Z',
            error_message: 'Access token has expired',
            created_at: '2024-01-01T00:00:00Z'
          }],
          total: 1,
          active: 0,
          expired: 1,
          error: 0
        })
      })
    })

    await this.page.route('/api/v1/email-connections/harvest/test', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_connections: 1,
          active_connections: 1,
          working_connections: 0,
          harvesting_ready: false,
          connection_tests: [{
            connection_id: 1,
            email: 'expired@example.com',
            status: 'error',
            error: 'Access token has expired'
          }]
        })
      })
    })
  }

  /**
   * Setup mock harvested emails data
   */
  async setupMockHarvestedEmails(): Promise<void> {
    await this.page.route('/api/v1/email-connections/harvest/stats', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_emails_harvested: 25,
          cases_with_emails: 3,
          emails_by_date: {
            '2024-01-15': 8,
            '2024-01-16': 12,
            '2024-01-17': 5
          },
          latest_harvest_date: '2024-01-17T15:30:00Z'
        })
      })
    })
  }

  /**
   * Setup case with harvested emails
   */
  async setupCaseWithHarvestedEmails(): Promise<void> {
    // Mock case documents endpoint
    await this.page.route('/api/v1/cases/1/documents', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              id: 1,
              case_id: 1,
              original_filename: 'email_msg_123.json',
              document_type: 'email',
              party_type: 'respondent',
              document_date: '2024-01-15',
              file_size: 2048,
              uploaded_at: '2024-01-15T10:30:00Z',
              email_metadata: {
                from: 'opposing@example.com',
                to: 'myclient@example.com',
                subject: 'Important Case Communication',
                date: '2024-01-15T09:15:00Z'
              }
            },
            {
              id: 2,
              case_id: 1,
              original_filename: 'email_msg_124.json',
              document_type: 'email',
              party_type: 'respondent',
              document_date: '2024-01-16',
              file_size: 1536,
              uploaded_at: '2024-01-16T14:45:00Z',
              email_metadata: {
                from: 'lawyer@oppoingfirm.com',
                to: 'myclient@example.com',
                subject: 'Settlement Proposal',
                date: '2024-01-16T14:20:00Z'
              }
            }
          ]
        })
      })
    })
  }

  /**
   * Setup multiple email connections for testing
   */
  async setupMultipleEmailConnections(): Promise<void> {
    await this.page.route('/api/v1/email-connections', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connections: [
            {
              id: 1,
              email_address: 'account1@example.com',
              connection_name: 'Primary Account',
              connection_status: 'active',
              provider: 'google',
              last_sync_at: '2024-01-17T10:00:00Z',
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 2,
              email_address: 'account2@example.com',
              connection_name: 'Secondary Account',
              connection_status: 'active',
              provider: 'google',
              last_sync_at: '2024-01-17T09:30:00Z',
              created_at: '2024-01-02T00:00:00Z'
            },
            {
              id: 3,
              email_address: 'account3@example.com',
              connection_name: 'Backup Account',
              connection_status: 'expired',
              provider: 'google',
              last_sync_at: '2024-01-10T15:00:00Z',
              error_message: 'Token refresh failed',
              created_at: '2024-01-03T00:00:00Z'
            }
          ],
          total: 3,
          active: 2,
          expired: 1,
          error: 0
        })
      })
    })

    // Mock harvesting test for multiple connections
    await this.page.route('/api/v1/email-connections/harvest/test', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_connections: 3,
          active_connections: 2,
          working_connections: 2,
          harvesting_ready: true,
          connection_tests: [
            {
              connection_id: 1,
              email: 'account1@example.com',
              status: 'working',
              profile_email: 'account1@example.com',
              has_messages: true
            },
            {
              connection_id: 2,
              email: 'account2@example.com',
              status: 'working',
              profile_email: 'account2@example.com',
              has_messages: true
            },
            {
              connection_id: 3,
              email: 'account3@example.com',
              status: 'error',
              error: 'Token refresh failed'
            }
          ]
        })
      })
    })
  }

  /**
   * Setup performance monitoring for harvesting tests
   */
  async setupPerformanceMonitoring(): Promise<void> {
    // Track API call timing
    await this.page.route('/api/v1/email-connections/harvest/**', async route => {
      const startTime = Date.now()
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const duration = Date.now() - startTime
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          harvested_count: 25,
          connections_used: 2,
          processing_time_ms: duration,
          connection_results: [
            {
              connection_id: 1,
              email_address: 'account1@example.com',
              messages_fetched: 15,
              messages_harvested: 15,
              processing_time_ms: Math.floor(duration * 0.6)
            },
            {
              connection_id: 2,
              email_address: 'account2@example.com',
              messages_fetched: 10,
              messages_harvested: 10,
              processing_time_ms: Math.floor(duration * 0.4)
            }
          ],
          errors: []
        })
      })
    })
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    // Clean up any test data, mock servers, etc.
    // In a real implementation, this might:
    // - Stop mock servers
    // - Clear test database entries
    // - Reset authentication state
    console.log('Cleaning up EmailConnections test fixtures')
  }
}

export { expect } from '@playwright/test'