'use client'

import { ProfileForm } from '@/app/(site)/profile/_components/profile-form'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { useMemo } from 'react'

export default function AdminProfilePage() {
    // Memoize breadcrumb items to prevent re-renders
    const breadcrumbItems = useMemo(
        () => [
            { label: 'Dashboard', href: '/' },
            { label: 'Profile', active: true },
        ],
        [],
    )

    useBreadcrumbUpdate(breadcrumbItems)

    return <ProfileForm />
}
