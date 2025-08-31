'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Image as ImageIcon, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TagsInput } from '@/components/ui/tags-input'
import { Textarea } from '@/components/ui/textarea'
import { uploadFileApiV1StorageUploadPost } from '@/lib/api/sdk.gen'

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

const pageFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    slug: z
        .string()
        .optional()
        .refine(
            (val) => !val || /^[a-z0-9-]+$/.test(val),
            'Slug can only contain lowercase letters, numbers, and hyphens',
        ),
    description: z.string().max(1000, 'Description too long').optional(),
    content: z.any().optional(), // BlockNote.js content as JSON
    banner_image_url: z.string().optional(),
    parent_id: z.number().optional(),
    tags: z.array(z.string()).optional(),
    is_published: z.boolean(),
    is_private: z.boolean(),
})

type PageFormData = z.infer<typeof pageFormSchema>

interface PageFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    page?: PageResponse | null
    availablePages?: PageResponse[] // For parent page selection
    onSubmit: (data: PageFormData) => Promise<void>
    isSubmitting?: boolean
    authToken?: string
}

export function PageFormDialog({
    open,
    onOpenChange,
    page,
    availablePages = [],
    onSubmit,
    isSubmitting = false,
    authToken,
}: PageFormDialogProps) {
    const isEditing = !!page
    const [bannerUploadStatus, setBannerUploadStatus] = useState<
        'idle' | 'uploading' | 'success' | 'error'
    >('idle')
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const form = useForm<PageFormData>({
        resolver: zodResolver(pageFormSchema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            content: null,
            banner_image_url: '',
            parent_id: undefined,
            tags: [],
            is_published: false,
            is_private: false,
        },
    })

    // Reset form when page changes or dialog opens/closes
    useEffect(() => {
        if (open) {
            if (page) {
                // Editing existing page
                form.reset({
                    title: page.title,
                    slug: page.slug || '',
                    description: page.description || '',
                    content: page.content,
                    banner_image_url: page.banner_image_url || '',
                    parent_id: page.parent_id || undefined,
                    tags: page.tag_objects?.map((tag) => tag.name) || [],
                    is_published: page.is_published,
                    is_private: page.is_private,
                })
            } else {
                // Creating new page
                form.reset({
                    title: '',
                    slug: '',
                    description: '',
                    content: null,
                    banner_image_url: '',
                    parent_id: undefined,
                    tags: [],
                    is_published: false,
                    is_private: false,
                })
            }
        }
    }, [open, page, form])

    const handleSubmit = async (data: PageFormData) => {
        try {
            console.log('Page form data being submitted:', data)
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
        // Only auto-generate if slug is empty or we're creating a new page
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

    // Filter available pages to prevent circular references
    const getValidParentPages = () => {
        if (!availablePages || availablePages.length === 0) return []

        if (!isEditing) {
            // When creating, all pages are valid parents
            return availablePages.filter((p) => p.id !== page?.id)
        }

        // When editing, need to prevent circular references
        const currentPageId = page?.id
        if (!currentPageId) return availablePages

        // Recursively find all descendant page IDs
        const getDescendantIds = (
            pageId: number,
            pages: PageResponse[],
        ): number[] => {
            const descendantIds: number[] = []
            for (const p of pages) {
                if (p.parent_id === pageId) {
                    descendantIds.push(p.id)
                    // Recursively get descendants of this child
                    descendantIds.push(...getDescendantIds(p.id, pages))
                }
            }
            return descendantIds
        }

        const descendantIds = getDescendantIds(currentPageId, availablePages)

        // Filter out current page and all its descendants
        return availablePages.filter(
            (p) => p.id !== currentPageId && !descendantIds.includes(p.id),
        )
    }

    const validParentPages = getValidParentPages()

    // Handle banner image upload
    const handleBannerUpload = async (file: File) => {
        if (!authToken) {
            toast.error('Authentication required for file upload')
            return
        }

        setBannerUploadStatus('uploading')

        try {
            const response = await uploadFileApiV1StorageUploadPost<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                body: { file },
                query: {
                    category: 'images',
                },
            })

            if (response.data?.url) {
                form.setValue('banner_image_url', response.data.url)
                setBannerUploadStatus('success')
                toast.success('Banner image uploaded successfully')
            }
        } catch (error) {
            setBannerUploadStatus('error')
            const errorMessage =
                error instanceof Error ? error.message : 'Upload failed'
            toast.error(`Failed to upload banner image: ${errorMessage}`)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file')
                return
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Image size must be less than 10MB')
                return
            }

            handleBannerUpload(file)
        }
    }

    const removeBannerImage = () => {
        form.setValue('banner_image_url', '')
        setBannerUploadStatus('idle')
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {isEditing ? 'Edit Page' : 'Create Page'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the page information below.'
                            : 'Create a new page with content and metadata.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-3"
                    >
                        {/* Page Info */}
                        {isEditing && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Page ID: {page?.id}
                                </span>
                                {page?.child_count !== undefined &&
                                    page.child_count > 0 && (
                                        <>
                                            <span className="text-muted-foreground">
                                                •
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {page.child_count} child page
                                                {page.child_count !== 1
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
                                            placeholder="Enter page title"
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
                                            placeholder="page-url-slug"
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
                                            placeholder="Enter page description (optional)"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Brief summary for SEO and page listings
                                        (max 1000 characters).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Parent Page Selection */}
                        <FormField
                            control={form.control}
                            name="parent_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Parent Page</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                            field.onChange(
                                                value === 'none'
                                                    ? undefined
                                                    : parseInt(value),
                                            )
                                        }
                                        value={
                                            field.value?.toString() || 'none'
                                        }
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select parent page (optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                No parent (root level)
                                            </SelectItem>
                                            {validParentPages.map(
                                                (parentPage) => (
                                                    <SelectItem
                                                        key={parentPage.id}
                                                        value={parentPage.id.toString()}
                                                    >
                                                        {parentPage.title}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose a parent page to create a
                                        hierarchical structure. Circular
                                        references are prevented.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Banner Image Upload */}
                        <FormField
                            control={form.control}
                            name="banner_image_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Banner Image</FormLabel>
                                    <FormControl>
                                        <div className="space-y-2">
                                            {field.value ? (
                                                <div className="relative">
                                                    <img
                                                        src={field.value}
                                                        alt="Banner preview"
                                                        className="w-full h-32 object-cover rounded-md border"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute top-2 right-2"
                                                        onClick={
                                                            removeBannerImage
                                                        }
                                                        disabled={
                                                            bannerUploadStatus ===
                                                            'uploading'
                                                        }
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <ImageIcon className="h-8 w-8 mb-2 text-muted-foreground" />
                                                        <p className="mb-2 text-sm text-muted-foreground">
                                                            {bannerUploadStatus ===
                                                            'uploading' ? (
                                                                'Uploading...'
                                                            ) : (
                                                                <>
                                                                    <span className="font-semibold">
                                                                        Click to
                                                                        upload
                                                                    </span>{' '}
                                                                    or drag and
                                                                    drop
                                                                </>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            PNG, JPG up to 10MB
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={
                                                            handleFileSelect
                                                        }
                                                        disabled={
                                                            bannerUploadStatus ===
                                                            'uploading'
                                                        }
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Upload a banner image for the page
                                        header (optional).
                                    </FormDescription>
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
                                            placeholder="Add tags to categorize the page"
                                            maxTags={10}
                                            allowCreate={true}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Type to search existing tags or create
                                        new ones. Use tags to categorize and
                                        organize your pages.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Publishing Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Published Switch */}
                            <FormField
                                control={form.control}
                                name="is_published"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Published
                                            </FormLabel>
                                            <FormDescription>
                                                Make this page live and
                                                accessible
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

                            {/* Private Switch */}
                            <FormField
                                control={form.control}
                                name="is_private"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">
                                                Private
                                            </FormLabel>
                                            <FormDescription>
                                                Require authentication to view
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
                        </div>

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
                                      ? 'Update Page'
                                      : 'Create Page'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
