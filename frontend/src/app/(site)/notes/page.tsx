'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function NotesPage() {
    const pageData = navItems.find(item => item.url === '/notes')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder - notes grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3 h-48">
                            <div className="flex justify-between items-start">
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-5/6" />
                            </div>
                            <div className="flex justify-between items-end mt-auto">
                                <Skeleton className="h-3 w-20" />
                                <div className="flex gap-1">
                                    <Skeleton className="h-5 w-12" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="text-center text-muted-foreground py-8">
                    <pageData.icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{pageData.title} management coming soon</p>
                </div>
            </div>
        </>
    )
}