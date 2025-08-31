'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    AlertTriangle,
    Mail,
    Shield,
    User,
    CheckCircle,
    ArrowRight,
} from 'lucide-react'

interface AddEmailAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConnect: () => Promise<void>
    isConnecting: boolean
}

export function AddEmailAccountDialog({
    open,
    onOpenChange,
    onConnect,
    isConnecting,
}: AddEmailAccountDialogProps) {
    const handleConnect = async () => {
        await onConnect()
        // Dialog will close automatically when connection succeeds
    }

    const permissions = [
        {
            icon: <Mail className="size-4 text-blue-600" />,
            title: "Read Gmail Messages",
            description: "Access to read your email messages for evidence collection",
            scope: "gmail.readonly"
        },
        {
            icon: <User className="size-4 text-green-600" />,
            title: "Basic Profile Info",
            description: "Your name and email address to identify the account",
            scope: "userinfo.profile & userinfo.email"
        }
    ]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="size-5 text-primary" />
                        Connect Email Account
                    </DialogTitle>
                    <DialogDescription>
                        Connect an additional Gmail or Google Workspace account for evidence collection
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Provider Selection */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">Email Provider</h4>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className="size-8 bg-white rounded flex items-center justify-center">
                                    <svg className="size-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-medium">Google</div>
                                    <div className="text-sm text-muted-foreground">
                                        Gmail & Workspace accounts
                                    </div>
                                </div>
                            </div>
                            <Badge variant="secondary">Recommended</Badge>
                        </div>
                    </div>

                    <Separator />

                    {/* Permissions */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <Shield className="size-4" />
                            Required Permissions
                        </h4>
                        <div className="space-y-2">
                            {permissions.map((permission, index) => (
                                <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                                    {permission.icon}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">
                                            {permission.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {permission.description}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                                            {permission.scope}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Security Notice */}
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="size-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                            <div className="font-medium text-amber-800 mb-1">
                                Security & Privacy
                            </div>
                            <div className="text-amber-700 space-y-1">
                                <p>• Your credentials are encrypted and stored securely</p>
                                <p>• We only access emails you explicitly grant permission for</p>
                                <p>• You can revoke access at any time from your Google account</p>
                            </div>
                        </div>
                    </div>

                    {/* Connection Steps Preview */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">What happens next:</h4>
                        <div className="space-y-2">
                            {[
                                "Redirect to Google OAuth for secure authentication",
                                "Grant permissions for email access",
                                "Return to app with connected account",
                                "Start using account for evidence collection"
                            ].map((step, index) => (
                                <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                    </div>
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="gap-2"
                        size="lg"
                    >
                        {isConnecting ? (
                            <>
                                <div className="animate-spin rounded-full size-4 border-2 border-white border-t-transparent" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="size-4" />
                                Connect Google Account
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isConnecting}
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}