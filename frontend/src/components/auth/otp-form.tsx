'use client'

import { CircleDot, Shield } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

interface OTPFormProps extends React.ComponentProps<'div'> {
    title?: string
    description?: string
    icon?: React.ReactNode
    email?: string
    length?: number
}

export function OTPForm({
    className,
    title = 'Enter Verification Code',
    description = "We&apos;ve sent a verification code to your device",
    icon,
    email,
    length = 6,
    ...props
}: OTPFormProps) {
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
                                <CircleDot className="size-6" />
                            </div>
                            <span className="sr-only">Home</span>
                        </Link>
                        <h1 className="text-xl font-bold">{title}</h1>
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                {icon || (
                                    <Shield className="size-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="text-center text-sm text-muted-foreground">
                                {description}
                            </div>
                            {email && (
                                <div className="text-center text-sm font-medium">
                                    {email}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                                Enter the {length}-digit code
                            </div>
                            <InputOTP
                                maxLength={length}
                                value={value}
                                onChange={(value) => setValue(value)}
                                className="gap-2"
                            >
                                {Array.from({ length }, (_, i) => (
                                    <InputOTPSlot key={i} index={i} />
                                ))}
                            </InputOTP>
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={value.length !== length}
                        >
                            Verify Code
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
                            Need help?{' '}
                            <a
                                href="#"
                                className="underline underline-offset-4"
                            >
                                Contact support
                            </a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
