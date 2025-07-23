/**
 * Common Types for ESLint Cleanup
 * 
 * Centralized type definitions to replace 'any' types throughout the codebase
 */

// API Error Handling
export interface ApiErrorDetails {
  code?: string
  message?: string
  stack?: string
  context?: Record<string, unknown>
  [key: string]: unknown
}

// Metadata Types
export interface MetadataRecord {
  [key: string]: string | number | boolean | null | undefined
}

export interface ApiMetadata {
  timestamp: number
  source: string
  version?: string
  [key: string]: string | number | boolean | null | undefined
}

// Configuration Types  
export type ConfigValue = string | number | boolean | null | undefined
export interface ConfigurationOptions {
  [key: string]: ConfigValue | ConfigValue[]
}

// Error Types for Catch Blocks
export type CatchError = Error | { message: string } | string | unknown

// Generic Response Types
export interface GenericApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiErrorDetails
  metadata?: ApiMetadata
}

// Utility Types
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export interface JsonArray extends Array<JsonValue> {}

// Analytics Event Properties
export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null | undefined
} 