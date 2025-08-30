'use client'

import { PageHeader } from '@/components/admin/page-header'
import {
    createCompanyColumns,
    companyStatusOptions,
    companyVisibilityOptions,
} from '@/components/admin/contacts/companies/company-columns'
import { CompanyEditDialog } from '@/components/admin/contacts/companies/company-edit-dialog'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import { Button } from '@/components/ui/button'
import {
    deleteCompanyApiV1ContactsCompaniesCompanyIdDelete,
    listCompaniesApiV1ContactsCompaniesGet,
    updateCompanyApiV1ContactsCompaniesCompanyIdPut,
    createCompanyApiV1ContactsCompaniesPost,
} from '@/lib/api'
import type { CompanyResponse } from '@/lib/api'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { RefreshCw, Building2, Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function CompaniesPage() {
    const { data: session } = useSession()
    const [companies, setCompanies] = useState<CompanyResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCompany, setSelectedCompany] = useState<CompanyResponse | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'Contacts', href: '/admin/contacts' },
        { label: 'Companies', active: true },
    ])

    // Fetch companies from API
    const fetchCompanies = useCallback(async () => {
        if (!session?.accessToken) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const response = await listCompaniesApiV1ContactsCompaniesGet({
                query: {
                    limit: 1000, // Get all companies for client-side processing
                },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.data) {
                setCompanies(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error)
            toast.error('Failed to load companies')
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        fetchCompanies()
    }, [fetchCompanies])

    const handleCompanyEdit = useCallback((company: CompanyResponse) => {
        setSelectedCompany(company)
        setIsCreating(false)
        setEditDialogOpen(true)
    }, [])

    const handleCompanyCreate = useCallback(() => {
        setSelectedCompany(null)
        setIsCreating(true)
        setEditDialogOpen(true)
    }, [])

    const handleCompanySave = async (companyId: number | null, data: any) => {
        if (!session?.accessToken) return

        try {
            if (companyId) {
                // Update existing company
                await updateCompanyApiV1ContactsCompaniesCompanyIdPut({
                    path: { company_id: companyId },
                    body: {
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        website: data.website,
                        is_active: data.is_active,
                        is_public: data.is_public,
                    },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Company updated successfully')
            } else {
                // Create new company
                await createCompanyApiV1ContactsCompaniesPost({
                    body: {
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        website: data.website,
                        is_active: data.is_active,
                        is_public: data.is_public,
                    },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Company created successfully')
            }

            fetchCompanies() // Refresh the list
        } catch (error) {
            console.error('Failed to save company:', error)
            toast.error(companyId ? 'Failed to update company' : 'Failed to create company')
            throw error
        }
    }

    const handleCompanyDelete = useCallback(async (company: CompanyResponse) => {
        if (!session?.accessToken) return

        try {
            await deleteCompanyApiV1ContactsCompaniesCompanyIdDelete({
                path: { company_id: company.id },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            toast.success(`Company ${company.name} deleted successfully`)
            fetchCompanies() // Refresh the list
        } catch (error) {
            console.error('Failed to delete company:', error)
            toast.error('Failed to delete company')
        }
    }, [session?.accessToken, fetchCompanies])

    const handleRefresh = () => {
        fetchCompanies()
    }

    // Create columns with edit and delete handlers (memoized to prevent infinite updates)
    const columns = useMemo(() => createCompanyColumns(
        handleCompanyEdit,
        handleCompanyDelete,
        companies.length,
    ), [handleCompanyEdit, handleCompanyDelete, companies.length])

    // Configure the toolbar (memoized to prevent re-renders)
    const toolbarConfig = useMemo(() => ({
        searchColumn: 'company',
        searchPlaceholder: 'Search companies by name or email...',
        facetedFilters: [
            {
                column: 'status',
                title: 'Status',
                options: companyStatusOptions,
            },
            {
                column: 'visibility',
                title: 'Visibility',
                options: companyVisibilityOptions,
            },
        ],
    }), [])

    return (
        <>
            <PageHeader title="Companies" subtitle="Manage companies" icon={Building2}>
                <>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleCompanyCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                    </Button>
                </>
            </PageHeader>

            <FlexibleDataTable
                columns={columns}
                data={companies}
                toolbarConfig={toolbarConfig}
                loading={loading}
                onRowClick={handleCompanyEdit}
            />

            <CompanyEditDialog
                company={selectedCompany}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSave={handleCompanySave}
                isCreating={isCreating}
            />
        </>
    )
}