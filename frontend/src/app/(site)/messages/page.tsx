'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { navItems } from '@/content/navigation/data'

export default function MessagesPage() {
    const pageData = navItems.find(item => item.url === '/messages')!
    
    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: pageData.title, active: true },
    ])

    return (
        <>
            <PageHeader title={pageData.title} subtitle={pageData.description} icon={pageData.icon} />
            
            <div className="space-y-6 p-6">
                {/* Skeleton content placeholder - chat-like layout */}
                <div className="max-w-4xl mx-auto space-y-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`flex gap-3 ${i % 3 === 0 ? 'justify-end' : ''}`}>
                            {i % 3 !== 0 && (
                                <div className="w-8 h-8">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            )}
                            <div className={`max-w-sm space-y-2 ${i % 3 === 0 ? 'items-end' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <div className={`p-3 rounded-lg ${i % 3 === 0 ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                            {i % 3 === 0 && (
                                <div className="w-8 h-8">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="text-center text-muted-foreground py-8">
                    <pageData.icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{pageData.title} coming soon</p>
                </div>
            </div>
        </>
    )
}