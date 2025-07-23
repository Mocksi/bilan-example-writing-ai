/**
 * Environment variable configuration and validation
 */

export interface EnvironmentConfig {
  // Ollama configuration
  OLLAMA_HOST: string
  OLLAMA_MODEL: string
  
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
 * Parse and validate environment variables
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    // Ollama configuration
    OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://localhost:11434',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'tinyllama',
    
    // Bilan configuration
    BILAN_ENDPOINT: process.env.NEXT_PUBLIC_BILAN_ENDPOINT,
    BILAN_MODE: (process.env.NEXT_PUBLIC_BILAN_MODE as 'local' | 'server') || 'local',
    
    // Development flags
    DEBUG: process.env.NEXT_PUBLIC_DEBUG === 'true',
    SHOW_USER_STATUS: process.env.NEXT_PUBLIC_SHOW_USER_STATUS === 'true',
    
    // Application configuration
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Bilan Content Creation Demo',
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  }
  
  // Validate required variables
  if (!config.OLLAMA_HOST) {
    throw new Error('OLLAMA_HOST environment variable is required')
  }
  
  if (!config.OLLAMA_MODEL) {
    throw new Error('OLLAMA_MODEL environment variable is required')
  }
  
  if (config.BILAN_MODE === 'server' && !config.BILAN_ENDPOINT) {
    throw new Error('BILAN_ENDPOINT is required when BILAN_MODE is "server"')
  }
  
  return config
}

/**
 * Global environment configuration instance
 */
export const env = getEnvironmentConfig() 