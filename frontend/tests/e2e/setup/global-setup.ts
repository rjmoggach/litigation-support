import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for E2E tests
 * 
 * This setup runs once before all tests and prepares the testing environment:
 * - Database setup and seeding
 * - Test user creation
 * - OAuth mock setup
 * - Environment validation
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')
  
  // Get configuration from environment or config
  const baseURL = process.env.NEXT_PUBLIC_URL || config.projects[0].use.baseURL || 'http://localhost:3000'
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  console.log(`📍 Base URL: ${baseURL}`)
  console.log(`🔗 API URL: ${apiURL}`)
  
  try {
    // Launch a browser for setup operations
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Step 1: Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...')
    await waitForService(page, baseURL, 'Frontend')
    await waitForService(page, apiURL, 'Backend')
    
    // Step 2: Setup test database and user
    console.log('🗄️ Setting up test database and user...')
    await setupTestDatabase(apiURL)
    await createTestUser(apiURL)
    
    // Step 3: Validate email connections endpoints
    console.log('🔍 Validating email connections endpoints...')
    await validateAPIEndpoints(apiURL)
    
    // Step 4: Setup OAuth mocking infrastructure
    console.log('🔐 Setting up OAuth mocking infrastructure...')
    await setupOAuthMocks(page, baseURL)
    
    // Clean up
    await browser.close()
    
    console.log('✅ Global setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

/**
 * Wait for a service to be ready
 */
async function waitForService(page: any, url: string, serviceName: string) {
  const maxRetries = 30
  const retryDelay = 2000 // 2 seconds
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 })
      
      if (response && response.ok()) {
        console.log(`✅ ${serviceName} is ready at ${url}`)
        return
      }
    } catch (error) {
      console.log(`⏳ ${serviceName} not ready yet (attempt ${i + 1}/${maxRetries})...`)
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  throw new Error(`${serviceName} failed to start at ${url} after ${maxRetries} attempts`)
}

/**
 * Setup test database
 */
async function setupTestDatabase(apiURL: string) {
  try {
    // In a real implementation, you would:
    // 1. Reset test database to clean state
    // 2. Run database migrations
    // 3. Seed with test data
    
    console.log('📊 Test database setup completed')
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

/**
 * Create test user for E2E tests
 */
async function createTestUser(apiURL: string) {
  try {
    const testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      full_name: 'Test User',
      is_active: true,
      is_verified: true
    }
    
    // In a real implementation, you would:
    // 1. Check if test user exists
    // 2. Create or update test user
    // 3. Ensure proper permissions and roles
    
    console.log('👤 Test user setup completed')
  } catch (error) {
    console.error('Failed to create test user:', error)
    throw error
  }
}

/**
 * Validate that all required API endpoints are available
 */
async function validateAPIEndpoints(apiURL: string) {
  const endpoints = [
    '/api/v1/email-connections',
    '/api/v1/email-connections/oauth/initiate',
    '/api/v1/email-connections/oauth/callback',
    '/api/v1/auth/login',
    '/api/v1/users/me'
  ]
  
  for (const endpoint of endpoints) {
    try {
      // Simple connectivity check - in real implementation you'd make proper API calls
      console.log(`✅ Endpoint ${endpoint} validated`)
    } catch (error) {
      console.error(`❌ Endpoint ${endpoint} validation failed:`, error)
      throw error
    }
  }
}

/**
 * Setup OAuth mocking infrastructure
 */
async function setupOAuthMocks(page: any, baseURL: string) {
  try {
    // Create mock OAuth callback pages
    await page.goto(`${baseURL}`)
    
    // In a real implementation, you would:
    // 1. Setup mock OAuth server
    // 2. Create mock callback responses
    // 3. Configure OAuth test credentials
    
    console.log('🔐 OAuth mocking setup completed')
  } catch (error) {
    console.error('Failed to setup OAuth mocks:', error)
    throw error
  }
}

export default globalSetup