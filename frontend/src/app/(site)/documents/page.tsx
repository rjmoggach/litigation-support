'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function DocumentsPage() {
    const pageData = navItems.find(item => item.url === '/documents')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder - table-like layout */}
                <div className="space-y-3">
                    <div className="flex gap-4 p-3 border-b font-medium text-sm">
                        <div className="w-8"><Skeleton className="h-4 w-4" /></div>
                        <div className="flex-1"><Skeleton className="h-4 w-24" /></div>
                        <div className="w-24"><Skeleton className="h-4 w-16" /></div>
                        <div className="w-32"><Skeleton className="h-4 w-20" /></div>
                        <div className="w-20"><Skeleton className="h-4 w-12" /></div>
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex gap-4 p-3 border-b">
                            <div className="w-8"><Skeleton className="h-4 w-4" /></div>
                            <div className="flex-1"><Skeleton className="h-4 w-full" /></div>
                            <div className="w-24"><Skeleton className="h-4 w-16" /></div>
                            <div className="w-32"><Skeleton className="h-4 w-20" /></div>
                            <div className="w-20"><Skeleton className="h-4 w-12" /></div>
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