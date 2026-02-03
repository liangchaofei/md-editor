# Implementation Plan: AI Outline Generation

## Overview

This implementation plan breaks down the AI outline generation feature into discrete, incremental tasks. The approach follows a bottom-up strategy: first establishing core data structures and utilities, then building UI components, then integrating with APIs, and finally wiring everything together.

## Tasks

- [-] 1. Create type definitions and data structures
  - Create `client/src/types/outline.ts` with all TypeScript interfaces
  - Define OutlineNode, Outline, GenerationMode, and request/response types
  - Define OutlineOperation union type for all tree operations
  - _Requirements: 2.6, 14.1_

- [-] 1.1 Write property test for outline node structure validation
  - **Property 1: Outline Node Structure Validity**
  - **Validates: Requirements 2.6, 14.1, 14.2, 14.3**

- [ ] 2. Implement outline management hook (useOutline)
  - [x] 2.1 Create `client/src/hooks/useOutline.ts` with basic state management
    - Implement state for outline, isGenerating, and error
    - Implement generateOutline function with API integration
    - Implement clearOutline function
    - _Requirements: 2.1, 2.4, 9.1_

  - [x] 2.2 Implement tree traversal and search utilities
    - Implement findNode function for searching by ID
    - Implement recursive tree traversal
    - Implement serializeOutline function for JSON conversion
    - _Requirements: 2.7, 8.2_

  - [~] 2.3 Write property test for unique node IDs
    - **Property 2: Unique Node IDs**
    - **Validates: Requirements 2.7, 5.5**

  - [x] 2.4 Implement node update operations
    - Implement updateNode function for modifying node properties
    - Implement validation for required fields
    - Implement error handling for invalid updates
    - _Requirements: 4.3, 14.1_

  - [~] 2.5 Write property test for title edit cancellation
    - **Property 16: Title Edit Cancellation Rollback**
    - **Validates: Requirements 4.4**

  - [~] 2.6 Write property test for empty title rejection
    - **Property 17: Empty Title Rejection**
    - **Validates: Requirements 4.5, 4.6**

- [ ] 3. Implement tree manipulation operations
  - [x] 3.1 Implement addSibling function
    - Insert new node at same level after target
    - Update order values for subsequent siblings
    - Generate unique ID and default title
    - Validate tree structure after operation
    - _Requirements: 5.2, 5.4, 5.5, 5.6_

  - [~] 3.2 Write property test for sibling addition
    - **Property 6: Sibling Addition Preserves Structure**
    - **Validates: Requirements 5.2, 5.4, 5.6**

  - [x] 3.3 Implement addChild function
    - Insert new node as first child of target
    - Set appropriate level value (parent level + 1)
    - Update order values for existing children
    - Generate unique ID and default title
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [~] 3.4 Write property test for child addition
    - **Property 7: Child Addition Preserves Structure**
    - **Validates: Requirements 5.3, 5.4, 5.6**

  - [x] 3.5 Implement deleteNode function
    - Remove node and all descendants
    - Update order values for remaining siblings
    - Validate tree structure after deletion
    - _Requirements: 6.2, 6.4_

  - [~] 3.6 Write property test for node deletion
    - **Property 8: Node Deletion Preserves Structure**
    - **Validates: Requirements 6.2, 6.4**

  - [x] 3.7 Implement moveNode function
    - Support moving within same parent (reordering)
    - Support moving to different parent (hierarchy change)
    - Update level values for moved node and descendants
    - Update order values for all affected siblings
    - Prevent circular moves (parent into descendant)
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [~] 3.8 Write property test for node move operations
    - **Property 9: Node Move Preserves Structure**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.7**

  - [ ] 3.9 Write property test for circular move prevention
    - **Property 10: Circular Move Prevention**
    - **Validates: Requirements 7.8**

  - [x] 3.10 Implement toggleCollapse function
    - Toggle isCollapsed state for target node
    - Preserve state during other operations
    - _Requirements: 3.6, 3.7, 3.8_

  - [ ] 3.11 Write property test for collapse state preservation
    - **Property 15: Edit State Preservation**
    - **Validates: Requirements 3.8**

- [ ] 4. Checkpoint - Ensure hook tests pass
  - Run all tests for useOutline hook
  - Verify tree manipulation operations work correctly
  - Ensure all property tests pass with 100+ iterations
  - Ask the user if questions arise

- [ ] 5. Implement OutlineNode component
  - [x] 5.1 Create `client/src/components/editor/OutlineNode.tsx`
    - Implement recursive node rendering
    - Display title, description, and level
    - Apply visual indentation based on depth
    - Render children recursively
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 5.2 Implement inline title editing
    - Add click handler to enter edit mode
    - Display text input in edit mode
    - Handle save and cancel actions
    - Validate title is not empty
    - Display validation errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.3 Implement node action buttons
    - Add "Add Sibling" button
    - Add "Add Child" button
    - Add "Delete" button with confirmation
    - Wire buttons to hook functions
    - _Requirements: 5.1, 6.1_

  - [x] 5.4 Implement collapse/expand controls
    - Show control only when node has children
    - Toggle collapse state on click
    - Hide/show children based on state
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 5.5 Implement drag-and-drop support
    - Add drag handle to node
    - Implement drag preview
    - Show visual feedback for valid drop targets
    - Call moveNode on drop
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 5.6 Write unit tests for OutlineNode component
    - Test rendering with various node structures
    - Test edit mode activation and cancellation
    - Test action button interactions
    - Test collapse/expand behavior
    - _Requirements: 3.2, 4.1, 5.1, 6.1_

- [ ] 6. Implement OutlineView component
  - [x] 6.1 Create `client/src/components/editor/OutlineView.tsx`
    - Render outline toolbar with title
    - Render root-level OutlineNode components
    - Pass all event handlers to child nodes
    - Display empty state when no outline
    - _Requirements: 3.1, 6.5_

  - [x] 6.2 Implement "Generate Document" button
    - Add button to toolbar
    - Enable only when outline is valid and ready
    - Disable during generation
    - Call onGenerateDocument handler
    - _Requirements: 8.1, 13.4_

  - [x] 6.3 Implement loading and error states
    - Display loading indicator during generation
    - Display error messages when operations fail
    - Show progress indicator during streaming
    - _Requirements: 12.1, 13.1, 13.2_

  - [ ] 6.4 Write unit tests for OutlineView component
    - Test rendering with various outline structures
    - Test empty state display
    - Test button state management
    - Test loading and error states
    - _Requirements: 3.1, 6.5, 13.1, 13.4_

- [ ] 7. Integrate outline functionality into AIChatPanel
  - [x] 7.1 Add generation mode toggle to AIChatPanel
    - Add mode state (full | outline)
    - Implement toggle UI control
    - Persist mode selection in session
    - Default to "full" mode
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Integrate useOutline hook
    - Import and use useOutline hook
    - Connect outline state to UI
    - Handle outline generation in outline mode
    - Handle document generation from outline
    - _Requirements: 2.1, 8.1_

  - [x] 7.3 Implement conditional OutlineView rendering
    - Show OutlineView when outline exists
    - Hide chat interface when showing outline
    - Provide smooth transitions between states
    - _Requirements: 3.1_

  - [x] 7.4 Implement document generation from outline
    - Serialize outline to JSON
    - Call generate-from-outline API
    - Stream response into editor
    - Clear outline after successful generation
    - Preserve outline on failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

  - [ ] 7.5 Write property test for outline session isolation
    - **Property 14: Outline Session Isolation**
    - **Validates: Requirements 9.2, 9.3**

  - [ ] 7.6 Write integration tests for AIChatPanel
    - Test mode switching
    - Test outline generation flow
    - Test document generation flow
    - Test error handling
    - _Requirements: 1.1, 2.1, 8.1_

- [ ] 8. Checkpoint - Ensure frontend tests pass
  - Run all component tests
  - Verify UI interactions work correctly
  - Test outline generation and editing manually
  - Ask the user if questions arise

- [ ] 9. Implement backend API endpoints
  - [x] 9.1 Add POST /api/ai/generate-outline endpoint
    - Extract documentId and prompt from request body
    - Validate authentication token
    - Construct system prompt for outline generation
    - Call AI service with streaming
    - Stream thinking process and outline JSON back to client
    - Handle AI service errors
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

  - [ ] 9.2 Write property test for outline generation API contract
    - **Property 19: Outline Generation API Contract**
    - **Validates: Requirements 2.1, 2.2, 2.3, 10.2, 10.3, 10.4**

  - [ ] 9.3 Write unit tests for generate-outline endpoint
    - Test request validation
    - Test authentication enforcement
    - Test error responses
    - Test streaming behavior
    - _Requirements: 10.1, 10.2, 10.5, 10.7_

  - [x] 9.4 Add POST /api/ai/generate-from-outline endpoint
    - Extract documentId, outline, and originalPrompt from request body
    - Validate authentication token
    - Validate outline JSON structure
    - Serialize outline to readable format
    - Construct prompt with outline context
    - Call AI service with streaming
    - Stream generated content back to client
    - Handle AI service errors
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 9.5 Write property test for document generation API contract
    - **Property 20: Document Generation API Contract**
    - **Validates: Requirements 8.1, 8.3, 11.2, 11.3, 11.4, 11.5**

  - [ ] 9.6 Write unit tests for generate-from-outline endpoint
    - Test request validation
    - Test authentication enforcement
    - Test outline JSON validation
    - Test error responses
    - Test streaming behavior
    - _Requirements: 11.1, 11.2, 11.6, 11.7_

- [ ] 10. Implement AI service integration
  - [x] 10.1 Create outline generation prompt template
    - Design system prompt for outline generation
    - Include instructions for JSON format
    - Include instructions for thinking process
    - Test with various user prompts
    - _Requirements: 2.2, 2.3, 10.3_

  - [x] 10.2 Create document generation prompt template
    - Design system prompt for content generation
    - Include outline structure in prompt
    - Include original requirements
    - Ensure hierarchical structure in output
    - _Requirements: 8.5, 11.3_

  - [ ] 10.3 Implement error handling and retry logic
    - Handle AI service timeouts
    - Handle rate limiting
    - Implement exponential backoff
    - Return appropriate error codes
    - _Requirements: 10.5, 11.6_

  - [ ] 10.4 Write property test for authentication enforcement
    - **Property 21: Authentication Enforcement**
    - **Validates: Requirements 10.7**

  - [ ] 10.5 Write property test for error response codes
    - **Property 22: Error Response Codes**
    - **Validates: Requirements 10.5, 11.6**

- [ ] 11. Checkpoint - Ensure backend tests pass
  - Run all API endpoint tests
  - Test with real AI service (DeepSeek/Kimi)
  - Verify streaming works correctly
  - Verify error handling works
  - Ask the user if questions arise

- [ ] 12. Implement comprehensive error handling
  - [ ] 12.1 Add client-side error display
    - Display API errors in UI
    - Display parsing errors with details
    - Display network errors
    - Highlight validation errors
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 12.2 Add retry mechanisms
    - Add retry button for failed operations
    - Implement automatic retry with backoff
    - Add resume/restart for interrupted streams
    - _Requirements: 12.5, 12.6_

  - [ ] 12.3 Implement outline preservation on failure
    - Keep outline in state when generation fails
    - Allow editing after failure
    - Provide clear error messages
    - _Requirements: 8.7_

  - [ ] 12.4 Write property test for error display
    - **Property 23: Error Display on Failure**
    - **Validates: Requirements 12.1, 12.2, 12.3**

  - [ ] 12.5 Write property test for outline preservation
    - **Property 24: Outline Preservation on Generation Failure**
    - **Validates: Requirements 8.7**

  - [ ] 12.6 Write property test for retry availability
    - **Property 25: Retry Availability**
    - **Validates: Requirements 12.5, 12.6**

- [ ] 13. Implement UI state management
  - [ ] 13.1 Add loading indicators
    - Show loading during outline generation
    - Show progress during document generation
    - Update indicators based on operation state
    - _Requirements: 13.1, 13.2_

  - [ ] 13.2 Implement control disabling logic
    - Disable controls during active operations
    - Re-enable controls when operations complete
    - Disable generate button during unsaved edits
    - _Requirements: 13.3, 13.5, 13.6_

  - [ ] 13.3 Write property test for loading state
    - **Property 26: Loading State During Operations**
    - **Validates: Requirements 13.1, 13.2**

  - [ ] 13.4 Write property test for control disabling
    - **Property 27: Control Disabling During Operations**
    - **Validates: Requirements 13.5, 13.6**

  - [ ] 13.5 Write property test for generate button state
    - **Property 28: Generate Button State**
    - **Validates: Requirements 13.4**

- [ ] 14. Implement serialization and validation
  - [ ] 14.1 Add outline validation functions
    - Validate required properties exist
    - Validate level and order are non-negative integers
    - Validate children arrays recursively
    - Throw descriptive errors on validation failure
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 14.2 Add pre-send validation
    - Validate outline before API calls
    - Validate received data before rendering
    - _Requirements: 14.6, 14.7_

  - [ ] 14.3 Write property test for serialization round-trip
    - **Property 11: Outline Serialization Round-Trip**
    - **Validates: Requirements 2.4, 8.2**

  - [ ] 14.4 Write property test for invalid JSON rejection
    - **Property 12: Invalid JSON Rejection**
    - **Validates: Requirements 2.5, 11.7, 14.5**

  - [ ] 14.5 Write property test for recursive children validation
    - **Property 5: Recursive Children Validation**
    - **Validates: Requirements 14.4**

- [ ] 15. Implement content generation features
  - [ ] 15.1 Add hierarchical structure preservation
    - Map outline levels to markdown heading levels
    - Ensure generated content reflects hierarchy
    - Validate structure in generated output
    - _Requirements: 8.5_

  - [ ] 15.2 Add editor insertion logic
    - Insert generated content at cursor position
    - Maintain formatting and structure
    - Handle large content efficiently
    - _Requirements: 8.4_

  - [ ] 15.3 Add outline cleanup after success
    - Clear outline state after successful generation
    - Reset UI to default state
    - _Requirements: 8.6_

  - [ ] 15.4 Write property test for hierarchical structure preservation
    - **Property 29: Hierarchical Structure Preservation**
    - **Validates: Requirements 8.5**

  - [ ] 15.5 Write property test for outline cleanup
    - **Property 30: Outline Cleanup After Success**
    - **Validates: Requirements 8.6**

- [ ] 16. Final integration and testing
  - [ ] 16.1 Test complete outline generation flow
    - Test with various prompts
    - Verify outline structure is correct
    - Verify editing works smoothly
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 16.2 Test complete document generation flow
    - Test with various outline structures
    - Verify generated content matches outline
    - Verify content is inserted correctly
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 16.3 Test error scenarios
    - Test network failures
    - Test invalid JSON responses
    - Test AI service errors
    - Verify error messages are clear
    - Verify retry mechanisms work
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

  - [ ] 16.4 Test UI interactions
    - Test mode switching
    - Test all node operations (add, delete, move, edit)
    - Test collapse/expand
    - Test drag-and-drop
    - _Requirements: 1.1, 4.1, 5.1, 6.1, 7.1_

  - [ ] 16.5 Run full property test suite
    - Execute all 30 property tests
    - Verify 100+ iterations per test
    - Ensure all tests pass
    - Review any failures

- [ ] 17. Final checkpoint - Complete feature verification
  - Ensure all tests pass (unit and property)
  - Verify feature works end-to-end
  - Test with real AI services
  - Verify error handling is robust
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and allow for user feedback
- The implementation follows a bottom-up approach: data structures → utilities → components → integration
- All property tests should run with minimum 100 iterations
- Test tags should follow format: `Feature: ai-outline-generation, Property N: [property text]`
