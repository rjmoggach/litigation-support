'use client'

import { LogOut, Scale, Settings, Settings2, User } from 'lucide-react'
import { Session } from 'next-auth'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import * as React from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Extended user type with roles and superuser status
interface ExtendedUser {
    name?: string | null
    email?: string | null
    image?: string | null
    avatar_url?: string | null
    avatar_cloudfront_url?: string | null
    avatar_file_id?: number | null
    roles?: string[]
    is_superuser?: boolean
}

// Helper function to check if user is admin
function isAdmin(session: Session | null): boolean {
    if (!session?.user) return false

    const user = session.user as ExtendedUser
    return Boolean(user.roles?.includes('admin') || user.is_superuser)
}

export function UserMenu() {
    const { data: session, status } = useSession()

    const handleLogout = () => {
        signOut({ callbackUrl: '/' })
    }

    // Debug session data
    React.useEffect(() => {
        if (session?.user) {
            const user = session.user as ExtendedUser
            console.log('UserMenu session data:', session.user)
            console.log('Avatar fields:', {
                avatar_url: user.avatar_url,
                avatar_cloudfront_url: user.avatar_cloudfront_url,
                avatar_file_id: user.avatar_file_id,
                image: user.image,
            })
        }
    }, [session])

    const getUserInitials = (
        fullName: string | null | undefined,
        email: string,
    ) => {
        if (fullName) {
            return fullName
                .split(' ')
                .map((name) => name[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
        }
        return email[0].toUpperCase()
    }

    if (status === 'loading') {
        return (
            <div className="h-6 w-6 animate-pulse rounded-lg">
                <Scale className="size-5" />
            </div>
        )
    }

    if (!session?.user) {
        return (
            <div className="flex items-center">
                <Button
                    size="navbar"
                    variant="navbar"
                    asChild
                    className="after:hidden hover:after:border-0"
                >
                    <Link href="/login">
                        <Scale className="size-5" />
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="navbar"
                    size="navbar"
                    className="p-0 h-8 w-8 after:hidden hover:after:border-0"
                >
                    <Avatar className="h-7 w-7">
                        <AvatarImage
                            src={
                                (session.user as ExtendedUser)
                                    .avatar_cloudfront_url ||
                                (session.user as ExtendedUser).avatar_url ||
                                undefined
                            }
                            alt={
                                session.user.name ||
                                session.user.email ||
                                'User'
                            }
                            onError={(error) => {
                                const user = session.user as ExtendedUser
                                const attemptedSrc =
                                    user.avatar_cloudfront_url ||
                                    user.avatar_url
                                console.warn('Avatar image failed to load:', {
                                    attempted_src: attemptedSrc,
                                    avatar_cloudfront_url:
                                        user.avatar_cloudfront_url,
                                    avatar_url: user.avatar_url,
                                    avatar_file_id: user.avatar_file_id,
                                    error: error,
                                })
                            }}
                            onLoad={() => {
                                const user = session.user as ExtendedUser
                                console.log(
                                    'Avatar image loaded successfully:',
                                    {
                                        src:
                                            user.avatar_cloudfront_url ||
                                            user.avatar_url,
                                    },
                                )
                            }}
                        />
                        <AvatarFallback className="text-xs">
                            {getUserInitials(
                                session.user.name,
                                session.user.email!,
                            )}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {session.user.name || 'User'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {session.user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="cursor-pointer">
                        <Settings2 className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>
                {isAdmin(session) && (
                    <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Admin</span>
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
