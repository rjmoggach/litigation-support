import { DynamicBreadcrumb } from '@/components/dashboard/dynamic-breadcrumb'
import { Navbar } from '@/components/navigation/navbar'
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Fixed Navbar */}
            <Navbar />

            {/* Breadcrumb section */}
            <div className="h-8 mt-16 flex items-center flex-shrink-0">
                <div className="container max-w-8xl mx-auto max-lg:px-6">
                    <DynamicBreadcrumb />
                </div>
            </div>

            {/* Main content area - fills remaining space */}
            <div className="flex-1 flex flex-col container max-w-8xl mx-auto max-lg:px-6 pt-4 pb-6">
                {children}
            </div>
        </div>
    )
}
