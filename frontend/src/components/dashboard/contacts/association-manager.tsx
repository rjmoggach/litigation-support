'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
    Plus, 
    Search, 
    X, 
    Building2, 
    User, 
    Calendar,
    Briefcase,
    Star,
    AlertCircle,
    Loader2,
    Trash2,
    Edit
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface Company {
    id: number
    name: string
    slug: string
    profile?: {
        industry?: string
        size?: string
    }
}

interface Person {
    id: number
    first_name: string
    last_name: string
    full_name: string
    slug: string
    profile?: {
        title?: string
    }
}

interface Association {
    id?: number
    company_id: number
    person_id: number
    company?: Company
    person?: Person
    role?: string
    start_date?: string
    end_date?: string
    is_primary: boolean
    created_at?: string
    updated_at?: string
}

interface AssociationManagerProps {
    type: 'company' | 'person'
    entityId: number
    entityName: string
    associations: Association[]
    onAssociationCreate?: (association: Association) => void
    onAssociationUpdate?: (associationId: number, updates: Partial<Association>) => void
    onAssociationDelete?: (associationId: number) => void
    className?: string
}

// Search component for finding entities to associate
function EntitySearch({ 
    type, 
    onSelect, 
    excludeIds = []
}: { 
    type: 'company' | 'person'
    onSelect: (entity: Company | Person) => void
    excludeIds?: number[]
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<(Company | Person)[]>([])
    const [loading, setLoading] = useState(false)

    const searchEntities = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        setLoading(true)
        try {
            // TODO: Replace with actual API call when SDK is ready
            // const response = await api.contacts[type === 'company' ? 'companies' : 'people']({
            //     search: query,
            //     limit: 10
            // })
            
            // Mock search results
            await new Promise(resolve => setTimeout(resolve, 300))
            
            const mockResults = type === 'company' ? [
                { id: 1, name: "Tech Innovations Inc.", slug: "tech-innovations-inc", profile: { industry: "Technology", size: "medium" } },
                { id: 2, name: "Creative Studios", slug: "creative-studios", profile: { industry: "Creative Services", size: "small" } },
                { id: 3, name: "Global Solutions Ltd", slug: "global-solutions-ltd", profile: { industry: "Consulting", size: "large" } }
            ] : [
                { id: 1, first_name: "Sarah", last_name: "Johnson", full_name: "Sarah Johnson", slug: "sarah-johnson", profile: { title: "Senior Software Engineer" } },
                { id: 2, first_name: "Michael", last_name: "Chen", full_name: "Michael Chen", slug: "michael-chen", profile: { title: "Creative Director" } },
                { id: 3, first_name: "Emma", last_name: "Rodriguez", full_name: "Emma Rodriguez", slug: "emma-rodriguez", profile: { title: "Business Consultant" } }
            ]

            const filtered = mockResults.filter(entity => 
                !excludeIds.includes(entity.id) &&
                (type === 'company' 
                    ? (entity as Company).name.toLowerCase().includes(query.toLowerCase())
                    : (entity as Person).full_name.toLowerCase().includes(query.toLowerCase())
                )
            )

            setSearchResults(filtered)
        } catch (error) {
            console.error('Search error:', error)
            setSearchResults([])
        } finally {
            setLoading(false)
        }
    }, [type, excludeIds])

    useEffect(() => {
        const timer = setTimeout(() => {
            searchEntities(searchQuery)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, searchEntities])

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={`Search ${type === 'company' ? 'companies' : 'people'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {loading && (
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            )}

            {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-md">
                    {searchResults.map((entity) => (
                        <div
                            key={entity.id}
                            className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => onSelect(entity)}
                        >
                            <div className="flex items-center space-x-3">
                                {type === 'company' ? (
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="" alt={(entity as Person).full_name} />
                                        <AvatarFallback>
                                            {(entity as Person).first_name[0]}{(entity as Person).last_name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className="flex-1">
                                    <p className="font-medium">
                                        {type === 'company' ? (entity as Company).name : (entity as Person).full_name}
                                    </p>
                                    {entity.profile && (
                                        <p className="text-sm text-muted-foreground">
                                            {type === 'company' 
                                                ? (entity as Company).profile?.industry 
                                                : (entity as Person).profile?.title
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {searchQuery && !loading && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    No {type === 'company' ? 'companies' : 'people'} found matching "{searchQuery}"
                </p>
            )}
        </div>
    )
}

// Association form component
function AssociationForm({ 
    type,
    entityId,
    association,
    onSave,
    onCancel
}: {
    type: 'company' | 'person'
    entityId: number
    association?: Association
    onSave: (data: Partial<Association>) => void
    onCancel: () => void
}) {
    const [selectedEntity, setSelectedEntity] = useState<Company | Person | null>(
        association ? (type === 'company' ? association.person : association.company) || null : null
    )
    const [role, setRole] = useState(association?.role || '')
    const [startDate, setStartDate] = useState(association?.start_date || '')
    const [endDate, setEndDate] = useState(association?.end_date || '')
    const [isPrimary, setIsPrimary] = useState(association?.is_primary || false)
    const [loading, setLoading] = useState(false)

    const isEditing = !!association?.id

    const handleSave = async () => {
        if (!selectedEntity && !isEditing) {
            return
        }

        setLoading(true)
        try {
            const data: Partial<Association> = {
                role: role || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                is_primary: isPrimary
            }

            if (!isEditing && selectedEntity) {
                if (type === 'company') {
                    data.company_id = entityId
                    data.person_id = selectedEntity.id
                } else {
                    data.person_id = entityId
                    data.company_id = selectedEntity.id
                }
            }

            onSave(data)
        } catch (error) {
            console.error('Save error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {!isEditing && (
                <div>
                    <Label>Select {type === 'company' ? 'Person' : 'Company'}</Label>
                    <div className="mt-2">
                        {selectedEntity ? (
                            <div className="p-3 border rounded-md">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {type === 'company' ? (
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src="" alt={(selectedEntity as Person).full_name} />
                                                <AvatarFallback>
                                                    {(selectedEntity as Person).first_name[0]}{(selectedEntity as Person).last_name[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <Building2 className="h-8 w-8 text-muted-foreground" />
                                        )}
                                        <div>
                                            <p className="font-medium">
                                                {type === 'company' 
                                                    ? (selectedEntity as Person).full_name 
                                                    : (selectedEntity as Company).name
                                                }
                                            </p>
                                            {selectedEntity.profile && (
                                                <p className="text-sm text-muted-foreground">
                                                    {type === 'company' 
                                                        ? (selectedEntity as Person).profile?.title
                                                        : (selectedEntity as Company).profile?.industry
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedEntity(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <EntitySearch
                                type={type === 'company' ? 'person' : 'company'}
                                onSelect={setSelectedEntity}
                                excludeIds={[entityId]}
                            />
                        )}
                    </div>
                </div>
            )}

            <div>
                <Label htmlFor="role">Role/Position</Label>
                <Input
                    id="role"
                    type="text"
                    placeholder="e.g., CEO, Software Engineer, Consultant"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                        id="start_date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                        id="end_date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Leave empty for current position
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    id="is_primary"
                    checked={isPrimary}
                    onCheckedChange={setIsPrimary}
                />
                <Label htmlFor="is_primary">Primary association</Label>
            </div>

            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave} 
                    disabled={loading || (!selectedEntity && !isEditing)}
                >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEditing ? 'Update' : 'Create'} Association
                </Button>
            </div>
        </div>
    )
}

// Main AssociationManager component
export function AssociationManager({
    type,
    entityId,
    entityName,
    associations,
    onAssociationCreate,
    onAssociationUpdate,
    onAssociationDelete,
    className
}: AssociationManagerProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [editingAssociation, setEditingAssociation] = useState<Association | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const handleCreate = (data: Partial<Association>) => {
        onAssociationCreate?.(data as Association)
        setShowCreateDialog(false)
    }

    const handleUpdate = (data: Partial<Association>) => {
        if (editingAssociation?.id) {
            onAssociationUpdate?.(editingAssociation.id, data)
            setEditingAssociation(null)
        }
    }

    const handleDelete = async (associationId: number) => {
        setDeletingId(associationId)
        try {
            onAssociationDelete?.(associationId)
        } catch (error) {
            console.error('Delete error:', error)
        } finally {
            setDeletingId(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
    }

    return (
        <div className={cn("space-y-4", className)}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center">
                                {type === 'company' ? (
                                    <>
                                        <User className="h-5 w-5 mr-2" />
                                        Associated People
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="h-5 w-5 mr-2" />
                                        Associated Companies
                                    </>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Manage {type === 'company' ? 'people' : 'companies'} associated with {entityName}
                            </CardDescription>
                        </div>
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Association
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        Add {type === 'company' ? 'Person' : 'Company'} Association
                                    </DialogTitle>
                                    <DialogDescription>
                                        Associate a {type === 'company' ? 'person' : 'company'} with {entityName}
                                    </DialogDescription>
                                </DialogHeader>
                                <AssociationForm
                                    type={type}
                                    entityId={entityId}
                                    onSave={handleCreate}
                                    onCancel={() => setShowCreateDialog(false)}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {associations.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="mb-4">
                                {type === 'company' ? (
                                    <User className="h-12 w-12 text-muted-foreground mx-auto" />
                                ) : (
                                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No associations yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Start by adding {type === 'company' ? 'people' : 'companies'} associated with {entityName}
                            </p>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Association
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {associations.map((association) => {
                                const linkedEntity = type === 'company' ? association.person : association.company
                                if (!linkedEntity) return null

                                return (
                                    <div key={association.id || `${association.company_id}-${association.person_id}`} 
                                         className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3 flex-1">
                                                {type === 'company' ? (
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarImage src="" alt={(linkedEntity as Person).full_name} />
                                                        <AvatarFallback>
                                                            {(linkedEntity as Person).first_name[0]}{(linkedEntity as Person).last_name[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                                        <Building2 className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium">
                                                            {type === 'company' 
                                                                ? (linkedEntity as Person).full_name
                                                                : (linkedEntity as Company).name
                                                            }
                                                        </h4>
                                                        {association.is_primary && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <Star className="h-3 w-3 mr-1" />
                                                                Primary
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {association.role && (
                                                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                                            <Briefcase className="h-3 w-3 mr-1" />
                                                            {association.role}
                                                        </div>
                                                    )}
                                                    {(association.start_date || association.end_date) && (
                                                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {association.start_date && formatDate(association.start_date)}
                                                            {association.start_date && association.end_date && ' - '}
                                                            {association.end_date ? formatDate(association.end_date) : 
                                                             (association.start_date && 'Present')}
                                                        </div>
                                                    )}
                                                    {linkedEntity.profile && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {type === 'company' 
                                                                ? (linkedEntity as Person).profile?.title
                                                                : (linkedEntity as Company).profile?.industry
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingAssociation(association)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => association.id && handleDelete(association.id)}
                                                    disabled={deletingId === association.id}
                                                >
                                                    {deletingId === association.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingAssociation} onOpenChange={(open) => !open && setEditingAssociation(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Association</DialogTitle>
                        <DialogDescription>
                            Update the association details
                        </DialogDescription>
                    </DialogHeader>
                    {editingAssociation && (
                        <AssociationForm
                            type={type}
                            entityId={entityId}
                            association={editingAssociation}
                            onSave={handleUpdate}
                            onCancel={() => setEditingAssociation(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AssociationManager