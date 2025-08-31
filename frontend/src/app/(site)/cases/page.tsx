'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function CasesPage() {
    const pageData = navItems.find(item => item.url === '/cases')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-3 p-4 border rounded-lg">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-2/3" />
                            <div className="flex gap-2 mt-4">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-20" />
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