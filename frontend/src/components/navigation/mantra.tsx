'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

interface MantraWord {
    text: string
    href: string
}

interface MantraProps {
    className?: string
}

const words: MantraWord[] = [
    { text: 'Collaborate', href: '/collaborate' },
    { text: 'Craft', href: '/craft' },
    { text: 'Create', href: '/create' },
]

export function Mantra({ className = '' }: MantraProps) {
    const [borderStyle, setBorderStyle] = useState<React.CSSProperties>({})
    const wordRefs = useRef<(HTMLAnchorElement | null)[]>([])
    const containerRef = useRef<HTMLParagraphElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout>(null)

    const handleMouseEnter = (index: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        const element = wordRefs.current[index]
        if (element) {
            const { offsetLeft, offsetWidth } = element
            setBorderStyle({
                left: `${offsetLeft}px`,
                width: `${offsetWidth}px`,
                opacity: 1,
            })
        }
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setBorderStyle((prev) => ({ ...prev, opacity: 0 }))
        }, 300)
    }

    return (
        <p
            ref={containerRef}
            className={`relative font-medium tracking-tight max-sm:text-lg text-xl text-primary-foreground ${className}`}
        >
            <span>I </span>
            {words.map((word, index) => (
                <span key={word.text}>
                    <Link
                        ref={(el) => {
                            wordRefs.current[index] = el
                        }}
                        href={word.href}
                        className="relative inline-block"
                        onMouseEnter={() => handleMouseEnter(index)}
                        onMouseLeave={handleMouseLeave}
                    >
                        {word.text}
                    </Link>
                    {index < words.length - 1 && <span>. I </span>}
                </span>
            ))}
            <span>.</span>
            <span
                className="absolute bottom-[0px] h-[2px] bg-foreground transition-all duration-300 ease-out"
                style={{
                    left: borderStyle.left || 0,
                    width: borderStyle.width || 0,
                    opacity: borderStyle.opacity || 0,
                    pointerEvents: 'none',
                }}
            />
        </p>
    )
}
