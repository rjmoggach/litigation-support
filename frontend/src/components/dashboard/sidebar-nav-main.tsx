'use client'

import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from '@/components/ui/sidebar'

export function NavMain({
    items,
}: {
    items: {
        title: string
        url?: string
        icon?: LucideIcon
        isActive?: boolean
        items?: { title: string; url: string }[]
    }[]
}) {
    const pathname = usePathname()
    const [hash, setHash] = React.useState<string>('')

    React.useEffect(() => {
        // Initialize and listen to hash changes for submenu active state
        const init = () => setHash(typeof window !== 'undefined' ? window.location.hash : '')
        init()
        const onHash = () => setHash(window.location.hash)
        window.addEventListener('hashchange', onHash)
        return () => window.removeEventListener('hashchange', onHash)
    }, [])

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => {
                    const itemUrlBase = (item.url ?? item.items?.[0]?.url ?? '').split('#')[0]
                    const isActive =
                        (!!itemUrlBase && pathname === itemUrlBase) ||
                        (!!itemUrlBase && pathname.startsWith(itemUrlBase + '/'))

                    if (item.items && item.items.length > 0) {
                        const href = item.url ?? item.items[0].url
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isActive}>
                                    <Link href={href}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    {item.items.map((sub) => {
                                        const [subPath, subHash] = sub.url.split('#')
                                        const subIsActive =
                                            pathname === subPath && (subHash ? hash === `#${subHash}` : true)
                                        return (
                                            <SidebarMenuSubItem key={sub.title}>
                                                <SidebarMenuSubButton asChild isActive={subIsActive}>
                                                    <Link href={sub.url}>
                                                        <span>{sub.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        )
                                    })}
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                        )
                    }

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.url ?? '#'}>
                                    {item.icon && <item.icon />}
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
