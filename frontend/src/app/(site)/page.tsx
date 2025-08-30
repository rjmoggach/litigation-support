'use client'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import {
    BriefcaseBusiness,
    Calendar,
    ChevronRight,
    FileText,
    LayoutDashboard,
    Users,
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
    // Set breadcrumb for dashboard
    useBreadcrumbUpdate([{ label: 'Dashboard', href: '/', active: true }])

    const modules = [
        {
            title: 'Cases',
            description:
                'Keep track of all cases and their related people, events, and documents',
            icon: BriefcaseBusiness,
            href: '/cases',
            color: 'bg-amber-800',
            stats: 'Manage cases, people, events, and documents',
        },
        {
            title: 'Contacts',
            description:
                'Keep track of all parties, witnesses, attorneys, and other contacts involved in your case',
            icon: Users,
            href: '/contacts',
            color: 'bg-green-800',
            stats: 'Manage parties, witnesses, and attorneys',
        },
        {
            title: 'Emails & Attachments',
            description:
                'Organize, store, and manage all your emails and attachments in one secure location',
            icon: FileText,
            href: '/emails',
            color: 'bg-blue-500',
            stats: 'Upload, organize, and search emails & attachments',
        },
        {
            title: 'Case Timeline',
            description:
                'Track important dates, deadlines, and events throughout your litigation process',
            icon: Calendar,
            href: '/timeline',
            color: 'bg-purple-500',
            stats: 'Track deadlines and court dates',
        },
    ]

    return (
        <>
            <PageHeader
                title="Dashboard"
                subtitle="Manage your litigation case with organized tools and resources."
                icon={LayoutDashboard}
            />
            <div className="space-y-4">
                {/* Module Cards */}
                <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4">
                    {modules.map((module, index) => (
                        <Card
                            key={index}
                            className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-sm ${module.color} text-white`}
                                    >
                                        <module.icon className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">
                                        {module.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <CardDescription className="text-sm leading-relaxed">
                                    {module.description}
                                </CardDescription>

                                <div className="text-xs text-muted-foreground">
                                    {module.stats}
                                </div>

                                <Button
                                    asChild
                                    className="w-full group-hover:bg-primary/90"
                                >
                                    <Link
                                        href={module.href}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        Open Module
                                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Documents Uploaded
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Contacts Managed
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Upcoming Deadlines
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
