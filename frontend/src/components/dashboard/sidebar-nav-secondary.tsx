'use client'

import { Home, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavSecondary() {
    const pathname = usePathname()

    const items = [
        {
            title: 'Settings',
            url: '//settings',
            icon: Settings2,
        },
        {
            title: 'Back to Site',
            url: '/',
            icon: Home,
        },
    ]

    return (
        <SidebarGroup className="mt-auto">
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = pathname === item.url
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
