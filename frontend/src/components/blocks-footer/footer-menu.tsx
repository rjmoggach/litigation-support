'use client'
import { cn } from '@/lib/utils'

import * as React from 'react'

import type { LinkProps } from 'next/link'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
    label?: string
    href?: string
    title?: string
    url?: LinkProps['href']
    disabled?: boolean
    hidden?: boolean
}

interface FooterMenuProps {
    items: NavItem[]
    align?: 'left' | 'center' | 'right'
}

export function FooterMenu({ items, align = 'left' }: FooterMenuProps) {
    const pathname = usePathname()

    React.useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])

    const isActive = (href: LinkProps['href'] | string | undefined) => {
        if (!href) return false
        if (typeof href === 'string') {
            return pathname === href
        }
        return pathname === href.pathname
    }

    if (!items?.length) return null

    return (
        <nav
            className={cn(
                'flex flex-col max-sm:space-y-2 space-y-1 font-normal',
                'text-center md:text-right',
                'items-center md:items-end',
            )}
        >
            {items
                .filter((item) => !item.hidden && !!(item.href || item.url))
                .map((item) => (
                    <Link
                        key={
                            item.href ||
                            (typeof item.url === 'string'
                                ? item.url
                                : item.url?.pathname) ||
                            ''
                        }
                        href={item.href || item.url || ''}
                        aria-disabled={item.disabled}
                        className={cn(
                            'group relative inline-block px-0',
                            'py-1 text-sm cursor-pointer',
                            'transition-colors w-fit',
                            'text-foreground/70 hover:text-foreground',
                            'after:content-[""] after:absolute after:-bottom-[2px] after:left-0 after:w-full',
                            'after:h-[2px] after:transform after:translate-y-4 after:transition after:duration-300 after:ease-out',
                            'hover:after:translate-y-0 hover:after:opacity-100 hover:after:bg-foreground',

                            align === 'left' && 'text-left',
                            align === 'center' && 'text-center',
                            align === 'right' && 'text-right',
                            item.disabled &&
                                'text-foreground/40 pointer-events-none opacity-50',
                            isActive(item.href || item.url) && 'font-medium',
                        )}
                    >
                        {item.label || item.title || ''}
                    </Link>
                ))}
        </nav>
    )
}
