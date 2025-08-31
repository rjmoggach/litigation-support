/**
 * Error Boundary for Email Connections Feature
 *
 * This component provides comprehensive error handling and recovery
 * for the email connections UI components.
 */

'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    createEmailConnectionError,
    createErrorId,
    EmailConnectionErrorType,
    type EmailConnectionError,
    type ErrorBoundaryState,
} from '@/lib/error-handling'
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react'
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { toast } from 'sonner'

interface Props {
    children: ReactNode
    fallback?: (error: EmailConnectionError, retry: () => void) => ReactNode
    onError?: (error: EmailConnectionError, errorInfo: ErrorInfo) => void
}

interface State extends ErrorBoundaryState {
    retryAttempts: number
    lastErrorTime: number
}

export class EmailConnectionsErrorBoundary extends Component<Props, State> {
    private retryTimeoutId: NodeJS.Timeout | null = null

    constructor(props: Props) {
        super(props)

        this.state = {
            hasError: false,
            error: undefined,
            errorId: undefined,
            retryAttempts: 0,
            lastErrorTime: 0,
        }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Convert JavaScript error to structured EmailConnectionError
        const structuredError = createEmailConnectionError(
            EmailConnectionErrorType.UNKNOWN_ERROR,
            error.message,
            `React Error: ${error.name}`,
        )

        return {
            hasError: true,
            error: structuredError,
            errorId: createErrorId(),
            lastErrorTime: Date.now(),
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const structuredError =
            this.state.error ||
            createEmailConnectionError(
                EmailConnectionErrorType.UNKNOWN_ERROR,
                error.message,
            )

        // Log detailed error information
        console.error('EmailConnectionsErrorBoundary caught an error:', {
            error,
            errorInfo,
            structuredError,
            errorId: this.state.errorId,
            retryAttempts: this.state.retryAttempts,
            componentStack: errorInfo.componentStack,
        })

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(structuredError, errorInfo)
        }

        // Report error to monitoring service (if configured)
        this.reportError(error, errorInfo, structuredError)

        // Show error toast
        toast.error('Email connections encountered an error', {
            description:
                'The email connections feature has been temporarily disabled. Please try refreshing the page.',
            action: {
                label: 'Retry',
                onClick: () => this.handleRetry(),
            },
        })
    }

    private reportError = (
        error: Error,
        errorInfo: ErrorInfo,
        structuredError: EmailConnectionError,
    ) => {
        // In a production environment, you would send this to your error monitoring service
        // e.g., Sentry, LogRocket, Bugsnag, etc.
        console.log('Error reported:', {
            errorId: this.state.errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            structuredError,
        })
    }

    private handleRetry = () => {
        const now = Date.now()
        const timeSinceLastError = now - this.state.lastErrorTime

        // Prevent rapid retry attempts
        if (timeSinceLastError < 2000 && this.state.retryAttempts > 0) {
            toast.warning('Please wait a moment before trying again')
            return
        }

        // Limit retry attempts
        if (this.state.retryAttempts >= 3) {
            toast.error(
                'Maximum retry attempts reached. Please refresh the page.',
            )
            return
        }

        console.log('Retrying email connections after error:', {
            errorId: this.state.errorId,
            attempt: this.state.retryAttempts + 1,
            timeSinceLastError,
        })

        this.setState((prevState) => ({
            hasError: false,
            error: undefined,
            errorId: undefined,
            retryAttempts: prevState.retryAttempts + 1,
        }))

        toast.success('Retrying email connections...')
    }

    private handleRefreshPage = () => {
        window.location.reload()
    }

    private handleGoHome = () => {
        window.location.href = '/dashboard'
    }

    private handleReportBug = () => {
        const errorDetails = {
            errorId: this.state.errorId,
            error: this.state.error?.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
        }

        // In a real app, this would open a bug report form or support ticket
        console.log('Bug report requested:', errorDetails)

        // Copy error details to clipboard
        navigator.clipboard
            .writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                toast.success(
                    'Error details copied to clipboard. Please include them when contacting support.',
                )
            })
            .catch(() => {
                toast.error(
                    'Could not copy error details. Please note the error ID: ' +
                        this.state.errorId,
                )
            })
    }

    render() {
        if (this.state.hasError && this.state.error) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry)
            }

            // Default error UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-3">
                    <Card className="w-full max-w-lg">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <CardTitle className="text-xl">
                                Email Connections Error
                            </CardTitle>
                            <CardDescription>
                                The email connections feature encountered an
                                unexpected error
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <Alert>
                                <Bug className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Error ID:</strong>{' '}
                                    {this.state.errorId}
                                    <br />
                                    <strong>Type:</strong>{' '}
                                    {this.state.error.type}
                                    <br />
                                    <strong>Message:</strong>{' '}
                                    {this.state.error.userMessage}
                                </AlertDescription>
                            </Alert>

                            <div className="text-sm text-muted-foreground">
                                <p>{this.state.error.recoveryInstructions}</p>
                                {this.state.retryAttempts > 0 && (
                                    <p className="mt-2">
                                        Retry attempts:{' '}
                                        {this.state.retryAttempts}/3
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    onClick={this.handleRetry}
                                    disabled={this.state.retryAttempts >= 3}
                                    className="flex-1"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Retry{' '}
                                    {this.state.retryAttempts >= 3
                                        ? '(Max Reached)'
                                        : ''}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleRefreshPage}
                                    className="flex-1"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh Page
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    variant="outline"
                                    onClick={this.handleGoHome}
                                    className="flex-1"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Go to Dashboard
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.handleReportBug}
                                    className="flex-1"
                                >
                                    <Bug className="mr-2 h-4 w-4" />
                                    Report Issue
                                </Button>
                            </div>

                            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                                If this error persists, please contact support
                                with the Error ID above.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withEmailConnectionsErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    customFallback?: (
        error: EmailConnectionError,
        retry: () => void,
    ) => ReactNode,
) {
    const WrappedComponent = (props: P) => (
        <EmailConnectionsErrorBoundary fallback={customFallback}>
            <Component {...props} />
        </EmailConnectionsErrorBoundary>
    )

    WrappedComponent.displayName = `withEmailConnectionsErrorBoundary(${Component.displayName || Component.name})`

    return WrappedComponent
}

/**
 * Lightweight error fallback for smaller components
 */
export function EmailConnectionsErrorFallback({
    error,
    retry,
    compact = false,
}: {
    error: EmailConnectionError
    retry: () => void
    compact?: boolean
}) {
    if (compact) {
        return (
            <Alert className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                    <span>{error.userMessage}</span>
                    <Button size="sm" variant="outline" onClick={retry}>
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="rounded-md border p-3 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
            <h3 className="mb-2 text-lg font-semibold">Something went wrong</h3>
            <p className="mb-4 text-sm text-muted-foreground">
                {error.userMessage}
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
                {error.recoveryInstructions}
            </p>
            <Button onClick={retry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
            </Button>
        </div>
    )
}
