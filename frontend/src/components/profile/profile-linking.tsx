'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { listPeopleApiV1ContactsPeopleGet } from '@/lib/api/sdk.gen'
import { Check, Search, User, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Person {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    gender?: string
    full_name?: string
    slug?: string
    is_active?: boolean
    is_public?: boolean
}

interface ProfileLinkingProps {
    currentPersonId?: number | null
    linkedPerson?: Person | null
    onLinkPerson: (personId: number) => Promise<void>
    onUnlinkPerson: () => Promise<void>
    onCreateAndLink?: (personData: {
        first_name: string
        last_name: string
        email?: string
        phone?: string
    }) => Promise<void>
    isLoading?: boolean
}

export function ProfileLinking({
    currentPersonId,
    linkedPerson,
    onLinkPerson,
    onUnlinkPerson,
    onCreateAndLink,
    isLoading = false,
}: ProfileLinkingProps) {
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [searchResults, setSearchResults] = useState<Person[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
        null,
    )

    // Search for existing people in the system
    const searchPeople = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        console.log('Searching for people with query:', query)
        setIsSearching(true)
        try {
            console.log(
                'Making API call to listPeopleApiV1ContactsPeopleGet...',
            )
            const response = await listPeopleApiV1ContactsPeopleGet({
                query: { search: query },
            })
            console.log('Full API response:', response)
            console.log('Response type:', typeof response)
            console.log('Is response array:', Array.isArray(response))

            // Check if response has a data property (common API pattern)
            const people = response?.data || response
            console.log('Extracted people:', people)
            console.log('People type:', typeof people)
            console.log('Is people array:', Array.isArray(people))

            setSearchResults(Array.isArray(people) ? people : [])
        } catch (error) {
            console.error('Search error:', error)
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                response: error.response,
            })
            setSearchResults([])
        } finally {
            setIsSearching(false)
        }
    }

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            searchPeople(searchQuery)
        }, 300)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery])

    const handleLinkSelected = async () => {
        if (!selectedPersonId) {
            toast.error('Please select a person to link')
            return
        }

        try {
            await onLinkPerson(selectedPersonId)
            setIsLinkDialogOpen(false)
            setSelectedPersonId(null)
            setSearchQuery('')
            setSearchResults([])
            toast.success('Profile linked successfully')
        } catch (error) {
            console.error('Link error:', error)
            toast.error('Failed to link profile')
        }
    }

    const [newPersonData, setNewPersonData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    })

    const handleCreateAndLink = async (e: React.FormEvent) => {
        e.preventDefault()

        if (
            !newPersonData.first_name.trim() ||
            !newPersonData.last_name.trim()
        ) {
            toast.error('First name and last name are required')
            return
        }

        if (!onCreateAndLink) {
            toast.error('Create and link functionality not available')
            return
        }

        try {
            await onCreateAndLink(newPersonData)
            setIsCreateDialogOpen(false)
            setNewPersonData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
            })
            toast.success('Person created and profile linked successfully')
        } catch (error) {
            console.error('Create and link error:', error)
            toast.error('Failed to create person and link profile')
        }
    }

    const getPersonInitials = (person: Person) => {
        console.log('getPersonInitials called with person:', person)
        console.log('first_name:', person?.first_name)
        console.log('last_name:', person?.last_name)
        console.log('full_name:', person?.full_name)
        console.log('email:', person?.email)

        if (!person.first_name || !person.last_name) {
            // If we don't have both names, fall back to full_name or email
            if (person.full_name) {
                const names = person.full_name.split(' ')
                const firstInitial = names[0]?.[0] || '?'
                const lastInitial = names[names.length - 1]?.[0] || '?'
                const result = `${firstInitial}${lastInitial}`.toUpperCase()
                console.log('Using full_name, returning:', result)
                return result
            }
            if (person.email) {
                const result = person.email.substring(0, 2).toUpperCase()
                console.log('Using email, returning:', result)
                return result
            }
            console.log('Returning ?? - no names or email found')
            return '??'
        }

        const firstInitial = person.first_name[0] || '?'
        const lastInitial = person.last_name[0] || '?'
        const result = `${firstInitial}${lastInitial}`.toUpperCase()
        console.log('Using first/last name, returning:', result)
        return result
    }

    if (linkedPerson) {
        return null
    }

    return (
        <>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="size-5" />
                    Link Person Record
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8">
                    <User className="mx-auto size-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">
                        No Person Record Linked
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Link your user account to a person record to manage
                        personal information, addresses, marriages, and
                        children.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        <strong>New user?</strong> Create a new person record
                        below.
                    </p>
                    <div className="flex flex-col gap-3 justify-center">
                        <Dialog
                            open={isLinkDialogOpen}
                            onOpenChange={setIsLinkDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button disabled={isLoading}>
                                    <User className="size-4 mr-2" />
                                    Link Existing Person
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl mx-4 sm:mx-0">
                                <DialogHeader>
                                    <DialogTitle>
                                        Link to Existing Person
                                    </DialogTitle>
                                    <DialogDescription>
                                        Search for an existing person in the
                                        system to link to your profile.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Search for Person</Label>
                                        <div className="border rounded-md">
                                            <div className="flex items-center border-b px-3">
                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                <Input
                                                    placeholder="Search by name or email..."
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="border-0 p-0 focus-visible:ring-0"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-auto p-1">
                                                {(() => {
                                                    console.log(
                                                        'Rendering logic check:',
                                                    )
                                                    console.log(
                                                        'isSearching:',
                                                        isSearching,
                                                    )
                                                    console.log(
                                                        'searchResults:',
                                                        searchResults,
                                                    )
                                                    console.log(
                                                        'searchResults.length:',
                                                        searchResults?.length,
                                                    )
                                                    console.log(
                                                        'searchQuery:',
                                                        searchQuery,
                                                    )
                                                    console.log(
                                                        'Array.isArray(searchResults):',
                                                        Array.isArray(
                                                            searchResults,
                                                        ),
                                                    )

                                                    if (isSearching) {
                                                        console.log(
                                                            'Showing searching...',
                                                        )
                                                        return (
                                                            <div className="p-3 text-center text-sm text-muted-foreground">
                                                                Searching...
                                                            </div>
                                                        )
                                                    }

                                                    if (
                                                        Array.isArray(
                                                            searchResults,
                                                        ) &&
                                                        searchResults.length ===
                                                            0 &&
                                                        searchQuery
                                                    ) {
                                                        console.log(
                                                            'Showing no results...',
                                                        )
                                                        return (
                                                            <div className="text-center py-4">
                                                                <p>
                                                                    No people
                                                                    found.
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mt-2">
                                                                    Use the
                                                                    "Create New
                                                                    Person"
                                                                    button below
                                                                    to create a
                                                                    new record.
                                                                </p>
                                                            </div>
                                                        )
                                                    }

                                                    if (
                                                        Array.isArray(
                                                            searchResults,
                                                        ) &&
                                                        searchResults.length > 0
                                                    ) {
                                                        console.log(
                                                            'Showing search results:',
                                                            searchResults.length,
                                                            'items',
                                                        )
                                                        return (
                                                            <div className="space-y-1">
                                                                {searchResults.map(
                                                                    (
                                                                        person,
                                                                    ) => {
                                                                        const age =
                                                                            person.date_of_birth
                                                                                ? new Date().getFullYear() -
                                                                                  new Date(
                                                                                      person.date_of_birth,
                                                                                  ).getFullYear()
                                                                                : null
                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    person.id
                                                                                }
                                                                                onClick={() =>
                                                                                    setSelectedPersonId(
                                                                                        person.id,
                                                                                    )
                                                                                }
                                                                                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-accent ${
                                                                                    selectedPersonId ===
                                                                                    person.id
                                                                                        ? 'bg-accent'
                                                                                        : ''
                                                                                }`}
                                                                            >
                                                                                <Avatar className="size-8">
                                                                                    <AvatarFallback className="text-xs">
                                                                                        {getPersonInitials(
                                                                                            person,
                                                                                        )}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-medium">
                                                                                            {
                                                                                                person.first_name
                                                                                            }{' '}
                                                                                            {
                                                                                                person.last_name
                                                                                            }
                                                                                        </span>
                                                                                        {selectedPersonId ===
                                                                                            person.id && (
                                                                                            <Check className="size-4 text-green-600" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {person.email && (
                                                                                            <span>
                                                                                                {
                                                                                                    person.email
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                        {person.email &&
                                                                                            person.phone && (
                                                                                                <span>
                                                                                                    {' '}
                                                                                                    •{' '}
                                                                                                </span>
                                                                                            )}
                                                                                        {person.phone && (
                                                                                            <span>
                                                                                                {
                                                                                                    person.phone
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                        {age && (
                                                                                            <span>
                                                                                                {' '}
                                                                                                •
                                                                                                Age{' '}
                                                                                                {
                                                                                                    age
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    },
                                                                )}
                                                            </div>
                                                        )
                                                    }

                                                    // Default case - no search query or no results
                                                    console.log(
                                                        'Showing default state - no search query',
                                                    )
                                                    return (
                                                        <div className="p-3 text-center text-sm text-muted-foreground">
                                                            Start typing to
                                                            search for people...
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setIsLinkDialogOpen(false)
                                            }
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleLinkSelected}
                                            disabled={
                                                !selectedPersonId || isLoading
                                            }
                                        >
                                            Link Selected Person
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog
                            open={isCreateDialogOpen}
                            onOpenChange={setIsCreateDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={isLoading}>
                                    <UserPlus className="size-4 mr-2" />
                                    Create New Person
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Create New Person and Link
                                    </DialogTitle>
                                    <DialogDescription>
                                        Create a new person record and link it
                                        to your profile.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={handleCreateAndLink}
                                    className="space-y-3"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="new_first_name">
                                                First Name *
                                            </Label>
                                            <Input
                                                id="new_first_name"
                                                value={newPersonData.first_name}
                                                onChange={(e) =>
                                                    setNewPersonData(
                                                        (prev) => ({
                                                            ...prev,
                                                            first_name:
                                                                e.target.value,
                                                        }),
                                                    )
                                                }
                                                placeholder="Enter first name"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new_last_name">
                                                Last Name *
                                            </Label>
                                            <Input
                                                id="new_last_name"
                                                value={newPersonData.last_name}
                                                onChange={(e) =>
                                                    setNewPersonData(
                                                        (prev) => ({
                                                            ...prev,
                                                            last_name:
                                                                e.target.value,
                                                        }),
                                                    )
                                                }
                                                placeholder="Enter last name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="new_email">
                                            Email Address
                                        </Label>
                                        <Input
                                            id="new_email"
                                            type="email"
                                            value={newPersonData.email}
                                            onChange={(e) =>
                                                setNewPersonData((prev) => ({
                                                    ...prev,
                                                    email: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="new_phone">
                                            Phone Number
                                        </Label>
                                        <Input
                                            id="new_phone"
                                            type="tel"
                                            value={newPersonData.phone}
                                            onChange={(e) =>
                                                setNewPersonData((prev) => ({
                                                    ...prev,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setIsCreateDialogOpen(false)
                                            }
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            {isLoading
                                                ? 'Creating...'
                                                : 'Create and Link'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardContent>
        </>
    )
}
