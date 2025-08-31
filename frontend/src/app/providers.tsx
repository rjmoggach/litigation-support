'use client'

import { SmoothScroll } from '@/components/smooth-scroll'
import { AuthProvider } from '@/providers/auth-provider'
import { BreadcrumbProvider } from '@/providers/breadcrumb-provider'
import { ThemeProvider } from '@/providers/theme-provider'
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
            <AuthProvider>
                <SmoothScroll />
                <BreadcrumbProvider>{children}</BreadcrumbProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}
