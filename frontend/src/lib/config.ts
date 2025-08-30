/**
 * Application configuration from environment variables
 */

// App Configuration
export const APP_CONFIG = {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Litigation Support',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    contactEmail:
        process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@robertmoggach.com',
} as const

// API Configuration
export const API_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    version: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
    timeout: 10000, // 10 seconds
    cloudFrontDomain:
        process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN ||
        'https://litigation-support.robertmoggach.com',
} as const

// Authentication Configuration
export const AUTH_CONFIG = {
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    providers: {
        google: {
            clientId: process.env.AUTH_GOOGLE_ID || '',
            enabled: Boolean(process.env.AUTH_GOOGLE_ID),
        },
    },
} as const

// Feature Flags
export const FEATURES = {
    signup: process.env.NEXT_PUBLIC_FEATURE_SIGNUP === 'true',
    oauth: process.env.NEXT_PUBLIC_FEATURE_OAUTH === 'true',
    twoFactor: process.env.NEXT_PUBLIC_FEATURE_2FA === 'true',
} as const

// Analytics Configuration
export const ANALYTICS_CONFIG = {
    googleAnalytics: {
        id: process.env.NEXT_PUBLIC_GA_ID || '',
        enabled: Boolean(process.env.NEXT_PUBLIC_GA_ID),
    },
    hotjar: {
        id: process.env.NEXT_PUBLIC_HOTJAR_ID || '',
        enabled: Boolean(process.env.NEXT_PUBLIC_HOTJAR_ID),
    },
} as const

// Environment Detection
export const ENV = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    nodeEnv: process.env.NODE_ENV || 'development',
} as const

// API Endpoints
export const API_ENDPOINTS = {
    auth: {
        login: '/auth/login',
        signup: '/auth/signup',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        verify: '/auth/verify',
        forgot: '/auth/forgot-password',
        reset: '/auth/reset-password',
        profile: '/auth/profile',
    },
    users: {
        base: '/users',
        profile: '/users/profile',
        settings: '/users/settings',
    },
} as const

// Configuration Validation
export function validateConfig() {
    const errors: string[] = []

    // Required environment variables
    if (!process.env.NEXTAUTH_SECRET && ENV.isProduction) {
        errors.push('NEXTAUTH_SECRET is required in production')
    }

    if (AUTH_CONFIG.enabled && !AUTH_CONFIG.nextAuthUrl) {
        errors.push('NEXTAUTH_URL is required when auth is enabled')
    }

    if (FEATURES.oauth && !AUTH_CONFIG.providers.google.clientId) {
        errors.push('AUTH_GOOGLE_ID is required when OAuth is enabled')
    }

    if (errors.length > 0) {
        console.error('Configuration errors:', errors)
        if (ENV.isProduction) {
            throw new Error(`Invalid configuration: ${errors.join(', ')}`)
        }
    }

    return errors.length === 0
}

// Helper functions
export function getApiUrl(endpoint: string): string {
    const baseUrl = API_CONFIG.baseUrl.replace(/\/$/, '')
    const version = API_CONFIG.version
    const cleanEndpoint = endpoint.replace(/^\//, '')

    return `${baseUrl}/api/${version}/${cleanEndpoint}`
}

export function getFullUrl(path: string): string {
    const baseUrl = APP_CONFIG.url.replace(/\/$/, '')
    const cleanPath = path.replace(/^\//, '')

    return `${baseUrl}/${cleanPath}`
}

// Run validation on module load (only in browser)
if (typeof window !== 'undefined') {
    validateConfig()
}
