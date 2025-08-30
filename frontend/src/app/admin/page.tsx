'use client'

import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    adminGetStatsApiV1AdminStatsGet,
    getVideoStatsApiV1VideosAdminStatsGet,
    listCompaniesApiV1ContactsCompaniesGet,
    listPeopleApiV1ContactsPeopleGet,
} from '@/lib/api/sdk.gen'
import type { UserStatsResponse } from '@/lib/api/types.gen'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import {
    ArrowRight,
    Building2,
    LayoutDashboard,
    Users,
    Video,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<UserStatsResponse | null>(null)
    const [videoStats, setVideoStats] = useState<any>(null)
    const [contactStats, setContactStats] = useState<{
        companies: number
        people: number
    }>({ companies: 0, people: 0 })
    const [loading, setLoading] = useState(true)
    const [hasLoaded, setHasLoaded] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([{ label: 'Dashboard', active: true }])

    const loadStats = async () => {
        if (!session?.accessToken) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)

            // Load all stats in parallel
            const [
                userStatsResponse,
                videoStatsResponse,
                companiesResponse,
                peopleResponse,
            ] = await Promise.allSettled([
                adminGetStatsApiV1AdminStatsGet({
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
                getVideoStatsApiV1VideosAdminStatsGet({
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
                listCompaniesApiV1ContactsCompaniesGet({
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                    query: { per_page: 1 }, // Just to get total count
                }),
                listPeopleApiV1ContactsPeopleGet({
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                    query: { per_page: 1 }, // Just to get total count
                }),
            ])

            // Process user stats
            if (
                userStatsResponse.status === 'fulfilled' &&
                userStatsResponse.value.data
            ) {
                setStats(userStatsResponse.value.data)
            }

            // Process video stats
            if (
                videoStatsResponse.status === 'fulfilled' &&
                videoStatsResponse.value.data
            ) {
                setVideoStats(videoStatsResponse.value.data)
            }

            // Process contact stats
            const companiesTotal =
                companiesResponse.status === 'fulfilled'
                    ? companiesResponse.value.data?.total || 0
                    : 0
            const peopleTotal =
                peopleResponse.status === 'fulfilled'
                    ? peopleResponse.value.data?.total || 0
                    : 0
            setContactStats({ companies: companiesTotal, people: peopleTotal })

            setHasLoaded(true)
        } catch (error) {
            console.error('Failed to load stats:', error)
            toast.error('Failed to load statistics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Only load stats once when authenticated
        if (status === 'authenticated' && session?.accessToken && !hasLoaded) {
            loadStats()
        } else if (status === 'unauthenticated') {
            setLoading(false)
        }
    }, [status, hasLoaded])

    const handleViewUsers = () => {
        router.push('/admin/users')
    }

    const handleViewVideos = () => {
        router.push('/admin/videos')
    }

    const handleViewContacts = () => {
        router.push('/admin/contacts')
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden p-4">
            <PageHeader
                title="Dashboard"
                subtitle="Welcome to the control center."
                icon={LayoutDashboard}
            />

            {/* Dashboard Grid - Ready for 4 cards wide */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* User Management Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 ">
                        <CardTitle className="text-lg font-medium">
                            Users
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-full" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {stats?.total_users?.toLocaleString() || 0}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {stats?.active_users || 0} active •{' '}
                                    {stats?.verified_users || 0} verified
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleViewUsers}
                                >
                                    Manage Users
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Videos Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg font-medium">
                            Videos
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-full" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {videoStats?.total_videos?.toLocaleString() ||
                                        0}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {videoStats?.published_videos || 0}{' '}
                                    published • {videoStats?.draft_videos || 0}{' '}
                                    drafts
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleViewVideos}
                                >
                                    Manage Videos
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Contacts Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-lg font-medium">
                            Contacts
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-full" />
                            </>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {(
                                        contactStats.companies +
                                        contactStats.people
                                    ).toLocaleString()}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {contactStats.companies} companies •{' '}
                                    {contactStats.people} people
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleViewContacts}
                                >
                                    Manage Contacts
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Future App Card */}
                <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center h-32">
                        <p className="text-sm text-muted-foreground">
                            Future app
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
