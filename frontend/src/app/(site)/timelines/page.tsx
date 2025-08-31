'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function TimelinesPage() {
    const pageData = navItems.find(item => item.url === '/timelines')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder - timeline layout */}
                <div className="max-w-4xl mx-auto space-y-8">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                            
                            <div className="flex gap-6">
                                {/* Timeline dot */}
                                <div className="w-12 h-12 flex-shrink-0">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 space-y-3 pb-8">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="flex gap-2 mt-3">
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-6 w-20" />
                                        <Skeleton className="h-6 w-12" />
                                    </div>
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