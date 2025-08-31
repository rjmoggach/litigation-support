'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { client } from '@/lib/api/client.gen'
import {
    deleteConnectionApiV1EmailConnectionsConnectionIdDelete,
    initiateOauthFlowApiV1EmailConnectionsOauthInitiatePost,
    listConnectionsApiV1EmailConnectionsGet,
    refreshConnectionTokensApiV1EmailConnectionsConnectionIdRefreshPost,
    testConnectionApiV1EmailConnectionsConnectionIdTestPost,
} from '@/lib/api/sdk.gen'
import type { EmailConnection } from '@/types/email-connections'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Mail,
    Plus,
    RefreshCw,
    TestTube,
    Trash2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function EmailConnectionsManager() {
    const { data: session } = useSession()
    const [connections, setConnections] = useState<EmailConnection[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<{
        [key: string]: boolean
    }>({})
    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [testResult, setTestResult] = useState<any>(null)

    useEffect(() => {
        if (session?.accessToken) {
            loadConnections()
        }
    }, [session?.accessToken])

    const getAccessToken = (): string => {
        const accessToken =
            session && typeof session === 'object' && 'accessToken' in session
                ? String(session.accessToken)
                : ''

        if (!accessToken) {
            throw new Error('No authentication token available')
        }

        return accessToken
    }

    const loadConnections = async () => {
        try {
            setLoading(true)
            const accessToken = getAccessToken()

            // Configure client with auth token
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
    }

    const handleAddConnection = async () => {
        try {
            setActionLoading({ add: true })
            const accessToken = getAccessToken()

            // Configure client with auth token
            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            // Initiate OAuth flow
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
                // Open OAuth URL in popup
                const popup = window.open(
                    response.data.authorization_url,
                    'oauth-popup',
                    'width=500,height=600,scrollbars=yes,resizable=yes',
                )

                // Listen for messages from popup
                const handleMessage = (event: MessageEvent) => {
                    if (event.data?.type === 'OAUTH_SUCCESS') {
                        // Success! Reload connections
                        loadConnections()
                        setActionLoading({})
                        toast.success(
                            `Connected ${event.data.connection.email} successfully`,
                        )
                        window.removeEventListener('message', handleMessage)
                    }
                }

                window.addEventListener('message', handleMessage)

                // Also poll for popup closure as fallback
                const pollTimer = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(pollTimer)
                        window.removeEventListener('message', handleMessage)
                        // Reload connections to see if new one was added
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
    }

    const handleDeleteConnection = async (connection: EmailConnection) => {
        try {
            setActionLoading({ [`delete-${connection.id}`]: true })
            const accessToken = getAccessToken()

            // Configure client with auth token
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
            setActionLoading({})
        }
    }

    const handleRefreshConnection = async (connection: EmailConnection) => {
        try {
            setActionLoading({ [`refresh-${connection.id}`]: true })
            const accessToken = getAccessToken()

            // Configure client with auth token
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
            setActionLoading({})
        }
    }

    const handleTestConnection = async (connection: EmailConnection) => {
        try {
            setActionLoading({ [`test-${connection.id}`]: true })
            const accessToken = getAccessToken()

            // Configure client with auth token
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
                setTestResult({
                    ...response.data,
                    connection_email: connection.email_address,
                    connection_name: connection.connection_name,
                })
                setTestDialogOpen(true)
            } else {
                toast.success('Connection test successful')
            }
        } catch (error) {
            console.error('Failed to test connection:', error)
            toast.error('Connection test failed')
        } finally {
            setActionLoading({})
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="size-4 text-green-600" />
            case 'expired':
                return <Clock className="size-4 text-yellow-600" />
            case 'error':
                return <AlertCircle className="size-4 text-red-600" />
            default:
                return <AlertCircle className="size-4 text-gray-600" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800'
            case 'expired':
                return 'bg-yellow-100 text-yellow-800'
            case 'error':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-5" />
                        Email Account Connections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        Loading connections...
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            {/* Test Connection Dialog */}
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Connection Test Results</DialogTitle>
                        <DialogDescription>
                            Testing connection for{' '}
                            {testResult?.connection_name ||
                                testResult?.connection_email}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Connection Status */}
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                            <CheckCircle className="size-5 text-green-600" />
                            <div>
                                <div className="font-medium text-green-800">
                                    Connection Successful
                                </div>
                                <div className="text-sm text-green-600">
                                    {testResult?.message}
                                </div>
                            </div>
                        </div>

                        {/* Latest Email */}
                        {testResult?.latest_message ? (
                            <div className="space-y-3">
                                <h4 className="font-medium">
                                    Latest Email Received
                                </h4>
                                <div className="border rounded-md p-3 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-500">
                                                From:
                                            </span>
                                            <div className="mt-1 break-all">
                                                {testResult.latest_message.from}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-500">
                                                Date:
                                            </span>
                                            <div className="mt-1">
                                                {testResult.latest_message.date}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="font-medium text-gray-500">
                                            Subject:
                                        </span>
                                        <div className="mt-1 font-medium">
                                            {testResult.latest_message.subject}
                                        </div>
                                    </div>

                                    {testResult.latest_message.snippet && (
                                        <div>
                                            <span className="font-medium text-gray-500">
                                                Preview:
                                            </span>
                                            <div className="mt-1 text-gray-700 italic">
                                                {
                                                    testResult.latest_message
                                                        .snippet
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : testResult?.has_gmail_scope === false ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <AlertCircle className="size-5 text-yellow-600" />
                                    <div>
                                        <div className="font-medium text-yellow-800">
                                            Gmail Access Not Granted
                                        </div>
                                        <div className="text-sm text-yellow-600">
                                            This connection doesn't have Gmail
                                            reading permissions. Delete and
                                            reconnect to grant Gmail access.
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p>
                                        <strong>Granted scopes:</strong>
                                    </p>
                                    <ul className="list-disc list-inside mt-1">
                                        {testResult.granted_scopes?.map(
                                            (scope: string, index: number) => (
                                                <li
                                                    key={index}
                                                    className="break-all"
                                                >
                                                    {scope}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Mail className="size-12 mx-auto mb-2 opacity-50" />
                                <p>No recent emails found in inbox</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={() => setTestDialogOpen(false)}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-5" />
                        Email Account Connections
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Connect additional Gmail/Workspace accounts for evidence
                        collection
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {connections.length === 0 ? (
                        <div className="text-center py-8">
                            <Mail className="size-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                No additional email accounts connected
                            </p>
                            <Button
                                onClick={handleAddConnection}
                                disabled={actionLoading.add}
                                className="gap-2"
                            >
                                <Plus className="size-4" />
                                {actionLoading.add
                                    ? 'Add Account...'
                                    : 'Connect Email Account'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {connections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className="flex items-center justify-between p-2 px-4 border rounded-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(
                                                connection.connection_status,
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    {connection.connection_name ||
                                                        connection.email_address}
                                                </div>
                                                {connection.connection_name && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {
                                                            connection.email_address
                                                        }
                                                    </div>
                                                )}
                                                {connection.error_message && (
                                                    <div className="text-sm text-red-600 mt-1">
                                                        {
                                                            connection.error_message
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={getStatusColor(
                                                    connection.connection_status,
                                                )}
                                            >
                                                {connection.connection_status}
                                            </Badge>

                                            <div className="flex gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleTestConnection(
                                                                    connection,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading[
                                                                    `test-${connection.id}`
                                                                ]
                                                            }
                                                        >
                                                            <TestTube className="size-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Test connection
                                                    </TooltipContent>
                                                </Tooltip>

                                                {(connection.connection_status ===
                                                    'expired' ||
                                                    connection.connection_status ===
                                                        'error') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRefreshConnection(
                                                                        connection,
                                                                    )
                                                                }
                                                                disabled={
                                                                    actionLoading[
                                                                        `refresh-${connection.id}`
                                                                    ]
                                                                }
                                                            >
                                                                <RefreshCw className="size-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Refresh tokens
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <AlertDialog>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <AlertDialogTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={
                                                                        actionLoading[
                                                                            `delete-${connection.id}`
                                                                        ]
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Delete connection
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Delete email
                                                                connection?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you
                                                                want to delete
                                                                the connection
                                                                for{' '}
                                                                <strong>
                                                                    {
                                                                        connection.email_address
                                                                    }
                                                                </strong>
                                                                ? This action
                                                                cannot be
                                                                undone. You will
                                                                need to
                                                                reconnect this
                                                                account if you
                                                                want to use it
                                                                again.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() =>
                                                                    handleDeleteConnection(
                                                                        connection,
                                                                    )
                                                                }
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                                connection
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={handleAddConnection}
                                disabled={actionLoading.add}
                                variant="outline"
                                className="gap-2"
                            >
                                <Plus className="size-4" />
                                {actionLoading.add
                                    ? 'Add Account...'
                                    : 'Add Another Account'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
