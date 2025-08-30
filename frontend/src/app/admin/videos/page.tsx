'use client'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as React from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/admin/page-header'
import { AddVideoButton } from '@/components/admin/videos/add-video-button'
import { type AdminVideoFormValues } from '@/components/admin/videos/video-form'
import { AdminVideoTable } from '@/components/admin/videos/video-table'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { Film, ExternalLink, Play, CalendarIcon, ImageIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import VideoPlayer from '@/components/videos/video-player'
import type { PlayerSrc } from '@vidstack/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagsInput } from '@/components/ui/tags-input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'

import {
    createVideoApiV1VideosPost,
    deleteVideoApiV1VideosVideoIdDelete,
    listVideosApiV1VideosGet,
    updateVideoApiV1VideosVideoIdPut,
} from '@/lib/api/sdk.gen'
import { uploadFileApiV1StorageUploadPost } from '@/lib/api/sdk.gen'
import type {
    VideoCreateFile,
    VideoCreateHtml5,
    VideoCreateUrl,
    VideoOutFile,
    VideoOutHtml5,
    VideoOutUrl,
    VideoUpdate,
} from '@/lib/api/types.gen'

type VideoResponse = VideoOutUrl | VideoOutHtml5 | VideoOutFile
type CreateVideoPayload = VideoCreateUrl | VideoCreateHtml5 | VideoCreateFile

const editVideoSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    video_date: z.string().optional(),
    thumbnail: z.any().optional(), // File input
})

type EditVideoFormData = z.infer<typeof editVideoSchema>

export default function AdminVideosPage() {
    const { data: session } = useSession()
    const [videos, setVideos] = useState<VideoResponse[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [viewVideo, setViewVideo] = useState<VideoResponse | null>(null)
    const [editVideo, setEditVideo] = useState<VideoResponse | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Videos', active: true },
    ])


    const authToken = useMemo(() => session?.accessToken, [session])
    const baseUrl = useMemo(
        () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        [],
    )

    const fetchVideos = useCallback(async () => {
        try {
            setLoading(true)
            const result = await listVideosApiV1VideosGet<true>({
                baseUrl,
                throwOnError: true,
                query: { skip: 0, limit: 500 },
            })
            console.log('Fetched videos from API:', result.data)
            if (result.data && result.data.length > 0) {
                console.log('First video structure:', result.data[0])
            }
            setVideos(result.data)
        } catch (err) {
            console.error('Failed to load videos:', err)
            toast.error('Failed to load videos')
        } finally {
            setLoading(false)
        }
    }, [baseUrl])

    useEffect(() => {
        fetchVideos()
    }, [fetchVideos])

    const handleCreate = async (values: AdminVideoFormValues) => {
        if (!authToken) {
            toast.error('You must be signed in to create videos')
            return
        }
        try {
            // Build payload matching discriminated union
            let payload: CreateVideoPayload
            switch (values.type) {
                case 'video_url':
                    payload = {
                        type: 'video_url',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateUrl['data'],
                    } satisfies VideoCreateUrl
                    break
                case 'html5_video':
                    payload = {
                        type: 'html5_video',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateHtml5['data'],
                    } satisfies VideoCreateHtml5
                    break
                case 'video_file':
                    payload = {
                        type: 'video_file',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateFile['data'],
                    } satisfies VideoCreateFile
                    break
                default:
                    toast.error('Unsupported video type')
                    return
            }

            await createVideoApiV1VideosPost<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                body: payload,
            })
            toast.success('Video created')
            fetchVideos()
        } catch (err) {
            console.error('Failed to create video:', err)
            toast.error('Failed to create video')
            throw err
        }
    }

    const handleDelete = async (video: VideoResponse) => {
        if (!authToken) return
        try {
            await deleteVideoApiV1VideosVideoIdDelete<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                path: { video_id: video.id },
            })
            toast.success('Video deleted')
            fetchVideos()
        } catch (err) {
            console.error('Failed to delete video:', err)
            toast.error('Failed to delete video')
        }
    }

    const handleVideoCreated = () => {
        // Refresh the videos list after a new video is created
        fetchVideos()
    }

    const handleView = (video: VideoResponse) => {
        setViewVideo(video)
    }

    const handleEdit = (video: VideoResponse) => {
        setEditVideo(video)
    }

    const handleUpdateVideo = async (data: EditVideoFormData) => {
        if (!authToken || !editVideo) {
            toast.error('You must be signed in to update videos')
            return
        }

        setIsUpdating(true)
        try {
            // Tags are already an array from TagsInput
            const tags = data.tags && data.tags.length > 0 ? data.tags : null

            let thumbnailFileId: number | null = null

            // Upload thumbnail if provided
            if (data.thumbnail && data.thumbnail instanceof File) {
                try {
                    const videoSlug = editVideo.profile?.slug || `video-${editVideo.id}`
                    const thumbnailPath = `/videos/${videoSlug}/${data.thumbnail.name}`
                    
                    const uploadResult = await uploadFileApiV1StorageUploadPost({
                        baseUrl,
                        auth: authToken,
                        throwOnError: true,
                        body: {
                            file: data.thumbnail,
                            category: 'thumbnails',
                            slug: thumbnailPath
                        }
                    })
                    thumbnailFileId = uploadResult.data.id
                    toast.success('Thumbnail uploaded successfully')
                } catch (uploadError) {
                    console.error('Failed to upload thumbnail:', uploadError)
                    toast.error('Failed to upload thumbnail, continuing with other updates...')
                    // Continue with the update even if thumbnail upload fails
                }
            }
            
            const updatePayload: VideoUpdate = {
                profile: {
                    title: data.title,
                    description: data.description || null,
                    tags: tags,
                    ...(thumbnailFileId !== null && { thumbnail_file_id: thumbnailFileId }), // Only include if uploading new thumbnail
                    duration: null, // Keep existing duration
                    video_date: data.video_date ? new Date(data.video_date).toISOString() : null,
                },
            }
            
            console.log('Video update - sending payload:', updatePayload)

            const updateResponse = await updateVideoApiV1VideosVideoIdPut<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                path: { video_id: editVideo.id },
                body: updatePayload,
            })
            
            console.log('Video update response:', updateResponse)

            toast.success('Video updated successfully')
            setEditVideo(null)
            fetchVideos() // Refresh the list
        } catch (error) {
            console.error('Failed to update video:', error)
            toast.error('Failed to update video')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleUpdateVideoDate = async (videoId: number, newDate: string | null) => {
        if (!authToken) {
            toast.error('You must be signed in to update videos')
            throw new Error('Authentication required')
        }

        try {
            console.log('Updating video date:', { videoId, newDate })
            
            const response = await updateVideoApiV1VideosVideoIdPut<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                path: { video_id: videoId },
                body: {
                    profile: {
                        video_date: newDate
                    }
                }
            })
            
            console.log('Update response:', response)
            
            // Refresh the videos list
            fetchVideos()
            
            toast.success('Video date updated successfully')
        } catch (error) {
            console.error('Failed to update video date:', error)
            toast.error('Failed to update video date')
            throw error // Re-throw so the EditableVideoDate component can handle it
        }
    }

    const handleAutoFetchThumbnail = async (video: VideoResponse) => {
        if (!authToken) {
            toast.error('You must be signed in to auto-fetch thumbnails')
            return
        }

        if (video.type !== 'video_url') {
            return
        }

        try {
            toast.info('Fetching thumbnail from video URL...')
            
            // Call the fetch-thumbnail endpoint
            const response = await fetch(`${baseUrl}/api/v1/videos/${video.id}/fetch-thumbnail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const result = await response.json()
            
            if (result.profile?.thumbnail_file_id) {
                toast.success('Thumbnail fetched and saved successfully!')
                fetchVideos() // Refresh to show new thumbnail
            } else {
                toast.warning('Could not fetch thumbnail from this video URL')
            }
        } catch (error) {
            console.error('Failed to auto-fetch thumbnail:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            if (errorMessage.includes('already has a thumbnail')) {
                toast.warning('Video already has a thumbnail')
            } else {
                toast.error('Failed to fetch thumbnail from video URL')
            }
        }
    }

    // Convert video data to vidstack PlayerSrc format
    const getVideoPlayerSrc = (video: VideoResponse): PlayerSrc | null => {
        switch (video.type) {
            case 'video_url':
                if ('url' in video) {
                    return video.url
                }
                break
            case 'html5_video':
                if ('resolutions' in video && video.resolutions && video.resolutions.length > 0) {
                    // Use CloudFront URLs from the API response
                    const validResolutions = video.resolutions.filter(res => res.cloudfront_url)
                    if (validResolutions.length === 0) {
                        console.log('No CloudFront URLs found for video:', video.id)
                        return null
                    }
                    
                    // For HTML5 videos with multiple resolutions, vidstack can handle an array
                    // Return the first available CloudFront URL for now
                    return validResolutions[0].cloudfront_url!
                }
                break
            case 'video_file':
                if ('cloudfront_url' in video && video.cloudfront_url) {
                    return video.cloudfront_url
                }
                break
        }
        return null
    }

    return (
        <>
            <PageHeader title="Videos" subtitle="Manage videos" icon={Film}>
                <AddVideoButton onVideoCreated={handleVideoCreated} />
            </PageHeader>

            <AdminVideoTable
                videos={videos}
                loading={loading}
                onDelete={handleDelete}
                onView={handleView}
                onEdit={handleEdit}
                onRefresh={fetchVideos}
                onUpdateVideoDate={handleUpdateVideoDate}
                onAutoFetchThumbnail={handleAutoFetchThumbnail}
            />

            {/* View Video Dialog */}
            <Dialog open={!!viewVideo} onOpenChange={() => setViewVideo(null)}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5" />
                            {viewVideo?.profile?.title || 'Video Preview'}
                        </DialogTitle>
                        <DialogDescription>
                            Video player with metadata and technical details
                        </DialogDescription>
                    </DialogHeader>
                    {viewVideo && (
                        <div className="space-y-6">
                            {/* Video Player */}
                            {(() => {
                                const playerSrc = getVideoPlayerSrc(viewVideo)
                                return playerSrc ? (
                                    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                                        <VideoPlayer
                                            key={`video-preview-${viewVideo.id}`}
                                            src={playerSrc}
                                            title={viewVideo.profile?.title || 'Video'}
                                            poster={viewVideo.profile?.thumbnail_file_id ? 
                                                `/api/v1/storage/files/${viewVideo.profile.thumbnail_file_id}` : 
                                                undefined
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                            <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>Video preview not available</p>
                                            <p className="text-sm">Player not supported for this video type</p>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Video Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column - Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Video Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{viewVideo.type.replace('_', ' ').toUpperCase()}</Badge>
                                                <span className="text-sm text-muted-foreground">ID: {viewVideo.id}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium">Title:</span>
                                                <p className="text-sm">{viewVideo.profile?.title || 'Untitled'}</p>
                                            </div>
                                            {viewVideo.profile?.description && (
                                                <div>
                                                    <span className="text-sm font-medium">Description:</span>
                                                    <p className="text-sm text-muted-foreground">{viewVideo.profile.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {viewVideo.profile?.tags && viewVideo.profile.tags.length > 0 && (
                                        <div>
                                            <span className="text-sm font-medium">Tags:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {viewVideo.profile.tags.map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column - Technical Details */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Technical Details</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Created:</span>
                                                <span>{new Date(viewVideo.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {viewVideo.updated_at && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Updated:</span>
                                                    <span>{new Date(viewVideo.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {viewVideo.profile?.duration && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Duration:</span>
                                                    <span>{Math.floor(viewVideo.profile.duration / 60)}:{(viewVideo.profile.duration % 60).toString().padStart(2, '0')}</span>
                                                </div>
                                            )}
                                            {viewVideo.profile?.view_count !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Views:</span>
                                                    <span>{viewVideo.profile.view_count.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Platform-specific details */}
                                    {viewVideo.type === 'video_url' && 'url' in viewVideo && (
                                        <div>
                                            <span className="text-sm font-medium">Source URL:</span>
                                            <div className="mt-1">
                                                <a 
                                                    href={viewVideo.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
                                                >
                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                    {viewVideo.url}
                                                </a>
                                                {'platform' in viewVideo && (
                                                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                                                        Platform: {viewVideo.platform}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewVideo(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Video Dialog */}
            {editVideo && (
                <EditVideoDialog
                    video={editVideo}
                    open={!!editVideo}
                    onOpenChange={() => setEditVideo(null)}
                    onSubmit={handleUpdateVideo}
                    isSubmitting={isUpdating}
                />
            )}
        </>
    )
}

// Edit Video Dialog Component
interface EditVideoDialogProps {
    video: VideoResponse
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: EditVideoFormData) => Promise<void>
    isSubmitting: boolean
}

function EditVideoDialog({ video, open, onOpenChange, onSubmit, isSubmitting }: EditVideoDialogProps) {
    const [thumbnailPreview, setThumbnailPreview] = React.useState<string | null>(null)
    
    const form = useForm<EditVideoFormData>({
        resolver: zodResolver(editVideoSchema),
        defaultValues: {
            title: video.profile?.title || '',
            description: video.profile?.description || '',
            tags: [],
            video_date: video.profile?.video_date ? new Date(video.profile.video_date).toISOString().split('T')[0] : '',
            thumbnail: null,
        },
    })

    const handleSubmit = async (data: EditVideoFormData) => {
        try {
            await onSubmit(data)
            // Dialog will be closed by parent component on success
        } catch (error) {
            // Error handling is done in parent component
        }
    }

    const handleThumbnailChange = (file: File | null) => {
        if (file) {
            const reader = new FileReader()
            reader.onload = () => setThumbnailPreview(reader.result as string)
            reader.readAsDataURL(file)
            form.setValue('thumbnail', file)
        } else {
            setThumbnailPreview(null)
            form.setValue('thumbnail', null)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            onOpenChange(newOpen)
            if (!newOpen) {
                form.reset()
                setThumbnailPreview(null)
            }
        }
    }

    // Reset form when video changes
    React.useEffect(() => {
        if (video) {
            // Extract tags - check video root first (like galleries), then profile
            let tagsArray: string[] = []
            
            // Type assertion to access tag_objects (videos should have same structure as galleries)
            const videoWithTags = video as any
            
            console.log('Video edit form - full video structure:', videoWithTags)
            
            if (videoWithTags.tag_objects && Array.isArray(videoWithTags.tag_objects)) {
                // Tags at root level like galleries
                tagsArray = videoWithTags.tag_objects.map((tag: any) => tag.name)
                console.log('Video edit form - found tags at root level:', tagsArray)
            } else if (videoWithTags.profile?.tag_objects && Array.isArray(videoWithTags.profile.tag_objects)) {
                // Tags in profile with objects
                tagsArray = videoWithTags.profile.tag_objects.map((tag: any) => tag.name)
                console.log('Video edit form - found tags in profile.tag_objects:', tagsArray)
            } else if (videoWithTags.profile?.tags && Array.isArray(videoWithTags.profile.tags)) {
                // Tags in profile as string array
                tagsArray = videoWithTags.profile.tags
                console.log('Video edit form - found tags in profile.tags:', tagsArray)
            } else {
                console.log('Video edit form - no tags found in any location')
                console.log('Video edit form - profile structure:', videoWithTags.profile)
            }
            
            console.log('Video edit form - extracted tags:', tagsArray)
            
            form.reset({
                title: video.profile?.title || '',
                description: video.profile?.description || '',
                tags: tagsArray,
                video_date: video.profile?.video_date ? new Date(video.profile.video_date).toISOString().split('T')[0] : '',
                thumbnail: null,
            })
            setThumbnailPreview(null)
        }
    }, [video, form])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        Edit Video
                    </DialogTitle>
                    <DialogDescription>
                        Update the video metadata. Changes will be saved to your video library.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="space-y-4">
                            {/* Video Info */}
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                <Badge variant="outline">{video.type.replace('_', ' ').toUpperCase()}</Badge>
                                <span className="text-sm text-muted-foreground">ID: {video.id}</span>
                            </div>

                            {/* Title Field */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter video title" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description Field */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter video description (optional)"
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Tags Field */}
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <TagsInput
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                placeholder="Add tags to categorize the video"
                                                maxTags={10}
                                                allowCreate={true}
                                            />
                                        </FormControl>
                                        <div className="text-xs text-muted-foreground">
                                            Type to search existing tags or create new ones. Use tags to categorize and organize your videos.
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Video Date Field */}
                            <FormField
                                control={form.control}
                                name="video_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Video Date (Optional)</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => {
                                                        field.onChange(date ? date.toISOString().split('T')[0] : '')
                                                    }}
                                                    captionLayout="dropdown"
                                                    className="rounded-md border"
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <div className="text-xs text-muted-foreground">
                                            Use for historical videos to maintain chronological order
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Thumbnail Upload Field */}
                            <FormField
                                control={form.control}
                                name="thumbnail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thumbnail Image (16:9)</FormLabel>
                                        <FormControl>
                                            <div className="space-y-4">
                                                {/* Current Thumbnail Preview */}
                                                {video.profile?.thumbnail_cloudfront_url && !thumbnailPreview && (
                                                    <div className="space-y-2">
                                                        <div className="text-sm text-muted-foreground">Current thumbnail:</div>
                                                        <div className="aspect-video max-w-xs bg-black rounded-lg overflow-hidden">
                                                            <img
                                                                src={video.profile.thumbnail_cloudfront_url}
                                                                alt="Current thumbnail"
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* New Thumbnail Preview */}
                                                {thumbnailPreview && (
                                                    <div className="space-y-2">
                                                        <div className="text-sm text-muted-foreground">New thumbnail:</div>
                                                        <div className="aspect-video max-w-xs bg-black rounded-lg overflow-hidden relative">
                                                            <img
                                                                src={thumbnailPreview}
                                                                alt="New thumbnail preview"
                                                                className="w-full h-full object-contain"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleThumbnailChange(null)}
                                                                className="absolute top-2 right-2"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* File Upload Area */}
                                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {thumbnailPreview || video.profile?.thumbnail_cloudfront_url 
                                                            ? 'Upload new thumbnail' 
                                                            : 'Upload thumbnail'}
                                                    </p>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) {
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    toast.error('Image size must be less than 5MB')
                                                                    return
                                                                }
                                                                handleThumbnailChange(file)
                                                            }
                                                        }}
                                                        className="hidden"
                                                        id="thumbnail-upload"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => document.getElementById('thumbnail-upload')?.click()}
                                                    >
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Choose Image
                                                    </Button>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        PNG, JPG, GIF up to 5MB
                                                    </p>
                                                </div>
                                            </div>
                                        </FormControl>
                                        <div className="text-xs text-muted-foreground">
                                            Uploaded to: /videos/{video.profile?.slug || `video-${video.id}`}/
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
