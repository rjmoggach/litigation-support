'use client'

import { Badge } from '@/components/ui/badge'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { useCreateTag, useTagAutocomplete } from '@/lib/hooks/use-tags'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

export interface TagsInputProps {
    value?: string[]
    onChange?: (tags: string[]) => void
    placeholder?: string
    maxTags?: number
    disabled?: boolean
    className?: string
    allowCreate?: boolean
}

export function TagsInput({
    value = [],
    onChange,
    placeholder = 'Add tags...',
    maxTags,
    disabled = false,
    className,
    allowCreate = true,
}: TagsInputProps) {
    const [inputValue, setInputValue] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [focusedTagIndex, setFocusedTagIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const tagsContainerRef = useRef<HTMLDivElement>(null)

    // Tags API hooks
    const { suggestions, loading } = useTagAutocomplete({
        query: inputValue,
        limit: 10,
        enabled: inputValue.length >= 2,
    })
    const { createTag } = useCreateTag()

    // Filter out already selected tags from suggestions
    const filteredSuggestions = suggestions.filter(
        (tag) => !value.includes(tag.name),
    )

    const handleInputChange = useCallback((newValue: string) => {
        setInputValue(newValue)
        setIsOpen(newValue.length >= 2)
        setFocusedTagIndex(-1)
    }, [])

    const addTag = useCallback(
        async (tagName: string) => {
            if (!tagName.trim()) return

            const trimmedTag = tagName.trim()

            // Check if tag already exists
            if (value.includes(trimmedTag)) return

            // Check max tags limit
            if (maxTags && value.length >= maxTags) return

            // Add the tag
            const newTags = [...value, trimmedTag]
            onChange?.(newTags)

            // Clear input and close popover
            setInputValue('')
            setIsOpen(false)
            setFocusedTagIndex(-1)

            // If creating new tags is allowed and this tag doesn't exist, create it
            if (
                allowCreate &&
                !suggestions.some((s) => s.name === trimmedTag)
            ) {
                try {
                    await createTag({ name: trimmedTag })
                } catch (error) {
                    console.warn('Failed to create tag:', error)
                    // Don't prevent the tag from being added locally
                }
            }

            // Focus back to input
            inputRef.current?.focus()
        },
        [value, onChange, maxTags, allowCreate, createTag, suggestions],
    )

    const removeTag = useCallback(
        (tagToRemove: string) => {
            const newTags = value.filter((tag) => tag !== tagToRemove)
            onChange?.(newTags)
            inputRef.current?.focus()
        },
        [value, onChange],
    )

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            switch (e.key) {
                case 'Enter':
                case 'Tab':
                    e.preventDefault()
                    if (
                        focusedTagIndex >= 0 &&
                        filteredSuggestions[focusedTagIndex]
                    ) {
                        addTag(filteredSuggestions[focusedTagIndex].name)
                    } else if (inputValue.trim()) {
                        addTag(inputValue.trim())
                    }
                    break

                case 'Escape':
                    setIsOpen(false)
                    setFocusedTagIndex(-1)
                    break

                case 'ArrowDown':
                    e.preventDefault()
                    setFocusedTagIndex((prev) =>
                        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
                    )
                    break

                case 'ArrowUp':
                    e.preventDefault()
                    setFocusedTagIndex((prev) => (prev > 0 ? prev - 1 : -1))
                    break

                case 'Backspace':
                    if (!inputValue && value.length > 0) {
                        removeTag(value[value.length - 1])
                    }
                    break

                case 'ArrowLeft':
                case 'ArrowRight':
                    // Allow normal cursor movement
                    break

                default:
                    // Reset focused suggestion when typing
                    setFocusedTagIndex(-1)
            }
        },
        [
            inputValue,
            value,
            focusedTagIndex,
            filteredSuggestions,
            addTag,
            removeTag,
        ],
    )

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                tagsContainerRef.current &&
                !tagsContainerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                setFocusedTagIndex(-1)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={tagsContainerRef} className={cn('relative', className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div
                        className={cn(
                            // Match input styling exactly
                            'flex w-full min-w-0 min-h-9 flex-wrap gap-1',
                            'border border-border rounded-sm',
                            'bg-input/50 shadow-xs',
                            'transition-[color,box-shadow]',
                            'focus-within:bg-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[2px] focus-within:-ml-3',
                            'px-3 py-1 text-base md:text-sm -ml-1',
                            disabled &&
                                'pointer-events-none cursor-not-allowed opacity-50',
                            className,
                        )}
                        onClick={() => inputRef.current?.focus()}
                    >
                        {/* Render existing tags */}
                        {value.map((tag) => (
                            <Badge
                                key={tag}
                                variant="tag"
                                className="text-xs h-6 px-2 py-0 gap-1 hover:bg-accent/50"
                            >
                                {tag}
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeTag(tag)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </Badge>
                        ))}

                        {/* Input field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                                if (inputValue.length >= 2) {
                                    setIsOpen(true)
                                }
                            }}
                            placeholder={value.length === 0 ? placeholder : ''}
                            className="flex-1 min-w-0 border-0 bg-transparent outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground"
                            disabled={
                                disabled ||
                                (maxTags ? value.length >= maxTags : false)
                            }
                        />
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    className="w-full p-0"
                    align="start"
                    side="bottom"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command>
                        <CommandList>
                            {loading && (
                                <CommandItem disabled>
                                    <span className="text-sm text-muted-foreground">
                                        Searching...
                                    </span>
                                </CommandItem>
                            )}

                            {!loading && filteredSuggestions.length > 0 && (
                                <CommandGroup heading="Suggestions">
                                    {filteredSuggestions.map((tag, index) => (
                                        <CommandItem
                                            key={tag.id}
                                            value={tag.name}
                                            onSelect={() => addTag(tag.name)}
                                            className={cn(
                                                'cursor-pointer',
                                                index === focusedTagIndex &&
                                                    'bg-accent',
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span>{tag.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {tag.usage_count} uses
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {!loading &&
                                filteredSuggestions.length === 0 &&
                                inputValue.length >= 2 &&
                                allowCreate && (
                                    <CommandGroup heading="Create new">
                                        <CommandItem
                                            value={inputValue}
                                            onSelect={() => addTag(inputValue)}
                                            className="cursor-pointer"
                                        >
                                            <span>Create "{inputValue}"</span>
                                        </CommandItem>
                                    </CommandGroup>
                                )}

                            {!loading &&
                                filteredSuggestions.length === 0 &&
                                inputValue.length >= 2 &&
                                !allowCreate && (
                                    <CommandEmpty>No tags found.</CommandEmpty>
                                )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Helper text */}
            {maxTags && (
                <div className="mt-1 text-xs text-muted-foreground">
                    {value.length}/{maxTags} tags
                </div>
            )}
        </div>
    )
}
