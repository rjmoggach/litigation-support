/**
 * TypeScript types for email connections feature
 */

export interface EmailConnection {
  id: number
  user_id: number
  email_address: string
  provider: string
  provider_account_id: string
  connection_name?: string
  connection_status: 'active' | 'expired' | 'error' | 'revoked'
  last_sync_at?: string
  error_message?: string
  created_at: string
  updated_at?: string
  scopes_granted: string[]
}

export interface EmailConnectionCreate {
  email_address: string
  provider?: string
  provider_account_id: string
  connection_name?: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  scopes_granted: string[]
  oauth_data?: Record<string, any>
}

export interface EmailConnectionUpdate {
  connection_name?: string
  connection_status?: 'active' | 'expired' | 'error' | 'revoked'
}

export interface ConnectionStatus {
  connection_id: number
  email_address: string
  status: string
  is_active: boolean
  is_expired: boolean
  last_sync_at?: string
  error_message?: string
}

export interface ConnectionListResponse {
  connections: EmailConnection[]
  total: number
  active: number
  expired: number
  error: number
}

export interface ConnectionDeleteResponse {
  message: string
  connection_id: number
  email_address: string
}

// OAuth Flow Types
export interface OAuthInitiateRequest {
  provider?: string
  scopes?: string[]
  redirect_uri?: string
}

export interface OAuthInitiateResponse {
  authorization_url: string
  state: string
  provider: string
}

export interface OAuthCallbackRequest {
  code: string
  state: string
  provider?: string
  redirect_uri?: string
  scopes?: string[]
}

export interface OAuthCallbackResponse {
  connection_id: number
  email_address: string
  connection_name: string
  status: string
  message: string
}

export interface ConnectionHealthCheck {
  connection_id: number
  is_healthy: boolean
  status: string
  last_checked: string
  error_details?: string
  token_expires_at?: string
  needs_reauth: boolean
}

export interface BulkConnectionStatus {
  user_id: number
  total_connections: number
  active_connections: number
  expired_connections: number
  error_connections: number
  connections: ConnectionStatus[]
}

export interface TokenRefreshRequest {
  connection_id: number
}

export interface TokenRefreshResponse {
  connection_id: number
  success: boolean
  new_expires_at?: string
  error_message?: string
}

// UI Component Types
export interface ConnectionCardProps {
  connection: EmailConnection
  onEdit: (connection: EmailConnection) => void
  onDelete: (connection: EmailConnection) => void
  onRefresh: (connection: EmailConnection) => void
  onTest: (connection: EmailConnection) => void
}

export interface AddConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnectionAdded: (connection: EmailConnection) => void
}

export interface ConnectionStatusIndicatorProps {
  status: 'active' | 'expired' | 'error' | 'revoked'
  lastSync?: string
  errorMessage?: string
  compact?: boolean
}

// API Client Types
export interface EmailConnectionsApiClient {
  listConnections(): Promise<ConnectionListResponse>
  getConnection(id: number): Promise<EmailConnection>
  updateConnection(id: number, data: EmailConnectionUpdate): Promise<EmailConnection>
  deleteConnection(id: number): Promise<ConnectionDeleteResponse>
  checkHealth(id: number): Promise<ConnectionHealthCheck>
  getStatus(): Promise<BulkConnectionStatus>
  initiateOAuth(data: OAuthInitiateRequest): Promise<OAuthInitiateResponse>
  handleOAuthCallback(data: OAuthCallbackRequest): Promise<OAuthCallbackResponse>
  refreshTokens(id: number): Promise<TokenRefreshResponse>
  testConnection(id: number): Promise<{ status: string; message: string }>
}

// Error Types
export interface ConnectionError {
  error_type: string
  error_message: string
  connection_id?: number
  email_address?: string
  suggested_action?: string
}

export interface OAuthError {
  error: string
  error_description?: string
  error_uri?: string
  state?: string
}

// Form Types
export interface ConnectionFormData {
  connection_name: string
}

export interface OAuthFlowState {
  state: string
  provider: string
  redirect_uri: string
  scopes: string[]
}

// Hook Types
export interface UseEmailConnectionsReturn {
  connections: EmailConnection[]
  loading: boolean
  error: string | null
  refreshConnections: () => Promise<void>
  addConnection: (provider: string, scopes?: string[]) => Promise<void>
  updateConnection: (id: number, data: EmailConnectionUpdate) => Promise<void>
  deleteConnection: (id: number) => Promise<void>
  refreshConnection: (id: number) => Promise<void>
  testConnection: (id: number) => Promise<void>
}

// OAuth Hook Types
export interface UseOAuthFlowReturn {
  initiateFlow: (provider: string, scopes?: string[]) => Promise<void>
  handleCallback: (code: string, state: string) => Promise<EmailConnection>
  loading: boolean
  error: string | null
}

// Connection Management Context Types
export interface ConnectionsContextValue {
  connections: EmailConnection[]
  loading: boolean
  error: string | null
  addConnection: (provider: string, scopes?: string[]) => Promise<void>
  updateConnection: (id: number, data: EmailConnectionUpdate) => Promise<void>
  deleteConnection: (id: number) => Promise<void>
  refreshConnection: (id: number) => Promise<void>
  refreshAll: () => Promise<void>
}

// Default scopes
export const DEFAULT_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const

export const FULL_GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const

// Connection status display helpers
export const CONNECTION_STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  error: 'Error',
  revoked: 'Revoked'
} as const

export const CONNECTION_STATUS_COLORS = {
  active: 'green',
  expired: 'yellow',
  error: 'red',
  revoked: 'gray'
} as const