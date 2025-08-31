'use client'

import { AvatarUploadDialog } from '@/app/(site)/profile/_components/avatar-upload-dialog'
import { ProfileHeader } from '@/components/blocks/profile-header'
import { AddressManagement } from '@/components/profile/address-management'
import { ChildrenInformation } from '@/components/profile/children-information'
import { EmailConnectionsManager } from '@/components/profile/email-connections-manager'
import { MarriageInformation } from '@/components/profile/marriage-information'
import { PersonProfileForm } from '@/components/profile/person-profile-form'
import { ProfileLinking } from '@/components/profile/profile-linking'
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
    const [email, setEmail] = useState('')
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState(
        (user as any)?.avatar_url || null,
    )

    // Personal profile state
    const [linkedPersonId, setLinkedPersonId] = useState<number | null>(null)
    const [linkedPerson, setLinkedPerson] = useState<any>(null)
    const [addresses, setAddresses] = useState<any[]>([])
    const [marriages, setMarriages] = useState<any[]>([])
    const [marriageChildren, setMarriageChildren] = useState<{
        [key: number]: any[]
    }>({})
    const [availablePeople, setAvailablePeople] = useState<any[]>([])
    const [profileLoading, setProfileLoading] = useState(false)

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

    // Update fullName and email when user data loads (only once)
    useEffect(() => {
        if (user && !lastSavedNameRef.current) {
            const userName = (user as any)?.full_name || user?.name || ''
            setFullName(userName)
            lastSavedNameRef.current = userName

            // Also set email when user data is available
            if (user.email) {
                setEmail(user.email)
            }
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

    // Load linked person data
    const loadLinkedPersonData = async () => {
        if (!session?.accessToken) return

        setProfileLoading(true)
        try {
            client.setConfig({
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            // Get linked person
            const response = await fetch('/api/v1/users/me/profile/person', {
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                if (data.person) {
                    setLinkedPerson(data.person)
                    setLinkedPersonId(data.person.id)

                    // Load addresses, marriages, and children for this person
                    await Promise.all([
                        loadPersonAddresses(data.person.id),
                        loadPersonMarriages(data.person.id),
                        loadAvailablePeople(),
                    ])
                }
            }
        } catch (error) {
            console.error('Failed to load linked person:', error)
        } finally {
            setProfileLoading(false)
        }
    }

    const loadPersonAddresses = async (personId: number) => {
        try {
            const response = await fetch(
                `/api/v1/contacts/people/${personId}/addresses`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                    },
                },
            )
            if (response.ok) {
                const data = await response.json()
                setAddresses(data)
            }
        } catch (error) {
            console.error('Failed to load addresses:', error)
        }
    }

    const loadPersonMarriages = async (personId: number) => {
        try {
            const response = await fetch(
                `/api/v1/marriages/people/${personId}/marriages?include_all=true`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                    },
                },
            )
            if (response.ok) {
                const data = await response.json()
                setMarriages(data)

                // Load children for each marriage
                const childrenData: { [key: number]: any[] } = {}
                for (const marriage of data) {
                    try {
                        const childResponse = await fetch(
                            `/api/v1/marriages/${marriage.id}/children`,
                            {
                                headers: {
                                    Authorization: `Bearer ${session?.accessToken}`,
                                },
                            },
                        )
                        if (childResponse.ok) {
                            const children = await childResponse.json()
                            childrenData[marriage.id] = children
                        }
                    } catch (error) {
                        console.error(
                            `Failed to load children for marriage ${marriage.id}:`,
                            error,
                        )
                    }
                }
                setMarriageChildren(childrenData)
            }
        } catch (error) {
            console.error('Failed to load marriages:', error)
        }
    }

    const loadAvailablePeople = async () => {
        try {
            const response = await fetch('/api/v1/contacts/people', {
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            })
            if (response.ok) {
                const data = await response.json()
                setAvailablePeople(data.people || [])
            }
        } catch (error) {
            console.error('Failed to load people:', error)
        }
    }

    // Profile management handlers
    const handleLinkPerson = async (personId: number) => {
        const response = await fetch(
            `/api/v1/users/me/profile/person?person_id=${personId}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            },
        )
        if (!response.ok) throw new Error('Failed to link person')
        await loadLinkedPersonData()
    }

    const handleUnlinkPerson = async () => {
        const response = await fetch('/api/v1/users/me/profile/person', {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session?.accessToken}`,
            },
        })
        if (!response.ok) throw new Error('Failed to unlink person')
        setLinkedPerson(null)
        setLinkedPersonId(null)
        setAddresses([])
        setMarriages([])
        setMarriageChildren({})
    }

    const handleSavePersonProfile = async (personData: any) => {
        if (!linkedPersonId) return

        const response = await fetch(
            `/api/v1/contacts/people/${linkedPersonId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(personData),
            },
        )
        if (!response.ok) throw new Error('Failed to save person profile')
        setLinkedPerson({ ...linkedPerson, ...personData })
    }

    const handleCreateAddress = async (addressData: any) => {
        const response = await fetch(
            `/api/v1/contacts/people/${linkedPersonId}/addresses`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(addressData),
            },
        )
        if (!response.ok) throw new Error('Failed to create address')
        if (linkedPersonId) await loadPersonAddresses(linkedPersonId)
    }

    const handleUpdateAddress = async (addressId: number, addressData: any) => {
        const response = await fetch(
            `/api/v1/contacts/people/${linkedPersonId}/addresses/${addressId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(addressData),
            },
        )
        if (!response.ok) throw new Error('Failed to update address')
        if (linkedPersonId) await loadPersonAddresses(linkedPersonId)
    }

    const handleDeleteAddress = async (addressId: number) => {
        const response = await fetch(
            `/api/v1/contacts/people/${linkedPersonId}/addresses/${addressId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            },
        )
        if (!response.ok) throw new Error('Failed to delete address')
        if (linkedPersonId) await loadPersonAddresses(linkedPersonId)
    }

    const handleCreateMarriage = async (marriageData: any) => {
        const response = await fetch('/api/v1/marriages/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(marriageData),
        })
        if (!response.ok) throw new Error('Failed to create marriage')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    const handleUpdateMarriage = async (
        marriageId: number,
        marriageData: any,
    ) => {
        const response = await fetch(`/api/v1/marriages/${marriageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify(marriageData),
        })
        if (!response.ok) throw new Error('Failed to update marriage')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    const handleDeleteMarriage = async (marriageId: number) => {
        const response = await fetch(`/api/v1/marriages/${marriageId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session?.accessToken}`,
            },
        })
        if (!response.ok) throw new Error('Failed to delete marriage')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    const handleAddChild = async (marriageId: number, childData: any) => {
        const response = await fetch(
            `/api/v1/marriages/${marriageId}/children`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify({ ...childData, marriage_id: marriageId }),
            },
        )
        if (!response.ok) throw new Error('Failed to add child')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    const handleUpdateChild = async (
        marriageId: number,
        childId: number,
        childData: any,
    ) => {
        const response = await fetch(
            `/api/v1/marriages/${marriageId}/children/${childId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.accessToken}`,
                },
                body: JSON.stringify(childData),
            },
        )
        if (!response.ok) throw new Error('Failed to update child')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    const handleRemoveChild = async (marriageId: number, childId: number) => {
        const response = await fetch(
            `/api/v1/marriages/${marriageId}/children/${childId}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            },
        )
        if (!response.ok) throw new Error('Failed to remove child')
        if (linkedPersonId) await loadPersonMarriages(linkedPersonId)
    }

    // Load data when user is available
    useEffect(() => {
        if (user && session?.accessToken) {
            loadLinkedPersonData()
        }
    }, [user, session?.accessToken])

    return (
        <>
            <ProfileHeader
                title={(user as any)?.full_name || user?.name || 'User Profile'}
                subtitle="Update your personal information and account settings"
                avatarUrl={currentAvatarUrl || (user as any)?.avatar_url}
                userInitials={userInitials}
                onAvatarClick={() => setAvatarDialogOpen(true)}
            />
            <div className="space-y-3">
                {/* Profile Linking - Show first if not linked */}
                <ProfileLinking
                    currentPersonId={linkedPersonId}
                    linkedPerson={linkedPerson}
                    onLinkPerson={handleLinkPerson}
                    onUnlinkPerson={handleUnlinkPerson}
                    isLoading={profileLoading}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Basic Profile Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
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
                                <div className="grid gap-3 sm:grid-cols-2">
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
                            </div>
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <div>
                                    <p className="font-medium">Password</p>
                                    <p className="text-muted-foreground text-sm">
                                        Reset your password via email
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={handlePasswordReset}
                                    disabled={isLoading}
                                >
                                    Reset Password
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Personal Information (only show if linked) */}
                {linkedPersonId && (
                    <PersonProfileForm
                        personProfile={linkedPerson}
                        linkedPersonId={linkedPersonId}
                        onSave={handleSavePersonProfile}
                        onLink={() => {}}
                        onUnlink={handleUnlinkPerson}
                        isLoading={profileLoading}
                    />
                )}

                {/* Address Management (only show if linked) */}
                {linkedPersonId && (
                    <AddressManagement
                        personId={linkedPersonId}
                        addresses={addresses}
                        onCreateAddress={handleCreateAddress}
                        onUpdateAddress={handleUpdateAddress}
                        onDeleteAddress={handleDeleteAddress}
                        isLoading={profileLoading}
                    />
                )}

                {/* Marriage Information (only show if linked) */}
                {linkedPersonId && (
                    <MarriageInformation
                        personId={linkedPersonId}
                        marriages={marriages}
                        availablePeople={availablePeople}
                        onCreateMarriage={handleCreateMarriage}
                        onUpdateMarriage={handleUpdateMarriage}
                        onDeleteMarriage={handleDeleteMarriage}
                        onAddChild={handleAddChild}
                        isLoading={profileLoading}
                    />
                )}

                {/* Children Information (only show if linked) */}
                {linkedPersonId && (
                    <ChildrenInformation
                        personId={linkedPersonId}
                        marriages={marriages}
                        marriageChildren={marriageChildren}
                        availablePeople={availablePeople}
                        onAddChild={handleAddChild}
                        onUpdateChild={handleUpdateChild}
                        onRemoveChild={handleRemoveChild}
                        isLoading={profileLoading}
                    />
                )}

                {/* Email Connections */}
                <EmailConnectionsManager />

                <AvatarUploadDialog
                    open={avatarDialogOpen}
                    onOpenChange={setAvatarDialogOpen}
                    currentAvatarUrl={
                        currentAvatarUrl || (user as any)?.avatar_url
                    }
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
                                const response =
                                    await readUsersMeApiV1UsersMeGet({
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
        </>
    )
}
