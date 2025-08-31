/**
 * Centralized Error Handling System for Email Connections
 * 
 * This module provides comprehensive error handling, classification, and user-friendly
 * messaging for all email connection operations.
 */

import { toast } from 'sonner'

/**
 * Comprehensive error types for email connection operations
 */
export enum EmailConnectionErrorType {
  // Network and API errors
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  
  // Authentication and authorization errors
  AUTHENTICATION_FAILED = 'authentication_failed',
  TOKEN_EXPIRED = 'token_expired',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  SESSION_EXPIRED = 'session_expired',
  
  // OAuth specific errors
  OAUTH_POPUP_BLOCKED = 'oauth_popup_blocked',
  OAUTH_USER_DENIED = 'oauth_user_denied',
  OAUTH_INVALID_STATE = 'oauth_invalid_state',
  OAUTH_INVALID_CODE = 'oauth_invalid_code',
  OAUTH_TIMEOUT = 'oauth_timeout',
  OAUTH_PROVIDER_ERROR = 'oauth_provider_error',
  
  // Connection management errors
  CONNECTION_NOT_FOUND = 'connection_not_found',
  CONNECTION_ALREADY_EXISTS = 'connection_already_exists',
  CONNECTION_EXPIRED = 'connection_expired',
  CONNECTION_REVOKED = 'connection_revoked',
  CONNECTION_INVALID = 'connection_invalid',
  
  // Email service errors
  EMAIL_SERVICE_UNAVAILABLE = 'email_service_unavailable',
  EMAIL_QUOTA_EXCEEDED = 'email_quota_exceeded',
  EMAIL_PERMISSION_DENIED = 'email_permission_denied',
  
  // Data validation errors
  INVALID_EMAIL = 'invalid_email',
  INVALID_INPUT = 'invalid_input',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  
  // Unknown errors
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Error severity levels for different user feedback approaches
 */
export enum ErrorSeverity {
  LOW = 'low',        // Minor issues, can continue working
  MEDIUM = 'medium',  // Noticeable issues, some functionality affected
  HIGH = 'high',      // Major issues, core functionality broken
  CRITICAL = 'critical' // System-breaking issues, immediate action required
}

/**
 * Recovery action types for guiding users
 */
export enum RecoveryAction {
  RETRY = 'retry',
  REFRESH = 'refresh',
  RE_AUTHENTICATE = 're_authenticate',
  RE_AUTHORIZE = 're_authorize',
  CONTACT_SUPPORT = 'contact_support',
  CHECK_NETWORK = 'check_network',
  ALLOW_POPUPS = 'allow_popups',
  NONE = 'none'
}

/**
 * Structured error information
 */
export interface EmailConnectionError {
  type: EmailConnectionErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  technicalDetails?: string
  recoveryAction: RecoveryAction
  recoveryInstructions: string
  canRetry: boolean
  retryDelay?: number
  timestamp: Date
}

/**
 * Error classification and messaging configuration
 */
const ERROR_CONFIG: Record<EmailConnectionErrorType, Omit<EmailConnectionError, 'timestamp' | 'technicalDetails'>> = {
  // Network and API errors
  [EmailConnectionErrorType.NETWORK_ERROR]: {
    type: EmailConnectionErrorType.NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: 'Network connection failed',
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    recoveryAction: RecoveryAction.CHECK_NETWORK,
    recoveryInstructions: 'Check your internet connection and try again. If the problem persists, our servers may be temporarily unavailable.',
    canRetry: true,
    retryDelay: 3000
  },
  
  [EmailConnectionErrorType.API_ERROR]: {
    type: EmailConnectionErrorType.API_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: 'API request failed',
    userMessage: 'Server encountered an error processing your request.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Please try again in a few moments. If the issue continues, contact support.',
    canRetry: true,
    retryDelay: 2000
  },
  
  [EmailConnectionErrorType.TIMEOUT]: {
    type: EmailConnectionErrorType.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    message: 'Request timed out',
    userMessage: 'The operation took too long to complete.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Please try again. Large operations may take longer to process.',
    canRetry: true,
    retryDelay: 5000
  },
  
  [EmailConnectionErrorType.RATE_LIMITED]: {
    type: EmailConnectionErrorType.RATE_LIMITED,
    severity: ErrorSeverity.LOW,
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment before trying again.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Wait 60 seconds before attempting this operation again.',
    canRetry: true,
    retryDelay: 60000
  },

  // Authentication errors
  [EmailConnectionErrorType.AUTHENTICATION_FAILED]: {
    type: EmailConnectionErrorType.AUTHENTICATION_FAILED,
    severity: ErrorSeverity.HIGH,
    message: 'Authentication failed',
    userMessage: 'Your login session is invalid.',
    recoveryAction: RecoveryAction.RE_AUTHENTICATE,
    recoveryInstructions: 'Please log in again to continue.',
    canRetry: false
  },
  
  [EmailConnectionErrorType.TOKEN_EXPIRED]: {
    type: EmailConnectionErrorType.TOKEN_EXPIRED,
    severity: ErrorSeverity.MEDIUM,
    message: 'Access token expired',
    userMessage: 'Your session has expired.',
    recoveryAction: RecoveryAction.REFRESH,
    recoveryInstructions: 'Refreshing your session automatically...',
    canRetry: true,
    retryDelay: 1000
  },
  
  [EmailConnectionErrorType.SESSION_EXPIRED]: {
    type: EmailConnectionErrorType.SESSION_EXPIRED,
    severity: ErrorSeverity.HIGH,
    message: 'User session expired',
    userMessage: 'Your login session has expired.',
    recoveryAction: RecoveryAction.RE_AUTHENTICATE,
    recoveryInstructions: 'Please log in again to continue using the application.',
    canRetry: false
  },

  // OAuth errors
  [EmailConnectionErrorType.OAUTH_POPUP_BLOCKED]: {
    type: EmailConnectionErrorType.OAUTH_POPUP_BLOCKED,
    severity: ErrorSeverity.MEDIUM,
    message: 'OAuth popup blocked',
    userMessage: 'Popup was blocked by your browser.',
    recoveryAction: RecoveryAction.ALLOW_POPUPS,
    recoveryInstructions: 'Please allow popups for this site in your browser settings and try again.',
    canRetry: true
  },
  
  [EmailConnectionErrorType.OAUTH_USER_DENIED]: {
    type: EmailConnectionErrorType.OAUTH_USER_DENIED,
    severity: ErrorSeverity.LOW,
    message: 'OAuth permission denied',
    userMessage: 'Email account connection was cancelled.',
    recoveryAction: RecoveryAction.RE_AUTHORIZE,
    recoveryInstructions: 'To connect your email account, you need to grant the requested permissions.',
    canRetry: true
  },
  
  [EmailConnectionErrorType.OAUTH_INVALID_STATE]: {
    type: EmailConnectionErrorType.OAUTH_INVALID_STATE,
    severity: ErrorSeverity.HIGH,
    message: 'OAuth state validation failed',
    userMessage: 'Security validation failed during account connection.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Please start the connection process again for security reasons.',
    canRetry: true
  },
  
  [EmailConnectionErrorType.OAUTH_TIMEOUT]: {
    type: EmailConnectionErrorType.OAUTH_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    message: 'OAuth flow timeout',
    userMessage: 'Account connection took too long to complete.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Please try connecting your account again.',
    canRetry: true,
    retryDelay: 3000
  },

  // Connection errors
  [EmailConnectionErrorType.CONNECTION_NOT_FOUND]: {
    type: EmailConnectionErrorType.CONNECTION_NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    message: 'Connection not found',
    userMessage: 'The email connection could not be found.',
    recoveryAction: RecoveryAction.REFRESH,
    recoveryInstructions: 'The connection may have been removed. Please refresh the page.',
    canRetry: false
  },
  
  [EmailConnectionErrorType.CONNECTION_ALREADY_EXISTS]: {
    type: EmailConnectionErrorType.CONNECTION_ALREADY_EXISTS,
    severity: ErrorSeverity.LOW,
    message: 'Connection already exists',
    userMessage: 'This email account is already connected.',
    recoveryAction: RecoveryAction.NONE,
    recoveryInstructions: 'You can manage this connection in your connected accounts list.',
    canRetry: false
  },
  
  [EmailConnectionErrorType.CONNECTION_EXPIRED]: {
    type: EmailConnectionErrorType.CONNECTION_EXPIRED,
    severity: ErrorSeverity.MEDIUM,
    message: 'Connection expired',
    userMessage: 'Your email account connection has expired.',
    recoveryAction: RecoveryAction.RE_AUTHORIZE,
    recoveryInstructions: 'Please reconnect your email account to continue using it.',
    canRetry: true
  },
  
  [EmailConnectionErrorType.CONNECTION_REVOKED]: {
    type: EmailConnectionErrorType.CONNECTION_REVOKED,
    severity: ErrorSeverity.MEDIUM,
    message: 'Connection revoked',
    userMessage: 'Access to your email account has been revoked.',
    recoveryAction: RecoveryAction.RE_AUTHORIZE,
    recoveryInstructions: 'You need to reconnect your email account to restore access.',
    canRetry: true
  },

  // Email service errors
  [EmailConnectionErrorType.EMAIL_SERVICE_UNAVAILABLE]: {
    type: EmailConnectionErrorType.EMAIL_SERVICE_UNAVAILABLE,
    severity: ErrorSeverity.HIGH,
    message: 'Email service unavailable',
    userMessage: 'Gmail service is temporarily unavailable.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Gmail may be experiencing issues. Please try again later.',
    canRetry: true,
    retryDelay: 30000
  },
  
  [EmailConnectionErrorType.EMAIL_QUOTA_EXCEEDED]: {
    type: EmailConnectionErrorType.EMAIL_QUOTA_EXCEEDED,
    severity: ErrorSeverity.MEDIUM,
    message: 'Email API quota exceeded',
    userMessage: 'Daily email API limit reached.',
    recoveryAction: RecoveryAction.RETRY,
    recoveryInstructions: 'Please try again tomorrow or contact support for increased limits.',
    canRetry: true,
    retryDelay: 3600000 // 1 hour
  },

  // Validation errors
  [EmailConnectionErrorType.INVALID_EMAIL]: {
    type: EmailConnectionErrorType.INVALID_EMAIL,
    severity: ErrorSeverity.LOW,
    message: 'Invalid email address',
    userMessage: 'Please enter a valid email address.',
    recoveryAction: RecoveryAction.NONE,
    recoveryInstructions: 'Check the email address format and try again.',
    canRetry: false
  },
  
  [EmailConnectionErrorType.INVALID_INPUT]: {
    type: EmailConnectionErrorType.INVALID_INPUT,
    severity: ErrorSeverity.LOW,
    message: 'Invalid input data',
    userMessage: 'Some information is missing or incorrect.',
    recoveryAction: RecoveryAction.NONE,
    recoveryInstructions: 'Please check your input and try again.',
    canRetry: false
  },

  // Unknown error
  [EmailConnectionErrorType.UNKNOWN_ERROR]: {
    type: EmailConnectionErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred.',
    recoveryAction: RecoveryAction.CONTACT_SUPPORT,
    recoveryInstructions: 'Please try again or contact support if the problem persists.',
    canRetry: true,
    retryDelay: 5000
  }
}

/**
 * Create a structured error from various error sources
 */
export function createEmailConnectionError(
  errorType: EmailConnectionErrorType,
  technicalDetails?: string,
  customMessage?: string
): EmailConnectionError {
  const config = ERROR_CONFIG[errorType]
  
  return {
    ...config,
    message: customMessage || config.message,
    technicalDetails,
    timestamp: new Date()
  }
}

/**
 * Classify an error based on various indicators
 */
export function classifyError(error: any): EmailConnectionError {
  // Network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return createEmailConnectionError(EmailConnectionErrorType.NETWORK_ERROR, error.message)
  }
  
  // HTTP status code errors
  if (error?.status || error?.response?.status) {
    const status = error.status || error.response.status
    
    switch (status) {
      case 401:
        return createEmailConnectionError(EmailConnectionErrorType.AUTHENTICATION_FAILED, `HTTP ${status}`)
      case 403:
        return createEmailConnectionError(EmailConnectionErrorType.INSUFFICIENT_PERMISSIONS, `HTTP ${status}`)
      case 404:
        return createEmailConnectionError(EmailConnectionErrorType.CONNECTION_NOT_FOUND, `HTTP ${status}`)
      case 408:
        return createEmailConnectionError(EmailConnectionErrorType.TIMEOUT, `HTTP ${status}`)
      case 429:
        return createEmailConnectionError(EmailConnectionErrorType.RATE_LIMITED, `HTTP ${status}`)
      case 500:
      case 502:
      case 503:
      case 504:
        return createEmailConnectionError(EmailConnectionErrorType.API_ERROR, `HTTP ${status}`)
      default:
        return createEmailConnectionError(EmailConnectionErrorType.API_ERROR, `HTTP ${status}`)
    }
  }
  
  // OAuth specific errors
  if (error?.type || error?.error) {
    const errorType = error.type || error.error
    
    switch (errorType) {
      case 'popup_blocked':
        return createEmailConnectionError(EmailConnectionErrorType.OAUTH_POPUP_BLOCKED, error.message)
      case 'user_cancelled':
      case 'access_denied':
        return createEmailConnectionError(EmailConnectionErrorType.OAUTH_USER_DENIED, error.message)
      case 'invalid_state':
        return createEmailConnectionError(EmailConnectionErrorType.OAUTH_INVALID_STATE, error.message)
      case 'timeout':
        return createEmailConnectionError(EmailConnectionErrorType.OAUTH_TIMEOUT, error.message)
      default:
        return createEmailConnectionError(EmailConnectionErrorType.OAUTH_PROVIDER_ERROR, error.message)
    }
  }
  
  // Connection specific errors from API responses
  if (error?.detail) {
    const detail = error.detail.toLowerCase()
    
    if (detail.includes('not found')) {
      return createEmailConnectionError(EmailConnectionErrorType.CONNECTION_NOT_FOUND, error.detail)
    }
    if (detail.includes('already exists')) {
      return createEmailConnectionError(EmailConnectionErrorType.CONNECTION_ALREADY_EXISTS, error.detail)
    }
    if (detail.includes('expired')) {
      return createEmailConnectionError(EmailConnectionErrorType.CONNECTION_EXPIRED, error.detail)
    }
    if (detail.includes('revoked')) {
      return createEmailConnectionError(EmailConnectionErrorType.CONNECTION_REVOKED, error.detail)
    }
    if (detail.includes('invalid') && detail.includes('state')) {
      return createEmailConnectionError(EmailConnectionErrorType.OAUTH_INVALID_STATE, error.detail)
    }
  }
  
  // Timeout errors
  if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
    return createEmailConnectionError(EmailConnectionErrorType.TIMEOUT, error.message)
  }
  
  // Default to unknown error
  return createEmailConnectionError(
    EmailConnectionErrorType.UNKNOWN_ERROR, 
    error?.message || JSON.stringify(error)
  )
}

/**
 * Handle and display error to user with appropriate feedback
 */
export function handleEmailConnectionError(
  error: any, 
  context?: string,
  customToastOptions?: any
): EmailConnectionError {
  const structuredError = classifyError(error)
  
  // Log technical details for debugging
  console.error(`Email Connection Error${context ? ` (${context})` : ''}:`, {
    type: structuredError.type,
    severity: structuredError.severity,
    message: structuredError.message,
    technicalDetails: structuredError.technicalDetails,
    originalError: error,
    timestamp: structuredError.timestamp
  })
  
  // Display user-friendly message
  const toastOptions = {
    description: structuredError.recoveryInstructions,
    action: structuredError.canRetry ? {
      label: 'Retry',
      onClick: () => {
        // Retry logic would be handled by the caller
        console.log('Retry requested for:', structuredError.type)
      }
    } : undefined,
    ...customToastOptions
  }
  
  // Use appropriate toast type based on severity
  switch (structuredError.severity) {
    case ErrorSeverity.LOW:
      toast.info(structuredError.userMessage, toastOptions)
      break
    case ErrorSeverity.MEDIUM:
      toast.warning(structuredError.userMessage, toastOptions)
      break
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      toast.error(structuredError.userMessage, {
        ...toastOptions,
        duration: 10000 // Keep critical errors visible longer
      })
      break
  }
  
  return structuredError
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * Recovery action handlers
 */
export const recoveryActions = {
  [RecoveryAction.RETRY]: (operation: () => void) => {
    setTimeout(operation, 1000)
  },
  
  [RecoveryAction.REFRESH]: () => {
    window.location.reload()
  },
  
  [RecoveryAction.RE_AUTHENTICATE]: () => {
    window.location.href = '/login'
  },
  
  [RecoveryAction.RE_AUTHORIZE]: (startOAuth: () => void) => {
    startOAuth()
  },
  
  [RecoveryAction.ALLOW_POPUPS]: () => {
    // Provide instructions for enabling popups
    toast.info('Please enable popups in your browser settings', {
      description: 'Look for a popup blocker icon in your browser\'s address bar and click it to allow popups for this site.',
      duration: 10000
    })
  },
  
  [RecoveryAction.CHECK_NETWORK]: () => {
    // Network diagnostic guidance
    toast.info('Network connection issue', {
      description: 'Please check your internet connection and try again. If you\'re using a VPN, try disconnecting it temporarily.',
      duration: 8000
    })
  },
  
  [RecoveryAction.CONTACT_SUPPORT]: () => {
    // Open support contact
    console.log('Contact support requested')
    // In a real app, this might open a support widget or redirect to help page
  },
  
  [RecoveryAction.NONE]: () => {
    // No action needed
  }
}

/**
 * Error boundary utility for React components
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error?: EmailConnectionError
  errorId?: string
}

export function createErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}