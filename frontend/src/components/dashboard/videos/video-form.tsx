'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import * as React from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { uploadFileApiV1StorageUploadPost } from '@/lib/api/sdk.gen'
import type {
    VideoOutFile,
    VideoOutHtml5,
    VideoOutUrl,
} from '@/lib/api/types.gen'
import { toast } from 'sonner'

type VideoType =
    | VideoOutUrl['type']
    | VideoOutHtml5['type']
    | VideoOutFile['type']

const VideoProfileSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    tags: z
        .array(z.string().min(1).max(50))
        .max(20, 'Too many tags')
        .optional()
        .nullable(),
    thumbnail_file_id: z.number().int().positive().optional().nullable(),
    duration: z.number().int().positive().optional().nullable(),
})

const VideoURLDataSchema = z.object({
    platform: z.enum(['youtube', 'vimeo']),
    url: z.string().url('Valid URL required'),
    video_id: z.string().optional().nullable(),
    embed_url: z.string().url().optional().nullable(),
})

const VideoResolutionDataSchema = z.object({
    resolution: z.string().optional().nullable(),
    width: z.number().int().positive().optional().nullable(),
    height: z.number().int().positive().optional().nullable(),
    stored_file_id: z.number().int().positive().optional().nullable(),
})

const HTML5VideoDataSchema = z.object({
    resolutions: z
        .array(VideoResolutionDataSchema)
        .min(1, 'At least one resolution required'),
})

const VideoFileDataSchema = z.object({
    stored_file_id: z.number().int().positive(),
})

const FormSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('video_url'),
        profile: VideoProfileSchema.optional().nullable(),
        data: VideoURLDataSchema,
    }),
    z.object({
        type: z.literal('html5_video'),
        profile: VideoProfileSchema.optional().nullable(),
        data: HTML5VideoDataSchema,
    }),
    z.object({
        type: z.literal('video_file'),
        profile: VideoProfileSchema.optional().nullable(),
        data: VideoFileDataSchema,
    }),
])

export type AdminVideoFormValues = z.infer<typeof FormSchema>

export interface AdminVideoFormProps {
    defaultValues?: Partial<AdminVideoFormValues>
    onSubmit: (values: AdminVideoFormValues) => Promise<void> | void
    submitLabel?: string
}

function commaSeparatedToTags(value: string): string[] | null {
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
}

function tagsToCommaSeparated(tags?: string[] | null): string {
    if (!tags || tags.length === 0) return ''
    return tags.join(', ')
}

export function AdminVideoForm({
    defaultValues,
    onSubmit,
    submitLabel = 'Save',
}: AdminVideoFormProps) {
    const { data: session } = useSession()
    const form = useForm<AdminVideoFormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            type: 'video_url',
            profile: {
                title: '',
                description: '',
                tags: null,
                thumbnail_file_id: null,
                duration: null,
            },
            data: {
                platform: 'youtube',
                url: '',
                video_id: '',
                embed_url: '',
            },
            ...defaultValues,
        } as AdminVideoFormValues,
        mode: 'onChange',
    })

    const watchType = form.watch('type')
    const [tagsText, setTagsText] = React.useState<string>(() =>
        tagsToCommaSeparated(form.getValues('profile.tags')),
    )

    // Uploader state (for video_file type)
    const [dragActive, setDragActive] = React.useState(false)
    const [uploadingFile, setUploadingFile] = React.useState(false)
    const [uploadedFilename, setUploadedFilename] = React.useState<
        string | null
    >(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const authToken = React.useMemo(() => session?.accessToken, [session])
    const baseUrl = React.useMemo(
        () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        [],
    )

    type Resolution = z.infer<typeof VideoResolutionDataSchema>
    const { fields, append, remove } = useFieldArray<
        AdminVideoFormValues,
        'data.resolutions'
    >({
        control: form.control,
        name: 'data.resolutions',
    })

    React.useEffect(() => {
        if (watchType === 'html5_video' && fields.length === 0) {
            // seed one resolution row
            const seed: Resolution = {
                resolution: '1080p',
                width: 1920,
                height: 1080,
                stored_file_id: undefined,
            }
            append(seed, { shouldFocus: false })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchType, fields.length])

    const handleSubmit = form.handleSubmit(async (values) => {
        // Normalize tagsText -> array
        if (values.profile) {
            const parsed = commaSeparatedToTags(tagsText)
            values.profile.tags = parsed
        }
        await onSubmit(values)
    })

    // --- Upload helpers for video_file ---
    const handleChooseFile = () => fileInputRef.current?.click()
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) void handleUpload(f)
    }
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        const f = e.dataTransfer.files?.[0]
        if (f) void handleUpload(f)
    }
    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('video/')) {
            toast.error('Please select a video file')
            return
        }
        if (!authToken) {
            toast.error('You must be signed in to upload files')
            return
        }
        try {
            setUploadingFile(true)
            const res = await uploadFileApiV1StorageUploadPost<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                body: { file },
                query: { category: 'videos' },
            })
            const id = res.data.id
            form.setValue('data.stored_file_id', id, {
                shouldDirty: true,
                shouldValidate: true,
            })
            setUploadedFilename(res.data.original_filename ?? file.name)
            toast.success('File uploaded')
        } catch (err) {
            console.error('Upload failed', err)
            toast.error('Upload failed')
        } finally {
            setUploadingFile(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Video Details
                            </h3>
                        </div>
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Video Type</FormLabel>
                                    <Select
                                        value={field.value as VideoType}
                                        onValueChange={field.onChange}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select video type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="video_url">
                                                URL (YouTube/Vimeo)
                                            </SelectItem>
                                            <SelectItem value="html5_video">
                                                HTML5 (Multiple Resolutions)
                                            </SelectItem>
                                            <SelectItem value="video_file">
                                                Uploaded File
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose the source type for this video.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Profile fields */}
                        <Separator />
                        <h4 className="text-sm font-medium text-muted-foreground">
                            Profile
                        </h4>
                        <FormField
                            control={form.control}
                            name="profile.title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Enter title"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="profile.description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            value={field.value ?? ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                            placeholder="Optional description"
                                            rows={4}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Tags as comma-separated input (local state) */}
                        <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                                <Input
                                    value={tagsText}
                                    onChange={(e) =>
                                        setTagsText(e.target.value)
                                    }
                                    placeholder="tag1, tag2, tag3"
                                />
                            </FormControl>
                            <FormDescription>
                                Comma-separated list of tags
                            </FormDescription>
                            <FormMessage />
                        </FormItem>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="profile.thumbnail_file_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Thumbnail File ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="numeric"
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value
                                                            ? Number(
                                                                  e.target
                                                                      .value,
                                                              )
                                                            : null,
                                                    )
                                                }
                                                placeholder="e.g. 123"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="profile.duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Duration (seconds)
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                inputMode="numeric"
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value
                                                            ? Number(
                                                                  e.target
                                                                      .value,
                                                              )
                                                            : null,
                                                    )
                                                }
                                                placeholder="e.g. 245"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Right column: Type-specific fields */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Source</h3>
                        </div>

                        {watchType === 'video_url' && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="data.platform"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Platform</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select platform" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="youtube">
                                                        YouTube
                                                    </SelectItem>
                                                    <SelectItem value="vimeo">
                                                        Vimeo
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="data.url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Video URL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="https://..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="data.video_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Video ID (optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        value={
                                                            field.value ?? ''
                                                        }
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                        ref={field.ref}
                                                        placeholder="YouTube/Vimeo ID"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="data.embed_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Embed URL (optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        value={
                                                            field.value ?? ''
                                                        }
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                        ref={field.ref}
                                                        placeholder="https://player..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {watchType === 'html5_video' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                            Resolutions
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Add one or more encodes with stored
                                            file IDs
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const seed: Resolution = {
                                                resolution: '720p',
                                                width: 1280,
                                                height: 720,
                                                stored_file_id: undefined,
                                            }
                                            append(seed)
                                        }}
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, idx) => (
                                        <div
                                            key={field.id}
                                            className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                                        >
                                            <FormField
                                                control={form.control}
                                                name={
                                                    `data.resolutions.${idx}.resolution` as const
                                                }
                                                render={({ field }) => (
                                                    <FormItem className="sm:col-span-3">
                                                        <FormLabel>
                                                            Label
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                value={
                                                                    field.value ??
                                                                    ''
                                                                }
                                                                onChange={
                                                                    field.onChange
                                                                }
                                                                onBlur={
                                                                    field.onBlur
                                                                }
                                                                name={
                                                                    field.name
                                                                }
                                                                ref={field.ref}
                                                                placeholder="1080p"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={
                                                    `data.resolutions.${idx}.width` as const
                                                }
                                                render={({ field }) => (
                                                    <FormItem className="sm:col-span-2">
                                                        <FormLabel>
                                                            Width
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                inputMode="numeric"
                                                                value={
                                                                    field.value ??
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target
                                                                            .value
                                                                            ? Number(
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                              )
                                                                            : null,
                                                                    )
                                                                }
                                                                placeholder="1920"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={
                                                    `data.resolutions.${idx}.height` as const
                                                }
                                                render={({ field }) => (
                                                    <FormItem className="sm:col-span-2">
                                                        <FormLabel>
                                                            Height
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                inputMode="numeric"
                                                                value={
                                                                    field.value ??
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target
                                                                            .value
                                                                            ? Number(
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                              )
                                                                            : null,
                                                                    )
                                                                }
                                                                placeholder="1080"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={
                                                    `data.resolutions.${idx}.stored_file_id` as const
                                                }
                                                render={({ field }) => (
                                                    <FormItem className="sm:col-span-3">
                                                        <FormLabel>
                                                            Stored File ID
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                inputMode="numeric"
                                                                value={
                                                                    field.value ??
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target
                                                                            .value
                                                                            ? Number(
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                              )
                                                                            : null,
                                                                    )
                                                                }
                                                                placeholder="e.g. 456"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex items-end sm:col-span-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => remove(idx)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {watchType === 'video_file' && (
                            <div className="space-y-4">
                                {/* Drag-and-drop uploader */}
                                <div
                                    className={
                                        `border-2 border-dashed rounded-md p-3 text-center transition-colors ` +
                                        (dragActive
                                            ? 'border-primary bg-primary/5'
                                            : 'border-muted-foreground/25 hover:border-muted-foreground/50')
                                    }
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    role="button"
                                    aria-label="Upload video file"
                                >
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Drag and drop a video file here
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        or
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleChooseFile}
                                        disabled={uploadingFile}
                                    >
                                        {uploadingFile
                                            ? 'Uploading…'
                                            : 'Choose File'}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={handleFileInputChange}
                                    />
                                    {uploadedFilename && (
                                        <p className="mt-3 text-sm">
                                            Selected:{' '}
                                            <span className="font-medium">
                                                {uploadedFilename}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="data.stored_file_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Stored File ID
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    inputMode="numeric"
                                                    value={field.value ?? ''}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value
                                                                ? Number(
                                                                      e.target
                                                                          .value,
                                                                  )
                                                                : undefined,
                                                        )
                                                    }
                                                    placeholder="e.g. 789"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Upload a new file above or link
                                                to a previously uploaded file by
                                                ID.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Button type="submit">{submitLabel}</Button>
                </div>
            </form>
        </Form>
    )
}

export default AdminVideoForm
