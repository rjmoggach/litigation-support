'use client'

import { formatDistanceToNow } from 'date-fns'
import { Eye, Pencil, Trash2, Images, ExternalLink, Upload, Link, RefreshCw } from 'lucide-react'
import { useSession } from 'next-auth/react'
import * as React from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import type { ToolbarConfig } from '@/components/data-table/flexible-data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { SimpleUpload } from '@/components/galleries/simple-upload'
import { GalleryViewDialog } from '@/components/admin/galleries/gallery-view-dialog'
import { toast } from 'sonner'

import type { GalleryResponse as ApiGalleryResponse } from '@/lib/api/types.gen'

// Extended gallery response type for table display
interface GalleryResponse extends Omit<ApiGalleryResponse, 'image_count'> {
    thumbnail_url?: string | null  // Add thumbnail URL for display
    image_count?: number | null  // Allow null like the API
    date?: string | null  // Add date field for sorting/display
}

interface GalleryTableProps {
    galleries: GalleryResponse[]
    loading?: boolean
    onView?: (gallery: GalleryResponse) => void
    onEdit?: (gallery: GalleryResponse) => void
    onDelete?: (gallery: GalleryResponse) => void
    onRefresh?: () => void
    onUploadComplete?: (galleryId: number, fileIds: number[]) => void
}

function formatDate(dateString: string): string {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
        return '—'
    }
}

export function GalleryTable({
    galleries,
    loading = false,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    onUploadComplete,
}: GalleryTableProps) {
    const [deleteGallery, setDeleteGallery] = React.useState<GalleryResponse | null>(null)
    const [uploadGallery, setUploadGallery] = React.useState<GalleryResponse | null>(null)
    const [viewGallery, setViewGallery] = React.useState<GalleryResponse | null>(null)
    const [regeneratingThumbnails, setRegeneratingThumbnails] = React.useState<number | null>(null)
    const { data: session } = useSession()

    const handleDelete = async (gallery: GalleryResponse) => {
        if (onDelete) {
            await onDelete(gallery)
            setDeleteGallery(null)
        }
    }

    const handleUploadComplete = (fileIds: number[]) => {
        if (uploadGallery && onUploadComplete) {
            onUploadComplete(uploadGallery.id, fileIds)
            setUploadGallery(null)
            toast.success(`Added ${fileIds.length} image(s) to gallery`)
        }
    }

    const handleRegenerateThumbnails = async (gallery: GalleryResponse) => {
        if (!session?.accessToken) return

        setRegeneratingThumbnails(gallery.id)
        
        try {
            // Get gallery with images to regenerate thumbnails for each image
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/galleries/${gallery.id}?include_images=true`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) throw new Error('Failed to fetch gallery images')
            
            const galleryWithImages = await response.json()
            const images = galleryWithImages.images || []

            if (images.length === 0) {
                toast.info('No images in gallery to regenerate thumbnails for')
                return
            }

            // Regenerate thumbnails for each image
            let successCount = 0
            for (const image of images) {
                try {
                    const regenerateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/images/${image.id}/regenerate-thumbnails`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    })

                    if (regenerateResponse.ok) {
                        successCount++
                    }
                } catch (error) {
                    console.error(`Failed to regenerate thumbnails for image ${image.id}:`, error)
                }
            }

            if (successCount > 0) {
                toast.success(`Regenerated thumbnails for ${successCount} image(s)`)
                onRefresh?.() // Refresh the gallery list to show updated thumbnails
            } else {
                toast.error('Failed to regenerate thumbnails')
            }

        } catch (error) {
            console.error('Failed to regenerate thumbnails:', error)
            toast.error('Failed to regenerate thumbnails')
        } finally {
            setRegeneratingThumbnails(null)
        }
    }

    const columns: ColumnDef<GalleryResponse>[] = [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
            id: 'thumbnail',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Thumbnail" />
            ),
            cell: ({ row }) => {
                const gallery = row.original
                const thumbnailUrl = gallery.thumbnail_url
                const isRegenerating = regeneratingThumbnails === gallery.id
                
                return thumbnailUrl ? (
                    <div 
                        className="w-16 h-12 bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => setViewGallery(gallery)}
                        title="Click to view gallery images"
                    >
                        <img
                            src={thumbnailUrl}
                            alt={`${gallery.title} thumbnail`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                ) : (
                    <div 
                        className="w-16 h-12 bg-muted rounded flex items-center justify-center cursor-pointer hover:bg-muted/80 hover:ring-2 hover:ring-primary/50 transition-all"
                        onClick={() => handleRegenerateThumbnails(gallery)}
                        title="Click to generate thumbnails"
                    >
                        {isRegenerating ? (
                            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                            <div className="text-center">
                                <Images className="h-4 w-4 text-muted-foreground mx-auto" />
                                <div className="text-[10px] text-muted-foreground/70">
                                    No thumb
                                </div>
                            </div>
                        )}
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            accessorKey: 'title',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Title" />
            ),
            cell: ({ row }) => {
                const gallery = row.original
                return (
                    <div className="flex items-center gap-2">
                        <Images className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <div className="font-medium">{gallery.title}</div>
                            {gallery.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                    {gallery.description}
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
                return slug ? (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {slug}
                    </code>
                ) : (
                    <span className="text-muted-foreground text-xs">No slug</span>
                )
            },
        },
        {
            accessorKey: 'image_count',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Images" />
            ),
            cell: ({ row }) => {
                const count = row.getValue('image_count') as number | null | undefined
                const displayCount = count || 0
                return (
                    <div className="text-xs text-muted-foreground">
                        {displayCount} image{displayCount !== 1 ? 's' : ''}
                    </div>
                )
            },
        },
        {
            accessorKey: 'is_public',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            cell: ({ row }) => {
                const isPublic = row.getValue('is_public') as boolean
                return (
                    <Badge variant={isPublic ? 'default' : 'secondary'}>
                        {isPublic ? 'Public' : 'Private'}
                    </Badge>
                )
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            accessorKey: 'date',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date" />
            ),
            cell: ({ row }) => {
                const date = row.getValue('date') as string | null
                const createdAt = row.original.created_at
                const displayDate = date || createdAt
                return (
                    <div className="text-xs text-muted-foreground">
                        {formatDate(displayDate)}
                        {!date && (
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
                const gallery = row.original
                return (
                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="table-action"
                            onClick={() => setUploadGallery(gallery)}
                            title="Add images to gallery"
                        >
                            <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="table-action"
                            onClick={() => setViewGallery(gallery)}
                            title="View gallery images"
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {gallery.slug && (
                            <Button
                                variant="table-action"
                                asChild
                                title="View public page"
                            >
                                <a 
                                    href={`/galleries/${gallery.slug}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
                                >
                                    <Link className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        )}
                        {onEdit && (
                            <Button
                                variant="table-action"
                                onClick={() => onEdit(gallery)}
                                title="Edit gallery"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="table-action"
                                onClick={() => setDeleteGallery(gallery)}
                                title="Delete gallery"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
    ]

    const toolbarConfig: ToolbarConfig<GalleryResponse> = {
        searchConfig: {
            placeholder: 'Search galleries...',
            searchableColumns: ['title', 'description', 'slug'],
        },
        filterConfig: {
            facetedFilters: [
                {
                    column: 'is_public',
                    title: 'Status',
                    options: [
                        { label: 'Public', value: true },
                        { label: 'Private', value: false },
                    ],
                },
            ],
        },
        actionButtons: onRefresh ? [
            {
                label: 'Refresh',
                onClick: onRefresh,
                variant: 'outline',
                icon: <Eye className="h-4 w-4" />,
            },
        ] : undefined,
    }

    return (
        <>
            <FlexibleDataTable
                columns={columns}
                data={galleries}
                loading={loading}
                toolbarConfig={toolbarConfig}
                initialColumnVisibility={{
                    updated_at: false,
                }}
                initialSorting={[{ id: 'date', desc: true }]}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteGallery} onOpenChange={() => setDeleteGallery(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Gallery</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteGallery?.title}"? 
                            This action cannot be undone.
                            {deleteGallery?.image_count && deleteGallery.image_count > 0 && (
                                <><br /><br />This gallery contains {deleteGallery.image_count} image(s). 
                                The images themselves will not be deleted.</>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => deleteGallery && handleDelete(deleteGallery)}
                        >
                            Delete Gallery
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Upload Images Dialog */}
            <Dialog open={!!uploadGallery} onOpenChange={() => setUploadGallery(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Add Images to Gallery</DialogTitle>
                        <DialogDescription>
                            Upload images to "{uploadGallery?.title}" gallery. 
                            Images will be automatically added to the gallery.
                        </DialogDescription>
                    </DialogHeader>
                    {uploadGallery && (
                        <SimpleUpload
                            onUploadComplete={handleUploadComplete}
                            onUploadError={(error) => toast.error(`Upload failed: ${error}`)}
                            gallerySlug={uploadGallery.slug || undefined}
                            authToken={session?.accessToken || undefined}
                            multiple={true}
                            maxFiles={20}
                            maxFileSize={10}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Gallery View Dialog */}
            <GalleryViewDialog
                open={!!viewGallery}
                onOpenChange={() => setViewGallery(null)}
                gallery={viewGallery}
                authToken={session?.accessToken}
            />
        </>
    )
}