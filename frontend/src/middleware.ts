import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
    // Request logging is OFF by default; enable by setting MW_LOG_REQUESTS=1
    if (process.env.MW_LOG_REQUESTS === '1') {
        console.log('[MW] request', {
            method: request.method,
            url: request.nextUrl.href,
            pathname: request.nextUrl.pathname,
            time: new Date().toISOString(),
        })
    }
    return NextResponse.next()
}

export const config = {
    // Run on all paths; adjust if too noisy
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
