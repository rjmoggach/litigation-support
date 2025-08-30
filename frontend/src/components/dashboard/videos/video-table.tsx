'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { RefreshCw, Eye, Pencil, Trash2, CalendarIcon } from 'lucide-react'
import * as React from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import type { ToolbarConfig } from '@/components/data-table/flexible-data-table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
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
import type {
    VideoOutFile,
    VideoOutHtml5,
    VideoOutUrl,
} from '@/lib/api/types.gen'
type VideoResponse = VideoOutUrl | VideoOutHtml5 | VideoOutFile
type VideoType = VideoResponse['type']

function formatDuration(seconds?: number | null): string {
    if (!seconds || seconds <= 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0)
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return '—'
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
        return '—'
    }
}

function videoTypeLabel(t: VideoType): string {
    switch (t) {
        case 'video_url':
            return 'URL'
        case 'html5_video':
            return 'HTML5'
        case 'video_file':
            return 'File'
        default:
            return String(t)
    }
}

interface EditableVideoDateProps {
    video: VideoResponse
    initialDate: string | null
    onUpdate: (videoId: number, newDate: string | null) => Promise<void>
}

function EditableVideoDate({ video, initialDate, onUpdate }: EditableVideoDateProps) {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(
        initialDate ? new Date(initialDate) : undefined
    )

    const handleDateSelect = async (selectedDate: Date | undefined) => {
        setDate(selectedDate)
        const newDate = selectedDate ? selectedDate.toISOString() : null
        try {
            await onUpdate(video.id, newDate)
            setOpen(false)
        } catch (error) {
            console.error('Failed to update video date:', error)
            // Revert the date on error
            setDate(initialDate ? new Date(initialDate) : undefined)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-auto p-1 font-normal hover:bg-muted/50 justify-start",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {date ? (
                        format(date, "MMM d, yyyy")
                    ) : (
                        <span>Set date</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    captionLayout="dropdown"
                    className="rounded-lg border shadow-sm"
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

export interface AdminVideoTableProps {
    videos: VideoResponse[]
    loading?: boolean
    onRowClick?: (video: VideoResponse) => void
    onView?: (video: VideoResponse) => void
    onEdit?: (video: VideoResponse) => void
    onDelete?: (video: VideoResponse) => void
    onRefresh?: () => void
    onUpdateVideoDate?: (videoId: number, newDate: string | null) => Promise<void>
    onAutoFetchThumbnail?: (video: VideoResponse) => Promise<void>
    className?: string
}

function getColumns(
    handlers: Pick<AdminVideoTableProps, 'onView' | 'onEdit' | 'onDelete' | 'onRefresh' | 'onUpdateVideoDate' | 'onAutoFetchThumbnail'>,
): ColumnDef<VideoResponse, unknown>[] {
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
            id: 'thumbnail',
            accessorFn: (v) => v.profile?.thumbnail_cloudfront_url ?? null,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Thumbnail" />
            ),
            cell: ({ row }) => {
                const thumbnailUrl = row.getValue<string | null>('thumbnail')
                const video = row.original
                return thumbnailUrl ? (
                    <div className="w-16 h-9 bg-muted rounded overflow-hidden">
                        <img
                            src={thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    </div>
                ) : (
                    <div 
                        className={cn(
                            "w-16 h-9 bg-muted rounded flex items-center justify-center",
                            video.type === 'video_url' && handlers.onAutoFetchThumbnail && "cursor-pointer hover:bg-muted/70 transition-colors"
                        )}
                        onClick={async () => {
                            if (video.type === 'video_url' && handlers.onAutoFetchThumbnail) {
                                try {
                                    await handlers.onAutoFetchThumbnail(video)
                                } catch (error) {
                                    // Error is handled by the parent handler
                                }
                            }
                        }}
                        title={video.type === 'video_url' ? 'Click to auto-fetch thumbnail from video URL' : undefined}
                    >
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground">{video.type === 'video_url' ? '📹' : '🎬'}</div>
                            <div className="text-[10px] text-muted-foreground/70">
                                {video.type === 'video_url' ? 'Fetch thumb' : 'No thumb'}
                            </div>
                        </div>
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: 'title',
            accessorFn: (v) => v.profile?.title ?? '(untitled)',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Title" />
            ),
            cell: ({ row }) => {
                const title = row.getValue<string>('title')
                const id = row.original.id
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[420px]">
                            {title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ID: {id}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: 'type',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Type" />
            ),
            cell: ({ row }) => {
                const t = row.getValue<VideoType>('type')
                return <Badge variant="outline">{videoTypeLabel(t)}</Badge>
            },
            filterFn: (row, id, value) => {
                return value.includes(row.getValue(id))
            },
        },
        {
            id: 'slug',
            accessorFn: (v) => v.profile?.slug ?? null,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Slug" />
            ),
            cell: ({ row }) => {
                const slug = row.getValue<string | null>('slug')
                return slug ? (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {slug}
                    </code>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            },
            enableSorting: true,
        },
        {
            id: 'video_date',
            accessorFn: (v) => v.profile?.video_date ?? null,
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Video Date" />
            ),
            cell: ({ row }) => {
                const videoDate = row.getValue<string | null>('video_date')
                const video = row.original
                
                return (
                    <EditableVideoDate 
                        video={video}
                        initialDate={videoDate}
                        onUpdate={handlers.onUpdateVideoDate || (async () => {
                            throw new Error('onUpdateVideoDate handler not provided')
                        })}
                    />
                )
            },
            enableSorting: true,
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Created" />
            ),
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.getValue<string>('created_at'))}
                </span>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => {
                const video = row.original
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlers.onView?.(video)}
                        >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlers.onEdit?.(video)}
                        >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handlers.onDelete?.(video)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
    ]
}

export function AdminVideoTable({
    videos,
    loading = false,
    onRowClick,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    onUpdateVideoDate,
    onAutoFetchThumbnail,
    className,
}: AdminVideoTableProps) {
    const [deleteConfirmVideo, setDeleteConfirmVideo] = React.useState<VideoResponse | null>(null)
    
    const handleDelete = React.useCallback((video: VideoResponse) => {
        setDeleteConfirmVideo(video)
    }, [])
    
    const handleConfirmDelete = React.useCallback(() => {
        if (deleteConfirmVideo && onDelete) {
            onDelete(deleteConfirmVideo)
            setDeleteConfirmVideo(null)
        }
    }, [deleteConfirmVideo, onDelete])
    
    const columns = React.useMemo(
        () => getColumns({ onView, onEdit, onDelete: handleDelete, onRefresh, onUpdateVideoDate, onAutoFetchThumbnail }),
        [onView, onEdit, handleDelete, onRefresh, onUpdateVideoDate, onAutoFetchThumbnail],
    )

    const toolbarConfig: ToolbarConfig = React.useMemo(
        () => ({
            searchColumn: 'title',
            searchPlaceholder: 'Search videos...',
            facetedFilters: [
                {
                    column: 'type',
                    title: 'Type',
                    options: [
                        { label: 'URL', value: 'video_url' },
                        { label: 'HTML5', value: 'html5_video' },
                        { label: 'File', value: 'video_file' },
                    ],
                },
            ],
            showViewOptions: true,
            customActions: onRefresh ? (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            ) : undefined,
        }),
        [onRefresh, loading],
    )

    return (
        <>
            <FlexibleDataTable
                columns={columns}
                data={videos}
                loading={loading}
                onRowClick={onRowClick}
                toolbarConfig={toolbarConfig}
                className={className}
            />
            
            <AlertDialog open={!!deleteConfirmVideo} onOpenChange={() => setDeleteConfirmVideo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Video</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteConfirmVideo?.profile?.title || 'this video'}"? 
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
