import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

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
                    const response = await fetch(
                        'http://backend:8000/api/v1/auth/login',
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
                        console.log('NextAuth: Login failed', response.status)
                        return null
                    }

                    const tokenData = await response.json()
                    console.log('NextAuth: Token received')

                    // Fetch user profile with the token
                    const userResponse = await fetch(
                        'http://backend:8000/api/v1/users/me',
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
                    const loginResponse = await fetch(
                        'http://backend:8000/api/v1/auth/oauth-login',
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
                        console.error(
                            'OAuth login failed:',
                            await loginResponse.text(),
                        )
                        return false
                    }
                } catch (error) {
                    console.error('Error during OAuth sign in:', error)
                    return false
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
                return token
            }

            // Check if access token needs refresh
            const currentTime = Math.floor(Date.now() / 1000)
            
            // If access token is expired or will expire in 5 minutes, try to refresh
            if (token.accessTokenExpires && 
                token.accessTokenExpires - currentTime < 300 && 
                token.refreshToken) {
                
                try {
                    console.log('NextAuth: Refreshing expired access token')
                    
                    // Call the refresh endpoint
                    const refreshResponse = await fetch(
                        'http://backend:8000/api/v1/auth/refresh',
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
                                'http://backend:8000/api/v1/users/me',
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
                                console.log('NextAuth: User data refreshed with avatar_url:', userData.avatar_url ? 'present' : 'absent')
                            }
                        } catch (error) {
                            console.error('Error fetching updated user data:', error)
                        }
                        
                        console.log('NextAuth: Token refreshed successfully')
                    } else {
                        console.log('NextAuth: Refresh token expired or invalid, clearing session')
                        // Refresh token is invalid, clear session
                        token.accessToken = null
                        token.refreshToken = null
                        token.user = null
                        return null
                    }
                } catch (error) {
                    console.error('NextAuth: Error refreshing token:', error)
                    // On error, clear session
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
                
                session.user = {
                    ...session.user,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ...(token.user as any),
                    accessToken: token.accessToken,
                    refreshToken: token.refreshToken,
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

// Export only the config, NextAuth instance is created in auth.ts
