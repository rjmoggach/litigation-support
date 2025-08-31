import {
    Archive,
    BookOpenText,
    BriefcaseBusiness,
    Calendar,
    Mail,
    MessageSquareText,
    UserCircle2,
    Users,
} from 'lucide-react'
import { type NavItem } from './types'

// Main application navigation items
export const navItems = [
    {
        title: 'User Profile',
        url: '/profile',
        icon: UserCircle2,
        description:
            'Manage your personal profile, contact information, and account settings',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-violet-800 text-white',
        category: 'user',
    },
    {
        title: 'Contacts',
        url: '/contacts',
        icon: Users,
        description:
            'Manage clients, opposing parties, witnesses, and other case contacts',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-green-800 text-white',
        category: 'contacts',
    },
    {
        title: 'Cases',
        url: '/cases',
        icon: BriefcaseBusiness,
        description:
            'Organize and manage legal cases, documents, and case timelines',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-amber-800 text-white',
        category: 'litigation',
    },
    {
        title: 'Documents',
        url: '/documents',
        icon: Archive,
        description: 'Access and organize documents related to cases',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-stone-600 text-white',
        category: 'communications',
    },
    {
        title: 'Emails',
        url: '/emails',
        icon: Mail,
        description:
            'Access and organize email communications related to cases',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-sky-500 text-white',
        category: 'communications',
    },
    {
        title: 'Messages',
        url: '/messages',
        icon: MessageSquareText,
        description: 'Access and organize documents related to cases',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-green-500 text-white',
        category: 'communications',
    },
    {
        title: 'Timelines',
        url: '/timelines',
        icon: Calendar,
        description:
            'View chronological timeline of case events and important dates',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-violet-600 text-white',
        category: 'timeline',
    },
    {
        title: 'Notes',
        url: '/notes',
        icon: BookOpenText,
        description: 'View and manage notes related to cases',
        disabled: false,
        hidden: false,
        badge: undefined,
        iconColorClasses: 'bg-slate-500 text-white',
        category: 'timeline',
    },
] as const

// Export the same navigation items for all contexts
export const siteNavItems = navItems
export const dashboardNavItems = navItems

// Mantra navigation items (separate from main nav)
export const mantraNavItems = [
    { title: 'Prepare', url: '/prepare' },
    { title: 'Present', url: '/present' },
    { title: 'Persist', url: '/persist' },
]

// Legacy navigation items
export const mainNavItems: NavItem[] = [
    {
        title: 'About',
        url: '/about',
        disabled: false,
        hidden: false,
        badge: undefined,
    },
]

export const footerNavItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
        badge: undefined,
    },
    ...mainNavItems,
]

export const navBarItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
        badge: undefined,
    },
    ...mainNavItems,
]

export const burgerMenuItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
        badge: undefined,
    },
    ...mainNavItems,
]
