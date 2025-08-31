'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
    CalendarIcon,
    Globe,
    Image as ImageIcon,
    Plus,
    Upload,
    X,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Video file upload schema
const videoFileSchema = z.object({
    file: z
        .any()
        .refine(
            (file) => file instanceof File && file.type.startsWith('video/'),
            'Must be a video file',
        ),
    quality: z.string().optional(),
})

const videoHtml5Schema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().optional(),
    description: z.string().optional(),
    tags: z.string().optional(),
    video_date: z.string().optional(), // ISO date string
    videoFiles: z
        .array(videoFileSchema)
        .min(1, 'At least one video file is required'),
    posterFile: z.any().optional(),
    is_active: z.boolean().default(true),
    is_public: z.boolean().default(false),
})

type VideoHtml5FormData = z.infer<typeof videoHtml5Schema>

interface VideoHtml5DialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: VideoHtml5FormData) => Promise<void>
}

const qualityOptions = [
    { value: 'none', label: 'Auto-detect' },
    { value: '2160p', label: '4K (2160p)' },
    { value: '1440p', label: '1440p' },
    { value: '1080p', label: '1080p' },
    { value: '720p', label: '720p' },
    { value: '480p', label: '480p' },
    { value: '360p', label: '360p' },
    { value: '270p', label: '270p' },
    { value: '240p', label: '240p' },
]

// Parse filename for resolution and clean title
const parseVideoFilename = (filename: string) => {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')

    // Extract resolution from filename (e.g. 1280x720, 480x270)
    const resolutionMatch = nameWithoutExt.match(/(\d+)x(\d+)/)
    let detectedQuality = 'none'

    if (resolutionMatch) {
        const height = parseInt(resolutionMatch[2])
        if (height >= 2160) detectedQuality = '2160p'
        else if (height >= 1440) detectedQuality = '1440p'
        else if (height >= 1080) detectedQuality = '1080p'
        else if (height >= 720) detectedQuality = '720p'
        else if (height >= 480) detectedQuality = '480p'
        else if (height >= 360) detectedQuality = '360p'
        else if (height >= 270) detectedQuality = '270p'
        else if (height >= 240) detectedQuality = '240p'
        else detectedQuality = `${height}p` // Custom resolution
    }

    // Clean up title: remove resolution and convert -_ to spaces
    let cleanTitle = nameWithoutExt
        .replace(/[-_]\d+x\d+$/, '') // Remove resolution suffix
        .replace(/[-_]/g, ' ') // Replace - and _ with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()

    // Capitalize first letter of each word
    cleanTitle = cleanTitle.replace(/\b\w/g, (l) => l.toUpperCase())

    return {
        cleanTitle,
        detectedQuality,
        resolution: resolutionMatch
            ? `${resolutionMatch[1]}x${resolutionMatch[2]}`
            : null,
    }
}

// Auto-detect video properties
const getVideoProperties = (
    file: File,
): Promise<{
    width: number
    height: number
    duration: number
    mimeType: string
}> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        const url = URL.createObjectURL(file)

        video.onloadedmetadata = () => {
            const width = video.videoWidth
            const height = video.videoHeight
            const duration = video.duration
            const mimeType = file.type

            URL.revokeObjectURL(url)

            resolve({ width, height, duration, mimeType })
        }

        video.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Could not load video metadata'))
        }

        video.src = url
    })
}

export function VideoHtml5Dialog({
    open,
    onOpenChange,
    onSubmit,
}: VideoHtml5DialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [posterPreview, setPosterPreview] = useState<string | null>(null)
    const [isDragOverPoster, setIsDragOverPoster] = useState(false)
    const posterInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<VideoHtml5FormData>({
        resolver: zodResolver(videoHtml5Schema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            tags: '',
            video_date: '',
            videoFiles: [],
            posterFile: null,
            is_active: true,
            is_public: false,
        },
    })

    const {
        fields: videoFields,
        append: appendVideo,
        remove: removeVideo,
    } = useFieldArray({
        control: form.control,
        name: 'videoFiles',
    })

    const handleSubmit = async (data: VideoHtml5FormData) => {
        setIsSubmitting(true)
        try {
            await onSubmit(data)
            form.reset()
            setPosterPreview(null)
            onOpenChange(false)
            toast.success('HTML5 video uploaded successfully')
        } catch (error) {
            console.error('Failed to upload HTML5 video:', error)
            toast.error('Failed to upload HTML5 video')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            onOpenChange(newOpen)
            if (!newOpen) {
                form.reset()
                setPosterPreview(null)
            }
        }
    }

    // Video file handling
    const handleVideoFiles = useCallback(
        async (files: FileList, index?: number) => {
            const validFiles = Array.from(files).filter((file) =>
                file.type.startsWith('video/'),
            )

            if (validFiles.length === 0) {
                toast.error('Please select valid video files')
                return
            }

            // Process each file
            for (const file of validFiles) {
                try {
                    // Parse filename for resolution and clean title
                    const { cleanTitle, detectedQuality } = parseVideoFilename(
                        file.name,
                    )

                    // Get video properties for more accurate quality detection
                    const properties = await getVideoProperties(file)

                    // Use detected quality from filename or properties
                    let finalQuality =
                        detectedQuality !== 'none' ? detectedQuality : 'none'
                    if (finalQuality === 'none') {
                        if (properties.height >= 2160) finalQuality = '2160p'
                        else if (properties.height >= 1440)
                            finalQuality = '1440p'
                        else if (properties.height >= 1080)
                            finalQuality = '1080p'
                        else if (properties.height >= 720) finalQuality = '720p'
                        else if (properties.height >= 480) finalQuality = '480p'
                    }

                    if (typeof index === 'number') {
                        // Replace existing file
                        form.setValue(`videoFiles.${index}.file`, file)
                        form.setValue(
                            `videoFiles.${index}.quality`,
                            finalQuality,
                        )
                    } else {
                        // Add new file
                        appendVideo({ file, quality: finalQuality })
                    }

                    // Auto-fill title if it's empty and this is the first file
                    if (videoFields.length === 0 && !form.getValues('title')) {
                        form.setValue('title', cleanTitle)
                    }
                } catch (error) {
                    console.error('Error processing video file:', error)
                    toast.error(`Could not process ${file.name}`)
                }
            }
        },
        [appendVideo, form, videoFields.length],
    )

    // Poster image handling
    const handlePosterFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file')
                return
            }

            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB')
                return
            }

            form.setValue('posterFile', file)

            const reader = new FileReader()
            reader.onload = () => setPosterPreview(reader.result as string)
            reader.readAsDataURL(file)
        },
        [form],
    )

    // Drag and drop for poster
    const handlePosterDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragOverPoster(true)
        } else if (e.type === 'dragleave') {
            setIsDragOverPoster(false)
        }
    }, [])

    const handlePosterDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOverPoster(false)

            const file = e.dataTransfer.files?.[0]
            if (file) {
                handlePosterFile(file)
            }
        },
        [handlePosterFile],
    )

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
                onWheel={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Upload Video Files
                    </DialogTitle>
                    <DialogDescription>
                        Upload multiple video files with different qualities for
                        adaptive streaming. Supports MP4, WebM, and more.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-3"
                    >
                        {/* Always show drag-drop area at top */}
                        <div className="space-y-4">
                            <FormLabel>Add Video Files</FormLabel>
                            <div
                                className="border-2 border-dashed rounded-md p-3 text-center transition-colors border-muted-foreground/25 hover:border-primary/50"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    handleVideoFiles(e.dataTransfer.files)
                                }}
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-2">
                                    Drag and drop video files here, or click to
                                    browse
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const input =
                                                document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'video/*'
                                            input.multiple = true
                                            input.onchange = (e) => {
                                                const files = (
                                                    e.target as HTMLInputElement
                                                ).files
                                                if (files)
                                                    handleVideoFiles(files)
                                            }
                                            input.click()
                                        }}
                                    >
                                        Browse Files
                                    </Button>
                                    {videoFields.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                // Remove all video files
                                                for (
                                                    let i =
                                                        videoFields.length - 1;
                                                    i >= 0;
                                                    i--
                                                ) {
                                                    removeVideo(i)
                                                }
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            Delete All
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Poster Image Section - moved to top */}
                        <div className="space-y-3">
                            <FormLabel>Poster Image (16:9)</FormLabel>
                            <div className="space-y-3">
                                {!posterPreview ? (
                                    <div
                                        className={`aspect-video border-2 border-dashed rounded-md p-3 text-center transition-colors cursor-pointer ${
                                            isDragOverPoster
                                                ? 'border-primary bg-primary/10'
                                                : 'border-muted-foreground/25 hover:border-primary/50'
                                        }`}
                                        onDragEnter={handlePosterDrag}
                                        onDragLeave={handlePosterDrag}
                                        onDragOver={handlePosterDrag}
                                        onDrop={handlePosterDrop}
                                        onClick={() =>
                                            posterInputRef.current?.click()
                                        }
                                    >
                                        <div className="flex flex-col items-center justify-center h-full gap-3">
                                            <div className="p-3 rounded-full bg-muted">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {isDragOverPoster
                                                        ? 'Drop poster image here'
                                                        : 'Drag & drop poster image here'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    or click to browse files
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                PNG, JPG, GIF up to 5MB
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video relative rounded-md overflow-hidden bg-black">
                                        <img
                                            src={posterPreview}
                                            alt="Poster preview"
                                            className="w-full h-full object-contain"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setPosterPreview(null)
                                                form.setValue(
                                                    'posterFile',
                                                    null,
                                                )
                                            }}
                                            className="absolute top-2 right-2"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={posterInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handlePosterFile(file)
                                }}
                                className="hidden"
                            />
                        </div>

                        {/* Video Metadata - moved to top */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter video title"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e)
                                                    // Auto-generate slug from title
                                                    if (
                                                        !form.getValues('slug')
                                                    ) {
                                                        const slug =
                                                            e.target.value
                                                                .toLowerCase()
                                                                .replace(
                                                                    /[^\w\s-]/g,
                                                                    '',
                                                                )
                                                                .replace(
                                                                    /\s+/g,
                                                                    '-',
                                                                )
                                                                .replace(
                                                                    /-+/g,
                                                                    '-',
                                                                )
                                                                .trim()
                                                        form.setValue(
                                                            'slug',
                                                            slug,
                                                        )
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Slug (URL-friendly identifier)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="auto-generated-from-title"
                                                {...field}
                                                onChange={(e) => {
                                                    // Sanitize slug input
                                                    const sanitized =
                                                        e.target.value
                                                            .toLowerCase()
                                                            .replace(
                                                                /[^\w\s-]/g,
                                                                '',
                                                            )
                                                            .replace(
                                                                /\s+/g,
                                                                '-',
                                                            )
                                                            .replace(/-+/g, '-')
                                                            .trim()
                                                    field.onChange(sanitized)
                                                }}
                                            />
                                        </FormControl>
                                        <div className="text-xs text-muted-foreground">
                                            Used for organizing files:
                                            /videos/slug/filename.mp4
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="tag1, tag2, tag3"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="video_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>
                                            Video Date (Optional)
                                        </FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal',
                                                            !field.value &&
                                                                'text-muted-foreground',
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(
                                                                new Date(
                                                                    field.value,
                                                                ),
                                                                'PPP',
                                                            )
                                                        ) : (
                                                            <span>
                                                                Pick a date
                                                            </span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        field.value
                                                            ? new Date(
                                                                  field.value,
                                                              )
                                                            : undefined
                                                    }
                                                    onSelect={(date) => {
                                                        field.onChange(
                                                            date
                                                                ? date
                                                                      .toISOString()
                                                                      .split(
                                                                          'T',
                                                                      )[0]
                                                                : '',
                                                        )
                                                    }}
                                                    captionLayout="dropdown"
                                                    className="rounded-md border"
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <div className="text-xs text-muted-foreground">
                                            Use for historical videos to
                                            maintain chronological order
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex gap-3">
                                <FormField
                                    control={form.control}
                                    name="is_active"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <FormLabel>Active</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="is_public"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <FormLabel>Public</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Video Files Section - moved to bottom */}
                        {videoFields.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <FormLabel>Selected Video Files</FormLabel>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            appendVideo({
                                                file: null,
                                                quality: 'none',
                                            })
                                        }
                                        className="h-8"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Video
                                    </Button>
                                </div>

                                {videoFields.map((field, index) => (
                                    <VideoFileRow
                                        key={field.id}
                                        index={index}
                                        form={form}
                                        onFileSelect={(files) =>
                                            handleVideoFiles(files, index)
                                        }
                                        onRemove={() => removeVideo(index)}
                                        canRemove={videoFields.length > 1}
                                    />
                                ))}
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting || videoFields.length === 0
                                }
                            >
                                {isSubmitting
                                    ? 'Uploading...'
                                    : 'Upload Videos'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// Individual video file row component
interface VideoFileRowProps {
    index: number
    form: any
    onFileSelect: (files: FileList) => void
    onRemove: () => void
    canRemove: boolean
}

function VideoFileRow({
    index,
    form,
    onFileSelect,
    onRemove,
    canRemove,
}: VideoFileRowProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const videoFile = form.watch(`videoFiles.${index}.file`)
    const quality = form.watch(`videoFiles.${index}.quality`)

    // Generate dynamic quality options including custom resolution
    const getQualityOptions = () => {
        const baseOptions = [...qualityOptions]

        // If quality is not in the standard list, add it as a custom option
        if (
            quality &&
            quality !== 'none' &&
            !qualityOptions.find((opt) => opt.value === quality)
        ) {
            baseOptions.push({ value: quality, label: quality.toUpperCase() })
        }

        return baseOptions
    }

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragOver(true)
        } else if (e.type === 'dragleave') {
            setIsDragOver(false)
        }
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOver(false)
            onFileSelect(e.dataTransfer.files)
        },
        [onFileSelect],
    )

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="flex items-center gap-3 p-3 border rounded-md">
            {/* Drag and Drop Area */}
            <div className="flex-1">
                {!videoFile ? (
                    <div
                        className={`border border-dashed rounded p-2 text-center transition-colors cursor-pointer ${
                            isDragOver
                                ? 'border-primary bg-primary/10'
                                : 'border-muted-foreground/25 hover:border-primary/50'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                            Drop video or click
                        </p>
                    </div>
                ) : (
                    <div className="text-sm">
                        <p className="font-medium truncate">{videoFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {videoFile.type} • {formatFileSize(videoFile.size)}
                        </p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                        if (e.target.files) onFileSelect(e.target.files)
                    }}
                    className="hidden"
                />
            </div>

            {/* Quality Select */}
            <div className="w-32">
                <FormField
                    control={form.control}
                    name={`videoFiles.${index}.quality`}
                    render={({ field }) => (
                        <FormItem>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Quality" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {getQualityOptions().map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                            className="text-xs"
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
            </div>

            {/* Remove Button */}
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="h-8 w-8 p-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
