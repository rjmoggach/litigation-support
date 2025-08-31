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
import type { Person } from '@/lib/api/contacts.types'
import { MoreHorizontal, Trash2, User, Edit } from 'lucide-react'
import { useState } from 'react'

interface PersonActionsProps {
    person: Person
    onEdit: (person: Person) => void
    onDelete: (person: Person) => void
    totalPeople: number
    linkedPersonId?: number | null
    spouseIds?: number[]
    childIds?: number[]
}

function PersonActions({ person, onEdit, onDelete, totalPeople, linkedPersonId, spouseIds = [], childIds = [] }: PersonActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const isLinked = linkedPersonId === person.id

    const handleDelete = () => {
        setShowDeleteDialog(false)
        onDelete(person)
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
                    <DropdownMenuItem onClick={() => onEdit(person)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit person
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => !isLinked && setShowDeleteDialog(true)}
                        className={isLinked 
                            ? "text-muted-foreground cursor-not-allowed opacity-50" 
                            : "text-destructive focus:text-destructive"
                        }
                        disabled={isLinked}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isLinked ? "Cannot delete linked person" : "Delete person"}
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
                            <strong>{person.full_name}</strong> and
                            remove all of their data from the system.
                            {isLinked && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                    <strong>Warning:</strong> This person is currently linked to your user profile. 
                                    You should unlink them from your profile first.
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Person
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export function createPersonColumns(
    onEdit: (person: Person) => void,
    onDelete: (person: Person) => void,
    totalPeople: number,
    linkedPersonId?: number | null,
    spouseIds: number[] = [],
    childIds: number[] = [],
): ColumnDef<Person>[] {
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
            id: 'person',
            accessorFn: (person) =>
                `${person.full_name} ${person.email || ''}`,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Person" />
            ),
            cell: ({ row }) => {
                const person = row.original
                const getPersonInitials = (person: Person) => {
                    if (!person.first_name || !person.last_name) {
                        // If we don't have both names, fall back to full_name or email
                        if (person.full_name) {
                            const names = person.full_name.split(' ')
                            const firstInitial = names[0]?.[0] || '?'
                            const lastInitial = names[names.length - 1]?.[0] || '?'
                            return `${firstInitial}${lastInitial}`.toUpperCase()
                        }
                        if (person.email) {
                            return person.email.substring(0, 2).toUpperCase()
                        }
                        return '??'
                    }
                    
                    return `${person.first_name[0]}${person.last_name[0]}`
                        .toUpperCase()
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={(person as any)?.avatar_url}
                                alt={person.full_name}
                            />
                            <AvatarFallback className="text-xs">
                                {getPersonInitials(person)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">
                                    {person.full_name}
                                </span>
                                {linkedPersonId === person.id && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        My Record
                                    </Badge>
                                )}
                                {spouseIds.includes(person.id) && (
                                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                        Ex-Spouse
                                    </Badge>
                                )}
                                {childIds.includes(person.id) && (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Child
                                    </Badge>
                                )}
                            </div>
                            {person.email && (
                                <span className="text-xs text-muted-foreground">
                                    {person.email}
                                </span>
                            )}
                            {/* Add address information if available */}
                            {(person as any).addresses && (person as any).addresses.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    📍 {(person as any).addresses[0].street_address}, {(person as any).addresses[0].city}
                                </div>
                            )}
                            {/* Add marriage information if available */}
                            {(person as any).marriages && (person as any).marriages.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    💒 Married to {(person as any).marriages.map((m: any) => m.spouse_name).join(', ')}
                                </div>
                            )}
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
            accessorKey: 'first_name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="First Name" />
            ),
            cell: ({ row }) => {
                const firstName = row.getValue('first_name') as string
                return (
                    <div className="text-sm">
                        {firstName || (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </div>
                )
            },
            enableSorting: true,
        },
        {
            accessorKey: 'last_name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Last Name" />
            ),
            cell: ({ row }) => {
                const lastName = row.getValue('last_name') as string
                return (
                    <div className="text-sm">
                        {lastName || (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </div>
                )
            },
            enableSorting: true,
        },
        {
            accessorKey: 'phone',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Phone" />
            ),
            cell: ({ row }) => {
                const phone = row.getValue('phone') as string
                return (
                    <div className="text-sm">
                        {phone || (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: 'status',
            accessorFn: (person) => {
                if (!person.is_active) return 'inactive'
                return 'active'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const person = row.original
                const isActive = person.is_active

                return (
                    <Badge
                        variant="secondary"
                        className={
                            isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }
                    >
                        {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => {
                const status = row.getValue(id) as string
                return value.includes(status)
            },
        },
        {
            id: 'visibility',
            accessorFn: (person) => {
                if (person.is_public) return 'public'
                return 'private'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Visibility" />
            ),
            cell: ({ row }) => {
                const person = row.original
                const isPublic = person.is_public

                return (
                    <Badge
                        variant="secondary"
                        className={
                            isPublic
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }
                    >
                        {isPublic ? 'Public' : 'Private'}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => {
                const visibility = row.getValue(id) as string
                return value.includes(visibility)
            },
        },
        {
            id: 'created_at',
            accessorFn: (person) => person.created_at,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Created" />
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
                <PersonActions
                    person={row.original}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    totalPeople={totalPeople}
                    linkedPersonId={linkedPersonId}
                    spouseIds={spouseIds}
                    childIds={childIds}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
    ]
}

// Filter options for the toolbar
export const personStatusOptions = [
    {
        label: 'Active',
        value: 'active',
    },
    {
        label: 'Inactive',
        value: 'inactive',
    },
]

export const personVisibilityOptions = [
    {
        label: 'Public',
        value: 'public',
    },
    {
        label: 'Private',
        value: 'private',
    },
]