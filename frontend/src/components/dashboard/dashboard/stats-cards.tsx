'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserStatsResponse } from '@/lib/api/types.gen'
import {
    Activity,
    ShieldCheck,
    TrendingUp,
    UserCheck,
    Users,
    UserX,
} from 'lucide-react'

interface StatsCardsProps {
    stats: UserStatsResponse | null
    loading?: boolean
}

export function StatsCards({ stats, loading = false }: StatsCardsProps) {
    const cards = [
        {
            title: 'Total Users',
            value: stats?.total_users || 0,
            icon: Users,
            description: 'All registered users',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            title: 'Active Users',
            value: stats?.active_users || 0,
            icon: UserCheck,
            description: 'Currently active accounts',
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
        },
        {
            title: 'Verified Users',
            value: stats?.verified_users || 0,
            icon: ShieldCheck,
            description: 'Email verified accounts',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        },
        {
            title: 'Recent Signups',
            value: stats?.recent_registrations || 0,
            icon: TrendingUp,
            description: 'Last 7 days',
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        },
    ]

    if (loading) {
        return (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-md ${card.bgColor}`}>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {card.value.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

// Additional stats breakdown card
export function StatsBreakdown({ stats, loading = false }: StatsCardsProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>User Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between"
                        >
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    const breakdownItems = [
        {
            label: 'Inactive Users',
            value: stats?.inactive_users || 0,
            icon: UserX,
            color: 'text-gray-600 dark:text-gray-400',
        },
        {
            label: 'Unverified Users',
            value: stats?.unverified_users || 0,
            icon: Activity,
            color: 'text-yellow-600 dark:text-yellow-400',
        },
        {
            label: 'Administrators',
            value: stats?.superusers || 0,
            icon: ShieldCheck,
            color: 'text-purple-600 dark:text-purple-400',
        },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {breakdownItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <div
                            key={item.label}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${item.color}`} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            <span className="text-sm font-medium">
                                {item.value.toLocaleString()}
                            </span>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
