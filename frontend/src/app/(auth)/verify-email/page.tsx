'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Command, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { verifyEmailApiV1AuthVerifyEmailPost } from '@/lib/api/sdk.gen'

function VerifyEmailContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
    const [message, setMessage] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('invalid')
                setMessage('No verification token provided')
                return
            }

            try {
                console.log('Verifying token:', token)
                const response = await verifyEmailApiV1AuthVerifyEmailPost({
                    body: { token }
                })

                if (response.data) {
                    setStatus('success')
                    setMessage('Email verified successfully! You can now log in to your account.')
                } else {
                    setStatus('error')
                    setMessage('Email verification failed. Please try again.')
                }
            } catch (err: unknown) {
                console.error('Verification error:', err)
                setStatus('error')
                
                let errorMessage = 'Email verification failed. Please try again.'
                if (err && typeof err === 'object' && 'body' in err && err.body && typeof err.body === 'object' && 'detail' in err.body) {
                    errorMessage = String(err.body.detail)
                } else if (err && typeof err === 'object' && 'message' in err) {
                    errorMessage = String(err.message)
                }
                setMessage(errorMessage)
            }
        }

        verifyToken()
    }, [token])

    const handleLoginRedirect = () => {
        router.push('/login')
    }

    const handleHomeRedirect = () => {
        router.push('/')
    }

    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2">
                    <Link
                        href="/"
                        className="flex flex-col items-center gap-2 font-medium"
                    >
                        <div className="flex size-8 items-center justify-center rounded-md">
                            <Command className="size-6" />
                        </div>
                        <span className="sr-only">Home</span>
                    </Link>
                    <h1 className="text-xl font-bold">Email Verification</h1>
                    
                    <div className="flex flex-col items-center gap-4">
                        {status === 'loading' && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                    <Loader2 className="size-6 text-muted-foreground animate-spin" />
                                </div>
                                <div className="text-center text-sm text-muted-foreground">
                                    Verifying your email...
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                                    <CheckCircle className="size-6 text-green-600" />
                                </div>
                                <div className="text-center text-sm text-green-600 font-medium">
                                    Email Verified Successfully!
                                </div>
                            </div>
                        )}

                        {(status === 'error' || status === 'invalid') && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                    <XCircle className="size-6 text-red-600" />
                                </div>
                                <div className="text-center text-sm text-red-600 font-medium">
                                    Verification Failed
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    {message}
                </div>

                <div className="flex flex-col gap-3">
                    {status === 'success' && (
                        <Button onClick={handleLoginRedirect} className="w-full">
                            Continue to Login
                        </Button>
                    )}
                    
                    {(status === 'error' || status === 'invalid') && (
                        <>
                            <Button onClick={handleHomeRedirect} className="w-full">
                                Go to Home
                            </Button>
                            <Button variant="outline" asChild className="w-full">
                                <Link href="/signup">
                                    Try Signing Up Again
                                </Link>
                            </Button>
                        </>
                    )}
                </div>

                {status !== 'loading' && (
                    <div className="text-center text-sm">
                        <Link
                            href="/"
                            className="underline underline-offset-4"
                        >
                            Back to Home
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col gap-6 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                        <Loader2 className="size-6 text-muted-foreground animate-spin" />
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                </div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}