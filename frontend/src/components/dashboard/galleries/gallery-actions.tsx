'use client'

import { useState } from 'react'
import { Plus, Upload, Images, Settings, Download, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { GalleryFormDialog } from './gallery-form-dialog'
import { ImageSelectionDialog } from './image-selection-dialog'

// Gallery response type from our API
interface GalleryResponse {
    id: number
    title: string
    slug: string | null
    description: string | null
    is_public: boolean
    thumbnail_image_id: number | null
    user_profile_id: number
    created_at: string
    updated_at: string | null
    image_count?: number
    tag_objects?: Array<{ name: string }>
}

// Image response type from our API
interface ImageResponse {
    id: number
    title: string
    alt_text?: string
    cloudfront_url?: string
    thumbnail_sm_url?: string
    thumbnail_md_url?: string
    thumbnail_lg_url?: string
    created_at: string
}

interface GalleryActionsProps {
    gallery?: GalleryResponse
    // Callback functions for various actions
    onCreateGallery?: (data: any) => Promise<void>
    onUpdateGallery?: (gallery: GalleryResponse, data: any) => Promise<void>
    onAddImages?: (galleryId: number, imageIds: number[]) => Promise<void>
    onLoadImages?: (search?: string) => Promise<ImageResponse[]>
    // Auth and config
    authToken?: string
    isSubmitting?: boolean
}

export function GalleryActions({
    gallery,
    onCreateGallery,
    onUpdateGallery,
    onAddImages,
    onLoadImages,
    authToken,
    isSubmitting = false,
}: GalleryActionsProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showImageSelection, setShowImageSelection] = useState(false)

    const handleCreateGallery = async (data: any) => {
        if (onCreateGallery) {
            await onCreateGallery(data)
            setShowCreateDialog(false)
        }
    }

    const handleUpdateGallery = async (data: any) => {
        if (gallery && onUpdateGallery) {
            await onUpdateGallery(gallery, data)
            setShowEditDialog(false)
        }
    }

    const handleImagesSelected = async (imageIds: number[]) => {
        if (gallery && onAddImages && imageIds.length > 0) {
            await onAddImages(gallery.id, imageIds)
            setShowImageSelection(false)
        }
    }

    // If no gallery provided, show create action
    if (!gallery) {
        return (
            <>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Gallery
                </Button>

                <GalleryFormDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onSubmit={handleCreateGallery}
                    isSubmitting={isSubmitting}
                />
            </>
        )
    }

    // Gallery-specific actions
    return (
        <>
            <div className="flex items-center gap-2">
                {/* Primary Actions */}
                <Button
                    onClick={() => setShowImageSelection(true)}
                    disabled={isSubmitting}
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Images
                </Button>

                <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(true)}
                    disabled={isSubmitting}
                >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Gallery
                </Button>

                {/* More Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Images className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Gallery Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {gallery.slug && (
                            <DropdownMenuItem asChild>
                                <a
                                    href={`/galleries/${gallery.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Public Page
                                </a>
                            </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                            onClick={() => {
                                // TODO: Implement bulk download
                                console.log('Bulk download not implemented yet')
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download All Images
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                            onClick={() => setShowEditDialog(true)}
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Gallery Settings
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Dialogs */}
            <GalleryFormDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                gallery={gallery}
                onSubmit={handleUpdateGallery}
                isSubmitting={isSubmitting}
            />

            <ImageSelectionDialog
                open={showImageSelection}
                onOpenChange={setShowImageSelection}
                onImagesSelected={handleImagesSelected}
                gallerySlug={gallery.slug || undefined}
                authToken={authToken}
                onLoadImages={onLoadImages}
                maxSelection={50} // Reasonable limit for bulk operations
            />
        </>
    )
}

interface CreateGalleryButtonProps {
    onCreateGallery: (data: any) => Promise<void>
    isSubmitting?: boolean
}

export function CreateGalleryButton({
    onCreateGallery,
    isSubmitting = false,
}: CreateGalleryButtonProps) {
    const [showDialog, setShowDialog] = useState(false)

    const handleCreate = async (data: any) => {
        await onCreateGallery(data)
        setShowDialog(false)
    }

    return (
        <>
            <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Gallery
            </Button>

            <GalleryFormDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                onSubmit={handleCreate}
                isSubmitting={isSubmitting}
            />
        </>
    )
}

interface BulkActionsProps {
    selectedGalleries: GalleryResponse[]
    onBulkDelete?: (galleries: GalleryResponse[]) => Promise<void>
    onBulkPublish?: (galleries: GalleryResponse[], isPublic: boolean) => Promise<void>
    isSubmitting?: boolean
}

export function BulkActions({
    selectedGalleries,
    onBulkDelete,
    onBulkPublish,
    isSubmitting = false,
}: BulkActionsProps) {
    if (selectedGalleries.length === 0) {
        return null
    }

    const handleBulkDelete = () => {
        if (onBulkDelete && confirm(`Delete ${selectedGalleries.length} galleries?`)) {
            onBulkDelete(selectedGalleries)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
                {selectedGalleries.length} selected
            </span>
            
            {onBulkPublish && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onBulkPublish(selectedGalleries, true)}
                        disabled={isSubmitting}
                    >
                        Make Public
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onBulkPublish(selectedGalleries, false)}
                        disabled={isSubmitting}
                    >
                        Make Private
                    </Button>
                </>
            )}
            
            {onBulkDelete && (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isSubmitting}
                >
                    Delete Selected
                </Button>
            )}
        </div>
    )
}