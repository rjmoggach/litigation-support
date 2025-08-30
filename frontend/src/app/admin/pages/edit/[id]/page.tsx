'use client'

import { PageEditor } from '@/components/pages/page-editor'
import { use } from 'react'

interface EditPageProps {
    params: Promise<{
        id: string
    }>
}

export default function EditPagePage({ params }: EditPageProps) {
    const { id } = use(params)
    const pageId = parseInt(id)

    if (isNaN(pageId)) {
        return (
            <div className="text-center py-12">
                <div className="text-muted-foreground">
                    <p className="text-lg mb-2">Invalid Page ID</p>
                    <p className="text-sm">The page ID must be a number.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1">
            <PageEditor pageId={pageId} />
        </div>
    )
}
