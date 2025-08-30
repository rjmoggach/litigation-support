'use client'

import { PageHeader } from '@/components/admin/page-header'
import { columns } from '@/components/data-table/columns'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { RefreshCw, SquarePlus, Users } from 'lucide-react'

interface TaskPageClientProps<TData = unknown> {
    tasks: TData[]
}

export default function TaskPageClient<TData>({
    tasks,
}: TaskPageClientProps<TData>) {
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: 'Tasks', active: true },
    ])

    return (
        <>
            <PageHeader
                title="Tasks"
                subtitle="Manage tasks (example)"
                icon={Users}
            >
                <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
                <Button size="sm">
                    <SquarePlus className="h-4 w-4 mr-2" />
                    Add Task
                </Button>
            </PageHeader>

            <DataTable data={tasks} columns={columns as any} />
        </>
    )
}
