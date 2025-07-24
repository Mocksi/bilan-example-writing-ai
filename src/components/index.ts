/**
 * @fileoverview Component barrel file for centralized UI component exports
 * 
 * This module serves as the main entry point for importing UI components throughout
 * the Bilan Content Creation Demo application. It re-exports all components from their
 * individual modules, providing a clean and organized import interface that improves
 * developer experience and enables better tree-shaking optimization.
 * 
 * @module components
 * @version 1.0.0
 * @author Bilan Content Creation Demo
 * 
 * @example
 * ```typescript
 * // Import multiple components from a single source
 * import { AppShell, ContentTypeCard, AIStatusIndicator } from '../components'
 * 
 * // Instead of multiple individual imports:
 * // import { AppShell } from '../components/AppShell'
 * // import { ContentTypeCard } from '../components/ContentTypeCard'
 * // import { AIStatusIndicator } from '../components/AIStatusIndicator'
 * ```
 * 
 * @remarks
 * Components are organized into logical categories for better maintainability:
 * - **Layout and Structure**: Core application layout components (AppShell, ErrorBoundary)
 * - **Content Components**: Content-specific UI elements (ContentTypeCard)
 * - **Status and Indicator**: System status and feedback components (AIStatusIndicator)
 * - **Loading and State**: Loading states and skeleton components for async operations
 * 
 * This barrel export pattern provides several benefits:
 * - Simplified import statements across the application
 * - Centralized component organization and discoverability
 * - Better tree-shaking support for production builds
 * - Consistent import patterns for template repository users
 * - Easy maintenance when component locations change
 * 
 * @see {@link https://basarat.gitbook.io/typescript/main-1/barrel} for barrel export patterns
 */

export { AIStatusIndicator } from './AIStatusIndicator'
export { AppShell } from './AppShell'
export { ChatInterface } from './ChatInterface'
export { ContentTypeCard } from './ContentTypeCard'
export { ErrorBoundary } from './ErrorBoundary'
export { 
  LoadingSkeleton, 
  ContentGenerationLoading, 
  PageLoading, 
  ContentCardSkeleton 
} from './LoadingState'
export { WorkflowSelector } from './WorkflowSelector'
export { QuickActionModal } from './QuickActionModal' 