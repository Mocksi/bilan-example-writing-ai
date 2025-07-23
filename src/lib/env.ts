/**
 * Environment variable configuration and validation
 */

export interface EnvironmentConfig {
  // AI configuration
  AI_MODEL: string
  
  // Bilan configuration
  BILAN_ENDPOINT?: string
  BILAN_MODE: 'local' | 'server'
  
  // Development flags
  DEBUG: boolean
  SHOW_USER_STATUS: boolean
  
  // Application configuration
  APP_NAME: string
  APP_VERSION: string
}

/**
 * Get environment variable with default value
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  if (typeof window !== 'undefined') {
    // Client-side: access from window if available, fallback to build-time values
    return (window as { __ENV__?: Record<string, string> }).__ENV__?.[key] || process.env[key] || defaultValue
  }
  // Server-side: access from process.env
  return process.env[key] || defaultValue
}

/**
 * Parse and validate environment variables
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    // AI configuration
    AI_MODEL: getEnvVar('NEXT_PUBLIC_AI_MODEL', 'Xenova/distilgpt2'),
    
    // Bilan configuration
    BILAN_ENDPOINT: getEnvVar('NEXT_PUBLIC_BILAN_ENDPOINT'),
    BILAN_MODE: (() => {
      const mode = getEnvVar('NEXT_PUBLIC_BILAN_MODE', 'local');
      if (mode !== 'local' && mode !== 'server') {
        throw new Error(`Invalid BILAN_MODE: ${mode}. Must be 'local' or 'server'`);
      }
      return mode as 'local' | 'server';
    })(),
    
    // Development flags
    DEBUG: getEnvVar('NEXT_PUBLIC_DEBUG', 'false') === 'true',
    SHOW_USER_STATUS: getEnvVar('NEXT_PUBLIC_SHOW_USER_STATUS', 'false') === 'true',
    
    // Application configuration
    APP_NAME: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Bilan Content Creation Demo'),
    APP_VERSION: getEnvVar('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
  }
  
  // Validate required variables
  if (config.BILAN_MODE === 'server' && !config.BILAN_ENDPOINT) {
    throw new Error('BILAN_ENDPOINT is required when BILAN_MODE is "server"')
  }
  
  return config
}

/**
 * Global environment configuration instance
 */
export const env = getEnvironmentConfig() 