'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, User } from 'lucide-react'

interface AccountInformationProps {
    fullName: string
    email: string
    user: any
    isLoading: boolean
    onFullNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onPasswordReset: () => void
}

export function AccountInformation({
    fullName,
    email,
    user,
    isLoading,
    onFullNameChange,
    onKeyDown,
    onPasswordReset,
}: AccountInformationProps) {
    return (
        <Card>
            <CardHeader className="my-0 py-0">
                <CardTitle className="flex items-center justify-between text-lg font-medium">
                    <div className="flex items-center gap-2">
                        <User className="size-5" />
                        Account Information
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={onFullNameChange}
                            onKeyDown={onKeyDown}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled={true}
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Account Status
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {user?.is_active ? 'Active' : 'Inactive'}
                            </p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Email Status
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                                {user?.is_verified ? (
                                    <>
                                        <CheckCircle className="size-4 text-green-600" />
                                        <span className="text-sm text-green-600">
                                            Verified
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        Unverified
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">
                                Member Since
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                {user?.created_at
                                    ? new Date(
                                          user.created_at,
                                      ).toLocaleDateString()
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t pt-4 mt-4 gap-3">
                        <div>
                            <p className="font-medium">Password</p>
                            <p className="text-muted-foreground text-sm">
                                Reset your password via email
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={onPasswordReset}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            Reset Password
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
