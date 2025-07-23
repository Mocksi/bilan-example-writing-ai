# Bilan Content Creation Demo - Technical Specification

## Architecture Overview

### Application Architecture
**Pattern**: Single Page Application (SPA) that sends analytics to external Bilan server
**Purpose**: Demonstrate proper Bilan SDK integration in an AI content creation app
**Key Point**: This app is a CLIENT of Bilan - it sends data TO Bilan, does not display analytics

### Component Architecture
```
┌─────────────────┐    ┌─────────────────┐    
│   Demo Frontend │ -> │   Local Ollama  │    
│   (Next.js)     │    │   (TinyLlama)   │    
└────────┬────────┘    └─────────────────┘    
         │                                      
         │ Analytics Events                     
         ↓                                      
┌─────────────────┐    ┌─────────────────┐
│   Bilan SDK     │ -> │  Bilan Server   │
│   (Client)      │    │  (Analytics)    │
└─────────────────┘    └─────────────────┘
```
**Data Flow**: User interactions → Bilan SDK → Bilan Server (one-way data flow)

Technology Stack
Frontend Framework
Next.js 14 with App Router

Rationale: Modern React framework with excellent developer experience
Benefits: Built-in optimization, API routes, TypeScript support
Configuration: App directory structure for clean organization
UI Component Library
Mantine v7

Rationale: Comprehensive component set with excellent defaults
Benefits: Zero design configuration, built-in dark mode, form handling
Components Used: AppShell, Card, Textarea, Button, ActionIcon, Group, Stack
AI Integration
Ollama + TinyLlama

Model: TinyLlama (637MB, 1.1B parameters)
Rationale: Local inference, no API keys, fast setup
Interface: Direct HTTP calls to Ollama API (localhost:11434)
Conversation Management
CopilotKit (Optional Enhancement)

Rationale: Professional chat interface with streaming support
Integration: Works with Ollama adapter for seamless local AI
Fallback: Direct Ollama integration if CopilotKit adds complexity
### Analytics Integration
**Bilan SDK**
- **Mode**: Client mode - sends events to Bilan server
- **Integration**: Event tracking wrapper around all AI interactions  
- **Data Flow**: One-way transmission of events to Bilan analytics
- **No Display**: This app does NOT display analytics, only sends data
Core System Components
Content Generation Engine
Architecture: Request/Response pattern with state management Components:

Content Types: Blog, Email, Social Media (distinct prompt templates)
Iteration Manager: Tracks attempt counts and refinement history
Prompt Engineering: Context-aware prompt generation based on user feedback
Response Parser: Extracts content and metadata from AI responses
### User Interaction Tracker
**Architecture**: Event-driven system that sends user behaviors to Bilan
**Events Sent to Bilan**:
- Turn Events: Content generation requests and completions
- Vote Events: User feedback (accept/reject/refine)
- Journey Events: Progress through content creation workflow
- Conversation Events: Session start/end with outcomes

**Important**: All events are sent TO Bilan for processing. Analytics viewing happens in the Bilan dashboard, not in this application.
### State Management
**Architecture**: React state with local persistence
**State Structure**:
- Session State: Current content type, iteration count, conversation ID
- Content History: Previous attempts, user feedback, refinement requests
- SDK State: Bilan event queue for reliable delivery, connection status
- UI State: Loading states, error handling, user preferences

**Note**: No analytics display state - all analytics viewing happens in the external Bilan dashboard
Feedback Processing System
Architecture: Multi-layer feedback capture and processing Layers:

Explicit Feedback: Direct user ratings and comments
Implicit Signals: Timing, iteration patterns, abandonment points
Behavioral Analytics: User preference learning and pattern recognition
Integration Specifications
Ollama Integration
Connection: HTTP client to localhost:11434 API Endpoints:

/api/generate - Content generation with streaming support
/api/tags - Model availability verification Error Handling: Graceful degradation with clear user messaging Performance: Response streaming for large content generation
### Bilan SDK Integration
**Purpose**: Send comprehensive analytics data to Bilan server
- **Initialization**: Configure SDK to connect to Bilan analytics server
- **Event Tracking**: Automated wrapper around all AI interactions
- **Data Transmission**: Structured events sent with rich metadata
- **Reliability**: Event queuing with retry logic for guaranteed delivery
- **One-Way Flow**: Only sends data, does not receive or display analytics

Prompt Engineering System
Architecture: Template-based with dynamic context injection Components:

Base Templates: Content type specific system prompts
Context Injection: User feedback and iteration history
Refinement Logic: Specific improvement request handling
Consistency Management: Maintaining style and voice across iterations
Data Models
Content Session
ContentSession {
  id: string
  contentType: 'blog' | 'email' | 'social'
  userBrief: string
  iterations: ContentIteration[]
  status: 'active' | 'completed' | 'abandoned'
  startTime: timestamp
  endTime?: timestamp
}
Content Iteration
ContentIteration {
  id: string
  attemptNumber: number
  prompt: string
  generatedContent: string
  userFeedback?: UserFeedback
  bilanTurnId: string
  timing: {
    requestTime: timestamp
    responseTime: timestamp
    userResponseTime?: timestamp
  }
}
User Feedback
UserFeedback {
  type: 'accept' | 'reject' | 'refine'
  rating?: 1 | -1
  refinementRequest?: string
  quickFeedback?: string[]
  acceptanceLevel?: 'as_is' | 'light_edit' | 'heavy_edit' | 'inspiration'
}
Bilan Event Metadata
BilanEventMetadata {
  contentType: string
  iterationNumber: number
  userFeedback?: string
  refinementType?: string
  sessionDuration: number
  previousAttempts: number
}
API Design
Internal API Routes
Pattern: Next.js API routes for AI integration and state management

/api/content/generate
Method: POST
Purpose: Generate content using Ollama
Input: Content type, user prompt, iteration context
Output: Generated content with Bilan tracking metadata
/api/content/refine
Method: POST
Purpose: Refine existing content based on user feedback
Input: Previous content, user feedback, refinement instructions
Output: Improved content with refinement tracking
/api/analytics/track
Method: POST
Purpose: Track user interactions for Bilan analytics
Input: Event type, event metadata, user context
Output: Tracking confirmation and event ID
External Dependencies
Ollama API
Endpoint: http://localhost:11434
Health Check: /api/tags endpoint for service verification
Content Generation: /api/generate with model specification
Bilan Server (Optional)
Endpoint: Configurable server URL or local mode
Events API: RESTful event ingestion
Analytics API: Query interface for dashboard integration
Performance Considerations
AI Inference Optimization
Model Selection: TinyLlama optimized for speed over quality Request Batching: Single content generation per request Response Streaming: Progressive content display for better UX Caching Strategy: Local caching of successful content for iteration comparison

Frontend Performance
Bundle Optimization: Code splitting for Mantine components State Management: Efficient re-renders with React optimization patterns Memory Management: Cleanup of content history after session completion Loading States: Progressive enhancement with skeleton screens

### Analytics Performance
- **Event Batching**: Queue events locally, batch send to Bilan server
- **Offline Support**: Local storage fallback with background sync
- **Reliable Delivery**: Retry logic for failed transmissions
- **Data Efficiency**: Minimal payload size with structured event data
- **Non-Blocking**: Analytics transmission never blocks user interactions

Security and Privacy
Local Data Handling
Content Storage: Session-only storage, no persistent content retention User Privacy: No personal data collection beyond usage analytics API Security: Local-only AI inference, optional external analytics

External Communications
Bilan Integration: Secure event transmission with optional authentication Error Handling: No sensitive data in error logs or external services User Consent: Clear disclosure of analytics data collection

Development Architecture
Project Structure
src/
├── app/                 # Next.js app router
├── components/          # React components
├── lib/                 # Utility libraries
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
└── utils/               # Helper functions
Environment Configuration
Local Development: Ollama + local Bilan mode Demo Deployment: Ollama + optional Bilan server Configuration: Environment variables for service endpoints

Build and Deployment
Target: Static site generation with dynamic API routes Dependencies: Node.js runtime for Ollama integration Distribution: GitHub template repository for easy cloning

Integration Testing Strategy
Ollama Integration Testing
Health Checks: Verify Ollama service availability Content Generation: Validate AI response processing Error Handling: Test failure modes and recovery

Bilan Integration Testing
Event Tracking: Verify all user interactions generate events Data Integrity: Validate event metadata accuracy Analytics Flow: Test end-to-end analytics data pipeline

User Experience Testing
Content Creation Flow: Complete user journeys for each content type Feedback Processing: Verify refinement requests improve output Session Management: Test state persistence and cleanup

This technical specification provides the architectural foundation for building a content creation demo that effectively showcases Bilan's analytics capabilities while maintaining simplicity and reliability.

