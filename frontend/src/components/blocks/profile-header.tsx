'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Camera } from 'lucide-react'

interface ProfileHeaderProps {
    title: string
    subtitle?: string
    children?: React.ReactNode
    className?: string
    avatarUrl?: string | null
    userInitials?: string
    onAvatarClick?: () => void
}

export function ProfileHeader({
    title,
    subtitle,
    children,
    className,
    avatarUrl,
    userInitials,
    onAvatarClick,
}: ProfileHeaderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between py-6 pt-0',
                className,
            )}
        >
            <div className="flex items-center gap-2">
                <div className="relative group">
                    <Avatar
                        className="size-12 cursor-pointer transition-opacity group-hover:opacity-80"
                        onClick={onAvatarClick}
                    >
                        <AvatarImage src={avatarUrl || undefined} alt={title} />
                        <AvatarFallback className="text-lg">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>
                    {onAvatarClick && (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={onAvatarClick}
                        >
                            <Camera className="size-6 text-white" />
                        </div>
                    )}
                </div>
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
