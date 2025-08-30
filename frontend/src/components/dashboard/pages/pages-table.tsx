'use client'

import { formatDistanceToNow } from 'date-fns'
import {
    Edit3,
    ExternalLink,
    Eye,
    FileText,
    Globe,
    Lock,
    MoreVertical,
    Trash2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import * as React from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import type { ToolbarConfig } from '@/components/data-table/flexible-data-table-toolbar'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

// Page response type based on backend schema
interface PageResponse {
    id: number
    title: string
    slug: string | null
    description: string | null
    content: Record<string, any> | null
    banner_image_url: string | null
    parent_id: number | null
    is_published: boolean
    is_private: boolean
    tags: string[] | null
    user_profile_id: number
    published_at: string | null
    created_at: string
    updated_at: string | null
    tag_objects: Array<{ id: number; name: string; slug: string }> | null
    url_path: string | null
    children?: PageResponse[]
    child_count?: number
}

interface PagesTableProps {
    pages: PageResponse[]
    loading?: boolean
    onView?: (page: PageResponse) => void
    onEdit?: (page: PageResponse) => void
    onDelete?: (page: PageResponse) => void
    onBulkDelete?: (pageIds: number[]) => void
    onBulkPublish?: (pageIds: number[]) => void
    onBulkUnpublish?: (pageIds: number[]) => void
    onBulkPrivacyToggle?: (pageIds: number[], isPrivate: boolean) => void
    onRefresh?: () => void
}

function formatDate(dateString: string): string {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
        return '—'
    }
}

function getIndentationLevel(
    page: PageResponse,
    allPages: PageResponse[],
): number {
    let level = 0
    let currentParentId = page.parent_id

    while (currentParentId) {
        level++
        const parent = allPages.find((p) => p.id === currentParentId)
        currentParentId = parent?.parent_id || null
    }

    return level
}

export function PagesTable({
    pages,
    loading = false,
    onView,
    onEdit,
    onDelete,
    onBulkDelete,
    onBulkPublish,
    onBulkUnpublish,
    onBulkPrivacyToggle,
    onRefresh,
}: PagesTableProps) {
    const [deletePage, setDeletePage] = React.useState<PageResponse | null>(
        null,
    )
    const { data: session } = useSession()

    const handleDelete = async (page: PageResponse) => {
        if (onDelete) {
            await onDelete(page)
            setDeletePage(null)
        }
    }

    const handleBulkAction = async (selectedRows: any[], action: string) => {
        const pageIds = selectedRows.map((row) => row.original.id)

        switch (action) {
            case 'delete':
                if (onBulkDelete) {
                    await onBulkDelete(pageIds)
                    toast.success(`Deleted ${pageIds.length} page(s)`)
                }
                break
            case 'publish':
                if (onBulkPublish) {
                    await onBulkPublish(pageIds)
                    toast.success(`Published ${pageIds.length} page(s)`)
                }
                break
            case 'unpublish':
                if (onBulkUnpublish) {
                    await onBulkUnpublish(pageIds)
                    toast.success(`Unpublished ${pageIds.length} page(s)`)
                }
                break
            case 'make-private':
                if (onBulkPrivacyToggle) {
                    await onBulkPrivacyToggle(pageIds, true)
                    toast.success(`Made ${pageIds.length} page(s) private`)
                }
                break
            case 'make-public':
                if (onBulkPrivacyToggle) {
                    await onBulkPrivacyToggle(pageIds, false)
                    toast.success(`Made ${pageIds.length} page(s) public`)
                }
                break
        }
    }

    const columns: ColumnDef<PageResponse>[] = [
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
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Title" />
            ),
            cell: ({ row }) => {
                const page = row.original
                const indentLevel = getIndentationLevel(page, pages)
                const hasChildren = (page.child_count || 0) > 0

                return (
                    <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${indentLevel * 24}px` }}
                    >
                        {indentLevel > 0 && (
                            <div className="text-muted-foreground/40">
                                {'└─ '}
                            </div>
                        )}
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <div className="font-medium truncate">
                                    {page.title}
                                </div>
                                {hasChildren && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {page.child_count} child
                                        {(page.child_count || 0) !== 1
                                            ? 'ren'
                                            : ''}
                                    </Badge>
                                )}
                            </div>
                            {page.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                    {page.description}
                                </div>
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: 'slug',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Slug" />
            ),
            cell: ({ row }) => {
                const slug = row.getValue('slug') as string | null
                const urlPath = row.original.url_path
                return slug ? (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {urlPath || slug}
                    </code>
                ) : (
                    <span className="text-muted-foreground text-xs">
                        No slug
                    </span>
                )
            },
        },
        {
            accessorKey: 'tags',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Tags" />
            ),
            cell: ({ row }) => {
                const tagObjects = row.original.tag_objects
                if (!tagObjects || tagObjects.length === 0) {
                    return (
                        <span className="text-muted-foreground text-xs">
                            No tags
                        </span>
                    )
                }

                return (
                    <div className="flex flex-wrap gap-1">
                        {tagObjects.slice(0, 3).map((tag) => (
                            <Badge
                                key={tag.id}
                                variant="secondary"
                                className="text-xs"
                            >
                                {tag.name}
                            </Badge>
                        ))}
                        {tagObjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                                +{tagObjects.length - 3}
                            </Badge>
                        )}
                    </div>
                )
            },
            filterFn: (row, id, value) => {
                const tagObjects = row.original.tag_objects || []
                return value.some((tag: string) =>
                    tagObjects.some((tagObj) =>
                        tagObj.name.toLowerCase().includes(tag.toLowerCase()),
                    ),
                )
            },
        },
        {
            accessorKey: 'is_published',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const isPublished = row.getValue('is_published') as boolean
                const isPrivate = row.original.is_private

                return (
                    <div className="flex gap-1">
                        <Badge variant={isPublished ? 'default' : 'secondary'}>
                            {isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <Badge variant={isPrivate ? 'destructive' : 'outline'}>
                            {isPrivate ? (
                                <>
                                    <Lock className="h-3 w-3 mr-1" />
                                    Private
                                </>
                            ) : (
                                <>
                                    <Globe className="h-3 w-3 mr-1" />
                                    Public
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: 'is_private',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Privacy" />
            ),
            cell: ({ row }) => {
                const isPrivate = row.getValue('is_private') as boolean
                return (
                    <Badge variant={isPrivate ? 'destructive' : 'outline'}>
                        {isPrivate ? (
                            <>
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                            </>
                        ) : (
                            <>
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                            </>
                        )}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: 'published_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Published" />
            ),
            cell: ({ row }) => {
                const publishedAt = row.getValue('published_at') as
                    | string
                    | null
                const createdAt = row.original.created_at
                const isPublished = row.original.is_published

                if (!isPublished) {
                    return (
                        <span className="text-muted-foreground text-xs">
                            Not published
                        </span>
                    )
                }

                const displayDate = publishedAt || createdAt
                return (
                    <div className="text-xs text-muted-foreground">
                        {formatDate(displayDate)}
                        {!publishedAt && (
                            <div className="text-[10px] text-muted-foreground/50">
                                (created)
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const page = row.original
                return (
                    <div className="flex items-center gap-0.5">
                        {onView && (
                            <Button
                                variant="table-action"
                                onClick={() => onView(page)}
                                title="View page"
                            >
                                <Eye className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {page.slug && page.is_published && !page.is_private && (
                            <Button
                                variant="table-action"
                                asChild
                                title="View public page"
                            >
                                <a
                                    href={
                                        page.url_path || `/pages/${page.slug}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        )}
                        <Button
                            variant="table-action"
                            asChild
                            title="Edit page"
                        >
                            <Link href={`//pages/edit/${page.id}`}>
                                <Edit3 className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="table-action"
                                    title="More actions"
                                >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {page.is_published ? (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction(
                                                [{ original: page }],
                                                'unpublish',
                                            )
                                        }
                                    >
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        Unpublish
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction(
                                                [{ original: page }],
                                                'publish',
                                            )
                                        }
                                    >
                                        <Globe className="h-4 w-4 mr-2" />
                                        Publish
                                    </DropdownMenuItem>
                                )}
                                {page.is_private ? (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction(
                                                [{ original: page }],
                                                'make-public',
                                            )
                                        }
                                    >
                                        <Globe className="h-4 w-4 mr-2" />
                                        Make Public
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleBulkAction(
                                                [{ original: page }],
                                                'make-private',
                                            )
                                        }
                                    >
                                        <Lock className="h-4 w-4 mr-2" />
                                        Make Private
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setDeletePage(page)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
    ]

    // Get unique tags for filtering
    const allTags = React.useMemo(() => {
        const tagSet = new Set<string>()
        pages.forEach((page) => {
            page.tag_objects?.forEach((tag) => tagSet.add(tag.name))
        })
        return Array.from(tagSet).sort()
    }, [pages])

    const toolbarConfig: ToolbarConfig<PageResponse> = {
        searchConfig: {
            placeholder: 'Search pages...',
            searchableColumns: ['title', 'description', 'slug'],
        },
        filterConfig: {
            facetedFilters: [
                {
                    column: 'is_published',
                    title: 'Publication Status',
                    options: [
                        { label: 'Published', value: true },
                        { label: 'Draft', value: false },
                    ],
                },
                {
                    column: 'is_private',
                    title: 'Privacy',
                    options: [
                        { label: 'Public', value: false },
                        { label: 'Private', value: true },
                    ],
                },
                ...(allTags.length > 0
                    ? [
                          {
                              column: 'tags',
                              title: 'Tags',
                              options: allTags.map((tag) => ({
                                  label: tag,
                                  value: tag,
                              })),
                          },
                      ]
                    : []),
            ],
        },
        bulkActions: [
            {
                label: 'Publish',
                action: (selectedRows) =>
                    handleBulkAction(selectedRows, 'publish'),
                icon: <Globe className="h-4 w-4" />,
            },
            {
                label: 'Unpublish',
                action: (selectedRows) =>
                    handleBulkAction(selectedRows, 'unpublish'),
                icon: <Edit3 className="h-4 w-4" />,
            },
            {
                label: 'Make Public',
                action: (selectedRows) =>
                    handleBulkAction(selectedRows, 'make-public'),
                icon: <Globe className="h-4 w-4" />,
            },
            {
                label: 'Make Private',
                action: (selectedRows) =>
                    handleBulkAction(selectedRows, 'make-private'),
                icon: <Lock className="h-4 w-4" />,
            },
            {
                label: 'Delete',
                action: (selectedRows) =>
                    handleBulkAction(selectedRows, 'delete'),
                icon: <Trash2 className="h-4 w-4" />,
                variant: 'destructive',
            },
        ],
        actionButtons: onRefresh
            ? [
                  {
                      label: 'Refresh',
                      onClick: onRefresh,
                      variant: 'outline',
                      icon: <Eye className="h-4 w-4" />,
                  },
              ]
            : undefined,
    }

    return (
        <>
            <FlexibleDataTable
                columns={columns}
                data={pages}
                loading={loading}
                toolbarConfig={toolbarConfig}
                initialColumnVisibility={{
                    is_private: false, // Hide privacy column by default since it's shown in status
                    updated_at: false,
                }}
                initialSorting={[{ id: 'published_at', desc: true }]}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={!!deletePage}
                onOpenChange={() => setDeletePage(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Page</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletePage?.title}
                            "? This action cannot be undone.
                            {deletePage?.child_count &&
                                deletePage.child_count > 0 && (
                                    <>
                                        <br />
                                        <br />
                                        This page has {
                                            deletePage.child_count
                                        }{' '}
                                        child page(s). Consider moving them to
                                        another parent before deleting.
                                    </>
                                )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() =>
                                deletePage && handleDelete(deletePage)
                            }
                        >
                            Delete Page
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
