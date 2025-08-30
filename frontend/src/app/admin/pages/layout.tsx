'use client'

import { PagesTreeSidebar } from '@/components/admin/pages/pages-tree-sidebar'
import { PagesProvider } from '@/providers/pages-provider'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminPagesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()

    // Extract current page ID from URL
    const currentPageId = pathname.includes('/edit/')
        ? parseInt(pathname.split('/edit/')[1])
        : pathname === '/admin/pages'
          ? 1
          : undefined

    const handlePageSelect = (pageId: number) => {
        if (pageId === 1) {
            router.push('/admin/pages')
        } else {
            router.push(`/admin/pages/edit/${pageId}`)
        }
    }

    return (
        <PagesProvider>
            <div className="flex h-full">
                {/* Pages Sidebar - Position relative to the SidebarInset parent */}
                <div className="w-64 shrink-0 border-r bg-muted/30 fixed left-[var(--sidebar-width)] top-14 bottom-0 z-10">
                    <PagesTreeSidebar
                        className="h-full"
                        currentPageId={currentPageId}
                        onPageSelect={handlePageSelect}
                    />
                </div>

                {/* Main Content - With left margin to account for pages sidebar */}
                <div className="flex-1 ml-64 flex flex-col overflow-hidden p-4">
                    {children}
                </div>
            </div>
        </PagesProvider>
    )
}
