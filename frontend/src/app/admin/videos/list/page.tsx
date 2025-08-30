'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Film, Plus, Link as LinkIcon, Code, Upload } from 'lucide-react'

import { PageHeader } from '@/components/admin/page-header'
import { AdminVideoTable } from '@/components/admin/videos/video-table'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import type { VideoOutUrl, VideoOutHtml5, VideoOutFile } from '@/lib/api/types.gen'
import { listVideosApiV1VideosGet, deleteVideoApiV1VideosVideoIdDelete } from '@/lib/api/sdk.gen'

type VideoResponse = VideoOutUrl | VideoOutHtml5 | VideoOutFile

export default function AdminVideoListPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [videos, setVideos] = React.useState<VideoResponse[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)

    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Videos', href: '/admin/videos' },
        { label: 'List', active: true },
    ])

    const authToken = React.useMemo(() => session?.accessToken, [session])
    const baseUrl = React.useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', [])

    const fetchVideos = React.useCallback(async () => {
        try {
            setLoading(true)
            const result = await listVideosApiV1VideosGet<true>({
                baseUrl,
                throwOnError: true,
                query: { skip: 0, limit: 500 },
            })
            setVideos(result.data)
        } catch (err) {
            console.error('Failed to load videos:', err)
            toast.error('Failed to load videos')
        } finally {
            setLoading(false)
        }
    }, [baseUrl])

    React.useEffect(() => {
        fetchVideos()
    }, [fetchVideos])

    const handleDelete = async (video: VideoResponse) => {
        if (!authToken) return
        try {
            await deleteVideoApiV1VideosVideoIdDelete<true>({
                baseUrl,
                auth: authToken,
                throwOnError: true,
                path: { video_id: video.id },
            })
            toast.success('Video deleted')
            fetchVideos()
        } catch (err) {
            console.error('Failed to delete video:', err)
            toast.error('Failed to delete video')
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Videos" subtitle="Manage videos" icon={Film}>
                <>
                    <Button variant="outline" size="sm" onClick={fetchVideos}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="ml-2">
                                <Plus className="h-4 w-4 mr-2" />
                                New Video
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => router.push('/admin/videos/new?type=video_url')}>
                                <LinkIcon className="h-4 w-4" /> URL (YouTube/Vimeo)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push('/admin/videos/new?type=html5_video')}>
                                <Code className="h-4 w-4" /> HTML5 (Multiple)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push('/admin/videos/new?type=video_file')}>
                                <Upload className="h-4 w-4" /> Upload File
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            </PageHeader>

            <AdminVideoTable
                videos={videos}
                loading={loading}
                onRowClick={(video) => router.push(`/admin/videos/${video.id}`)}
                onDelete={handleDelete}
                onView={(video) => router.push(`/admin/videos/${video.id}`)}
                onEdit={() => toast.info('Edit not implemented yet')}
            />
        </div>
    )
}
