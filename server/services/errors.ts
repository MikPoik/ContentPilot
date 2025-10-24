/**
 * Standardized error handling utilities
 * User-friendly error messages and consistent error handling across services
 */

export class ContentCraftError extends Error {
  public statusCode: number;
  public retryable: boolean;
  public userMessage: string;
  public technicalDetails?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    retryable: boolean = true,
    technicalDetails?: string
  ) {
    super(message);
    this.name = 'ContentCraftError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.userMessage = message;
    this.technicalDetails = technicalDetails;
  }
}

/**
 * Common error types with user-friendly messages
 */
export const ErrorTypes = {
  // Authentication & Authorization (401, 403)
  AUTHENTICATION_FAILED: (details?: string) => new ContentCraftError(
    'Authentication failed. Please refresh the page and try again.',
    401,
    false,
    details
  ),
  
  ACCESS_DENIED: (resource: string = 'resource') => new ContentCraftError(
    `You don't have permission to access this ${resource}.`,
    403,
    false
  ),

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: (service: string = 'service') => new ContentCraftError(
    `${service} is currently busy. Please wait a moment and try again.`,
    429,
    true
  ),

  MESSAGE_LIMIT_REACHED: (limit: number) => new ContentCraftError(
    `You've reached your message limit (${limit} messages). Please upgrade your subscription to continue.`,
    429,
    false
  ),

  // Validation Errors (400)
  INVALID_INPUT: (field: string, reason?: string) => new ContentCraftError(
    reason 
      ? `Invalid ${field}: ${reason}` 
      : `Invalid ${field}. Please check your input and try again.`,
    400,
    false
  ),

  EMPTY_MESSAGE: () => new ContentCraftError(
    'Message cannot be empty. Please enter a message and try again.',
    400,
    false
  ),

  MESSAGE_TOO_LONG: (maxLength: number) => new ContentCraftError(
    `Message is too long. Please keep it under ${maxLength} characters.`,
    400,
    false
  ),

  // Not Found (404)
  RESOURCE_NOT_FOUND: (resource: string) => new ContentCraftError(
    `${resource} not found. It may have been deleted or you may not have permission to access it.`,
    404,
    false
  ),

  // AI Service Errors (500, 503, 504)
  AI_SERVICE_ERROR: (service: string, retryable: boolean = true) => new ContentCraftError(
    `Error communicating with ${service}. ${retryable ? 'Please try again.' : 'Please contact support if this persists.'}`,
    503,
    retryable
  ),

  AI_TIMEOUT: () => new ContentCraftError(
    'Request took too long to process. Please try simplifying your message or try again.',
    504,
    true
  ),

  EMBEDDING_GENERATION_FAILED: () => new ContentCraftError(
    'Failed to process your message. Please try again in a moment.',
    500,
    true,
    'Embedding generation failed'
  ),

  // Database Errors (500, 503)
  DATABASE_ERROR: (operation: string) => new ContentCraftError(
    'A temporary database issue occurred. Please try again in a moment.',
    503,
    true,
    `Database ${operation} failed`
  ),

  DATABASE_CONNECTION_ERROR: () => new ContentCraftError(
    'Unable to connect to database. Please try again in a moment.',
    503,
    true
  ),

  // External API Errors (500, 503)
  INSTAGRAM_API_ERROR: () => new ContentCraftError(
    'Unable to analyze Instagram profile at this time. Please try again later.',
    503,
    true
  ),

  BLOG_ANALYSIS_ERROR: () => new ContentCraftError(
    'Unable to analyze blog content at this time. Please try again later.',
    503,
    true
  ),

  SEARCH_API_ERROR: (service: string) => new ContentCraftError(
    `Search service (${service}) is unavailable. Continuing without web search.`,
    503,
    true
  ),

  // Profile & Memory Errors (500)
  PROFILE_UPDATE_ERROR: () => new ContentCraftError(
    'Failed to update your profile. Your conversation was saved, but profile changes may not be reflected.',
    500,
    true,
    'Profile update failed'
  ),

  MEMORY_SAVE_ERROR: () => new ContentCraftError(
    'Failed to save memory. Your conversation was saved, but I may not remember this in future conversations.',
    500,
    true,
    'Memory save failed'
  ),

  // Unknown/Generic Errors (500)
  UNKNOWN_ERROR: () => new ContentCraftError(
    'An unexpected error occurred. Please try again.',
    500,
    true
  ),
};

/**
 * Parse error and return appropriate ContentCraftError
 */
export function parseError(error: unknown): ContentCraftError {
  // Already a ContentCraftError
  if (error instanceof ContentCraftError) {
    return error;
  }

  // Standard Error with specific patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Timeout errors
    if (message.includes('timeout') || message.includes('etimedout') || message.includes('econnaborted')) {
      return ErrorTypes.AI_TIMEOUT();
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return ErrorTypes.RATE_LIMIT_EXCEEDED('AI service');
    }

    // Authentication
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
      return ErrorTypes.AUTHENTICATION_FAILED(error.message);
    }

    // Database errors
    if (message.includes('database') || message.includes('connection') || message.includes('postgres')) {
      return ErrorTypes.DATABASE_ERROR('operation');
    }

    // AI service errors
    if (message.includes('openai') || message.includes('gemini') || message.includes('api')) {
      return ErrorTypes.AI_SERVICE_ERROR('AI', true);
    }

    // Return generic error with original message as technical details
    return new ContentCraftError(
      'An error occurred while processing your request.',
      500,
      true,
      error.message
    );
  }

  // Unknown error type
  return ErrorTypes.UNKNOWN_ERROR();
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: ContentCraftError): {
  message: string;
  statusCode: number;
  retryable: boolean;
  technicalDetails?: string;
} {
  return {
    message: error.userMessage,
    statusCode: error.statusCode,
    retryable: error.retryable,
    // Only include technical details in development
    ...(process.env.NODE_ENV === 'development' && error.technicalDetails && {
      technicalDetails: error.technicalDetails
    })
  };
}

/**
 * Log error with appropriate level based on severity
 */
export function logError(
  error: ContentCraftError | Error,
  context: string,
  additionalInfo?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = error instanceof ContentCraftError 
    ? {
        message: error.userMessage,
        statusCode: error.statusCode,
        retryable: error.retryable,
        technicalDetails: error.technicalDetails
      }
    : {
        message: error.message,
        stack: error.stack
      };

  // Critical errors (5xx that aren't retryable)
  if (error instanceof ContentCraftError && error.statusCode >= 500 && !error.retryable) {
    console.error(`🚨 [${context}] CRITICAL ERROR at ${timestamp}:`, errorInfo, additionalInfo);
  }
  // Standard errors
  else if (error instanceof ContentCraftError && error.statusCode >= 500) {
    console.error(`❌ [${context}] ERROR at ${timestamp}:`, errorInfo, additionalInfo);
  }
  // Warnings (4xx errors)
  else if (error instanceof ContentCraftError && error.statusCode >= 400) {
    console.warn(`⚠️ [${context}] WARNING at ${timestamp}:`, errorInfo, additionalInfo);
  }
  // Info (everything else)
  else {
    console.log(`ℹ️ [${context}] INFO at ${timestamp}:`, errorInfo, additionalInfo);
  }
}
