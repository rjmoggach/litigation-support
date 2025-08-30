import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import React from 'react'

type BlockVariantProps = VariantProps<typeof blockVariants>
const blockVariants = cva('max-sm:py-10', {
    variants: {
        size: {
            sm: 'py-0',
            md: 'py-6',
            lg: 'py-12',
            xl: 'py-16',
            '2xl': 'py-40',
            '4xl': 'py-80',
            '6xl': 'py-120',
        },
        width: {
            full: 'w-full px-6 md:px-12 lg:px-24 ',
            container: 'container mx-auto max-lg:px-6',
        },
        alignment: {
            left: 'text-left justify-start',
            center: 'text-center mx-auto justify-center',
            right: 'text-right ml-auto justify-end',
        },
        columns: {
            1: '',
            2: 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start content-start',
            3: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 items-start content-start',
            4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start content-start',
            5: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start content-start',
            6: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 items-start content-start',
            7: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6 items-start content-start',
            8: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 items-start content-start',
        },
    },
    defaultVariants: {
        width: 'full',
        size: 'xl',
        alignment: 'left',
        columns: 1,
    },
})

export interface BlockProps extends BlockVariantProps {
    className?: string
    children?: React.ReactNode
}

export const Block: React.FC<BlockProps> = ({
    size,
    width,
    alignment,
    columns,
    className,
    children,
}) => {
    return (
        <div
            className={cn(
                blockVariants({ size, width, alignment, columns }),
                className,
            )}
        >
            {children}
        </div>
    )
}
