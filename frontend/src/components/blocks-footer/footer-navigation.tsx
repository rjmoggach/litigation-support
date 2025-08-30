import type { NavItem } from '@/components/blocks-footer/footer-menu'
import { FooterMenu } from '@/components/blocks-footer/footer-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { cn } from '@/lib/utils'

interface FooterNavigationProps {
    items: NavItem[]
    title?: string
    align?: 'left' | 'center' | 'right'
    showThemeToggle?: boolean
}

export const FooterNavigation = ({
    items,
    title = 'Navigation',
    align = 'right',
    showThemeToggle = false,
}: FooterNavigationProps) => {
    return (
        <div className="space-y-2">
            <h3
                className={cn(
                    'text-xs font-medium uppercase text-muted-foreground tracking-widest',
                    align === 'left' && 'text-left',
                    align === 'center' && 'text-center',
                    align === 'right' && 'text-right',
                )}
            >
                {title}
            </h3>
            <FooterMenu items={items} align={align} />
            {showThemeToggle && (
                <div
                    className={cn(
                        'flex w-full gap-2 pt-1',
                        'justify-center md:justify-end',
                        'items-center md:items-end',
                    )}
                >
                    <ThemeToggle />
                </div>
            )}
        </div>
    )
}
