'use client'

import { CircleDot, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPasswordApiV1AuthResetPasswordPost } from '@/lib/api/sdk.gen'
import { client } from '@/lib/api/client.gen'
import { cn } from '@/lib/utils'

export function ResetPasswordForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // If no token, show error
    if (!token) {
        return (
            <div className={cn('flex flex-col gap-6', className)} {...props}>
                <div className="flex flex-col items-center gap-4">
                    <Link href="/" className="flex flex-col items-center gap-2 font-medium">
                        <div className="flex size-8 items-center justify-center rounded-md">
                            <CircleDot className="size-6" />
                        </div>
                        <span className="sr-only">Home</span>
                    </Link>
                    <h1 className="text-xl font-bold text-destructive">Invalid Reset Link</h1>
                    <p className="text-center text-sm text-muted-foreground">
                        This password reset link is invalid or has expired.
                    </p>
                    <Button asChild>
                        <Link href="/login">Return to Sign In</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long')
            return
        }

        setIsLoading(true)

        try {
            const response = await resetPasswordApiV1AuthResetPasswordPost({
                body: {
                    token,
                    new_password: password,
                },
                client
            })

            if (response.data) {
                toast.success('Password reset successfully! Please sign in with your new password.')
                
                // Sign out any existing session
                await signOut({ redirect: false })
                
                // Redirect to login
                router.push('/login')
            } else {
                throw new Error('Failed to reset password')
            }
            
        } catch (error: any) {
            console.error('Password reset error:', error)
            let errorMessage = 'Failed to reset password'
            
            // Handle API error responses
            if (error?.body?.detail) {
                errorMessage = error.body.detail
            } else if (error?.message) {
                errorMessage = error.message
            }
            
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="flex size-8 items-center justify-center rounded-md">
                                <CircleDot className="size-6" />
                            </div>
                            <span className="sr-only">Home</span>
                        </Link>
                        <h1 className="text-xl font-bold">
                            Reset Your Password
                        </h1>
                        <div className="text-center text-sm text-muted-foreground">
                            Enter your new password below to reset your account
                            password.
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                    <span className="sr-only">
                                        {showPassword
                                            ? 'Hide password'
                                            : 'Show password'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="confirm-password">
                                Confirm New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirm-password"
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword,
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                    <span className="sr-only">
                                        {showConfirmPassword
                                            ? 'Hide password'
                                            : 'Show password'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Resetting Password...' : 'Reset Password'}
                        </Button>
                        <div className="text-center text-sm">
                            Remember your password?{' '}
                            <Link
                                href="/login"
                                className="underline underline-offset-4"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
