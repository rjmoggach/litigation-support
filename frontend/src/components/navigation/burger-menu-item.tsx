import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export interface NavItem {
    label: string
    url: string
    disabled?: boolean
    hidden?: boolean
}

interface NavBarMenuItemProps {
    route: NavItem
    onClick?: (url: string, e: React.MouseEvent) => void
}

const NavBarMenuItem: React.FC<NavBarMenuItemProps> = ({
    route,
    onClick,
}) => {
    const pathname = usePathname()

    const isActive = (url: string) => {
        return pathname === url
    }

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            onClick(route.url, e)
        }
    }

    if (route.hidden) {
        return null
    }

    return (
        <Link
            href={route.url}
            onClick={handleClick}
            className={cn(
                'relative text-2xl font-medium transition-all duration-200 text-foreground/60 hover:text-foreground ',
                'group cursor-pointer transition-colors w-fit p-0',
                'text-foreground/60 hover:text-foreground',
                'after:content-[""] after:absolute after:-bottom-[2px] after:left-0 after:w-full',
                'after:h-[2px] after:transform after:translate-y-4 after:transition after:duration-300 after:ease-out',
                'hover:after:translate-y-0 hover:after:bg-foreground',
                isActive(route.url) &&
                    'text-foreground after:translate-y-0 after:bg-foreground',
                route.disabled && 'pointer-events-none text-foreground/40',
            )}
            aria-disabled={route.disabled}
        >
            {route.label}
        </Link>
    )
}

export default NavBarMenuItem
