'use client'

export default function PeoplePagesLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-1 flex-col overflow-hidden p-4">
            {children}
        </div>
    )
}
