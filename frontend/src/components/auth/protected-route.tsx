'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { checkAccess, type AuthUser } from '@/lib/auth-utils'

interface ProtectedRouteProps {
    children: React.ReactNode
    requireAuth?: boolean
    requireVerified?: boolean
    requireActive?: boolean
    requireRoles?: string[]
    requireAnyRole?: string[]
    requireSuperuser?: boolean
    fallbackUrl?: string
    loadingComponent?: React.ReactNode
}

export function ProtectedRoute({
    children,
    requireAuth = true,
    requireVerified = false,
    requireActive = true,
    requireRoles = [],
    requireAnyRole = [],
    requireSuperuser = false,
    fallbackUrl = '/login',
    loadingComponent
}: ProtectedRouteProps) {
    const { data: session, status } = useSession()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (status === 'loading') return

        const user = session?.user as AuthUser | null
        const accessCheck = checkAccess(user, {
            requireAuth,
            requireVerified,
            requireActive,
            requireRoles,
            requireAnyRole,
            requireSuperuser
        })

        if (!accessCheck.allowed) {
            console.log('Access denied:', accessCheck.reason)
            // Store the current path for redirect after login
            const redirectUrl = new URL(fallbackUrl, window.location.origin)
            if (pathname !== fallbackUrl) {
                redirectUrl.searchParams.set('callbackUrl', pathname)
            }
            router.push(redirectUrl.toString())
        }
    }, [
        session,
        status,
        router,
        pathname,
        requireAuth,
        requireVerified,
        requireActive,
        requireRoles,
        requireAnyRole,
        requireSuperuser,
        fallbackUrl
    ])

    // Show loading state
    if (status === 'loading') {
        if (loadingComponent) {
            return <>{loadingComponent}</>
        }
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Check access
    const user = session?.user as AuthUser | null
    const accessCheck = checkAccess(user, {
        requireAuth,
        requireVerified,
        requireActive,
        requireRoles,
        requireAnyRole,
        requireSuperuser
    })

    // If access is denied, don't render children (redirect will happen in useEffect)
    if (!accessCheck.allowed) {
        return null
    }

    // Access granted, render children
    return <>{children}</>
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
    Component: React.ComponentType<P>,
    options: Omit<ProtectedRouteProps, 'children'> = {}
) {
    return function ProtectedComponent(props: P) {
        return (
            <ProtectedRoute {...options}>
                <Component {...props} />
            </ProtectedRoute>
        )
    }
}