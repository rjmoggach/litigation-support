'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SessionTimeout } from '@/components/auth/session-timeout'

interface AuthProviderProps {
  children: React.ReactNode
}

function SessionSyncWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  return (
    <>
      {children}
      <SessionTimeout warningTime={5} checkInterval={60} />
    </>
  )
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch every 5 minutes instead of default 0 (disabled)
      refetchOnWindowFocus={false} // Disable refetch on window focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <SessionSyncWrapper>
        {children}
      </SessionSyncWrapper>
    </SessionProvider>
  )
}