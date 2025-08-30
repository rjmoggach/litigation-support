import { auth } from '@/auth'
import type { Session } from 'next-auth'

export interface AuthUser {
    id: string
    email: string
    name: string
    image?: string | null
    is_verified?: boolean
    is_superuser?: boolean
    is_active?: boolean
    roles?: string[]
    avatar_url?: string | null
    accessToken?: string | null
    refreshToken?: string | null
}

export async function getSession(): Promise<Session | null> {
    try {
        return await auth()
    } catch (error) {
        console.error('Error getting session:', error)
        return null
    }
}

export async function getAuthUser(): Promise<AuthUser | null> {
    const session = await getSession()
    if (!session?.user) return null
    
    return session.user as AuthUser
}

export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession()
    return !!session
}

export async function hasRole(role: string): Promise<boolean> {
    const user = await getAuthUser()
    if (!user?.roles) return false
    
    return user.roles.includes(role)
}

export async function hasAnyRole(roles: string[]): Promise<boolean> {
    const user = await getAuthUser()
    if (!user?.roles) return false
    
    return roles.some(role => user.roles?.includes(role))
}

export async function isSuperuser(): Promise<boolean> {
    const user = await getAuthUser()
    return user?.is_superuser === true
}

export async function isVerified(): Promise<boolean> {
    const user = await getAuthUser()
    return user?.is_verified === true
}

export async function isActive(): Promise<boolean> {
    const user = await getAuthUser()
    return user?.is_active === true
}

export function checkAccess(
    user: AuthUser | null,
    options: {
        requireAuth?: boolean
        requireVerified?: boolean
        requireActive?: boolean
        requireRoles?: string[]
        requireAnyRole?: string[]
        requireSuperuser?: boolean
    } = {}
): { allowed: boolean; reason?: string } {
    const {
        requireAuth = true,
        requireVerified = false,
        requireActive = true,
        requireRoles = [],
        requireAnyRole = [],
        requireSuperuser = false,
    } = options

    if (requireAuth && !user) {
        return { allowed: false, reason: 'Authentication required' }
    }

    if (requireVerified && !user?.is_verified) {
        return { allowed: false, reason: 'Email verification required' }
    }

    if (requireActive && !user?.is_active) {
        return { allowed: false, reason: 'Account is inactive' }
    }

    if (requireSuperuser && !user?.is_superuser) {
        return { allowed: false, reason: 'Superuser access required' }
    }

    if (requireRoles.length > 0) {
        const hasAllRoles = requireRoles.every(role => 
            user?.roles?.includes(role)
        )
        if (!hasAllRoles) {
            return { 
                allowed: false, 
                reason: `Required roles: ${requireRoles.join(', ')}` 
            }
        }
    }

    if (requireAnyRole.length > 0) {
        const hasAnyRole = requireAnyRole.some(role => 
            user?.roles?.includes(role)
        )
        if (!hasAnyRole) {
            return { 
                allowed: false, 
                reason: `Required one of: ${requireAnyRole.join(', ')}` 
            }
        }
    }

    return { allowed: true }
}