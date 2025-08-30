'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Download,
    FileText,
    Mail,
    Settings,
    UserPlus,
    Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface QuickActionsProps {
    onAction?: (action: string) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
    const router = useRouter()

    const actions = [
        {
            id: 'view-users',
            title: 'View All Users',
            description: 'Manage user accounts',
            icon: Users,
            href: '//users',
            variant: 'default' as const,
        },
        {
            id: 'invite-user',
            title: 'Invite User',
            description: 'Send invitation email',
            icon: UserPlus,
            action: () => onAction?.('invite'),
            variant: 'outline' as const,
        },
        {
            id: 'email-status',
            title: 'Email Status',
            description: 'Check email service',
            icon: Mail,
            action: () => onAction?.('email-status'),
            variant: 'outline' as const,
        },
        {
            id: 'export-users',
            title: 'Export Data',
            description: 'Download user list',
            icon: Download,
            action: () => onAction?.('export'),
            variant: 'outline' as const,
        },
        {
            id: 'view-logs',
            title: 'View Logs',
            description: 'System activity logs',
            icon: FileText,
            action: () => onAction?.('logs'),
            variant: 'outline' as const,
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'System configuration',
            icon: Settings,
            href: '//settings',
            variant: 'outline' as const,
        },
    ]

    const handleAction = (action: (typeof actions)[0]) => {
        if (action.href) {
            router.push(action.href)
        } else if (action.action) {
            action.action()
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                    {actions.map((action) => {
                        const Icon = action.icon

                        if (action.href) {
                            return (
                                <Button
                                    key={action.id}
                                    variant={action.variant}
                                    className="justify-start h-auto py-3"
                                    asChild
                                >
                                    <Link href={action.href}>
                                        <Icon className="mr-2 h-4 w-4" />
                                        <div className="text-left">
                                            <div className="font-medium">
                                                {action.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {action.description}
                                            </div>
                                        </div>
                                    </Link>
                                </Button>
                            )
                        }

                        return (
                            <Button
                                key={action.id}
                                variant={action.variant}
                                className="justify-start h-auto py-3"
                                onClick={() => handleAction(action)}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">
                                        {action.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {action.description}
                                    </div>
                                </div>
                            </Button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
