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
import {
    COUNTRIES,
    formatPostalCode,
    getAddressFormat,
    validatePostalCode,
} from '@/lib/address-formats'
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon, Edit, MapPin, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface PersonAddress {
    id?: number
    person_id: number
    street_address: string
    city: string
    state: string
    zip_code: string
    country?: string
    effective_start_date: string
    effective_end_date?: string
    is_current: boolean
    address_type?: string
    created_at?: string
    updated_at?: string
}

interface AddressManagementProps {
    personId: number
    addresses: PersonAddress[]
    onCreateAddress: (address: Omit<PersonAddress, 'id'>) => Promise<void>
    onUpdateAddress: (
        id: number,
        address: Partial<PersonAddress>,
    ) => Promise<void>
    onDeleteAddress: (id: number) => Promise<void>
    isLoading?: boolean
}

const ADDRESS_TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'work', label: 'Work' },
    { value: 'mailing', label: 'Mailing' },
    { value: 'previous', label: 'Previous' },
    { value: 'other', label: 'Other' },
]

export function AddressManagement({
    personId,
    addresses,
    onCreateAddress,
    onUpdateAddress,
    onDeleteAddress,
    isLoading = false,
}: AddressManagementProps) {
    const [editingAddress, setEditingAddress] = useState<PersonAddress | null>(
        null,
    )
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleEdit = (address: PersonAddress) => {
        setEditingAddress(address)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setEditingAddress(null)
        setIsDialogOpen(true)
    }

    const handleSave = async (addressData: Omit<PersonAddress, 'id'>) => {
        console.log('handleSave called with:', addressData)
        console.log('editingAddress:', editingAddress)
        try {
            if (editingAddress?.id) {
                console.log(
                    'Updating existing address with id:',
                    editingAddress.id,
                )
                await onUpdateAddress(editingAddress.id, addressData)
                toast.success('Address updated successfully')
            } else {
                console.log('Creating new address')
                await onCreateAddress(addressData)
                toast.success('Address created successfully')
            }
            console.log('Address operation completed, closing dialog')
            setIsDialogOpen(false)
            setEditingAddress(null)
        } catch (error) {
            console.error('Address save error:', error)
            toast.error('Failed to save address')
        }
    }

    const sortedAddresses = [
        ...(Array.isArray(addresses) ? addresses : []),
    ].sort((a, b) => {
        // First, prioritize addresses without end dates (truly current addresses)
        const aHasEndDate = !!a.effective_end_date
        const bHasEndDate = !!b.effective_end_date

        if (!aHasEndDate && bHasEndDate) return -1 // a is current, b is not
        if (aHasEndDate && !bHasEndDate) return 1 // b is current, a is not

        // If both have end dates, sort by end date (most recent first)
        if (aHasEndDate && bHasEndDate) {
            const aEndDate = parseLocalDate(a.effective_end_date)
            const bEndDate = parseLocalDate(b.effective_end_date)
            if (aEndDate && bEndDate) {
                const endDateDiff = bEndDate.getTime() - aEndDate.getTime()
                if (endDateDiff !== 0) return endDateDiff
            }
        }

        // If end dates are the same or both don't have end dates, sort by start date (most recent first)
        const aStartDate = parseLocalDate(a.effective_start_date)
        const bStartDate = parseLocalDate(b.effective_start_date)
        if (aStartDate && bStartDate) {
            return bStartDate.getTime() - aStartDate.getTime()
        }

        return 0
    })

    return (
        <>
            <CardHeader className="py-0 my-0">
                <CardTitle className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        Addresses
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreate}
                        disabled={isLoading}
                    >
                        <Plus className="size-4 mr-2" />
                        Add Address
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {(Array.isArray(addresses) ? addresses : []).length === 0 ? (
                    <div className="text-center py-8">
                        <MapPin className="mx-auto size-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">No Addresses</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add addresses to track residential history
                        </p>
                        <Button onClick={handleCreate} disabled={isLoading}>
                            <Plus className="size-4 mr-2" />
                            Add First Address
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sortedAddresses.map((address) => (
                            <div
                                key={address.id}
                                className="flex items-start justify-between p-3 border rounded-md"
                            >
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h4 className="font-medium">
                                            {address.street_address}
                                        </h4>
                                        {(() => {
                                            // Check if address is actually current based on end date
                                            if (!address.effective_end_date) {
                                                // No end date means it's current
                                                return (
                                                    <Badge variant="default">
                                                        Current
                                                    </Badge>
                                                )
                                            }
                                            // Has end date - check if it's in the future
                                            const endDate = parseLocalDate(
                                                address.effective_end_date,
                                            )
                                            const isActuallyCurrent =
                                                endDate && endDate > new Date()
                                            return isActuallyCurrent ? (
                                                <Badge variant="default">
                                                    Current
                                                </Badge>
                                            ) : null
                                        })()}
                                        {address.address_type && (
                                            <Badge variant="outline">
                                                {ADDRESS_TYPES.find(
                                                    (t) =>
                                                        t.value ===
                                                        address.address_type,
                                                )?.label ||
                                                    address.address_type}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground">
                                        {address.city}, {address.state}{' '}
                                        {address.zip_code}
                                        {address.country &&
                                            address.country !== 'US' &&
                                            `, ${address.country}`}
                                    </p>
                                    <p className="text-xs text-foreground mt-1">
                                        {(() => {
                                            const startDate = parseLocalDate(
                                                address.effective_start_date,
                                            )
                                            return startDate ? (
                                                <>
                                                    From{' '}
                                                    {format(
                                                        startDate,
                                                        'MMM d, yyyy',
                                                    )}
                                                </>
                                            ) : null
                                        })()}
                                        {address.effective_end_date &&
                                            !isNaN(
                                                new Date(
                                                    address.effective_end_date,
                                                ).getTime(),
                                            ) &&
                                            (() => {
                                                const endDate = parseLocalDate(
                                                    address.effective_end_date,
                                                )
                                                return endDate
                                                    ? ` to ${format(endDate, 'MMM d, yyyy')}`
                                                    : ''
                                            })()}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(address)}
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
                                                    Delete Address
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to
                                                    delete this address? This
                                                    action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>
                                                    Cancel
                                                </AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() =>
                                                        address.id &&
                                                        onDeleteAddress(
                                                            address.id,
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

                <AddressFormDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    personId={personId}
                    address={editingAddress}
                    onSave={handleSave}
                    isLoading={isLoading}
                />
            </CardContent>
        </>
    )
}

interface AddressFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    personId: number
    address?: PersonAddress | null
    onSave: (address: Omit<PersonAddress, 'id'>) => Promise<void>
    isLoading?: boolean
}

function AddressFormDialog({
    open,
    onOpenChange,
    personId,
    address,
    onSave,
    isLoading = false,
}: AddressFormDialogProps) {
    const [formData, setFormData] = useState<Omit<PersonAddress, 'id'>>({
        person_id: personId,
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'US',
        effective_start_date: formatLocalDate(new Date()),
        effective_end_date: '',
        is_current: true,
        address_type: 'home',
    })
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    // Get address format for current country
    const addressFormat = getAddressFormat(formData.country || 'US')

    // Handle country change
    const handleCountryChange = (countryCode: string) => {
        setFormData((prev) => ({
            ...prev,
            country: countryCode,
            state: '', // Reset state when country changes
        }))
    }

    useEffect(() => {
        if (address) {
            setFormData({
                person_id: address.person_id,
                street_address: address.street_address,
                city: address.city,
                state: address.state,
                zip_code: address.zip_code,
                country: address.country || 'US',
                effective_start_date: address.effective_start_date,
                effective_end_date: address.effective_end_date || '',
                is_current: address.is_current,
                address_type: address.address_type || 'home',
            })
            const startDateObj = parseLocalDate(address.effective_start_date)
            if (startDateObj) {
                setStartDate(startDateObj)
            }
            if (address.effective_end_date) {
                const endDateObj = parseLocalDate(address.effective_end_date)
                if (endDateObj) {
                    setEndDate(endDateObj)
                }
            }
        } else {
            // Reset form for new address
            setFormData({
                person_id: personId,
                street_address: '',
                city: '',
                state: '',
                zip_code: '',
                country: 'US',
                effective_start_date: formatLocalDate(new Date()),
                effective_end_date: '',
                is_current: true,
                address_type: 'home',
            })
            setStartDate(new Date())
            setEndDate(undefined)
        }
    }, [address, personId, open])

    const handleInputChange = (
        field: keyof typeof formData,
        value: string | boolean,
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleStartDateSelect = (date: Date | undefined) => {
        setStartDate(date)
        setFormData((prev) => ({
            ...prev,
            effective_start_date: formatLocalDate(date),
        }))
    }

    const handleEndDateSelect = (date: Date | undefined) => {
        setEndDate(date)
        setFormData((prev) => ({
            ...prev,
            effective_end_date: formatLocalDate(date),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        console.log('Address form submit started')
        console.log('Form data:', formData)

        // Validate required fields
        console.log('Checking street address and city...')
        if (!formData.street_address.trim() || !formData.city.trim()) {
            console.log('Street address or city validation failed')
            toast.error('Please fill in street address and city')
            return
        }

        console.log('Checking state requirement...', {
            stateRequired: addressFormat.stateRequired,
            state: formData.state,
        })
        if (addressFormat.stateRequired && !formData.state.trim()) {
            console.log('State validation failed')
            toast.error(
                `Please fill in ${addressFormat.stateLabel.toLowerCase()}`,
            )
            return
        }

        console.log('Checking zip requirement...', {
            zipRequired: addressFormat.zipRequired,
            zip: formData.zip_code,
        })
        if (addressFormat.zipRequired && !formData.zip_code.trim()) {
            console.log('Zip code validation failed')
            toast.error(
                `Please fill in ${addressFormat.zipLabel.toLowerCase()}`,
            )
            return
        }

        console.log('Validating postal code format...', {
            country: formData.country,
            zip: formData.zip_code,
        })
        // Validate postal code format
        if (
            formData.zip_code &&
            !validatePostalCode(formData.country || 'US', formData.zip_code)
        ) {
            console.log('Postal code format validation failed')
            toast.error(
                `Please enter a valid ${addressFormat.zipLabel.toLowerCase()} for ${addressFormat.country}`,
            )
            return
        }

        console.log('All validations passed')

        console.log('About to call onSave with:', formData)
        console.log('onSave function:', onSave)
        try {
            const result = await onSave(formData)
            console.log('onSave completed successfully, result:', result)
        } catch (error) {
            console.error('onSave failed:', error)
            throw error
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl mx-4 sm:mx-0 items-start">
                <DialogHeader>
                    <DialogTitle>
                        {address ? 'Edit Address' : 'Add New Address'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Address Information */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="street_address">
                                Street Address *
                            </Label>
                            <Input
                                id="street_address"
                                value={formData.street_address}
                                onChange={(e) =>
                                    handleInputChange(
                                        'street_address',
                                        e.target.value,
                                    )
                                }
                                placeholder="123 Main Street"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="country">Country *</Label>
                                <Select
                                    value={formData.country || 'US'}
                                    onValueChange={handleCountryChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-48">
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
                                <Label htmlFor="address_type">
                                    Address Type
                                </Label>
                                <Select
                                    value={formData.address_type || ''}
                                    onValueChange={(value) =>
                                        handleInputChange('address_type', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ADDRESS_TYPES.map((type) => (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) =>
                                        handleInputChange(
                                            'city',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Enter city"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">
                                    {addressFormat.stateLabel}{' '}
                                    {addressFormat.stateRequired ? '*' : ''}
                                </Label>
                                {addressFormat.states ? (
                                    <Select
                                        value={formData.state}
                                        onValueChange={(value) =>
                                            handleInputChange('state', value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={`Select ${addressFormat.stateLabel.toLowerCase()}`}
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-48">
                                            {addressFormat.states.map(
                                                (state) => (
                                                    <SelectItem
                                                        key={state.value}
                                                        value={state.value}
                                                    >
                                                        {state.label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id="state"
                                        value={formData.state}
                                        onChange={(e) =>
                                            handleInputChange(
                                                'state',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={`Enter ${addressFormat.stateLabel.toLowerCase()}`}
                                        required={addressFormat.stateRequired}
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip_code">
                                    {addressFormat.zipLabel}{' '}
                                    {addressFormat.zipRequired ? '*' : ''}
                                </Label>
                                <Input
                                    id="zip_code"
                                    value={formData.zip_code}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.toUpperCase()
                                        const formatted = formatPostalCode(
                                            formData.country || 'US',
                                            value,
                                        )
                                        handleInputChange('zip_code', formatted)
                                    }}
                                    placeholder={addressFormat.zipPlaceholder}
                                    required={addressFormat.zipRequired}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                            Effective Period
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !startDate &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate
                                                ? format(startDate, 'PPP')
                                                : 'Select start date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <CalendarWidget
                                            selected={startDate}
                                            onSelect={handleStartDateSelect}
                                            disabled={(date: Date) =>
                                                date > new Date()
                                            }
                                            defaultMonth={
                                                startDate || new Date()
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !endDate &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate
                                                ? format(endDate, 'PPP')
                                                : 'Select end date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <CalendarWidget
                                            selected={endDate}
                                            onSelect={handleEndDateSelect}
                                            disabled={(date: Date) =>
                                                date > new Date() ||
                                                (startDate
                                                    ? date < startDate
                                                    : false)
                                            }
                                            defaultMonth={
                                                endDate ||
                                                startDate ||
                                                new Date()
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Address'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
