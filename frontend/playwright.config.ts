import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Email Connections E2E Tests
 * 
 * This configuration sets up the testing environment for comprehensive
 * end-to-end testing of the email connections feature.
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Global test timeout
    actionTimeout: 30000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable web security to allow localhost OAuth testing
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific configuration
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.version.fallback-limit': 1,
            'security.tls.version.min': 1
          }
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Accessibility testing with specific settings
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Additional settings for accessibility testing
        colorScheme: 'light',
        reducedMotion: 'reduce',
      },
    },
  ],

  // Global setup and teardown
  globalSetup: './tests/e2e/setup/global-setup.ts',
  globalTeardown: './tests/e2e/setup/global-teardown.ts',

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      timeout: 120 * 1000, // 2 minutes to start
      reuseExistingServer: !process.env.CI,
    },
    // Also start backend for integration testing
    {
      command: 'cd ../backend && python -m uvicorn main:app --reload --port 8000',
      port: 8000,
      timeout: 60 * 1000, // 1 minute to start
      reuseExistingServer: !process.env.CI,
      cwd: '../backend',
    }
  ],

  // Test match patterns
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  
  // Test ignore patterns
  testIgnore: ['**/node_modules/**'],

  // Expect configuration
  expect: {
    // Global timeout for expect() assertions
    timeout: 10000,
    
    // Threshold for screenshot comparisons
    threshold: 0.2,
    
    // Animation mode
    toMatchSnapshot: { 
      threshold: 0.2,
      mode: 'css'
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',
  
  // Test metadata
  metadata: {
    'Test Suite': 'Email Connections E2E',
    'Environment': process.env.NODE_ENV || 'development',
    'Base URL': process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    'API URL': process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
})