'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { parseLocalDate } from '@/lib/date-utils'
import { format } from 'date-fns'
import { Baby, Edit, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface MarriageChild {
    marriage_id: number
    child_id: number
    custody_status: string
    custody_details?: string
    current_living_with: string
    custody_arrangement_file_id?: number
    created_at?: string
    updated_at?: string
}

interface Marriage {
    id: number
    person_id: number
    spouse_id: number
    marriage_date: string
    current_status: string
}

interface Person {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    gender?: string
}

interface ChildrenInformationProps {
    personId: number
    marriages: Marriage[]
    marriageChildren: { [marriageId: number]: MarriageChild[] }
    availablePeople: Person[]
    onAddChild: (
        marriageId: number,
        child: Omit<MarriageChild, 'marriage_id'>,
    ) => Promise<void>
    onUpdateChild: (
        marriageId: number,
        childId: number,
        child: Partial<MarriageChild>,
    ) => Promise<void>
    onRemoveChild: (marriageId: number, childId: number) => Promise<void>
    onCreateChild: (childData: { first_name: string; last_name: string; date_of_birth: string }) => Promise<{ id: number }>
    isLoading?: boolean
}

const CUSTODY_STATUSES = [
    { value: 'joint', label: 'Joint Custody' },
    { value: 'sole_person', label: 'Sole - Person' },
    { value: 'sole_spouse', label: 'Sole - Spouse' },
    { value: 'other', label: 'Other' },
]

const LIVING_WITH_OPTIONS = [
    { value: 'person', label: 'Person' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'shared', label: 'Shared/Both' },
    { value: 'other', label: 'Other' },
]

export function ChildrenInformation({
    personId,
    marriages,
    marriageChildren,
    availablePeople,
    onAddChild,
    onUpdateChild,
    onRemoveChild,
    onCreateChild,
    isLoading = false,
}: ChildrenInformationProps) {
    const [editingChild, setEditingChild] = useState<{
        marriage: Marriage
        child: MarriageChild
    } | null>(null)
    const [selectedMarriage, setSelectedMarriage] = useState<Marriage | null>(
        null,
    )
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleEditChild = (marriage: Marriage, child: MarriageChild) => {
        setEditingChild({ marriage, child })
        setSelectedMarriage(marriage)
        setIsDialogOpen(true)
    }

    const handleAddChild = (marriage: Marriage) => {
        setEditingChild(null)
        setSelectedMarriage(marriage)
        setIsDialogOpen(true)
    }

    const handleSave = async (
        childData: Omit<MarriageChild, 'marriage_id'>,
    ) => {
        if (!selectedMarriage) return

        try {
            if (editingChild) {
                await onUpdateChild(
                    selectedMarriage.id,
                    editingChild.child.child_id,
                    childData,
                )
                toast.success('Child information updated successfully')
            } else {
                await onAddChild(selectedMarriage.id, childData)
                toast.success('Child added to marriage successfully')
            }
            setIsDialogOpen(false)
            setEditingChild(null)
            setSelectedMarriage(null)
        } catch (error) {
            console.error('Child save error:', error)
            toast.error('Failed to save child information')
        }
    }

    const getPersonName = (personId: number) => {
        const person = availablePeople.find((p) => p.id === personId)
        return person
            ? `${person.first_name} ${person.last_name}`
            : `Person ID: ${personId}`
    }

    const getPersonAge = (personId: number) => {
        const person = availablePeople.find((p) => p.id === personId)
        if (!person?.date_of_birth) return null

        const birthDate = parseLocalDate(person.date_of_birth)
        if (!birthDate) return null
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
            return age - 1
        }
        return age
    }

    if (marriages.length === 0) {
        return (
            <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Baby className="size-5" />
                        Children Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Baby className="mx-auto size-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">
                            No Marriage Records
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Children information is associated with marriage
                            records. Add a marriage first.
                        </p>
                    </div>
                </CardContent>
            </>
        )
    }

    return (
        <>
            <CardHeader className="py-0 my-0">
                <CardTitle className="flex items-center gap-2 font-medium">
                    <Baby className="size-4" />
                    Children
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {marriages.map((marriage) => {
                        const children = marriageChildren[marriage.id] || []
                        const spouseName = getPersonName(marriage.spouse_id)

                        return (
                            <div
                                key={marriage.id}
                                className="border rounded-md p-3"
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                                    <div>
                                        <h3 className="font-medium">
                                            Marriage with {spouseName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Married{' '}
                                            {(() => {
                                                const marriageDate =
                                                    parseLocalDate(
                                                        marriage.marriage_date,
                                                    )
                                                return marriageDate
                                                    ? format(
                                                          marriageDate,
                                                          'MMM d, yyyy',
                                                      )
                                                    : 'Date not available'
                                            })()}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddChild(marriage)}
                                        disabled={isLoading}
                                    >
                                        <Plus className="size-4 mr-2" />
                                        Add Child
                                    </Button>
                                </div>

                                {children.length === 0 ? (
                                    <div className="text-center py-3 text-muted-foreground">
                                        <Users className="mx-auto size-8 mb-2" />
                                        <p className="text-sm">
                                            No children recorded for this
                                            marriage
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {children.map((child) => {
                                            const age = getPersonAge(
                                                child.child_id,
                                            )
                                            return (
                                                <div
                                                    key={child.child_id}
                                                    className="flex flex-col sm:flex-row items-start justify-between p-3 bg-muted/50 rounded-md gap-3"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h4 className="font-medium">
                                                                {getPersonName(
                                                                    child.child_id,
                                                                )}
                                                            </h4>
                                                            {age && (
                                                                <Badge variant="outline">
                                                                    Age {age}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground space-y-1">
                                                            <p>
                                                                <strong>
                                                                    Custody:
                                                                </strong>{' '}
                                                                {CUSTODY_STATUSES.find(
                                                                    (s) =>
                                                                        s.value ===
                                                                        child.custody_status,
                                                                )?.label ||
                                                                    child.custody_status}
                                                            </p>
                                                            <p>
                                                                <strong>
                                                                    Living with:
                                                                </strong>{' '}
                                                                {LIVING_WITH_OPTIONS.find(
                                                                    (o) =>
                                                                        o.value ===
                                                                        child.current_living_with,
                                                                )?.label ||
                                                                    child.current_living_with}
                                                            </p>
                                                            {child.custody_details && (
                                                                <p>
                                                                    <strong>
                                                                        Details:
                                                                    </strong>{' '}
                                                                    {
                                                                        child.custody_details
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleEditChild(
                                                                    marriage,
                                                                    child,
                                                                )
                                                            }
                                                            disabled={isLoading}
                                                        >
                                                            <Edit className="size-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={
                                                                        isLoading
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>
                                                                        Remove
                                                                        Child
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you
                                                                        sure you
                                                                        want to
                                                                        remove{' '}
                                                                        {getPersonName(
                                                                            child.child_id,
                                                                        )}{' '}
                                                                        from
                                                                        this
                                                                        marriage
                                                                        record?
                                                                        This
                                                                        action
                                                                        cannot
                                                                        be
                                                                        undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        Cancel
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() =>
                                                                            onRemoveChild(
                                                                                marriage.id,
                                                                                child.child_id,
                                                                            )
                                                                        }
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    >
                                                                        Remove
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <ChildFormDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    marriage={selectedMarriage}
                    child={editingChild?.child}
                    availablePeople={availablePeople}
                    onSave={handleSave}
                    onCreateChild={onCreateChild}
                    isLoading={isLoading}
                />
            </CardContent>
        </>
    )
}

interface ChildFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    marriage?: Marriage | null
    child?: MarriageChild | null
    availablePeople: Person[]
    onSave: (child: Omit<MarriageChild, 'marriage_id'>) => Promise<void>
    onCreateChild: (childData: { first_name: string; last_name: string; date_of_birth: string }) => Promise<{ id: number }>
    isLoading?: boolean
}

function ChildFormDialog({
    open,
    onOpenChange,
    marriage,
    child,
    availablePeople,
    onSave,
    onCreateChild,
    isLoading = false,
}: ChildFormDialogProps) {
    const [formData, setFormData] = useState<
        Omit<MarriageChild, 'marriage_id'>
    >({
        child_id: 0,
        custody_status: 'joint',
        custody_details: '',
        current_living_with: 'person',
        custody_arrangement_file_id: undefined,
    })
    
    const [newChildData, setNewChildData] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
    })
    
    const [addMode, setAddMode] = useState<'existing' | 'new'>('existing') // Default to selecting existing

    useEffect(() => {
        if (child) {
            setFormData({
                child_id: child.child_id,
                custody_status: child.custody_status,
                custody_details: child.custody_details || '',
                current_living_with: child.current_living_with,
                custody_arrangement_file_id: child.custody_arrangement_file_id,
            })
        } else {
            setFormData({
                child_id: 0,
                custody_status: 'joint',
                custody_details: '',
                current_living_with: 'person',
                custody_arrangement_file_id: undefined,
            })
            // Reset to existing mode when opening for new child
            setAddMode('existing')
        }
        
        // Reset new child form
        setNewChildData({
            first_name: '',
            last_name: '',
            date_of_birth: '',
        })
    }, [child, open])

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (child) {
            // Editing existing child - just save the custody info
            await onSave(formData)
        } else {
            // Adding new child to marriage
            if (addMode === 'existing') {
                // Adding existing person as child
                if (!formData.child_id || formData.child_id === 0) {
                    toast.error('Please select a person to add as child')
                    return
                }
                
                await onSave(formData)
            } else {
                // Creating new child - need to create child first, then add to marriage
                if (!newChildData.first_name.trim() || !newChildData.last_name.trim()) {
                    toast.error('First name and last name are required')
                    return
                }

                try {
                    // Create new child through onCreateChild function
                    const newChild = await onCreateChild(newChildData)
                    
                    // Then save the marriage child relationship
                    await onSave({
                        ...formData,
                        child_id: newChild.id
                    })
                } catch (error) {
                    console.error('Failed to create child:', error)
                    toast.error('Failed to create child')
                }
            }
        }
    }


    if (!marriage) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle>
                        {child
                            ? 'Edit Child Information'
                            : 'Add Child to Marriage'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-3">
                        {!child && (
                            <>
                                {/* Mode selection */}
                                <div className="space-y-2">
                                    <Label>Add Child Method</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={addMode === 'existing' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setAddMode('existing')}
                                        >
                                            Select Existing Person
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={addMode === 'new' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setAddMode('new')}
                                        >
                                            Create New Person
                                        </Button>
                                    </div>
                                </div>

                                {addMode === 'existing' ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="existing_child">Select Person *</Label>
                                        <Select
                                            value={formData.child_id ? String(formData.child_id) : ''}
                                            onValueChange={(value) => {
                                                handleInputChange('child_id', parseInt(value))
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a person to add as child" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availablePeople.map((person) => (
                                                    <SelectItem key={person.id} value={String(person.id)}>
                                                        {person.first_name} {person.last_name}
                                                        {person.date_of_birth && (
                                                            <span className="text-muted-foreground ml-2">
                                                                (DOB: {new Date(person.date_of_birth).toLocaleDateString()})
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {availablePeople.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                No people available. Create a new person instead.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Child Information</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor="child_first_name">First Name *</Label>
                                                    <Input
                                                        id="child_first_name"
                                                        value={newChildData.first_name}
                                                        onChange={(e) =>
                                                            setNewChildData(prev => ({
                                                                ...prev,
                                                                first_name: e.target.value
                                                            }))
                                                        }
                                                        placeholder="Enter first name"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="child_last_name">Last Name *</Label>
                                                    <Input
                                                        id="child_last_name"
                                                        value={newChildData.last_name}
                                                        onChange={(e) =>
                                                            setNewChildData(prev => ({
                                                                ...prev,
                                                                last_name: e.target.value
                                                            }))
                                                        }
                                                        placeholder="Enter last name"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="child_date_of_birth">Date of Birth</Label>
                                            <Input
                                                id="child_date_of_birth"
                                                type="date"
                                                value={newChildData.date_of_birth}
                                                onChange={(e) =>
                                                    setNewChildData(prev => ({
                                                        ...prev,
                                                        date_of_birth: e.target.value
                                                    }))
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="custody_status">
                                    Custody Status *
                                </Label>
                                <Select
                                    value={formData.custody_status}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            'custody_status',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select custody status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CUSTODY_STATUSES.map((status) => (
                                            <SelectItem
                                                key={status.value}
                                                value={status.value}
                                            >
                                                {status.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="current_living_with">
                                    Currently Living With *
                                </Label>
                                <Select
                                    value={formData.current_living_with}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            'current_living_with',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select living arrangement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LIVING_WITH_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="custody_details">
                                Custody Details
                            </Label>
                            <Textarea
                                id="custody_details"
                                value={formData.custody_details || ''}
                                onChange={(e) =>
                                    handleInputChange(
                                        'custody_details',
                                        e.target.value,
                                    )
                                }
                                placeholder="Additional custody arrangement details..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : child ? 'Update Child Information' : 'Add Child to Marriage'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
