'use client'

import { Mail, Scale } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

export function VerifyEmailForm({
    className,
    email = 'm@example.com',
    ...props
}: React.ComponentProps<'div'> & { email?: string }) {
    const [value, setValue] = useState('')

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <form>
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
                        <h1 className="text-xl font-bold">Verify Your Email</h1>
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Mail className="size-6 text-muted-foreground" />
                            </div>
                            <div className="text-center text-sm text-muted-foreground">
                                We&apos;ve sent a verification code to
                            </div>
                            <div className="text-center text-sm font-medium">
                                {email}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                                Enter the 6-digit code
                            </div>
                            <InputOTP
                                maxLength={6}
                                value={value}
                                onChange={(value) => setValue(value)}
                                className="gap-2"
                            >
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTP>
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={value.length !== 6}
                        >
                            Verify Email
                        </Button>
                        <div className="text-center text-sm">
                            Didn&apos;t receive the code?{' '}
                            <button
                                type="button"
                                className="underline underline-offset-4"
                            >
                                Resend
                            </button>
                        </div>
                        <div className="text-center text-sm">
                            Wrong email?{' '}
                            <a
                                href="#"
                                className="underline underline-offset-4"
                            >
                                Change email address
                            </a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
