/**
 * End-to-End Tests for Email Account Connections
 * 
 * This test suite covers the complete user journey for the email connections feature:
 * - User authentication and session management
 * - Adding new email account connections via OAuth
 * - Managing existing connections (view, test, delete)
 * - Connection status monitoring and updates
 * - Integration with email harvesting workflows
 * - Error scenarios and edge cases
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test'

// Test configuration and constants
const TEST_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    testUser: {
        email: 'test@example.com',
        password: 'testpassword123',
        fullName: 'Test User',
    },
    oauth: {
        timeout: 30000, // 30 seconds for OAuth flows
        popupTimeout: 60000, // 1 minute for popup interactions
    },
    api: {
        timeout: 10000, // 10 seconds for API calls
    }
}

// Mock Google OAuth configuration for testing
const MOCK_OAUTH_CONFIG = {
    provider: 'google',
    mockAuthCode: 'test_auth_code_12345',
    mockTokens: {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
    },
    mockUserInfo: {
        id: 'mock_google_user_id',
        email: 'testgmail@gmail.com',
        name: 'Test Gmail User',
        verified_email: true,
    }
}

/**
 * Test helper functions
 */
class EmailConnectionsTestHelper {
    constructor(private page: Page) {}

    /**
     * Login with test user credentials
     */
    async login() {
        await this.page.goto(`${TEST_CONFIG.baseUrl}/login`)
        await this.page.waitForLoadState('networkidle')

        // Fill login form
        await this.page.fill('input[name="email"]', TEST_CONFIG.testUser.email)
        await this.page.fill('input[name="password"]', TEST_CONFIG.testUser.password)
        
        // Submit login
        await this.page.click('button[type="submit"]')
        
        // Wait for successful login and redirect
        await this.page.waitForURL(/\/dashboard|\/profile/)
        
        // Verify user is logged in
        await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible()
    }

    /**
     * Navigate to email connections page
     */
    async navigateToEmailConnections() {
        // Navigate to profile/settings where email connections are managed
        await this.page.goto(`${TEST_CONFIG.baseUrl}/profile/email-connections`)
        await this.page.waitForLoadState('networkidle')

        // Wait for the email connections manager component to load
        await expect(this.page.locator('[data-testid="email-connections-manager"]')).toBeVisible()
    }

    /**
     * Mock OAuth flow for testing without actual Google authentication
     */
    async setupOAuthMocks() {
        // Intercept OAuth initiation API call
        await this.page.route('**/api/v1/email-connections/oauth/initiate', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    authorization_url: `${TEST_CONFIG.baseUrl}/mock-oauth?state=test_state_12345`,
                    state: 'test_state_12345',
                    provider: 'google'
                })
            })
        })

        // Intercept OAuth callback API call
        await this.page.route('**/api/v1/email-connections/oauth/callback**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: `
                    <!DOCTYPE html>
                    <html>
                    <head><title>OAuth Success</title></head>
                    <body>
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({
                                    type: 'OAUTH_SUCCESS',
                                    connection: {
                                        id: 123,
                                        email: '${MOCK_OAUTH_CONFIG.mockUserInfo.email}',
                                        name: '${MOCK_OAUTH_CONFIG.mockUserInfo.name}',
                                        status: 'active'
                                    }
                                }, '*');
                            }
                            window.close();
                        </script>
                        <p>Email account connected successfully!</p>
                    </body>
                    </html>
                `
            })
        })

        // Mock connections list API
        await this.page.route('**/api/v1/email-connections', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        connections: [
                            {
                                id: 123,
                                email_address: MOCK_OAUTH_CONFIG.mockUserInfo.email,
                                provider: 'google',
                                provider_account_id: MOCK_OAUTH_CONFIG.mockUserInfo.id,
                                connection_name: MOCK_OAUTH_CONFIG.mockUserInfo.name,
                                connection_status: 'active',
                                created_at: new Date().toISOString(),
                                last_sync_at: new Date().toISOString(),
                                scopes_granted: [
                                    'https://www.googleapis.com/auth/gmail.readonly',
                                    'https://www.googleapis.com/auth/userinfo.email',
                                    'https://www.googleapis.com/auth/userinfo.profile'
                                ]
                            }
                        ],
                        total: 1,
                        active: 1,
                        expired: 0,
                        error: 0
                    })
                })
            }
        })
    }

    /**
     * Click add email account button and handle dialog
     */
    async clickAddEmailAccount() {
        await this.page.click('[data-testid="add-email-account-btn"]')
        
        // Wait for dialog to open
        await expect(this.page.locator('[data-testid="add-email-account-dialog"]')).toBeVisible()
        
        // Verify dialog content
        await expect(this.page.locator('text=Connect Additional Gmail Account')).toBeVisible()
        await expect(this.page.locator('text=Google Workspace')).toBeVisible()
    }

    /**
     * Handle OAuth popup flow
     */
    async handleOAuthPopup() {
        // Set up popup handler before triggering OAuth
        const popupPromise = this.page.waitForEvent('popup')
        
        // Click connect button to trigger OAuth
        await this.page.click('[data-testid="connect-google-btn"]')
        
        // Wait for popup to open
        const popup = await popupPromise
        await popup.waitForLoadState('networkidle')
        
        // Popup should close automatically due to our mock
        await popup.waitForEvent('close', { timeout: TEST_CONFIG.oauth.timeout })
        
        // Wait for dialog to close
        await expect(this.page.locator('[data-testid="add-email-account-dialog"]')).not.toBeVisible()
    }

    /**
     * Verify connection appears in the list
     */
    async verifyConnectionInList(email: string) {
        await expect(this.page.locator(`[data-testid="connection-${email}"]`)).toBeVisible()
        await expect(this.page.locator(`text=${email}`)).toBeVisible()
        await expect(this.page.locator('[data-testid="connection-status-active"]')).toBeVisible()
    }

    /**
     * Test connection functionality
     */
    async testConnection(email: string) {
        // Mock connection test API
        await this.page.route('**/api/v1/email-connections/*/test', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    connection_id: 123,
                    status: 'success',
                    email: email,
                    message: 'Connection test successful',
                    latest_message: {
                        from: 'sender@example.com',
                        date: new Date().toISOString(),
                        subject: 'Test Email Subject',
                        snippet: 'This is a test email snippet...'
                    },
                    has_gmail_scope: true,
                    granted_scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
                    connection_email: email,
                    connection_name: MOCK_OAUTH_CONFIG.mockUserInfo.name
                })
            })
        })

        // Click test connection button
        await this.page.click(`[data-testid="test-connection-${email}"]`)
        
        // Wait for test dialog to open
        await expect(this.page.locator('[data-testid="connection-test-dialog"]')).toBeVisible()
        
        // Verify test results
        await expect(this.page.locator('text=Connection test successful')).toBeVisible()
        await expect(this.page.locator('text=Test Email Subject')).toBeVisible()
        
        // Close test dialog
        await this.page.click('[data-testid="close-test-dialog"]')
        await expect(this.page.locator('[data-testid="connection-test-dialog"]')).not.toBeVisible()
    }

    /**
     * Delete a connection
     */
    async deleteConnection(email: string) {
        // Mock delete API
        await this.page.route('**/api/v1/email-connections/*', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        message: 'Connection deleted successfully'
                    })
                })
            }
        })

        // Click delete button
        await this.page.click(`[data-testid="delete-connection-${email}"]`)
        
        // Confirm deletion in dialog
        await expect(this.page.locator('[data-testid="confirm-delete-dialog"]')).toBeVisible()
        await this.page.click('[data-testid="confirm-delete-btn"]')
        
        // Wait for connection to be removed from list
        await expect(this.page.locator(`[data-testid="connection-${email}"]`)).not.toBeVisible()
    }
}

/**
 * Test Suite: Email Connections Complete User Journey
 */
test.describe('Email Connections - Complete User Journey', () => {
    let helper: EmailConnectionsTestHelper

    test.beforeEach(async ({ page }) => {
        helper = new EmailConnectionsTestHelper(page)
        
        // Set up OAuth mocks before each test
        await helper.setupOAuthMocks()
    })

    test('should complete full email connection workflow', async ({ page }) => {
        // Step 1: Login
        await helper.login()
        
        // Step 2: Navigate to email connections
        await helper.navigateToEmailConnections()
        
        // Step 3: Verify initial state (no connections)
        await expect(page.locator('[data-testid="no-connections-message"]')).toBeVisible()
        
        // Step 4: Add new email connection
        await helper.clickAddEmailAccount()
        
        // Step 5: Handle OAuth flow
        await helper.handleOAuthPopup()
        
        // Step 6: Verify connection appears in list
        await helper.verifyConnectionInList(MOCK_OAUTH_CONFIG.mockUserInfo.email)
        
        // Step 7: Test the connection
        await helper.testConnection(MOCK_OAUTH_CONFIG.mockUserInfo.email)
        
        // Step 8: Verify connection status and metadata
        await expect(page.locator('[data-testid="connection-active-count"]')).toContainText('1')
        await expect(page.locator('[data-testid="connection-total-count"]')).toContainText('1')
        
        // Step 9: Clean up - delete the connection
        await helper.deleteConnection(MOCK_OAUTH_CONFIG.mockUserInfo.email)
        
        // Step 10: Verify no connections remain
        await expect(page.locator('[data-testid="no-connections-message"]')).toBeVisible()
    })

    test('should handle OAuth errors gracefully', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Mock OAuth error response
        await page.route('**/api/v1/email-connections/oauth/callback**', async route => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    detail: 'OAuth callback failed: Invalid authorization code'
                })
            })
        })
        
        await helper.clickAddEmailAccount()
        
        // Trigger OAuth flow that will fail
        const popupPromise = page.waitForEvent('popup')
        await page.click('[data-testid="connect-google-btn"]')
        const popup = await popupPromise
        
        // Wait for error handling
        await popup.waitForEvent('close', { timeout: TEST_CONFIG.oauth.timeout })
        
        // Verify error message is shown
        await expect(page.locator('[data-testid="oauth-error-message"]')).toBeVisible()
        await expect(page.locator('text=Failed to connect email account')).toBeVisible()
    })

    test('should handle connection status updates', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Mock connection with expired status
        await page.route('**/api/v1/email-connections', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        connections: [
                            {
                                id: 123,
                                email_address: MOCK_OAUTH_CONFIG.mockUserInfo.email,
                                provider: 'google',
                                provider_account_id: MOCK_OAUTH_CONFIG.mockUserInfo.id,
                                connection_name: MOCK_OAUTH_CONFIG.mockUserInfo.name,
                                connection_status: 'expired',
                                created_at: new Date().toISOString(),
                                last_sync_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                                scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
                            }
                        ],
                        total: 1,
                        active: 0,
                        expired: 1,
                        error: 0
                    })
                })
            }
        })
        
        // Reload connections
        await page.reload()
        await page.waitForLoadState('networkidle')
        
        // Verify expired status is shown
        await expect(page.locator('[data-testid="connection-status-expired"]')).toBeVisible()
        await expect(page.locator('[data-testid="connection-expired-count"]')).toContainText('1')
        
        // Mock refresh token API
        await page.route('**/api/v1/email-connections/*/refresh', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    message: 'Token refreshed successfully',
                    new_expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
                })
            })
        })
        
        // Try to refresh the connection
        await page.click(`[data-testid="refresh-connection-${MOCK_OAUTH_CONFIG.mockUserInfo.email}"]`)
        
        // Verify success message
        await expect(page.locator('text=Token refreshed successfully')).toBeVisible()
    })

    test('should integrate with email harvesting workflow', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Set up connection
        await helper.setupOAuthMocks()
        await helper.clickAddEmailAccount()
        await helper.handleOAuthPopup()
        await helper.verifyConnectionInList(MOCK_OAUTH_CONFIG.mockUserInfo.email)
        
        // Navigate to email harvesting page
        await page.goto(`${TEST_CONFIG.baseUrl}/harvesting`)
        await page.waitForLoadState('networkidle')
        
        // Verify connected email account appears in harvesting source options
        await expect(page.locator('[data-testid="email-source-selector"]')).toBeVisible()
        await expect(page.locator(`option[value="${MOCK_OAUTH_CONFIG.mockUserInfo.email}"]`)).toBeVisible()
        
        // Mock harvesting API
        await page.route('**/api/v1/harvesting/start', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    job_id: 'harvest_job_12345',
                    status: 'started',
                    source_email: MOCK_OAUTH_CONFIG.mockUserInfo.email,
                    estimated_emails: 150
                })
            })
        })
        
        // Select the connected email account and start harvesting
        await page.selectOption('[data-testid="email-source-selector"]', MOCK_OAUTH_CONFIG.mockUserInfo.email)
        await page.click('[data-testid="start-harvesting-btn"]')
        
        // Verify harvesting started
        await expect(page.locator('text=Harvesting started')).toBeVisible()
        await expect(page.locator('text=150 emails estimated')).toBeVisible()
    })

    test('should handle multiple concurrent connections', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Mock multiple connections
        await page.route('**/api/v1/email-connections', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        connections: [
                            {
                                id: 123,
                                email_address: 'user1@gmail.com',
                                provider: 'google',
                                connection_status: 'active',
                                connection_name: 'Work Gmail',
                                created_at: new Date().toISOString(),
                                last_sync_at: new Date().toISOString(),
                                scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
                            },
                            {
                                id: 124,
                                email_address: 'user2@gmail.com', 
                                provider: 'google',
                                connection_status: 'active',
                                connection_name: 'Personal Gmail',
                                created_at: new Date().toISOString(),
                                last_sync_at: new Date().toISOString(),
                                scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
                            },
                            {
                                id: 125,
                                email_address: 'user3@gmail.com',
                                provider: 'google', 
                                connection_status: 'error',
                                connection_name: 'Old Gmail',
                                error_message: 'Token revoked by user',
                                created_at: new Date().toISOString(),
                                scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
                            }
                        ],
                        total: 3,
                        active: 2,
                        expired: 0,
                        error: 1
                    })
                })
            }
        })
        
        // Reload to show multiple connections
        await page.reload()
        await page.waitForLoadState('networkidle')
        
        // Verify all connections are displayed
        await expect(page.locator('[data-testid="connection-user1@gmail.com"]')).toBeVisible()
        await expect(page.locator('[data-testid="connection-user2@gmail.com"]')).toBeVisible()
        await expect(page.locator('[data-testid="connection-user3@gmail.com"]')).toBeVisible()
        
        // Verify status counts
        await expect(page.locator('[data-testid="connection-total-count"]')).toContainText('3')
        await expect(page.locator('[data-testid="connection-active-count"]')).toContainText('2')
        await expect(page.locator('[data-testid="connection-error-count"]')).toContainText('1')
        
        // Verify error connection shows error state
        await expect(page.locator('[data-testid="connection-status-error"]')).toBeVisible()
        await expect(page.locator('text=Token revoked by user')).toBeVisible()
    })

    test('should validate security and permissions', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Add connection with detailed permission checking
        await helper.clickAddEmailAccount()
        
        // Verify security information is displayed
        await expect(page.locator('text=Permissions Requested')).toBeVisible()
        await expect(page.locator('text=Read Gmail Messages')).toBeVisible()
        await expect(page.locator('text=Basic Profile Info')).toBeVisible()
        
        // Verify security notices
        await expect(page.locator('text=Your data is encrypted and secure')).toBeVisible()
        await expect(page.locator('text=Read-only access only')).toBeVisible()
        
        // Verify scope explanations
        await expect(page.locator('text=gmail.readonly')).toBeVisible()
        await expect(page.locator('text=userinfo.email')).toBeVisible()
        await expect(page.locator('text=userinfo.profile')).toBeVisible()
        
        // Test OAuth with minimal scopes
        await page.route('**/api/v1/email-connections/oauth/initiate', async route => {
            const body = await route.request().postDataJSON()
            
            // Verify requested scopes include only necessary permissions
            expect(body.scopes).toContain('https://www.googleapis.com/auth/gmail.readonly')
            expect(body.scopes).toContain('https://www.googleapis.com/auth/userinfo.email')
            
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    authorization_url: `${TEST_CONFIG.baseUrl}/mock-oauth?state=test_state_12345`,
                    state: 'test_state_12345',
                    provider: 'google'
                })
            })
        })
        
        await helper.handleOAuthPopup()
        
        // Verify connection was created with correct scopes
        await helper.verifyConnectionInList(MOCK_OAUTH_CONFIG.mockUserInfo.email)
    })
})

/**
 * Test Suite: Error Scenarios and Edge Cases
 */
test.describe('Email Connections - Error Scenarios', () => {
    let helper: EmailConnectionsTestHelper

    test.beforeEach(async ({ page }) => {
        helper = new EmailConnectionsTestHelper(page)
    })

    test('should handle popup blocked scenario', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Block popups by overriding window.open
        await page.addInitScript(() => {
            // @ts-ignore
            window.open = () => null
        })
        
        await helper.clickAddEmailAccount()
        await page.click('[data-testid="connect-google-btn"]')
        
        // Verify popup blocked error message
        await expect(page.locator('text=Please allow popups for this site')).toBeVisible()
    })

    test('should handle network errors during OAuth', async ({ page }) => {
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Mock network error for OAuth initiation
        await page.route('**/api/v1/email-connections/oauth/initiate', async route => {
            await route.abort('failed')
        })
        
        await helper.clickAddEmailAccount()
        await page.click('[data-testid="connect-google-btn"]')
        
        // Verify network error handling
        await expect(page.locator('text=Failed to initiate email connection')).toBeVisible()
    })

    test('should handle OAuth timeout scenario', async ({ page }) => {
        await helper.login() 
        await helper.navigateToEmailConnections()
        
        // Set very short timeout for testing
        await page.route('**/api/v1/email-connections/oauth/initiate', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    authorization_url: `${TEST_CONFIG.baseUrl}/mock-oauth-timeout`,
                    state: 'test_state_timeout',
                    provider: 'google'
                })
            })
        })
        
        await helper.clickAddEmailAccount()
        
        // Start OAuth flow that will timeout
        const popupPromise = page.waitForEvent('popup')
        await page.click('[data-testid="connect-google-btn"]')
        const popup = await popupPromise
        
        // Let it timeout (popup stays open without responding)
        await page.waitForTimeout(TEST_CONFIG.oauth.timeout + 1000)
        
        // Verify timeout error handling
        await expect(page.locator('text=Connection timed out')).toBeVisible()
        
        // Clean up popup
        if (!popup.isClosed()) {
            await popup.close()
        }
    })

    test('should handle invalid session during OAuth callback', async ({ page }) => {
        // Mock invalid session scenario
        await page.route('**/api/auth/oauth-callback**', async route => {
            await route.fulfill({
                status: 401,
                contentType: 'text/html',
                body: `
                    <!DOCTYPE html>
                    <html>
                    <head><title>Session Error</title></head>
                    <body>
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({
                                    type: 'OAUTH_ERROR',
                                    error: 'session_expired',
                                    error_description: 'Your session has expired. Please log in again.'
                                }, '*');
                            }
                            window.close();
                        </script>
                        <p>Session expired. Please log in again.</p>
                    </body>
                    </html>
                `
            })
        })
        
        await helper.login()
        await helper.navigateToEmailConnections()
        await helper.clickAddEmailAccount()
        
        // Trigger OAuth that will result in session error
        const popupPromise = page.waitForEvent('popup')
        await page.click('[data-testid="connect-google-btn"]')
        const popup = await popupPromise
        await popup.waitForEvent('close')
        
        // Verify session error handling
        await expect(page.locator('text=Your session has expired')).toBeVisible()
    })
})

/**
 * Performance and Load Testing
 */
test.describe('Email Connections - Performance Tests', () => {
    test('should handle large number of connections efficiently', async ({ page }) => {
        const helper = new EmailConnectionsTestHelper(page)
        await helper.login()
        
        // Mock large number of connections
        const connections = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            email_address: `user${i + 1}@gmail.com`,
            provider: 'google',
            connection_status: i % 4 === 0 ? 'error' : i % 3 === 0 ? 'expired' : 'active',
            connection_name: `Gmail Account ${i + 1}`,
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            last_sync_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
            scopes_granted: ['https://www.googleapis.com/auth/gmail.readonly']
        }))
        
        await page.route('**/api/v1/email-connections', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        connections,
                        total: connections.length,
                        active: connections.filter(c => c.connection_status === 'active').length,
                        expired: connections.filter(c => c.connection_status === 'expired').length,
                        error: connections.filter(c => c.connection_status === 'error').length
                    })
                })
            }
        })
        
        // Measure page load time with many connections
        const startTime = Date.now()
        await helper.navigateToEmailConnections()
        const loadTime = Date.now() - startTime
        
        // Verify page loads within reasonable time (< 3 seconds)
        expect(loadTime).toBeLessThan(3000)
        
        // Verify all connections are displayed
        await expect(page.locator('[data-testid^="connection-user"]')).toHaveCount(50)
        
        // Test scrolling performance
        await page.evaluate(() => {
            const connectionsContainer = document.querySelector('[data-testid="connections-list"]')
            if (connectionsContainer) {
                connectionsContainer.scrollTop = connectionsContainer.scrollHeight
            }
        })
        
        // Verify scrolling is smooth and responsive
        await page.waitForTimeout(100)
        await expect(page.locator('[data-testid="connection-user50@gmail.com"]')).toBeVisible()
    })
})

/**
 * Accessibility Testing
 */
test.describe('Email Connections - Accessibility', () => {
    test('should be fully accessible with screen readers', async ({ page }) => {
        const helper = new EmailConnectionsTestHelper(page)
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Check ARIA labels and roles
        await expect(page.locator('[role="main"]')).toBeVisible()
        await expect(page.locator('[aria-label="Email connections manager"]')).toBeVisible()
        
        // Check keyboard navigation
        await page.keyboard.press('Tab')
        await expect(page.locator('[data-testid="add-email-account-btn"]:focus')).toBeVisible()
        
        // Test dialog accessibility
        await helper.clickAddEmailAccount()
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page.locator('[aria-labelledby="dialog-title"]')).toBeVisible()
        
        // Test keyboard navigation within dialog
        await page.keyboard.press('Tab')
        await expect(page.locator('[data-testid="connect-google-btn"]:focus')).toBeVisible()
        
        // Test ESC key to close dialog
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-testid="add-email-account-dialog"]')).not.toBeVisible()
        
        // Check color contrast and visual indicators
        const connectButton = page.locator('[data-testid="add-email-account-btn"]')
        const buttonStyles = await connectButton.evaluate(el => {
            const styles = window.getComputedStyle(el)
            return {
                backgroundColor: styles.backgroundColor,
                color: styles.color,
                border: styles.border
            }
        })
        
        // Verify button has proper styling for visibility
        expect(buttonStyles.backgroundColor).not.toBe('transparent')
        expect(buttonStyles.color).not.toBe(buttonStyles.backgroundColor)
    })
})

/**
 * Cross-browser and Mobile Testing
 */
test.describe('Email Connections - Cross-platform', () => {
    test('should work on mobile devices', async ({ page, browserName }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
        
        const helper = new EmailConnectionsTestHelper(page)
        await helper.login()
        await helper.navigateToEmailConnections()
        
        // Verify responsive design
        await expect(page.locator('[data-testid="email-connections-manager"]')).toBeVisible()
        
        // Test mobile-specific interactions
        await page.tap('[data-testid="add-email-account-btn"]')
        await expect(page.locator('[data-testid="add-email-account-dialog"]')).toBeVisible()
        
        // Verify dialog sizing on mobile
        const dialog = page.locator('[data-testid="add-email-account-dialog"]')
        const dialogBox = await dialog.boundingBox()
        const viewport = page.viewportSize()
        
        if (dialogBox && viewport) {
            // Dialog should not exceed viewport width with some margin
            expect(dialogBox.width).toBeLessThanOrEqual(viewport.width - 40)
        }
    })
})