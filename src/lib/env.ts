/**
 * Environment variable configuration and validation
 */

export interface EnvironmentConfig {
  // AI configuration
  AI_MODEL: string
  
  // Bilan configuration
  BILAN_ENDPOINT?: string
  BILAN_MODE: 'local' | 'server'
  BILAN_API_KEY?: string
  
  // Development flags
  DEBUG: boolean
  SHOW_USER_STATUS: boolean
  
  // Application configuration
  APP_NAME: string
  APP_VERSION: string
}

/**
 * Parse and validate environment variables
 * Reading directly from process.env since Next.js handles NEXT_PUBLIC_ vars correctly
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    // AI configuration
    AI_MODEL: process.env.NEXT_PUBLIC_AI_MODEL || 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    
    // Bilan configuration
    BILAN_ENDPOINT: process.env.NEXT_PUBLIC_BILAN_ENDPOINT,
    BILAN_MODE: (() => {
      const mode = process.env.NEXT_PUBLIC_BILAN_MODE || 'local';
      if (mode !== 'local' && mode !== 'server') {
        throw new Error(`Invalid BILAN_MODE: ${mode}. Must be 'local' or 'server'`);
      }
      return mode as 'local' | 'server';
    })(),
    BILAN_API_KEY: process.env.NEXT_PUBLIC_BILAN_API_KEY,
    
    // Development flags
    DEBUG: process.env.NEXT_PUBLIC_DEBUG === 'true',
    SHOW_USER_STATUS: process.env.NEXT_PUBLIC_SHOW_USER_STATUS === 'true',
    
    // Application configuration
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Bilan Content Creation Demo',
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  }
  
  // Validate required variables
  if (config.BILAN_MODE === 'server' && !config.BILAN_ENDPOINT) {
    throw new Error('BILAN_ENDPOINT is required when BILAN_MODE is "server"')
  }
  if (config.BILAN_MODE === 'server' && !config.BILAN_API_KEY) {
    throw new Error('BILAN_API_KEY is required when BILAN_MODE is "server"')
  }
  
  return config
}

/**
 * Global environment configuration instance
 */
export const env = getEnvironmentConfig() 