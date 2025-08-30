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
import type { Company } from '@/lib/api/contacts.types'
import { MoreHorizontal, Trash2, Building2, Edit } from 'lucide-react'
import { useState } from 'react'

interface CompanyActionsProps {
    company: Company
    onEdit: (company: Company) => void
    onDelete: (company: Company) => void
    totalCompanies: number
}

function CompanyActions({ company, onEdit, onDelete, totalCompanies }: CompanyActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const handleDelete = () => {
        setShowDeleteDialog(false)
        onDelete(company)
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
                    <DropdownMenuItem onClick={() => onEdit(company)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit company
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete company
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
                            <strong>{company.name}</strong> and
                            remove all of their data from the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Company
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export function createCompanyColumns(
    onEdit: (company: Company) => void,
    onDelete: (company: Company) => void,
    totalCompanies: number,
): ColumnDef<Company>[] {
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
            id: 'company',
            accessorFn: (company) =>
                `${company.name} ${company.email || ''}`,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Company" />
            ),
            cell: ({ row }) => {
                const company = row.original
                const getCompanyInitials = (company: Company) => {
                    return company.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2)
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={(company as any)?.logo_url}
                                alt={company.name}
                            />
                            <AvatarFallback className="text-xs">
                                {getCompanyInitials(company)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium">
                                {company.name}
                            </span>
                            {company.email && (
                                <span className="text-xs text-muted-foreground">
                                    {company.email}
                                </span>
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
            accessorKey: 'website',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Website" />
            ),
            cell: ({ row }) => {
                const website = row.getValue('website') as string
                if (!website) {
                    return <span className="text-muted-foreground">—</span>
                }

                // Format website URL for display
                const displayUrl = website.replace(/^https?:\/\//, '').replace(/\/$/, '')
                
                return (
                    <a
                        href={website.startsWith('http') ? website : `https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {displayUrl}
                    </a>
                )
            },
            enableSorting: false,
        },
        {
            id: 'status',
            accessorFn: (company) => {
                if (!company.is_active) return 'inactive'
                return 'active'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const company = row.original
                const isActive = company.is_active

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
            accessorFn: (company) => {
                if (company.is_public) return 'public'
                return 'private'
            },
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Visibility" />
            ),
            cell: ({ row }) => {
                const company = row.original
                const isPublic = company.is_public

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
            accessorFn: (company) => company.created_at,
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
                <CompanyActions
                    company={row.original}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    totalCompanies={totalCompanies}
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
    ]
}

// Filter options for the toolbar
export const companyStatusOptions = [
    {
        label: 'Active',
        value: 'active',
    },
    {
        label: 'Inactive',
        value: 'inactive',
    },
]

export const companyVisibilityOptions = [
    {
        label: 'Public',
        value: 'public',
    },
    {
        label: 'Private',
        value: 'private',
    },
]