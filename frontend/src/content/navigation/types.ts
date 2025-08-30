import { LinkProps } from 'next/link'

interface User {
    name: string
    email: string
    avatar: string
}

interface BaseNavItem {
    title: string
    badge?: string
    icon?: React.ElementType
    disabled?: boolean
    hidden?: boolean
}

type NavLink = BaseNavItem & {
    url: LinkProps['href']
    items?: never
}

type NavCollapsible = BaseNavItem & {
    items: (BaseNavItem & { url: LinkProps['href'] })[]
    url?: never
}

type NavItem = NavCollapsible | NavLink

interface NavGroup {
    title: string
    items: NavItem[]
}

export type { NavCollapsible, NavGroup, NavItem, NavLink, User }
