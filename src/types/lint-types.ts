/**
 * Common Types for ESLint Cleanup
 * 
 * Centralized type definitions to replace 'any' types throughout the codebase
 */

/**
 * Standardized error details for API responses and error handling.
 * Replaces 'any' types in catch blocks and error processing throughout the codebase.
 * 
 * @example
 * ```typescript
 * catch (error) {
 *   const apiError: ApiErrorDetails = {
 *     code: 'VALIDATION_ERROR',
 *     message: error.message,
 *     context: { userId: '123' }
 *   }
 * }
 * ```
 */
export interface ApiErrorDetails {
  /** Error code for programmatic handling */
  code?: string
  /** Human-readable error message */
  message?: string
  /** Stack trace for debugging (not included in production responses) */
  stack?: string
  /** Additional context data related to the error */
  context?: Record<string, unknown>
  /** Allow additional error properties while maintaining type safety */
  [key: string]: unknown
}

/**
 * Generic metadata record with restricted value types for type safety.
 * Used to replace 'any' types in metadata objects throughout the application.
 * 
 * @example
 * ```typescript
 * const metadata: MetadataRecord = {
 *   userId: 'user123',
 *   attemptNumber: 3,
 *   isSuccessful: true,
 *   timestamp: null
 * }
 * ```
 */
export interface MetadataRecord {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Standardized metadata structure for API responses and system tracking.
 * Provides consistent metadata format across all API endpoints.
 * 
 * @example
 * ```typescript
 * const apiMetadata: ApiMetadata = {
 *   timestamp: Date.now(),
 *   source: 'content-generation-api',
 *   version: '1.2.0',
 *   requestId: 'req_abc123'
 * }
 * ```
 */
export interface ApiMetadata {
  /** Unix timestamp when the operation occurred */
  timestamp: number
  /** Source system or component that generated this metadata */
  source: string
  /** API or system version (optional) */
  version?: string
  /** Additional metadata properties with type safety */
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Allowed primitive configuration value types.
 * Restricts configuration values to safe, serializable types.
 * 
 * @example
 * ```typescript
 * const maxRetries: ConfigValue = 3
 * const enableLogging: ConfigValue = true
 * const apiKey: ConfigValue = process.env.API_KEY || null
 * ```
 */
export type ConfigValue = string | number | boolean | null | undefined

/**
 * Type-safe configuration options structure.
 * Supports both single values and arrays while maintaining type safety.
 * 
 * @example
 * ```typescript
 * const config: ConfigurationOptions = {
 *   maxRetries: 3,
 *   enabledFeatures: ['analytics', 'export'],
 *   apiTimeout: 5000,
 *   debugMode: false
 * }
 * ```
 */
export interface ConfigurationOptions {
  [key: string]: ConfigValue | ConfigValue[]
}

/**
 * Union type for all possible error types that can be caught in try-catch blocks.
 * Provides type safety when handling errors from various sources.
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation()
 * } catch (error: CatchError) {
 *   // Handle all possible error types safely
 *   if (error instanceof Error) {
 *     console.error(error.message)
 *   } else if (typeof error === 'string') {
 *     console.error(error)
 *   }
 * }
 * ```
 */
export type CatchError = Error | { message: string } | string | unknown

/**
 * Standardized generic API response structure with type-safe data payload.
 * Provides consistent response format across all API endpoints.
 * 
 * @template T - Type of the response data payload
 * 
 * @example
 * ```typescript
 * // Typed response
 * const response: GenericApiResponse<ContentSession> = {
 *   success: true,
 *   data: session,
 *   metadata: { timestamp: Date.now(), source: 'api' }
 * }
 * 
 * // Error response
 * const errorResponse: GenericApiResponse = {
 *   success: false,
 *   error: { code: 'NOT_FOUND', message: 'Session not found' }
 * }
 * ```
 */
export interface GenericApiResponse<T = unknown> {
  /** Whether the operation was successful */
  success: boolean
  /** Response data (only present on success) */
  data?: T
  /** Error details (only present on failure) */
  error?: ApiErrorDetails
  /** Additional response metadata */
  metadata?: ApiMetadata
}

/**
 * Type-safe representation of any valid JSON value.
 * Recursively defines all possible JSON data types.
 * 
 * @example
 * ```typescript
 * const jsonData: JsonValue = {
 *   name: "John",
 *   age: 30,
 *   active: true,
 *   tags: ["user", "premium"],
 *   metadata: null
 * }
 * ```
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray

/**
 * Type-safe JSON object with string keys and JsonValue values.
 * Ensures all object properties are valid JSON types.
 * 
 * @example
 * ```typescript
 * const userProfile: JsonObject = {
 *   id: "user123",
 *   preferences: {
 *     theme: "dark",
 *     notifications: true
 *   },
 *   lastLogin: null
 * }
 * ```
 */
export interface JsonObject {
  [key: string]: JsonValue
}

/**
 * Type-safe array of JSON values.
 * Ensures all array elements are valid JSON types.
 * 
 * @example
 * ```typescript
 * const mixedArray: JsonArray = [
 *   "string",
 *   42,
 *   true,
 *   { nested: "object" },
 *   [1, 2, 3]
 * ]
 * ```
 */
export type JsonArray = JsonValue[]

/**
 * Type-safe properties for analytics events.
 * Restricts event properties to trackable primitive types for analytics platforms.
 * 
 * @example
 * ```typescript
 * const eventProps: AnalyticsEventProperties = {
 *   contentType: 'blog',
 *   iterationNumber: 3,
 *   userSatisfied: true,
 *   generationTime: 2.5,
 *   userId: null  // for anonymous users
 * }
 * ```
 */
export interface AnalyticsEventProperties {
  [key: string]: string | number | boolean | null | undefined
} 