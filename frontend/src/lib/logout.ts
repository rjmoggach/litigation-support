import { getSession, signOut } from 'next-auth/react'

/**
 * Logout utility that provides comprehensive token cleanup
 * Handles both single-device and all-device logout scenarios
 */

export interface LogoutOptions {
    /** Whether to revoke all refresh tokens for the user */
    revokeAllTokens?: boolean
    /** Custom redirect URL after logout */
    redirectUrl?: string
    /** Whether to redirect after logout (default: true) */
    redirect?: boolean
}

export interface LogoutResult {
    success: boolean
    error?: string
    revokedTokens?: number
}

/**
 * Perform logout with proper token cleanup
 * This is the main logout function that should be used throughout the app
 */
export async function performLogout(
    options: LogoutOptions = {},
): Promise<LogoutResult> {
    const {
        revokeAllTokens = false,
        redirectUrl = '/login',
        redirect = true,
    } = options

    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Starting logout process`, {
        revokeAllTokens,
        redirectUrl,
        redirect,
    })

    try {
        const session = await getSession()
        let revokedTokens = 0

        if (revokeAllTokens) {
            // Revoke all tokens for the user (requires authentication)
            try {
                const response = await fetch('/api/auth/logout-all', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.accessToken || ''}`,
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    console.log(
                        `[${timestamp}] Successfully revoked all tokens:`,
                        data.message,
                    )

                    // Extract revoked count from message if available
                    const match = data.message?.match(
                        /Revoked (\d+) active sessions/,
                    )
                    revokedTokens = match ? parseInt(match[1]) : 0
                } else {
                    console.warn(
                        `[${timestamp}] Failed to revoke all tokens:`,
                        response.status,
                    )
                }
            } catch (error) {
                console.warn(`[${timestamp}] Error revoking all tokens:`, error)
                // Don't fail logout if revocation fails
            }
        } else if (session?.refreshToken) {
            // Revoke only the current refresh token
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        refresh_token: session.refreshToken,
                    }),
                })

                if (response.ok) {
                    console.log(
                        `[${timestamp}] Successfully revoked current refresh token`,
                    )
                    revokedTokens = 1
                } else {
                    console.warn(
                        `[${timestamp}] Failed to revoke refresh token:`,
                        response.status,
                    )
                }
            } catch (error) {
                console.warn(
                    `[${timestamp}] Error revoking refresh token:`,
                    error,
                )
                // Don't fail logout if revocation fails
            }
        }

        // Always sign out from NextAuth, even if token revocation fails
        await signOut({
            redirect,
            callbackUrl: redirect ? redirectUrl : undefined,
        })

        console.log(`[${timestamp}] Logout completed successfully`, {
            revokedTokens,
            redirected: redirect,
        })

        return {
            success: true,
            revokedTokens,
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${timestamp}] Logout error:`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        })

        // Even if there's an error, try to sign out locally
        try {
            await signOut({
                redirect,
                callbackUrl: redirect ? redirectUrl : undefined,
            })
        } catch (signOutError) {
            console.error(`[${timestamp}] Failed to sign out:`, signOutError)
        }

        return {
            success: false,
            error: `Logout failed: ${errorMessage}`,
        }
    }
}

/**
 * Quick logout function for single device
 * Revokes the current refresh token and signs out
 */
export async function logoutCurrentDevice(
    redirectUrl?: string,
): Promise<LogoutResult> {
    return performLogout({
        revokeAllTokens: false,
        redirectUrl,
        redirect: true,
    })
}

/**
 * Logout from all devices
 * Revokes all refresh tokens for the user and signs out
 */
export async function logoutAllDevices(
    redirectUrl?: string,
): Promise<LogoutResult> {
    return performLogout({
        revokeAllTokens: true,
        redirectUrl,
        redirect: true,
    })
}

/**
 * Silent logout without redirect
 * Useful for programmatic logout scenarios
 */
export async function logoutSilent(
    revokeAllTokens: boolean = false,
): Promise<LogoutResult> {
    return performLogout({
        revokeAllTokens,
        redirect: false,
    })
}

/**
 * Emergency logout function
 * Clears local session immediately without waiting for server response
 * Use only when server is unavailable or in emergency situations
 */
export async function emergencyLogout(
    redirectUrl: string = '/login',
): Promise<void> {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] Emergency logout initiated`)

    try {
        // Clear NextAuth session immediately
        await signOut({
            redirect: true,
            callbackUrl: redirectUrl,
        })
    } catch (error) {
        console.error(`[${timestamp}] Emergency logout failed:`, error)

        // If even signOut fails, force redirect
        if (typeof window !== 'undefined') {
            window.location.href = redirectUrl
        }
    }
}

/**
 * Check if logout is in progress
 * Useful for preventing multiple simultaneous logout attempts
 */
let logoutInProgress = false

export function isLogoutInProgress(): boolean {
    return logoutInProgress
}

/**
 * Protected logout wrapper that prevents concurrent logout attempts
 */
export async function protectedLogout(
    options: LogoutOptions = {},
): Promise<LogoutResult> {
    if (logoutInProgress) {
        console.log('Logout already in progress, skipping')
        return { success: false, error: 'Logout already in progress' }
    }

    try {
        logoutInProgress = true
        return await performLogout(options)
    } finally {
        logoutInProgress = false
    }
}

export default {
    performLogout,
    logoutCurrentDevice,
    logoutAllDevices,
    logoutSilent,
    emergencyLogout,
    protectedLogout,
    isLogoutInProgress,
}
