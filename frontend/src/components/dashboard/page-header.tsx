import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
    title: string
    subtitle?: string
    children?: React.ReactNode
    icon?: LucideIcon
    className?: string
}

export function PageHeader({
    title,
    subtitle,
    children,
    icon: Icon,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between py-3 pt-0 ',
                className,
            )}
        >
            <div className="flex items-center gap-3">
                {Icon && <Icon className="size-8 text-muted-foreground" />}
                <div>
                    <h1 className="text-xl font-medium">{title}</h1>
                    {subtitle && (
                        <p className="text-muted-foreground">{subtitle}</p>
                    )}
                </div>
            </div>
            {children && (
                <div className="flex items-center gap-2">{children}</div>
            )}
        </div>
    )
}
