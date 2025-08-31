'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { siteNavItems } from '@/content/navigation/data'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-col gap-2 items-center justify-center py-3">
                    <h1 className="text-2xl font-semibold text-accent-foreground text-center">
                        Welcome to Your Dashboard
                    </h1>
                    <p className="text-muted-foreground text-center">
                        Manage your litigation case with organized tools and
                        resources.
                    </p>
                </div>
                {/* Module Cards */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                    {siteNavItems.map((module, index) => (
                        <Card
                            key={index}
                            className="group hover:shadow-lg transition-all duration-200  flex flex-col"
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-md ${module.iconColorClasses} shadow-2xl`}
                                    >
                                        <module.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-md md:text-base">
                                        {module.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                <CardDescription className="text-sm leading-relaxed">
                                    {module.description}
                                </CardDescription>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button
                                    asChild
                                    className="w-full group-hover:bg-primary-foreground"
                                >
                                    <Link
                                        href={module.url}
                                        className="flex items-center justify-center gap-2"
                                    >
                                        Open Module
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="grid gap-3 md:grid-cols-3">
                    <Card>
                        <CardContent className="p-3 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Documents Uploaded
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <div className="text-2xl font-bold text-green-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Contacts Managed
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Upcoming Deadlines
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
