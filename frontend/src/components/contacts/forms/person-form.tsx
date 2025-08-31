'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { usePersonForm } from '@/hooks/use-person-form'
import type { PersonResponse } from '@/lib/api'
import type { DetailMode } from '../types'
import { HeartCrack, Baby, Trash2 } from 'lucide-react'
import { FormField } from './form-field'
import { FormHeader } from './form-header'
import { PersonAddresses } from './person-addresses'
import { PersonCompanies } from './person-companies'

interface PersonFormProps {
    person: PersonResponse | null
    mode: DetailMode
    onUpdate: () => void
    onDelete: (person: PersonResponse) => void
    session: { accessToken?: string } | null
    linkedPersonId?: number | null
    spouseIds?: number[]
    childIds?: number[]
}

export function PersonForm({
    person,
    mode,
    onUpdate,
    onDelete,
    session,
    linkedPersonId,
    spouseIds = [],
    childIds = [],
}: PersonFormProps) {
    const {
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
    } = usePersonForm({
        person,
        mode,
        onUpdate,
        session,
    })

    const title =
        mode === 'create'
            ? 'New Person'
            : (formData.full_name as string) || 'Person'
    const showActions = person && mode !== 'create'

    // Get primary company info for subtitle
    const primaryAssociation =
        mode !== 'create' && personCompanies.length > 0
            ? personCompanies.find((assoc) => assoc.is_primary) ||
              personCompanies.find(
                  (assoc) =>
                      !assoc.end_date || new Date(assoc.end_date) > new Date(),
              ) ||
              personCompanies[0]
            : null

    // Determine relationship badges
    const isMe = person && linkedPersonId === person.id
    const isExSpouse = person && spouseIds.includes(person.id)
    const isChild = person && childIds.includes(person.id)

    return (
        <ScrollArea className="h-full">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium">{title}</h3>
                    
                    {/* Relationship badges */}
                    <div className="flex items-center gap-2">
                        {(isMe || isExSpouse || isChild) && (
                            <>
                                {isMe && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        My Record
                                    </Badge>
                                )}
                                {isExSpouse && (
                                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                                        <HeartCrack className="h-3 w-3" />
                                        Ex-Spouse
                                    </Badge>
                                )}
                                {isChild && (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                                        <Baby className="h-3 w-3" />
                                        Child
                                    </Badge>
                                )}
                            </>
                        )}
                        
                        {showActions && person && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(person)}
                                title="Delete record"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                
                {primaryAssociation?.company && (
                    <div className="text-sm text-muted-foreground">
                        {primaryAssociation.role && (
                            <span className="font-medium">
                                {primaryAssociation.role}
                            </span>
                        )}
                        {primaryAssociation.role &&
                            primaryAssociation.company.name && (
                                <span> at </span>
                            )}
                        <span className="font-medium">
                            {primaryAssociation.company.name}
                        </span>
                    </div>
                )}

                <div className="grid gap-3">
                    <FormField
                        label="First Name"
                        id="first_name"
                        value={formData.first_name}
                        onChange={(value) =>
                            handleInputChange('first_name', value)
                        }
                        onSave={(value) => handleFieldSave('first_name', value)}
                        placeholder="Enter first name"
                        isEditing={true}
                    />

                    <FormField
                        label="Middle Name"
                        id="middle_name"
                        value={formData.middle_name}
                        onChange={(value) =>
                            handleInputChange('middle_name', value)
                        }
                        onSave={(value) => handleFieldSave('middle_name', value)}
                        placeholder="Enter middle name (optional)"
                        isEditing={true}
                    />

                    <FormField
                        label="Last Name"
                        id="last_name"
                        value={formData.last_name}
                        onChange={(value) =>
                            handleInputChange('last_name', value)
                        }
                        onSave={(value) => handleFieldSave('last_name', value)}
                        placeholder="Enter last name"
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
                        label="Date of Birth"
                        id="date_of_birth"
                        type="calendar"
                        value={formData.date_of_birth}
                        onChange={(value) =>
                            handleInputChange('date_of_birth', value)
                        }
                        onSave={(value) => handleFieldSave('date_of_birth', value)}
                        placeholder="Select date of birth"
                        isEditing={true}
                    />

                    <div>
                        <label htmlFor="gender" className="text-sm font-medium">
                            Gender
                        </label>
                        <Select
                            value={(formData.gender as string) || ''}
                            onValueChange={(value) => {
                                handleInputChange('gender', value)
                                handleFieldSave('gender', value)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">
                                    Female
                                </SelectItem>
                                <SelectItem value="non_binary">
                                    Non-binary
                                </SelectItem>
                                <SelectItem value="prefer_not_to_say">
                                    Prefer not to say
                                </SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                            {saving ? 'Creating...' : 'Create Person'}
                        </Button>
                    )}
                </div>

                {/* Companies Section */}
                {mode !== 'create' && person && (
                    <>
                        <Separator />
                        <PersonAddresses
                            personId={person.id}
                            session={session}
                            onUpdate={onUpdate}
                        />
                        <Separator />
                        <PersonCompanies
                            personId={person.id}
                            personCompanies={personCompanies}
                            availableCompanies={availableCompanies}
                            session={session}
                            onUpdate={() => {
                                fetchPersonCompanies(person.id)
                                onUpdate()
                            }}
                            onDeleteAssociation={handleDeleteAssociation}
                        />
                    </>
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
