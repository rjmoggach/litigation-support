'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { CompanyResponse } from '@/lib/api'
import { Pencil, Plus, X } from 'lucide-react'
import { AssociationDialog } from '../association-dialog'

interface PersonCompanyAssociation {
    company_id: number
    person_id: number
    company?: CompanyResponse
    role?: string
    start_date?: string
    end_date?: string
    is_primary?: boolean
}

interface PersonCompaniesProps {
    personId: number
    personCompanies: PersonCompanyAssociation[]
    availableCompanies: CompanyResponse[]
    session: { accessToken?: string } | null
    onUpdate: () => void
    onDeleteAssociation: (association: PersonCompanyAssociation) => void
}

export function PersonCompanies({
    personId,
    personCompanies,
    availableCompanies,
    session,
    onUpdate,
    onDeleteAssociation,
}: PersonCompaniesProps) {
    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">
                        Company Associations ({personCompanies.length})
                    </Label>
                    <AssociationDialog
                        personId={personId}
                        availableCompanies={availableCompanies}
                        session={session}
                        onUpdate={onUpdate}
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
                            new Date(association.end_date) > new Date()
                        return (
                            <div
                                key={`${association.company_id}-${association.person_id}`}
                                className="group border rounded-sm p-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">
                                                {association.company?.name ||
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
                                                Role: {association.role}
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
                                                    <span>No dates specified</span>
                                                )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AssociationDialog
                                            personId={personId}
                                            availableCompanies={availableCompanies}
                                            session={session}
                                            onUpdate={onUpdate}
                                            editMode
                                            existingAssociation={association}
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
                                                onDeleteAssociation(association)
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
    )
}