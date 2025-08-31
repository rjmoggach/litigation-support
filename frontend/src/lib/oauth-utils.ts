/**
 * OAuth flow utilities for handling browser-based OAuth authorization
 * Provides popup window management, message passing, and error handling
 */

export interface OAuthConfig {
    provider: string
    scopes?: string[]
    redirectUri?: string
    useFrontendCallback?: boolean // Whether to use frontend OAuth callback route
    popupWidth?: number
    popupHeight?: number
    timeout?: number // in milliseconds
}

export interface OAuthResult {
    success: boolean
    connection?: {
        id: number
        email: string
        name: string
        status: string
    }
    error?: string
    cancelled?: boolean
}

export interface OAuthPopupOptions {
    width?: number
    height?: number
    left?: number
    top?: number
    scrollbars?: boolean
    resizable?: boolean
    status?: boolean
    toolbar?: boolean
    menubar?: boolean
    location?: boolean
}

/**
 * Default popup window configuration
 */
const DEFAULT_POPUP_OPTIONS: OAuthPopupOptions = {
    width: 500,
    height: 700,
    scrollbars: true,
    resizable: true,
    status: false,
    toolbar: false,
    menubar: false,
    location: false,
}

/**
 * Calculate centered popup position
 */
function calculatePopupPosition(width: number, height: number): { left: number; top: number } {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const left = Math.round((screenWidth - width) / 2)
    const top = Math.round((screenHeight - height) / 2)
    
    return { left: Math.max(0, left), top: Math.max(0, top) }
}

/**
 * Generate popup window features string
 */
function generatePopupFeatures(options: OAuthPopupOptions): string {
    const { width = 500, height = 700 } = options
    const { left, top } = calculatePopupPosition(width, height)
    
    const features = {
        width,
        height,
        left,
        top,
        scrollbars: options.scrollbars ? 'yes' : 'no',
        resizable: options.resizable ? 'yes' : 'no',
        status: options.status ? 'yes' : 'no',
        toolbar: options.toolbar ? 'yes' : 'no',
        menubar: options.menubar ? 'yes' : 'no',
        location: options.location ? 'yes' : 'no',
    }
    
    return Object.entries(features)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')
}

/**
 * OAuth popup manager class
 */
export class OAuthPopupManager {
    private popup: Window | null = null
    private messageListener: ((event: MessageEvent) => void) | null = null
    private pollTimer: NodeJS.Timeout | null = null
    private timeoutTimer: NodeJS.Timeout | null = null
    private readonly allowedOrigins: Set<string>

    constructor(allowedOrigins: string[] = []) {
        // Add current origin by default
        this.allowedOrigins = new Set([
            window.location.origin,
            ...allowedOrigins
        ])
    }

    /**
     * Open OAuth popup and handle the flow
     */
    async openPopup(
        authorizationUrl: string,
        options: OAuthPopupOptions = {},
        timeout: number = 5 * 60 * 1000 // 5 minutes default
    ): Promise<OAuthResult> {
        return new Promise((resolve) => {
            this.cleanup()

            const popupOptions = { ...DEFAULT_POPUP_OPTIONS, ...options }
            const features = generatePopupFeatures(popupOptions)

            // Open popup window
            this.popup = window.open(authorizationUrl, 'oauth-popup', features)

            if (!this.popup) {
                resolve({
                    success: false,
                    error: 'Failed to open popup window. Please check if popups are blocked.',
                })
                return
            }

            // Focus the popup
            this.popup.focus()

            let resolved = false

            const resolveOnce = (result: OAuthResult) => {
                if (!resolved) {
                    resolved = true
                    this.cleanup()
                    resolve(result)
                }
            }

            // Set up message listener for OAuth success/error
            this.messageListener = (event: MessageEvent) => {
                // Security check: verify origin
                if (!this.allowedOrigins.has(event.origin)) {
                    console.warn('Ignoring message from untrusted origin:', event.origin)
                    return
                }

                if (event.data?.type === 'OAUTH_SUCCESS') {
                    resolveOnce({
                        success: true,
                        connection: event.data.connection,
                    })
                } else if (event.data?.type === 'OAUTH_ERROR') {
                    resolveOnce({
                        success: false,
                        error: event.data.error || 'OAuth authorization failed',
                    })
                } else if (event.data?.type === 'OAUTH_CANCELLED') {
                    resolveOnce({
                        success: false,
                        cancelled: true,
                        error: 'OAuth authorization was cancelled by the user',
                    })
                }
            }

            window.addEventListener('message', this.messageListener)

            // Poll for popup closure
            this.pollTimer = setInterval(() => {
                if (this.popup?.closed) {
                    resolveOnce({
                        success: false,
                        cancelled: true,
                        error: 'OAuth popup was closed before completion',
                    })
                }
            }, 1000)

            // Set timeout
            this.timeoutTimer = setTimeout(() => {
                resolveOnce({
                    success: false,
                    error: 'OAuth authorization timed out',
                })
            }, timeout)
        })
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.popup && !this.popup.closed) {
            this.popup.close()
        }
        this.popup = null

        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener)
            this.messageListener = null
        }

        if (this.pollTimer) {
            clearInterval(this.pollTimer)
            this.pollTimer = null
        }

        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer)
            this.timeoutTimer = null
        }
    }

    /**
     * Check if popup is currently open
     */
    isPopupOpen(): boolean {
        return this.popup !== null && !this.popup.closed
    }

    /**
     * Close popup manually
     */
    closePopup(): void {
        if (this.popup && !this.popup.closed) {
            this.popup.close()
        }
    }
}

/**
 * Simple OAuth flow utility function
 */
export async function initiateOAuthFlow(
    authorizationUrl: string,
    options: OAuthPopupOptions & { timeout?: number } = {}
): Promise<OAuthResult> {
    const { timeout, ...popupOptions } = options
    const manager = new OAuthPopupManager()
    
    try {
        return await manager.openPopup(authorizationUrl, popupOptions, timeout)
    } finally {
        manager.cleanup()
    }
}

/**
 * OAuth state management utilities
 */
export class OAuthStateManager {
    private static readonly STORAGE_KEY = 'oauth_states'
    
    /**
     * Generate a secure random state parameter
     */
    static generateState(): string {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }

    /**
     * Store state with associated data
     */
    static storeState(state: string, data: Record<string, any>): void {
        try {
            const stored = this.getStoredStates()
            stored[state] = {
                ...data,
                timestamp: Date.now(),
            }
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored))
        } catch (error) {
            console.error('Failed to store OAuth state:', error)
        }
    }

    /**
     * Retrieve and remove state data
     */
    static consumeState(state: string): Record<string, any> | null {
        try {
            const stored = this.getStoredStates()
            const data = stored[state]
            
            if (data) {
                delete stored[state]
                sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored))
                return data
            }
            
            return null
        } catch (error) {
            console.error('Failed to consume OAuth state:', error)
            return null
        }
    }

    /**
     * Clean up expired states (older than 1 hour)
     */
    static cleanupExpiredStates(): void {
        try {
            const stored = this.getStoredStates()
            const oneHourAgo = Date.now() - (60 * 60 * 1000)
            
            Object.keys(stored).forEach(state => {
                if (stored[state].timestamp < oneHourAgo) {
                    delete stored[state]
                }
            })
            
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored))
        } catch (error) {
            console.error('Failed to cleanup OAuth states:', error)
        }
    }

    private static getStoredStates(): Record<string, any> {
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch (error) {
            console.error('Failed to parse stored OAuth states:', error)
            return {}
        }
    }
}

/**
 * Utility to handle OAuth callback messages in the popup window
 * This should be called from the OAuth callback page
 */
export function sendOAuthMessage(type: 'success' | 'error' | 'cancelled', data?: any): void {
    if (window.opener && !window.opener.closed) {
        const message = {
            type: type === 'success' ? 'OAUTH_SUCCESS' : 
                  type === 'error' ? 'OAUTH_ERROR' : 'OAUTH_CANCELLED',
            ...data
        }
        
        window.opener.postMessage(message, window.location.origin)
        window.close()
    }
}

/**
 * Default OAuth configuration for Google
 */
export const GOOGLE_OAUTH_CONFIG: OAuthConfig = {
    provider: 'google',
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ],
    useFrontendCallback: false, // Use backend callback by default
    popupWidth: 500,
    popupHeight: 700,
    timeout: 5 * 60 * 1000, // 5 minutes
}

/**
 * Start OAuth flow for adding an additional email account connection
 */
export async function startOAuthFlow(config: OAuthConfig = GOOGLE_OAUTH_CONFIG): Promise<OAuthResult> {
    try {
        console.log('Starting OAuth flow:', { provider: config.provider, useFrontendCallback: config.useFrontendCallback })

        // Determine redirect URI
        let redirectUri = config.redirectUri
        if (!redirectUri) {
            const baseUrl = window.location.origin
            redirectUri = config.useFrontendCallback 
                ? `${baseUrl}/api/auth/oauth-callback`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/email-connections/oauth/callback`
        }

        console.log('Using redirect URI:', redirectUri)

        // Prepare OAuth initiation request
        const initiateRequest = {
            provider: config.provider,
            scopes: config.scopes || GOOGLE_OAUTH_CONFIG.scopes,
            redirect_uri: redirectUri,
        }

        // Get backend API URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        
        // Call backend to initiate OAuth flow
        const response = await fetch(`${backendUrl}/api/v1/email-connections/oauth/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: In a real implementation, you'd include the user's auth token here
                // For now, we'll handle this in the component where the session is available
            },
            body: JSON.stringify(initiateRequest),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('OAuth initiation failed:', {
                status: response.status,
                error: errorText,
            })
            throw new Error(`OAuth initiation failed: ${response.status} ${errorText}`)
        }

        const oauthData = await response.json()
        console.log('OAuth URL generated:', { hasUrl: !!oauthData.authorization_url })

        // Start popup OAuth flow
        return await initiateOAuthFlow(oauthData.authorization_url, {
            width: config.popupWidth,
            height: config.popupHeight,
            timeout: config.timeout,
        })

    } catch (error) {
        console.error('OAuth flow error:', error)
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown OAuth error occurred',
        }
    }
}

/**
 * Start OAuth flow with user session (for use in components)
 */
export async function startOAuthFlowWithSession(
    session: any,
    config: OAuthConfig = GOOGLE_OAUTH_CONFIG
): Promise<OAuthResult> {
    if (!session?.accessToken) {
        return {
            success: false,
            error: 'User session required for OAuth flow',
        }
    }

    try {
        console.log('Starting OAuth flow with session:', { 
            provider: config.provider, 
            useFrontendCallback: config.useFrontendCallback,
            userEmail: session.user?.email 
        })

        // Determine redirect URI
        let redirectUri = config.redirectUri
        if (!redirectUri) {
            const baseUrl = window.location.origin
            redirectUri = config.useFrontendCallback 
                ? `${baseUrl}/api/auth/oauth-callback`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/email-connections/oauth/callback`
        }

        console.log('Using redirect URI:', redirectUri)

        // Prepare OAuth initiation request
        const initiateRequest = {
            provider: config.provider,
            scopes: config.scopes || GOOGLE_OAUTH_CONFIG.scopes,
            redirect_uri: redirectUri,
        }

        // Get backend API URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        
        // Call backend to initiate OAuth flow with user's auth token
        const response = await fetch(`${backendUrl}/api/v1/email-connections/oauth/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify(initiateRequest),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('OAuth initiation failed:', {
                status: response.status,
                error: errorText,
            })
            throw new Error(`OAuth initiation failed: ${response.status} ${errorText}`)
        }

        const oauthData = await response.json()
        console.log('OAuth URL generated:', { hasUrl: !!oauthData.authorization_url })

        // Start popup OAuth flow
        return await initiateOAuthFlow(oauthData.authorization_url, {
            width: config.popupWidth,
            height: config.popupHeight,
            timeout: config.timeout,
        })

    } catch (error) {
        console.error('OAuth flow with session error:', error)
        
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown OAuth error occurred',
        }
    }
}

/**
 * Error types for OAuth flows
 */
export enum OAuthErrorType {
    POPUP_BLOCKED = 'popup_blocked',
    USER_CANCELLED = 'user_cancelled',
    TIMEOUT = 'timeout',
    NETWORK_ERROR = 'network_error',
    INVALID_RESPONSE = 'invalid_response',
    UNKNOWN_ERROR = 'unknown_error',
}

/**
 * OAuth error class with specific error types
 */
export class OAuthError extends Error {
    constructor(
        public type: OAuthErrorType,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'OAuthError'
    }

    static fromResult(result: OAuthResult): OAuthError {
        if (result.cancelled) {
            return new OAuthError(OAuthErrorType.USER_CANCELLED, result.error || 'User cancelled')
        }
        
        if (result.error?.includes('popup')) {
            return new OAuthError(OAuthErrorType.POPUP_BLOCKED, result.error)
        }
        
        if (result.error?.includes('timeout')) {
            return new OAuthError(OAuthErrorType.TIMEOUT, result.error)
        }
        
        return new OAuthError(OAuthErrorType.UNKNOWN_ERROR, result.error || 'Unknown OAuth error')
    }
}