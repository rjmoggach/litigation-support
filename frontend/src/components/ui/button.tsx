import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default:
                    'bg-primary-foreground/80 text-primary shadow-xs hover:bg-primary-foreground hover:text-primary',
                primary:
                    'bg-primary-foreground/80 text-primary shadow-xs hover:bg-primary-foreground hover:text-primary',
                destructive:
                    'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'border border-card-border/80 bg-transparent text-accent-foreground/80 shadow-xs hover:bg-card hover:border-foreground/70 hover:text-accent-foreground dark:bg-input/30 dark:hover:bg-input/50',
                secondary:
                    'bg-secondary/80 text-secondary-foreground shadow-xs hover:bg-secondary',
                accent: 'bg-accent/80 text-accent-foreground/90 shadow-xs hover:bg-accent hover:text-accent-foreground',
                ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                'table-action':
                    'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-7 w-7 p-0',
                link: 'text-primary underline-offset-4 hover:underline',
                icon: 'bg-none text-foreground/50 hover:text-foreground/70 hover:bg-none',
                navbar: cn(
                    'group relative',
                    'text-sm cursor-pointer',
                    'transition-colors w-fit p-0',
                    'text-foreground/60 hover:text-foreground',
                    'after:content-[""] after:absolute after:-bottom-[2px] after:left-0 after:w-full',
                    'after:h-[2px] after:transform  after:transition after:duration-300 after:ease-out',
                    'hover:after:-translate-y-2 hover:after:opacity-100 hover:after:bg-foreground',
                ),
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-6 p-0 m-0 shadow-none',
                navbar: 'p-0 h-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : 'button'

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
