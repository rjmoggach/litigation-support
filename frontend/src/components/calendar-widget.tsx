'use client'

import { Calendar } from '@/components/ui/calendar'

interface CalendarWidgetProps {
    selected?: Date
    onSelect?: (date: Date | undefined) => void
    disabled?: (date: Date) => boolean
    className?: string
    defaultMonth?: Date
}

export function CalendarWidget({
    selected,
    onSelect,
    disabled,
    className = '',
    defaultMonth,
}: CalendarWidgetProps) {
    return (
        <Calendar
            mode="single"
            selected={selected}
            onSelect={onSelect}
            disabled={disabled}
            defaultMonth={defaultMonth}
            captionLayout="dropdown"
            className={`rounded-md border shadow-sm ${className}`}
        />
    )
}
