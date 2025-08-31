'use client'

import { PageHeader } from '@/components/blocks/page-header'
import { CompanyList } from '@/components/contacts/company-list'
import { DetailForm } from '@/components/contacts/detail-form'
import { PeopleList } from '@/components/contacts/people-list'
import type { SelectedItem, SelectedType } from '@/components/contacts/types'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CompanyResponse, PersonResponse } from '@/lib/api'
import {
    deleteCompanyApiV1ContactsCompaniesCompanyIdDelete,
    deletePersonApiV1ContactsPeoplePersonIdDelete,
    getCompanyPeopleApiV1ContactsCompaniesCompanyIdPeopleGet,
    getMyProfileApiV1UsersMeProfileGet,
    getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet,
    listCompaniesApiV1ContactsCompaniesGet,
    listMarriageChildrenApiV1MarriagesMarriageIdChildrenGet,
    listPeopleApiV1ContactsPeopleGet,
} from '@/lib/api'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { debounce } from 'lodash-es'
import { Building2, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function ContactsPage() {
    const { data: session } = useSession()
    const [companies, setCompanies] = useState<CompanyResponse[]>([])
    const [people, setPeople] = useState<PersonResponse[]>([])
    const [filteredPeople, setFilteredPeople] = useState<PersonResponse[]>([])
    const [companyPeople, setCompanyPeople] = useState<PersonResponse[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [peopleSearchQuery, setPeopleSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<SelectedItem>({
        type: null,
        item: null,
        mode: 'view',
    })
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean
        item: CompanyResponse | PersonResponse | null
        type: SelectedType
    }>({
        open: false,
        item: null,
        type: null,
    })

    // Relationship data for badges and icons
    const [linkedPersonId, setLinkedPersonId] = useState<number | null>(null)
    const [marriages, setMarriages] = useState<any[]>([])
    const [allChildren, setAllChildren] = useState<number[]>([])

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: 'Contacts', active: true },
    ])

    // Fetch all data
    const fetchData = useCallback(async () => {
        if (!session?.accessToken) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            console.log(
                'Fetching contacts with token:',
                session.accessToken ? 'present' : 'missing',
            )

            const [companiesResponse, peopleResponse] = await Promise.all([
                listCompaniesApiV1ContactsCompaniesGet({
                    query: { skip: 0, limit: 100 },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
                listPeopleApiV1ContactsPeopleGet({
                    query: { skip: 0, limit: 100 },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                }),
            ])

            console.log('Companies response:', companiesResponse)
            console.log('People response:', peopleResponse)

            if (companiesResponse.data) setCompanies(companiesResponse.data)
            if (peopleResponse.data) setPeople(peopleResponse.data)
        } catch (error) {
            console.error('Failed to fetch contacts:', error)
            toast.error('Failed to load contacts')
        } finally {
            setLoading(false)
        }
    }, [session])

    // Fetch linked person ID and relationship data
    const fetchRelationshipData = useCallback(async () => {
        if (!session?.accessToken) return

        try {
            const profile = await getMyProfileApiV1UsersMeProfileGet({
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (profile.data && profile.data.person_id) {
                setLinkedPersonId(profile.data.person_id)
                // Load marriages and children for relationship identification
                await loadRelationshipData(profile.data.person_id)
            } else {
                setLinkedPersonId(null)
                setMarriages([])
                setAllChildren([])
            }
        } catch (error) {
            console.error('Failed to fetch linked person ID:', error)
            setLinkedPersonId(null)
            setMarriages([])
            setAllChildren([])
        }
    }, [session])

    // Load relationship data (marriages and children)
    const loadRelationshipData = async (personId: number) => {
        try {
            const marriagesResponse =
                await getPersonMarriagesApiV1MarriagesPeoplePersonIdMarriagesGet(
                    {
                        path: { person_id: personId },
                        query: { include_all: true }, // Include marriages where person is spouse too
                        headers: {
                            Authorization: `Bearer ${session?.accessToken}`,
                        },
                    },
                )

            const marriagesData = marriagesResponse?.data || marriagesResponse
            const marriagesArray = Array.isArray(marriagesData)
                ? marriagesData
                : []
            console.log(
                'Loaded marriages for relationship identification:',
                marriagesArray,
            )
            setMarriages(marriagesArray)

            // Load all children from all marriages
            const childIds: number[] = []
            for (const marriage of marriagesArray) {
                try {
                    const childrenResponse =
                        await listMarriageChildrenApiV1MarriagesMarriageIdChildrenGet(
                            {
                                path: { marriage_id: marriage.id },
                                headers: {
                                    Authorization: `Bearer ${session?.accessToken}`,
                                },
                            },
                        )
                    const children = childrenResponse?.data || childrenResponse
                    if (Array.isArray(children)) {
                        childIds.push(
                            ...children.map(
                                (child) => child.child_id || child.id,
                            ),
                        )
                    }
                } catch (error) {
                    console.error(
                        `Failed to load children for marriage ${marriage.id}:`,
                        error,
                    )
                }
            }
            setAllChildren(childIds)
        } catch (error) {
            console.error('Failed to load relationship data:', error)
            setMarriages([])
            setAllChildren([])
        }
    }

    useEffect(() => {
        fetchData()
        fetchRelationshipData()
    }, [fetchData, fetchRelationshipData])

    // Fetch company people when a company is selected
    const fetchCompanyPeople = useCallback(
        async (companyId: number) => {
            if (!session?.accessToken) return

            try {
                console.log('Fetching people for company:', companyId)
                const response =
                    await getCompanyPeopleApiV1ContactsCompaniesCompanyIdPeopleGet(
                        {
                            path: { company_id: companyId },
                            headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                            },
                        },
                    )
                console.log('Company people response:', response)
                if (response.data) {
                    // Extract person data from association objects
                    const peopleData = response.data
                        .map((association: any) => association.person)
                        .filter(
                            (person: any) => person !== null,
                        ) as PersonResponse[]
                    console.log('Setting company people:', peopleData)
                    setCompanyPeople(peopleData)
                }
            } catch (error) {
                console.error('Failed to fetch company people:', error)
            }
        },
        [session],
    )

    // Filter logic
    const filteredCompanies = useMemo(() => {
        if (!searchQuery) return companies
        return companies.filter(
            (company) =>
                company.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                (company.email &&
                    company.email
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())),
        )
    }, [companies, searchQuery])

    useEffect(() => {
        if (
            (selected.type === 'company' && selected.item) ||
            (selected.type === 'person' && selected.companyContext)
        ) {
            // Show only people from selected company (with people search filter)
            let filtered = companyPeople
            if (peopleSearchQuery) {
                filtered = companyPeople.filter(
                    (person) =>
                        person.full_name
                            .toLowerCase()
                            .includes(peopleSearchQuery.toLowerCase()) ||
                        (person.email &&
                            person.email
                                .toLowerCase()
                                .includes(peopleSearchQuery.toLowerCase())),
                )
            }
            setFilteredPeople(filtered)
        } else {
            // Show all people (with people search filter)
            let filtered = people
            if (peopleSearchQuery) {
                filtered = people.filter(
                    (person) =>
                        person.full_name
                            .toLowerCase()
                            .includes(peopleSearchQuery.toLowerCase()) ||
                        (person.email &&
                            person.email
                                .toLowerCase()
                                .includes(peopleSearchQuery.toLowerCase())),
                )
            }
            setFilteredPeople(filtered)
        }
    }, [people, companyPeople, selected, peopleSearchQuery])

    // Handle company selection (toggle behavior)
    const handleCompanySelect = useCallback(
        (company: CompanyResponse) => {
            if (
                (selected.type === 'company' &&
                    selected.item?.id === company.id) ||
                (selected.type === 'person' &&
                    selected.companyContext?.id === company.id)
            ) {
                // Toggle off - deselect company AND any selected person from that company
                setSelected({ type: null, item: null, mode: 'view' })
                setCompanyPeople([])
            } else {
                // Select company and fetch its people
                setSelected({ type: 'company', item: company, mode: 'view' })
                fetchCompanyPeople(company.id)
            }
        },
        [selected, fetchCompanyPeople],
    )

    // Handle person selection (don't deselect company)
    const handlePersonSelect = useCallback(
        (person: PersonResponse) => {
            setSelected((prev) => {
                // If clicking the same person that's already selected, toggle them off
                if (prev.type === 'person' && prev.item?.id === person.id) {
                    // If we have a company context, go back to showing just the company
                    if (prev.companyContext) {
                        return {
                            type: 'company',
                            item: prev.companyContext,
                            mode: 'view',
                        }
                    }
                    // Otherwise, deselect everything
                    return {
                        type: null,
                        item: null,
                        mode: 'view',
                    }
                }

                // If a company is selected and we're viewing its people, keep the company selected
                // and just change the type and item to the person
                if (
                    prev.type === 'company' &&
                    prev.item &&
                    companyPeople.length > 0
                ) {
                    return {
                        type: 'person',
                        item: person,
                        mode: 'view',
                        // We keep the company reference for context
                        companyContext: prev.item as CompanyResponse,
                    }
                }

                // If another person was selected with a company context, keep that context
                if (prev.type === 'person' && prev.companyContext) {
                    return {
                        type: 'person',
                        item: person,
                        mode: 'view',
                        companyContext: prev.companyContext,
                    }
                }

                // Otherwise, just select the person normally
                return {
                    type: 'person',
                    item: person,
                    mode: 'view',
                }
            })
        },
        [companyPeople],
    )

    // Debounced search for companies
    const debouncedSearch = useMemo(
        () => debounce((query: string) => setSearchQuery(query), 300),
        [],
    )

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            debouncedSearch(e.target.value)
        },
        [debouncedSearch],
    )

    // Debounced search for people
    const debouncedPeopleSearch = useMemo(
        () => debounce((query: string) => setPeopleSearchQuery(query), 300),
        [],
    )

    const handlePeopleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            debouncedPeopleSearch(e.target.value)
        },
        [debouncedPeopleSearch],
    )

    // Handle delete with protection for companies with people
    const handleDelete = async () => {
        if (!session?.accessToken || !deleteDialog.item) return

        try {
            if (deleteDialog.type === 'company') {
                // Check if company has people first
                const companyPeopleResponse =
                    await getCompanyPeopleApiV1ContactsCompaniesCompanyIdPeopleGet(
                        {
                            path: { company_id: deleteDialog.item.id },
                            headers: {
                                Authorization: `Bearer ${session.accessToken}`,
                            },
                        },
                    )

                if (
                    companyPeopleResponse.data &&
                    companyPeopleResponse.data.length > 0
                ) {
                    toast.error(
                        `Cannot delete company with ${companyPeopleResponse.data.length} associated people. Remove all people first.`,
                    )
                    setDeleteDialog({ open: false, item: null, type: null })
                    return
                }

                await deleteCompanyApiV1ContactsCompaniesCompanyIdDelete({
                    path: { company_id: deleteDialog.item.id },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Company deleted successfully')
            } else if (deleteDialog.type === 'person') {
                await deletePersonApiV1ContactsPeoplePersonIdDelete({
                    path: { person_id: deleteDialog.item.id },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Person deleted successfully')
            }

            fetchData()
            setSelected({ type: null, item: null, mode: 'view' })
            setDeleteDialog({ open: false, item: null, type: null })
        } catch (error) {
            console.error('Failed to delete:', error)
            toast.error('Failed to delete')
        }
    }

    // Get spouse IDs from marriages
    const getSpouseIds = useCallback(() => {
        if (!linkedPersonId) return []
        const spouseIds = marriages
            .map((marriage) =>
                marriage.person_id === linkedPersonId
                    ? marriage.spouse_id
                    : marriage.person_id,
            )
            .filter(Boolean)
        console.log(
            'Spouse IDs calculated:',
            spouseIds,
            'from marriages:',
            marriages,
            'linkedPersonId:',
            linkedPersonId,
        )
        return spouseIds
    }, [marriages, linkedPersonId])

    return (
        <div className="flex flex-col flex-1 h-full">
            <PageHeader
                title="Contacts"
                subtitle="Contacts Management"
                icon={Users}
            />

            <div className="grid grid-cols-4 gap-2 flex-1 min-h-0">
                {/* Column 1: Companies - 1/4 width */}
                <div className="col-span-1 flex flex-col">
                    <CompanyList
                        companies={filteredCompanies}
                        loading={loading}
                        selected={selected}
                        onSearchChange={handleSearchChange}
                        onCompanySelect={handleCompanySelect}
                        onCompanyDelete={(company) =>
                            setDeleteDialog({
                                open: true,
                                item: company,
                                type: 'company',
                            })
                        }
                        onAddCompany={() =>
                            setSelected({
                                type: 'company',
                                item: null,
                                mode: 'create',
                            })
                        }
                    />
                </div>

                {/* Column 2: People - 1/4 width */}
                <div className="col-span-1 flex flex-col">
                    <PeopleList
                        people={filteredPeople}
                        loading={loading}
                        selected={selected}
                        companyFilter={selected.companyContext}
                        linkedPersonId={linkedPersonId}
                        spouseIds={getSpouseIds()}
                        childIds={allChildren}
                        onSearchChange={handlePeopleSearchChange}
                        onPersonSelect={handlePersonSelect}
                        onPersonDelete={(person) =>
                            setDeleteDialog({
                                open: true,
                                item: person,
                                type: 'person',
                            })
                        }
                        onAddPerson={() =>
                            setSelected({
                                type: 'person',
                                item: null,
                                mode: 'create',
                            })
                        }
                    />
                </div>

                {/* Column 3: Detail Panel - 1/2 width */}
                <div className="col-span-2 flex flex-col border rounded-md bg-card">
                    <div className="flex-1 p-3">
                        {!selected.type ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>
                                        Select a company or person to view
                                        details
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <DetailForm
                                selected={selected}
                                onUpdate={fetchData}
                                onDelete={(item, type) =>
                                    setDeleteDialog({ open: true, item, type })
                                }
                                session={session}
                                linkedPersonId={linkedPersonId}
                                spouseIds={getSpouseIds()}
                                childIds={allChildren}
                            />
                        )}
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) =>
                        setDeleteDialog({ ...deleteDialog, open })
                    }
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Confirm Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete{' '}
                                {deleteDialog.type === 'company'
                                    ? 'this company'
                                    : 'this person'}
                                ? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleDelete}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
