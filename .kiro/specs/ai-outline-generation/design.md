# Design Document: AI Outline Generation

## Overview

The AI Outline Generation feature introduces a two-stage document creation workflow: outline generation followed by content generation. This design provides users with greater control over document structure before committing to full content generation.

The system consists of three main components:
1. **Mode Selection UI**: Toggle between full and outline-based generation
2. **Outline Management**: Generate, display, edit, and manipulate outline structures
3. **Content Generation**: Generate complete documents based on edited outlines

The implementation follows a frontend-first approach with temporary storage, avoiding backend persistence for simplicity and rapid development.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        AIChatPanel                          │
│  ┌──────────────┐  ┌─────────────────────────────────┐    │
│  │ Mode Toggle  │  │      Chat Interface             │    │
│  └──────────────┘  └─────────────────────────────────┘    │
│                     ┌─────────────────────────────────┐    │
│                     │      OutlineView                │    │
│                     │  ┌────────────────────────┐    │    │
│                     │  │   OutlineNode (Tree)   │    │    │
│                     │  └────────────────────────┘    │    │
│                     │  [Generate Document Button]    │    │
│                     └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   useOutline     │
                    │   (State Mgmt)   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   API Routes     │
                    │  /generate-      │
                    │   outline        │
                    │  /generate-from- │
                    │   outline        │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   AI Service     │
                    │  (DeepSeek/Kimi) │
                    └──────────────────┘
```

### Data Flow

**Outline Generation Flow:**
```
User Input → AIChatPanel → POST /api/ai/generate-outline
→ AI Service (with outline prompt) → Stream Response
→ Parse JSON → Update State → Render OutlineView
```

**Document Generation Flow:**
```
Edited Outline → Serialize to JSON → POST /api/ai/generate-from-outline
→ AI Service (with outline context) → Stream Response
→ Insert into Editor → Clear Outline State
```

### Component Hierarchy

```
AIChatPanel
├── GenerationModeToggle
├── ChatMessages
└── OutlineView (conditional)
    ├── OutlineToolbar
    │   └── GenerateDocumentButton
    └── OutlineNode (recursive)
        ├── NodeTitle (editable)
        ├── NodeDescription
        ├── NodeActions
        │   ├── AddSiblingButton
        │   ├── AddChildButton
        │   └── DeleteButton
        ├── DragHandle
        └── Children (OutlineNode[])
```

## Components and Interfaces

### Type Definitions

```typescript
// client/src/types/outline.ts

/**
 * Represents a single node in the outline tree
 */
export interface OutlineNode {
  /** Unique identifier for the node */
  id: string;
  
  /** Section title */
  title: string;
  
  /** Optional description or summary */
  description?: string;
  
  /** Hierarchical level (0 = top level) */
  level: number;
  
  /** Child nodes */
  children?: OutlineNode[];
  
  /** Order within siblings */
  order: number;
  
  /** UI state: whether node is collapsed */
  isCollapsed?: boolean;
}

/**
 * Complete outline structure
 */
export interface Outline {
  /** Unique identifier for the outline */
  id: string;
  
  /** Associated document ID */
  documentId: number;
  
  /** Outline title */
  title: string;
  
  /** Root-level nodes */
  nodes: OutlineNode[];
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Generation mode type
 */
export type GenerationMode = 'full' | 'outline';

/**
 * Outline generation request
 */
export interface OutlineGenerationRequest {
  documentId: number;
  prompt: string;
  mode?: 'outline';
}

/**
 * Document generation from outline request
 */
export interface DocumentFromOutlineRequest {
  documentId: number;
  outline: OutlineNode[];
  originalPrompt: string;
}

/**
 * Outline operation types
 */
export type OutlineOperation = 
  | { type: 'add-sibling'; nodeId: string }
  | { type: 'add-child'; nodeId: string }
  | { type: 'delete'; nodeId: string }
  | { type: 'update-title'; nodeId: string; title: string }
  | { type: 'move'; nodeId: string; targetId: string; position: 'before' | 'after' | 'child' }
  | { type: 'toggle-collapse'; nodeId: string };
```

### Hook: useOutline

```typescript
// client/src/hooks/useOutline.ts

interface UseOutlineReturn {
  // State
  outline: OutlineNode[] | null;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  generateOutline: (prompt: string, documentId: number) => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<OutlineNode>) => void;
  addSibling: (nodeId: string) => void;
  addChild: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void;
  toggleCollapse: (nodeId: string) => void;
  clearOutline: () => void;
  
  // Utilities
  findNode: (nodeId: string) => OutlineNode | null;
  serializeOutline: () => string;
}

export function useOutline(): UseOutlineReturn;
```

**Key Responsibilities:**
- Manage outline state in React
- Provide CRUD operations for outline nodes
- Handle outline generation API calls
- Serialize outline for document generation
- Maintain tree structure integrity

**Implementation Notes:**
- Use `useState` for outline storage (temporary, session-only)
- Implement tree traversal for find/update operations
- Generate unique IDs using `crypto.randomUUID()` or similar
- Validate operations before applying (e.g., prevent circular moves)

### Component: OutlineView

```typescript
// client/src/components/editor/OutlineView.tsx

interface OutlineViewProps {
  outline: OutlineNode[];
  onGenerateDocument: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<OutlineNode>) => void;
  onAddSibling: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void;
  onToggleCollapse: (nodeId: string) => void;
  isGenerating?: boolean;
}

export function OutlineView(props: OutlineViewProps): JSX.Element;
```

**Key Responsibilities:**
- Render the complete outline tree
- Provide toolbar with "Generate Document" button
- Coordinate drag-and-drop operations
- Display loading states during generation

**UI Structure:**
```
┌─────────────────────────────────────────┐
│ Outline                                 │
│ ┌─────────────────────────────────────┐ │
│ │ [Generate Document from Outline]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ├─ 1. Introduction                     │
│ │  └─ 1.1 Background                   │
│ ├─ 2. Main Content                     │
│ │  ├─ 2.1 Section A                    │
│ │  └─ 2.2 Section B                    │
│ └─ 3. Conclusion                        │
└─────────────────────────────────────────┘
```

### Component: OutlineNode

```typescript
// client/src/components/editor/OutlineNode.tsx

interface OutlineNodeProps {
  node: OutlineNode;
  onUpdate: (nodeId: string, updates: Partial<OutlineNode>) => void;
  onAddSibling: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: 'before' | 'after' | 'child') => void;
  onToggleCollapse: (nodeId: string) => void;
  depth?: number;
}

export function OutlineNode(props: OutlineNodeProps): JSX.Element;
```

**Key Responsibilities:**
- Render a single outline node
- Handle inline title editing
- Provide action buttons (add, delete)
- Support drag-and-drop
- Recursively render children
- Show collapse/expand controls

**UI Structure:**
```
┌─────────────────────────────────────────┐
│ [≡] [▼] 1. Introduction        [+][×]  │
│     └─ Background information           │
│     ┌───────────────────────────────┐   │
│     │ [≡] 1.1 Background    [+][×] │   │
│     │     └─ Historical context     │   │
│     └───────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### API Endpoints

#### POST /api/ai/generate-outline

**Request:**
```typescript
{
  documentId: number;
  prompt: string;
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"type": "thinking", "content": "Analyzing requirements..."}
data: {"type": "thinking", "content": "Structuring outline..."}
data: {"type": "outline", "content": "{\"nodes\": [...]}"}
data: {"type": "done"}
```

**Implementation:**
- Extract prompt and documentId from request body
- Construct system prompt for outline generation
- Call AI service with streaming enabled
- Parse AI response and identify outline JSON
- Stream back thinking process and outline data
- Handle errors and timeouts

**System Prompt Template:**
```
You are helping create a document outline. Based on the user's requirements, generate a hierarchical outline structure.

Requirements: {user_prompt}

Output format:
1. First, show your thinking process
2. Then output a JSON structure with this format:
{
  "nodes": [
    {
      "title": "Section Title",
      "description": "Brief description",
      "level": 0,
      "order": 0,
      "children": [...]
    }
  ]
}

Make the outline comprehensive but not too detailed. Focus on main sections and key subsections.
```

#### POST /api/ai/generate-from-outline

**Request:**
```typescript
{
  documentId: number;
  outline: OutlineNode[];
  originalPrompt: string;
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"type": "content", "content": "# Introduction\n\n"}
data: {"type": "content", "content": "This document covers..."}
data: {"type": "done"}
```

**Implementation:**
- Extract outline, documentId, and originalPrompt from request body
- Serialize outline to readable format
- Construct prompt with outline structure
- Call AI service with streaming enabled
- Stream generated content back to client
- Handle errors and timeouts

**System Prompt Template:**
```
You are helping generate a document based on an outline structure.

Original requirements: {original_prompt}

Outline structure:
{serialized_outline}

Generate complete, well-written content for each section in the outline. Maintain the hierarchical structure using appropriate markdown headings. Write comprehensive content for each section.
```

## Data Models

### Outline Tree Structure

The outline uses a tree data structure where each node can have multiple children:

```
Root (Outline)
├── Node 1 (level: 0, order: 0)
│   ├── Node 1.1 (level: 1, order: 0)
│   └── Node 1.2 (level: 1, order: 1)
├── Node 2 (level: 0, order: 1)
│   ├── Node 2.1 (level: 1, order: 0)
│   │   └── Node 2.1.1 (level: 2, order: 0)
│   └── Node 2.2 (level: 1, order: 1)
└── Node 3 (level: 0, order: 2)
```

**Invariants:**
- Each node has a unique ID
- Level values increase by 1 for each depth level
- Order values are sequential within siblings (0, 1, 2, ...)
- Parent nodes always have level < child level
- Children array is optional (leaf nodes have no children)

### State Management

**Component State (AIChatPanel):**
```typescript
{
  generationMode: 'full' | 'outline',
  currentOutline: OutlineNode[] | null,
  isGeneratingOutline: boolean,
  isGeneratingDocument: boolean,
  outlineError: string | null
}
```

**Hook State (useOutline):**
```typescript
{
  outline: OutlineNode[] | null,
  isGenerating: boolean,
  error: string | null
}
```

### Serialization Format

When sending outline to backend for document generation:

```json
{
  "nodes": [
    {
      "id": "uuid-1",
      "title": "Introduction",
      "description": "Overview of the topic",
      "level": 0,
      "order": 0,
      "children": [
        {
          "id": "uuid-2",
          "title": "Background",
          "description": "Historical context",
          "level": 1,
          "order": 0
        }
      ]
    }
  ]
}
```

For display in AI prompt, convert to readable format:
```
1. Introduction
   Overview of the topic
   1.1 Background
       Historical context
2. Main Content
   ...
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **UI State Properties**: Many properties about loading indicators, button states, and control enabling/disabling can be combined into comprehensive state management properties
2. **Validation Properties**: Multiple validation criteria (14.1-14.7) can be consolidated into fewer comprehensive validation properties
3. **Error Handling**: Properties 12.1-12.6 about error display can be combined into general error handling properties
4. **Tree Manipulation**: Properties about adding, deleting, and moving nodes share common invariants that can be tested together
5. **API Streaming**: Properties 10.4, 11.5, 8.3 about streaming are redundant and can be combined

The following properties represent the unique, non-redundant validation requirements:

### Core Data Structure Properties

**Property 1: Outline Node Structure Validity**

*For any* OutlineNode in the system, it must have all required properties (id, title, level, order) where id is a non-empty string, title is a non-empty string, level is a non-negative integer, and order is a non-negative integer.

**Validates: Requirements 2.6, 14.1, 14.2, 14.3**

**Property 2: Unique Node IDs**

*For any* outline tree, all node IDs must be unique across the entire tree structure including all descendants.

**Validates: Requirements 2.7, 5.5**

**Property 3: Hierarchical Level Consistency**

*For any* parent-child relationship in the outline tree, the child's level must equal the parent's level plus one.

**Validates: Requirements 5.4, 7.6**

**Property 4: Sequential Sibling Ordering**

*For any* set of sibling nodes (nodes sharing the same parent), their order values must be sequential starting from 0 (i.e., 0, 1, 2, ..., n-1 for n siblings).

**Validates: Requirements 2.8, 6.4, 7.7**

**Property 5: Recursive Children Validation**

*For any* OutlineNode with a children array, all elements in the children array must be valid OutlineNode objects satisfying Properties 1-4 recursively.

**Validates: Requirements 14.4**

### Tree Manipulation Properties

**Property 6: Sibling Addition Preserves Structure**

*For any* outline tree and any node in that tree, adding a sibling node results in a tree where: (1) the new node has the same level as the target node, (2) the new node's order is one greater than the target node's order, (3) all subsequent siblings have their order incremented by one, and (4) all other tree invariants are preserved.

**Validates: Requirements 5.2, 5.4, 5.6**

**Property 7: Child Addition Preserves Structure**

*For any* outline tree and any node in that tree, adding a child node results in a tree where: (1) the new node has level equal to parent level plus one, (2) the new node has order 0, (3) any existing children have their order incremented by one, and (4) all other tree invariants are preserved.

**Validates: Requirements 5.3, 5.4, 5.6**

**Property 8: Node Deletion Preserves Structure**

*For any* outline tree and any node in that tree, deleting the node results in a tree where: (1) the node and all its descendants are removed, (2) remaining siblings have sequential order values, and (3) all other tree invariants are preserved.

**Validates: Requirements 6.2, 6.4**

**Property 9: Node Move Preserves Structure**

*For any* outline tree and any valid move operation (node to target position), the resulting tree maintains all structural invariants: unique IDs, correct level values for moved node and descendants, sequential ordering within all affected sibling groups, and no circular references.

**Validates: Requirements 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**

**Property 10: Circular Move Prevention**

*For any* outline tree, attempting to move a node into its own descendants must be rejected and leave the tree unchanged.

**Validates: Requirements 7.8**

### Serialization and Parsing Properties

**Property 11: Outline Serialization Round-Trip**

*For any* valid outline tree structure, serializing to JSON and then parsing back must produce an equivalent tree structure with the same node IDs, titles, descriptions, levels, orders, and hierarchical relationships.

**Validates: Requirements 2.4, 8.2**

**Property 12: Invalid JSON Rejection**

*For any* string that is not valid JSON or does not match the OutlineNode schema, parsing must fail with a descriptive error and not produce a tree structure.

**Validates: Requirements 2.5, 11.7, 14.5**

### State Management Properties

**Property 13: Mode Selection Persistence**

*For any* generation mode selection during a session, the selected mode must remain active until explicitly changed by the user or the session ends.

**Validates: Requirements 1.3**

**Property 14: Outline Session Isolation**

*For any* outline created in a session, it must not persist across document switches, component unmounts, or page refreshes.

**Validates: Requirements 9.2, 9.3**

**Property 15: Edit State Preservation**

*For any* node's collapse/expand state, it must remain unchanged during any editing operation (add, delete, move, title update) on any node in the tree.

**Validates: Requirements 3.8**

### UI Interaction Properties

**Property 16: Title Edit Cancellation Rollback**

*For any* node title being edited, if the edit is cancelled, the title must revert to its value before editing began.

**Validates: Requirements 4.4**

**Property 17: Empty Title Rejection**

*For any* title edit operation, attempting to save an empty or whitespace-only title must be rejected, display a validation message, and preserve the previous title value.

**Validates: Requirements 4.5, 4.6**

**Property 18: Collapse/Expand Toggle**

*For any* node with children, toggling collapse must hide all children, and toggling expand must show all children, with the state persisting until toggled again.

**Validates: Requirements 3.6, 3.7**

### API and Streaming Properties

**Property 19: Outline Generation API Contract**

*For any* outline generation request with valid documentId and prompt, the API must return a streaming response containing thinking process messages followed by valid outline JSON.

**Validates: Requirements 2.1, 2.2, 2.3, 10.2, 10.3, 10.4**

**Property 20: Document Generation API Contract**

*For any* document generation request with valid documentId, outline, and originalPrompt, the API must return a streaming response containing markdown content that reflects the outline structure.

**Validates: Requirements 8.1, 8.3, 11.2, 11.3, 11.4, 11.5**

**Property 21: Authentication Enforcement**

*For any* API request without a valid authentication token, the system must reject the request with an appropriate error status code before processing.

**Validates: Requirements 10.7**

**Property 22: Error Response Codes**

*For any* API request that fails due to AI service errors, the system must return an appropriate HTTP error status code (5xx for server errors, 4xx for client errors).

**Validates: Requirements 10.5, 11.6**

### Error Handling Properties

**Property 23: Error Display on Failure**

*For any* operation that fails (API request, parsing, validation, network), the system must display a user-friendly error message describing the failure.

**Validates: Requirements 12.1, 12.2, 12.3**

**Property 24: Outline Preservation on Generation Failure**

*For any* document generation attempt that fails, the outline must remain in state unchanged and available for retry.

**Validates: Requirements 8.7**

**Property 25: Retry Availability**

*For any* failed operation, the system must provide a mechanism to retry the operation.

**Validates: Requirements 12.5, 12.6**

### UI State Management Properties

**Property 26: Loading State During Operations**

*For any* asynchronous operation (outline generation, document generation), the system must display appropriate loading/progress indicators while the operation is in progress and remove them when complete.

**Validates: Requirements 13.1, 13.2**

**Property 27: Control Disabling During Operations**

*For any* active asynchronous operation, the system must disable relevant controls to prevent concurrent conflicting operations, and re-enable them when the operation completes.

**Validates: Requirements 13.5, 13.6**

**Property 28: Generate Button State**

*For any* outline state, the "Generate Document" button must be enabled if and only if the outline is valid and no generation is in progress.

**Validates: Requirements 13.4**

### Content Generation Properties

**Property 29: Hierarchical Structure Preservation**

*For any* outline structure used for document generation, the generated markdown content must reflect the hierarchical structure using appropriate heading levels (# for level 0, ## for level 1, etc.).

**Validates: Requirements 8.5**

**Property 30: Outline Cleanup After Success**

*For any* successful document generation, the outline must be cleared from state immediately after the content is inserted into the editor.

**Validates: Requirements 8.6**

## Error Handling

### Client-Side Error Handling

**Validation Errors:**
- Empty titles: Display inline validation message, prevent save
- Invalid node structure: Display error modal with details, prevent operation
- Circular move attempts: Display warning message, prevent operation
- Missing required fields: Display field-level errors, prevent save

**Network Errors:**
- Connection timeout: Display retry dialog with timeout message
- Connection refused: Display offline indicator, queue operation for retry
- Slow connection: Display progress indicator, allow cancellation

**Parsing Errors:**
- Invalid JSON: Display error with JSON position, offer to retry generation
- Schema mismatch: Display error with missing/invalid fields, offer to retry
- Incomplete stream: Display partial data warning, offer to retry

### Server-Side Error Handling

**Request Validation:**
- Missing parameters: Return 400 Bad Request with field details
- Invalid authentication: Return 401 Unauthorized
- Invalid JSON: Return 400 Bad Request with parsing error

**AI Service Errors:**
- Service unavailable: Return 503 Service Unavailable, implement retry logic
- Timeout: Return 504 Gateway Timeout, allow client retry
- Rate limiting: Return 429 Too Many Requests with retry-after header
- Invalid response: Return 502 Bad Gateway, log error details

**Stream Handling:**
- Connection interruption: Close stream gracefully, return partial data
- Client disconnect: Abort AI request, clean up resources
- Buffer overflow: Implement backpressure, slow down AI requests

### Error Recovery Strategies

**Automatic Recovery:**
- Retry failed API requests up to 3 times with exponential backoff
- Reconnect interrupted streams automatically
- Preserve outline state across all errors

**User-Initiated Recovery:**
- Provide "Retry" button for all failed operations
- Allow editing outline after generation failure
- Offer "Start Over" option to clear state and begin fresh

**Graceful Degradation:**
- If streaming fails, fall back to non-streaming request
- If outline generation fails, allow manual outline creation
- If validation fails, allow saving with warnings

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific UI interactions (button clicks, mode toggles)
- Edge cases (empty outlines, single-node trees)
- Error conditions (network failures, invalid JSON)
- Integration points (API calls, editor insertion)

**Property-Based Tests** focus on:
- Universal tree structure invariants
- All possible tree manipulation operations
- Serialization round-trips
- State management across operations

### Property-Based Testing Configuration

**Library Selection:**
- **TypeScript/JavaScript**: Use `fast-check` library
- **Backend (Node.js)**: Use `fast-check` for API testing

**Test Configuration:**
- Minimum 100 iterations per property test
- Use custom generators for OutlineNode structures
- Tag each test with feature name and property number

**Example Test Tag:**
```typescript
// Feature: ai-outline-generation, Property 1: Outline Node Structure Validity
```

### Test Generators

**Custom Generators Needed:**

```typescript
// Generate valid OutlineNode
const arbOutlineNode = (maxDepth: number = 3): fc.Arbitrary<OutlineNode> => {
  // Recursive generator with depth limit
}

// Generate valid outline tree
const arbOutlineTree = (): fc.Arbitrary<OutlineNode[]> => {
  // Generate array of root-level nodes
}

// Generate tree manipulation operations
const arbTreeOperation = (): fc.Arbitrary<OutlineOperation> => {
  // Generate add/delete/move operations
}

// Generate invalid JSON strings
const arbInvalidJSON = (): fc.Arbitrary<string> => {
  // Generate malformed JSON
}
```

### Unit Test Coverage

**Component Tests:**
- OutlineView rendering with various tree structures
- OutlineNode recursive rendering
- Mode toggle interaction
- Button state changes
- Error message display

**Hook Tests:**
- useOutline state management
- CRUD operations on outline
- Tree traversal functions
- Serialization functions

**API Tests:**
- Endpoint availability
- Request/response format
- Authentication checks
- Error status codes
- Streaming behavior

**Integration Tests:**
- End-to-end outline generation flow
- End-to-end document generation flow
- Error recovery flows
- State persistence across operations

### Property Test Coverage

Each correctness property (1-30) must have a corresponding property-based test:

- Properties 1-5: Data structure validation
- Properties 6-10: Tree manipulation operations
- Properties 11-12: Serialization and parsing
- Properties 13-15: State management
- Properties 16-18: UI interactions
- Properties 19-22: API contracts
- Properties 23-25: Error handling
- Properties 26-28: UI state management
- Properties 29-30: Content generation

### Test Execution

**Development:**
```bash
npm test -- --watch
```

**CI/CD:**
```bash
npm test -- --coverage --ci
```

**Property Tests:**
```bash
npm test -- --testNamePattern="Property"
```

### Success Criteria

- All unit tests pass
- All property tests pass (100 iterations each)
- Code coverage > 80% for new code
- No regression in existing tests
- Manual testing of UI interactions successful
