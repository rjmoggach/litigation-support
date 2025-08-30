'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Scale } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPasswordApiV1AuthForgotPasswordPost } from '@/lib/api/sdk.gen'
import { cn } from '@/lib/utils'

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState<string>('')

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            setError('')
            setSuccess('')

            console.log('Sending forgot password request for:', data.email)

            const response = await forgotPasswordApiV1AuthForgotPasswordPost({
                body: { email: data.email },
            })

            if (response.data) {
                setSuccess(
                    'If the email exists, a password reset link has been sent. Please check your email.',
                )
            } else {
                setError('Failed to send reset email. Please try again.')
            }
        } catch (err: unknown) {
            console.error('Forgot password error:', err)
            let errorMessage = 'Failed to send reset email. Please try again.'

            if (
                err &&
                typeof err === 'object' &&
                'body' in err &&
                err.body &&
                typeof err.body === 'object' &&
                'detail' in err.body
            ) {
                errorMessage = String(err.body.detail)
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message)
            }

            setError(errorMessage)
        }
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-4 w-full justify-between">
                            <div className="w-16" /> {/* Spacer */}
                            <Link
                                href="/"
                                className="flex items-center gap-2 font-medium"
                            >
                                <div className="flex size-8 items-center justify-center rounded-md">
                                    <Scale className="size-6" />
                                </div>
                            </Link>
                            <Link
                                href="/login"
                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="size-4" />
                                <span className="text-sm">Back</span>
                            </Link>
                        </div>
                        <h1 className="text-xl font-bold">Forgot Password?</h1>
                        <div className="text-center text-sm text-muted-foreground">
                            Enter your email address and we&apos;ll send you a
                            link to reset your password.
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                            {success}
                        </div>
                    )}

                    <div className="flex flex-col gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                autoComplete="email"
                                {...register('email')}
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-600">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            type="button"
                            className="w-full"
                            asChild
                        >
                            <Link href="/login">
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Sign In
                            </Link>
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
