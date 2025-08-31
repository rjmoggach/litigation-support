'use client'

import { client } from '@/lib/api/client.gen'
import {
    deleteConnectionApiV1EmailConnectionsConnectionIdDelete,
    initiateOauthFlowApiV1EmailConnectionsOauthInitiatePost,
    listConnectionsApiV1EmailConnectionsGet,
    refreshConnectionTokensApiV1EmailConnectionsConnectionIdRefreshPost,
    testConnectionApiV1EmailConnectionsConnectionIdTestPost,
} from '@/lib/api/sdk.gen'
import type { EmailConnection } from '@/types/email-connections'
import { OAuthPopupManager, OAuthError, OAuthErrorType } from '@/lib/oauth-utils'
import { 
    handleEmailConnectionError, 
    createEmailConnectionError, 
    EmailConnectionErrorType, 
    retryWithBackoff,
    recoveryActions,
    RecoveryAction
} from '@/lib/error-handling'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export function useEmailConnections() {
    const { data: session } = useSession()
    const [connections, setConnections] = useState<EmailConnection[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<{
        [key: string]: boolean
    }>({})
    const [oauthManager] = useState(() => new OAuthPopupManager())

    const getAccessToken = useCallback((): string => {
        const accessToken =
            session && typeof session === 'object' && 'accessToken' in session
                ? String(session.accessToken)
                : ''

        if (!accessToken) {
            throw new Error('No authentication token available')
        }

        return accessToken
    }, [session])

    const loadConnections = useCallback(async (retryCount = 0) => {
        try {
            setLoading(true)
            
            // Use retry with backoff for resilient loading
            const response = await retryWithBackoff(async () => {
                const accessToken = getAccessToken()

                client.setConfig({
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })

                return await listConnectionsApiV1EmailConnectionsGet({
                    client,
                })
            }, 3, 1000, 10000)

            if (response.data) {
                setConnections(response.data.connections || [])
                
                // Show success message only if this was a retry
                if (retryCount > 0) {
                    toast.success('Email connections loaded successfully')
                }
            } else {
                setConnections([])
            }
        } catch (error) {
            console.error('Failed to load connections:', error)
            setConnections([])
            
            const structuredError = handleEmailConnectionError(
                error, 
                'Loading email connections',
                {
                    action: {
                        label: 'Retry',
                        onClick: () => loadConnections(retryCount + 1)
                    }
                }
            )

            // Handle specific error types
            if (structuredError.type === EmailConnectionErrorType.AUTHENTICATION_FAILED) {
                recoveryActions[RecoveryAction.RE_AUTHENTICATE]()
            }
        } finally {
            setLoading(false)
        }
    }, [getAccessToken])

    const addConnection = useCallback(async () => {
        try {
            setActionLoading(prev => ({ ...prev, add: true }))
            const accessToken = getAccessToken()

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            // Initiate OAuth flow on the backend
            const response =
                await initiateOauthFlowApiV1EmailConnectionsOauthInitiatePost({
                    body: {
                        provider: 'google',
                        scopes: [
                            'https://www.googleapis.com/auth/gmail.readonly',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile',
                        ],
                    },
                    client,
                })

            if (response.data) {
                // Use the OAuth popup manager
                const result = await oauthManager.openPopup(
                    response.data.authorization_url,
                    {
                        width: 500,
                        height: 700,
                    },
                    5 * 60 * 1000 // 5 minutes timeout
                )

                if (result.success && result.connection) {
                    // Success - reload connections and show success message
                    await loadConnections()
                    toast.success(
                        `Connected ${result.connection.email} successfully`,
                    )
                } else if (result.cancelled) {
                    // User cancelled - show neutral message
                    toast.info('Email connection was cancelled')
                } else if (result.error) {
                    // Error - show error message
                    console.error('OAuth error:', result.error)
                    
                    if (result.error.includes('popup')) {
                        toast.error('Please allow popups for this site to connect email accounts')
                    } else if (result.error.includes('timeout')) {
                        toast.error('Connection timed out. Please try again.')
                    } else {
                        toast.error(`Failed to connect email account: ${result.error}`)
                    }
                }
            } else {
                toast.error('Failed to initiate OAuth flow')
            }
        } catch (error) {
            console.error('Failed to add connection:', error)
            
            // Handle OAuth-specific errors with enhanced messaging
            if (error instanceof OAuthError) {
                switch (error.type) {
                    case OAuthErrorType.POPUP_BLOCKED:
                        const popupError = createEmailConnectionError(EmailConnectionErrorType.OAUTH_POPUP_BLOCKED)
                        toast.error(popupError.userMessage, {
                            description: popupError.recoveryInstructions,
                            action: {
                                label: 'Try Again',
                                onClick: () => recoveryActions[RecoveryAction.ALLOW_POPUPS]()
                            }
                        })
                        break
                    case OAuthErrorType.TIMEOUT:
                        handleEmailConnectionError(error, 'Adding email connection', {
                            action: {
                                label: 'Retry',
                                onClick: () => addConnection()
                            }
                        })
                        break
                    case OAuthErrorType.USER_CANCELLED:
                        const cancelError = createEmailConnectionError(EmailConnectionErrorType.OAUTH_USER_DENIED)
                        toast.info(cancelError.userMessage, {
                            description: cancelError.recoveryInstructions
                        })
                        break
                    default:
                        handleEmailConnectionError(error, 'OAuth flow')
                }
            } else {
                // Handle other types of errors
                const structuredError = handleEmailConnectionError(
                    error, 
                    'Adding email connection',
                    {
                        action: {
                            label: 'Try Again',
                            onClick: () => addConnection()
                        }
                    }
                )
                
                // Handle specific recovery actions
                if (structuredError.type === EmailConnectionErrorType.AUTHENTICATION_FAILED) {
                    recoveryActions[RecoveryAction.RE_AUTHENTICATE]()
                }
            }
        } finally {
            setActionLoading(prev => ({ ...prev, add: false }))
        }
    }, [getAccessToken, loadConnections, oauthManager])

    const deleteConnection = useCallback(async (connection: EmailConnection) => {
        try {
            setActionLoading(prev => ({ ...prev, [`delete-${connection.id}`]: true }))
            const accessToken = getAccessToken()

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            await deleteConnectionApiV1EmailConnectionsConnectionIdDelete({
                path: { connection_id: connection.id },
                client,
            })

            toast.success('Connection deleted successfully')
            await loadConnections()
        } catch (error) {
            console.error('Failed to delete connection:', error)
            
            const structuredError = handleEmailConnectionError(
                error,
                `Deleting connection ${connection.email_address}`,
                {
                    action: {
                        label: 'Retry',
                        onClick: () => deleteConnection(connection)
                    }
                }
            )
            
            // Handle specific error cases
            if (structuredError.type === EmailConnectionErrorType.CONNECTION_NOT_FOUND) {
                // Connection was already deleted, refresh the list
                toast.info('Connection was already removed')
                await loadConnections()
            } else if (structuredError.type === EmailConnectionErrorType.AUTHENTICATION_FAILED) {
                recoveryActions[RecoveryAction.RE_AUTHENTICATE]()
            }
        } finally {
            setActionLoading(prev => {
                const { [`delete-${connection.id}`]: _, ...rest } = prev
                return rest
            })
        }
    }, [getAccessToken, loadConnections])

    const refreshConnection = useCallback(async (connection: EmailConnection) => {
        try {
            setActionLoading(prev => ({ ...prev, [`refresh-${connection.id}`]: true }))
            const accessToken = getAccessToken()

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            const response =
                await refreshConnectionTokensApiV1EmailConnectionsConnectionIdRefreshPost(
                    {
                        path: { connection_id: connection.id },
                        client,
                    },
                )

            if (response.data?.success) {
                toast.success('Connection refreshed successfully')
                await loadConnections()
            } else {
                toast.error(
                    response.data?.error_message ||
                        'Failed to refresh connection',
                )
            }
        } catch (error) {
            console.error('Failed to refresh connection:', error)
            toast.error('Failed to refresh connection')
        } finally {
            setActionLoading(prev => {
                const { [`refresh-${connection.id}`]: _, ...rest } = prev
                return rest
            })
        }
    }, [getAccessToken, loadConnections])

    const testConnection = useCallback(async (connection: EmailConnection) => {
        try {
            setActionLoading(prev => ({ ...prev, [`test-${connection.id}`]: true }))
            const accessToken = getAccessToken()

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            const response =
                await testConnectionApiV1EmailConnectionsConnectionIdTestPost({
                    path: { connection_id: connection.id },
                    client,
                })

            if (response.data) {
                return {
                    ...response.data,
                    connection_email: connection.email_address,
                    connection_name: connection.connection_name,
                }
            } else {
                toast.success('Connection test successful')
                return null
            }
        } catch (error) {
            console.error('Failed to test connection:', error)
            toast.error('Connection test failed')
            return null
        } finally {
            setActionLoading(prev => {
                const { [`test-${connection.id}`]: _, ...rest } = prev
                return rest
            })
        }
    }, [getAccessToken])

    useEffect(() => {
        if (session?.accessToken) {
            loadConnections()
        }
    }, [session?.accessToken, loadConnections])

    // Cleanup OAuth manager on unmount
    useEffect(() => {
        return () => {
            oauthManager.cleanup()
        }
    }, [oauthManager])

    return {
        connections,
        loading,
        actionLoading,
        addConnection,
        deleteConnection,
        refreshConnection,
        testConnection,
        loadConnections,
    }
}