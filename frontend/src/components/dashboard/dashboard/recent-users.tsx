'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { User } from '@/lib/api/types.gen'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface RecentUsersProps {
    users: User[]
    loading?: boolean
}

export function RecentUsers({ users, loading = false }: RecentUsersProps) {
    const getUserInitials = (user: User) => {
        if (user.full_name) {
            return user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
        }
        return user.email[0].toUpperCase()
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown'
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: true,
            })
        } catch {
            return 'Unknown'
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Users</CardTitle>
                <Link
                    href="//users"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    View all
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </CardHeader>
            <CardContent>
                {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No recent users
                    </p>
                ) : (
                    <div className="space-y-4">
                        {users.slice(0, 5).map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage
                                        src={(user as any)?.avatar_url} // eslint-disable-line @typescript-eslint/no-explicit-any
                                        alt={user.full_name || user.email}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {getUserInitials(user)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {user.full_name || 'No name'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate((user as any)?.created_at)}{' '}
                                        {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                                    </span>
                                    {(user as any)?.is_verified ? ( // eslint-disable-line @typescript-eslint/no-explicit-any
                                        <Badge
                                            variant="secondary"
                                            className="text-xs px-1 py-0"
                                        >
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-xs px-1 py-0"
                                        >
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
