import { OTPForm } from '@/components/auth/otp-form'
import { Mail } from 'lucide-react'

export default function OTPPage() {
    return (
        <OTPForm
            title="Two-Factor Authentication"
            description="Enter the verification code from your authenticator app"
            icon={<Mail className="size-6 text-muted-foreground" />}
        />
    )
}
