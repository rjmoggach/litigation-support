'use client'

import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'

export default function NotificationsPage() {
    // Update breadcrumb
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Notifications', active: true },
    ])

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center">
                <h1 className="text-2xl font-semibold">Notifications</h1>
            </div>
            <div className="rounded-lg border bg-card p-6">
                <p className="text-muted-foreground">Your notifications will appear here.</p>
            </div>
        </div>
    )
}