'use client'

import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface UserSearchProps {
    value?: string
    onSearch: (query: string) => void
    placeholder?: string
    debounceMs?: number
}

export function UserSearch({ 
    value = '', 
    onSearch, 
    placeholder = 'Search users by name or email...',
    debounceMs = 300
}: UserSearchProps) {
    const [searchTerm, setSearchTerm] = useState(value)

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== value) {
                onSearch(searchTerm)
            }
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [searchTerm, debounceMs, onSearch, value])

    const handleClear = useCallback(() => {
        setSearchTerm('')
        onSearch('')
    }, [onSearch])

    return (
        <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9"
            />
            {searchTerm && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 h-full px-3 hover:bg-transparent"
                    onClick={handleClear}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}