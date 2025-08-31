'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DropZoneProps {
    id: string
    className?: string
    children?: React.ReactNode
    orientation?: 'horizontal' | 'vertical'
    style?: React.CSSProperties
}

export function DropZone({ id, className, children, orientation = 'horizontal', style }: DropZoneProps) {
    const { isOver, setNodeRef } = useDroppable({
        id,
    })

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'transition-all duration-200 ease-in-out relative',
                // Hidden by default - only show when drag is active
                orientation === 'horizontal' && 'h-0 w-full opacity-0',
                orientation === 'vertical' && 'w-0 h-full opacity-0', 
                // Show and highlight when dragging over
                isOver && orientation === 'horizontal' && 'h-0.5 opacity-100 bg-primary',
                isOver && orientation === 'vertical' && 'w-0.5 opacity-100 bg-primary',
                className
            )}
            data-drop-zone={id}
        >
            {children}
        </div>
    )
}