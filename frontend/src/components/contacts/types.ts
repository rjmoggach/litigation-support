import type { CompanyResponse, PersonResponse } from '@/lib/api'

export type SelectedType = 'company' | 'person' | null
export type DetailMode = 'view' | 'edit' | 'create'

export interface SelectedItem {
    type: SelectedType
    item: CompanyResponse | PersonResponse | null
    mode: DetailMode
    companyContext?: CompanyResponse
}

export interface FormData {
    [key: string]: string | boolean | number | undefined
}

export interface PersonCompanyAssociation {
    company_id: number
    person_id: number
    company?: CompanyResponse
    role?: string
    start_date?: string
    end_date?: string
    is_primary?: boolean
}