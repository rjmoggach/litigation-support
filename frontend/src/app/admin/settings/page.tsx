'use client'

import { PageHeader } from '@/components/admin/page-header'
import { Settings2 } from 'lucide-react'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'

export default function SettingsPage() {
    // Update breadcrumb
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Settings', active: true },
    ])

    return (
        <>
            <PageHeader
                title="Settings"
                subtitle="Site configuration"
                icon={Settings2}
            />
            <div className="flex flex-1 flex-col gap-4">
                <div className="rounded-lg border bg-card p-6">
                    <p className="text-muted-foreground">
                        Site configuration will be available here.
                    </p>
                </div>
            </div>
        </>
    )
}
