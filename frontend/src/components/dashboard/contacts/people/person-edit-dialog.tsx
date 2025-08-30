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
import type { Person } from '@/lib/api/contacts.types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const personEditSchema = z.object({
    first_name: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
    last_name: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().max(50, 'Phone number is too long').optional().or(z.literal('')),
    is_active: z.boolean(),
    is_public: z.boolean(),
})

type PersonEditFormData = z.infer<typeof personEditSchema>

interface PersonEditDialogProps {
    person: Person | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (personId: number | null, data: Partial<PersonEditFormData>) => Promise<void>
    isCreating?: boolean
}

export function PersonEditDialog({ 
    person, 
    open, 
    onOpenChange, 
    onSave,
    isCreating = false
}: PersonEditDialogProps) {
    const form = useForm<PersonEditFormData>({
        resolver: zodResolver(personEditSchema),
        defaultValues: {
            first_name: person?.first_name || '',
            last_name: person?.last_name || '',
            email: person?.email || '',
            phone: person?.phone || '',
            is_active: person?.is_active ?? true,
            is_public: person?.is_public ?? true,
        },
    })

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
            })
        } else if (person) {
            form.reset({
                first_name: person.first_name || '',
                last_name: person.last_name || '',
                email: person.email || '',
                phone: person.phone || '',
                is_active: person.is_active ?? true,
                is_public: person.is_public ?? true,
            })
        }
    }, [person, isCreating, form])

    const handleSubmit = async (data: PersonEditFormData) => {
        try {
            await onSave(isCreating ? null : person?.id || null, data)
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error('Failed to save person:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isCreating ? 'Create Person' : 'Edit Person'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCreating 
                            ? 'Create a new person in your contacts database'
                            : 'Update person information and settings'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Enter first name" />
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
                                        <FormLabel>Last Name *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Enter last name" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
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
                                            placeholder="person@example.com"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Primary contact email for the person
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
                                                Person is active and can be managed
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
                                                Person is visible in public directories
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
                                {isCreating ? 'Create Person' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}