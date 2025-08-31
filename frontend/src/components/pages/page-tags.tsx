'use client'

import { Badge } from '@/components/ui/badge'
import { TagsInput } from '@/components/ui/tags-input'
import { useEffect, useRef, useState } from 'react'

interface PageTagsProps {
    tags: string[]
    onTagsChange: (tags: string[]) => void
    onBlur?: () => void
    className?: string
}

export function PageTags({
    tags,
    onTagsChange,
    onBlur,
    className = '',
}: PageTagsProps) {
    const [isEditing, setIsEditing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleTagsUpdate = (newTags: string[]) => {
        onTagsChange(newTags)
    }

    const handleEditStart = () => {
        setIsEditing(true)
    }

    const handleEditEnd = () => {
        setIsEditing(false)
        onBlur?.()
    }

    // Handle clicking outside to close the editor
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                if (isEditing) {
                    handleEditEnd()
                }
            }
        }

        if (isEditing) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [isEditing])

    // Handle escape key to close editor
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isEditing) {
                handleEditEnd()
            }
        }

        if (isEditing) {
            document.addEventListener('keydown', handleEscape)
            return () => {
                document.removeEventListener('keydown', handleEscape)
            }
        }
    }, [isEditing])

    return (
        <div ref={containerRef} className={`mt-3 relative ${className}`}>
            {isEditing ? (
                <div className="-mx-1 -my-1">
                    <TagsInput
                        value={tags}
                        onChange={handleTagsUpdate}
                        placeholder="Add tags to categorize this page"
                        autoFocus
                        className="px-1 py-1 shadow-none"
                    />
                </div>
            ) : (
                <div
                    className="min-h-[32px] cursor-pointer rounded p-1 mb-2 -ml-1 transition-colors flex items-center"
                    onClick={handleEditStart}
                >
                    {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="tag"
                                    className="text-xs"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">
                            Click to add tags...
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
