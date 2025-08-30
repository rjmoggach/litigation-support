import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const inputVariants = cva(
    cn(
        // Layout & Structure
        'flex w-full min-w-0',
        // Borders & Radius
        'border border-border rounded-sm',
        // Background & Colors
        'bg-input/50',
        // Visual Effects
        'shadow-xs',
        // Transitions
        'transition-[color,box-shadow]',
        // Focus States
        'outline-none',
        'focus-visible:bg-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[2px]',
        // Invalid States
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'dark:aria-invalid:ring-destructive/40',
        // Disabled States
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // Placeholder & Selection
        'placeholder:text-muted-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        // File Input Styles
        'file:inline-flex file:border-0 file:bg-transparent',
        'file:font-medium file:text-foreground',
    ),
    {
        variants: {
            size: {
                sm: 'h-8 px-2 py-1 text-xs file:h-6 file:text-xs',
                default: 'h-9 px-3 py-1 text-base md:text-sm file:h-7 file:text-sm',
                lg: 'h-10 px-3 py-2 text-base file:h-8 file:text-base',
                xl: 'h-12 px-4 py-2 text-lg file:h-10 file:text-lg',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
        VariantProps<typeof inputVariants> {
    size?: 'sm' | 'default' | 'lg' | 'xl'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, size, ...props }, ref) => {
        return (
            <input
                type={type}
                data-slot="input"
                className={cn(inputVariants({ size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = 'Input'

export { Input }
