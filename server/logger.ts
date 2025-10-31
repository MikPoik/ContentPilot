/**
 * Environment-aware logger utility
 * 
 * In production (NODE_ENV=production), only logs errors and warnings.
 * In development, logs everything including debug information.
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log debug/info messages (only in development)
 */
export function log(...args: any[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Log warning messages (both dev and production)
 */
export function warn(...args: any[]): void {
  console.warn(...args);
}

/**
 * Log error messages (both dev and production)
 */
export function error(...args: any[]): void {
  console.error(...args);
}

/**
 * Log info messages (only in development, use for verbose logging)
 */
export function info(...args: any[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * Log debug messages (only in development)
 */
export function debug(...args: any[]): void {
  if (isDevelopment) {
    console.debug(...args);
  }
}

/**
 * Always log (use sparingly, for critical production information)
 */
export function always(...args: any[]): void {
  console.log(...args);
}

// Export a logger object for convenience
export const logger = {
  log,
  warn,
  error,
  info,
  debug,
  always,
};

export default logger;
