'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Film, ArrowLeft } from 'lucide-react'

import { PageHeader } from '@/components/admin/page-header'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import type { VideoOutUrl, VideoOutHtml5, VideoOutFile, VideoResolutionData } from '@/lib/api/types.gen'
import { 
    getVideoApiV1VideosVideoIdGet,
    getCleanupCandidatesApiV1VideosVideoIdCleanupCandidatesGet,
    executeCleanupApiV1VideosVideoIdCleanupExecutePost
} from '@/lib/api/sdk.gen'

type VideoResponse = VideoOutUrl | VideoOutHtml5 | VideoOutFile

export default function VideoDetailPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const params = useParams<{ videoId: string }>()

    const videoId = React.useMemo(() => {
        const raw = params?.videoId
        const n = Number(raw)
        return Number.isFinite(n) ? n : null
    }, [params])

    const [video, setVideo] = React.useState<VideoResponse | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [cleanupPreview, setCleanupPreview] = React.useState<number[] | null>(null)
    const [cleanupLoading, setCleanupLoading] = React.useState(false)

    const authToken = React.useMemo(() => session?.accessToken, [session])
    const baseUrl = React.useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', [])

    const title = video?.profile?.title || '(untitled)'

    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Videos', href: '/admin/videos/list' },
        { label: 'Detail', active: true },
    ])

    const fetchVideo = React.useCallback(async () => {
        if (videoId == null) return
        try {
            setLoading(true)
            const res = await getVideoApiV1VideosVideoIdGet<true>({
                baseUrl,
                throwOnError: true,
                auth: authToken,
                path: { video_id: videoId },
            })
            setVideo(res.data as VideoResponse)
        } catch (err) {
            console.error('Failed to fetch video', err)
            toast.error('Failed to load video')
        } finally {
            setLoading(false)
        }
    }, [videoId, baseUrl, authToken])

    const previewCleanup = React.useCallback(async () => {
        if (videoId == null) return
        try {
            setCleanupLoading(true)
            const result = await getCleanupCandidatesApiV1VideosVideoIdCleanupCandidatesGet({
                path: { video_id: parseInt(videoId as string) },
                auth: authToken,
                baseUrl,
            })
            const ids = result.data || []
            setCleanupPreview(ids)
            toast.success(`Found ${ids.length} cleanup candidate${ids.length === 1 ? '' : 's'}`)
        } catch (err) {
            console.error('Failed to fetch cleanup candidates', err)
            toast.error('Failed to fetch cleanup candidates')
        } finally {
            setCleanupLoading(false)
        }
    }, [videoId, authToken, baseUrl])

    const doExecuteCleanup = React.useCallback(async () => {
        if (videoId == null) return
        if (!cleanupPreview || cleanupPreview.length === 0) {
            toast.message('No candidates to delete. Run preview first.')
            return
        }
        const ok = window.confirm(`This will permanently delete ${cleanupPreview.length} stored file${cleanupPreview.length === 1 ? '' : 's'}. Continue?`)
        if (!ok) return
        try {
            setCleanupLoading(true)
            const result = await executeCleanupApiV1VideosVideoIdCleanupExecutePost({
                path: { video_id: parseInt(videoId as string) },
                body: { stored_file_ids: cleanupPreview },
                auth: authToken,
                baseUrl,
            })
            const cleanupResult = result.data
            toast.success(`Deleted ${cleanupResult?.deleted?.length || 0}, skipped ${cleanupResult?.skipped_still_referenced?.length || 0}`)
            setCleanupPreview(null)
        } catch (err) {
            console.error('Failed to execute cleanup', err)
            toast.error('Failed to execute cleanup')
        } finally {
            setCleanupLoading(false)
        }
    }, [videoId, cleanupPreview, authToken, baseUrl])

    React.useEffect(() => {
        void fetchVideo()
    }, [fetchVideo])

    const renderTypeBadge = (t: VideoResponse['type']) => {
        switch (t) {
            case 'video_url':
                return <Badge variant="outline">URL</Badge>
            case 'html5_video':
                return <Badge variant="outline">HTML5</Badge>
            case 'video_file':
                return <Badge variant="outline">File</Badge>
            default:
                return <Badge variant="outline">{String(t)}</Badge>
        }
    }

    const renderSource = (v: VideoResponse) => {
        switch (v.type) {
            case 'video_url': {
                const u = v as VideoOutUrl
                return (
                    <div className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Platform:</span> {u.platform}</div>
                        <div className="break-all"><span className="text-muted-foreground">URL:</span> {u.url}</div>
                        {u.embed_url ? (
                            <div className="break-all"><span className="text-muted-foreground">Embed URL:</span> {u.embed_url}</div>
                        ) : null}
                        {u.video_id ? (
                            <div><span className="text-muted-foreground">Video ID:</span> {u.video_id}</div>
                        ) : null}
                    </div>
                )
            }
            case 'html5_video': {
                const h = v as VideoOutHtml5
                return (
                    <div className="space-y-3">
                        {(h.resolutions ?? []).map((r: VideoResolutionData, idx: number) => (
                            <div key={idx} className="rounded-md border p-2 text-sm">
                                <div className="flex flex-wrap gap-4">
                                    <div><span className="text-muted-foreground">Resolution:</span> {r.resolution || `${r.width || '—'}×${r.height || '—'}`}</div>
                                    <div><span className="text-muted-foreground">Width:</span> {r.width ?? '—'}</div>
                                    <div><span className="text-muted-foreground">Height:</span> {r.height ?? '—'}</div>
                                    <div><span className="text-muted-foreground">File ID:</span> {r.stored_file_id ?? '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
            case 'video_file': {
                const f = v as VideoOutFile
                return (
                    <div className="text-sm">
                        <div><span className="text-muted-foreground">Stored File ID:</span> {f.stored_file_id ?? '—'}</div>
                    </div>
                )
            }
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title={title} subtitle={video ? `Video #${video.id}` : 'Video details'} icon={Film}>
                <Button variant="outline" size="sm" onClick={() => router.push('/admin/videos/list')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                </Button>
            </PageHeader>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span>Overview</span>
                        {video ? renderTypeBadge(video.type) : null}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : !video ? (
                        <div className="text-sm text-destructive">Video not found.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div><span className="text-muted-foreground">Title:</span> {video.profile?.title || '(untitled)'}</div>
                                {video.profile?.description ? (
                                    <div>
                                        <div className="text-muted-foreground">Description:</div>
                                        <div className="whitespace-pre-wrap text-sm">{video.profile.description}</div>
                                    </div>
                                ) : null}
                                <div><span className="text-muted-foreground">Duration:</span> {video.profile?.duration ?? '—'} sec</div>
                                {Array.isArray(video.profile?.tags) && video.profile?.tags?.length ? (
                                    <div>
                                        <span className="text-muted-foreground">Tags:</span>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {video.profile!.tags!.map((t, i) => (
                                                <Badge key={`${t}-${i}`} variant="secondary">{t}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div>
                                <div className="mb-2 text-muted-foreground">Source</div>
                                {renderSource(video)}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Storage Cleanup</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="sm" onClick={previewCleanup} disabled={cleanupLoading || videoId == null}>
                            {cleanupLoading ? 'Loading…' : 'Preview cleanup candidates'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={doExecuteCleanup} disabled={cleanupLoading || !cleanupPreview || cleanupPreview.length === 0}>
                            {cleanupLoading ? 'Working…' : 'Execute cleanup'}
                        </Button>
                        {cleanupPreview && (
                            <div className="text-sm text-muted-foreground">
                                Candidates: {cleanupPreview.length ? cleanupPreview.join(', ') : 'none'}
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Preview is safe and does not delete anything. Use it to review unreferenced stored_file_ids before executing cleanup.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
