'use client'

import AiOptimizationTab from '@/app/admin/seo/_components/ai-optimization-tab'
import GlobalSeoTab from '@/app/admin/seo/_components/global-seo-tab'
import MonitoringTab from '@/app/admin/seo/_components/monitoring-tab'
import ProjectsSeoTab from '@/app/admin/seo/_components/projects-seo-tab'
import StructuredDataTab from '@/app/admin/seo/_components/structured-data-tab'
import { PageHeader } from '@/components/admin/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBreadcrumbUpdate } from '@/providers/breadcrumb-provider'
import { SearchCode } from 'lucide-react'

export default function AdminSeoPage() {
    // Set breadcrumb for this page
    useBreadcrumbUpdate([
        { label: 'Dashboard', href: '/admin' },
        { label: 'SEO', active: true },
    ])

    return (
        <>
            <PageHeader
                title="SEO"
                subtitle="Manage global SEO settings, structured data, AI optimization, and more"
                icon={SearchCode}
            >
                <></>
            </PageHeader>

            <Tabs defaultValue="global" className="w-full">
                <TabsList>
                    <TabsTrigger value="global">Global</TabsTrigger>
                    <TabsTrigger value="structured">
                        Structured Data
                    </TabsTrigger>
                    <TabsTrigger value="ai">AI Optimization</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="global">
                        <GlobalSeoTab />
                    </TabsContent>

                    <TabsContent value="structured">
                        <StructuredDataTab />
                    </TabsContent>

                    <TabsContent value="ai">
                        <AiOptimizationTab />
                    </TabsContent>

                    <TabsContent value="projects">
                        <ProjectsSeoTab />
                    </TabsContent>

                    <TabsContent value="monitoring">
                        <MonitoringTab />
                    </TabsContent>
                </div>
            </Tabs>
        </>
    )
}
