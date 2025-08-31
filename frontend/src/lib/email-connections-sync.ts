/**
 * Utilities to synchronize email connections between backend API and NextAuth session
 */

import { client } from '@/lib/api/client.gen'
import { listConnectionsApiV1EmailConnectionsGet } from '@/lib/api/sdk.gen'
import type { EmailConnection } from '@/types/email-connections'
import type { AdditionalEmailAccount } from '@/lib/auth'

/**
 * Convert backend EmailConnection to session AdditionalEmailAccount
 */
function convertToAdditionalEmailAccount(connection: EmailConnection): AdditionalEmailAccount {
    return {
        id: connection.id.toString(),
        email: connection.email_address,
        provider: connection.provider,
        providerAccountId: connection.provider_account_id,
        name: connection.connection_name || connection.email_address,
        status: connection.connection_status,
        createdAt: connection.created_at,
        lastSyncAt: connection.last_sync_at,
        errorMessage: connection.error_message,
        scopes: Array.isArray(connection.scopes_granted) 
            ? connection.scopes_granted 
            : typeof connection.scopes_granted === 'string' 
                ? JSON.parse(connection.scopes_granted) 
                : [],
    }
}

/**
 * Fetch email connections from backend and sync with session
 */
export async function syncEmailConnectionsWithSession(
    accessToken: string,
    updateSession: (data: any) => Promise<void>
): Promise<AdditionalEmailAccount[]> {
    try {
        // Configure API client
        client.setConfig({
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        // Fetch connections from backend
        const response = await listConnectionsApiV1EmailConnectionsGet({
            client,
        })

        if (response.data?.connections) {
            // Convert to session format
            const sessionConnections = response.data.connections.map(convertToAdditionalEmailAccount)

            // Update session with latest connection data
            await updateSession({
                emailConnections: sessionConnections,
            })

            return sessionConnections
        }

        return []
    } catch (error) {
        console.error('Failed to sync email connections with session:', error)
        return []
    }
}

/**
 * Initialize email connections sync on session start
 */
export async function initializeEmailConnectionsSync(
    session: any,
    updateSession: (data: any) => Promise<void>
): Promise<void> {
    if (!session?.accessToken) return

    // Only sync if we don't have connections in session or they're stale
    const shouldSync = !session.emailConnections || 
        session.emailConnections.length === 0 ||
        !session.lastConnectionSync ||
        Date.now() - new Date(session.lastConnectionSync).getTime() > 5 * 60 * 1000 // 5 minutes

    if (shouldSync) {
        await syncEmailConnectionsWithSession(session.accessToken, (data) =>
            updateSession({
                ...session,
                ...data,
                lastConnectionSync: new Date().toISOString(),
            })
        )
    }
}

/**
 * Add a new connection to both backend and session
 */
export async function addConnectionToSession(
    connection: EmailConnection,
    updateSession: (data: any) => Promise<void>,
    currentSession: any
): Promise<void> {
    const sessionConnection = convertToAdditionalEmailAccount(connection)

    const updatedConnections = [
        ...(currentSession.emailConnections || []).filter(
            (conn: AdditionalEmailAccount) => conn.id !== sessionConnection.id
        ),
        sessionConnection,
    ]

    await updateSession({
        ...currentSession,
        emailConnections: updatedConnections,
        lastConnectionSync: new Date().toISOString(),
    })
}

/**
 * Remove a connection from session
 */
export async function removeConnectionFromSession(
    connectionId: string,
    updateSession: (data: any) => Promise<void>,
    currentSession: any
): Promise<void> {
    const updatedConnections = (currentSession.emailConnections || []).filter(
        (conn: AdditionalEmailAccount) => conn.id !== connectionId.toString()
    )

    await updateSession({
        ...currentSession,
        emailConnections: updatedConnections,
        lastConnectionSync: new Date().toISOString(),
    })
}

/**
 * Update connection status in session
 */
export async function updateConnectionStatusInSession(
    connectionId: string,
    status: 'active' | 'expired' | 'error' | 'revoked',
    errorMessage: string | undefined,
    updateSession: (data: any) => Promise<void>,
    currentSession: any
): Promise<void> {
    const updatedConnections = (currentSession.emailConnections || []).map(
        (conn: AdditionalEmailAccount) =>
            conn.id === connectionId.toString()
                ? {
                      ...conn,
                      status,
                      errorMessage: status === 'error' ? errorMessage : undefined,
                      lastSyncAt: status === 'active' ? new Date().toISOString() : conn.lastSyncAt,
                  }
                : conn
    )

    await updateSession({
        ...currentSession,
        emailConnections: updatedConnections,
        lastConnectionSync: new Date().toISOString(),
    })
}

/**
 * Force refresh connections from backend
 */
export async function refreshEmailConnectionsFromBackend(
    accessToken: string,
    updateSession: (data: any) => Promise<void>,
    currentSession: any
): Promise<AdditionalEmailAccount[]> {
    const connections = await syncEmailConnectionsWithSession(
        accessToken,
        (data) => updateSession({
            ...currentSession,
            ...data,
            lastConnectionSync: new Date().toISOString(),
        })
    )

    return connections
}