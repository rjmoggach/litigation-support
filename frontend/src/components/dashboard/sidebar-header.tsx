'use client'

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'
import { LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export function SidebarHeader() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent border border-sidebar-border"
                >
                    <Link href="/">
                        <div className="flex items-center space-x-2">
                            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-sm">
                                <LayoutDashboard className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    Admin Dashboard
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    robertmoggach.com
                                </span>
                            </div>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
