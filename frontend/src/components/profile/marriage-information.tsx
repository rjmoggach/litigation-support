'use client'

import { CalendarWidget } from '@/components/calendar-widget'
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { COUNTRIES, getAddressFormat } from '@/lib/address-formats'
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Edit, HeartHandshake, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Marriage {
    id?: number
    person_id: number
    spouse_id: number
    marriage_date: string
    marriage_location?: {
        city?: string
        state?: string
        country?: string
    }
    separation_date?: string
    divorce_date?: string
    current_status: string
    marriage_certificate_file_id?: number
    divorce_decree_file_id?: number
    created_at?: string
    updated_at?: string
}

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

interface Person {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    gender?: string
}

interface MarriageInformationProps {
    personId: number
    marriages: Marriage[]
    availablePeople: Person[]
    onCreateMarriage: (marriage: Omit<Marriage, 'id'>) => Promise<void>
    onUpdateMarriage: (id: number, marriage: Partial<Marriage>) => Promise<void>
    onDeleteMarriage: (id: number) => Promise<void>
    onAddChild: (
        marriageId: number,
        child: Omit<MarriageChild, 'marriage_id'>,
    ) => Promise<void>
    isLoading?: boolean
}

const MARRIAGE_STATUSES = [
    { value: 'married', label: 'Married' },
    { value: 'separated', label: 'Separated' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'annulled', label: 'Annulled' },
]

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

export function MarriageInformation({
    personId,
    marriages,
    availablePeople,
    onCreateMarriage,
    onUpdateMarriage,
    onDeleteMarriage,
    onAddChild,
    isLoading = false,
}: MarriageInformationProps) {
    const [editingMarriage, setEditingMarriage] = useState<Marriage | null>(
        null,
    )
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleEdit = (marriage: Marriage) => {
        setEditingMarriage(marriage)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setEditingMarriage(null)
        setIsDialogOpen(true)
    }

    const handleSave = async (marriageData: Omit<Marriage, 'id'>) => {
        try {
            if (editingMarriage?.id) {
                await onUpdateMarriage(editingMarriage.id, marriageData)
                toast.success('Marriage information updated successfully')
            } else {
                await onCreateMarriage(marriageData)
                toast.success('Marriage record created successfully')
            }
            setIsDialogOpen(false)
            setEditingMarriage(null)
        } catch (error) {
            console.error('Marriage save error:', error)
            toast.error('Failed to save marriage information')
        }
    }

    const sortedMarriages = [...marriages].sort((a, b) => {
        const dateA = parseLocalDate(a.marriage_date)
        const dateB = parseLocalDate(b.marriage_date)
        if (!dateA || !dateB) return 0
        return dateB.getTime() - dateA.getTime()
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'married':
                return 'bg-green-100 text-green-800'
            case 'separated':
                return 'bg-yellow-100 text-yellow-800'
            case 'divorced':
                return 'bg-red-100 text-red-800'
            case 'annulled':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getSpouseName = (spouseId: number) => {
        const spouse = (
            Array.isArray(availablePeople) ? availablePeople : []
        ).find((p) => p.id === spouseId)
        return spouse
            ? `${spouse.first_name} ${spouse.last_name}`
            : `Person ID: ${spouseId}`
    }

    return (
        <>
            <CardHeader className="py-0 my-0">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-medium">
                    <div className="flex items-center gap-2">
                        <HeartHandshake className="size-4" />
                        Marriages
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreate}
                        disabled={isLoading}
                    >
                        <Plus className="size-4 mr-2" />
                        Add Marriage
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {marriages.length === 0 ? (
                    <div className="text-center py-8">
                        <HeartHandshake className="mx-auto size-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">
                            No Marriage Records
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add marriage information to track relationship
                            history
                        </p>
                        <Button onClick={handleCreate} disabled={isLoading}>
                            <Plus className="size-4 mr-2" />
                            Add First Marriage
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedMarriages.map((marriage, index) => (
                            <div
                                key={marriage.id || `marriage-${index}`}
                                className="flex flex-col sm:flex-row items-start justify-between p-3 border rounded-md gap-3"
                            >
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h4 className="font-medium">
                                            {getSpouseName(marriage.spouse_id)}
                                        </h4>
                                        <Badge
                                            className={getStatusColor(
                                                marriage.current_status,
                                            )}
                                        >
                                            {MARRIAGE_STATUSES.find(
                                                (s) =>
                                                    s.value ===
                                                    marriage.current_status,
                                            )?.label || marriage.current_status}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p>
                                            <strong>Married:</strong>{' '}
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
                                            {marriage.marriage_location && (
                                                <span>
                                                    {' '}
                                                    in{' '}
                                                    {
                                                        marriage
                                                            .marriage_location
                                                            .city
                                                    }
                                                    ,{' '}
                                                    {
                                                        marriage
                                                            .marriage_location
                                                            .state
                                                    }
                                                </span>
                                            )}
                                        </p>
                                        {(() => {
                                            const separationDate =
                                                parseLocalDate(
                                                    marriage.separation_date,
                                                )
                                            return separationDate ? (
                                                <p>
                                                    <strong>Separated:</strong>{' '}
                                                    {format(
                                                        separationDate,
                                                        'MMM d, yyyy',
                                                    )}
                                                </p>
                                            ) : null
                                        })()}
                                        {(() => {
                                            const divorceDate = parseLocalDate(
                                                marriage.divorce_date,
                                            )
                                            return divorceDate ? (
                                                <p>
                                                    <strong>Divorced:</strong>{' '}
                                                    {format(
                                                        divorceDate,
                                                        'MMM d, yyyy',
                                                    )}
                                                </p>
                                            ) : null
                                        })()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(marriage)}
                                        disabled={isLoading}
                                    >
                                        <Edit className="size-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={isLoading}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Delete Marriage Record
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to
                                                    delete this marriage record?
                                                    This will also remove all
                                                    associated children
                                                    information. This action
                                                    cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() =>
                                                        marriage.id &&
                                                        onDeleteMarriage(
                                                            marriage.id,
                                                        )
                                                    }
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <MarriageFormDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    personId={personId}
                    marriage={editingMarriage}
                    availablePeople={availablePeople}
                    onSave={handleSave}
                    isLoading={isLoading}
                />
            </CardContent>
        </>
    )
}

interface MarriageFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    personId: number
    marriage?: Marriage | null
    availablePeople: Person[]
    onSave: (marriage: Omit<Marriage, 'id'>) => Promise<void>
    isLoading?: boolean
}

function MarriageFormDialog({
    open,
    onOpenChange,
    personId,
    marriage,
    availablePeople,
    onSave,
    isLoading = false,
}: MarriageFormDialogProps) {
    const [formData, setFormData] = useState<Omit<Marriage, 'id'>>({
        person_id: personId,
        spouse_id: 0,
        marriage_date: format(new Date(), 'yyyy-MM-dd'),
        marriage_location: { city: '', state: '', country: 'US' },
        separation_date: '',
        divorce_date: '',
        current_status: 'married',
        marriage_certificate_file_id: undefined,
        divorce_decree_file_id: undefined,
    })
    const [marriageDate, setMarriageDate] = useState<Date>()
    const [separationDate, setSeparationDate] = useState<Date>()
    const [divorceDate, setDivorceDate] = useState<Date>()

    useEffect(() => {
        if (open) {
            if (marriage) {
                setFormData({
                    person_id: marriage.person_id,
                    spouse_id: marriage.spouse_id,
                    marriage_date: marriage.marriage_date,
                    marriage_location: marriage.marriage_location || {
                        city: '',
                        state: '',
                        country: 'US',
                    },
                    separation_date: marriage.separation_date || '',
                    divorce_date: marriage.divorce_date || '',
                    current_status: marriage.current_status,
                    marriage_certificate_file_id:
                        marriage.marriage_certificate_file_id,
                    divorce_decree_file_id: marriage.divorce_decree_file_id,
                })
                // Parse and set the dates properly using local date parsing
                if (marriage.marriage_date) {
                    const marriageDateObj = parseLocalDate(
                        marriage.marriage_date,
                    )
                    if (marriageDateObj) {
                        setMarriageDate(marriageDateObj)
                    }
                }
                if (marriage.separation_date) {
                    const separationDateObj = parseLocalDate(
                        marriage.separation_date,
                    )
                    if (separationDateObj) {
                        setSeparationDate(separationDateObj)
                    }
                }
                if (marriage.divorce_date) {
                    const divorceDateObj = parseLocalDate(marriage.divorce_date)
                    if (divorceDateObj) {
                        setDivorceDate(divorceDateObj)
                    }
                }
            } else {
                // Reset for new marriage
                const today = new Date()
                setFormData({
                    person_id: personId,
                    spouse_id: 0,
                    marriage_date: formatLocalDate(today),
                    marriage_location: { city: '', state: '', country: 'US' },
                    separation_date: '',
                    divorce_date: '',
                    current_status: 'married',
                    marriage_certificate_file_id: undefined,
                    divorce_decree_file_id: undefined,
                })
                setMarriageDate(today)
                setSeparationDate(undefined)
                setDivorceDate(undefined)
            }
        }
    }, [marriage, personId, open])

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleLocationChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            marriage_location: {
                ...prev.marriage_location,
                [field]: value,
            },
        }))
    }

    const handleMarriageDateSelect = (date: Date | undefined) => {
        setMarriageDate(date)
        setFormData((prev) => ({
            ...prev,
            marriage_date: formatLocalDate(date),
        }))
    }

    const handleSeparationDateSelect = (date: Date | undefined) => {
        setSeparationDate(date)
        setFormData((prev) => ({
            ...prev,
            separation_date: formatLocalDate(date),
        }))
    }

    const handleDivorceDateSelect = (date: Date | undefined) => {
        setDivorceDate(date)
        setFormData((prev) => ({
            ...prev,
            divorce_date: formatLocalDate(date),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        console.log('Marriage form submit started')
        console.log('Form data:', formData)

        if (!formData.spouse_id || !formData.marriage_date) {
            console.log('Validation failed: missing spouse or marriage date')
            toast.error('Spouse and marriage date are required')
            return
        }

        // Validate date logic
        if (separationDate && marriageDate && separationDate < marriageDate) {
            console.log(
                'Validation failed: separation date before marriage date',
            )
            toast.error('Separation date cannot be before marriage date')
            return
        }

        if (divorceDate && separationDate && divorceDate < separationDate) {
            console.log(
                'Validation failed: divorce date before separation date',
            )
            toast.error('Divorce date cannot be before separation date')
            return
        }

        console.log('About to call onSave with:', formData)
        console.log('onSave function:', onSave)
        try {
            await onSave(formData)
            console.log('onSave completed successfully')
        } catch (error) {
            console.error('onSave failed:', error)
        }
    }

    const availableSpouses = (
        Array.isArray(availablePeople) ? availablePeople : []
    ).filter((p) => p.id !== personId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl mx-4 sm:mx-0">
                <DialogHeader>
                    <DialogTitle>
                        {marriage ? 'Edit Marriage Record' : 'Add New Marriage'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Basic Marriage Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                            Marriage Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="spouse_id">Spouse *</Label>
                                <Select
                                    value={formData.spouse_id.toString()}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            'spouse_id',
                                            parseInt(value),
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select spouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSpouses.map((person) => (
                                            <SelectItem
                                                key={person.id}
                                                value={person.id.toString()}
                                            >
                                                {person.first_name}{' '}
                                                {person.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current_status">
                                    Current Status *
                                </Label>
                                <Select
                                    value={formData.current_status}
                                    onValueChange={(value) =>
                                        handleInputChange(
                                            'current_status',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MARRIAGE_STATUSES.map((status) => (
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
                        </div>

                        <div className="space-y-2">
                            <Label>Marriage Date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !marriageDate &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {marriageDate
                                            ? format(marriageDate, 'PPP')
                                            : 'Select marriage date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0 z-50"
                                    align="start"
                                    side="bottom"
                                    sideOffset={4}
                                    avoidCollisions={true}
                                    collisionPadding={8}
                                >
                                    <CalendarWidget
                                        selected={marriageDate}
                                        onSelect={handleMarriageDateSelect}
                                        disabled={(date) => date > new Date()}
                                        defaultMonth={
                                            marriageDate || new Date()
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Marriage Location */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                            Marriage Location
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="marriage_city">City</Label>
                                <Input
                                    id="marriage_city"
                                    value={
                                        formData.marriage_location?.city || ''
                                    }
                                    onChange={(e) =>
                                        handleLocationChange(
                                            'city',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter city"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="marriage_country">
                                    Country
                                </Label>
                                <Select
                                    value={
                                        formData.marriage_location?.country ||
                                        'US'
                                    }
                                    onValueChange={(value) =>
                                        handleLocationChange('country', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((country) => (
                                            <SelectItem
                                                key={country.value}
                                                value={country.value}
                                            >
                                                {country.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="marriage_state">
                                    {
                                        getAddressFormat(
                                            formData.marriage_location
                                                ?.country || 'US',
                                        ).stateLabel
                                    }
                                </Label>
                                <Select
                                    value={
                                        formData.marriage_location?.state || ''
                                    }
                                    onValueChange={(value) =>
                                        handleLocationChange('state', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={`Select ${getAddressFormat(
                                                formData.marriage_location
                                                    ?.country || 'US',
                                            ).stateLabel.toLowerCase()}`}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAddressFormat(
                                            formData.marriage_location
                                                ?.country || 'US',
                                        ).states?.map((state) => (
                                            <SelectItem
                                                key={state.value}
                                                value={state.value}
                                            >
                                                {state.label}
                                            </SelectItem>
                                        )) || (
                                            <SelectItem value="N/A">
                                                No options available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Separation and Divorce Dates */}
                    {(formData.current_status === 'separated' ||
                        formData.current_status === 'divorced') && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Timeline</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Separation Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !separationDate &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {separationDate
                                                    ? format(
                                                          separationDate,
                                                          'PPP',
                                                      )
                                                    : 'Select separation date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0 z-50"
                                            align="start"
                                            side="bottom"
                                            sideOffset={4}
                                            avoidCollisions={true}
                                            collisionPadding={8}
                                        >
                                            <CalendarWidget
                                                selected={separationDate}
                                                onSelect={
                                                    handleSeparationDateSelect
                                                }
                                                disabled={(date) =>
                                                    date > new Date() ||
                                                    (marriageDate
                                                        ? date < marriageDate
                                                        : false)
                                                }
                                                defaultMonth={
                                                    separationDate ||
                                                    marriageDate ||
                                                    new Date()
                                                }
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {formData.current_status === 'divorced' && (
                                    <div className="space-y-2">
                                        <Label>Divorce Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !divorceDate &&
                                                            'text-muted-foreground',
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {divorceDate
                                                        ? format(
                                                              divorceDate,
                                                              'PPP',
                                                          )
                                                        : 'Select divorce date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0 z-50"
                                                align="start"
                                                side="bottom"
                                                sideOffset={4}
                                                avoidCollisions={true}
                                                collisionPadding={8}
                                            >
                                                <CalendarWidget
                                                    selected={divorceDate}
                                                    onSelect={
                                                        handleDivorceDateSelect
                                                    }
                                                    disabled={(date) =>
                                                        date > new Date() ||
                                                        (separationDate
                                                            ? date <
                                                              separationDate
                                                            : false) ||
                                                        (marriageDate
                                                            ? date <
                                                              marriageDate
                                                            : false)
                                                    }
                                                    defaultMonth={
                                                        divorceDate ||
                                                        separationDate ||
                                                        marriageDate ||
                                                        new Date()
                                                    }
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                            {isLoading ? 'Saving...' : 'Save Marriage'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
