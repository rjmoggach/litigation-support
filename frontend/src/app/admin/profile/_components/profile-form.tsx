'use client'

import { AvatarUploadDialog } from '@/app/admin/profile/_components/avatar-upload-dialog'
import { ProfileHeader } from '@/components/admin/profile-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { client } from '@/lib/api/client.gen'
import {
    readUsersMeApiV1UsersMeGet,
    updateUserMeApiV1UsersMePut,
} from '@/lib/api/sdk.gen'
import { CheckCircle, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function ProfileForm() {
    const { data: session, status, update } = useSession()
    const user = session?.user
    const authLoading = status === 'loading'
    const [isLoading, setIsLoading] = useState(false)
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)

    // Form state
    const [fullName, setFullName] = useState('')
    const [email] = useState(user?.email || '')
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState(
        (user as any)?.avatar_url || null,
    )

    // Refs for debouncing
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSavedNameRef = useRef('')

    // Sync avatar URL when session updates
    useEffect(() => {
        const userAvatarUrl = (user as any)?.avatar_url
        if (userAvatarUrl && userAvatarUrl !== currentAvatarUrl) {
            setCurrentAvatarUrl(userAvatarUrl)
        }
    }, [user, currentAvatarUrl])

    // Update fullName when user data loads (only once)
    useEffect(() => {
        if (user && !lastSavedNameRef.current) {
            const userName = (user as any)?.full_name || user?.name || ''
            setFullName(userName)
            lastSavedNameRef.current = userName
        }
    }, [user])

    const saveFullName = async (newFullName: string) => {
        const trimmedName = newFullName.trim()

        // Don't save if empty, same as current, or same as last saved
        if (!trimmedName || trimmedName === lastSavedNameRef.current) {
            return
        }

        setIsLoading(true)

        try {
            const accessToken =
                session &&
                typeof session === 'object' &&
                'accessToken' in session
                    ? String(session.accessToken)
                    : ''

            if (!accessToken) {
                throw new Error('No authentication token available')
            }

            client.setConfig({
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })

            await updateUserMeApiV1UsersMePut({
                body: {
                    full_name: trimmedName,
                },
                client,
            })

            lastSavedNameRef.current = trimmedName
            toast.success('Name updated')

            // Force update the session with the new name
            await update({
                full_name: trimmedName,
                name: trimmedName,
            })

            // Also update the local display name immediately
            setFullName(trimmedName)
        } catch (err) {
            console.error('Profile update error:', err)
            toast.error('Failed to update name')
            // Revert to previous value
            setFullName(lastSavedNameRef.current)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setFullName(value)

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveFullName(value)
        }, 1000)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveFullName(fullName)
        }
    }

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    const handlePasswordReset = async () => {
        if (!user?.email) {
            toast.error('Email not available')
            return
        }

        setIsLoading(true)

        try {
            const { forgotPasswordApiV1AuthForgotPasswordPost } = await import(
                '@/lib/api/sdk.gen'
            )

            const response = await forgotPasswordApiV1AuthForgotPasswordPost({
                body: {
                    email: user.email,
                },
            })

            if (response.data) {
                toast.success('Password reset link has been sent to your email')
            } else {
                throw new Error('Failed to send reset email')
            }
        } catch (err) {
            console.error('Password reset error:', err)
            toast.error('Failed to send password reset email')
        } finally {
            setIsLoading(false)
        }
    }

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <User className="mx-auto size-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        )
    }

    const userInitials = ((user as any)?.full_name || user?.name || '')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()

    return (
        <div className="space-y-6 max-w-2xl">
            <ProfileHeader
                title={(user as any)?.full_name || user?.name || 'User Profile'}
                subtitle="Update your personal information and account settings"
                avatarUrl={currentAvatarUrl || (user as any)?.avatar_url}
                userInitials={userInitials}
                onAvatarClick={() => setAvatarDialogOpen(true)}
            />

            {/* Profile Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={handleFullNameChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                disabled={true}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Password Reset */}
            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Password</p>
                            <p className="text-muted-foreground text-sm">
                                Reset your password via email
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handlePasswordReset}
                            disabled={isLoading}
                        >
                            Reset Password
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Account Status
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {(user as any)?.is_active
                                    ? 'Active'
                                    : 'Inactive'}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Account Type
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {(user as any)?.is_superuser
                                    ? 'Administrator'
                                    : 'User'}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Email Status
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                                {(user as any)?.is_verified ? (
                                    <>
                                        <CheckCircle className="size-4 text-green-600" />
                                        <span className="text-sm text-green-600">
                                            Verified
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        Unverified
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Member Since
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {(user as any)?.created_at
                                    ? new Date(
                                          (user as any).created_at,
                                      ).toLocaleDateString()
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AvatarUploadDialog
                open={avatarDialogOpen}
                onOpenChange={setAvatarDialogOpen}
                currentAvatarUrl={currentAvatarUrl || (user as any)?.avatar_url}
                userName={(user as any)?.full_name || user?.name || ''}
                onAvatarUpdated={async (newAvatarUrl) => {
                    // Update local state first for immediate UI update
                    setCurrentAvatarUrl(newAvatarUrl)

                    // Fetch fresh user data from backend to get updated session
                    try {
                        const accessToken =
                            session &&
                            typeof session === 'object' &&
                            'accessToken' in session
                                ? String(session.accessToken)
                                : ''

                        if (accessToken) {
                            // Configure client with auth token
                            client.setConfig({
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            })

                            // Use the generated API client
                            const response = await readUsersMeApiV1UsersMeGet({
                                client,
                            })

                            if (response.data) {
                                const userData = response.data
                                // Update NextAuth session with fresh user data including new avatar
                                await update({
                                    avatar_url: userData.avatar_url,
                                    image: userData.avatar_url,
                                    full_name: userData.full_name,
                                    name: userData.full_name,
                                })
                            }
                        }
                    } catch (error) {
                        console.error('Failed to refresh user data:', error)
                        // Fallback to just updating avatar URL
                        await update({ avatar_url: newAvatarUrl })
                    }

                    toast.success('Profile picture updated successfully')
                    // Reload to update session across all components
                    setTimeout(() => {
                        window.location.reload()
                    }, 500)
                }}
            />
        </div>
    )
}
