'use client'

import { Search, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ImageGrid } from '@/components/galleries/image-grid'
import { SimpleUpload } from '@/components/galleries/simple-upload'

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

interface ImageSelectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImagesSelected: (imageIds: number[]) => void
    selectedImageIds?: number[]
    gallerySlug?: string
    authToken?: string
    // For fetching images - would use actual API calls
    onLoadImages?: (search?: string) => Promise<ImageResponse[]>
    maxSelection?: number
}

export function ImageSelectionDialog({
    open,
    onOpenChange,
    onImagesSelected,
    selectedImageIds = [],
    gallerySlug,
    authToken,
    onLoadImages,
    maxSelection,
}: ImageSelectionDialogProps) {
    const [selectedImages, setSelectedImages] =
        useState<number[]>(selectedImageIds)
    const [images, setImages] = useState<ImageResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('browse')

    // Load images when dialog opens
    useEffect(() => {
        if (open && onLoadImages) {
            setLoading(true)
            onLoadImages(searchQuery)
                .then(setImages)
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [open, onLoadImages, searchQuery])

    // Reset selection when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedImages(selectedImageIds)
        }
    }, [open, selectedImageIds])

    const handleSelectionChange = (newSelection: number[]) => {
        if (maxSelection && newSelection.length > maxSelection) {
            // Don't allow more than max selection
            return
        }
        setSelectedImages(newSelection)
    }

    const handleConfirm = () => {
        onImagesSelected(selectedImages)
        onOpenChange(false)
    }

    const handleUploadComplete = (newImageIds: number[]) => {
        // Add newly uploaded images to selection
        const updatedSelection = [...selectedImages, ...newImageIds]
        setSelectedImages(updatedSelection)

        // Optionally reload images to show new ones
        if (onLoadImages) {
            onLoadImages(searchQuery).then(setImages).catch(console.error)
        }

        // Switch to browse tab to see selected images
        setActiveTab('browse')
    }

    const handleSearch = async () => {
        if (!onLoadImages) return

        setLoading(true)
        try {
            const results = await onLoadImages(searchQuery)
            setImages(results)
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const selectedCount = selectedImages.length
    const canAddMore = !maxSelection || selectedCount < maxSelection

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Select Images</DialogTitle>
                    <DialogDescription>
                        Choose images to add to the gallery. You can upload new
                        images or select from existing ones.
                        {maxSelection && (
                            <> Maximum selection: {maxSelection} images.</>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                            <Badge variant="outline">
                                {selectedCount} selected
                                {maxSelection && ` of ${maxSelection}`}
                            </Badge>
                        )}
                    </div>
                    {selectedCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedImages([])}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Clear Selection
                        </Button>
                    )}
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="browse">Browse Images</TabsTrigger>
                        <TabsTrigger value="upload" disabled={!canAddMore}>
                            Upload New
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="space-y-3">
                        {/* Search */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search images..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleSearch()
                                    }
                                    className="pl-9"
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={loading}>
                                Search
                            </Button>
                        </div>

                        {/* Image Grid */}
                        <ScrollArea className="h-96">
                            <ImageGrid
                                images={images}
                                loading={loading}
                                selectable={true}
                                selectedImages={selectedImages}
                                onSelectionChange={handleSelectionChange}
                                showActions={false}
                                columns={4}
                            />
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-3">
                        <div className="h-96 flex items-center justify-center">
                            {canAddMore ? (
                                <div className="w-full max-w-md">
                                    <SimpleUpload
                                        onUploadComplete={handleUploadComplete}
                                        gallerySlug={gallerySlug}
                                        authToken={authToken}
                                        maxFiles={
                                            maxSelection
                                                ? maxSelection - selectedCount
                                                : 50
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>Maximum selection reached</p>
                                    <p className="text-sm">
                                        Remove some images to upload more
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selectedCount === 0}
                    >
                        Add {selectedCount} Image
                        {selectedCount !== 1 ? 's' : ''} to Gallery
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
