/**
 * Formats a date to ISO date string (yyyy-MM-dd) in local timezone
 * This prevents timezone shifts when sending dates to the backend
 */
export function formatLocalDate(date: Date | undefined | null): string {
    if (!date) return ''
    
    // Get the local date components
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
}

/**
 * Parses an ISO date string (yyyy-MM-dd) as a local date
 * This prevents timezone shifts when receiving dates from the backend
 */
export function parseLocalDate(dateString: string | undefined | null): Date | undefined {
    if (!dateString) return undefined
    
    // Parse the date components
    const [year, month, day] = dateString.split('-').map(Number)
    
    if (!year || !month || !day) return undefined
    
    // Create a date in local timezone (month is 0-indexed in Date constructor)
    return new Date(year, month - 1, day)
}

/**
 * Checks if a date string is valid
 */
export function isValidDateString(dateString: string | undefined | null): boolean {
    if (!dateString) return false
    
    const date = parseLocalDate(dateString)
    return date !== undefined && !isNaN(date.getTime())
}