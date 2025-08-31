'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useDebounce } from '@/hooks/use-debounce'
import type {
    Company,
    CompanyPersonAssociation,
    Person,
} from '@/lib/api/contacts.types'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    Briefcase,
    Building,
    Eye,
    EyeOff,
    Mail,
    MapPin,
    Phone,
    Plus,
    Save,
    Upload,
    User,
    X,
} from 'lucide-react'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Schema for comprehensive person editing
const personEditSchema = z.object({
    // Basic person fields
    first_name: z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name is too long'),
    last_name: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name is too long'),
    email: z
        .string()
        .email('Invalid email address')
        .optional()
        .or(z.literal('')),
    phone: z
        .string()
        .max(50, 'Phone number is too long')
        .optional()
        .or(z.literal('')),
    is_active: z.boolean(),
    is_public: z.boolean(),

    // Profile fields
    profile: z
        .object({
            bio: z
                .string()
                .max(2000, 'Bio is too long')
                .optional()
                .or(z.literal('')),
            title: z
                .string()
                .max(200, 'Title is too long')
                .optional()
                .or(z.literal('')),
            expertise: z.array(z.string()).optional(),

            // Location as structured data
            location: z
                .object({
                    city: z.string().optional(),
                    state: z.string().optional(),
                    country: z.string().optional(),
                })
                .optional(),

            // Social links
            social_links: z.record(z.string()).optional(),

            avatar_file_id: z.number().optional(),
            is_public: z.boolean(),
        })
        .optional(),

    // Company associations
    company_associations: z
        .array(
            z.object({
                company_id: z.number(),
                role: z.string().optional(),
                start_date: z.string().optional(),
                end_date: z.string().optional(),
                is_primary: z.boolean(),
            }),
        )
        .optional(),
})

type PersonEditFormData = z.infer<typeof personEditSchema>

interface PersonEditDialogProps {
    person: Person | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (
        personId: number | null,
        data: Partial<PersonEditFormData>,
    ) => Promise<void>
    onAutoSave?: (
        personId: number | null,
        data: Partial<PersonEditFormData>,
    ) => Promise<void>
    isCreating?: boolean
    availableCompanies?: Company[]
    existingAssociations?: CompanyPersonAssociation[]
}

const SOCIAL_PLATFORMS = [
    {
        key: 'linkedin',
        label: 'LinkedIn',
        placeholder: 'https://linkedin.com/in/...',
    },
    {
        key: 'twitter',
        label: 'Twitter',
        placeholder: 'https://twitter.com/...',
    },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...' },
    {
        key: 'website',
        label: 'Personal Website',
        placeholder: 'https://yourwebsite.com',
    },
    {
        key: 'instagram',
        label: 'Instagram',
        placeholder: 'https://instagram.com/...',
    },
]

const EXPERTISE_SUGGESTIONS = [
    'Software Development',
    'Product Management',
    'UX/UI Design',
    'Data Science',
    'Machine Learning',
    'DevOps',
    'Marketing',
    'Sales',
    'Finance',
    'Operations',
    'HR',
    'Business Development',
    'Consulting',
    'Project Management',
    'Quality Assurance',
]

export function PersonEditDialog({
    person,
    open,
    onOpenChange,
    onSave,
    onAutoSave,
    isCreating = false,
    availableCompanies = [],
    existingAssociations = [],
}: PersonEditDialogProps) {
    const [isAutoSaving, setIsAutoSaving] = React.useState(false)
    const [lastAutoSave, setLastAutoSave] = React.useState<Date | null>(null)
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
        null,
    )
    const [socialLinks, setSocialLinks] = React.useState<
        Record<string, string>
    >({})
    const [expertiseList, setExpertiseList] = React.useState<string[]>([])
    const [newExpertise, setNewExpertise] = React.useState('')
    const [companyAssociations, setCompanyAssociations] = React.useState<
        Array<{
            company_id: number | null
            role: string
            start_date: string
            end_date: string
            is_primary: boolean
        }>
    >([])
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<PersonEditFormData>({
        resolver: zodResolver(personEditSchema),
        defaultValues: {
            first_name: person?.first_name || '',
            last_name: person?.last_name || '',
            email: person?.email || '',
            phone: person?.phone || '',
            is_active: person?.is_active ?? true,
            is_public: person?.is_public ?? true,
            profile: {
                bio: person?.profile?.bio || '',
                title: person?.profile?.title || '',
                expertise: person?.profile?.expertise || [],
                location: {
                    city: person?.profile?.location?.city || '',
                    state: person?.profile?.location?.state || '',
                    country: person?.profile?.location?.country || '',
                },
                social_links: person?.profile?.social_links || {},
                avatar_file_id: person?.profile?.avatar_file_id,
                is_public: person?.profile?.is_public ?? true,
            },
            company_associations: [],
        },
    })

    // Watch form values for auto-save
    const watchedValues = useWatch({ control: form.control })
    const debouncedValues = useDebounce(watchedValues, 2000) // Auto-save after 2 seconds of no changes

    // Reset form when person changes or when creating new
    React.useEffect(() => {
        if (isCreating) {
            form.reset({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                is_active: true,
                is_public: true,
                profile: {
                    bio: '',
                    title: '',
                    expertise: [],
                    location: {
                        city: '',
                        state: '',
                        country: '',
                    },
                    social_links: {},
                    is_public: true,
                },
                company_associations: [],
            })
            setSocialLinks({})
            setExpertiseList([])
            setCompanyAssociations([])
            setAvatarFile(null)
            setAvatarPreview(null)
        } else if (person) {
            const profileData = {
                bio: person.profile?.bio || '',
                title: person.profile?.title || '',
                expertise: person.profile?.expertise || [],
                location: {
                    city: person.profile?.location?.city || '',
                    state: person.profile?.location?.state || '',
                    country: person.profile?.location?.country || '',
                },
                social_links: person.profile?.social_links || {},
                avatar_file_id: person.profile?.avatar_file_id,
                is_public: person.profile?.is_public ?? true,
            }

            form.reset({
                first_name: person.first_name || '',
                last_name: person.last_name || '',
                email: person.email || '',
                phone: person.phone || '',
                is_active: person.is_active ?? true,
                is_public: person.is_public ?? true,
                profile: profileData,
                company_associations: [],
            })
            setSocialLinks(person.profile?.social_links || {})
            setExpertiseList(person.profile?.expertise || [])
            setCompanyAssociations(
                existingAssociations.map((assoc) => ({
                    company_id: assoc.company_id,
                    role: assoc.role || '',
                    start_date: assoc.start_date || '',
                    end_date: assoc.end_date || '',
                    is_primary: assoc.is_primary,
                })),
            )
        }
    }, [person, isCreating, form, existingAssociations])

    // Auto-save functionality
    React.useEffect(() => {
        if (!onAutoSave || isCreating) return

        const performAutoSave = async () => {
            if (!person || !form.formState.isDirty) return

            setIsAutoSaving(true)
            try {
                await onAutoSave(person.id, debouncedValues)
                setLastAutoSave(new Date())
                toast.success('Changes auto-saved', { duration: 2000 })
            } catch (error) {
                console.error('Auto-save failed:', error)
            } finally {
                setIsAutoSaving(false)
            }
        }

        performAutoSave()
    }, [
        debouncedValues,
        onAutoSave,
        person,
        isCreating,
        form.formState.isDirty,
    ])

    const handleSubmit = async (data: PersonEditFormData) => {
        try {
            const submitData = {
                ...data,
                profile: {
                    ...data.profile,
                    social_links: socialLinks,
                    expertise: expertiseList,
                },
                company_associations: companyAssociations.filter(
                    (assoc) => assoc.company_id !== null,
                ),
            }

            await onSave(isCreating ? null : person?.id || null, submitData)
            onOpenChange(false)
            form.reset()
            setAvatarFile(null)
            setAvatarPreview(null)
            setSocialLinks({})
            setExpertiseList([])
            setCompanyAssociations([])
        } catch (error) {
            console.error('Failed to save person:', error)
            toast.error('Failed to save person')
        }
    }

    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file')
            return
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB')
            return
        }

        setAvatarFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setAvatarPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const addSocialLink = (platform: string) => {
        setSocialLinks((prev) => ({
            ...prev,
            [platform]: '',
        }))
    }

    const removeSocialLink = (platform: string) => {
        setSocialLinks((prev) => {
            const updated = { ...prev }
            delete updated[platform]
            return updated
        })
    }

    const updateSocialLink = (platform: string, url: string) => {
        setSocialLinks((prev) => ({
            ...prev,
            [platform]: url,
        }))
    }

    const addExpertise = () => {
        if (!newExpertise.trim() || expertiseList.includes(newExpertise.trim()))
            return
        setExpertiseList((prev) => [...prev, newExpertise.trim()])
        setNewExpertise('')
    }

    const removeExpertise = (expertise: string) => {
        setExpertiseList((prev) => prev.filter((e) => e !== expertise))
    }

    const addCompanyAssociation = () => {
        setCompanyAssociations((prev) => [
            ...prev,
            {
                company_id: null,
                role: '',
                start_date: '',
                end_date: '',
                is_primary: false,
            },
        ])
    }

    const updateCompanyAssociation = (
        index: number,
        field: string,
        value: any,
    ) => {
        setCompanyAssociations((prev) =>
            prev.map((assoc, i) =>
                i === index ? { ...assoc, [field]: value } : assoc,
            ),
        )
    }

    const removeCompanyAssociation = (index: number) => {
        setCompanyAssociations((prev) => prev.filter((_, i) => i !== index))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {isCreating ? 'Create Person' : 'Edit Person'}
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>
                            {isCreating
                                ? 'Create a new person profile with comprehensive details'
                                : 'Update person information, profile, and company associations'}
                        </span>
                        {!isCreating && (
                            <div className="flex items-center gap-2 text-xs">
                                {isAutoSaving && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1"
                                    >
                                        <Save className="h-3 w-3 animate-pulse" />
                                        Auto-saving...
                                    </Badge>
                                )}
                                {lastAutoSave && !isAutoSaving && (
                                    <span className="text-muted-foreground">
                                        Last saved:{' '}
                                        {lastAutoSave.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-3"
                    >
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="basic" className="gap-2">
                                    <User className="h-4 w-4" />
                                    Basic Info
                                </TabsTrigger>
                                <TabsTrigger value="profile" className="gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Profile
                                </TabsTrigger>
                                <TabsTrigger value="media" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    Media & Social
                                </TabsTrigger>
                                <TabsTrigger
                                    value="companies"
                                    className="gap-2"
                                >
                                    <Building className="h-4 w-4" />
                                    Companies
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="basic"
                                className="space-y-3 mt-6"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="first_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    First Name *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Enter first name"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="last_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Last Name *
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Enter last name"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    Email
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="email"
                                                        placeholder="person@example.com"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Primary contact email
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    Phone
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="tel"
                                                        placeholder="+1 (555) 123-4567"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Primary contact number
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="font-medium">
                                        Visibility Settings
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="is_active"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>
                                                            Active
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Person is active and
                                                            can be managed
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_public"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={
                                                                field.value
                                                            }
                                                            onCheckedChange={
                                                                field.onChange
                                                            }
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="flex items-center gap-2">
                                                            {field.value ? (
                                                                <Eye className="h-3 w-3" />
                                                            ) : (
                                                                <EyeOff className="h-3 w-3" />
                                                            )}
                                                            Public
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Show in public
                                                            directories
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="profile"
                                className="space-y-3 mt-6"
                            >
                                <FormField
                                    control={form.control}
                                    name="profile.title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                Professional Title
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g., Senior Software Engineer, Product Manager"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Current job title or
                                                professional role
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="profile.bio"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Biography</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Brief professional bio and background..."
                                                    rows={4}
                                                    className="resize-none"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                A brief professional biography
                                                (max 2000 characters)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <FormLabel>
                                            Areas of Expertise
                                        </FormLabel>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                onValueChange={setNewExpertise}
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue placeholder="Add expertise" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {EXPERTISE_SUGGESTIONS.filter(
                                                        (exp) =>
                                                            !expertiseList.includes(
                                                                exp,
                                                            ),
                                                    ).map((expertise) => (
                                                        <SelectItem
                                                            key={expertise}
                                                            value={expertise}
                                                        >
                                                            {expertise}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={addExpertise}
                                                disabled={!newExpertise}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {expertiseList.map((expertise) => (
                                            <Badge
                                                key={expertise}
                                                variant="secondary"
                                                className="gap-1"
                                            >
                                                {expertise}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeExpertise(
                                                            expertise,
                                                        )
                                                    }
                                                    className="h-auto p-0 ml-1 text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        ))}

                                        {expertiseList.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                No expertise areas added yet.
                                                Use the dropdown above to add
                                                some.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Location
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="profile.location.city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="San Francisco"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="profile.location.state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        State/Province
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="CA"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="profile.location.country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Country
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="United States"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="profile.is_public"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="flex items-center gap-2">
                                                    {field.value ? (
                                                        <Eye className="h-3 w-3" />
                                                    ) : (
                                                        <EyeOff className="h-3 w-3" />
                                                    )}
                                                    Public Profile
                                                </FormLabel>
                                                <FormDescription>
                                                    Show detailed profile
                                                    information publicly
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent
                                value="media"
                                className="space-y-3 mt-6"
                            >
                                <div className="space-y-3">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Profile Avatar
                                    </h4>

                                    <div className="flex items-center gap-3">
                                        {avatarPreview && (
                                            <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={avatarPreview}
                                                    alt="Avatar preview"
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                className="gap-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {avatarPreview
                                                    ? 'Change Avatar'
                                                    : 'Upload Avatar'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                PNG, JPG up to 5MB. Recommended:
                                                200x200px
                                            </p>
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">
                                            Social Links
                                        </h4>
                                        <Select onValueChange={addSocialLink}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Add social link" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SOCIAL_PLATFORMS.filter(
                                                    (platform) =>
                                                        !socialLinks[
                                                            platform.key
                                                        ],
                                                ).map((platform) => (
                                                    <SelectItem
                                                        key={platform.key}
                                                        value={platform.key}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Plus className="h-3 w-3" />
                                                            {platform.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        {Object.entries(socialLinks).map(
                                            ([platform, url]) => {
                                                const platformInfo =
                                                    SOCIAL_PLATFORMS.find(
                                                        (p) =>
                                                            p.key === platform,
                                                    )
                                                return (
                                                    <div
                                                        key={platform}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <div className="flex-1">
                                                            <FormLabel className="text-sm capitalize">
                                                                {platformInfo?.label ||
                                                                    platform}
                                                            </FormLabel>
                                                            <Input
                                                                value={url}
                                                                onChange={(e) =>
                                                                    updateSocialLink(
                                                                        platform,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={
                                                                    platformInfo?.placeholder ||
                                                                    `https://${platform}.com/...`
                                                                }
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeSocialLink(
                                                                    platform,
                                                                )
                                                            }
                                                            className="mt-6 text-destructive hover:text-destructive"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            },
                                        )}

                                        {Object.keys(socialLinks).length ===
                                            0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No social links added yet. Use
                                                the dropdown above to add some.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="companies"
                                className="space-y-3 mt-6"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <Building className="h-4 w-4" />
                                            Company Associations
                                        </h4>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addCompanyAssociation}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Company
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {companyAssociations.map(
                                            (association, index) => (
                                                <div
                                                    key={index}
                                                    className="p-3 border rounded-md space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="font-medium text-sm">
                                                            Company #{index + 1}
                                                        </h5>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeCompanyAssociation(
                                                                    index,
                                                                )
                                                            }
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <FormLabel>
                                                                Company
                                                            </FormLabel>
                                                            <Select
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    updateCompanyAssociation(
                                                                        index,
                                                                        'company_id',
                                                                        parseInt(
                                                                            value,
                                                                        ),
                                                                    )
                                                                }
                                                                value={
                                                                    association.company_id?.toString() ||
                                                                    ''
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select company" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableCompanies.map(
                                                                        (
                                                                            company,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    company.id
                                                                                }
                                                                                value={company.id.toString()}
                                                                            >
                                                                                {
                                                                                    company.name
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <FormLabel>
                                                                Role
                                                            </FormLabel>
                                                            <Input
                                                                value={
                                                                    association.role
                                                                }
                                                                onChange={(e) =>
                                                                    updateCompanyAssociation(
                                                                        index,
                                                                        'role',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="e.g., Software Engineer, CEO"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <FormLabel>
                                                                Start Date
                                                            </FormLabel>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    association.start_date
                                                                }
                                                                onChange={(e) =>
                                                                    updateCompanyAssociation(
                                                                        index,
                                                                        'start_date',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        <div>
                                                            <FormLabel>
                                                                End Date
                                                            </FormLabel>
                                                            <Input
                                                                type="date"
                                                                value={
                                                                    association.end_date
                                                                }
                                                                onChange={(e) =>
                                                                    updateCompanyAssociation(
                                                                        index,
                                                                        'end_date',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Leave empty if current"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            checked={
                                                                association.is_primary
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                updateCompanyAssociation(
                                                                    index,
                                                                    'is_primary',
                                                                    checked,
                                                                )
                                                            }
                                                        />
                                                        <FormLabel className="text-sm">
                                                            Primary Association
                                                        </FormLabel>
                                                    </div>
                                                </div>
                                            ),
                                        )}

                                        {companyAssociations.length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                No company associations added
                                                yet. Click "Add Company" to
                                                create associations.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="gap-2">
                                <Save className="h-4 w-4" />
                                {isCreating ? 'Create Person' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
