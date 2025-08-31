'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { CompanyResponse, PersonResponse } from '@/lib/api'
import {
    createCompanyApiV1ContactsCompaniesPost,
    createPersonApiV1ContactsPeoplePost,
    deleteAssociationApiV1ContactsAssociationsCompanyIdPersonIdDelete,
    getPersonCompaniesApiV1ContactsPeoplePersonIdCompaniesGet,
    listCompaniesApiV1ContactsCompaniesGet,
    updateCompanyApiV1ContactsCompaniesCompanyIdPut,
    updatePersonApiV1ContactsPeoplePersonIdPut,
} from '@/lib/api'
import { debounce } from 'lodash-es'
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AssociationDialog } from './association-dialog'

export type SelectedType = 'company' | 'person' | null
export type DetailMode = 'view' | 'edit' | 'create'

export interface SelectedItem {
    type: SelectedType
    item: CompanyResponse | PersonResponse | null
    mode: DetailMode
    companyContext?: CompanyResponse
}

interface DetailFormProps {
    selected: SelectedItem
    onUpdate: () => void
    onDelete: (
        item: CompanyResponse | PersonResponse,
        type: SelectedType,
    ) => void
    session: { accessToken?: string } | null
}

interface FormData {
    [key: string]: string | boolean | number | undefined
}

interface PersonCompanyAssociation {
    company_id: number
    person_id: number
    company?: CompanyResponse
    role?: string
    start_date?: string
    end_date?: string
    is_primary?: boolean
}

export function DetailForm({
    selected,
    onUpdate,
    onDelete,
    session,
}: DetailFormProps) {
    const [formData, setFormData] = useState<FormData>({})
    const [saving, setSaving] = useState(false)
    const [personCompanies, setPersonCompanies] = useState<
        PersonCompanyAssociation[]
    >([])
    const [isEditing, setIsEditing] = useState(false)
    const [availableCompanies, setAvailableCompanies] = useState<
        CompanyResponse[]
    >([])

    // Initialize form data when selection changes
    useEffect(() => {
        if (selected.mode === 'create') {
            setIsEditing(true)
            if (selected.type === 'company') {
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    website: '',
                    is_active: true,
                    is_public: true,
                })
            } else if (selected.type === 'person') {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    is_active: true,
                    is_public: true,
                })
            }
        } else if (selected.item) {
            setIsEditing(false)
            setFormData({ ...selected.item })

            // If it's a person, fetch their companies
            if (selected.type === 'person') {
                console.log(
                    'Person selected, fetching companies for:',
                    selected.item,
                )
                fetchPersonCompanies((selected.item as PersonResponse).id)
                fetchAvailableCompanies()
            }
        }
    }, [selected])

    const fetchPersonCompanies = async (personId: number) => {
        if (!session?.accessToken) {
            console.log(
                'No access token available for fetching person companies',
            )
            return
        }

        try {
            console.log(`Fetching companies for person ID: ${personId}`)
            const response =
                await getPersonCompaniesApiV1ContactsPeoplePersonIdCompaniesGet(
                    {
                        path: { person_id: personId },
                        query: { include_inactive: true },
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                        },
                    },
                )
            console.log('Person companies API response:', response)

            if (response.data) {
                setPersonCompanies(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch person companies:', error)
        }
    }

    const fetchAvailableCompanies = async () => {
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
    }

    const handleFieldChange = useCallback(
        debounce(async (field: string, value: any) => {
            if (
                !session?.accessToken ||
                selected.mode === 'create' ||
                !isEditing
            )
                return

            setSaving(true)
            try {
                // Clean the data before sending
                const updateData = { ...formData, [field]: value }

                // Convert empty strings to null for optional fields
                if (updateData.email === '') updateData.email = null
                if (updateData.phone === '') updateData.phone = null
                if (updateData.website === '') updateData.website = null

                if (selected.type === 'company' && selected.item) {
                    await updateCompanyApiV1ContactsCompaniesCompanyIdPut({
                        path: { company_id: selected.item.id },
                        body: updateData,
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                        },
                    })
                } else if (selected.type === 'person' && selected.item) {
                    await updatePersonApiV1ContactsPeoplePersonIdPut({
                        path: { person_id: selected.item.id },
                        body: updateData,
                        headers: {
                            Authorization: `Bearer ${session.accessToken}`,
                        },
                    })
                }
                onUpdate()
                toast.success('Saved')
            } catch (error) {
                console.error('Failed to save:', error)
                toast.error('Failed to save')
            } finally {
                setSaving(false)
            }
        }, 1000),
        [formData, selected, session, onUpdate, isEditing],
    )

    const handleInputChange = useCallback(
        (field: string, value: string | boolean | number) => {
            setFormData((prev) => ({ ...prev, [field]: value }))
            if (isEditing) {
                handleFieldChange(field, value)
            }
        },
        [handleFieldChange, isEditing],
    )

    const handleCreate = async () => {
        if (!session?.accessToken) return

        setSaving(true)
        try {
            // Clean the form data by removing fields that shouldn't be sent to the backend
            const cleanedData = { ...formData }
            delete cleanedData.id
            delete cleanedData.created_at
            delete cleanedData.updated_at
            delete cleanedData.slug
            delete cleanedData.full_name // This is typically auto-generated from first_name + last_name

            // Convert empty strings to null for optional fields
            if (cleanedData.email === '') cleanedData.email = null
            if (cleanedData.phone === '') cleanedData.phone = null
            if (cleanedData.website === '') cleanedData.website = null

            console.log('Sending cleaned data to backend:', cleanedData)

            if (selected.type === 'company') {
                await createCompanyApiV1ContactsCompaniesPost({
                    body: cleanedData,
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Company created')
            } else if (selected.type === 'person') {
                await createPersonApiV1ContactsPeoplePost({
                    body: cleanedData,
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Person created')
            }
            onUpdate()
        } catch (error: any) {
            console.error('Failed to create:', error)
            console.error(
                'Error details:',
                error?.response?.data || error?.message || error,
            )
            console.error('Full error object:', JSON.stringify(error, null, 2))

            // Try to extract detailed validation errors
            let errorMessage = 'Failed to create'
            if (error?.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    // Pydantic validation errors
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

    const handleDeleteAssociation = async (
        association: PersonCompanyAssociation,
    ) => {
        if (!session?.accessToken) return

        try {
            await deleteAssociationApiV1ContactsAssociationsCompanyIdPersonIdDelete(
                {
                    path: {
                        company_id: association.company_id,
                        person_id: association.person_id,
                    },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                },
            )

            toast.success('Association removed successfully')

            // Refresh person companies
            if (selected.item && selected.type === 'person') {
                fetchPersonCompanies((selected.item as PersonResponse).id)
            }
            onUpdate()
        } catch (error) {
            console.error('Failed to delete association:', error)
            toast.error('Failed to remove association')
        }
    }

    if (selected.type === 'company') {
        return (
            <ScrollArea className="h-full">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-medium">
                            {selected.mode === 'create'
                                ? 'New Company'
                                : formData.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            {selected.item && selected.mode !== 'create' && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(!isEditing)}
                                        title={
                                            isEditing
                                                ? 'Switch to view mode'
                                                : 'Edit company'
                                        }
                                    >
                                        {isEditing ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <Pencil className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            onDelete(selected.item!, 'company')
                                        }
                                        title="Delete company"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <div>
                            <Label htmlFor="name">Company Name</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter company name"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.name || (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter email address"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.email ? (
                                        <a
                                            href={`mailto:${formData.email}`}
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {formData.email}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="phone"
                                    value={formData.phone || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter phone number"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.phone ? (
                                        <a
                                            href={`tel:${formData.phone}`}
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {formData.phone}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="website">Website</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="website"
                                    value={formData.website || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'website',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter website URL"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.website ? (
                                        <a
                                            href={formData.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {formData.website}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active || false}
                                onCheckedChange={(checked) =>
                                    handleInputChange('is_active', checked)
                                }
                                disabled={
                                    !isEditing && selected.mode !== 'create'
                                }
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_public"
                                checked={formData.is_public || false}
                                onCheckedChange={(checked) =>
                                    handleInputChange('is_public', checked)
                                }
                                disabled={
                                    !isEditing && selected.mode !== 'create'
                                }
                            />
                            <Label htmlFor="is_public">Public</Label>
                        </div>

                        {selected.mode === 'create' && (
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

    if (selected.type === 'person') {
        return (
            <ScrollArea className="h-full">
                <div className="space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-2xl font-medium">
                                {selected.mode === 'create'
                                    ? 'New Person'
                                    : formData.full_name}
                            </h3>
                            {selected.mode !== 'create' &&
                                personCompanies.length > 0 &&
                                (() => {
                                    // Find primary association or first active one
                                    const primaryAssociation =
                                        personCompanies.find(
                                            (assoc) => assoc.is_primary,
                                        ) ||
                                        personCompanies.find(
                                            (assoc) =>
                                                !assoc.end_date ||
                                                new Date(assoc.end_date) >
                                                    new Date(),
                                        ) ||
                                        personCompanies[0]

                                    if (
                                        primaryAssociation &&
                                        primaryAssociation.company
                                    ) {
                                        return (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {primaryAssociation.role && (
                                                    <span className="font-medium">
                                                        {
                                                            primaryAssociation.role
                                                        }
                                                    </span>
                                                )}
                                                {primaryAssociation.role &&
                                                    primaryAssociation.company
                                                        .name && (
                                                        <span> at </span>
                                                    )}
                                                <span className="font-medium">
                                                    {
                                                        primaryAssociation
                                                            .company.name
                                                    }
                                                </span>
                                            </div>
                                        )
                                    }
                                    return null
                                })()}
                        </div>
                        <div className="flex items-center gap-2">
                            {selected.item && selected.mode !== 'create' && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(!isEditing)}
                                        title={
                                            isEditing
                                                ? 'Switch to view mode'
                                                : 'Edit person'
                                        }
                                    >
                                        {isEditing ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <Pencil className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            onDelete(selected.item!, 'person')
                                        }
                                        title="Delete person"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <div>
                            <Label htmlFor="first_name">First Name</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="first_name"
                                    value={formData.first_name || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'first_name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter first name"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.first_name || (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="last_name">Last Name</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="last_name"
                                    value={formData.last_name || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'last_name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter last name"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.last_name || (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter email address"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.email ? (
                                        <a
                                            href={`mailto:${formData.email}`}
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {formData.email}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            {isEditing || selected.mode === 'create' ? (
                                <Input
                                    id="phone"
                                    value={formData.phone || ''}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter phone number"
                                />
                            ) : (
                                <div className="p-2 text-sm">
                                    {formData.phone ? (
                                        <a
                                            href={`tel:${formData.phone}`}
                                            className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {formData.phone}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not specified
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active || false}
                                onCheckedChange={(checked) =>
                                    handleInputChange('is_active', checked)
                                }
                                disabled={
                                    !isEditing && selected.mode !== 'create'
                                }
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_public"
                                checked={formData.is_public || false}
                                onCheckedChange={(checked) =>
                                    handleInputChange('is_public', checked)
                                }
                                disabled={
                                    !isEditing && selected.mode !== 'create'
                                }
                            />
                            <Label htmlFor="is_public">Public</Label>
                        </div>

                        {selected.mode === 'create' && (
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving ? 'Creating...' : 'Create Person'}
                            </Button>
                        )}
                    </div>

                    {/* Companies Section */}
                    {selected.mode !== 'create' && (
                        <div className="space-y-3">
                            <Separator />
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-base font-semibold">
                                        Company Associations (
                                        {personCompanies.length})
                                    </Label>
                                    <AssociationDialog
                                        personId={
                                            (selected.item as PersonResponse).id
                                        }
                                        availableCompanies={availableCompanies}
                                        session={session}
                                        onUpdate={() => {
                                            fetchPersonCompanies(
                                                (
                                                    selected.item as PersonResponse
                                                ).id,
                                            )
                                            onUpdate()
                                        }}
                                        trigger={
                                            <Button variant="outline" size="sm">
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add
                                            </Button>
                                        }
                                    />
                                </div>
                                <div className="space-y-3">
                                    {personCompanies.map((association) => {
                                        const isActive =
                                            !association.end_date ||
                                            new Date(association.end_date) >
                                                new Date()
                                        return (
                                            <div
                                                key={`${association.company_id}-${association.person_id}`}
                                                className="group border rounded-sm p-3"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm">
                                                                {association
                                                                    .company
                                                                    ?.name ||
                                                                    'Unknown Company'}
                                                            </span>
                                                            {association.is_primary && (
                                                                <Badge
                                                                    variant="default"
                                                                    className="text-xs bg-green-600 hover:bg-green-700"
                                                                >
                                                                    Primary
                                                                </Badge>
                                                            )}
                                                            {isActive ? (
                                                                <Badge
                                                                    variant="default"
                                                                    className="text-xs"
                                                                >
                                                                    Active
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs"
                                                                >
                                                                    Past
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {association.role && (
                                                            <div className="text-sm text-muted-foreground mb-1">
                                                                Role:{' '}
                                                                {
                                                                    association.role
                                                                }
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-muted-foreground">
                                                            {association.start_date && (
                                                                <span>
                                                                    Started:{' '}
                                                                    {new Date(
                                                                        association.start_date,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {association.end_date && (
                                                                <span className="ml-2">
                                                                    Ended:{' '}
                                                                    {new Date(
                                                                        association.end_date,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            {!association.start_date &&
                                                                !association.end_date && (
                                                                    <span>
                                                                        No dates
                                                                        specified
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <AssociationDialog
                                                            personId={
                                                                (
                                                                    selected.item as PersonResponse
                                                                ).id
                                                            }
                                                            availableCompanies={
                                                                availableCompanies
                                                            }
                                                            session={session}
                                                            onUpdate={() => {
                                                                fetchPersonCompanies(
                                                                    (
                                                                        selected.item as PersonResponse
                                                                    ).id,
                                                                )
                                                                onUpdate()
                                                            }}
                                                            editMode
                                                            existingAssociation={
                                                                association
                                                            }
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                                                    title="Edit association"
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                            }
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                                            title="Remove association"
                                                            onClick={() =>
                                                                handleDeleteAssociation(
                                                                    association,
                                                                )
                                                            }
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {personCompanies.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            No company associations
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {saving && (
                        <div className="text-sm text-muted-foreground">
                            Saving...
                        </div>
                    )}
                </div>
            </ScrollArea>
        )
    }

    return null
}
