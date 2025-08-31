'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { mantraNavItems } from '@/content/navigation/data'

interface MantraMenuProps {
    className?: string
}

export function MantraMenu({ className = '' }: MantraMenuProps) {
    const pathname = usePathname() || '/'

    const activeIndex = React.useMemo(() => {
        const isActive = (href: string) =>
            pathname === href || pathname.startsWith(`${href}/`)
        const i = mantraNavItems.findIndex((item) => isActive(item.url as string))
        return i // -1 means no active item; underline hidden until hover
    }, [pathname])

    const [hovered, setHovered] = React.useState<number | null>(null)

    return (
        <nav
            aria-label="Mantra menu"
            className={cn('font-medium text-2xl max-sm:text-lg', className)}
            onMouseLeave={() => setHovered(null)}
        >
            {mantraNavItems.map((item, index) => {
                const showUnderline =
                    hovered === index ||
                    (hovered === null && activeIndex === index)
                const isCurrent = activeIndex === index

                return (
                    <span key={item.title} className="inline-flex items-center">
                        <span className="relative inline-block">
                            <Link
                                href={item.url as string}
                                className={cn(
                                    'relative font-medium transition-colors duration-200',
                                    isCurrent
                                        ? 'text-primary-foreground'
                                        : 'text-foreground/60 hover:text-primary-foreground',
                                )}
                                aria-current={isCurrent ? 'page' : undefined}
                                onMouseEnter={() => setHovered(index)}
                                onFocus={() => setHovered(index)}
                                onBlur={() => setHovered(null)}
                            >
                                {item.title}
                            </Link>
                            {showUnderline && (
                                <motion.span
                                    layoutId="mantra-underline"
                                    initial={false}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 500,
                                        damping: 40,
                                        mass: 0.7,
                                    }}
                                    className="absolute left-0 -bottom-[2px] h-[2px] w-full bg-foreground"
                                />
                            )}
                        </span>
                        {index < mantraNavItems.length - 1 && (
                            <span className="text-foreground/60">
                                &nbsp;/&nbsp;
                            </span>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
