'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useSession } from 'next-auth/react'

interface ProtectedRouteProps {
    children: React.ReactNode
    requireSuperuser?: boolean
    redirectTo?: string
}

export function ProtectedRoute({
    children,
    requireSuperuser = false,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status !== 'loading') {
            if (!session) {
                router.push(redirectTo)
                return
            }

            if (requireSuperuser && session.user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const user = session.user as any
                const hasAdminRole = user.roles && user.roles.includes('admin')
                if (!user.is_superuser && !hasAdminRole) {
                    router.push('/') // Redirect to home if not admin
                    return
                }
            }
        }
    }, [session, status, requireSuperuser, router, redirectTo])

    if (status === 'loading') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        )
    }

    if (!session) {
        return null // Will redirect in useEffect
    }

    if (requireSuperuser && session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any
        const hasAdminRole = user.roles && user.roles.includes('admin')
        if (!user.is_superuser && !hasAdminRole) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">
                            Access Denied
                        </h1>
                        <p className="text-muted-foreground">
                            You don&apos;t have permission to access this page.
                        </p>
                    </div>
                </div>
            )
        }
    }

    return <>{children}</>
}
