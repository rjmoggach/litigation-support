export class AuthError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode?: number,
        public suggestion?: string
    ) {
        super(message)
        this.name = 'AuthError'
    }
}

export class CredentialsError extends AuthError {
    constructor(message = 'Invalid email or password') {
        super(
            message,
            'INVALID_CREDENTIALS',
            401,
            'Please check your email and password and try again'
        )
        this.name = 'CredentialsError'
    }
}

export class EmailNotVerifiedError extends AuthError {
    constructor(message = 'Email not verified') {
        super(
            message,
            'EMAIL_NOT_VERIFIED',
            401,
            'Please check your email and click the verification link'
        )
        this.name = 'EmailNotVerifiedError'
    }
}

export class AccountInactiveError extends AuthError {
    constructor(message = 'Account is inactive') {
        super(
            message,
            'ACCOUNT_INACTIVE',
            403,
            'Please contact support to reactivate your account'
        )
        this.name = 'AccountInactiveError'
    }
}

export class SessionExpiredError extends AuthError {
    constructor(message = 'Your session has expired') {
        super(
            message,
            'SESSION_EXPIRED',
            401,
            'Please log in again to continue'
        )
        this.name = 'SessionExpiredError'
    }
}

export class NetworkError extends AuthError {
    constructor(message = 'Network error occurred') {
        super(
            message,
            'NETWORK_ERROR',
            0,
            'Please check your internet connection and try again'
        )
        this.name = 'NetworkError'
    }
}

export class OAuthError extends AuthError {
    constructor(
        provider: string,
        message = `Failed to authenticate with ${provider}`
    ) {
        super(
            message,
            'OAUTH_ERROR',
            401,
            `There was a problem connecting to ${provider}. Please try again or use a different login method`
        )
        this.name = 'OAuthError'
    }
}

export class TokenRefreshError extends AuthError {
    constructor(message = 'Failed to refresh authentication') {
        super(
            message,
            'TOKEN_REFRESH_ERROR',
            401,
            'Your session could not be refreshed. Please log in again'
        )
        this.name = 'TokenRefreshError'
    }
}

export class UnauthorizedError extends AuthError {
    constructor(message = 'You are not authorized to access this resource') {
        super(
            message,
            'UNAUTHORIZED',
            403,
            'You do not have permission to access this resource'
        )
        this.name = 'UnauthorizedError'
    }
}

interface BackendError {
    detail?: string
    message?: string
    error?: string
    status?: number
}

export function parseAuthError(error: unknown): AuthError {
    // Handle Next-Auth specific errors
    if (typeof error === 'string') {
        if (error.includes('CredentialsSignin')) {
            return new CredentialsError()
        }
        if (error.includes('OAuthSignin')) {
            return new OAuthError('Provider')
        }
        if (error.includes('SessionRequired')) {
            return new SessionExpiredError()
        }
    }

    // Handle backend API errors
    if (typeof error === 'object' && error !== null) {
        const err = error as BackendError
        
        const message = err.detail || err.message || err.error || 'Authentication failed'
        
        if (message.includes('verified')) {
            return new EmailNotVerifiedError(message)
        }
        if (message.includes('inactive')) {
            return new AccountInactiveError(message)
        }
        if (message.includes('expired')) {
            return new SessionExpiredError(message)
        }
        if (message.includes('credentials') || message.includes('password')) {
            return new CredentialsError(message)
        }
        if (message.includes('unauthorized') || err.status === 401) {
            return new UnauthorizedError(message)
        }
        if (message.includes('network') || err.status === 0) {
            return new NetworkError(message)
        }
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return new NetworkError('Unable to connect to the server')
    }

    // Default error
    return new AuthError(
        'An unexpected error occurred',
        'UNKNOWN_ERROR',
        500,
        'Please try again later or contact support if the problem persists'
    )
}

export function getErrorMessage(error: unknown): string {
    const authError = parseAuthError(error)
    return authError.message
}

export function getErrorSuggestion(error: unknown): string {
    const authError = parseAuthError(error)
    return authError.suggestion || 'Please try again'
}