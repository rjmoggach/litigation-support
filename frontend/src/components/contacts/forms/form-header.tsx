'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface FormHeaderProps {
    title: string
    showActions?: boolean
    onDelete?: () => void
}

export function FormHeader({
    title,
    showActions = false,
    onDelete,
}: FormHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium pb-3">{title}</h3>
            {showActions && (
                <div className="flex items-center gap-0">
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDelete}
                            title="Delete record"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
