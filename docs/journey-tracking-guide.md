# Enhanced Journey Tracking Guide

Based on recommendations from the Bilan team, we've implemented comprehensive journey tracking that captures rich metadata about user workflows.

## Key Features

✅ **Journey Session Tracking** - Each journey instance gets a unique session ID
✅ **Step Sequencing & Retry Detection** - Track order and retry attempts
✅ **Rich Step Metadata** - Capture context about user decisions
✅ **Turn Linking** - Connect AI turns to specific journey steps
✅ **Abandonment Tracking** - Know exactly where users drop off
✅ **State Persistence** - Handle page refreshes gracefully
✅ **Time Analysis** - Track time spent on each step

## Usage Example

```typescript
import { JourneyTracker } from '@/lib/journey-tracker'
import { createUserId } from '@/lib/bilan'

// Initialize tracker
const userId = createUserId('user_123')
const journey = new JourneyTracker(
  'email-campaign',    // Journey name
  userId,              // User ID
  4,                   // Total steps
  {                    // Initial metadata
    source: 'dashboard',
    contentType: 'email'
  }
)

// Start the journey
await journey.start({
  campaign_goal: 'product_launch',
  audience_size: 5000
})

// Track first step
await journey.trackStep('purpose-definition', 1, {
  selected_goal: 'announce_product',
  target_audience: 'existing_customers',
  tone: 'professional'
})

// Track AI generation with journey context
const { result, turnId } = await journey.trackTurnWithJourney(
  prompt,
  async () => aiClient.generate(prompt),
  { temperature: 0.7 }
)

// Link the turn to current step
await journey.linkTurn(turnId, {
  generated_options: 5,
  user_selected_index: 2
})

// Handle back navigation
await journey.navigateBack(
  'purpose-definition', 
  1, 
  'change_audience'
)

// Complete the journey
await journey.complete('completed', {
  total_content_generated: 1500,
  user_satisfaction: 5
})
```

## Journey Events Generated

### 1. Journey Started
```json
{
  "event_type": "user_action",
  "properties": {
    "action_type": "journey_started",
    "journey_name": "email-campaign",
    "journey_session_id": "journey_1234567890_abc123",
    "user_id": "user_123",
    "started_at": 1234567890,
    "expected_steps": 4,
    "journey_metadata": {
      "source": "dashboard",
      "contentType": "email",
      "ai_model": "webllm",
      "browser": "Mozilla/5.0..."
    }
  }
}
```

### 2. Journey Step
```json
{
  "event_type": "journey_step",
  "properties": {
    "journey_name": "email-campaign",
    "step_name": "subject-generation",
    "journey_session_id": "journey_1234567890_abc123",
    "step_sequence": 2,
    "step_attempt": 1,
    "total_steps": 4,
    "time_on_step_ms": 15000,
    "previous_step": "purpose-definition",
    "navigation_type": "forward",
    "step_data": {
      "subjects_generated": 5,
      "selected_subject": "Introducing Our Game-Changer",
      "regeneration_count": 0
    },
    "steps_completed_so_far": 2,
    "journey_progress_percentage": 50
  }
}
```

### 3. Journey-Turn Link
```json
{
  "event_type": "user_action",
  "properties": {
    "action_type": "journey_turn_link",
    "journey_session_id": "journey_1234567890_abc123",
    "journey_name": "email-campaign",
    "journey_step": "subject-generation",
    "turn_id": "turn_xyz789",
    "step_sequence": 2
  }
}
```

### 4. Journey Completed
```json
{
  "event_type": "user_action",
  "properties": {
    "action_type": "journey_completed",
    "journey_name": "email-campaign",
    "journey_session_id": "journey_1234567890_abc123",
    "completed_at": 1234567999,
    "duration_ms": 109000,
    "steps_completed": 4,
    "total_attempts": 5,
    "outcome": "completed",
    "average_attempts_per_step": 1.25,
    "final_step_data": "{...}"
  }
}
```

## Implementation Details

### State Persistence

The JourneyTracker automatically saves state to localStorage:
- Restores journey on page refresh
- Expires after 1 hour of inactivity
- Clears on completion/abandonment

### Abandonment Tracking

Uses `navigator.sendBeacon` for reliable tracking:
- Tracks when user closes tab/browser
- Sends final state to `/api/track` endpoint
- Includes abandonment reason and last step

### Back Navigation

Tracks when users go back to previous steps:
- Records reason for going back
- Maintains step attempt counts
- Preserves journey continuity

## Benefits

1. **Complete Journey Visibility** - See exactly how users progress through workflows
2. **Drop-off Analysis** - Identify problematic steps with high abandonment
3. **Time-to-Complete Metrics** - Measure efficiency of each step
4. **Retry Pattern Detection** - Understand which steps need improvement
5. **Rich Context** - Capture why users make specific choices
6. **Cross-Session Support** - Users can resume interrupted journeys 