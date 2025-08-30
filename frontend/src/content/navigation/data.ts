import { type NavItem } from './types'

export const mainNavItems: NavItem[] = [
    {
        title: 'About',
        url: '/about',
        disabled: false,
        hidden: false,
    },
]

export const footerNavItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
    },
    ...mainNavItems,
]

export const navBarItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
    },
    ...mainNavItems,
]

export const burgerMenuItems: NavItem[] = [
    {
        title: 'Home',
        url: '/',
        disabled: false,
        hidden: false,
    },
    ...mainNavItems,
]
