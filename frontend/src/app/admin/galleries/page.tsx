'use client'

import { Images } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { CreateGalleryButton } from '@/components/admin/galleries/gallery-actions'
import { GalleryTable } from '@/components/admin/galleries/gallery-table'
import { GalleryFormDialog } from '@/components/admin/galleries/gallery-form-dialog'
import { SimpleGalleryDrop } from '@/components/galleries/simple-gallery-drop'
import { PageHeader } from '@/components/admin/page-header'
import {
    addImagesToGalleryApiV1GalleriesGalleryIdImagesPost,
    createGalleryApiV1GalleriesPost,
    deleteGalleryApiV1GalleriesGalleryIdDelete,
    listGalleriesApiV1GalleriesGet,
    updateGalleryApiV1GalleriesGalleryIdPut,
} from '@/lib/api/sdk.gen'
import type {
    GalleryCreate,
    GalleryResponse as ApiGalleryResponse,
} from '@/lib/api/types.gen'

// Form data type
interface GalleryFormData {
    title: string
    slug?: string
    description?: string
    tags?: string[]
    date?: string
    is_public: boolean
}

import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'

export default function AdminGalleriesPage() {
    const { data: session } = useSession()
    const [galleries, setGalleries] = useState<ApiGalleryResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [editingGallery, setEditingGallery] = useState<ApiGalleryResponse | null>(null)
    const [showEditDialog, setShowEditDialog] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Galleries', active: true },
    ])

    const authToken = session?.accessToken

    const fetchGalleries = useCallback(async () => {
        if (!authToken) return

        try {
            setLoading(true)
            const result = await listGalleriesApiV1GalleriesGet({
                headers: { Authorization: `Bearer ${authToken}` },
                query: { skip: 0, limit: 500 },
            })
            console.log('Fetched galleries from API:', result.data)
            // Log the first gallery to see if date field is included
            if (result.data && result.data.length > 0) {
                console.log('First gallery data:', result.data[0])
            }
            setGalleries(result.data || [])
        } catch (err) {
            console.error('Failed to load galleries:', err)
            toast.error('Failed to load galleries')
        } finally {
            setLoading(false)
        }
    }, [authToken])

    useEffect(() => {
        if (authToken) {
            fetchGalleries()
        }
    }, [fetchGalleries, authToken])

    const handleCreateGallery = async (data: GalleryFormData) => {
        if (!authToken) return

        try {
            setSubmitting(true)
            const galleryData: GalleryCreate = {
                title: data.title,
                slug: data.slug || undefined,
                description: data.description || undefined,
                tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
                date: data.date ? new Date(data.date + 'T00:00:00').toISOString() : null,
                is_public: data.is_public || false,
            }
            
            console.log('Creating gallery with data:', galleryData)

            await createGalleryApiV1GalleriesPost({
                headers: { Authorization: `Bearer ${authToken}` },
                body: galleryData,
            })

            toast.success('Gallery created successfully')
            fetchGalleries()
        } catch (err) {
            console.error('Failed to create gallery:', err)
            console.error('Gallery data that failed:', galleryData)
            toast.error('Failed to create gallery')
        } finally {
            setSubmitting(false)
        }
    }


    const handleDeleteGallery = async (gallery: ApiGalleryResponse) => {
        if (!authToken) return

        try {
            setSubmitting(true)
            await deleteGalleryApiV1GalleriesGalleryIdDelete({
                headers: { Authorization: `Bearer ${authToken}` },
                path: { gallery_id: gallery.id },
            })

            toast.success('Gallery deleted successfully')
            fetchGalleries()
        } catch (err) {
            console.error('Failed to delete gallery:', err)
            toast.error('Failed to delete gallery')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAddImages = async (galleryId: number, imageIds: number[]) => {
        if (!authToken) return

        try {
            setSubmitting(true)
            await addImagesToGalleryApiV1GalleriesGalleryIdImagesPost({
                headers: { Authorization: `Bearer ${authToken}` },
                path: { gallery_id: galleryId },
                body: { image_ids: imageIds },
            })

            toast.success(`Added ${imageIds.length} image(s) to gallery`)
            fetchGalleries()
        } catch (err) {
            console.error('Failed to add images to gallery:', err)
            toast.error('Failed to add images to gallery')
        } finally {
            setSubmitting(false)
        }
    }



    const handleEditGallery = (gallery: ApiGalleryResponse) => {
        // Set the editing gallery state and open edit dialog
        setEditingGallery(gallery)
        setShowEditDialog(true)
    }

    const handleUpdateGallery = async (data: GalleryFormData) => {
        if (!authToken || !editingGallery) return

        try {
            setSubmitting(true)
            const galleryData: any = {
                title: data.title,
                slug: data.slug || undefined,
                description: data.description || undefined,
                tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
                date: data.date ? new Date(data.date + 'T00:00:00').toISOString() : null,
                is_public: data.is_public || false,
            }
            
            console.log('Updating gallery with data:', galleryData)

            await updateGalleryApiV1GalleriesGalleryIdPut({
                headers: { Authorization: `Bearer ${authToken}` },
                path: { gallery_id: editingGallery.id },
                body: galleryData,
            })

            toast.success('Gallery updated successfully')
            setShowEditDialog(false)
            setEditingGallery(null)
            fetchGalleries()
        } catch (err) {
            console.error('Failed to update gallery:', err)
            console.error('Gallery data that failed:', galleryData)
            toast.error('Failed to update gallery')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <PageHeader
                title="Galleries"
                subtitle="Manage image galleries"
                icon={Images}
            >
                <CreateGalleryButton
                    onCreateGallery={handleCreateGallery}
                    isSubmitting={submitting}
                />
            </PageHeader>

            <GalleryTable
                galleries={galleries}
                loading={loading}
                onEdit={handleEditGallery}
                onDelete={handleDeleteGallery}
                onRefresh={fetchGalleries}
                onUploadComplete={handleAddImages}
            />

            <SimpleGalleryDrop onGalleryCreated={fetchGalleries} />

            {/* Edit Gallery Dialog */}
            <GalleryFormDialog
                open={showEditDialog}
                onOpenChange={(open) => {
                    setShowEditDialog(open)
                    if (!open) setEditingGallery(null)
                }}
                gallery={editingGallery}
                onSubmit={handleUpdateGallery}
                isSubmitting={submitting}
            />
        </>
    )
}
