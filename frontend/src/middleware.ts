import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Define public paths that don't require authentication
const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/otp',
    '/api/auth',
]

export async function middleware(request: NextRequest) {
    // Request logging is OFF by default; enable by setting MW_LOG_REQUESTS=1
    if (process.env.MW_LOG_REQUESTS === '1') {
        console.log('[MW] request', {
            method: request.method,
            url: request.nextUrl.href,
            pathname: request.nextUrl.pathname,
            time: new Date().toISOString(),
        })
    }

    const { pathname } = request.nextUrl

    // Check if the path is public
    const isPublicPath = publicPaths.some(path => 
        pathname.startsWith(path)
    )

    // Allow public paths and API auth routes
    if (isPublicPath) {
        return NextResponse.next()
    }

    // Check authentication
    const session = await auth()

    // If no session and trying to access protected route, redirect to login
    if (!session) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // User is authenticated, allow access
    return NextResponse.next()
}

export const config = {
    // Run on all paths; adjust if too noisy
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
