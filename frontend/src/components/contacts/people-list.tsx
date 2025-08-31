'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CompanyResponse, PersonResponse } from '@/lib/api'
import { Baby, HeartCrack, Plus, Search, Trash2, Users } from 'lucide-react'
import type { SelectedItem } from './types'

interface PeopleListProps {
    people: PersonResponse[]
    loading: boolean
    selected: SelectedItem
    companyFilter?: CompanyResponse | null
    linkedPersonId?: number | null
    spouseIds?: number[]
    childIds?: number[]
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onPersonSelect: (person: PersonResponse) => void
    onPersonDelete: (person: PersonResponse) => void
    onAddPerson: () => void
}

export function PeopleList({
    people,
    loading,
    selected,
    linkedPersonId,
    spouseIds = [],
    childIds = [],
    onSearchChange,
    onPersonSelect,
    onPersonDelete,
    onAddPerson,
}: PeopleListProps) {
    // Helper functions for relationship identification
    const isMe = (person: PersonResponse) => linkedPersonId === person.id
    const isSpouse = (person: PersonResponse) => {
        const result = spouseIds.includes(person.id)
        if (result)
            console.log(
                `Person ${person.full_name} (ID: ${person.id}) identified as spouse`,
            )
        return result
    }
    const isChild = (person: PersonResponse) => childIds.includes(person.id)

    // Debug logging
    console.log('PeopleList relationship data:', {
        linkedPersonId,
        spouseIds,
        childIds,
    })
    return (
        <div className="h-full flex flex-col border rounded-sm bg-card">
            <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <Users className="h-5 w-5" />
                    People
                    {((selected.type === 'company' && selected.item) ||
                        (selected.type === 'person' &&
                            selected.companyContext)) && (
                        <Badge variant="outline" className="text-xs">
                            at{' '}
                            {selected.type === 'company'
                                ? (selected.item as CompanyResponse).name
                                : selected.companyContext!.name}{' '}
                            ({people.length})
                        </Badge>
                    )}
                    {selected.type !== 'company' &&
                        !selected.companyContext && (
                            <Badge variant="secondary" className="text-xs">
                                ({people.length})
                            </Badge>
                        )}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search people..."
                        className="pl-9"
                        onChange={onSearchChange}
                    />
                </div>
            </div>
            <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 ">
                    <div>
                        {loading ? (
                            <div className="p-3">Loading...</div>
                        ) : (
                            people.map((person) => (
                                <div
                                    key={person.id}
                                    onClick={() => onPersonSelect(person)}
                                    className={`group px-4 py-2 border-b cursor-pointer transition-colors  hover:bg-accent/35 ${
                                        selected.type === 'person' &&
                                        selected.item?.id === person.id
                                            ? 'bg-accent/55 hover:bg-accent/55 border-l-4 border-l-accent-foreground'
                                            : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {person.full_name}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 mr-2">
                                            {/* Show "Me" badge only for the current user */}
                                            {isMe(person) && (
                                                <Badge
                                                    variant="default"
                                                    className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                >
                                                    Me
                                                </Badge>
                                            )}

                                            {/* Show child icon for children */}
                                            {isChild(person) && (
                                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                                    <Baby className="h-3 w-3" />
                                                </div>
                                            )}

                                            {/* Show heart crack icon for ex-spouses */}
                                            {isSpouse(person) && (
                                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                                    <HeartCrack className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onPersonDelete(person)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={onAddPerson}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                    </Button>
                </div>
            </div>
        </div>
    )
}
