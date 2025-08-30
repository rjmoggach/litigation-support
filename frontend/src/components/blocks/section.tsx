import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'

type SectionVariantProps = VariantProps<typeof sectionVariants>
const sectionVariants = cva('w-full m-0', {
    variants: {
        variant: {
            default: 'bg-none',
            primary: 'bg-primary text-primary-foreground',
            secondary: 'bg-secondary text-secondary-foreground',
            tertiary: 'bg-tertiary text-tertiary-foreground',

            muted: 'bg-muted text-muted-foreground',
            accent: 'bg-accent text-accent-foreground',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
})

export interface SectionProps extends SectionVariantProps {
    className?: string
    children?: React.ReactNode
    fullHeight?: boolean
    id?: string
}

export const Section: React.FC<SectionProps> = ({
    variant,
    fullHeight,
    className,
    children,
    id,
}) => {
    return (
        <section
            id={id}
            className={cn(
                sectionVariants({ variant }),
                fullHeight && 'min-h-screen ',
                className,
            )}
        >
            {children}
        </section>
    )
}
