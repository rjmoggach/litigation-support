'use client'

import { PageHeader } from '@/components/admin/page-header'
import { Tag } from '@/components/tags/Tag'
import { TagPreview } from '@/components/tags/TagPreview'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tags, Trash2 } from 'lucide-react'
import { KeyboardEvent, useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { 
    listTagsApiV1TagsGet,
    createTagApiV1TagsPost,
    updateTagApiV1TagsTagIdPut,
    deleteTagApiV1TagsTagIdDelete
} from '@/lib/api/sdk.gen'
import { toast } from 'sonner'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'

// Simple tag interface
interface TagData {
    id: number
    name: string
    slug: string
    usage_count: number
    created_at: string
}

export default function TagsAdminPage() {
    const { data: session, status } = useSession()
    const [tags, setTags] = useState<TagData[]>([])
    const [loading, setLoading] = useState(true)
    const [newTagName, setNewTagName] = useState('')
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [editingTagId, setEditingTagId] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState('')

    const authToken = useMemo(() => session?.accessToken, [session])
    const baseUrl = useMemo(
        () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        [],
    )

    // Update breadcrumb
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Tags', active: true },
    ])

    // Load tags on mount
    useEffect(() => {
        console.log('Session status:', status)
        console.log('Session data:', session)
        if (status === 'authenticated') {
            loadTags()
        }
    }, [status])

    const loadTags = async () => {
        try {
            setLoading(true)
            const response = await listTagsApiV1TagsGet<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                query: {
                    skip: 0,
                    limit: 100,
                },
            })
            
            if (response.data?.items) {
                // Map TagResponse to Tag, providing default for usage_count
                const mappedTags = response.data.items.map(tag => ({
                    ...tag,
                    usage_count: tag.usage_count ?? 0
                }))
                setTags(mappedTags)
            }
        } catch (error) {
            console.error('Failed to load tags:', error)
            toast.error('Failed to load tags')
        } finally {
            setLoading(false)
        }
    }

    const createTag = async (name: string) => {
        if (!name.trim()) return

        const slug = name.toLowerCase().replace(/\s+/g, '-')
        
        try {
            console.log('About to call createTagApiV1TagsPost with session token')
            const response = await createTagApiV1TagsPost<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                body: {
                    name: name.trim(),
                    slug,
                },
            })
            console.log('API response:', response)

            if (response.data) {
                const newTag = {
                    ...response.data,
                    usage_count: response.data.usage_count ?? 1 // Start new tags as active
                }
                setTags((prev) => [...prev, newTag])
                setNewTagName('')
                toast.success('Tag created successfully')
            }
        } catch (error) {
            console.error('Failed to create tag:', error)
            toast.error('Failed to create tag')
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            createTag(newTagName)
        }
    }

    const handleTagClick = (tag: TagData) => {
        setSelectedTagIds((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(tag.id)) {
                newSet.delete(tag.id)
            } else {
                newSet.add(tag.id)
            }
            return newSet
        })
    }

    const handleDeleteSelected = async () => {
        try {
            const deletePromises = Array.from(selectedTagIds).map((tagId) =>
                deleteTagApiV1TagsTagIdDelete<true>({
                    baseUrl,
                    auth: authToken,
                    throwOnError: true,
                    path: { tag_id: tagId },
                })
            )
            
            await Promise.all(deletePromises)
            
            setTags((prev) => prev.filter((tag) => !selectedTagIds.has(tag.id)))
            setSelectedTagIds(new Set())
            setDeleteConfirmOpen(false)
            toast.success(`Deleted ${selectedTagIds.size} tag(s)`)
        } catch (error) {
            console.error('Failed to delete tags:', error)
            toast.error('Failed to delete some tags')
        }
    }


    const startEditingTag = (tag: TagData) => {
        setEditingTagId(tag.id)
        setEditingValue(tag.name)
    }

    const saveEditTag = async (tagId: number) => {
        if (!editingValue.trim()) {
            cancelEditTag()
            return
        }

        try {
            console.log('About to update tag with session token:', authToken ? 'Token present' : 'No token')
            const response = await updateTagApiV1TagsTagIdPut<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                path: { tag_id: tagId },
                body: {
                    name: editingValue.trim(),
                    slug: editingValue.toLowerCase().replace(/\s+/g, '-'),
                },
            })

            if (response.data) {
                const updatedTag = {
                    ...response.data,
                    usage_count: response.data.usage_count ?? 0
                }
                setTags((prev) =>
                    prev.map((t) =>
                        t.id === tagId ? updatedTag : t
                    )
                )
                setEditingTagId(null)
                setEditingValue('')
                toast.success('Tag updated successfully')
            }
        } catch (error) {
            console.error('Failed to update tag:', error)
            toast.error('Failed to update tag')
        }
    }

    const cancelEditTag = () => {
        setEditingTagId(null)
        setEditingValue('')
    }

    const handleEditKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        tagId: number,
    ) => {
        if (e.key === 'Enter') {
            saveEditTag(tagId)
        } else if (e.key === 'Escape') {
            cancelEditTag()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading tags...</div>
            </div>
        )
    }

    return (
        <>
            <PageHeader
                title="Tags"
                subtitle="Create and manage tags for organizing content"
                icon={Tags}
            >
                {selectedTagIds.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedTagIds.size})
                    </Button>
                )}
            </PageHeader>

            {/* Quick Create */}
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Create a new tag..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                        size="lg"
                    />
                </div>

                {/* Tag Cloud */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tag Cloud</CardTitle>
                        <CardDescription>
                            Click tags to select them for editing or deletion
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {tags.map((tag) => (
                                <Tag
                                    key={tag.id}
                                    tag={tag}
                                    editable={true}
                                    showCount={true}
                                    size="sm"
                                    isSelected={selectedTagIds.has(tag.id)}
                                    isEditing={editingTagId === tag.id}
                                    editingValue={editingValue}
                                    onTagClick={handleTagClick}
                                    onStartEdit={startEditingTag}
                                    onEditChange={setEditingValue}
                                    onEditKeyDown={handleEditKeyDown}
                                    onEditSave={saveEditTag}
                                />
                            ))}
                            {tags.length === 0 && (
                                <p className="text-muted-foreground italic text-sm">
                                    No tags yet. Create your first tag above!
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Tag Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tag Preview</CardTitle>
                        <CardDescription>
                            How tags appear on the site
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TagPreview tags={tags} />
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteConfirmOpen}
                    onOpenChange={setDeleteConfirmOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Tags</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete{' '}
                                {selectedTagIds.size} selected tag
                                {selectedTagIds.size === 1 ? '' : 's'}? This
                                action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteSelected}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    )
}