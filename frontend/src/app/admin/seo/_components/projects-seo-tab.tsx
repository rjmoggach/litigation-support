"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProjectsSeoTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Projects SEO Management</CardTitle>
                <CardDescription>
                    Bulk edit and review SEO metadata for projects. Integration will be added in a later task.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    Coming soon: table with project titles, slugs, descriptions, and SEO fields for bulk editing.
                </div>
            </CardContent>
        </Card>
    )
}
