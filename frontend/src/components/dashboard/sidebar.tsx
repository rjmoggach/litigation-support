'use client'

import {
    Building2,
    FileText,
    Film,
    Images,
    SearchCode,
    Tags,
    Users,
} from 'lucide-react'
import * as React from 'react'

import { SidebarHeader as AdminSidebarHeader } from '@/components/dashboard/sidebar-header'
import { NavMain } from '@/components/dashboard/sidebar-nav-main'
import { NavSecondary } from '@/components/dashboard/sidebar-nav-secondary'
import { NavUser } from '@/components/dashboard/sidebar-nav-user'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar'

const navItems = [
    {
        title: 'Users',
        url: '//users',
        icon: Users,
    },
    {
        title: 'Contacts',
        url: '//contacts',
        icon: Building2,
    },
    {
        title: 'Videos',
        url: '//videos',
        icon: Film,
    },
    {
        title: 'Galleries',
        url: '//galleries',
        icon: Images,
    },
    {
        title: 'Tags',
        url: '//tags',
        icon: Tags,
    },
    {
        title: 'Pages',
        url: '//pages',
        icon: FileText,
    },
    {
        title: 'SEO',
        url: '//seo',
        icon: SearchCode,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <AdminSidebarHeader />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
                <NavSecondary />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
