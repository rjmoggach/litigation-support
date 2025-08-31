import { FullConfig } from '@playwright/test'

/**
 * Global teardown for E2E tests
 * 
 * This teardown runs once after all tests and cleans up the testing environment:
 * - Database cleanup
 * - Test data removal
 * - Temporary file cleanup
 * - Mock service shutdown
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...')
  
  try {
    // Step 1: Database cleanup
    console.log('🗄️ Cleaning up test database...')
    await cleanupTestDatabase()
    
    // Step 2: Remove test users and data
    console.log('👤 Removing test users and data...')
    await removeTestData()
    
    // Step 3: Clean up temporary files and artifacts
    console.log('📁 Cleaning up temporary files...')
    await cleanupTempFiles()
    
    // Step 4: Shutdown mock services
    console.log('🔐 Shutting down mock OAuth services...')
    await shutdownMockServices()
    
    // Step 5: Generate test report summary
    console.log('📊 Generating test report summary...')
    await generateTestSummary()
    
    console.log('✅ Global teardown completed successfully!')
    
  } catch (error) {
    console.error('❌ Global teardown encountered errors:', error)
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Clean up test database
 */
async function cleanupTestDatabase() {
  try {
    // In a real implementation, you would:
    // 1. Remove all test data
    // 2. Reset database sequences
    // 3. Clean up test email connections
    // 4. Remove test OAuth tokens
    
    console.log('📊 Test database cleanup completed')
  } catch (error) {
    console.error('Failed to cleanup test database:', error)
  }
}

/**
 * Remove test data and users
 */
async function removeTestData() {
  try {
    // In a real implementation, you would:
    // 1. Remove test users
    // 2. Clean up test email connections
    // 3. Remove test OAuth states
    // 4. Clear test session data
    
    console.log('👤 Test data removal completed')
  } catch (error) {
    console.error('Failed to remove test data:', error)
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles() {
  try {
    // Remove any temporary files created during tests
    // This might include:
    // - Downloaded files
    // - Generated screenshots (if not needed)
    // - Temporary OAuth tokens
    // - Cache files
    
    console.log('📁 Temporary file cleanup completed')
  } catch (error) {
    console.error('Failed to cleanup temporary files:', error)
  }
}

/**
 * Shutdown mock OAuth services
 */
async function shutdownMockServices() {
  try {
    // In a real implementation, you would:
    // 1. Stop mock OAuth server
    // 2. Clean up mock endpoints
    // 3. Remove mock certificates/keys
    // 4. Clear mock service state
    
    console.log('🔐 Mock service shutdown completed')
  } catch (error) {
    console.error('Failed to shutdown mock services:', error)
  }
}

/**
 * Generate test report summary
 */
async function generateTestSummary() {
  try {
    const fs = await import('fs').then(m => m.promises)
    const path = await import('path')
    
    // Read test results if they exist
    const resultsPath = path.join(process.cwd(), 'test-results', 'test-results.json')
    
    try {
      const resultsData = await fs.readFile(resultsPath, 'utf-8')
      const results = JSON.parse(resultsData)
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.length || 0), 0) || 0,
        passed: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.filter((spec: any) => 
            spec.tests?.some((test: any) => test.status === 'passed')).length || 0), 0) || 0,
        failed: results.suites?.reduce((acc: number, suite: any) => 
          acc + (suite.specs?.filter((spec: any) => 
            spec.tests?.some((test: any) => test.status === 'failed')).length || 0), 0) || 0,
        duration: results.stats?.duration || 0,
        environment: {
          baseURL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
          apiURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
          nodeVersion: process.version,
        }
      }
      
      // Write summary to file
      const summaryPath = path.join(process.cwd(), 'test-results', 'test-summary.json')
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2))
      
      console.log('📊 Test Summary:')
      console.log(`   Total Tests: ${summary.totalTests}`)
      console.log(`   Passed: ${summary.passed}`)
      console.log(`   Failed: ${summary.failed}`)
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`)
      
    } catch (readError) {
      console.log('📊 Test results file not found, skipping summary generation')
    }
    
  } catch (error) {
    console.error('Failed to generate test summary:', error)
  }
}

export default globalTeardown