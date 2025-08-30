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
            <div className="min-h-screen pt-24">{children}</div>
        </div>
    )
}
