'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarIcon } from 'lucide-react'
import {
    createAssociationApiV1ContactsAssociationsPost,
    updateAssociationApiV1ContactsAssociationsCompanyIdPersonIdPut,
} from '@/lib/api'
import type { CompanyResponse } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AssociationDialogProps {
    personId: number
    availableCompanies: CompanyResponse[]
    session: { accessToken?: string } | null
    onUpdate: () => void
    trigger: ReactNode
    editMode?: boolean
    existingAssociation?: {
        company_id: number
        person_id: number
        role?: string
        start_date?: string
        end_date?: string
        is_primary?: boolean
    }
}

export function AssociationDialog({
    personId,
    availableCompanies,
    session,
    onUpdate,
    trigger,
    editMode = false,
    existingAssociation
}: AssociationDialogProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [associationForm, setAssociationForm] = useState({
        company_id: existingAssociation?.company_id?.toString() || '',
        role: existingAssociation?.role || '',
        start_date: existingAssociation?.start_date ? new Date(existingAssociation.start_date) : null as Date | null,
        end_date: existingAssociation?.end_date ? new Date(existingAssociation.end_date) : null as Date | null,
        is_primary: existingAssociation?.is_primary || false
    })

    const handleSubmit = async () => {
        if (!session?.accessToken) return
        if (!associationForm.company_id) {
            toast.error('Please select a company')
            return
        }

        setIsSubmitting(true)
        try {
            if (editMode && existingAssociation) {
                await updateAssociationApiV1ContactsAssociationsCompanyIdPersonIdPut({
                    path: { 
                        company_id: existingAssociation.company_id,
                        person_id: existingAssociation.person_id 
                    },
                    body: {
                        role: associationForm.role || undefined,
                        start_date: associationForm.start_date ? format(associationForm.start_date, 'yyyy-MM-dd') : undefined,
                        end_date: associationForm.end_date ? format(associationForm.end_date, 'yyyy-MM-dd') : undefined,
                        is_primary: associationForm.is_primary,
                    },
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Association updated successfully')
            } else {
                const requestBody = {
                    company_id: parseInt(associationForm.company_id),
                    person_id: personId,
                    role: associationForm.role || undefined,
                    start_date: associationForm.start_date ? format(associationForm.start_date, 'yyyy-MM-dd') : undefined,
                    end_date: associationForm.end_date ? format(associationForm.end_date, 'yyyy-MM-dd') : undefined,
                    is_primary: associationForm.is_primary,
                }
                
                await createAssociationApiV1ContactsAssociationsPost({
                    body: requestBody,
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                })
                toast.success('Association created successfully')
            }
            
            setOpen(false)
            setAssociationForm({
                company_id: '',
                role: '',
                start_date: null,
                end_date: null,
                is_primary: false
            })
            onUpdate()
        } catch (error) {
            console.error('Failed to save association:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            toast.error(`Failed to ${editMode ? 'update' : 'create'} association: ${errorMessage}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setIsSubmitting(false)
            // Reset form when closing unless in edit mode
            if (!editMode) {
                setAssociationForm({
                    company_id: '',
                    role: '',
                    start_date: null,
                    end_date: null,
                    is_primary: false
                })
            }
        } else if (editMode && existingAssociation) {
            // Reset to existing values when opening in edit mode
            setAssociationForm({
                company_id: existingAssociation.company_id.toString(),
                role: existingAssociation.role || '',
                start_date: existingAssociation.start_date ? new Date(existingAssociation.start_date) : null,
                end_date: existingAssociation.end_date ? new Date(existingAssociation.end_date) : null,
                is_primary: existingAssociation.is_primary || false
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <div onClick={() => setOpen(true)}>
                {trigger}
            </div>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editMode ? 'Edit Company Association' : 'Add Company Association'}
                    </DialogTitle>
                    <DialogDescription>
                        {editMode 
                            ? 'Update the company association details.'
                            : 'Associate this person with a company and role.'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company">Company</Label>
                        <Select 
                            value={associationForm.company_id} 
                            onValueChange={(value) => setAssociationForm(prev => ({ ...prev, company_id: value }))}
                            disabled={editMode}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCompanies.map((company) => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="role">Role/Title</Label>
                        <Input
                            id="role"
                            value={associationForm.role}
                            onChange={(e) => setAssociationForm(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g., Software Engineer, CEO, Consultant"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !associationForm.start_date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {associationForm.start_date ? (
                                            format(associationForm.start_date, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={associationForm.start_date || undefined}
                                        onSelect={(date) => setAssociationForm(prev => ({ ...prev, start_date: date || null }))}
                                        captionLayout="dropdown"
                                        className="rounded-lg border shadow-sm"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !associationForm.end_date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {associationForm.end_date ? (
                                            format(associationForm.end_date, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={associationForm.end_date || undefined}
                                        onSelect={(date) => setAssociationForm(prev => ({ ...prev, end_date: date || null }))}
                                        captionLayout="dropdown"
                                        className="rounded-lg border shadow-sm"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_primary"
                            checked={associationForm.is_primary}
                            onCheckedChange={(checked) => setAssociationForm(prev => ({ ...prev, is_primary: checked }))}
                        />
                        <Label htmlFor="is_primary">Primary association (shown under name)</Label>
                    </div>
                </div>
                
                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editMode ? 'Update Association' : 'Add Association')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}