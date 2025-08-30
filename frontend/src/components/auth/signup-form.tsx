'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Scale } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import privacyContent from '@/content/privacy-policy.md'
import termsContent from '@/content/terms-of-service.md'
import { registerApiV1AuthRegisterPost } from '@/lib/api/sdk.gen'
import type { UserCreate } from '@/lib/api/types.gen'
import { cn } from '@/lib/utils'
import { LegalDialog } from './legal-dialog'

const signupSchema = z
    .object({
        fullName: z.string().min(1, 'Full name is required'),
        email: z.string().email('Please enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
        terms: z
            .boolean()
            .refine((val) => val === true, 'You must agree to the terms'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords don&apos;t match',
        path: ['confirmPassword'],
    })

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState<string>('')
    const [success, setSuccess] = useState<string>('')

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    })

    const onSubmit = async (data: SignupFormData) => {
        console.log('=== SIGNUP FORM SUBMISSION START ===')
        console.log('Form data received:', data)

        try {
            setError('')
            setSuccess('')

            const userData: UserCreate = {
                email: data.email,
                full_name: data.fullName,
                password: data.password,
                is_active: true,
                is_superuser: false,
            }

            console.log('Prepared userData for API:', userData)
            console.log('About to call registerApiV1AuthRegisterPost...')

            const response = await registerApiV1AuthRegisterPost({
                body: userData,
            })

            console.log('API response received:', response)
            console.log('Response data:', response.data)
            console.log('Response status:', response.response?.status)

            if (response.data) {
                console.log('Registration successful!')
                setSuccess(
                    'Registration successful! Please check your email and click the verification link to activate your account.',
                )
            } else {
                console.log('No response data received')
                setError('Registration failed. Please try again.')
            }
        } catch (err: unknown) {
            console.log('=== ERROR CAUGHT ===')
            console.error('Full error object:', err)
            console.error('Error name:', (err as any)?.name) // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error message:', (err as any)?.message) // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error status:', (err as any)?.status) // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error response:', (err as any)?.response) // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error body:', (err as any)?.body) // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error data:', (err as any)?.data) // eslint-disable-line @typescript-eslint/no-explicit-any

            let errorMessage = 'Registration failed. Please try again.'

            if (
                err &&
                typeof err === 'object' &&
                'body' in err &&
                err.body &&
                typeof err.body === 'object' &&
                'detail' in err.body
            ) {
                if (typeof err.body.detail === 'string') {
                    errorMessage = err.body.detail
                } else if (Array.isArray(err.body.detail)) {
                    errorMessage = err.body.detail
                        .map((e: unknown) => {
                            if (
                                e &&
                                typeof e === 'object' &&
                                'loc' in e &&
                                'msg' in e
                            ) {
                                const loc = Array.isArray(e.loc)
                                    ? e.loc.join('.')
                                    : String(e.loc || '')
                                return `${loc}: ${String(e.msg)}`
                            }
                            return String(e)
                        })
                        .join(', ')
                }
            } else if (
                err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'data' in err.response &&
                err.response.data &&
                typeof err.response.data === 'object' &&
                'detail' in err.response.data
            ) {
                errorMessage = String(err.response.data.detail)
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String(err.message)
            }

            console.log('Final error message:', errorMessage)
            setError(errorMessage)
        }

        console.log('=== SIGNUP FORM SUBMISSION END ===')
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <Link
                            href="/"
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="flex size-8 items-center justify-center rounded-md">
                                <Scale className="size-6" />
                            </div>
                            <span className="sr-only">Home</span>
                        </Link>
                        <h1 className="text-xl font-bold">Create an account</h1>
                        <div className="text-center text-sm">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="underline underline-offset-4"
                            >
                                Sign in
                            </Link>
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
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                autoComplete="name"
                                {...register('fullName')}
                                disabled={isSubmitting}
                            />
                            {errors.fullName && (
                                <p className="text-sm text-red-600">
                                    {errors.fullName.message}
                                </p>
                            )}
                        </div>
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
                        <div className="grid gap-3">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register('password')}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isSubmitting}
                                    tabIndex={-1}
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
                            {errors.password && (
                                <p className="text-sm text-red-600">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="confirmPassword">
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register('confirmPassword')}
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword,
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isSubmitting}
                                    tabIndex={-1}
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
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-600">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="terms"
                                disabled={isSubmitting}
                                onCheckedChange={(checked) => {
                                    console.log(
                                        'Terms checkbox changed:',
                                        checked,
                                    )
                                    // Manually set the value since Checkbox doesn't work well with register
                                    setValue('terms', checked === true)
                                }}
                            />
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                I agree to the{' '}
                                <LegalDialog
                                    title="Terms of Service"
                                    lastUpdated="January 1, 2025"
                                    content={termsContent}
                                    triggerText="Terms of Service"
                                />{' '}
                                and{' '}
                                <LegalDialog
                                    title="Privacy Policy"
                                    lastUpdated="January 1, 2025"
                                    content={privacyContent}
                                    triggerText="Privacy Policy"
                                />
                            </label>
                        </div>
                        {errors.terms && (
                            <p className="text-sm text-red-600">
                                {errors.terms.message}
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                            onClick={() => {
                                console.log('Create Account button clicked!')
                                console.log('Current form errors:', errors)
                                console.log('Form is submitting:', isSubmitting)
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                                signIn('google', { callbackUrl: '/' })
                            }
                            disabled={isSubmitting}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
