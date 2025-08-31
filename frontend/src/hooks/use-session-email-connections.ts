'use client'

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import type { AdditionalEmailAccount } from '@/lib/auth'

/**
 * Hook to manage email connections in NextAuth session
 */
export function useSessionEmailConnections() {
    const { data: session, update } = useSession()

    const addEmailConnection = useCallback(
        async (connection: AdditionalEmailAccount) => {
            if (!session) return

            const updatedConnections = [
                ...(session.emailConnections || []).filter(
                    (conn: AdditionalEmailAccount) => conn.id !== connection.id
                ),
                connection,
            ]

            await update({
                ...session,
                emailConnections: updatedConnections,
            })
        },
        [session, update]
    )

    const removeEmailConnection = useCallback(
        async (connectionId: string) => {
            if (!session) return

            const updatedConnections = (session.emailConnections || []).filter(
                (conn: AdditionalEmailAccount) => conn.id !== connectionId
            )

            await update({
                ...session,
                emailConnections: updatedConnections,
            })
        },
        [session, update]
    )

    const updateEmailConnectionStatus = useCallback(
        async (
            connectionId: string,
            status: 'active' | 'expired' | 'error' | 'revoked',
            errorMessage?: string
        ) => {
            if (!session) return

            const updatedConnections = (session.emailConnections || []).map(
                (conn: AdditionalEmailAccount) =>
                    conn.id === connectionId
                        ? {
                              ...conn,
                              status,
                              errorMessage: status === 'error' ? errorMessage : undefined,
                              lastSyncAt: status === 'active' ? new Date().toISOString() : conn.lastSyncAt,
                          }
                        : conn
            )

            await update({
                ...session,
                emailConnections: updatedConnections,
            })
        },
        [session, update]
    )

    const getEmailConnections = useCallback((): AdditionalEmailAccount[] => {
        return session?.emailConnections || []
    }, [session])

    const getEmailConnection = useCallback(
        (connectionId: string): AdditionalEmailAccount | undefined => {
            return session?.emailConnections?.find(
                (conn: AdditionalEmailAccount) => conn.id === connectionId
            )
        },
        [session]
    )

    const isEmailConnected = useCallback(
        (email: string): boolean => {
            return Boolean(
                session?.emailConnections?.some(
                    (conn: AdditionalEmailAccount) => 
                        conn.email.toLowerCase() === email.toLowerCase()
                )
            )
        },
        [session]
    )

    const getActiveEmailConnections = useCallback((): AdditionalEmailAccount[] => {
        return (session?.emailConnections || []).filter(
            (conn: AdditionalEmailAccount) => conn.status === 'active'
        )
    }, [session])

    const syncEmailConnection = useCallback(
        async (connectionId: string) => {
            if (!session) return

            const updatedConnections = (session.emailConnections || []).map(
                (conn: AdditionalEmailAccount) =>
                    conn.id === connectionId
                        ? {
                              ...conn,
                              lastSyncAt: new Date().toISOString(),
                          }
                        : conn
            )

            await update({
                ...session,
                emailConnections: updatedConnections,
            })
        },
        [session, update]
    )

    return {
        emailConnections: getEmailConnections(),
        activeConnections: getActiveEmailConnections(),
        addEmailConnection,
        removeEmailConnection,
        updateEmailConnectionStatus,
        getEmailConnection,
        isEmailConnected,
        syncEmailConnection,
        loading: !session,
        hasConnections: (session?.emailConnections || []).length > 0,
    }
}