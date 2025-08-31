'use client'

import { siteNavItems } from '@/content/navigation/data'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteMenuBar() {
    const pathname = usePathname()

    return (
        <div className="border-t border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-8xl mx-auto max-lg:px-3">
                <div className="flex items-center justify-start">
                    {siteNavItems.map((item) => {
                        const isActive = pathname.startsWith(item.url as string)
                        const Icon = item.icon!

                        return (
                            <Link
                                key={item.url as string}
                                href={item.url as string}
                                className={cn(
                                    'flex items-center gap-2 border-b-2 border-transparent py-2 px-4',
                                    isActive && 'border-muted-foreground',
                                    !isActive &&
                                        'hover:border-muted-foreground/30',
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                                        item.iconColorClasses,
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <span
                                    className={cn(
                                        'text-sm font-medium transition-colors',
                                        isActive
                                            ? 'text-accent-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {item.title}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
