import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-3 p-3 md:p-10">
            <div className="w-full max-w-sm">{children}</div>
            <ThemeToggle />
        </div>
    )
}
