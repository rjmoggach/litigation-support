'use client'

import { DynamicBreadcrumb } from '@/components/blocks/dynamic-breadcrumb'
import { SiteMenuBar } from '@/components/navigation/site-menu-bar'
import { usePathname } from 'next/navigation'

interface ConditionalSiteLayoutProps {
    children: React.ReactNode
}

export function ConditionalSiteLayout({
    children,
}: ConditionalSiteLayoutProps) {
    const pathname = usePathname()
    const isHomePage = pathname === '/'

    return (
        <>
            {/* Site Menu Bar - only show when not on home page */}
            {!isHomePage && (
                <div className="mt-16">
                    <SiteMenuBar />
                </div>
            )}

            {/* Breadcrumb section - only show when not on home page */}
            {!isHomePage && (
                <div className="h-8 flex items-center flex-shrink-0 border-b border-border bg-muted/50">
                    <div className="container max-w-8xl mx-auto max-lg:px-3">
                        <DynamicBreadcrumb />
                    </div>
                </div>
            )}

            {/* Main content area - fills remaining space */}
            <div
                className={`flex-1 flex flex-col container max-w-8xl mx-auto max-lg:px-3 pb-6 ${isHomePage ? 'mt-16' : 'pt-6'}`}
            >
                {children}
            </div>
        </>
    )
}
