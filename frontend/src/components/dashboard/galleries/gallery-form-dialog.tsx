'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Images } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
    FormDescription,
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
import { Switch } from '@/components/ui/switch'
import { TagsInput } from '@/components/ui/tags-input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import type { GalleryResponse } from '@/lib/api/types.gen'

const galleryFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    slug: z
        .string()
        .optional()
        .refine(
            (val) => !val || /^[a-z0-9-]+$/.test(val),
            'Slug can only contain lowercase letters, numbers, and hyphens',
        ),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    date: z.string().optional(),
    is_public: z.boolean(),
})

type GalleryFormData = z.infer<typeof galleryFormSchema>

interface GalleryFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gallery?: GalleryResponse | null
    onSubmit: (data: GalleryFormData) => Promise<void>
    isSubmitting?: boolean
}

export function GalleryFormDialog({
    open,
    onOpenChange,
    gallery,
    onSubmit,
    isSubmitting = false,
}: GalleryFormDialogProps) {
    const isEditing = !!gallery

    const form = useForm<GalleryFormData>({
        resolver: zodResolver(galleryFormSchema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            tags: [],
            date: undefined,
            is_public: false,
        },
    })

    // Reset form when gallery changes or dialog opens/closes
    useEffect(() => {
        if (open) {
            if (gallery) {
                // Editing existing gallery
                form.reset({
                    title: gallery.title,
                    slug: gallery.slug || '',
                    description: gallery.description || '',
                    tags: gallery.tag_objects?.map((tag) => tag.name) || [],
                    date: gallery.date
                        ? new Date(gallery.date).toISOString().split('T')[0]
                        : undefined,
                    is_public: gallery.is_public,
                })
            } else {
                // Creating new gallery
                form.reset({
                    title: '',
                    slug: '',
                    description: '',
                    tags: [],
                    date: undefined,
                    is_public: false,
                })
            }
        }
    }, [open, gallery, form])

    const handleSubmit = async (data: GalleryFormData) => {
        try {
            console.log('Gallery form data being submitted:', data)
            await onSubmit(data)
            onOpenChange(false)
        } catch (error) {
            // Error handling is done in parent component
            console.error('Form submission error:', error)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            onOpenChange(false)
        }
    }

    // Auto-generate slug from title
    const handleTitleChange = (value: string) => {
        const currentSlug = form.getValues('slug')
        // Only auto-generate if slug is empty or we're creating a new gallery
        if (!currentSlug || !isEditing) {
            const generatedSlug = value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
            form.setValue('slug', generatedSlug)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Images className="h-5 w-5" />
                        {isEditing ? 'Edit Gallery' : 'Create Gallery'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the gallery information below.'
                            : 'Create a new gallery to organize your images.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-3"
                    >
                        {/* Gallery Info */}
                        {isEditing && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                                <Images className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Gallery ID: {gallery?.id}
                                </span>
                                {gallery?.image_count !== undefined && (
                                    <>
                                        <span className="text-muted-foreground">
                                            •
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {gallery.image_count} image
                                            {gallery.image_count !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Title Field */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter gallery title"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e)
                                                handleTitleChange(
                                                    e.target.value,
                                                )
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Slug Field */}
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="gallery-url-slug"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        URL-friendly identifier. Leave empty to
                                        auto-generate from title.
                                    </FormDescription>
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
                                            placeholder="Enter gallery description (optional)"
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
                                            placeholder="Add tags to categorize the gallery"
                                            maxTags={10}
                                            allowCreate={true}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Type to search existing tags or create
                                        new ones. Use tags to categorize and
                                        organize your galleries.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Gallery Date Field */}
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date (Optional)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value &&
                                                            'text-muted-foreground',
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(
                                                            new Date(
                                                                field.value +
                                                                    'T00:00:00',
                                                            ),
                                                            'PPP',
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
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
                                                              field.value +
                                                                  'T00:00:00',
                                                          )
                                                        : undefined
                                                }
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const year =
                                                            date.getFullYear()
                                                        const month = String(
                                                            date.getMonth() + 1,
                                                        ).padStart(2, '0')
                                                        const day = String(
                                                            date.getDate(),
                                                        ).padStart(2, '0')
                                                        field.onChange(
                                                            `${year}-${month}-${day}`,
                                                        )
                                                    } else {
                                                        field.onChange(
                                                            undefined,
                                                        )
                                                    }
                                                }}
                                                captionLayout="dropdown"
                                                className="rounded-md border"
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        Set a specific date for this gallery to
                                        maintain chronological order or mark
                                        historical events.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Public Switch */}
                        <FormField
                            control={form.control}
                            name="is_public"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            Public Gallery
                                        </FormLabel>
                                        <FormDescription>
                                            Make this gallery visible to the
                                            public
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? 'Saving...'
                                    : isEditing
                                      ? 'Update Gallery'
                                      : 'Create Gallery'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
