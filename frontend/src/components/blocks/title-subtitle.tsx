import type { LucideIcon } from 'lucide-react'

interface TitleSubtitleProps {
    title: string
    subtitle?: string
    children?: React.ReactNode
    icon?: LucideIcon
}

export function TitleSubtitle({
    title,
    subtitle,
    children,
    icon: Icon,
}: TitleSubtitleProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="size-8 text-primary" />}
                <div>
                    <h1 className="text-2xl font-semibold">{title}</h1>
                    {subtitle && (
                        <p className="text-lg text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {children && (
                <div className="flex items-center gap-2">{children}</div>
            )}
        </div>
    )
}
