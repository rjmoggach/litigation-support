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
import type { Company } from '@/lib/api/contacts.types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const companyEditSchema = z.object({
    name: z.string().min(1, 'Company name is required').max(255, 'Name is too long'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
    website: z.string().max(500, 'Website URL is too long').optional().or(z.literal('')),
    is_active: z.boolean(),
    is_public: z.boolean(),
})

type CompanyEditFormData = z.infer<typeof companyEditSchema>

interface CompanyEditDialogProps {
    company: Company | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (companyId: number | null, data: Partial<CompanyEditFormData>) => Promise<void>
    isCreating?: boolean
}

export function CompanyEditDialog({ 
    company, 
    open, 
    onOpenChange, 
    onSave,
    isCreating = false
}: CompanyEditDialogProps) {
    const form = useForm<CompanyEditFormData>({
        resolver: zodResolver(companyEditSchema),
        defaultValues: {
            name: company?.name || '',
            email: company?.email || '',
            phone: company?.phone || '',
            website: company?.website || '',
            is_active: company?.is_active ?? true,
            is_public: company?.is_public ?? true,
        },
    })

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
            })
        } else if (company) {
            form.reset({
                name: company.name || '',
                email: company.email || '',
                phone: company.phone || '',
                website: company.website || '',
                is_active: company.is_active ?? true,
                is_public: company.is_public ?? true,
            })
        }
    }, [company, isCreating, form])

    const handleSubmit = async (data: CompanyEditFormData) => {
        try {
            await onSave(isCreating ? null : company?.id || null, data)
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error('Failed to save company:', error)
        }
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isCreating ? 'Create Company' : 'Edit Company'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreating 
                            ? 'Create a new company in your contacts database'
                            : 'Update company information and settings'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company Name *</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Enter company name" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            type="email" 
                                            placeholder="company@example.com"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Primary contact email for the company
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
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            type="tel" 
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Primary contact phone number
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Website</FormLabel>
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
                        
                        <div className="space-y-3">
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
                                            <FormLabel>Public</FormLabel>
                                            <FormDescription>
                                                Company is visible in public directories
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {isCreating ? 'Create Company' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}