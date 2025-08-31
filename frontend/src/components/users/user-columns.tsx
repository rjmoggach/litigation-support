'use client'

import { ColumnDef } from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/lib/api/types.gen'
import { MoreHorizontal, Trash2, UserPen } from 'lucide-react'
import { useState } from 'react'

interface UserActionsProps {
    user: User
    onEdit: (user: User) => void
    onDelete: (user: User) => void
    totalUsers: number
}

function UserActions({ user, onEdit, onDelete, totalUsers }: UserActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const canDelete = !user.is_superuser && totalUsers > 1

    const handleDelete = () => {
        setShowDeleteDialog(false)
        onDelete(user)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                        <UserPen className="mr-2 h-4 w-4" />
                        Edit user
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={!canDelete}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete user
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete{' '}
                            <strong>{user.full_name || user.email}</strong> and
                            remove all of their data from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export function createUserColumns(
    onEdit: (user: User) => void,
    onDelete: (user: User) => void,
    totalUsers: number,
): ColumnDef<User>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            id: 'user',
            accessorFn: (user) =>
                `${user.full_name || 'No name'} ${user.email}`,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="User" />
            ),
            cell: ({ row }) => {
                const user = row.original
                const getUserInitials = (user: User) => {
                    if (user.full_name) {
                        return user.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2)
                    }
                    return user.email[0].toUpperCase()
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={(user as any)?.avatar_url}
                                alt={user.full_name || user.email}
                            />
                            <AvatarFallback className="text-xs">
                                {getUserInitials(user)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">
                                {user.full_name || 'No name'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {user.email}
                            </span>
                        </div>
                    </div>
                )
            },
            enableSorting: true,
            enableHiding: false,
        },
        {
            accessorKey: 'id',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="ID" />
            ),
            cell: ({ row }) => (
                <div className="w-[60px] text-xs text-muted-foreground">
                    #{row.getValue('id')}
                </div>
            ),
            enableSorting: false,
        },
        {
            id: 'status',
            accessorFn: (user) => {
                if (!user.is_active) return 'inactive'
                if (!(user as any)?.is_verified) return 'unverified'
                return 'active'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const user = row.original
                const isActive = user.is_active
                const isVerified = (user as any)?.is_verified

                return (
                    <div className="flex gap-1">
                        {isActive ? (
                            <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            >
                                Active
                            </Badge>
                        ) : (
                            <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            >
                                Inactive
                            </Badge>
                        )}
                        {isVerified && (
                            <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            >
                                Verified
                            </Badge>
                        )}
                    </div>
                )
            },
            filterFn: (row, id, value) => {
                const status = row.getValue(id) as string
                return value.includes(status)
            },
        },
        {
            id: 'role',
            accessorFn: (user) => {
                if (user.is_superuser) return 'superuser'
                const roles = (user as any)?.roles || ['user']
                if (roles.includes('admin')) return 'admin'
                if (roles.includes('staff')) return 'staff'
                return 'user'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Role" />
            ),
            cell: ({ row }) => {
                const user = row.original
                const role = row.getValue('role') as string

                switch (role) {
                    case 'superuser':
                        return (
                            <Badge
                                variant="default"
                                className="bg-primary/80 text-primary-foreground hover:bg-primary"
                            >
                                Superuser
                            </Badge>
                        )
                    case 'admin':
                        return (
                            <Badge
                                variant="default"
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Admin
                            </Badge>
                        )
                    case 'staff':
                        return (
                            <Badge
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Staff
                            </Badge>
                        )
                    default:
                        return <Badge variant="outline">User</Badge>
                }
            },
            filterFn: (row, id, value) => {
                const role = row.getValue(id) as string
                return value.includes(role)
            },
        },
        {
            id: 'created_at',
            accessorFn: (user) => (user as any)?.created_at,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Joined" />
            ),
            cell: ({ row }) => {
                const createdAt = row.getValue('created_at') as string
                if (!createdAt)
                    return <span className="text-muted-foreground">N/A</span>

                try {
                    return (
                        <span className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(createdAt), {
                                addSuffix: true,
                            })}
                        </span>
                    )
                } catch {
                    return <span className="text-muted-foreground">N/A</span>
                }
            },
            enableSorting: true,
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <UserActions
                    user={row.original}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    totalUsers={totalUsers}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
    ]
}

// Filter options for the toolbar
export const userStatusOptions = [
    {
        label: 'Active',
        value: 'active',
    },
    {
        label: 'Inactive',
        value: 'inactive',
    },
    {
        label: 'Unverified',
        value: 'unverified',
    },
]

export const userRoleOptions = [
    {
        label: 'User',
        value: 'user',
    },
    {
        label: 'Staff',
        value: 'staff',
    },
    {
        label: 'Admin',
        value: 'admin',
    },
    {
        label: 'Superuser',
        value: 'superuser',
    },
]
