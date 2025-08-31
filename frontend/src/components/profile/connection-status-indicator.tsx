'use client'

import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Wifi,
    WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionStatusIndicatorProps {
    status: 'active' | 'expired' | 'error' | 'revoked'
    lastSync?: string
    errorMessage?: string
    compact?: boolean
    showLastSync?: boolean
    className?: string
}

export function ConnectionStatusIndicator({
    status,
    lastSync,
    errorMessage,
    compact = false,
    showLastSync = false,
    className,
}: ConnectionStatusIndicatorProps) {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    icon: <CheckCircle className="size-4 text-green-600" />,
                    label: 'Active',
                    badgeColor: 'bg-green-100 text-green-800 border-green-200',
                    description: 'Connection is working properly',
                    healthIcon: <Wifi className="size-3 text-green-600" />,
                }
            case 'expired':
                return {
                    icon: <Clock className="size-4 text-yellow-600" />,
                    label: 'Expired',
                    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    description: 'Tokens have expired and need refresh',
                    healthIcon: <WifiOff className="size-3 text-yellow-600" />,
                }
            case 'error':
                return {
                    icon: <AlertCircle className="size-4 text-red-600" />,
                    label: 'Error',
                    badgeColor: 'bg-red-100 text-red-800 border-red-200',
                    description: errorMessage || 'Connection has encountered an error',
                    healthIcon: <WifiOff className="size-3 text-red-600" />,
                }
            case 'revoked':
                return {
                    icon: <XCircle className="size-4 text-gray-600" />,
                    label: 'Revoked',
                    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
                    description: 'Access has been revoked by the user',
                    healthIcon: <WifiOff className="size-3 text-gray-600" />,
                }
            default:
                return {
                    icon: <AlertCircle className="size-4 text-gray-600" />,
                    label: 'Unknown',
                    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
                    description: 'Status unknown',
                    healthIcon: <WifiOff className="size-3 text-gray-600" />,
                }
        }
    }

    const statusConfig = getStatusConfig(status)

    const formatLastSync = (lastSyncString?: string) => {
        if (!lastSyncString) return 'Never synced'
        
        try {
            const lastSyncDate = new Date(lastSyncString)
            const now = new Date()
            const diffMs = now.getTime() - lastSyncDate.getTime()
            const diffMinutes = Math.floor(diffMs / (1000 * 60))
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            if (diffMinutes < 1) {
                return 'Just now'
            } else if (diffMinutes < 60) {
                return `${diffMinutes}m ago`
            } else if (diffHours < 24) {
                return `${diffHours}h ago`
            } else if (diffDays < 7) {
                return `${diffDays}d ago`
            } else {
                return lastSyncDate.toLocaleDateString()
            }
        } catch {
            return 'Invalid date'
        }
    }

    if (compact) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("inline-flex items-center gap-1", className)}>
                        {statusConfig.icon}
                        {showLastSync && lastSync && (
                            <span className="text-xs text-muted-foreground">
                                {formatLastSync(lastSync)}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="space-y-1">
                        <div className="font-medium">{statusConfig.label}</div>
                        <div className="text-sm">{statusConfig.description}</div>
                        {showLastSync && (
                            <div className="text-xs text-muted-foreground">
                                Last sync: {formatLastSync(lastSync)}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        )
    }

    return (
        <div className={cn("space-y-2", className)}>
            {/* Main Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {statusConfig.icon}
                    <Badge className={statusConfig.badgeColor}>
                        {statusConfig.label}
                    </Badge>
                </div>
                {statusConfig.healthIcon}
            </div>

            {/* Status Description */}
            <div className="text-sm text-muted-foreground">
                {statusConfig.description}
            </div>

            {/* Last Sync Information */}
            {showLastSync && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last sync</span>
                    <span className="font-mono">{formatLastSync(lastSync)}</span>
                </div>
            )}

            {/* Error Details */}
            {status === 'error' && errorMessage && (
                <div className="p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                    <div className="font-medium mb-1">Error Details:</div>
                    <div className="break-words">{errorMessage}</div>
                </div>
            )}

            {/* Helpful Status Messages */}
            {status === 'expired' && (
                <div className="p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-700">
                    <div className="font-medium mb-1">Action Required:</div>
                    <div>Click the refresh button to renew your tokens.</div>
                </div>
            )}

            {status === 'revoked' && (
                <div className="p-2 bg-gray-50 border border-gray-100 rounded text-xs text-gray-700">
                    <div className="font-medium mb-1">Access Revoked:</div>
                    <div>You'll need to reconnect this account to use it again.</div>
                </div>
            )}
        </div>
    )
}