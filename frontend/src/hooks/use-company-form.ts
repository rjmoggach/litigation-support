'use client'

import { useState, useEffect, useCallback } from 'react'
import { debounce } from 'lodash-es'
import { toast } from 'sonner'
import type { CompanyResponse } from '@/lib/api'
import {
    createCompanyApiV1ContactsCompaniesPost,
    updateCompanyApiV1ContactsCompaniesCompanyIdPut,
} from '@/lib/api'
import type { FormData, DetailMode } from '@/components/contacts/types'

interface UseCompanyFormProps {
    company: CompanyResponse | null
    mode: DetailMode
    onUpdate: () => void
    session: { accessToken?: string } | null
}

export function useCompanyForm({
    company,
    mode,
    onUpdate,
    session,
}: UseCompanyFormProps) {
    const [formData, setFormData] = useState<FormData>({})
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    // Initialize form data when company or mode changes
    useEffect(() => {
        if (mode === 'create') {
            setIsEditing(true)
            setFormData({
                name: '',
                email: '',
                phone: '',
                website: '',
                is_active: true,
                is_public: true,
            })
        } else if (company) {
            setIsEditing(true)
            setFormData({ ...company })
        }
    }, [company, mode])

    const debouncedSave = useCallback(
        debounce(async (field: string, value: any) => {
            if (!session?.accessToken || mode === 'create' || !isEditing || !company) {
                return
            }

            setSaving(true)
            try {
                const updateData = { ...formData, [field]: value }

                // Convert empty strings to null for optional fields
                if (updateData.email === '') updateData.email = null
                if (updateData.phone === '') updateData.phone = null
                if (updateData.website === '') updateData.website = null

                await updateCompanyApiV1ContactsCompaniesCompanyIdPut({
                    path: { company_id: company.id },
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
        [formData, company, session, onUpdate, isEditing, mode],
    )

    const saveField = useCallback(
        async (field: string, value: string | boolean | number) => {
            if (!session?.accessToken || mode === 'create' || !isEditing || !company) {
                return
            }

            setSaving(true)
            try {
                const updateData = { ...formData, [field]: value }

                // Convert empty strings to null for optional fields
                if (updateData.email === '') updateData.email = null
                if (updateData.phone === '') updateData.phone = null
                if (updateData.website === '') updateData.website = null

                await updateCompanyApiV1ContactsCompaniesCompanyIdPut({
                    path: { company_id: company.id },
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
        [formData, company, session, onUpdate, isEditing, mode],
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

            // Convert empty strings to null for optional fields
            if (cleanedData.email === '') cleanedData.email = null
            if (cleanedData.phone === '') cleanedData.phone = null
            if (cleanedData.website === '') cleanedData.website = null

            await createCompanyApiV1ContactsCompaniesPost({
                body: cleanedData,
                headers: { Authorization: `Bearer ${session.accessToken}` },
            })
            
            toast.success('Company created')
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

    return {
        formData,
        saving,
        isEditing,
        setIsEditing,
        handleInputChange,
        handleFieldSave,
        handleCreate,
    }
}