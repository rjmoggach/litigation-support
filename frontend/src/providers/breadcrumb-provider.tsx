'use client'

import React, { createContext, useContext, useState } from 'react'

export type BreadcrumbItem = {
    label: string
    href?: string
    active?: boolean
}

type BreadcrumbContextType = {
    items: BreadcrumbItem[]
    setItems: (items: BreadcrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
    undefined,
)

export function BreadcrumbProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [items, setItems] = useState<BreadcrumbItem[]>([
        { label: 'Dashboard', href: '/dashboard', active: false },
    ])

    return (
        <BreadcrumbContext.Provider value={{ items, setItems }}>
            {children}
        </BreadcrumbContext.Provider>
    )
}

export function useBreadcrumb() {
    const context = useContext(BreadcrumbContext)
    if (context === undefined) {
        throw new Error(
            'useBreadcrumb must be used within a BreadcrumbProvider',
        )
    }
    return context
}

export function useBreadcrumbUpdate(items?: BreadcrumbItem[]) {
    const { setItems } = useBreadcrumb()

    // Use JSON stringification for stable dependency
    const itemsJson = items ? JSON.stringify(items) : undefined

    React.useEffect(() => {
        // Guard: only proceed when a valid array of items is provided
        if (!itemsJson) return

        try {
            const parsedItems = JSON.parse(itemsJson)
            setItems(parsedItems)
        } catch (error) {
            console.error('Failed to parse breadcrumb items:', error)
        }
    }, [setItems, itemsJson])
}
