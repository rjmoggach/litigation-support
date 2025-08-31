'use client'

import { CalendarWidget } from '@/components/calendar-widget'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

interface FormFieldProps {
    label: string
    id: string
    value: string | boolean | number | null | undefined
    onChange: (value: string | boolean | number) => void
    onSave?: (value: string | boolean | number) => void
    type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'calendar' | 'switch'
    placeholder?: string
    isEditing: boolean
    disabled?: boolean
}

export function FormField({
    label,
    id,
    value,
    onChange,
    onSave,
    type = 'text',
    placeholder,
    isEditing,
    disabled = false,
}: FormFieldProps) {
    const renderViewValue = () => {
        if (!value) {
            return <span className="text-muted-foreground">Not specified</span>
        }

        switch (type) {
            case 'email':
                return (
                    <a
                        href={`mailto:${value}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        {String(value)}
                    </a>
                )
            case 'tel':
                return (
                    <a
                        href={`tel:${value}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        {String(value)}
                    </a>
                )
            case 'url':
                return (
                    <a
                        href={String(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        {String(value)}
                    </a>
                )
            case 'date':
            case 'calendar':
                if (!value) return 'Not specified'
                const parsedDate = parseLocalDate(String(value))
                if (!parsedDate) return 'Invalid date'
                
                // Calculate age if it's a date of birth
                if (id === 'date_of_birth') {
                    const today = new Date()
                    const age = today.getFullYear() - parsedDate.getFullYear()
                    const monthDiff = today.getMonth() - parsedDate.getMonth()
                    const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsedDate.getDate()) ? age - 1 : age
                    return `${formatLocalDate(parsedDate)} (${finalAge} years old)`
                }
                
                return formatLocalDate(parsedDate)
            default:
                return String(value)
        }
    }

    if (type === 'switch') {
        return (
            <div className="flex items-center space-x-2">
                <Switch
                    id={id}
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => onChange(checked)}
                    disabled={disabled || !isEditing}
                />
                <Label htmlFor={id}>{label}</Label>
            </div>
        )
    }

    if (type === 'calendar') {
        const selectedDate = value ? parseLocalDate(String(value)) : undefined
        
        // Calculate age if it's a date of birth
        let ageDisplay = ''
        if (id === 'date_of_birth' && selectedDate) {
            const today = new Date()
            const age = today.getFullYear() - selectedDate.getFullYear()
            const monthDiff = today.getMonth() - selectedDate.getMonth()
            const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate()) ? age - 1 : age
            ageDisplay = `${finalAge} years old`
        }
        
        return (
            <div>
                <Label htmlFor={id}>{label}</Label>
                {isEditing ? (
                    <div className="space-y-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !selectedDate && 'text-muted-foreground',
                                    )}
                                    disabled={disabled}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate
                                        ? format(selectedDate, 'PPP')
                                        : placeholder || 'Select date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarWidget
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        const dateValue = date ? formatLocalDate(date) : ''
                                        onChange(dateValue)
                                        if (onSave) {
                                            onSave(dateValue)
                                        }
                                    }}
                                    disabled={(date: Date) => date > new Date()}
                                    defaultMonth={selectedDate || new Date()}
                                    className="border-0 shadow-none"
                                />
                            </PopoverContent>
                        </Popover>
                        {ageDisplay && (
                            <div className="text-xs text-muted-foreground pl-2">
                                Age: {ageDisplay}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-2 text-sm">{renderViewValue()}</div>
                )}
            </div>
        )
    }


    return (
        <div>
            <Label htmlFor={id}>{label}</Label>
            {isEditing ? (
                <Input
                    id={id}
                    type={type === 'tel' ? 'tel' : type === 'url' ? 'url' : type === 'date' ? 'date' : type}
                    value={type === 'date' && value ? 
                        // For date inputs, ensure we show in YYYY-MM-DD format for the input
                        (String(value).includes('T') ? String(value).split('T')[0] : String(value))
                        : String(value || '')
                    }
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && onSave) {
                            onSave(e.currentTarget.value)
                        }
                    }}
                    onBlur={(e) => {
                        if (onSave) {
                            onSave(e.target.value)
                        }
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            ) : (
                <div className="p-2 text-sm">{renderViewValue()}</div>
            )}
        </div>
    )
}