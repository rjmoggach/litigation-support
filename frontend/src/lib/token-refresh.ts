import { getSession, signOut } from 'next-auth/react'

/**
 * Token refresh utility for managing authentication tokens
 * Provides functions for checking token validity and refreshing tokens
 */

export interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}

export interface TokenValidationResult {
  isValid: boolean
  needsRefresh: boolean
  expiresIn?: number
}

/**
 * Check if an access token is valid and if it needs refreshing with clock skew tolerance
 */
export function validateToken(accessToken: string | null | undefined): TokenValidationResult {
  if (!accessToken) {
    return { isValid: false, needsRefresh: false }
  }

  try {
    // Validate JWT structure
    const tokenParts = accessToken.split('.')
    if (tokenParts.length !== 3) {
      console.warn('Invalid JWT structure: expected 3 parts')
      return { isValid: false, needsRefresh: false }
    }

    // Decode JWT payload to check expiration
    const payload = JSON.parse(
      Buffer.from(tokenParts[1], 'base64').toString()
    )
    
    const currentTime = Math.floor(Date.now() / 1000)
    const expiresAt = payload.exp
    
    if (!expiresAt || typeof expiresAt !== 'number') {
      console.warn('Invalid or missing expiration time in token')
      return { isValid: false, needsRefresh: false }
    }
    
    // Add 30-second clock skew tolerance
    const clockSkewTolerance = 30
    const adjustedCurrentTime = currentTime - clockSkewTolerance
    
    const expiresIn = expiresAt - adjustedCurrentTime
    const isExpired = expiresIn <= 0
    const needsRefresh = expiresIn <= 300 // Refresh if expires within 5 minutes (including clock skew)
    
    // Add minimal logging for debugging (only when action needed)
    if (process.env.NODE_ENV === 'development' && (isExpired || needsRefresh)) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] Token validation:`, {
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        expiresIn,
        isExpired,
        needsRefresh,
        clockSkewTolerance
      })
    }
    
    return {
      isValid: !isExpired,
      needsRefresh,
      expiresIn: Math.max(0, expiresIn)
    }
  } catch (error) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Token validation error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenLength: accessToken?.length,
      stack: error instanceof Error ? error.stack : undefined
    })
    return { isValid: false, needsRefresh: false }
  }
}

/**
 * Refresh an access token using a refresh token with retry and enhanced error handling
 */
export async function refreshAccessToken(refreshToken: string, retryAttempt: number = 0): Promise<TokenRefreshResult> {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second base delay
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const timestamp = new Date().toISOString()
      
      console.error(`[${timestamp}] Token refresh failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        attempt: retryAttempt + 1,
        maxRetries
      })
      
      // Handle specific error cases
      if (response.status === 401) {
        // Refresh token is invalid or expired
        await signOut({ redirect: false })
        return {
          success: false,
          error: 'Refresh token expired. Please log in again.'
        }
      }
      
      if (response.status === 429) {
        // Rate limited - try again with exponential backoff
        if (retryAttempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryAttempt)
          console.log(`Rate limited. Retrying in ${delay}ms...`)
          
          await new Promise(resolve => setTimeout(resolve, delay))
          return refreshAccessToken(refreshToken, retryAttempt + 1)
        } else {
          return {
            success: false,
            error: 'Too many refresh attempts. Please try again later.'
          }
        }
      }
      
      if (response.status >= 500 && retryAttempt < maxRetries) {
        // Server error - retry with exponential backoff
        const delay = baseDelay * Math.pow(2, retryAttempt)
        console.log(`Server error. Retrying in ${delay}ms...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        return refreshAccessToken(refreshToken, retryAttempt + 1)
      }
      
      return {
        success: false,
        error: `Token refresh failed: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    
    // Validate response data
    if (!data.access_token) {
      throw new Error('Invalid response: missing access_token')
    }
    
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Token refresh successful`, {
      attempt: retryAttempt + 1,
      expiresIn: data.expires_in
    })
    
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  } catch (error) {
    const timestamp = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`[${timestamp}] Token refresh error:`, {
      error: errorMessage,
      attempt: retryAttempt + 1,
      maxRetries,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // Retry on network errors
    if (retryAttempt < maxRetries && (
      error instanceof TypeError || // Network error
      (error instanceof Error && error.message.includes('fetch'))
    )) {
      const delay = baseDelay * Math.pow(2, retryAttempt)
      console.log(`Network error. Retrying in ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return refreshAccessToken(refreshToken, retryAttempt + 1)
    }
    
    return {
      success: false,
      error: `Token refresh failed: ${errorMessage}`
    }
  }
}

/**
 * Get a valid access token, refreshing if necessary with comprehensive error handling
 * This is the main function to use for ensuring you have a valid token
 */
export async function getValidAccessToken(): Promise<string | null> {
  const timestamp = new Date().toISOString()
  
  try {
    const session = await getSession()
    
    if (!session?.accessToken) {
      console.log(`[${timestamp}] No access token in session`)
      return null
    }

    // Validate current token
    const validation = validateToken(session.accessToken)
    
    if (validation.isValid && !validation.needsRefresh) {
      // Token is still valid and doesn't need refresh
      return session.accessToken
    }

    if (!validation.isValid) {
      console.log(`[${timestamp}] Access token is expired`)
    } else if (validation.needsRefresh) {
      console.log(`[${timestamp}] Access token expires soon (${validation.expiresIn}s), refreshing proactively`)
    }

    // Try to refresh the token
    if (session.refreshToken) {
      console.log(`[${timestamp}] Attempting token refresh...`)
      const refreshResult = await refreshAccessToken(session.refreshToken)
      
      if (refreshResult.success && refreshResult.accessToken) {
        // Update the session with new tokens
        // Note: NextAuth will handle this automatically through the JWT callback
        // We just return the new token for immediate use
        console.log(`[${timestamp}] Token refresh successful, returning new token`)
        return refreshResult.accessToken
      } else {
        console.error(`[${timestamp}] Token refresh failed:`, refreshResult.error)
        
        // If refresh failed due to invalid refresh token, sign out
        if (refreshResult.error?.includes('expired') || refreshResult.error?.includes('invalid')) {
          console.log(`[${timestamp}] Refresh token invalid, signing out`)
          await signOut({ redirect: false })
        }
        
        return null
      }
    } else {
      console.log(`[${timestamp}] No refresh token available, signing out`)
      await signOut({ redirect: false })
      return null
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${timestamp}] Error getting valid access token:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // On unexpected errors, try to gracefully handle without signing out immediately
    // unless it's a clear authentication failure
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      console.warn(`[${timestamp}] Network error during token validation, returning null without signout`)
    }
    
    return null
  }
}

/**
 * Check if the current session has valid authentication
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getSession()
    
    if (!session?.accessToken) {
      return false
    }

    const validation = validateToken(session.accessToken)
    return validation.isValid
  } catch (error) {
    console.error('Authentication check error:', error)
    return false
  }
}

/**
 * Force a token refresh if possible
 * Useful for scenarios where you want to ensure you have the freshest token
 */
export async function forceTokenRefresh(): Promise<TokenRefreshResult> {
  try {
    const session = await getSession()
    
    if (!session?.refreshToken) {
      return {
        success: false,
        error: 'No refresh token available'
      }
    }

    return await refreshAccessToken(session.refreshToken)
  } catch (error) {
    console.error('Force refresh error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Logout utility that properly cleans up tokens
 */
export async function logoutWithTokenCleanup(refreshToken?: string): Promise<void> {
  try {
    // If we have a refresh token, try to revoke it on the server
    if (refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }).catch(error => {
        // Don't fail logout if revocation fails
        console.warn('Token revocation failed:', error)
      })
    }
  } catch (error) {
    console.warn('Error during token cleanup:', error)
  } finally {
    // Always sign out, even if token revocation fails
    await signOut({ redirect: true, callbackUrl: '/login' })
  }
}