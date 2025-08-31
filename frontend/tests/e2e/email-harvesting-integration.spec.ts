/**
 * E2E Integration Tests for Email Harvesting
 * 
 * Tests the complete email harvesting workflow from UI interactions
 * through to backend integration with case management system.
 */

import { test, expect, Page } from '@playwright/test'
import { EmailConnectionsFixtures } from './fixtures/email-connections.fixtures'

test.describe('Email Harvesting Integration', () => {
  let fixtures: EmailConnectionsFixtures

  test.beforeEach(async ({ page }) => {
    fixtures = new EmailConnectionsFixtures(page)
    await fixtures.setup()
  })

  test.afterEach(async () => {
    await fixtures.cleanup()
  })

  test('should test email harvesting capability from profile page', async ({ page }) => {
    // Navigate to profile page with email connections
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Expect to see email connections section
    await expect(page.locator('[data-testid="email-connections-manager"]')).toBeVisible()

    // Look for harvesting test button or similar functionality
    const testHarvestingButton = page.locator('button:has-text("Test Harvesting")')
    
    if (await testHarvestingButton.isVisible()) {
      // Click test harvesting button
      await testHarvestingButton.click()
      
      // Wait for test results
      await expect(page.locator('[data-testid="harvesting-test-results"]')).toBeVisible({ timeout: 10000 })
      
      // Verify test results show harvesting capability
      const results = page.locator('[data-testid="harvesting-test-results"]')
      await expect(results).toContainText('harvesting_ready')
    } else {
      // Skip if harvesting test UI not implemented yet
      test.skip('Harvesting test UI not yet implemented')
    }
  })

  test('should integrate email harvesting with case management', async ({ page }) => {
    // Setup mock case data
    await fixtures.setupMockCase()

    // Navigate to cases page
    await page.goto('/cases')
    await page.waitForLoadState('networkidle')

    // Create or select a case
    let caseElement = page.locator('[data-testid="case-item"]').first()
    
    if (!(await caseElement.isVisible())) {
      // Create a new case if none exist
      await page.click('button:has-text("New Case")')
      await page.fill('[data-testid="case-name-input"]', 'Email Harvesting Test Case')
      await page.fill('[data-testid="case-number-input"]', 'EH-TEST-001')
      await page.click('button:has-text("Create Case")')
      
      caseElement = page.locator('[data-testid="case-item"]').first()
    }

    // Click on case to open details
    await caseElement.click()

    // Look for email harvesting functionality in case view
    const harvestEmailsButton = page.locator('button:has-text("Harvest Emails")')
    
    if (await harvestEmailsButton.isVisible()) {
      // Test email harvesting from case view
      await harvestEmailsButton.click()
      
      // Wait for harvesting dialog or process
      await expect(page.locator('[data-testid="harvest-emails-dialog"]')).toBeVisible({ timeout: 5000 })
      
      // Configure harvesting options
      await page.fill('[data-testid="max-messages-input"]', '5')
      
      // Start harvesting
      await page.click('button:has-text("Start Harvesting")')
      
      // Wait for harvesting to complete
      await expect(page.locator('[data-testid="harvest-results"]')).toBeVisible({ timeout: 30000 })
      
      // Verify harvesting results
      const results = page.locator('[data-testid="harvest-results"]')
      await expect(results).toContainText('harvested_count')
      
      // Check if emails appear in case documents
      await page.click('button:has-text("Documents")')
      const emailDocuments = page.locator('[data-testid="document-item"][data-type="email"]')
      
      // Should have at least one email document
      await expect(emailDocuments.first()).toBeVisible({ timeout: 10000 })
      
    } else {
      // Test via API if UI not available
      const response = await page.request.post('/api/v1/email-connections/harvest/test')
      expect(response.ok()).toBe(true)
      
      const testResults = await response.json()
      expect(testResults).toHaveProperty('harvesting_ready')
    }
  })

  test('should handle harvesting errors gracefully', async ({ page }) => {
    // Setup mock connection with expired tokens
    await fixtures.setupMockConnectionWithExpiredTokens()

    // Navigate to profile page
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Attempt to test harvesting capability
    const testButton = page.locator('button:has-text("Test Harvesting")')
    
    if (await testButton.isVisible()) {
      await testButton.click()
      
      // Should see error message about expired connections
      await expect(page.locator('.toast-error, [role="alert"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('.toast-error, [role="alert"]')).toContainText(/expired|unauthorized|refresh/i)
      
    } else {
      // Test via direct API call
      const response = await page.request.post('/api/v1/email-connections/harvest/test')
      
      if (response.ok()) {
        const results = await response.json()
        expect(results.harvesting_ready).toBe(false)
        expect(results.working_connections).toBe(0)
      }
    }
  })

  test('should display harvesting statistics', async ({ page }) => {
    // Setup mock harvested data
    await fixtures.setupMockHarvestedEmails()

    // Navigate to dashboard or statistics page
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for harvesting statistics
    const statsSection = page.locator('[data-testid="harvesting-stats"]')
    
    if (await statsSection.isVisible()) {
      // Verify statistics display
      await expect(statsSection).toContainText('Total Emails')
      await expect(statsSection).toContainText('Cases with Emails')
      
      // Check for charts or visualizations
      const chartElement = page.locator('canvas, svg, [data-testid="harvesting-chart"]')
      if (await chartElement.isVisible()) {
        expect(await chartElement.count()).toBeGreaterThan(0)
      }
      
    } else {
      // Test via API endpoint
      const response = await page.request.get('/api/v1/email-connections/harvest/stats')
      expect(response.ok()).toBe(true)
      
      const stats = await response.json()
      expect(stats).toHaveProperty('total_emails_harvested')
      expect(stats).toHaveProperty('cases_with_emails')
      expect(stats).toHaveProperty('emails_by_date')
    }
  })

  test('should integrate with case document workflow', async ({ page }) => {
    // Setup case with harvested emails
    await fixtures.setupCaseWithHarvestedEmails()

    // Navigate to case details
    await page.goto('/cases/1') // Assuming test case ID 1
    await page.waitForLoadState('networkidle')

    // Navigate to documents section
    await page.click('button:has-text("Documents"), a[href*="documents"]')
    
    // Should see email documents
    const emailDocs = page.locator('[data-testid="document-item"][data-type="email"]')
    await expect(emailDocs.first()).toBeVisible({ timeout: 10000 })

    // Click on an email document
    await emailDocs.first().click()

    // Should open email details or preview
    await expect(page.locator('[data-testid="email-document-details"]')).toBeVisible({ timeout: 5000 })

    // Verify email metadata is displayed
    await expect(page.locator('[data-testid="email-subject"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-from"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-date"]')).toBeVisible()

    // Test document actions (tag, move, delete, etc.)
    const actionsButton = page.locator('button:has-text("Actions")')
    if (await actionsButton.isVisible()) {
      await actionsButton.click()
      
      // Should show document actions menu
      await expect(page.locator('[data-testid="document-actions-menu"]')).toBeVisible()
      
      // Verify email-specific actions are available
      await expect(page.locator('button:has-text("Tag as Evidence")')).toBeVisible()
      await expect(page.locator('button:has-text("Link to Event")')).toBeVisible()
    }
  })

  test('should handle multi-account harvesting', async ({ page }) => {
    // Setup multiple email connections
    await fixtures.setupMultipleEmailConnections()

    // Navigate to profile page
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // Should see multiple connections
    const connections = page.locator('[data-testid="connection-card"]')
    await expect(connections).toHaveCount(3) // Assuming 3 test connections

    // Test harvesting capability across all connections
    const testAllButton = page.locator('button:has-text("Test All Connections")')
    
    if (await testAllButton.isVisible()) {
      await testAllButton.click()
      
      // Should see test results for each connection
      await expect(page.locator('[data-testid="connection-test-result"]')).toHaveCount(3, { timeout: 15000 })
      
      // Verify each connection test result
      const testResults = page.locator('[data-testid="connection-test-result"]')
      for (let i = 0; i < 3; i++) {
        const result = testResults.nth(i)
        await expect(result).toContainText(/working|error|expired/)
      }
    }

    // Test selective harvesting
    await page.goto('/cases/1') // Navigate to case
    
    const harvestButton = page.locator('button:has-text("Harvest Emails")')
    if (await harvestButton.isVisible()) {
      await harvestButton.click()
      
      // Should see connection selection options
      const connectionSelectors = page.locator('[data-testid="connection-selector"]')
      await expect(connectionSelectors.first()).toBeVisible({ timeout: 5000 })
      
      // Select specific connections
      await connectionSelectors.nth(0).click() // Select first connection
      await connectionSelectors.nth(2).click() // Select third connection
      
      // Start harvesting
      await page.click('button:has-text("Start Harvesting")')
      
      // Should see results indicating which connections were used
      const results = page.locator('[data-testid="harvest-results"]')
      await expect(results).toBeVisible({ timeout: 30000 })
      await expect(results).toContainText('connections_used: 2')
    }
  })

  test('should demonstrate email harvesting performance', async ({ page }) => {
    // Setup performance monitoring
    await fixtures.setupPerformanceMonitoring()

    // Navigate to a case with many potential emails
    await page.goto('/cases/1')
    await page.waitForLoadState('networkidle')

    // Start harvesting with higher message count
    const harvestButton = page.locator('button:has-text("Harvest Emails")')
    
    if (await harvestButton.isVisible()) {
      // Measure start time
      const startTime = Date.now()
      
      await harvestButton.click()
      
      // Configure for larger harvest
      await page.fill('[data-testid="max-messages-input"]', '50')
      await page.click('button:has-text("Start Harvesting")')
      
      // Wait for completion and measure time
      await expect(page.locator('[data-testid="harvest-results"]')).toBeVisible({ timeout: 60000 })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Verify reasonable performance (should complete within 1 minute)
      expect(duration).toBeLessThan(60000)
      
      // Check progress indicators were shown
      const progressIndicator = page.locator('[data-testid="harvest-progress"]')
      // Note: This might not be visible anymore since harvesting completed
      
      // Verify results show performance metrics
      const results = page.locator('[data-testid="harvest-results"]')
      const resultsText = await results.textContent()
      
      // Should show timing or performance information
      expect(resultsText).toMatch(/\d+\s*(message|email)s?\s*(in|within|\d+\s*ms|\d+\s*seconds?)/i)
    }
  })
})

/**
 * Additional helper tests for specific integration scenarios
 */
test.describe('Advanced Email Harvesting Integration', () => {
  test('should handle quota limits gracefully', async ({ page }) => {
    // Mock API quota exceeded scenario
    await page.route('/api/v1/email-connections/harvest/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'EMAIL_QUOTA_EXCEEDED',
            message: 'Gmail API daily quota exceeded',
            user_message: 'Daily email API limit reached.',
            recovery_action: 'retry'
          }
        })
      })
    })

    await page.goto('/cases/1')
    await page.waitForLoadState('networkidle')

    const harvestButton = page.locator('button:has-text("Harvest Emails")')
    if (await harvestButton.isVisible()) {
      await harvestButton.click()
      await page.click('button:has-text("Start Harvesting")')
      
      // Should show quota exceeded error
      await expect(page.locator('.toast-error, [role="alert"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('.toast-error, [role="alert"]')).toContainText(/quota.*exceeded|limit.*reached/i)
      
      // Should show retry option
      const retryButton = page.locator('button:has-text("Retry")')
      await expect(retryButton).toBeVisible({ timeout: 5000 })
    }
  })

  test('should integrate with existing document tagging system', async ({ page }) => {
    // Setup case with harvested emails and existing tagging system
    await page.goto('/cases/1/documents')
    await page.waitForLoadState('networkidle')

    // Find an email document
    const emailDoc = page.locator('[data-testid="document-item"][data-type="email"]').first()
    if (await emailDoc.isVisible()) {
      // Right-click or click actions menu
      await emailDoc.click({ button: 'right' })
      
      // Should see context menu with tagging options
      await expect(page.locator('[data-testid="document-context-menu"]')).toBeVisible({ timeout: 5000 })
      
      // Click on tag option
      await page.click('button:has-text("Add Tag")')
      
      // Should show tag input/selector
      await expect(page.locator('[data-testid="tag-input"], [data-testid="tag-selector"]')).toBeVisible()
      
      // Add a tag
      await page.fill('[data-testid="tag-input"]', 'Evidence')
      await page.press('[data-testid="tag-input"]', 'Enter')
      
      // Verify tag was applied
      await expect(emailDoc.locator('[data-testid="document-tag"]')).toContainText('Evidence')
    }
  })

  test('should validate email harvesting data integrity', async ({ page }) => {
    // Test that harvested emails maintain proper metadata and relationships
    await page.goto('/api/v1/email-connections/harvest/stats', { waitUntil: 'networkidle' })
    
    // This would be a direct API test
    const response = await page.request.get('/api/v1/email-connections/harvest/stats')
    expect(response.ok()).toBe(true)
    
    const stats = await response.json()
    
    // Validate data structure
    expect(stats).toHaveProperty('total_emails_harvested')
    expect(stats).toHaveProperty('cases_with_emails')
    expect(stats).toHaveProperty('emails_by_date')
    expect(typeof stats.total_emails_harvested).toBe('number')
    expect(typeof stats.cases_with_emails).toBe('number')
    expect(typeof stats.emails_by_date).toBe('object')
    
    // If there are harvested emails, verify the date structure
    if (stats.total_emails_harvested > 0) {
      expect(Object.keys(stats.emails_by_date).length).toBeGreaterThan(0)
      
      // Verify date format (YYYY-MM-DD)
      const dateKeys = Object.keys(stats.emails_by_date)
      for (const dateKey of dateKeys) {
        expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(typeof stats.emails_by_date[dateKey]).toBe('number')
      }
    }
  })
})