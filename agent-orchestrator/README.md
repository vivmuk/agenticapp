
# Agentic Orchestrator (Bare Metal)

This is a lightweight, "bare metal" agentic application built with Next.js and Vercel AI SDK.
It orchestrates a team of agents to create high-quality LinkedIn posts.

## Architecture

- **Orchestration**: Custom loop in `src/app/api/orchestrate/route.ts`.
- **Agents**: Defined in `src/lib/agents.ts` as pure async functions.
- **UI**: Streaming UI in `src/app/page.tsx`.

## Setup

1. Create a `.env.local` file in this directory:
   ```bash
   VENICE_API_KEY=your_venice_api_key_here
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

## Agents

1. **Planner**: Breaks down the topic into a strategy.
2. **Researcher**: Simulates gathering key insights (can be connected to real search).
3. **Draft Writer**: Writes the initial post based on plan and research.
4. **Critic**: Scores the draft and provides feedback.
5. **Finalizer**: Polishes the post based on critique.
