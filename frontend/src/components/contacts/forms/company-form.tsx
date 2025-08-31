'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CompanyResponse } from '@/lib/api'
import { useCompanyForm } from '@/hooks/use-company-form'
import { FormField } from './form-field'
import { FormHeader } from './form-header'
import type { DetailMode } from '../types'

interface CompanyFormProps {
    company: CompanyResponse | null
    mode: DetailMode
    onUpdate: () => void
    onDelete: (company: CompanyResponse) => void
    session: { accessToken?: string } | null
}

export function CompanyForm({
    company,
    mode,
    onUpdate,
    onDelete,
    session,
}: CompanyFormProps) {
    const {
        formData,
        saving,
        isEditing,
        setIsEditing,
        handleInputChange,
        handleFieldSave,
        handleCreate,
    } = useCompanyForm({
        company,
        mode,
        onUpdate,
        session,
    })

    const title = mode === 'create' ? 'New Company' : (formData.name as string) || 'Company'
    const showActions = company && mode !== 'create'

    return (
        <ScrollArea className="h-full">
            <div className="space-y-3">
                <FormHeader
                    title={title}
                    showActions={showActions}
                    onDelete={() => company && onDelete(company)}
                />

                <div className="grid gap-3">
                    <FormField
                        label="Company Name"
                        id="name"
                        value={formData.name}
                        onChange={(value) => handleInputChange('name', value)}
                        onSave={(value) => handleFieldSave('name', value)}
                        placeholder="Enter company name"
                        isEditing={true}
                    />

                    <FormField
                        label="Email"
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(value) => handleInputChange('email', value)}
                        onSave={(value) => handleFieldSave('email', value)}
                        placeholder="Enter email address"
                        isEditing={true}
                    />

                    <FormField
                        label="Phone"
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(value) => handleInputChange('phone', value)}
                        onSave={(value) => handleFieldSave('phone', value)}
                        placeholder="Enter phone number"
                        isEditing={true}
                    />

                    <FormField
                        label="Website"
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(value) => handleInputChange('website', value)}
                        onSave={(value) => handleFieldSave('website', value)}
                        placeholder="Enter website URL"
                        isEditing={true}
                    />

                    <FormField
                        label="Active"
                        id="is_active"
                        type="switch"
                        value={formData.is_active}
                        onChange={(value) => {
                            handleInputChange('is_active', value)
                            handleFieldSave('is_active', value)
                        }}
                        isEditing={true}
                    />

                    <FormField
                        label="Public"
                        id="is_public"
                        type="switch"
                        value={formData.is_public}
                        onChange={(value) => {
                            handleInputChange('is_public', value)
                            handleFieldSave('is_public', value)
                        }}
                        isEditing={true}
                    />

                    {mode === 'create' && (
                        <Button onClick={handleCreate} disabled={saving}>
                            {saving ? 'Creating...' : 'Create Company'}
                        </Button>
                    )}
                </div>

                {saving && (
                    <div className="text-sm text-muted-foreground">
                        Saving...
                    </div>
                )}
            </div>
        </ScrollArea>
    )
}