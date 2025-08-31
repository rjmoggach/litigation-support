'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'

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

interface ConnectionTestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    testResult: TestResult | null
}

export function ConnectionTestDialog({
    open,
    onOpenChange,
    testResult,
}: ConnectionTestDialogProps) {
    if (!testResult) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col">
                <DialogHeader>
                    <DialogTitle>Connection Test Results</DialogTitle>
                    <DialogDescription>
                        Testing connection for{' '}
                        {testResult.connection_name ||
                            testResult.connection_email}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 space-y-4">
                    {/* Connection Status */}
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="size-5 text-green-600" />
                        <div>
                            <div className="font-medium text-green-800">
                                Connection Successful
                            </div>
                            <div className="text-sm text-green-600">
                                {testResult.message}
                            </div>
                        </div>
                    </div>

                    {/* Latest Email */}
                    {testResult.latest_message ? (
                        <div className="flex flex-col flex-1 space-y-3">
                            <h4 className="font-medium">
                                Latest Email Received (Preview)
                            </h4>
                            <div className="border rounded-sm p-4 space-y-2 bg-card text-sm flex-1 flex flex-col">
                                {/* Subject */}
                                <div className="font-semibold text-lg">
                                    {testResult.latest_message.subject}
                                </div>

                                {/* From and Date */}
                                <div className="flex justify-between items-start">
                                    <div className="break-all">
                                        {testResult.latest_message.from}
                                    </div>
                                    <div className="text-foreground ml-4 whitespace-nowrap">
                                        {testResult.latest_message.date}
                                    </div>
                                </div>

                                {/* To line - if available */}
                                <div className="text-foreground">
                                    To: {testResult.connection_email}
                                </div>

                                {/* Separator */}
                                <hr className="border-muted" />

                                {/* Content */}
                                {testResult.latest_message.snippet && (
                                    <div className="text-foreground flex-1 overflow-auto">
                                        {testResult.latest_message.snippet}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : testResult.has_gmail_scope === false ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <AlertCircle className="size-5 text-yellow-600" />
                                <div>
                                    <div className="font-medium text-yellow-800">
                                        Gmail Access Not Granted
                                    </div>
                                    <div className="text-sm text-yellow-600">
                                        This connection doesn't have Gmail
                                        reading permissions. Delete and
                                        reconnect to grant Gmail access.
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p>
                                    <strong>Granted scopes:</strong>
                                </p>
                                <ul className="list-disc list-inside mt-1">
                                    {testResult.granted_scopes?.map(
                                        (scope: string, index: number) => (
                                            <li
                                                key={index}
                                                className="break-all"
                                            >
                                                {scope}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Mail className="size-12 mx-auto mb-2 opacity-50" />
                            <p>No recent emails found in inbox</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="primary"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
