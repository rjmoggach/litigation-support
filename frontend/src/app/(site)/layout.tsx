import { Navbar } from '@/components/navigation/navbar'
import { ConditionalSiteLayout } from '@/components/layout/conditional-site-layout'
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Fixed Navbar */}
            <Navbar />
            
            {/* Conditional Site Layout - handles menu bar and breadcrumbs */}
            <ConditionalSiteLayout>
                {children}
            </ConditionalSiteLayout>
        </div>
    )
}
