'use client'

import { PageEditor } from '@/components/pages/page-editor'

// Define the root page ID - this is the immutable home of all pages
const ROOT_PAGE_ID = 1

export default function AdminPagesPage() {
    return (
        <div className="flex-1">
            <PageEditor pageId={ROOT_PAGE_ID} />
        </div>
    )
}
