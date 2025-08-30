'use client'

import { PageNavbar } from '@/components/dashboard/page-navbar'
import { AppSidebar } from '@/components/dashboard/sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { BreadcrumbProvider } from '@/providers/breadcrumb-provider'
import { ProtectedRoute } from '@/providers/protected-route'
import { useEffect } from 'react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Add admin-layout class to body to disable scrollbar-gutter
    useEffect(() => {
        document.body.classList.add('admin-layout')
        return () => {
            document.body.classList.remove('admin-layout')
        }
    }, [])

    return (
        <ProtectedRoute requireSuperuser={true}>
            <BreadcrumbProvider>
                <SidebarProvider>
                    <AppSidebar />
                    <SidebarInset>
                        <PageNavbar />
                        {children}
                    </SidebarInset>
                </SidebarProvider>
            </BreadcrumbProvider>
        </ProtectedRoute>
    )
}
