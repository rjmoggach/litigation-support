import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

// Determine backend URL based on environment
const getBackendUrl = () => {
    // Server-side: use Docker service name
    if (typeof window === 'undefined') {
        return process.env.BACKEND_URL || 'http://backend:8000'
    }
    // Client-side: use public API URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

export const config = {
    trustHost: true,
    providers: [
        Google,
        Credentials({
            name: 'FastAPI',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    console.log(
                        'NextAuth: Attempting login for',
                        credentials.email,
                    )

                    // Call your FastAPI login endpoint
                    const backendUrl = getBackendUrl()
                    
                    const response = await fetch(
                        `${backendUrl}/api/v1/auth/login`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type':
                                    'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                username: credentials.email as string,
                                password: credentials.password as string,
                                grant_type: 'password',
                            }),
                        },
                    )

                    if (!response.ok) {
                        const errorText = await response.text()
                        console.error('NextAuth: Login failed', {
                            status: response.status,
                            error: errorText,
                            url: `${backendUrl}/api/v1/auth/login`
                        })
                        return null
                    }

                    const tokenData = await response.json()
                    console.log('NextAuth: Token received')

                    // Fetch user profile with the token
                    const userResponse = await fetch(
                        `${backendUrl}/api/v1/users/me`,
                        {
                            headers: {
                                Authorization: `Bearer ${tokenData.access_token}`,
                            },
                        },
                    )

                    if (!userResponse.ok) {
                        console.log('NextAuth: User fetch failed')
                        return null
                    }

                    const user = await userResponse.json()
                    console.log('NextAuth: User data fetched for', user.email)

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.full_name,
                        image: user.avatar_url || null,
                        // Store additional user data
                        is_verified: user.is_verified,
                        is_superuser: user.is_superuser,
                        is_active: user.is_active,
                        roles: user.roles || ['user'],
                        created_at: user.created_at,
                        avatar_url: user.avatar_url || null,
                        // Store both access and refresh tokens
                        accessToken: tokenData.access_token,
                        refreshToken: tokenData.refresh_token,
                    }
                } catch (error) {
                    console.error('NextAuth: Auth error:', error)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Handle Google OAuth sign in
            if (account?.provider === 'google' && user.email) {
                try {
                    // Try to login with the OAuth user's email to get their data from FastAPI
                    // We'll use a special OAuth endpoint that validates by email only
                    const backendUrl = getBackendUrl()
                    
                    const loginResponse = await fetch(
                        `${backendUrl}/api/v1/auth/oauth-login`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: user.email,
                                provider: 'google',
                                provider_id: account.providerAccountId,
                                name: user.name || '',
                            }),
                        },
                    )

                    if (loginResponse.ok) {
                        const data = await loginResponse.json()
                        console.log('NextAuth: OAuth login successful for', user.email)
                        
                        // Store the access token, refresh token and user data for later use
                        user.accessToken = data.access_token
                        user.refreshToken = data.refresh_token
                        user.id = data.user.id.toString()
                        user.email = data.user.email
                        user.name = data.user.full_name
                        user.is_verified = data.user.is_verified
                        user.is_superuser = data.user.is_superuser
                        user.is_active = data.user.is_active
                        user.roles = data.user.roles || ['user']
                        user.avatar_url = data.user.avatar_url || null
                        user.image = data.user.avatar_url || null
                    } else {
                        const errorText = await loginResponse.text()
                        console.error('NextAuth: OAuth login failed', {
                            status: loginResponse.status,
                            error: errorText,
                            email: user.email,
                            url: `${backendUrl}/api/v1/auth/oauth-login`
                        })
                        return false
                    }
                } catch (error) {
                    console.error('NextAuth: OAuth sign in error', {
                        error: error instanceof Error ? error.message : error,
                        provider: account.provider,
                        email: user.email
                    })
                    // Don't block sign-in on network errors - let Next-Auth handle it
                    return true
                }
            }
            return true
        },
        async jwt({ token, user, account, trigger, session }) {
            // Store user data and access token in JWT
            if (user && account) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const anyUser = user as any
                token.accessToken = anyUser.accessToken || null
                token.refreshToken = anyUser.refreshToken || null
                token.user = user
                
                // Initialize email connections array if not exists
                if (!token.emailConnections) {
                    token.emailConnections = []
                }
                
                // Calculate token expiry times (in seconds)
                if (token.accessToken) {
                    try {
                        const payload = JSON.parse(
                            Buffer.from(
                                token.accessToken.split('.')[1],
                                'base64',
                            ).toString(),
                        )
                        token.accessTokenExpires = payload.exp
                    } catch (error) {
                        console.error('Error parsing access token:', error)
                    }
                }
                
                // Set refresh token expiry (7 days from now)
                if (token.refreshToken) {
                    token.refreshTokenExpires = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
                }
            }

            // Handle session updates
            if (trigger === 'update' && session) {
                // Update the token with new session data
                token.user = { ...token.user, ...session }
                
                // Handle email connections updates
                if (session.emailConnections) {
                    token.emailConnections = session.emailConnections
                }
                
                return token
            }
            
            // Initialize email connections array if not exists
            if (!token.emailConnections) {
                token.emailConnections = []
            }

            // Check if access token needs refresh
            const currentTime = Math.floor(Date.now() / 1000)
            
            // If access token is expired or will expire in 5 minutes, try to refresh
            if (token.accessTokenExpires && 
                token.accessTokenExpires - currentTime < 300 && 
                token.refreshToken) {
                
                console.log('NextAuth: Token expiring soon, refreshing...', {
                    expiresIn: token.accessTokenExpires - currentTime,
                    currentTime: new Date(currentTime * 1000).toISOString()
                })
                
                // Retry logic for token refresh
                let retries = 3
                let refreshSuccess = false
                
                while (retries > 0 && !refreshSuccess) {
                    try {
                        // Call the refresh endpoint
                        const backendUrl = getBackendUrl()
                        
                        const refreshResponse = await fetch(
                            `${backendUrl}/api/v1/auth/refresh`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    refresh_token: token.refreshToken,
                                }),
                            },
                        )

                        if (refreshResponse.ok) {
                            const refreshData = await refreshResponse.json()
                            
                            // Update tokens with new values
                            token.accessToken = refreshData.access_token
                            token.refreshToken = refreshData.refresh_token
                            
                            // Update expiry time
                            try {
                                const payload = JSON.parse(
                                    Buffer.from(
                                        refreshData.access_token.split('.')[1],
                                        'base64',
                                    ).toString(),
                                )
                                token.accessTokenExpires = payload.exp
                            } catch (error) {
                                console.error('Error parsing new access token:', error)
                                token.accessTokenExpires = currentTime + 3600 // Default 1 hour
                            }
                            
                            // Fetch updated user data with the new token
                            try {
                                const userResponse = await fetch(
                                    `${backendUrl}/api/v1/users/me`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${refreshData.access_token}`,
                                        },
                                    },
                                )
                                
                                if (userResponse.ok) {
                                    const userData = await userResponse.json()
                                    // Update user data in token
                                    token.user = {
                                        ...token.user,
                                        id: userData.id.toString(),
                                        email: userData.email,
                                        name: userData.full_name,
                                        image: userData.avatar_url || null,
                                        is_verified: userData.is_verified,
                                        is_superuser: userData.is_superuser,
                                        is_active: userData.is_active,
                                        roles: userData.roles || ['user'],
                                        avatar_url: userData.avatar_url || null,
                                    }
                                    console.log('NextAuth: User data refreshed')
                                }
                            } catch (error) {
                                console.error('Error fetching updated user data:', error)
                            }
                            
                            console.log('NextAuth: Token refreshed successfully')
                            refreshSuccess = true
                        } else {
                            const errorText = await refreshResponse.text()
                            console.warn(`NextAuth: Refresh attempt ${4 - retries} failed`, {
                                status: refreshResponse.status,
                                error: errorText
                            })
                            
                            retries--
                            if (retries > 0) {
                                // Wait before retrying (exponential backoff)
                                await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
                            }
                        }
                    } catch (error) {
                        console.error(`NextAuth: Refresh attempt ${4 - retries} error:`, error)
                        retries--
                        if (retries > 0) {
                            // Wait before retrying
                            await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
                        }
                    }
                }
                
                if (!refreshSuccess) {
                    console.log('NextAuth: All refresh attempts failed, clearing session')
                    // All retries failed, clear session
                    token.accessToken = null
                    token.refreshToken = null
                    token.user = null
                    return null
                }
            }

            return token
        },
        async session({ session, token }) {
            // Send properties to the client
            if (token) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const anySession = session as any
                anySession.accessToken = token.accessToken
                anySession.refreshToken = token.refreshToken
                anySession.accessTokenExpires = token.accessTokenExpires
                anySession.refreshTokenExpires = token.refreshTokenExpires
                anySession.emailConnections = token.emailConnections || []
                
                session.user = {
                    ...session.user,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(token.user as any),
                    accessToken: token.accessToken,
                    refreshToken: token.refreshToken,
                    emailConnections: token.emailConnections || [],
                }
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
    },
} satisfies NextAuthConfig

// Types for additional email account connections
export interface AdditionalEmailAccount {
    id: string
    email: string
    provider: string
    providerAccountId: string
    name?: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    scopes?: string[]
    status: 'active' | 'expired' | 'error' | 'revoked'
    createdAt: string
    lastSyncAt?: string
    errorMessage?: string
}

// Email connection management utilities
export class EmailConnectionManager {
    /**
     * Add or update an email connection in the session
     */
    static async addEmailConnection(
        connection: AdditionalEmailAccount,
        update?: (session: any) => void
    ): Promise<void> {
        if (typeof window !== 'undefined' && update) {
            const { useSession } = await import('next-auth/react')
            
            // Get current session
            const { data: session } = useSession()
            
            if (session) {
                const updatedConnections = [
                    ...(session.emailConnections || []).filter(
                        (conn: AdditionalEmailAccount) => conn.id !== connection.id
                    ),
                    connection,
                ]
                
                // Update session with new email connections
                update({
                    ...session,
                    emailConnections: updatedConnections,
                })
            }
        }
    }
    
    /**
     * Remove an email connection from the session
     */
    static async removeEmailConnection(
        connectionId: string,
        update?: (session: any) => void
    ): Promise<void> {
        if (typeof window !== 'undefined' && update) {
            const { useSession } = await import('next-auth/react')
            
            // Get current session
            const { data: session } = useSession()
            
            if (session) {
                const updatedConnections = (session.emailConnections || []).filter(
                    (conn: AdditionalEmailAccount) => conn.id !== connectionId
                )
                
                // Update session with filtered email connections
                update({
                    ...session,
                    emailConnections: updatedConnections,
                })
            }
        }
    }
    
    /**
     * Update an email connection status
     */
    static async updateEmailConnectionStatus(
        connectionId: string,
        status: 'active' | 'expired' | 'error' | 'revoked',
        errorMessage?: string,
        update?: (session: any) => void
    ): Promise<void> {
        if (typeof window !== 'undefined' && update) {
            const { useSession } = await import('next-auth/react')
            
            // Get current session
            const { data: session } = useSession()
            
            if (session) {
                const updatedConnections = (session.emailConnections || []).map(
                    (conn: AdditionalEmailAccount) =>
                        conn.id === connectionId
                            ? {
                                  ...conn,
                                  status,
                                  errorMessage: status === 'error' ? errorMessage : undefined,
                                  lastSyncAt: status === 'active' ? new Date().toISOString() : conn.lastSyncAt,
                              }
                            : conn
                )
                
                // Update session with updated email connections
                update({
                    ...session,
                    emailConnections: updatedConnections,
                })
            }
        }
    }
    
    /**
     * Get email connections from session
     */
    static getEmailConnections(session: any): AdditionalEmailAccount[] {
        return session?.emailConnections || []
    }
    
    /**
     * Get a specific email connection by ID
     */
    static getEmailConnection(session: any, connectionId: string): AdditionalEmailAccount | undefined {
        return session?.emailConnections?.find((conn: AdditionalEmailAccount) => conn.id === connectionId)
    }
    
    /**
     * Check if an email address is already connected
     */
    static isEmailConnected(session: any, email: string): boolean {
        return Boolean(
            session?.emailConnections?.some(
                (conn: AdditionalEmailAccount) => conn.email.toLowerCase() === email.toLowerCase()
            )
        )
    }
    
    /**
     * Get active email connections only
     */
    static getActiveEmailConnections(session: any): AdditionalEmailAccount[] {
        return (session?.emailConnections || []).filter(
            (conn: AdditionalEmailAccount) => conn.status === 'active'
        )
    }
}

// Export only the config, NextAuth instance is created in auth.ts
