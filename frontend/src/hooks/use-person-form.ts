'use client'

import { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash-es'
import { toast } from 'sonner'
import type { PersonResponse, CompanyResponse } from '@/lib/api'
import {
    createPersonApiV1ContactsPeoplePost,
    updatePersonApiV1ContactsPeoplePersonIdPut,
    getPersonCompaniesApiV1ContactsPeoplePersonIdCompaniesGet,
    listCompaniesApiV1ContactsCompaniesGet,
    deleteAssociationApiV1ContactsAssociationsCompanyIdPersonIdDelete,
} from '@/lib/api'
import type { FormData, DetailMode, PersonCompanyAssociation } from '@/components/contacts/types'

interface UsePersonFormProps {
    person: PersonResponse | null
    mode: DetailMode
    onUpdate: () => void
    session: { accessToken?: string } | null
}

export function usePersonForm({
    person,
    mode,
    onUpdate,
    session,
}: UsePersonFormProps) {
    const [formData, setFormData] = useState<FormData>({})
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [personCompanies, setPersonCompanies] = useState<PersonCompanyAssociation[]>([])
    const [availableCompanies, setAvailableCompanies] = useState<CompanyResponse[]>([])

    // Initialize form data when person or mode changes
    useEffect(() => {
        if (mode === 'create') {
            setIsEditing(true)
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                email: '',
                phone: '',
                is_active: true,
                is_public: true,
            })
        } else if (person) {
            setIsEditing(true)
            setFormData({ ...person })
            
            // Fetch related data
            fetchPersonCompanies(person.id)
            fetchAvailableCompanies()
        }
    }, [person, mode])

    const fetchPersonCompanies = useCallback(async (personId: number) => {
        if (!session?.accessToken) return

        try {
            const response = await getPersonCompaniesApiV1ContactsPeoplePersonIdCompaniesGet({
                path: { person_id: personId },
                query: { include_inactive: true },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.data) {
                setPersonCompanies(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch person companies:', error)
        }
    }, [session?.accessToken])

    const fetchAvailableCompanies = useCallback(async () => {
        if (!session?.accessToken) return

        try {
            const response = await listCompaniesApiV1ContactsCompaniesGet({
                query: { skip: 0, limit: 100 },
                headers: { Authorization: `Bearer ${session.accessToken}` },
            })

            if (response.data) {
                setAvailableCompanies(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch available companies:', error)
        }
    }, [session?.accessToken])

    const debouncedSave = useCallback(
        debounce(async (field: string, value: any) => {
            if (!session?.accessToken || mode === 'create' || !isEditing || !person) {
                return
            }

            setSaving(true)
            try {
                const updateData = { ...formData, [field]: value }

                // Convert empty strings to null for optional fields
                if (updateData.email === '') updateData.email = null
                if (updateData.phone === '') updateData.phone = null
                if (updateData.middle_name === '') updateData.middle_name = null

                await updatePersonApiV1ContactsPeoplePersonIdPut({
                    path: { person_id: person.id },
                    body: updateData,
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                
                onUpdate()
                toast.success('Saved')
            } catch (error) {
                console.error('Failed to save:', error)
                toast.error('Failed to save')
            } finally {
                setSaving(false)
            }
        }, 5000),
        [formData, person, session, onUpdate, isEditing, mode],
    )

    const saveField = useCallback(
        async (field: string, value: string | boolean | number) => {
            if (!session?.accessToken || mode === 'create' || !isEditing || !person) {
                return
            }

            setSaving(true)
            try {
                const updateData = { ...formData, [field]: value }

                // Convert empty strings to null for optional fields
                if (updateData.email === '') updateData.email = null
                if (updateData.phone === '') updateData.phone = null
                if (updateData.middle_name === '') updateData.middle_name = null

                await updatePersonApiV1ContactsPeoplePersonIdPut({
                    path: { person_id: person.id },
                    body: updateData,
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                
                onUpdate()
                toast.success('Saved')
            } catch (error) {
                console.error('Failed to save:', error)
                toast.error('Failed to save')
            } finally {
                setSaving(false)
            }
        },
        [formData, person, session, onUpdate, isEditing, mode],
    )

    const handleInputChange = useCallback(
        (field: string, value: string | boolean | number) => {
            setFormData((prev) => ({ ...prev, [field]: value }))
            if (isEditing) {
                debouncedSave(field, value)
            }
        },
        [debouncedSave, isEditing],
    )

    const handleFieldSave = useCallback(
        (field: string, value: string | boolean | number) => {
            // Cancel any pending debounced save for this field
            debouncedSave.cancel()
            saveField(field, value)
        },
        [saveField, debouncedSave],
    )

    const handleCreate = async () => {
        if (!session?.accessToken) return

        setSaving(true)
        try {
            const cleanedData = { ...formData }
            delete cleanedData.id
            delete cleanedData.created_at
            delete cleanedData.updated_at
            delete cleanedData.slug
            delete cleanedData.full_name // Auto-generated from first_name + last_name

            // Convert empty strings to null for optional fields
            if (cleanedData.email === '') cleanedData.email = null
            if (cleanedData.phone === '') cleanedData.phone = null
            if (cleanedData.middle_name === '') cleanedData.middle_name = null

            await createPersonApiV1ContactsPeoplePost({
                body: cleanedData,
                headers: { Authorization: `Bearer ${session.accessToken}` },
            })
            
            toast.success('Person created')
            onUpdate()
        } catch (error: any) {
            console.error('Failed to create:', error)
            
            let errorMessage = 'Failed to create'
            if (error?.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    const validationErrors = error.response.data.detail
                        .map((err: any) => `${err.loc.join('.')}: ${err.msg}`)
                        .join(', ')
                    errorMessage = `Validation error: ${validationErrors}`
                } else {
                    errorMessage = error.response.data.detail
                }
            } else if (error?.message) {
                errorMessage = error.message
            }

            toast.error(errorMessage)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAssociation = async (association: PersonCompanyAssociation) => {
        if (!session?.accessToken || !person) return

        try {
            await deleteAssociationApiV1ContactsAssociationsCompanyIdPersonIdDelete({
                path: {
                    company_id: association.company_id,
                    person_id: association.person_id,
                },
                headers: { Authorization: `Bearer ${session.accessToken}` },
            })

            toast.success('Association removed successfully')
            fetchPersonCompanies(person.id)
            onUpdate()
        } catch (error) {
            console.error('Failed to delete association:', error)
            toast.error('Failed to remove association')
        }
    }

    return {
        formData,
        saving,
        isEditing,
        setIsEditing,
        handleInputChange,
        handleFieldSave,
        handleCreate,
        personCompanies,
        availableCompanies,
        fetchPersonCompanies,
        handleDeleteAssociation,
    }
}