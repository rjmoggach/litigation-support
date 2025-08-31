/**
 * Error Testing Utilities
 * 
 * Utilities for testing and demonstrating the error handling system
 * in the email connections feature. These should only be used in 
 * development environments.
 */

import { client } from '@/lib/api/client.gen'

export interface ErrorTestResult {
    errorType: string
    caught: boolean
    message: string
    recovery?: string
    timestamp: string
}

/**
 * Test different error scenarios to validate error handling
 */
export async function testErrorHandling(accessToken: string): Promise<ErrorTestResult[]> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Error testing is not available in production')
    }
    
    const results: ErrorTestResult[] = []
    const errorTypes = [
        'not_found',
        'already_exists', 
        'oauth_state',
        'oauth_token',
        'expired',
        'refresh_failed',
        'service_unavailable',
        'validation'
    ]
    
    client.setConfig({
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
    
    for (const errorType of errorTypes) {
        try {
            // Call debug endpoint to trigger specific error
            await client.GET('/api/v1/email-connections/debug/test-error/{error_type}', {
                params: { path: { error_type: errorType } }
            })
            
            results.push({
                errorType,
                caught: false,
                message: `No error thrown for ${errorType}`,
                timestamp: new Date().toISOString()
            })
        } catch (error: any) {
            results.push({
                errorType,
                caught: true,
                message: error?.error?.message || error?.message || 'Unknown error',
                recovery: error?.error?.recovery_action || 'Unknown',
                timestamp: new Date().toISOString()
            })
        }
    }
    
    return results
}

/**
 * Demonstrate different error recovery scenarios
 */
export const errorRecoveryExamples = {
    CONNECTION_NOT_FOUND: {
        scenario: 'Try to access a connection that doesn\'t exist',
        userAction: 'Refresh the page to reload connection list',
        expected: 'User sees "Connection not found" with refresh option'
    },
    OAUTH_POPUP_BLOCKED: {
        scenario: 'Browser blocks OAuth popup window',
        userAction: 'Allow popups and try again',
        expected: 'User sees popup blocked warning with instructions'
    },
    CONNECTION_EXPIRED: {
        scenario: 'OAuth tokens have expired',
        userAction: 'Click refresh button to renew tokens',
        expected: 'User can refresh tokens or re-authorize'
    },
    SERVICE_UNAVAILABLE: {
        scenario: 'Gmail API is temporarily down',
        userAction: 'Wait and retry later',
        expected: 'User sees service unavailable with retry option'
    },
    QUOTA_EXCEEDED: {
        scenario: 'API rate limits exceeded',
        userAction: 'Wait for quota reset',
        expected: 'User sees quota exceeded with retry after time'
    }
}

/**
 * Simulate network conditions for error testing
 */
export function simulateNetworkError(errorType: 'timeout' | 'offline' | 'slow'): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        return Promise.reject(new Error('Network simulation not available in production'))
    }
    
    switch (errorType) {
        case 'timeout':
            return new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Network timeout')), 10000)
            })
        case 'offline':
            return Promise.reject(new Error('Network offline'))
        case 'slow':
            return new Promise((resolve) => {
                setTimeout(resolve, 5000)
            })
        default:
            return Promise.resolve()
    }
}

/**
 * Generate test scenarios for E2E testing
 */
export function generateErrorTestScenarios() {
    return [
        {
            name: 'Connection Not Found',
            setup: 'Delete connection during operation',
            trigger: 'Try to refresh deleted connection',
            expected: 'Graceful error with refresh option'
        },
        {
            name: 'OAuth Flow Interrupted',
            setup: 'Start OAuth flow',
            trigger: 'Close popup before completion',
            expected: 'User cancellation message'
        },
        {
            name: 'Token Refresh Failure',
            setup: 'Connection with expired refresh token',
            trigger: 'Attempt to refresh tokens',
            expected: 'Re-authorization required message'
        },
        {
            name: 'Network Failure During Operation',
            setup: 'Stable connection',
            trigger: 'Disconnect network during API call',
            expected: 'Network error with retry option'
        }
    ]
}

/**
 * Validation helpers for error states
 */
export function validateErrorHandling(testResults: ErrorTestResult[]): {
    passed: number
    failed: number
    details: string[]
} {
    const details: string[] = []
    let passed = 0
    let failed = 0
    
    for (const result of testResults) {
        if (result.caught && result.message && result.recovery) {
            passed++
            details.push(`✓ ${result.errorType}: Properly handled`)
        } else {
            failed++
            details.push(`✗ ${result.errorType}: ${result.message}`)
        }
    }
    
    return { passed, failed, details }
}

/**
 * Export for debugging in browser console
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as any).__errorTestingUtils = {
        testErrorHandling,
        errorRecoveryExamples,
        simulateNetworkError,
        generateErrorTestScenarios,
        validateErrorHandling
    }
}