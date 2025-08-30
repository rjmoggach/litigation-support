'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

interface MantraWord {
    text: string
    href: string
}

interface MantraMenuProps {
    className?: string
}

const words: MantraWord[] = [
    { text: 'Collaborate', href: '/collaborate' },
    { text: 'Craft', href: '/craft' },
    { text: 'Create', href: '/create' },
]

export function MantraMenu({ className = '' }: MantraMenuProps) {
    const pathname = usePathname() || '/'

    const activeIndex = React.useMemo(() => {
        const isActive = (href: string) =>
            pathname === href || pathname.startsWith(`${href}/`)
        const i = words.findIndex((w) => isActive(w.href))
        return i // -1 means no active item; underline hidden until hover
    }, [pathname])

    const [hovered, setHovered] = React.useState<number | null>(null)

    return (
        <nav
            aria-label="Mantra menu"
            className={cn('font-medium text-2xl max-sm:text-lg', className)}
            onMouseLeave={() => setHovered(null)}
        >
            {words.map((word, index) => {
                const showUnderline =
                    hovered === index ||
                    (hovered === null && activeIndex === index)
                const isCurrent = activeIndex === index

                return (
                    <span key={word.text} className="inline-flex items-center">
                        <span className="relative inline-block">
                            <Link
                                href={word.href}
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
                                {word.text}
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
                        {index < words.length - 1 && (
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
