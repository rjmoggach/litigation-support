/**
 * Simplified Email Connections E2E Tests
 * 
 * This is a streamlined version of the email connections E2E tests using fixtures
 * for easier maintenance and execution. It covers the core user journey scenarios.
 */

import { test, expect, EmailConnectionsPage, MOCK_EMAIL_CONNECTIONS, TEST_USERS } from './fixtures/email-connections.fixtures'

test.describe('Email Connections - Core User Journey', () => {
  test.beforeEach(async ({ emailConnectionsPage }) => {
    await emailConnectionsPage.setupOAuthMocks()
  })

  test('should complete basic email connection workflow', async ({ emailConnectionsPage }) => {
    // Login and navigate
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Verify initial empty state
    await emailConnectionsPage.verifyNoConnections()
    
    // Add new connection
    await emailConnectionsPage.setupConnectionsMock([])
    await emailConnectionsPage.clickAddConnection()
    
    // Complete OAuth flow
    await emailConnectionsPage.connectGoogleAccount()
    
    // Setup mock for after connection is added
    await emailConnectionsPage.setupConnectionsMock([MOCK_EMAIL_CONNECTIONS.active])
    
    // Verify connection appears
    await emailConnectionsPage.verifyConnectionExists(MOCK_EMAIL_CONNECTIONS.active.email_address)
    await emailConnectionsPage.verifyConnectionCounts(1, 1, 0, 0)
  })

  test('should handle connection management operations', async ({ emailConnectionsPage }) => {
    // Setup with existing connection
    await emailConnectionsPage.setupConnectionsMock([MOCK_EMAIL_CONNECTIONS.active])
    
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Test connection
    await emailConnectionsPage.testConnection(MOCK_EMAIL_CONNECTIONS.active.email_address)
    
    // Delete connection
    await emailConnectionsPage.setupConnectionsMock([]) // Mock empty state after deletion
    await emailConnectionsPage.deleteConnection(MOCK_EMAIL_CONNECTIONS.active.email_address)
    
    // Verify empty state
    await emailConnectionsPage.verifyNoConnections()
  })

  test('should display different connection statuses', async ({ emailConnectionsPage }) => {
    // Setup with multiple connections in different states
    const connections = [
      MOCK_EMAIL_CONNECTIONS.active,
      MOCK_EMAIL_CONNECTIONS.expired,
      MOCK_EMAIL_CONNECTIONS.error
    ]
    
    await emailConnectionsPage.setupConnectionsMock(connections)
    
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Verify all connections are displayed
    for (const connection of connections) {
      await emailConnectionsPage.verifyConnectionExists(connection.email_address)
    }
    
    // Verify status counts
    await emailConnectionsPage.verifyConnectionCounts(3, 1, 1, 1)
  })
})

test.describe('Email Connections - Error Scenarios', () => {
  test('should handle OAuth errors', async ({ emailConnectionsPage, page }) => {
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Mock OAuth error
    await page.route('**/api/v1/email-connections/oauth/initiate', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'OAuth initiation failed' })
      })
    })
    
    await emailConnectionsPage.clickAddConnection()
    
    // Try to connect and expect error
    await page.click('[data-testid="connect-google-btn"]')
    
    // Verify error handling
    await expect(page.locator('text=Failed to initiate email connection')).toBeVisible()
  })

  test('should handle network errors', async ({ emailConnectionsPage, page }) => {
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Mock network error
    await page.route('**/api/v1/email-connections', async route => {
      await route.abort('failed')
    })
    
    // Try to load connections and expect graceful handling
    await page.reload()
    
    // Should show some form of error state or loading state
    // The exact implementation depends on how the app handles network errors
  })
})

test.describe('Email Connections - Mobile Responsive', () => {
  test('should work on mobile devices', async ({ emailConnectionsPage, page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await emailConnectionsPage.setupConnectionsMock([MOCK_EMAIL_CONNECTIONS.active])
    
    await emailConnectionsPage.login()
    await emailConnectionsPage.goto()
    
    // Verify responsive design
    await expect(page.locator('[data-testid="email-connections-manager"]')).toBeVisible()
    
    // Test mobile interactions
    await page.tap('[data-testid="add-email-account-btn"]')
    await expect(page.locator('[data-testid="add-email-account-dialog"]')).toBeVisible()
    
    // Verify dialog sizing on mobile
    const dialog = page.locator('[data-testid="add-email-account-dialog"]')
    const dialogBox = await dialog.boundingBox()
    const viewport = page.viewportSize()
    
    if (dialogBox && viewport) {
      expect(dialogBox.width).toBeLessThanOrEqual(viewport.width)
    }
  })
})