# Venice Agent Orchestrator - Replication Guide

This document serves as a complete blueprint to replicate the "Venice Agent Swarm" project. It contains the architecture, agent definitions, prompts, and code structures necessary to rebuild the application from scratch.

## 1. Project Overview
**Name:** Agent Orchestrator
**Purpose:** A Next.js application that orchestrates a swarm of AI agents to research, draft, critique, and finalize viral social media content (LinkedIn), complete with a retro-futuristic watercolor image.
**Key Features:**
*   **Dual Research:** Parallel research using `grok-41-fast` (Deep Research) and `qwen3-4b` (Cross-Verification).
*   **Iterative Drafting:** A Self-Reflecting Writer/Critic loop that iterates up to 3 times to maximize quality.
*   **Visualizer Agent:** A specialized prompt engineering agent (`grok-41-fast`) that designs 1950s Retro-Futuristic image prompts for the image generator (`qwen-image`).
*   **Streaming UI:** Real-time visibility into every step of the agent swarm via Server-Sent Events (SSE).

## 2. Technology Stack
*   **Framework:** Next.js 15+ (App Router)
*   **Styling:** Tailwind CSS, Lucide React (Icons), Framer Motion (Animations)
*   **Language:** TypeScript
*   **AI Provider:** Venice.ai API (Open-source inference)
*   **Models:**
    *   `grok-41-fast`: Planner, Researcher A, Writer, Critic, Finalizer, Image Prompt Engineer.
    *   `qwen3-4b`: Researcher B (Verification).
    *   `qwen-image`: Image Generation.

## 3. Environment Setup

**Required Environment Variables (`.env.local`):**
```env
VENICE_API_KEY=your_venice_api_key_here
```

**Project Initialization:**
```bash
npx create-next-app@latest agent-orchestrator
cd agent-orchestrator
npm install lucide-react framer-motion clsx tailwind-merge react-markdown
```

## 4. Core Components

### A. Venice API Client (`src/lib/venice.ts`)
This client handles chat completions and image generation.

```typescript
const VENICE_API_KEY = process.env.VENICE_API_KEY;
const BASE_URL = 'https://api.venice.ai/api/v1';

// ... (Standard fetch wrapper for /chat/completions and /image/generate)
// Key interfaces: VeniceChatRequest, VeniceImageRequest
```

### B. Agent Definitions (`src/lib/agents.ts`)
This file defines the "Swarm".

**1. Planner (Model: `qwen3-4b`)**
*   **Role:** Expert Content Strategy Planner.
*   **Goal:** Create a step-by-step plan (Hook, Body, CTA) for the topic.

**2. Researcher A (Model: `grok-41-fast`)**
*   **Role:** Research Assistant.
*   **Goal:** Deep research, facts, stats, counter-intuitive insights.
*   **Param:** `enable_web_search: 'auto'`.

**3. Researcher B (Model: `qwen3-4b`)**
*   **Role:** Research Assistant (Verification).
*   **Goal:** Cross-verify via web search, find diverse perspectives.

**4. Writer (Model: `grok-41-fast`)**
*   **Role:** Viral LinkedIn Ghostwriter and Savvy Journalist.
*   **Constraints:** No em-dashes (-), use hyphens/commas. High impact, short sentences.
*   **Input:** Receives combined research + History of previous drafts/critiques.

**5. Critic (Model: `grok-41-fast`)**
*   **Role:** Brutal Senior Editor.
*   **Goal:** Rate 1-10 on Hook, Readability, Viral Potential. Return JSON scores + critique + suggestions.

**6. Finalizer (Model: `grok-41-fast`)**
*   **Role:** Lead Writer.
*   **Goal:** Polish final draft.
*   **Nuance:** Capture a "Type 2 thinking" line towards the end.
*   **Formatting:** Ensure clean Markdown links.

**7. Visualizer (Model: `grok-41-fast` -> `qwen-image`)**
*   **Step 1:** Generate Prompt. Converts post text into a strict "1950s Retro Futurism" prompt structure (Work Surface, Layout, Style, Components).
*   **Step 2:** Generate Image. Uses the generated prompt with `qwen-image`.

### C. Orchestration Logic (`src/app/api/orchestrate/route.ts`)
This API route manages the workflow state and streams updates to the UI.

**Flow:**
1.  **Planning:** Call `planPost(topic)`.
2.  **Dual Research:** Run `researchTopicStream` AND `researchTopicStreamQwen` sequentially (or parallel). Combine results.
3.  **Drafting Loop (Avg 3 Rounds):**
    *   For `i` from 0 to 2:
        *   **Writer:** Generates draft `i` (seeing drafts `0..i-1` context).
        *   **Critic:** Scores draft `i`.
        *   Store result in history.
4.  **Selection:** Sort history by Score. Pick `BestDraft`.
5.  **Finalization:** Send `BestDraft` + Suggestions to Finalizer.
6.  **Visualization:** Generate image based on Final Text.
7.  **Complete:** Stream final payload.

### D. Frontend (`src/app/page.tsx`)
*   **State:** Uses `AgentStepData` to track `One`, `Two`, `Two_B`, `Three/Rev`, `Four/Rev`, `Five`, `Six`.
*   **UI:** 3-Column or Split view.
    *   **Agent Cards:** Collapsible cards showing "Running", "Completed", or "Failed" status.
    *   **Live Logs:** Raw "Neural Stream" of thoughts.
    *   **Final Output:** Markdown rendered result (using `react-markdown`) + Image.

## 5. Key Prompts (Reference)

**Image Prompt Engineering (System):**
> "You are an Expert Art Director specializing in Retro Futurism."

**Image Prompt Structure (User):**
> "Create a 'Retro Futurism 1950s style' image prompt using this EXACT structure:
> **WORK SURFACE:** ...
> **LAYOUT:** ...
> **COMPONENTS:** ...
> **STYLE:** 1950s retro-futurism aesthetic. Atomic age optimism. Pastel colors."

**Writer System Prompt:**
> "You are a Viral LinkedIn Ghostwriter and Savvy Journalist."
> "Constraint: Do NOT use em-dashes (—). Use hyphens or commas instead."

## 6. Deployment Instructions (Railway)
1.  Push code to GitHub.
2.  Link GitHub repo to Railway.
3.  Set Root Directory to `/agent-orchestrator`.
4.  Add `VENICE_API_KEY` variable.
5.  Deploy.
