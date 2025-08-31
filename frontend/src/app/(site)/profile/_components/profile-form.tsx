'use client'

import { AvatarUploadDialog } from '@/app/(site)/profile/_components/avatar-upload-dialog'
import { ProfileHeader } from '@/components/blocks/profile-header'
import { AccountInformation } from '@/components/profile/account-information'
import { AddressManagement } from '@/components/profile/address-management'
import { ChildrenInformation } from '@/components/profile/children-information'
import { EmailConnectionsManager } from '@/components/profile/email-connections-manager'
import { MarriageInformation } from '@/components/profile/marriage-information'
import { PersonProfileForm } from '@/components/profile/person-profile-form'
import { ProfileLinking } from '@/components/profile/profile-linking'
import { Card } from '@/components/ui/card'
import { useProfileData } from '@/hooks/use-profile-data'
import { client } from '@/lib/api/client.gen'
import { readUsersMeApiV1UsersMeGet } from '@/lib/api/sdk.gen'
import { useState } from 'react'

export function ProfileForm() {
    const {
        session,
        user,
        authLoading,
        isLoading,
        fullName,
        email,
        currentAvatarUrl,
        setCurrentAvatarUrl,
        linkedPersonId,
        linkedPerson,
        addresses,
        marriages,
        marriageChildren,
        availablePeople,
        profileLoading,
        handleFullNameChange,
        handleKeyDown,
        handlePasswordReset,
        handleLinkPerson,
        handleCreateAndLinkPerson,
        handleUnlinkPerson,
        handleSavePersonProfile,
        handleCreateAddress,
        handleUpdateAddress,
        handleDeleteAddress,
        handleCreateMarriage,
        handleUpdateMarriage,
        handleDeleteMarriage,
        handleAddChild,
        handleUpdateChild,
        handleRemoveChild,
        handleCreateChild,
    } = useProfileData()

    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)

    if (authLoading) {
        return (
            <div className="flex justify-center py-8">Loading profile...</div>
        )
    }

    return (
        <>
            <ProfileHeader
                title={fullName}
                subtitle={email || 'Email not available'}
                avatarUrl={currentAvatarUrl}
                onAvatarClick={() => setAvatarDialogOpen(true)}
            />

            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {/* Profile Linking - Show first if not linked */}
                <Card className="space-y-3">
                    <ProfileLinking
                        currentPersonId={linkedPersonId}
                        linkedPerson={linkedPerson}
                        onLinkPerson={handleLinkPerson}
                        onUnlinkPerson={handleUnlinkPerson}
                        onCreateAndLink={handleCreateAndLinkPerson}
                        isLoading={profileLoading}
                    />

                    {linkedPersonId && (
                        <>
                            <PersonProfileForm
                                personProfile={linkedPerson}
                                linkedPersonId={linkedPersonId}
                                onSave={handleSavePersonProfile}
                                onLink={() => {}}
                                onUnlink={handleUnlinkPerson}
                                isLoading={profileLoading}
                            />
                            <AddressManagement
                                personId={linkedPersonId}
                                addresses={addresses}
                                onCreateAddress={handleCreateAddress}
                                onUpdateAddress={handleUpdateAddress}
                                onDeleteAddress={handleDeleteAddress}
                                isLoading={profileLoading}
                            />

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

                            <ChildrenInformation
                                personId={linkedPersonId}
                                marriages={marriages}
                                marriageChildren={marriageChildren}
                                availablePeople={availablePeople}
                                onAddChild={handleAddChild}
                                onUpdateChild={handleUpdateChild}
                                onRemoveChild={handleRemoveChild}
                                onCreateChild={handleCreateChild}
                                isLoading={profileLoading}
                            />
                        </>
                    )}
                </Card>
                {/* Mobile-first responsive layout */}
                <div className="space-y-3">
                    {/* Left Column - Account & Basic Info */}
                    <div className="space-y-3">
                        <AccountInformation
                            fullName={fullName}
                            email={email}
                            user={user}
                            isLoading={isLoading}
                            onFullNameChange={handleFullNameChange}
                            onKeyDown={handleKeyDown}
                            onPasswordReset={handlePasswordReset}
                        />
                        <EmailConnectionsManager />
                    </div>
                </div>
            </div>

            <AvatarUploadDialog
                open={avatarDialogOpen}
                onOpenChange={setAvatarDialogOpen}
                currentAvatarUrl={currentAvatarUrl || (user as any)?.avatar_url}
                userName={(user as any)?.full_name || user?.name || ''}
                onAvatarUpdated={async (newAvatarUrl) => {
                    setCurrentAvatarUrl(newAvatarUrl)

                    try {
                        const accessToken =
                            session &&
                            typeof session === 'object' &&
                            'accessToken' in session
                                ? String(session.accessToken)
                                : ''

                        if (accessToken) {
                            client.setConfig({
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            })

                            const freshUserData =
                                await readUsersMeApiV1UsersMeGet()
                            await session?.update({
                                ...session,
                                user: {
                                    ...session.user,
                                    ...freshUserData,
                                },
                            })
                        }
                    } catch (error) {
                        console.error(
                            'Failed to refresh user data after avatar update:',
                            error,
                        )
                    }
                }}
            />
        </>
    )
}
