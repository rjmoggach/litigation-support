'use client'

import {
    createPersonColumns,
    personStatusOptions,
    personVisibilityOptions,
} from '@/components/contacts/people/person-columns'
import { PersonEditDialog } from '@/components/contacts/people/person-edit-dialog'
import { PageHeader } from '@/components/dashboard/page-header'
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table'
import { Button } from '@/components/ui/button'
import type { PersonResponse } from '@/lib/api'
import {
    createPersonApiV1ContactsPeoplePost,
    deletePersonApiV1ContactsPeoplePersonIdDelete,
    listPeopleApiV1ContactsPeopleGet,
    updatePersonApiV1ContactsPeoplePersonIdPut,
} from '@/lib/api'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { Plus, RefreshCw, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

export default function PeoplePage() {
    const { data: session } = useSession()
    const [people, setPeople] = useState<PersonResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPerson, setSelectedPerson] = useState<PersonResponse | null>(
        null,
    )
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // Update breadcrumb when this page loads
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/' },
        { label: 'Contacts', href: '//contacts' },
        { label: 'People', active: true },
    ])

    // Fetch people from API
    const fetchPeople = useCallback(async () => {
        if (!session?.accessToken) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const response = await listPeopleApiV1ContactsPeopleGet({
                query: {
                    limit: 1000, // Get all people for client-side processing
                },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.data) {
                setPeople(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch people:', error)
            toast.error('Failed to load people')
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        fetchPeople()
    }, [fetchPeople])

    const handlePersonEdit = useCallback((person: PersonResponse) => {
        setSelectedPerson(person)
        setIsCreating(false)
        setEditDialogOpen(true)
    }, [])

    const handlePersonCreate = useCallback(() => {
        setSelectedPerson(null)
        setIsCreating(true)
        setEditDialogOpen(true)
    }, [])

    const handlePersonSave = async (personId: number | null, data: any) => {
        if (!session?.accessToken) return

        try {
            if (personId) {
                // Update existing person
                await updatePersonApiV1ContactsPeoplePersonIdPut({
                    path: { person_id: personId },
                    body: {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        email: data.email,
                        phone: data.phone,
                        is_active: data.is_active,
                        is_public: data.is_public,
                    },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Person updated successfully')
            } else {
                // Create new person
                await createPersonApiV1ContactsPeoplePost({
                    body: {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        email: data.email,
                        phone: data.phone,
                        is_active: data.is_active,
                        is_public: data.is_public,
                    },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Person created successfully')
            }

            fetchPeople() // Refresh the list
        } catch (error) {
            console.error('Failed to save person:', error)
            toast.error(
                personId
                    ? 'Failed to update person'
                    : 'Failed to create person',
            )
            throw error
        }
    }

    const handlePersonDelete = useCallback(
        async (person: PersonResponse) => {
            if (!session?.accessToken) return

            try {
                await deletePersonApiV1ContactsPeoplePersonIdDelete({
                    path: { person_id: person.id },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })

                toast.success(`Person ${person.full_name} deleted successfully`)
                fetchPeople() // Refresh the list
            } catch (error) {
                console.error('Failed to delete person:', error)
                toast.error('Failed to delete person')
            }
        },
        [session?.accessToken, fetchPeople],
    )

    const handleRefresh = () => {
        fetchPeople()
    }

    // Create columns with edit and delete handlers (memoized to prevent infinite updates)
    const columns = useMemo(
        () =>
            createPersonColumns(
                handlePersonEdit,
                handlePersonDelete,
                people.length,
            ),
        [handlePersonEdit, handlePersonDelete, people.length],
    )

    // Configure the toolbar (memoized to prevent re-renders)
    const toolbarConfig = useMemo(
        () => ({
            searchColumn: 'person',
            searchPlaceholder: 'Search people by name or email...',
            facetedFilters: [
                {
                    column: 'status',
                    title: 'Status',
                    options: personStatusOptions,
                },
                {
                    column: 'visibility',
                    title: 'Visibility',
                    options: personVisibilityOptions,
                },
            ],
        }),
        [],
    )

    return (
        <>
            <PageHeader title="People" subtitle="Manage people" icon={User}>
                <>
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handlePersonCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                    </Button>
                </>
            </PageHeader>

            <FlexibleDataTable
                columns={columns}
                data={people}
                toolbarConfig={toolbarConfig}
                loading={loading}
                onRowClick={handlePersonEdit}
            />

            <PersonEditDialog
                person={selectedPerson}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSave={handlePersonSave}
                isCreating={isCreating}
            />
        </>
    )
}
