'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEmailConnections } from '@/hooks/use-email-connections'
import { Mail, Plus } from 'lucide-react'
import { useState } from 'react'
import { ConnectionCard } from './connection-card'
import { ConnectionTestDialog } from './connection-test-dialog'

interface TestResult {
    connection_id: number
    status: string
    email: string
    message: string
    latest_message?: {
        from: string
        date: string
        subject: string
        snippet?: string
    }
    has_gmail_scope: boolean
    granted_scopes: string[]
    connection_email: string
    connection_name: string
}

export function EmailConnectionsManager() {
    const {
        connections,
        loading,
        actionLoading,
        addConnection,
        deleteConnection,
        refreshConnection,
        testConnection,
    } = useEmailConnections()

    const [testDialogOpen, setTestDialogOpen] = useState(false)
    const [testResult, setTestResult] = useState<TestResult | null>(null)

    const handleTestConnection = async (connection: any) => {
        const result = await testConnection(connection)
        if (result) {
            setTestResult(result)
            setTestDialogOpen(true)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-5" />
                        Email Account Connections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        Loading connections...
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <ConnectionTestDialog
                open={testDialogOpen}
                onOpenChange={setTestDialogOpen}
                testResult={testResult}
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="size-5" />
                        Email Account Connections
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Connect additional Gmail/Workspace accounts for evidence
                        collection
                    </p>
                </CardHeader>

                <CardContent className="space-y-4">
                    {connections.length === 0 ? (
                        <div className="text-center py-8">
                            <Mail className="size-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                No additional email accounts connected
                            </p>
                            <Button
                                onClick={addConnection}
                                disabled={actionLoading.add}
                                className="gap-2"
                            >
                                <Plus className="size-4" />
                                {actionLoading.add
                                    ? 'Add Account...'
                                    : 'Connect Email Account'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {connections.map((connection) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        onTest={handleTestConnection}
                                        onRefresh={refreshConnection}
                                        onDelete={deleteConnection}
                                        actionLoading={actionLoading}
                                    />
                                ))}
                            </div>

                            <Button
                                onClick={addConnection}
                                disabled={actionLoading.add}
                                variant="outline"
                                className="gap-2"
                                size="sm"
                            >
                                <Plus className="size-4" />
                                {actionLoading.add
                                    ? 'Add Another Account...'
                                    : 'Add Another Account'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
