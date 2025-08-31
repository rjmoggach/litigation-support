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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw,
    TestTube,
    Trash2,
} from 'lucide-react'
import type { EmailConnection } from '@/types/email-connections'

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

    return (
        <div className="flex items-center justify-between p-2 px-4 border rounded-sm">
            <div className="flex items-center gap-3">
                {getStatusIcon(connection.connection_status)}
                <div>
                    <div className="font-medium">
                        {connection.connection_name || connection.email_address}
                    </div>
                    {connection.connection_name && (
                        <div className="text-sm text-muted-foreground">
                            {connection.email_address}
                        </div>
                    )}
                    {connection.error_message && (
                        <div className="text-sm text-red-600 mt-1">
                            {connection.error_message}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Badge className={getStatusColor(connection.connection_status)}>
                    {connection.connection_status}
                </Badge>

                <div className="flex gap-1">
                    {/* Test Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onTest(connection)}
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
                                    onClick={() => onRefresh(connection)}
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
                                    onClick={() => onDelete(connection)}
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