'use client'

import { useEffect, useState } from 'react'
import { Images, ExternalLink } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageDetailDialog } from '@/components/galleries/image-detail-dialog'
import { getGalleryApiV1GalleriesGalleryIdGet } from '@/lib/api/sdk.gen'
import type { GalleryResponse } from '@/lib/api/types.gen'

interface ImageResponse {
    id: number
    title: string
    alt_text?: string
    description?: string
    cloudfront_url?: string
    thumbnail_sm_url?: string
    thumbnail_md_url?: string
    thumbnail_lg_url?: string
    width?: number
    height?: number
    created_at: string
    tag_objects?: Array<{ name: string }>
}

interface GalleryViewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gallery: GalleryResponse | null
    authToken?: string
}

export function GalleryViewDialog({
    open,
    onOpenChange,
    gallery,
    authToken,
}: GalleryViewDialogProps) {
    const [galleryWithImages, setGalleryWithImages] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

    useEffect(() => {
        const fetchGalleryWithImages = async () => {
            if (!gallery || !authToken || !open) return

            setLoading(true)
            try {
                const result = await getGalleryApiV1GalleriesGalleryIdGet({
                    headers: { Authorization: `Bearer ${authToken}` },
                    path: { gallery_id: gallery.id },
                    query: { include_images: true },
                })
                setGalleryWithImages(result.data)
            } catch (error) {
                console.error('Failed to fetch gallery with images:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchGalleryWithImages()
    }, [gallery, authToken, open])

    const handleOpenPublicPage = () => {
        if (gallery?.slug) {
            window.open(`/galleries/${gallery.slug}`, '_blank')
        }
    }

    if (!gallery) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Images className="h-5 w-5" />
                            <DialogTitle>{gallery.title}</DialogTitle>
                            {gallery.is_public && <Badge>Public</Badge>}
                        </div>
                        {gallery.slug && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenPublicPage}
                                className="flex items-center gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                View Public Page
                            </Button>
                        )}
                    </div>
                    <DialogDescription>
                        {gallery.description || 'No description provided'}
                        {gallery.image_count !== undefined && (
                            <span className="ml-2">• {gallery.image_count} images</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <Images className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Loading images...</p>
                            </div>
                        </div>
                    ) : galleryWithImages?.images?.length > 0 ? (
                        <div className="grid grid-cols-6 gap-2 p-4">
                            {galleryWithImages.images.map((image: ImageResponse, index: number) => (
                                <div
                                    key={image.id}
                                    className="aspect-square bg-muted rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    {image.thumbnail_md_url || image.cloudfront_url ? (
                                        <img
                                            src={image.thumbnail_md_url || image.cloudfront_url}
                                            alt={image.alt_text || image.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Images className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <Images className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No images in this gallery</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Image Detail Dialog */}
                {galleryWithImages?.images && selectedImageIndex !== null && (
                    <ImageDetailDialog
                        open={selectedImageIndex !== null}
                        onOpenChange={() => setSelectedImageIndex(null)}
                        images={galleryWithImages.images}
                        initialImageIndex={selectedImageIndex}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}