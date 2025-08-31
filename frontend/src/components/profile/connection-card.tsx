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
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    RefreshCw,
    TestTube,
    Trash2,
} from 'lucide-react'
import type { EmailConnection } from '@/types/email-connections'
import { ConnectionStatusIndicator } from './connection-status-indicator'
import { EmailConnectionsErrorFallback } from './email-connections-error-boundary'
import { handleEmailConnectionError } from '@/lib/error-handling'

interface ConnectionCardProps {
    connection: EmailConnection
    onTest: (connection: EmailConnection) => Promise<void>
    onRefresh: (connection: EmailConnection) => Promise<void>
    onDelete: (connection: EmailConnection) => Promise<void>
    actionLoading: { [key: string]: boolean }
}

export function ConnectionCard({
    connection,
    onTest,
    onRefresh,
    onDelete,
    actionLoading,
}: ConnectionCardProps) {
    
    const handleAction = async (actionFn: () => Promise<void>, actionName: string) => {
        try {
            await actionFn()
        } catch (error) {
            handleEmailConnectionError(error, `${actionName} for ${connection.email_address}`)
        }
    }

    return (
        <div className="flex items-center justify-between p-2 px-4 border rounded-sm">
            <div className="flex items-center gap-3">
                <div>
                    <div className="font-medium">
                        {connection.connection_name || connection.email_address}
                    </div>
                    {connection.connection_name && (
                        <div className="text-sm text-muted-foreground">
                            {connection.email_address}
                        </div>
                    )}
                    <div className="mt-2">
                        <ConnectionStatusIndicator
                            status={connection.connection_status}
                            lastSync={connection.last_sync_at}
                            errorMessage={connection.error_message}
                            compact={true}
                            showLastSync={true}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">

                <div className="flex gap-1">
                    {/* Test Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(() => onTest(connection), 'Testing connection')}
                                disabled={actionLoading[`test-${connection.id}`]}
                            >
                                <TestTube className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Test connection</TooltipContent>
                    </Tooltip>

                    {/* Refresh Button - only show for expired/error connections */}
                    {(connection.connection_status === 'expired' ||
                        connection.connection_status === 'error') && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAction(() => onRefresh(connection), 'Refreshing connection')}
                                    disabled={
                                        actionLoading[`refresh-${connection.id}`]
                                    }
                                >
                                    <RefreshCw className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh tokens</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Delete Button */}
                    <AlertDialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
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
                            <TooltipContent>Delete connection</TooltipContent>
                        </Tooltip>

                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Delete email connection?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete the
                                    connection for{' '}
                                    <strong>{connection.email_address}</strong>?
                                    This action cannot be undone. You will need
                                    to reconnect this account if you want to use
                                    it again.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => handleAction(() => onDelete(connection), 'Deleting connection')}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete connection
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    )
}