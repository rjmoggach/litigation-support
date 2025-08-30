'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { ExternalLink, Loader2, Wand2, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { fetchVideoMetadata, isValidVideoUrl } from '@/lib/video-metadata'
import { debounce } from 'lodash-es'

const videoUrlSchema = z.object({
    url: z.string().url('Please enter a valid URL'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    tags: z.string().optional(),
    video_date: z.string().optional(),
    is_active: z.boolean().default(true),
    is_public: z.boolean().default(false),
})

type VideoUrlFormData = z.infer<typeof videoUrlSchema>

interface VideoUrlDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: VideoUrlFormData) => Promise<void>
}

export function VideoUrlDialog({ open, onOpenChange, onSubmit }: VideoUrlDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
    const [hasAutoFilled, setHasAutoFilled] = useState(false)

    const form = useForm<VideoUrlFormData>({
        resolver: zodResolver(videoUrlSchema),
        defaultValues: {
            url: '',
            title: '',
            description: '',
            tags: '',
            video_date: '',
            is_active: true,
            is_public: false,
        },
    })

    const handleSubmit = async (data: VideoUrlFormData) => {
        setIsSubmitting(true)
        try {
            await onSubmit(data)
            form.reset()
            onOpenChange(false)
            toast.success('Video URL added successfully')
        } catch (error) {
            console.error('Failed to add video URL:', error)
            toast.error('Failed to add video URL')
        } finally {
            setIsSubmitting(false)
        }
    }

    const debouncedFetchMetadata = useCallback(
        debounce(async (url: string) => {
            if (!url || !isValidVideoUrl(url) || hasAutoFilled) return
            
            setIsLoadingMetadata(true)
            try {
                const metadata = await fetchVideoMetadata(url)
                if (metadata) {
                    // Only auto-fill if fields are empty
                    if (metadata.title && !form.getValues('title')) {
                        form.setValue('title', metadata.title)
                    }
                    if (metadata.description && !form.getValues('description')) {
                        form.setValue('description', metadata.description)
                    }
                    setHasAutoFilled(true)
                    toast.success('Video information loaded automatically')
                }
            } catch (error) {
                console.error('Error fetching video metadata:', error)
                // Don't show error toast for auto-fill failures
            } finally {
                setIsLoadingMetadata(false)
            }
        }, 1000),
        [form, hasAutoFilled]
    )

    const handleManualFetch = async () => {
        const url = form.getValues('url')
        if (!url || !isValidVideoUrl(url)) {
            toast.error('Please enter a valid video URL')
            return
        }
        
        setIsLoadingMetadata(true)
        try {
            const metadata = await fetchVideoMetadata(url)
            if (metadata) {
                if (metadata.title) {
                    form.setValue('title', metadata.title)
                }
                if (metadata.description) {
                    form.setValue('description', metadata.description)
                }
                setHasAutoFilled(true)
                toast.success('Video information loaded successfully')
            } else {
                toast.error('Could not fetch video information')
            }
        } catch (error) {
            console.error('Error fetching video metadata:', error)
            toast.error('Failed to fetch video information')
        } finally {
            setIsLoadingMetadata(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            onOpenChange(newOpen)
            if (!newOpen) {
                form.reset()
                setHasAutoFilled(false)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ExternalLink className="h-5 w-5" />
                        Add Video URL
                    </DialogTitle>
                    <DialogDescription>
                        Add a video from YouTube, Vimeo, or other video platforms by URL.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Video URL</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e)
                                                    debouncedFetchMetadata(e.target.value)
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleManualFetch}
                                                disabled={isLoadingMetadata || !field.value}
                                                className="flex-shrink-0"
                                            >
                                                {isLoadingMetadata ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Wand2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Enter the full URL of the video from YouTube, Vimeo, or other supported platforms.
                                        {isLoadingMetadata && (
                                            <span className="text-primary ml-2">Loading video information...</span>
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                    <FormDescription>
                                        Comma-separated tags for categorizing the video.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                                    variant={"outline"}
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
                                    <FormDescription>
                                        Use for historical videos to maintain chronological order
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-6">
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
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
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel>Public</FormLabel>
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
                                {isSubmitting ? 'Adding...' : 'Add Video'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}