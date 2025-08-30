'use client'

import { Bell, ChevronsUpDown, LogOut, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'

export function NavUser() {
    const { isMobile } = useSidebar()
    const { data: session } = useSession()
    const user = session?.user as
        | { name?: string; email?: string; avatar_url?: string }
        | undefined

    const handleLogout = () => {
        signOut({ callbackUrl: '/' })
    }

    const getUserInitials = (
        name: string | null | undefined,
        email: string,
    ) => {
        if (name) {
            return name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
        }
        return email[0].toUpperCase()
    }

    if (!user) {
        return null
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent border border-sidebar-border"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage
                                    key={user.avatar_url}
                                    src={user.avatar_url || undefined}
                                    alt={user.name || user.email || 'User'}
                                />
                                <AvatarFallback className="rounded-lg">
                                    {getUserInitials(
                                        user.name,
                                        user.email || '',
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {user.name || 'Admin User'}
                                </span>
                                <span className="truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage
                                        src={user.avatar_url || undefined}
                                        alt={user.name || user.email || 'User'}
                                    />
                                    <AvatarFallback className="rounded-lg">
                                        {getUserInitials(
                                            user.name,
                                            user.email || '',
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {user.name || 'Admin User'}
                                    </span>
                                    <span className="truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="//profile">
                                    <User />
                                    Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="//notifications">
                                    <Bell />
                                    Notifications
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
