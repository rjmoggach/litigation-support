'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CompanyResponse, PersonResponse } from '@/lib/api'
import { Plus, Search, Trash2, Users } from 'lucide-react'
import { SelectedItem } from './detail-form'

interface PeopleListProps {
    people: PersonResponse[]
    loading: boolean
    selected: SelectedItem
    companyFilter?: CompanyResponse | null
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onPersonSelect: (person: PersonResponse) => void
    onPersonDelete: (person: PersonResponse) => void
    onAddPerson: () => void
}

export function PeopleList({
    people,
    loading,
    selected,
    onSearchChange,
    onPersonSelect,
    onPersonDelete,
    onAddPerson,
}: PeopleListProps) {
    return (
        <Card className="w-80 flex flex-col pt-4 pb-0">
            <CardHeader className="px-2">
                <CardTitle className="flex items-center gap-2 text-lg px-2">
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
                </CardTitle>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search people..."
                        className="pl-9"
                        onChange={onSearchChange}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 border-t border-border">
                    <div>
                        {loading ? (
                            <div className="p-4">Loading...</div>
                        ) : (
                            people.map((person) => (
                                <div
                                    key={person.id}
                                    onClick={() => onPersonSelect(person)}
                                    className={`group px-4 py-2 border-b cursor-pointer transition-colors  hover:bg-accent/35 ${
                                        selected.type === 'person' &&
                                        selected.item?.id === person.id
                                            ? 'bg-accent/55 hover:bg-accent/55 border-l-4 border-l-primary'
                                            : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {person.full_name}
                                            </div>
                                            {person.email && (
                                                <div className="text-sm text-muted-foreground truncate">
                                                    {person.email}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 ml-2"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onPersonDelete(person)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
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
            </CardContent>
        </Card>
    )
}
