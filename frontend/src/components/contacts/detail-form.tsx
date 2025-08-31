'use client'

import type { CompanyResponse, PersonResponse } from '@/lib/api'
import { CompanyForm } from './forms/company-form'
import { PersonForm } from './forms/person-form'
import type { SelectedItem } from './types'

interface DetailFormProps {
    selected: SelectedItem
    onUpdate: () => void
    onDelete: (
        item: CompanyResponse | PersonResponse,
        type: 'company' | 'person',
    ) => void
    session: { accessToken?: string } | null
    linkedPersonId?: number | null
    spouseIds?: number[]
    childIds?: number[]
}

export function DetailForm({
    selected,
    onUpdate,
    onDelete,
    session,
    linkedPersonId,
    spouseIds = [],
    childIds = [],
}: DetailFormProps) {
    if (selected.type === 'company') {
        return (
            <CompanyForm
                company={selected.item as CompanyResponse}
                mode={selected.mode}
                onUpdate={onUpdate}
                onDelete={(company) => onDelete(company, 'company')}
                session={session}
            />
        )
    }

    if (selected.type === 'person') {
        return (
            <PersonForm
                person={selected.item as PersonResponse}
                mode={selected.mode}
                onUpdate={onUpdate}
                onDelete={(person) => onDelete(person, 'person')}
                session={session}
                linkedPersonId={linkedPersonId}
                spouseIds={spouseIds}
                childIds={childIds}
            />
        )
    }

    return null
}