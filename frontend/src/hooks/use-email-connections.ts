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

    const loadConnections = useCallback(async () => {
        try {
            setLoading(true)
            const accessToken = getAccessToken()

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            const response = await listConnectionsApiV1EmailConnectionsGet({
                client,
            })

            if (response.data) {
                setConnections(response.data.connections)
            }
        } catch (error) {
            console.error('Failed to load connections:', error)
            toast.error('Failed to load email connections')
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
                const popup = window.open(
                    response.data.authorization_url,
                    'oauth-popup',
                    'width=500,height=600,scrollbars=yes,resizable=yes',
                )

                const handleMessage = (event: MessageEvent) => {
                    if (event.data?.type === 'OAUTH_SUCCESS') {
                        loadConnections()
                        setActionLoading({})
                        toast.success(
                            `Connected ${event.data.connection.email} successfully`,
                        )
                        window.removeEventListener('message', handleMessage)
                    }
                }

                window.addEventListener('message', handleMessage)

                const pollTimer = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(pollTimer)
                        window.removeEventListener('message', handleMessage)
                        loadConnections()
                        setActionLoading({})
                    }
                }, 1000)
            }
        } catch (error) {
            console.error('Failed to add connection:', error)
            toast.error('Failed to initiate email connection')
            setActionLoading({})
        }
    }, [getAccessToken, loadConnections])

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
            toast.error('Failed to delete connection')
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