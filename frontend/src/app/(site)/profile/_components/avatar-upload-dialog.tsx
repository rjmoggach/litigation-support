'use client'

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
import { Label } from '@/components/ui/label'
import { client } from '@/lib/api/client.gen'
import {
    readUsersMeApiV1UsersMeGet,
    uploadProfilePictureApiV1UsersMeProfilePicturePost,
} from '@/lib/api/sdk.gen'
import { ImageIcon, RotateCcw, Upload } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useCallback, useRef, useState } from 'react'
import { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { toast } from 'sonner'

interface AvatarUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentAvatarUrl?: string | null
    userName: string
    onAvatarUpdated?: (newAvatarUrl: string) => void
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export function AvatarUploadDialog({
    open,
    onOpenChange,
    currentAvatarUrl: _currentAvatarUrl,
    userName: _userName,
    onAvatarUpdated,
}: AvatarUploadDialogProps) {
    // Explicitly mark unused parameters to suppress ESLint warnings
    void _currentAvatarUrl
    void _userName
    const { data: session } = useSession()
    const [imgSrc, setImgSrc] = useState('')
    const [, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<Crop>()
    const [isLoading, setIsLoading] = useState(false)
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
    const [imageScale, setImageScale] = useState(1)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const imgRef = useRef<HTMLImageElement>(null)
    const previewCanvasRef = useRef<HTMLCanvasElement>(null)
    const hiddenAnchorRef = useRef<HTMLAnchorElement>(null)
    const blobUrlRef = useRef('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processFile = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file')
            return
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB')
            return
        }

        setCrop(undefined) // Makes crop preview update between images.
        const reader = new FileReader()
        reader.addEventListener('load', () =>
            setImgSrc(reader.result?.toString() || ''),
        )
        reader.readAsDataURL(file)
    }

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0])
        }
    }

    // Drag and drop functionality
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            processFile(files[0])
        }
    }

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget
        // Set a fixed centered crop that doesn't move
        const fixedCrop = centerAspectCrop(width, height, 1)
        setCrop(fixedCrop)
        setCompletedCrop(fixedCrop)
        // Reset image position and scale
        setImagePosition({ x: 0, y: 0 })
        setImageScale(1)
    }

    // Image dragging handlers
    const handleImageMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        setDragStart({
            x: e.clientX - imagePosition.x,
            y: e.clientY - imagePosition.y,
        })
    }

    const handleImageMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        e.preventDefault()
        setImagePosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        })
    }

    const handleImageMouseUp = () => {
        setIsDragging(false)
    }

    const handleZoomChange = (value: number) => {
        setImageScale(value)
    }

    const updatePreviewCanvas = useCallback(
        (image: HTMLImageElement, canvas: HTMLCanvasElement) => {
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                throw new Error('No 2d context')
            }

            // Get container dimensions
            const containerRect = image.parentElement?.getBoundingClientRect()
            if (!containerRect) return

            const containerSize = Math.min(
                containerRect.width,
                containerRect.height,
            )
            const cropRadius = containerSize * 0.35
            const cropDiameter = cropRadius * 2

            // Set canvas size
            canvas.width = cropDiameter
            canvas.height = cropDiameter
            ctx.imageSmoothingQuality = 'high'

            // Calculate where the center of the crop circle is
            const containerCenterX = containerRect.width / 2
            const containerCenterY = containerRect.height / 2

            // The image transform origin is at the center of the image
            // When we apply translate(x,y) and scale(s), we need to account for both

            // Get the image's natural aspect ratio and how it's displayed
            const imageAspect = image.naturalWidth / image.naturalHeight
            const containerAspect = containerRect.width / containerRect.height

            let displayWidth, displayHeight

            if (imageAspect > containerAspect) {
                // Image is wider - fit to height
                displayHeight = containerRect.height
                displayWidth = displayHeight * imageAspect
            } else {
                // Image is taller - fit to width
                displayWidth = containerRect.width
                displayHeight = displayWidth / imageAspect
            }

            // Account for scaling and positioning
            const scaledWidth = displayWidth * imageScale
            const scaledHeight = displayHeight * imageScale

            // The image center after transforms
            const imageCenterX = containerCenterX + imagePosition.x
            const imageCenterY = containerCenterY + imagePosition.y

            // Calculate the top-left corner of the scaled image
            const imageLeft = imageCenterX - scaledWidth / 2
            const imageTop = imageCenterY - scaledHeight / 2

            // Calculate crop area in image coordinates
            const cropLeft = containerCenterX - cropRadius
            const cropTop = containerCenterY - cropRadius

            // Convert to source image coordinates
            const sourceX =
                ((cropLeft - imageLeft) / scaledWidth) * image.naturalWidth
            const sourceY =
                ((cropTop - imageTop) / scaledHeight) * image.naturalHeight
            const sourceSize = (cropDiameter / scaledWidth) * image.naturalWidth

            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                sourceSize,
                sourceSize,
                0,
                0,
                cropDiameter,
                cropDiameter,
            )
        },
        [imagePosition, imageScale],
    )

    const handleUpload = async () => {
        if (!completedCrop || !previewCanvasRef.current) {
            toast.error('Please select and crop an image first')
            return
        }

        setIsLoading(true)

        try {
            const canvas = previewCanvasRef.current

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob)
                    },
                    'image/jpeg',
                    0.9,
                )
            })

            // Create form data
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })

            if (!session) {
                toast.error('Please log in to upload avatar.')
                return
            }

            if (
                !session ||
                typeof session !== 'object' ||
                !('accessToken' in session) ||
                !session.accessToken
            ) {
                toast.error(
                    'No authentication token found. Please log in again.',
                )
                return
            }

            // Set up authentication for the API client
            const accessToken =
                session &&
                typeof session === 'object' &&
                'accessToken' in session
                    ? String(session.accessToken)
                    : ''

            if (!accessToken) {
                toast.error('Authentication failed. Please log in again.')
                return
            }

            // Configure client with auth token
            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            // First test if the user endpoint works with our token
            console.log('Testing user endpoint first...')
            try {
                const testResponse = await readUsersMeApiV1UsersMeGet({
                    client,
                })
                if (!testResponse.data) {
                    console.error(
                        'User endpoint failed, token might be invalid',
                    )
                    toast.error('Authentication failed. Please log in again.')
                    return
                }
                console.log('User endpoint test: success')
            } catch (error) {
                console.error('User endpoint failed:', error)
                toast.error('Authentication failed. Please log in again.')
                return
            }

            // Upload avatar using the API client
            console.log('Making avatar upload request to backend...')
            console.log('Using token:', accessToken.substring(0, 20) + '...')

            const response =
                await uploadProfilePictureApiV1UsersMeProfilePicturePost({
                    body: {
                        file: file,
                    },
                    client,
                })

            if (!response.data) {
                console.error('Upload failed: no data returned')
                toast.error('Failed to upload avatar')
                return
            }

            const result = response.data
            console.log('Upload success response:', result)

            if (result?.avatar_url) {
                console.log('Calling onAvatarUpdated with:', result.avatar_url)
                onAvatarUpdated?.(result.avatar_url)
                handleClose()
            } else {
                console.error('No avatar URL returned in response')
                toast.error('Upload completed but no avatar URL received')
            }
        } catch (err) {
            console.error('Avatar upload error:', err)
            toast.error('Failed to upload avatar')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setImgSrc('')
        setCrop(undefined)
        setCompletedCrop(undefined)
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
        }
        onOpenChange(false)
    }

    const resetCrop = () => {
        setImagePosition({ x: 0, y: 0 })
        setImageScale(1)
        if (imgRef.current) {
            const { width, height } = imgRef.current
            const fixedCrop = centerAspectCrop(width, height, 1)
            setCrop(fixedCrop)
            setCompletedCrop(fixedCrop)
        }
    }

    // Update preview canvas when image position or scale changes
    React.useEffect(() => {
        if (imgRef.current && previewCanvasRef.current && imgSrc) {
            updatePreviewCanvas(imgRef.current, previewCanvasRef.current)
        }
    }, [imagePosition, imageScale, imgSrc, updatePreviewCanvas])

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                    <DialogDescription>
                        Upload and crop your profile picture. The image will be
                        resized to 200x200 pixels.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!imgSrc ? (
                        /* Drag and Drop Zone */
                        <div
                            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer aspect-square flex items-center justify-center ${
                                isDragOver
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-primary/50'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 rounded-full bg-muted">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {isDragOver
                                            ? 'Drop image here'
                                            : 'Drag & drop an image here'}
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
                        /* Crop Area - replaces drag zone */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Crop Image</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetCrop}
                                    className="h-8"
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset
                                </Button>
                            </div>

                            {/* Square crop container with fixed circular overlay */}
                            <div
                                className="aspect-square border rounded-md overflow-hidden bg-black/5 relative select-none"
                                onMouseMove={handleImageMouseMove}
                                onMouseUp={handleImageMouseUp}
                                onMouseLeave={handleImageMouseUp}
                            >
                                {/* Draggable image */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    ref={imgRef}
                                    alt="Crop me"
                                    src={imgSrc}
                                    width={400}
                                    height={400}
                                    className={`absolute inset-0 w-full h-full object-contain ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    onLoad={onImageLoad}
                                    onMouseDown={handleImageMouseDown}
                                    draggable={false}
                                    style={{
                                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                                        transformOrigin: 'center',
                                    }}
                                />

                                {/* Fixed circular crop overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Create overlay with exact pixel measurements */}
                                    <svg className="absolute inset-0 w-full h-full">
                                        <defs>
                                            <mask id="crop-mask">
                                                <rect
                                                    width="100%"
                                                    height="100%"
                                                    fill="white"
                                                />
                                                <circle
                                                    cx="50%"
                                                    cy="50%"
                                                    r="35%"
                                                    fill="black"
                                                />
                                            </mask>
                                        </defs>
                                        {/* Dark overlay with circular cutout */}
                                        <rect
                                            width="100%"
                                            height="100%"
                                            fill="rgba(0,0,0,0.5)"
                                            mask="url(#crop-mask)"
                                        />
                                        {/* Circular border exactly matching the cutout */}
                                        <circle
                                            cx="50%"
                                            cy="50%"
                                            r="35%"
                                            fill="none"
                                            stroke="rgba(255,255,255,0.9)"
                                            strokeWidth="2"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {/* Zoom slider */}
                            <div className="space-y-2">
                                <Label className="text-sm">Zoom</Label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.01"
                                    value={imageScale}
                                    className="w-full h-2 bg-muted rounded-md appearance-none cursor-pointer slider"
                                    onChange={(e) =>
                                        handleZoomChange(
                                            parseFloat(e.target.value),
                                        )
                                    }
                                />
                            </div>

                            {/* Change image button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setImgSrc('')
                                    setCrop(undefined)
                                    setCompletedCrop(undefined)
                                    fileInputRef.current?.click()
                                }}
                                className="w-full"
                            >
                                Choose Different Image
                            </Button>
                        </div>
                    )}

                    {/* Hidden File Input */}
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onSelectFile}
                        className="hidden"
                    />

                    {/* Hidden canvas for processing */}
                    {completedCrop && (
                        <canvas ref={previewCanvasRef} className="hidden" />
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!completedCrop || isLoading}
                        className="gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        {isLoading ? 'Uploading...' : 'Upload Avatar'}
                    </Button>
                </DialogFooter>

                {/* Hidden download link for debugging */}
                <a className="hidden" ref={hiddenAnchorRef} download>
                    Hidden download
                </a>
            </DialogContent>
        </Dialog>
    )
}
