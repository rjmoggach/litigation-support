import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                // Base layout
                'flex field-sizing-content w-full min-h-16',
                // Spacing & Padding
                'px-3 py-2',
                // Border & Outline
                'border border-border outline-none rounded-sm',
                // Background
                'bg-input/50',
                // Typography
                'text-base md:text-sm',
                // Placeholder
                'placeholder:text-muted-foreground',
                // Focus states
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]',
                // Invalid states
                'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
                // Disabled states
                'disabled:cursor-not-allowed disabled:opacity-50',
                // Transitions
                'shadow-xs transition-[color,box-shadow]',
                // Custom class
                className,
            )}
            {...props}
        />
    )
}

export { Textarea }
