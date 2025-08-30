'use client'

import * as React from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Company, CompanyProfile } from '@/lib/api/contacts.types'
import { useDebounce } from '@/hooks/use-debounce'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { 
    Building, 
    Upload, 
    Save, 
    Globe, 
    Phone, 
    Mail, 
    MapPin, 
    Users, 
    Calendar,
    Eye,
    EyeOff,
    Plus,
    X
} from 'lucide-react'
import { toast } from 'sonner'

// Schema for comprehensive company editing
const companyEditSchema = z.object({
    // Basic company fields
    name: z.string().min(1, 'Company name is required').max(255, 'Name is too long'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
    website: z.string().max(500, 'Website URL is too long').optional().or(z.literal('')),
    is_active: z.boolean(),
    is_public: z.boolean(),
    
    // Profile fields
    profile: z.object({
        description: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
        industry: z.string().max(100, 'Industry is too long').optional().or(z.literal('')),
        size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise', '']).optional(),
        founded_year: z.number().min(1800).max(new Date().getFullYear()).optional().or(z.nan()),
        
        // Address as structured data
        address: z.object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postal_code: z.string().optional(),
            country: z.string().optional(),
        }).optional(),
        
        // Social links
        social_links: z.record(z.string()).optional(),
        
        logo_file_id: z.number().optional(),
        is_public: z.boolean(),
    }).optional(),
})

type CompanyEditFormData = z.infer<typeof companyEditSchema>

interface CompanyEditDialogProps {
    company: Company | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (companyId: number | null, data: Partial<CompanyEditFormData>) => Promise<void>
    onAutoSave?: (companyId: number | null, data: Partial<CompanyEditFormData>) => Promise<void>
    isCreating?: boolean
}

const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup (1-10)' },
    { value: 'small', label: 'Small (11-50)' },
    { value: 'medium', label: 'Medium (51-200)' },
    { value: 'large', label: 'Large (201-1000)' },
    { value: 'enterprise', label: 'Enterprise (1000+)' },
]

const SOCIAL_PLATFORMS = [
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...' },
    { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/...' },
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
]

export function CompanyEditDialog({ 
    company, 
    open, 
    onOpenChange, 
    onSave,
    onAutoSave,
    isCreating = false
}: CompanyEditDialogProps) {
    const [isAutoSaving, setIsAutoSaving] = React.useState(false)
    const [lastAutoSave, setLastAutoSave] = React.useState<Date | null>(null)
    const [logoFile, setLogoFile] = React.useState<File | null>(null)
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
    const [socialLinks, setSocialLinks] = React.useState<Record<string, string>>({})
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<CompanyEditFormData>({
        resolver: zodResolver(companyEditSchema),
        defaultValues: {
            name: company?.name || '',
            email: company?.email || '',
            phone: company?.phone || '',
            website: company?.website || '',
            is_active: company?.is_active ?? true,
            is_public: company?.is_public ?? true,
            profile: {
                description: company?.profile?.description || '',
                industry: company?.profile?.industry || '',
                size: (company?.profile?.size as any) || '',
                founded_year: company?.profile?.founded_year || undefined,
                address: {
                    street: company?.profile?.address?.street || '',
                    city: company?.profile?.address?.city || '',
                    state: company?.profile?.address?.state || '',
                    postal_code: company?.profile?.address?.postal_code || '',
                    country: company?.profile?.address?.country || '',
                },
                social_links: company?.profile?.social_links || {},
                logo_file_id: company?.profile?.logo_file_id,
                is_public: company?.profile?.is_public ?? true,
            },
        },
    })

    // Watch form values for auto-save
    const watchedValues = useWatch({ control: form.control })
    const debouncedValues = useDebounce(watchedValues, 2000) // Auto-save after 2 seconds of no changes

    // Reset form when company changes or when creating new
    React.useEffect(() => {
        if (isCreating) {
            form.reset({
                name: '',
                email: '',
                phone: '',
                website: '',
                is_active: true,
                is_public: true,
                profile: {
                    description: '',
                    industry: '',
                    size: '',
                    founded_year: undefined,
                    address: {
                        street: '',
                        city: '',
                        state: '',
                        postal_code: '',
                        country: '',
                    },
                    social_links: {},
                    is_public: true,
                },
            })
            setSocialLinks({})
            setLogoFile(null)
            setLogoPreview(null)
        } else if (company) {
            const profileData = {
                description: company.profile?.description || '',
                industry: company.profile?.industry || '',
                size: (company.profile?.size as any) || '',
                founded_year: company.profile?.founded_year || undefined,
                address: {
                    street: company.profile?.address?.street || '',
                    city: company.profile?.address?.city || '',
                    state: company.profile?.address?.state || '',
                    postal_code: company.profile?.address?.postal_code || '',
                    country: company.profile?.address?.country || '',
                },
                social_links: company.profile?.social_links || {},
                logo_file_id: company.profile?.logo_file_id,
                is_public: company.profile?.is_public ?? true,
            }
            
            form.reset({
                name: company.name || '',
                email: company.email || '',
                phone: company.phone || '',
                website: company.website || '',
                is_active: company.is_active ?? true,
                is_public: company.is_public ?? true,
                profile: profileData,
            })
            setSocialLinks(company.profile?.social_links || {})
        }
    }, [company, isCreating, form])

    // Auto-save functionality
    React.useEffect(() => {
        if (!onAutoSave || isCreating) return
        
        const performAutoSave = async () => {
            if (!company || !form.formState.isDirty) return
            
            setIsAutoSaving(true)
            try {
                await onAutoSave(company.id, debouncedValues)
                setLastAutoSave(new Date())
                toast.success('Changes auto-saved', { duration: 2000 })
            } catch (error) {
                console.error('Auto-save failed:', error)
            } finally {
                setIsAutoSaving(false)
            }
        }

        performAutoSave()
    }, [debouncedValues, onAutoSave, company, isCreating, form.formState.isDirty])

    const handleSubmit = async (data: CompanyEditFormData) => {
        try {
            const submitData = {
                ...data,
                profile: {
                    ...data.profile,
                    social_links: socialLinks,
                }
            }
            
            await onSave(isCreating ? null : company?.id || null, submitData)
            onOpenChange(false)
            form.reset()
            setLogoFile(null)
            setLogoPreview(null)
            setSocialLinks({})
        } catch (error) {
            console.error('Failed to save company:', error)
            toast.error('Failed to save company')
        }
    }

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

        setLogoFile(file)
        
        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setLogoPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const addSocialLink = (platform: string) => {
        setSocialLinks(prev => ({
            ...prev,
            [platform]: ''
        }))
    }

    const removeSocialLink = (platform: string) => {
        setSocialLinks(prev => {
            const updated = { ...prev }
            delete updated[platform]
            return updated
        })
    }

    const updateSocialLink = (platform: string, url: string) => {
        setSocialLinks(prev => ({
            ...prev,
            [platform]: url
        }))
    }

    const formatWebsiteUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }
        return `https://${url}`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {isCreating ? 'Create Company' : 'Edit Company'}
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>
                            {isCreating 
                                ? 'Create a new company profile with comprehensive details'
                                : 'Update company information, profile, and media'
                            }
                        </span>
                        {!isCreating && (
                            <div className="flex items-center gap-2 text-xs">
                                {isAutoSaving && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Save className="h-3 w-3 animate-pulse" />
                                        Auto-saving...
                                    </Badge>
                                )}
                                {lastAutoSave && !isAutoSaving && (
                                    <span className="text-muted-foreground">
                                        Last saved: {lastAutoSave.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic" className="gap-2">
                                    <Building className="h-4 w-4" />
                                    Basic Info
                                </TabsTrigger>
                                <TabsTrigger value="profile" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    Profile
                                </TabsTrigger>
                                <TabsTrigger value="media" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    Media & Social
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="basic" className="space-y-4 mt-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Building className="h-4 w-4" />
                                                Company Name *
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter company name" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                        placeholder="company@example.com"
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

                                <FormField
                                    control={form.control}
                                    name="website"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                Website
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    type="url" 
                                                    placeholder="https://example.com"
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        field.onChange(value ? formatWebsiteUrl(value) : '')
                                                    }}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Company website URL
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <Separator />
                                
                                <div className="space-y-3">
                                    <h4 className="font-medium">Visibility Settings</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="is_active"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Active</FormLabel>
                                                        <FormDescription>
                                                            Company is active and can be managed
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
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="flex items-center gap-2">
                                                            {field.value ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                            Public
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Show in public directories
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="profile" className="space-y-4 mt-6">
                                <FormField
                                    control={form.control}
                                    name="profile.description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Description</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    {...field}
                                                    placeholder="Brief description of the company, its mission, and services..."
                                                    rows={4}
                                                    className="resize-none"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                A brief overview of your company (max 2000 characters)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="profile.industry"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Industry</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        {...field}
                                                        placeholder="e.g., Technology, Healthcare, Finance"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Primary industry or sector
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="profile.size"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company Size</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select company size" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {COMPANY_SIZES.map((size) => (
                                                            <SelectItem key={size.value} value={size.value}>
                                                                {size.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Approximate number of employees
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="profile.founded_year"
                                    render={({ field }) => (
                                        <FormItem className="w-full md:w-1/2">
                                            <FormLabel className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Founded Year
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    {...field}
                                                    type="number"
                                                    min="1800"
                                                    max={new Date().getFullYear()}
                                                    placeholder="2020"
                                                    onChange={(e) => {
                                                        const value = e.target.value
                                                        field.onChange(value ? parseInt(value) : undefined)
                                                    }}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Year the company was founded
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Address
                                    </h4>
                                    
                                    <FormField
                                        control={form.control}
                                        name="profile.address.street"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Street Address</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="123 Main Street" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="profile.address.city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="San Francisco" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="profile.address.state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>State/Province</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="CA" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="profile.address.postal_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Postal Code</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="94105" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="profile.address.country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Country</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="United States" />
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
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="flex items-center gap-2">
                                                    {field.value ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                    Public Profile
                                                </FormLabel>
                                                <FormDescription>
                                                    Show detailed profile information publicly
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="media" className="space-y-6 mt-6">
                                <div className="space-y-4">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Company Logo
                                    </h4>
                                    
                                    <div className="flex items-center gap-4">
                                        {logoPreview && (
                                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden">
                                                <img 
                                                    src={logoPreview} 
                                                    alt="Logo preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="space-y-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="gap-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground">
                                                PNG, JPG up to 5MB. Recommended: 200x200px
                                            </p>
                                        </div>
                                        
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Social Links</h4>
                                        <Select onValueChange={addSocialLink}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Add social link" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SOCIAL_PLATFORMS.filter(platform => !socialLinks[platform.key]).map((platform) => (
                                                    <SelectItem key={platform.key} value={platform.key}>
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
                                        {Object.entries(socialLinks).map(([platform, url]) => {
                                            const platformInfo = SOCIAL_PLATFORMS.find(p => p.key === platform)
                                            return (
                                                <div key={platform} className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <FormLabel className="text-sm capitalize">
                                                            {platformInfo?.label || platform}
                                                        </FormLabel>
                                                        <Input
                                                            value={url}
                                                            onChange={(e) => updateSocialLink(platform, e.target.value)}
                                                            placeholder={platformInfo?.placeholder || `https://${platform}.com/...`}
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSocialLink(platform)}
                                                        className="mt-6 text-destructive hover:text-destructive"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                        
                                        {Object.keys(socialLinks).length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No social links added yet. Use the dropdown above to add some.
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
                                {isCreating ? 'Create Company' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}