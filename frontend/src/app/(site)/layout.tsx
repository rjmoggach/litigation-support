import { DynamicBreadcrumb } from '@/components/dashboard/dynamic-breadcrumb'
import { Navbar } from '@/components/navigation/navbar'
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            {/* Defaults provided via Next.js Metadata API */}
            <Navbar />
            <div className="h-8 mt-16 flex items-center">
                <div className="container max-w-8xl mx-auto max-lg:px-6">
                    <DynamicBreadcrumb />
                </div>
            </div>
            <div className="container max-w-8xl mx-auto max-lg:px-6 space-y-6 pt-4">
                {children}
            </div>
        </div>
    )
}
