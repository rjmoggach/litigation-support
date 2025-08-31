'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clock, RefreshCw } from 'lucide-react'

interface SessionTimeoutProps {
  // Warning time in minutes before expiry (default: 5 minutes)
  warningTime?: number
  // Check interval in seconds (default: 30 seconds)
  checkInterval?: number
}

export function SessionTimeout({ 
  warningTime = 5, 
  checkInterval = 30 
}: SessionTimeoutProps) {
  const { data: session, update } = useSession()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isExtending, setIsExtending] = useState(false)

  useEffect(() => {
    if (!session?.expires) return

    const checkSessionExpiry = () => {
      const now = new Date().getTime()
      const expiresAt = new Date(session.expires!).getTime()
      const timeUntilExpiry = expiresAt - now
      const warningThreshold = warningTime * 60 * 1000 // Convert to milliseconds

      if (timeUntilExpiry <= 0) {
        // Session has expired
        signOut({ callbackUrl: '/?expired=true' })
        return
      }

      if (timeUntilExpiry <= warningThreshold && !showWarning) {
        // Show warning
        setShowWarning(true)
        setTimeLeft(Math.ceil(timeUntilExpiry / 1000 / 60)) // Convert to minutes
      } else if (timeUntilExpiry > warningThreshold && showWarning) {
        // Hide warning if session was extended
        setShowWarning(false)
      }

      // Update time left if warning is shown
      if (showWarning) {
        setTimeLeft(Math.ceil(timeUntilExpiry / 1000 / 60))
      }
    }

    // Initial check
    checkSessionExpiry()

    // Set up periodic checks
    const interval = setInterval(checkSessionExpiry, checkInterval * 1000)

    return () => clearInterval(interval)
  }, [session, warningTime, checkInterval, showWarning])

  const handleExtendSession = async () => {
    setIsExtending(true)
    try {
      // Trigger session update which will refresh the token
      await update()
      setShowWarning(false)
    } catch (error) {
      console.error('Failed to extend session:', error)
      // If extension fails, logout
      signOut({ callbackUrl: '/?error=session-extend-failed' })
    } finally {
      setIsExtending(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/?logout=timeout' })
  }

  if (!showWarning) {
    return null
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire in{' '}
            <span className="font-semibold text-amber-600">
              {timeLeft} minute{timeLeft !== 1 ? 's' : ''}
            </span>
            . Would you like to extend your session?
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground">
          To protect your account, we automatically log you out after a period of inactivity.
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isExtending}
          >
            Log Out
          </Button>
          <Button
            onClick={handleExtendSession}
            disabled={isExtending}
            className="gap-2"
          >
            {isExtending && <RefreshCw className="h-4 w-4 animate-spin" />}
            {isExtending ? 'Extending...' : 'Extend Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}