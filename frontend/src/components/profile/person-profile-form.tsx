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
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
    CalendarIcon,
    Link as LinkIcon,
    Siren,
    Unlink,
    User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface PersonProfile {
    id?: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    gender?: string
    ssn_last_four?: string
    preferred_name?: string
    emergency_contact?: {
        name: string
        phone: string
        relationship: string
    }
}

interface PersonProfileFormProps {
    personProfile?: PersonProfile | null
    linkedPersonId?: number | null
    onSave: (data: PersonProfile) => Promise<void>
    onLink: () => void
    onUnlink: () => void
    isLoading?: boolean
}

export function PersonProfileForm({
    personProfile,
    linkedPersonId,
    onSave,
    onLink,
    onUnlink,
    isLoading = false,
}: PersonProfileFormProps) {
    const [formData, setFormData] = useState<PersonProfile>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        ssn_last_four: '',
        preferred_name: '',
        emergency_contact: {
            name: '',
            phone: '',
            relationship: '',
        },
    })
    const [dateOfBirth, setDateOfBirth] = useState<Date>()

    useEffect(() => {
        if (personProfile) {
            setFormData(personProfile)
            if (personProfile.date_of_birth) {
                const dob = parseLocalDate(personProfile.date_of_birth)
                if (dob) {
                    setDateOfBirth(dob)
                }
            }
        }
    }, [personProfile])

    const handleInputChange = (field: keyof PersonProfile, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleEmergencyContactChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            emergency_contact: {
                ...prev.emergency_contact,
                [field]: value,
            },
        }))
    }

    const handleDateSelect = (date: Date | undefined) => {
        setDateOfBirth(date)
        setFormData((prev) => ({
            ...prev,
            date_of_birth: formatLocalDate(date),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            toast.error('First name and last name are required')
            return
        }

        try {
            await onSave(formData)
            toast.success('Personal information saved successfully')
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Failed to save personal information')
        }
    }

    if (!linkedPersonId) {
        return (
            <>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="size-5" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <User className="mx-auto size-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">
                            No Personal Profile Linked
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Link your user account to a person record to manage
                            personal information
                        </p>
                        <Button onClick={onLink} disabled={isLoading}>
                            <LinkIcon className="size-4 mr-2" />
                            Link to Person Record
                        </Button>
                    </div>
                </CardContent>
            </>
        )
    }

    return (
        <>
            <CardHeader className="my-0 py-0">
                <CardTitle className="flex items-center justify-between text-lg font-medium">
                    <div className="flex items-center gap-2">
                        <User className="size-5" />
                        {formData.first_name && formData.last_name
                            ? `${formData.first_name} ${formData.last_name}`
                            : 'Personal Information'}
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                            >
                                <Unlink className="size-4 mr-2" />
                                Unlink
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Unlink Person Record
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to unlink this person
                                    record? This will disconnect your user
                                    profile from the personal information.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onUnlink}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Unlink
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input
                                id="first_name"
                                value={formData.first_name}
                                onChange={(e) =>
                                    handleInputChange(
                                        'first_name',
                                        e.target.value,
                                    )
                                }
                                placeholder="Enter first name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input
                                id="last_name"
                                value={formData.last_name}
                                onChange={(e) =>
                                    handleInputChange(
                                        'last_name',
                                        e.target.value,
                                    )
                                }
                                placeholder="Enter last name"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) =>
                                    handleInputChange('email', e.target.value)
                                }
                                placeholder="Enter email address"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) =>
                                    handleInputChange('phone', e.target.value)
                                }
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Date of Birth</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !dateOfBirth &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateOfBirth
                                            ? format(dateOfBirth, 'PPP')
                                            : 'Select date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <CalendarWidget
                                        selected={dateOfBirth}
                                        onSelect={handleDateSelect}
                                        disabled={(date: Date) =>
                                            date > new Date() ||
                                            date < new Date('1900-01-01')
                                        }
                                        defaultMonth={dateOfBirth || new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select
                                value={formData.gender || ''}
                                onValueChange={(value) =>
                                    handleInputChange('gender', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">
                                        Female
                                    </SelectItem>
                                    <SelectItem value="non-binary">
                                        Non-binary
                                    </SelectItem>
                                    <SelectItem value="prefer-not-to-say">
                                        Prefer not to say
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-4">
                        <h3 className=" font-medium flex items-center gap-2">
                            <Siren className="size-4" />
                            Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="emergency_name">Name</Label>
                                <Input
                                    id="emergency_name"
                                    value={
                                        formData.emergency_contact?.name || ''
                                    }
                                    onChange={(e) =>
                                        handleEmergencyContactChange(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Emergency contact name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emergency_phone">Phone</Label>
                                <Input
                                    id="emergency_phone"
                                    type="tel"
                                    value={
                                        formData.emergency_contact?.phone || ''
                                    }
                                    onChange={(e) =>
                                        handleEmergencyContactChange(
                                            'phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Emergency contact phone"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emergency_relationship">
                                    Relationship
                                </Label>
                                <Select
                                    value={
                                        formData.emergency_contact
                                            ?.relationship || ''
                                    }
                                    onValueChange={(value) =>
                                        handleEmergencyContactChange(
                                            'relationship',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select relationship" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="spouse">
                                            Spouse
                                        </SelectItem>
                                        <SelectItem value="parent">
                                            Parent
                                        </SelectItem>
                                        <SelectItem value="child">
                                            Child
                                        </SelectItem>
                                        <SelectItem value="sibling">
                                            Sibling
                                        </SelectItem>
                                        <SelectItem value="friend">
                                            Friend
                                        </SelectItem>
                                        <SelectItem value="colleague">
                                            Colleague
                                        </SelectItem>
                                        <SelectItem value="other">
                                            Other
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? 'Saving...'
                                : 'Save Personal Information'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </>
    )
}
