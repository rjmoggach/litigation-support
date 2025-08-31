'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function EmailsPage() {
    const pageData = navItems.find(item => item.url === '/emails')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder - email list layout */}
                <div className="space-y-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex gap-4 p-4 border rounded-lg">
                            <div className="w-8 h-8">
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
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