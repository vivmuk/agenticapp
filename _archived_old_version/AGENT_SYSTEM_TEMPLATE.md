# Agentic Content Generation System Architecture Template

This document provides a comprehensive blueprint for building an advanced agentic system capable of orchestrating multiple AI agents to perform complex tasks with self-correction loops and human oversight. It is designed to be used as a context file for AI IDEs to replicate or extend this architecture.

## 1. System Overview

**Objective:** Create a robust, state-aware workflow where multiple specialized agents collaborate to generate high-quality content. The system includes:
- **Iterative Improvement:** Content is generated, critiqued, and refined in loops.
- **State Persistence:** All steps, intermediate outputs, and agent decisions are stored in a database.
- **Human-in-the-loop:** A dedicated review stage allows humans to intervene if quality thresholds aren't met or max cycles are reached.

## 2. Technology Stack

- **Language:** TypeScript (Node.js)
- **Database:** MongoDB (using Prisma ORM) — *Chosen for flexible schema with JSON support for variable agent outputs.*
- **AI Inference:** Venice API (or any OpenAI-compatible provider) for LLM and Image Generation.
- **Validation:** Zod (for structured output validation).

## 3. Architecture & Orchestration

The system follows a **Controller-Agent** pattern where a central `WorkflowManager` orchestrates the flow. It is NOT a chaotic multi-agent chat; it is a structured state machine.

### Orchestration Flow (The Loop)

1.  **Initialization**: `WorkflowManager` creates a `WorkflowRun` entry in the DB. Status: `INITIALIZING`.
2.  **Content Generation**:
    *   **Agent**: `ContentGeneratorAgent`
    *   **Input**: Topic, previous feedback (if any), previous content.
    *   **Output**: Structured JSON (Definition, LinkedIn Post, Image Prompt, Key Claims).
3.  **Web Search Critique**:
    *   **Agent**: `WebSearchCriticAgent`
    *   **Action**: Verifies `Key Claims` against live web results.
    *   **Output**: Accuracy Score, Verified/Disputed claims list.
4.  **Quality Critique**:
    *   **Agent**: `QualityCriticAgent`
    *   **Input**: Content + Accuracy Report.
    *   **Output**: Quality Score (0-100), Specific Improvement Suggestions.
5.  **Evaluation & Decision**:
    *   **Pass**: Score >= Threshold -> Status: `COMPLETED`.
    *   **Fail (Retry)**: Score < Threshold AND CurrentCycle < MaxCycles -> Increment Cycle -> Feed feedback back to Step 2.
    *   **Fail (Human Review)**: MaxCycles reached -> Status: `HUMAN_REVIEW`.

## 4. Database Design (Prisma)

**Why a Database?**
- **Resilience**: If the server crashes, the workflow state is saved. We can resume from the last successful step.
- **Auditability**: Every agent thought, input, and output is logged (`AgentResponse` table).
- **Versioning**: We keep every version of the content (`ContentVersion` table) to show evolution.

### Key Models

```prisma
// The master record for a single user request
model WorkflowRun {
  id                  String         @id @default(auto()) @map("_id") @db.ObjectId
  topic               String
  status              WorkflowStatus // INITIALIZING, RUNNING, HUMAN_REVIEW, COMPLETED...
  currentCycle        Int
  maxCycles           Int
  qualityThreshold    Float
  // ... timestamps & relations
}

// Stores the artifacts produced in each cycle
model ContentVersion {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  workflowRunId String   @db.ObjectId
  cycleNumber   Int
  content       Json     // The actual generated content structure
  imageUrl      String?
  // ...
}

// Logs for debugging and analysis
model AgentResponse {
  id            String    @id @default(auto()) @map("_id") @db.ObjectId
  agentType     AgentType // CONTENT_GENERATOR, CRITIC...
  input         Json?
  output        Json
  tokensUsed    Int?
  executionTime Int?
  // ...
}
```

## 5. Agent Implementation Details

All agents should extend a `BaseAgent` class to standardize logging, error handling, and LLM interaction.

### Base Agent Capabilities
- **`measureExecutionTime()`**: Wraps calls to track latency.
- **`logAgentExecution()`**: Saves inputs/outputs to the `AgentResponse` DB table.
- **`veniceClient`**: Wrapper around the AI provider API.

### Specific Agents

1.  **ContentGeneratorAgent**:
    -   **Context**: "You are a professional content creator..."
    -   **Schema**: Enforces `definition`, `linkedinPost`, `imagePrompt`, `keyClaims`.
    -   **Special**: Calls Image Generation API using the generated `imagePrompt`.

2.  **WebSearchCriticAgent**:
    -   **Context**: "You are a fact-checker..."
    -   **Tooling**: Web Search API (e.g., Tavily, Serper).
    -   **Logic**: extracting claims -> searching -> cross-referencing.

3.  **QualityCriticAgent**:
    -   **Context**: "You are a senior editor..."
    -   **Job**: Reviews tone, style, and structure. Aggregates the accuracy score from the Web Search agent into a final weighted score.

## 6. API Interface

The system exposes REST endpoints to trigger and monitor workflows.

-   `POST /api/workflow/start`: Accepts `{ topic, qualityThreshold }`. Returns `{ workflowId }`. This initiates the async process.
-   `GET /api/workflow/:id`: Polls the status. Returns full state including current content and agent activities.
-   `POST /api/workflow/:id/human-review`: Accepts `{ action: 'APPROVE' | 'REJECT', feedback: '...' }`. Resumes the workflow if rejected/improved.

## 7. Instructions for AI Replication

To build a system like this, follow these steps in order:

### Phase 1: Foundation
1.  **Initialize Project**: TypeScript, Node.js, `npm install @prisma/client zod`.
2.  **Setup Database**: Create `schema.prisma` with `WorkflowRun`, `ContentVersion`, and `AgentResponse`. Run `prisma generate`.
3.  **Create API Client**: detailed wrapper for your AI provider (e.g., `VeniceAPIClient`) handling retries and JSON parsing.

### Phase 2: Core Logic
1.  **Base Agent**: Create the abstract class that handles DB logging.
2.  **Workflow Manager**: Implement the state machine.
    -   *Critical*: Ensure `executeWorkflowCycle` is recursive or loop-based but async-safe.
    -   *Critical*: Save state to DB *before* and *after* every major step.

### Phase 3: Agents
1.  **Implement Generators**: Focus on structured prompts (system prompt + user prompt + JSON schema).
2.  **Implement Critics**: Ensure they output scores that the Manager can parse numerically to make decisions.

### Phase 4: API & Frontend
1.  **REST API**: Expose the manager methods.
2.  **Frontend**: Build a polling UI that visualizes the `WorkflowStatus` and `AgentStatus` so the user sees "Thinking..." vs "Searching...".

---
*Created by Antigravity Agent - 2025*
