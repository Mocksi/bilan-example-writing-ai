# Bilan Content Creation Demo - Implementation Plan

## Overview

This document outlines the implementation strategy for the Bilan Content Creation Demo, broken down into logical pull requests with detailed commit sequences. The plan follows industry best practices for GitHub template repositories and maximizes development parallelization.

### Key Goals
- **Showcase Bilan SDK**: Demonstrate how to properly send analytics data to Bilan
- **Template Quality**: Create an exemplary client application for developers
- **Real-World Patterns**: Implement authentic content creation workflows
- **Developer Education**: Clear patterns for integrating Bilan SDK into AI apps

**Important**: This demo app is a CLIENT that sends data TO Bilan's analytics server. It does NOT display analytics - that's what the Bilan dashboard is for.

## Implementation Principles

### PR Strategy
- **Atomic PRs**: Each PR introduces one logical feature set
- **Progressive Enhancement**: Each PR leaves the app in a working state
- **Clear Dependencies**: Sequential requirements explicitly noted
- **Template Quality**: Every PR maintains exemplary code quality

### Commit Strategy (per .cursorrules)
- **Conventional Commits**: `type: description` format
- **Atomic Changes**: One logical change per commit
- **Clear Intent**: Descriptive messages explaining the why
- **No Mixed Concerns**: Separate commits for code, tests, and docs

## Phase 1: Foundation (Sequential)

### PR-01: Project Initialization and Core Setup
**Branch**: `feat/project-foundation`
**Dependencies**: None
**Can parallelize after**: Yes

#### Commits:
1. `chore: initialize Next.js 14 project with TypeScript`
   - Create Next.js app with App Router
   - Configure TypeScript strict mode
   - Set up src directory structure

2. `chore: configure ESLint and Prettier for code quality`
   - Add ESLint configuration
   - Configure Prettier with team standards
   - Add format/lint scripts to package.json

3. `feat: add Mantine v7 UI framework`
   - Install @mantine/core @mantine/hooks
   - Configure MantineProvider in layout
   - Add theme configuration

4. `chore: set up environment configuration`
   - Create .env.example with all variables
   - Add environment type definitions
   - Configure environment validation

5. `docs: add initial README with setup instructions`
   - Project overview and purpose
   - Prerequisites (Node.js, Ollama)
   - Quick start guide
   - Environment variable documentation

6. `chore: configure .gitignore for template repository`
   - Standard Next.js ignores
   - Add /docs/projects to .gitignore
   - Environment files (.env, .env.local)
   - Build artifacts (.next/, out/)
   - OS files (.DS_Store)
   - IDE files (.vscode/, .idea/)
   - Ollama model cache
   - Analytics data cache

### PR-02: TypeScript Data Models and Core Types
**Branch**: `feat/data-models`
**Dependencies**: PR-01
**Can parallelize after**: Yes

#### Commits:
1. `feat: implement core content data models`
   - Create types/index.ts
   - Add ContentSession interface
   - Add ContentIteration interface
   - Add UserFeedback interface

2. `feat: add branded type utilities`
   - Create SessionId, IterationId types
   - Add type creation utilities
   - Export all branded types

3. `feat: implement Bilan event metadata types`
   - Add BilanEventMetadata interface
   - Create event type mappings
   - Add analytics data structures

4. `test: add type validation tests`
   - Type guard functions
   - Data model validation
   - Branded type tests

## Phase 2: Core Infrastructure (Parallelizable)

### PR-03: Ollama Integration Layer
**Branch**: `feat/ollama-integration`
**Dependencies**: PR-01, PR-02
**Can parallelize with**: PR-04, PR-05

#### Commits:
1. `feat: create Ollama API client`
   - Create lib/ollama.ts
   - Implement health check function
   - Add model verification

2. `feat: implement content generation service`
   - Add generate function with typing
   - Implement streaming support
   - Add response parsing

3. `feat: add prompt engineering system`
   - Create lib/prompts.ts
   - Implement content type templates
   - Add context injection utilities

4. `feat: implement error handling for Ollama`
   - Connection error handling
   - Model unavailable errors
   - Graceful degradation

5. `test: add Ollama integration tests`
   - Mock Ollama responses
   - Test error scenarios
   - Verify prompt building

### PR-04: Bilan SDK Integration
**Branch**: `feat/bilan-integration`
**Dependencies**: PR-01, PR-02
**Can parallelize with**: PR-03, PR-05

#### Commits:
1. `feat: configure Bilan SDK initialization`
   - Create lib/bilan.ts
   - Set up initialization with local mode
   - Add user session management
   - Configure privacy settings

2. `feat: implement comprehensive event tracking`
   - Create hooks/useAnalytics.ts
   - Add turn tracking wrapper with automatic correlation
   - Implement vote tracking with turnId correlation
   - Add frustration signal detection

3. `feat: add conversation and journey tracking`
   - Conversation lifecycle management (start/end)
   - Journey step tracking for content creation workflow
   - Session correlation across all events
   - Abandonment detection patterns

4. `feat: create analytics event queue`
   - Local event storage with IndexedDB
   - Batch processing logic
   - Offline support with background sync
   - Event deduplication

5. `feat: implement advanced Bilan patterns`
   - Multi-turn refinement tracking
   - Content type performance comparison
   - User preference learning signals
   - Quality signal aggregation

6. `test: add Bilan integration tests`
   - Event generation verification
   - Turn-to-vote correlation testing
   - Journey completion tracking
   - Queue behavior tests

### PR-05: State Management Architecture
**Branch**: `feat/state-management`
**Dependencies**: PR-01, PR-02
**Can parallelize with**: PR-03, PR-04

#### Commits:
1. `feat: implement content session store`
   - Create hooks/useContentSession.ts
   - Session lifecycle management
   - Iteration tracking

2. `feat: add feedback processing system`
   - User feedback state management
   - Refinement request handling
   - Feedback history tracking

3. `feat: implement local persistence layer`
   - Session recovery on reload
   - Clean up abandoned sessions
   - Storage size management

4. `test: add state management tests`
   - State transitions
   - Persistence verification
   - Edge case handling

## Phase 3: User Interface (Parallelizable)

### PR-06: Layout and Navigation Structure
**Branch**: `feat/app-layout`
**Dependencies**: PR-01
**Can parallelize with**: PR-07, PR-08, PR-09

#### Commits:
1. `feat: implement responsive app shell`
   - Create AppShell layout
   - Add navigation structure
   - Configure responsive breakpoints

2. `feat: add content type selection page`
   - Create app/page.tsx
   - Implement content type cards
   - Add navigation to creator

3. `ui: implement loading and error boundaries`
   - Global error boundary
   - Loading skeletons
   - Error recovery UI

### PR-07: Content Creator Interface
**Branch**: `feat/content-creator`
**Dependencies**: PR-01, PR-02
**Can parallelize with**: PR-06, PR-08, PR-09

#### Commits:
1. `feat: create content creator component`
   - Create components/ContentCreator/
   - Implement input interface
   - Add generation trigger

2. `feat: add content display with iterations`
   - Iteration counter display
   - Content rendering
   - Version comparison view

3. `ui: implement generation loading states`
   - Progress indicators
   - Estimated time display
   - Cancel functionality

4. `feat: add content management controls`
   - Copy to clipboard
   - Export functionality
   - Clear/reset options

### PR-08: Feedback Collection System
**Branch**: `feat/feedback-system`
**Dependencies**: PR-01, PR-02
**Can parallelize with**: PR-06, PR-07, PR-09

#### Commits:
1. `feat: implement feedback UI components`
   - Create components/FeedbackSystem/
   - Quick feedback buttons
   - Detailed feedback form

2. `feat: add refinement request interface`
   - Refinement input field
   - Suggestion chips
   - Tone adjustment controls

3. `feat: implement feedback visualization`
   - Feedback confirmation
   - History display
   - Success indicators

### PR-09: User Activity Status
**Branch**: `feat/user-status`
**Dependencies**: PR-01, PR-05
**Can parallelize with**: PR-06, PR-07, PR-08

#### Commits:
1. `feat: create user activity status component`
   - Create components/UserStatus/
   - Display current session status
   - Show content creation progress
   - Active/idle state indicator

2. `feat: implement session progress tracking`
   - Content attempts counter
   - Time spent indicator
   - Current workflow step display
   - Session start time

3. `feat: add link to external Bilan dashboard`
   - Simple "View Analytics" button
   - Opens Bilan dashboard in new tab
   - Pass session context via URL params
   - Clear messaging about external analytics

4. `ui: add status animations and polish`
   - Smooth progress updates
   - Activity state transitions
   - Minimal UI footprint
   - Non-intrusive design

## Phase 4: Integration (Sequential)

### PR-10: End-to-End Content Workflows
**Branch**: `feat/content-workflows`
**Dependencies**: PR-03, PR-04, PR-07, PR-08

#### Commits:
1. `integrate: connect Ollama to content creator`
   - Wire up generation API
   - Handle streaming responses
   - Error state management

2. `integrate: implement Bilan tracking for all interactions`
   - Turn tracking on generation with full context
   - Vote tracking on feedback with turnId correlation
   - Journey tracking on completion
   - Frustration signal detection (multiple rejections)
   - Regeneration tracking for refinements
   - Session timing analytics

3. `feat: add content iteration workflow`
   - Refinement processing
   - Context accumulation
   - Multi-turn management

4. `test: add end-to-end workflow tests`
   - Complete content creation flow
   - Feedback processing
   - Analytics verification

### PR-11: API Routes and Backend Logic
**Branch**: `feat/api-routes`
**Dependencies**: PR-03, PR-04

#### Commits:
1. `feat: create content generation API route`
   - app/api/content/generate/route.ts
   - Request validation
   - Ollama integration

2. `feat: implement refinement API route`
   - app/api/content/refine/route.ts
   - Context processing
   - Iteration management

3. `feat: add analytics tracking endpoints`
   - app/api/analytics/track/route.ts
   - Event validation
   - Batch processing

### PR-11.5: Advanced Analytics Features
**Branch**: `feat/advanced-analytics`
**Dependencies**: PR-10, PR-11

#### Commits:
1. `analytics: implement user preference learning`
   - Track accepted vs rejected content patterns
   - Identify tone preferences
   - Content length preferences
   - Style preference detection

2. `analytics: add quality signal aggregation`
   - Calculate session trust scores
   - Track improvement over iterations
   - Success rate by content type
   - Time-to-satisfaction metrics

3. `analytics: implement behavioral pattern detection`
   - Multi-rejection frustration signals
   - Quick acceptance patterns
   - Iteration efficiency tracking
   - User expertise level inference

## Phase 5: Polish and Documentation (Sequential)

### PR-12: Error Handling and Edge Cases
**Branch**: `feat/error-handling`
**Dependencies**: PR-10

#### Commits:
1. `feat: implement comprehensive error handling`
   - Ollama connection errors
   - Network failures
   - Invalid state recovery

2. `feat: add user-friendly error messages`
   - Setup instructions
   - Retry mechanisms
   - Help documentation

3. `test: add error scenario tests`
   - Service unavailable
   - Timeout handling
   - Recovery flows

### PR-13: Performance Optimization
**Branch**: `perf/optimization`
**Dependencies**: PR-10

#### Commits:
1. `perf: optimize bundle size with code splitting`
   - Lazy load heavy components
   - Dynamic imports
   - Tree shaking

2. `perf: implement request caching`
   - Content caching strategy
   - Memoization
   - State optimization

3. `perf: add performance monitoring`
   - Generation time tracking
   - Bundle size validation
   - Memory usage checks

### PR-14: Documentation and Template Preparation
**Branch**: `docs/template-ready`
**Dependencies**: All previous PRs

#### Commits:
1. `docs: create comprehensive setup guide`
   - Ollama installation
   - Model download instructions
   - Configuration guide

2. `docs: add integration patterns documentation`
   - Bilan SDK usage examples
   - Extension patterns
   - Customization guide

3. `docs: implement inline code documentation`
   - JSDoc for all public functions
   - Component prop documentation
   - Usage examples

4. `chore: prepare repository as template`
   - Clean commit history
   - Remove development artifacts
   - Add template configuration
   - Configure GitHub template repository settings
   - Add issue templates for feedback
   - Create contributing guide

## Parallelization Strategy

### Can be worked on simultaneously:
1. **After PR-01 & PR-02**:
   - PR-03 (Ollama Integration)
   - PR-04 (Bilan SDK Integration)
   - PR-05 (State Management)
   - PR-06 (Layout)
   - PR-07 (Content Creator)
   - PR-08 (Feedback System)
   - PR-09 (User Status)

### Must be sequential:
1. **PR-01 → PR-02**: Data models depend on project setup
2. **PR-{03,04,07,08} → PR-10**: Integration requires all components
3. **PR-10 → PR-{11,12,13}**: Polish depends on working integration
4. **All → PR-14**: Documentation requires complete implementation

### Recommended parallel tracks:
- **Track A**: PR-03 → PR-11 (Ollama/AI content generation)
- **Track B**: PR-04 → PR-09 (Bilan SDK event tracking)
- **Track C**: PR-06 → PR-07 → PR-08 (User interface)
- **Track D**: PR-05 (State management)

## Comprehensive Bilan SDK Usage Patterns

### Turn Tracking Pattern
```typescript
// Every AI interaction wrapped with trackTurn
const { result, turnId } = await trackTurn(
  userBrief,
  () => generateContent(prompt, contentType),
  {
    contentType,
    iterationNumber,
    conversationId,
    journey_id: 'content-creation-workflow',
    turn_sequence: attemptNumber,
    systemPromptVersion: 'v1.0'
  }
)
```

### User Feedback Collection
```typescript
// Immediate feedback with turnId correlation
await vote(turnId, value, comment)

// Frustration signal detection
if (consecutiveRejections >= 3) {
  await track('frustration_detected', {
    conversationId,
    rejectionCount: consecutiveRejections,
    contentType
  })
}

// Regeneration tracking
await track('regeneration_requested', {
  turnId: previousTurnId,
  reason: refinementRequest,
  conversationId
})
```

### Journey Tracking
```typescript
// Complete content creation journey
await trackJourneyStep('content-creation', 'type-selected', userId)
await trackJourneyStep('content-creation', 'brief-provided', userId)
await trackJourneyStep('content-creation', 'content-generated', userId)
await trackJourneyStep('content-creation', 'feedback-provided', userId)
await trackJourneyStep('content-creation', 'content-accepted', userId)
```

### Conversation Management
```typescript
// Session lifecycle
const conversationId = await startConversation(userId)

// Track abandonment patterns
window.addEventListener('beforeunload', async () => {
  if (sessionActive && !contentAccepted) {
    await endConversation(conversationId, 'abandoned')
  }
})

// Success tracking
await endConversation(conversationId, 'completed')
```

### Analytics Event Metadata
Every event includes rich context:
- `contentType`: blog | email | social
- `iterationNumber`: Current attempt count
- `refinementType`: tone | length | topic | style
- `responseTime`: AI generation duration
- `userResponseTime`: Time to provide feedback
- `acceptanceLevel`: as_is | light_edit | heavy_edit | inspiration

## Success Criteria

### Code Quality
- ✅ Every PR passes all tests
- ✅ TypeScript strict mode compliance
- ✅ No linting errors
- ✅ Comprehensive error handling

### Bilan SDK Integration Excellence
- ✅ All user interactions properly sent to Bilan server
- ✅ Turn-to-vote correlation data correctly structured
- ✅ Complete journey events tracked and transmitted
- ✅ All events successfully sent to Bilan analytics
- ✅ Frustration and abandonment signals properly captured
- ✅ Multi-turn refinement patterns sent with context
- ✅ User behavior data transmitted for preference analysis
- ✅ Quality signals properly formatted and sent

**Note**: Analytics visualization happens in the Bilan dashboard, NOT in this demo app

### Template Repository
- ✅ <10 minute setup time
- ✅ Clear documentation with Bilan patterns
- ✅ Working demo out of the box
- ✅ Easy to customize and extend
- ✅ Exemplary Bilan SDK usage

### Performance
- ✅ <3s content generation
- ✅ <100ms UI interactions
- ✅ Smooth animations
- ✅ No memory leaks
- ✅ Non-blocking analytics 