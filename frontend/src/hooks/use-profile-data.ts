'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { client } from '@/lib/api/client.gen'
import {
    readUsersMeApiV1UsersMeGet,
    updateUserMeApiV1UsersMePut,
    listPeopleApiV1ContactsPeopleGet,
    createPersonApiV1ContactsPeoplePost,
    getPersonApiV1ContactsPeoplePersonIdGet,
    updatePersonApiV1ContactsPeoplePersonIdPut,
    listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet,
    createPersonAddressApiV1ContactsPeoplePersonIdAddressesPost,
    updatePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdPut,
    deletePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdDelete,
    getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet,
    createMarriageApiV1MarriagesPost,
    updateMarriageApiV1MarriagesMarriageIdPut,
    deleteMarriageApiV1MarriagesMarriageIdDelete,
    addChildToMarriageApiV1MarriagesMarriageIdChildrenPost,
    listMarriageChildrenApiV1MarriagesMarriageIdChildrenGet,
    updateMarriageChildApiV1MarriagesMarriageIdChildrenChildIdPut,
    removeChildFromMarriageApiV1MarriagesMarriageIdChildrenChildIdDelete,
    linkUserToPersonApiV1UsersMeProfilePersonPut,
    getMyProfileApiV1UsersMeProfileGet,
} from '@/lib/api/sdk.gen'
import { toast } from 'sonner'

export function useProfileData() {
    const { data: session, status, update } = useSession()
    const user = session?.user
    const authLoading = status === 'loading'
    
    // Basic account state
    const [isLoading, setIsLoading] = useState(false)
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

    // Effects
    useEffect(() => {
        const userAvatarUrl = (user as any)?.avatar_url
        if (userAvatarUrl && userAvatarUrl !== currentAvatarUrl) {
            setCurrentAvatarUrl(userAvatarUrl)
        }
    }, [user, currentAvatarUrl])

    useEffect(() => {
        if (user && !lastSavedNameRef.current) {
            const userName = (user as any)?.full_name || user?.name || ''
            setFullName(userName)
            lastSavedNameRef.current = userName

            if (user.email) {
                setEmail(user.email)
            }
        }
    }, [user])

    // Load user profile on mount to check for existing person link
    useEffect(() => {
        if (session && !authLoading) {
            loadUserProfile()
        }
    }, [session, authLoading])

    // Load person data when linked
    useEffect(() => {
        if (linkedPersonId) {
            loadPersonData()
        }
    }, [linkedPersonId])

    const loadUserProfile = async () => {
        console.log('loadUserProfile called, session:', !!session)
        if (!session) return

        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            console.log('Calling getMyProfileApiV1UsersMeProfileGet...')
            // Get user profile to check for linked person
            const profileResponse = await getMyProfileApiV1UsersMeProfileGet()
            console.log('Profile response:', profileResponse)
            
            // Extract actual profile data
            const profile = profileResponse?.data || profileResponse
            console.log('Extracted profile data:', profile)
            console.log('Profile person_id:', profile?.person_id)
            
            if (profile.person_id) {
                console.log('Found existing linked person ID:', profile.person_id)
                setLinkedPersonId(profile.person_id)
            } else {
                console.log('No person_id found in profile, setting to null')
                setLinkedPersonId(null)
                setLinkedPerson(null)
            }
        } catch (error) {
            console.error('Failed to load user profile:', error)
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                response: error.response
            })
        }
    }

    // Utility functions
    const getAuthHeaders = () => {
        const accessToken =
            session &&
            typeof session === 'object' &&
            'accessToken' in session
                ? String(session.accessToken)
                : ''

        if (!accessToken) {
            throw new Error('No authentication token available')
        }

        return { Authorization: `Bearer ${accessToken}` }
    }

    const saveFullName = async (newFullName: string) => {
        const trimmedName = newFullName.trim()

        if (!trimmedName || trimmedName === lastSavedNameRef.current) {
            return
        }

        setIsLoading(true)

        try {
            client.setConfig({ headers: getAuthHeaders() })
            await updateUserMeApiV1UsersMePut({
                body: { full_name: trimmedName }
            })

            lastSavedNameRef.current = trimmedName
            await update({ name: trimmedName })
            toast.success('Name updated successfully')
        } catch (error) {
            console.error('Failed to update name:', error)
            toast.error('Failed to update name')
            setFullName(lastSavedNameRef.current)
        } finally {
            setIsLoading(false)
        }
    }

    const loadPersonData = async () => {
        if (!linkedPersonId || !session) return

        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })

            // Load person details, addresses, marriages, and available people in parallel
            const [person, addresses, marriages, people] = await Promise.all([
                getPersonApiV1ContactsPeoplePersonIdGet({
                    path: { person_id: linkedPersonId }
                }),
                listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet({
                    path: { person_id: linkedPersonId }
                }),
                getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet({
                    path: { person_id: linkedPersonId }
                }),
                listPeopleApiV1ContactsPeopleGet()
            ])

            console.log('loadPersonData responses:', { person, addresses, marriages, people })
            console.log('marriages type:', typeof marriages)
            console.log('marriages is array:', Array.isArray(marriages))
            console.log('marriages value:', marriages)

            // Extract actual data from API responses
            const personData = person?.data || person
            const addressesData = addresses?.data || addresses
            const marriagesData = marriages?.data || marriages  
            const peopleData = people?.data || people
            
            console.log('Extracted person data:', personData)
            setLinkedPerson(personData)
            
            // Ensure addresses is an array
            const addressesArray = Array.isArray(addressesData) ? addressesData : []
            setAddresses(addressesArray)
            
            // Ensure marriages is an array
            const marriagesArray = Array.isArray(marriagesData) ? marriagesData : []
            console.log('marriages array after processing:', marriagesArray)
            setMarriages(marriagesArray)
            
            // Ensure people is an array  
            const peopleArray = Array.isArray(peopleData) ? peopleData : []
            setAvailablePeople(peopleArray)
                
            // Load children for each marriage using autogenerated API
            const childrenData: { [key: number]: any[] } = {}
            for (const marriage of marriagesArray) {
                try {
                    const childrenResponse = await listMarriageChildrenApiV1MarriagesMarriageIdChildrenGet({
                        path: { marriage_id: marriage.id }
                    })
                    const children = childrenResponse?.data || childrenResponse
                    childrenData[marriage.id] = Array.isArray(children) ? children : []
                } catch (error) {
                    console.error(`Failed to load children for marriage ${marriage.id}:`, error)
                }
            }
            setMarriageChildren(childrenData)
        } catch (error) {
            console.error('Failed to load person data:', error)
            toast.error('Failed to load profile data')
        } finally {
            setProfileLoading(false)
        }
    }

    // Event handlers
    const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value
        setFullName(newName)

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveFullName(newName)
        }, 1000)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveFullName(fullName)
        }
    }

    const handlePasswordReset = async () => {
        try {
            client.setConfig({ headers: getAuthHeaders() })
            await fetch('/api/v1/auth/password-reset-request', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user?.email })
            })
            toast.success('Password reset email sent')
        } catch (error) {
            console.error('Password reset error:', error)
            toast.error('Failed to send password reset email')
        }
    }

    const handleLinkPerson = async (personId: number) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            console.log('Attempting to link person with ID:', personId, 'Type:', typeof personId)
            
            const response = await linkUserToPersonApiV1UsersMeProfilePersonPut({
                query: { person_id: personId }
            })
            
            console.log('Link response:', response)
            
            setLinkedPersonId(personId)
            await loadPersonData()
            toast.success('Profile linked successfully')
        } catch (error: any) {
            console.error('Link person error:', error)
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                body: error.body,
                response: error.response
            })
            toast.error(`Failed to link profile: ${error.message || 'Unknown error'}`)
        } finally {
            setProfileLoading(false)
        }
    }

    const handleCreateAndLinkPerson = async (personData: {
        first_name: string
        last_name: string
        email?: string
        phone?: string
    }) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            // First check if a person with this name already exists to prevent duplicates
            const existingPeople = await listPeopleApiV1ContactsPeopleGet({
                query: { 
                    search: `${personData.first_name} ${personData.last_name}` 
                }
            })
            
            let personToLink = null
            if (existingPeople && existingPeople.length > 0) {
                // Check if there's an exact match
                const exactMatch = existingPeople.find(p => 
                    p.first_name?.toLowerCase() === personData.first_name.toLowerCase() && 
                    p.last_name?.toLowerCase() === personData.last_name.toLowerCase()
                )
                
                if (exactMatch) {
                    console.log('Found existing person with same name, attempting to link:', exactMatch.id)
                    personToLink = exactMatch
                }
            }
            
            // Create the person only if no exact match found
            if (!personToLink) {
                console.log('Creating new person...')
                personToLink = await createPersonApiV1ContactsPeoplePost({
                    body: personData
                })
            }
            
            // Then link the person to the user using autogenerated API
            client.setConfig({ headers: getAuthHeaders() })
            
            console.log('Attempting to link person:', personToLink.id)
            console.log('Person object:', personToLink)
            console.log('Person ID type:', typeof personToLink.id)
            
            if (!personToLink.id) {
                throw new Error('Person ID is missing from created person')
            }

            const linkRequest = {
                query: { person_id: Number(personToLink.id) }
            }
            console.log('Link request payload:', linkRequest)
            
            await linkUserToPersonApiV1UsersMeProfilePersonPut(linkRequest)
            
            console.log('Successfully linked person, updating state')
            const personData = personToLink?.data || personToLink
            setLinkedPersonId(personData.id)
            setLinkedPerson(personData)
            await loadPersonData()
            toast.success('Person created and linked successfully')
            return personToLink
        } catch (error: any) {
            console.error('Create and link person error:', error)
            console.error('Create and link error details:', {
                message: error.message,
                status: error.status,
                body: error.body,
                response: error.response
            })
            toast.error(`Failed to create and link person: ${error.message || 'Unknown error'}`)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleUnlinkPerson = async () => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            await fetch('/api/v1/users/me/unlink-person', {
                method: 'POST',
                headers: getAuthHeaders()
            })
            setLinkedPersonId(null)
            setLinkedPerson(null)
            setAddresses([])
            setMarriages([])
            setMarriageChildren({})
            toast.success('Profile unlinked successfully')
        } catch (error) {
            console.error('Unlink person error:', error)
            toast.error('Failed to unlink profile')
        } finally {
            setProfileLoading(false)
        }
    }

    const handleSavePersonProfile = async (data: any) => {
        if (!linkedPersonId) return

        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            const updatedPerson = await updatePersonApiV1ContactsPeoplePersonIdPut({
                path: { person_id: linkedPersonId },
                body: data
            })
            const updatedPersonData = updatedPerson?.data || updatedPerson
            setLinkedPerson(updatedPersonData)
        } catch (error) {
            console.error('Save person profile error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    // Address handlers
    const handleCreateAddress = async (addressData: any) => {
        console.log('handleCreateAddress called with:', addressData)
        console.log('linkedPersonId:', linkedPersonId)
        
        if (!linkedPersonId) {
            console.error('No linkedPersonId, aborting address creation')
            return
        }
        
        setProfileLoading(true)
        try {
            const headers = getAuthHeaders()
            console.log('Auth headers:', headers)
            client.setConfig({ headers })
            console.log('Making API call to create address...')
            // Fix empty string dates to null and ensure person_id is included
            const bodyData = {
                ...addressData,
                person_id: linkedPersonId,
                effective_end_date: addressData.effective_end_date || null
            }
            
            console.log('API call params:', { 
                path: { person_id: linkedPersonId }, 
                body: bodyData 
            })
            
            const response = await createPersonAddressApiV1ContactsPeoplePersonIdAddressesPost({
                path: { person_id: linkedPersonId },
                body: bodyData
            })
            console.log('Create address API response:', response)
            
            // Check if response contains an error
            if (response.error) {
                console.error('API returned error:', response.error)
                throw new Error(`Address creation failed: ${JSON.stringify(response.error)}`)
            }
            
            const newAddress = response?.data || response
            console.log('Extracted new address:', newAddress)
            
            // Reload all addresses to ensure we have the most up-to-date list
            const addressesResponse = await listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet({
                path: { person_id: linkedPersonId }
            })
            const addressesData = addressesResponse?.data || addressesResponse
            const addressesArray = Array.isArray(addressesData) ? addressesData : []
            setAddresses(addressesArray)
            console.log('Address list reloaded:', addressesArray)
        } catch (error) {
            console.error('Create address error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleUpdateAddress = async (id: number, addressData: any) => {
        if (!linkedPersonId) return
        
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            // Fix empty string dates to null
            const bodyData = {
                ...addressData,
                effective_end_date: addressData.effective_end_date || null
            }
            
            const response = await updatePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdPut({
                path: { person_id: linkedPersonId, address_id: id },
                body: bodyData
            })
            const updatedAddress = response?.data || response
            
            // Reload all addresses to ensure we have the most up-to-date list
            const addressesResponse = await listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet({
                path: { person_id: linkedPersonId }
            })
            const addressesData = addressesResponse?.data || addressesResponse
            const addressesArray = Array.isArray(addressesData) ? addressesData : []
            setAddresses(addressesArray)
        } catch (error) {
            console.error('Update address error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleDeleteAddress = async (id: number) => {
        if (!linkedPersonId) return
        
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            await deletePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdDelete({
                path: { person_id: linkedPersonId, address_id: id }
            })
            
            // Reload all addresses to ensure we have the most up-to-date list
            const addressesResponse = await listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet({
                path: { person_id: linkedPersonId }
            })
            const addressesData = addressesResponse?.data || addressesResponse
            const addressesArray = Array.isArray(addressesData) ? addressesData : []
            setAddresses(addressesArray)
        } catch (error) {
            console.error('Delete address error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    // Marriage handlers
    const handleCreateMarriage = async (marriageData: any) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            // Fix empty string dates to null
            const bodyData = {
                ...marriageData,
                marriage_date: marriageData.marriage_date || null,
                separation_date: marriageData.separation_date || null,
                divorce_date: marriageData.divorce_date || null
            }
            
            const response = await createMarriageApiV1MarriagesPost({
                body: bodyData
            })
            
            console.log('Create marriage API response:', response)
            
            // Check if response contains an error
            if (response.error) {
                console.error('API returned error:', response.error)
                throw new Error(`Marriage creation failed: ${JSON.stringify(response.error)}`)
            }
            
            const newMarriage = response?.data || response
            console.log('Extracted new marriage:', newMarriage)
            setMarriages(prev => [...prev, newMarriage])
            
            // Reload marriages to ensure we have the most up-to-date list
            if (linkedPersonId) {
                const marriagesResponse = await getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet({
                    path: { person_id: linkedPersonId }
                })
                const marriagesData = marriagesResponse?.data || marriagesResponse
                const marriagesArray = Array.isArray(marriagesData) ? marriagesData : []
                setMarriages(marriagesArray)
            }
        } catch (error) {
            console.error('Create marriage error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleUpdateMarriage = async (id: number, marriageData: any) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            // Format dates to ensure they're null instead of empty strings
            const bodyData = {
                ...marriageData,
                marriage_date: marriageData.marriage_date || null,
                separation_date: marriageData.separation_date || null,
                divorce_date: marriageData.divorce_date || null,
            }
            
            const response = await updateMarriageApiV1MarriagesMarriageIdPut({
                path: { marriage_id: id },
                body: bodyData
            })
            
            // Unwrap the response data
            const updatedMarriage = response?.data || response
            
            // Update marriages list if we have linkedPersonId
            if (linkedPersonId) {
                const marriagesResponse = await getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet({
                    path: { person_id: linkedPersonId }
                })
                const marriagesData = marriagesResponse?.data || marriagesResponse
                const marriagesArray = Array.isArray(marriagesData) ? marriagesData : []
                setMarriages(marriagesArray)
            }
        } catch (error) {
            console.error('Update marriage error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleDeleteMarriage = async (id: number) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            await deleteMarriageApiV1MarriagesMarriageIdDelete({
                path: { marriage_id: id }
            })
            
            setMarriages(prev => prev.filter(m => m.id !== id))
            setMarriageChildren(prev => {
                const updated = { ...prev }
                delete updated[id]
                return updated
            })
        } catch (error) {
            console.error('Delete marriage error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    // Children handlers
    const handleAddChild = async (marriageId: number, childData: any) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            // Extract child_id from childData - it could be child_id or person_id or id
            const childId = childData.child_id || childData.person_id || childData.id
            if (!childId) {
                throw new Error('No child ID found in childData')
            }
            
            const response = await addChildToMarriageApiV1MarriagesMarriageIdChildrenPost({
                path: { marriage_id: marriageId },
                body: {
                    marriage_id: marriageId,
                    child_id: childId,
                    ...childData
                }
            })
            
            const newChild = response?.data || response
            setMarriageChildren(prev => ({
                ...prev,
                [marriageId]: [...(prev[marriageId] || []), newChild]
            }))
        } catch (error) {
            console.error('Add child error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleUpdateChild = async (marriageId: number, childId: number, childData: any) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            const response = await updateMarriageChildApiV1MarriagesMarriageIdChildrenChildIdPut({
                path: { marriage_id: marriageId, child_id: childId },
                body: childData
            })
            
            const updatedChild = response?.data || response
            setMarriageChildren(prev => ({
                ...prev,
                [marriageId]: prev[marriageId]?.map(child => 
                    child.child_id === childId ? updatedChild : child
                ) || []
            }))
        } catch (error) {
            console.error('Update child error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleRemoveChild = async (marriageId: number, childId: number) => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            await removeChildFromMarriageApiV1MarriagesMarriageIdChildrenChildIdDelete({
                path: { marriage_id: marriageId, child_id: childId }
            })
            setMarriageChildren(prev => ({
                ...prev,
                [marriageId]: prev[marriageId]?.filter(child => child.child_id !== childId) || []
            }))
        } catch (error) {
            console.error('Remove child error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    const handleCreateChild = async (childData: { first_name: string; last_name: string; date_of_birth: string }): Promise<{ id: number }> => {
        setProfileLoading(true)
        try {
            client.setConfig({ headers: getAuthHeaders() })
            
            const response = await createPersonApiV1ContactsPeoplePost({
                body: {
                    first_name: childData.first_name,
                    last_name: childData.last_name,
                    date_of_birth: childData.date_of_birth || null,
                }
            })
            
            // Unwrap the response data
            const newPerson = response?.data || response
            
            // Add to available people list
            if (newPerson && 'id' in newPerson) {
                setAvailablePeople(prev => [...prev, newPerson])
                return { id: newPerson.id }
            }
            
            throw new Error('Failed to create child - no ID returned')
        } catch (error) {
            console.error('Create child error:', error)
            throw error
        } finally {
            setProfileLoading(false)
        }
    }

    return {
        // Session data
        session,
        user,
        authLoading,
        
        // Basic account state
        isLoading,
        fullName,
        email,
        currentAvatarUrl,
        setCurrentAvatarUrl,
        
        // Personal profile state
        linkedPersonId,
        linkedPerson,
        addresses,
        marriages,
        marriageChildren,
        availablePeople,
        profileLoading,
        
        // Event handlers
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
        handleCreateChild
    }
}