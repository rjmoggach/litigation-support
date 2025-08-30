'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/admin/page-header'
import { AdminVideoForm, type AdminVideoFormValues } from '@/components/admin/videos/video-form'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import type { VideoCreateUrl, VideoCreateHtml5, VideoCreateFile } from '@/lib/api/types.gen'
import { createVideoApiV1VideosPost } from '@/lib/api/sdk.gen'

export default function AdminVideoNewPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()

    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Videos', href: '/admin/videos' },
        { label: 'New', active: true },
    ])

    const authToken = React.useMemo(() => session?.accessToken, [session])
    const baseUrl = React.useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', [])

    type CreateVideoPayload = VideoCreateUrl | VideoCreateHtml5 | VideoCreateFile

    const initialType = React.useMemo<AdminVideoFormValues['type']>(() => {
        const t = searchParams.get('type')
        if (t === 'video_url' || t === 'html5_video' || t === 'video_file') return t
        return 'video_url'
    }, [searchParams])

    const handleCreate = async (values: AdminVideoFormValues) => {
        if (!authToken) {
            toast.error('You must be signed in to create videos')
            return
        }
        try {
            let payload: CreateVideoPayload
            switch (values.type) {
                case 'video_url':
                    payload = {
                        type: 'video_url',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateUrl['data'],
                    } satisfies VideoCreateUrl
                    break
                case 'html5_video':
                    payload = {
                        type: 'html5_video',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateHtml5['data'],
                    } satisfies VideoCreateHtml5
                    break
                case 'video_file':
                    payload = {
                        type: 'video_file',
                        profile: values.profile ?? null,
                        data: values.data as VideoCreateFile['data'],
                    } satisfies VideoCreateFile
                    break
                default:
                    toast.error('Unsupported video type')
                    return
            }

            await createVideoApiV1VideosPost<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                body: payload,
            })
            toast.success('Video created')
            router.push('/admin/videos/list')
        } catch (err) {
            console.error('Failed to create video:', err)
            toast.error('Failed to create video')
            throw err
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="New Video" subtitle="Create a new video" icon={Plus} />
            <div className="max-w-4xl">
                <AdminVideoForm submitLabel="Create Video" onSubmit={handleCreate} defaultValues={{ type: initialType }} />
            </div>
        </div>
    )
}
