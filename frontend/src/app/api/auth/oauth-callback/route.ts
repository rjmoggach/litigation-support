/**
 * Frontend OAuth callback route handler for additional email account connections.
 * 
 * This route handles OAuth authorization codes from additional account flows,
 * processes tokens, and stores connection data in the user's session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { config } from '@/lib/auth'

// Environment-based backend URL resolution
const getBackendUrl = () => {
    // Server-side: use Docker service name
    if (typeof window === 'undefined') {
        return process.env.BACKEND_URL || 'http://backend:8000'
    }
    // Client-side: use public API URL
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

/**
 * Handle OAuth callback GET request
 * 
 * Query parameters:
 * - code: OAuth authorization code
 * - state: OAuth state parameter for security
 * - scope: Granted scopes (optional)
 * - error: OAuth error (optional)
 * - error_description: OAuth error description (optional)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const scope = searchParams.get('scope')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')

    console.log('OAuth callback received:', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        scope,
    })

    // Handle OAuth errors
    if (error) {
        console.error('OAuth error received:', {
            error,
            error_description,
            state,
        })

        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Error</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        padding: 40px; 
                        text-align: center;
                        color: #dc2626;
                    }
                    .error-container {
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 20px;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        background: #fef2f2;
                    }
                    .error-code {
                        font-family: monospace;
                        background: #fee2e2;
                        padding: 8px 12px;
                        border-radius: 4px;
                        margin: 16px 0;
                        display: inline-block;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h2>OAuth Authorization Failed</h2>
                    <p>There was an error connecting your email account:</p>
                    <div class="error-code">${error}: ${error_description || 'Unknown error'}</div>
                    <p>You can close this window and try again.</p>
                </div>
                <script>
                    // Post error message to parent window if opened as popup
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'OAUTH_ERROR',
                            error: '${error}',
                            error_description: '${error_description || 'Unknown error'}',
                            state: '${state || ''}'
                        }, '*');
                        // Close popup after a delay
                        setTimeout(() => window.close(), 3000);
                    }
                </script>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
        })
    }

    // Validate required parameters
    if (!code || !state) {
        console.error('Missing required OAuth parameters:', { hasCode: !!code, hasState: !!state })
        
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Error</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        padding: 40px; 
                        text-align: center;
                        color: #dc2626;
                    }
                </style>
            </head>
            <body>
                <h2>Invalid OAuth Request</h2>
                <p>Missing required authorization code or state parameter.</p>
                <p>You can close this window and try again.</p>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'OAUTH_ERROR',
                            error: 'invalid_request',
                            error_description: 'Missing required parameters'
                        }, '*');
                        setTimeout(() => window.close(), 3000);
                    }
                </script>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
            status: 400,
        })
    }

    try {
        // Get current session to verify user is authenticated
        const session = await getServerSession(config)
        if (!session?.user) {
            console.error('No authenticated session found for OAuth callback')
            throw new Error('User not authenticated')
        }

        console.log('Processing OAuth callback for user:', session.user.email)

        // Call backend to process the OAuth callback
        const backendUrl = getBackendUrl()
        const callbackUrl = new URL('/api/v1/email-connections/oauth/callback', backendUrl)
        callbackUrl.searchParams.set('code', code)
        callbackUrl.searchParams.set('state', state)
        if (scope) {
            callbackUrl.searchParams.set('scope', scope)
        }

        console.log('Forwarding to backend callback:', callbackUrl.toString())

        const backendResponse = await fetch(callbackUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${(session as any).accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text()
            console.error('Backend OAuth callback failed:', {
                status: backendResponse.status,
                error: errorText,
            })
            throw new Error(`Backend callback failed: ${backendResponse.status} ${errorText}`)
        }

        // The backend returns HTML with connection data in postMessage
        // We'll extract the connection data and forward it to the parent window
        const backendHtml = await backendResponse.text()
        
        // Extract connection data from the backend HTML response
        // Look for the postMessage data in the HTML
        const connectionMatch = backendHtml.match(/connection:\s*\{[^}]+\}/s)
        let connectionData = '{}'
        
        if (connectionMatch) {
            try {
                // Extract the connection object
                const fullMatch = backendHtml.match(/connection:\s*\{[^}]*\}/s)
                if (fullMatch) {
                    connectionData = fullMatch[0].replace('connection:', '').trim()
                }
            } catch (e) {
                console.warn('Could not extract connection data from backend response:', e)
            }
        }

        console.log('OAuth callback successful, connection data extracted')

        // Return success HTML that posts to parent window and closes popup
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Email Account Connected</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        padding: 40px; 
                        text-align: center;
                        color: #16a34a;
                    }
                    .success-container {
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 20px;
                        border: 1px solid #bbf7d0;
                        border-radius: 8px;
                        background: #f0fdf4;
                    }
                    .checkmark {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="success-container">
                    <div class="checkmark">✅</div>
                    <h2>Email Account Connected Successfully!</h2>
                    <p>Your additional email account has been connected and is ready to use.</p>
                    <p>This window will close automatically.</p>
                </div>
                <script>
                    console.log('OAuth success, posting message to parent window');
                    
                    // Post success message to parent window
                    if (window.opener) {
                        try {
                            const connectionData = ${connectionData};
                            window.opener.postMessage({
                                type: 'OAUTH_SUCCESS',
                                connection: connectionData,
                                timestamp: new Date().toISOString()
                            }, '*');
                            console.log('Success message posted to parent');
                        } catch (e) {
                            console.error('Error posting message to parent:', e);
                            // Fallback: post basic success message
                            window.opener.postMessage({
                                type: 'OAUTH_SUCCESS',
                                connection: { status: 'active' },
                                timestamp: new Date().toISOString()
                            }, '*');
                        }
                    }
                    
                    // Close popup after a short delay
                    setTimeout(() => {
                        console.log('Closing OAuth popup');
                        window.close();
                    }, 2000);
                </script>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
        })

    } catch (error) {
        console.error('OAuth callback processing error:', error)

        // Return error HTML
        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Processing Error</title>
                <meta charset="utf-8">
                <style>
                    body { 
                        font-family: system-ui, -apple-system, sans-serif; 
                        padding: 40px; 
                        text-align: center;
                        color: #dc2626;
                    }
                    .error-container {
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 20px;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        background: #fef2f2;
                    }
                    .error-details {
                        font-family: monospace;
                        background: #fee2e2;
                        padding: 12px;
                        border-radius: 4px;
                        margin: 16px 0;
                        font-size: 14px;
                        word-wrap: break-word;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h2>Connection Failed</h2>
                    <p>There was an error processing your email account connection.</p>
                    <div class="error-details">${error instanceof Error ? error.message : 'Unknown error occurred'}</div>
                    <p>Please close this window and try again.</p>
                </div>
                <script>
                    console.error('OAuth processing failed:', '${error instanceof Error ? error.message : 'Unknown error'}');
                    
                    // Post error message to parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'OAUTH_ERROR',
                            error: 'processing_failed',
                            error_description: '${error instanceof Error ? error.message : 'Unknown error occurred'}',
                            timestamp: new Date().toISOString()
                        }, '*');
                    }
                    
                    // Close popup after a delay
                    setTimeout(() => window.close(), 5000);
                </script>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' },
            status: 500,
        })
    }
}

/**
 * Handle OAuth callback POST request (if needed for different OAuth flows)
 */
export async function POST(request: NextRequest) {
    // For now, redirect POST requests to GET handler
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    
    // Convert POST body parameters to query parameters
    Object.keys(body).forEach(key => {
        if (body[key]) {
            url.searchParams.set(key, body[key])
        }
    })
    
    // Create a new request with GET method
    const getRequest = new NextRequest(url, {
        method: 'GET',
        headers: request.headers,
    })
    
    return GET(getRequest)
}