'use client'

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
import type { User } from '@/lib/api/types.gen'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const userEditSchema = z.object({
    email: z.string().email('Invalid email address'),
    full_name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name is too long'),
    is_active: z.boolean(),
    is_verified: z.boolean(),
    is_superuser: z.boolean(),
    roles: z.array(z.string()).optional(),
})

type UserEditFormData = z.infer<typeof userEditSchema>

interface UserEditDialogProps {
    user: User | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (userId: number, data: Partial<UserEditFormData>) => Promise<void>
}

export function UserEditDialog({
    user,
    open,
    onOpenChange,
    onSave,
}: UserEditDialogProps) {
    const form = useForm<UserEditFormData>({
        resolver: zodResolver(userEditSchema),
        defaultValues: {
            email: user?.email || '',
            full_name: user?.full_name || '',
            is_active: user?.is_active ?? true,
            is_verified: (user as any)?.is_verified ?? false, // eslint-disable-line @typescript-eslint/no-explicit-any
            is_superuser: user?.is_superuser ?? false,
            roles: (user as any)?.roles || ['user'], // eslint-disable-line @typescript-eslint/no-explicit-any
        },
    })

    // Reset form when user changes
    React.useEffect(() => {
        if (user) {
            form.reset({
                email: user.email,
                full_name: user.full_name || '',
                is_active: user.is_active ?? true,
                is_verified: (user as any)?.is_verified ?? false, // eslint-disable-line @typescript-eslint/no-explicit-any
                is_superuser: user.is_superuser ?? false,
                roles: (user as any)?.roles || ['user'], // eslint-disable-line @typescript-eslint/no-explicit-any
            })
        }
    }, [user, form])

    const handleSubmit = async (data: UserEditFormData) => {
        if (!user) return

        try {
            await onSave(user.id, data)
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error('Failed to save user:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Update user information and permissions
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-3"
                    >
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
                                            disabled
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Email cannot be changed
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Enter full name"
                                        />
                                    </FormControl>
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
                                                User can access the application
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_verified"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Email Verified
                                            </FormLabel>
                                            <FormDescription>
                                                User has verified their email
                                                address
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="is_superuser"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Administrator</FormLabel>
                                            <FormDescription>
                                                Grant full admin privileges
                                                (supersedes role selection)
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select
                                        onValueChange={(value) =>
                                            field.onChange([value])
                                        }
                                        defaultValue={
                                            field.value?.[0] || 'user'
                                        }
                                        disabled={form.watch('is_superuser')}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">
                                                User
                                            </SelectItem>
                                            <SelectItem value="staff">
                                                Staff
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        User role determines access level. Admin
                                        checkbox overrides this setting.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-3"></div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

// Add missing React import
import * as React from 'react'
