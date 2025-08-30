'use client'

import { DynamicBreadcrumb } from '@/components/dashboard/dynamic-breadcrumb'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function PageNavbar() {
    return (
        <div className="sticky top-0 z-50 bg-background border-b">
            <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <DynamicBreadcrumb />
                </div>
                <div className="px-4">
                    <ThemeToggle />
                </div>
            </header>
        </div>
    )
}
