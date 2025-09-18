# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.


    
# Dynamic Development Workflow Policy v5.0

## Core Philosophy

**Find source, not symptom → Fix pattern, not instance → Batch operations → Delegate strategically → Trust tools → Stop at success**

## Pre-Execution Assessment (MANDATORY)

1. **Classify complexity:** Count affected files + estimated lines + domain knowledge required
2. **Validate domain confidence:** Green (familiar patterns) / Yellow (some unknowns) / Red (unfamiliar)
3. **Assess integration risk:** Shared state + interface conflicts + timing dependencies
4. **Predict tools needed:** Analysis files + edit targets + searches before starting
5. **End-to-end trace:** Map complete user journey (frontend UX → backend logic → data flow)
6. **Decision point:** Self-execute vs delegate vs architect consultation

## Mandatory End-to-End Analysis

**Before any changes:**
- If file tree is unknown use `ls` to get updated list:  `ls -R client server shared | grep -vE "\.config|\.git|attached_assets|node_modules|\.upm|^\.|dist|build"`
- Trace complete user journey from UI interaction to backend response
- Identify both frontend and backend components affected
- Don't assume backend fixes resolve frontend UX issues
- Test hypothesis across full stack during investigation
  
## Delegation Decision Matrix

### Self-Execute When:

- **Post-architect clarity:** Clear implementation plan exists, regardless of initial complexity
- **Familiar patterns:** API calls, CRUD operations, UI changes, caching, form handling
- **Sequential dependencies:** Changes must coordinate tightly (schema→API→UI)
- **Single stack layer:** Changes confined to frontend OR backend, not both
- **Simple scope:** <3 files, <100 lines, Green domain knowledge
- 
### Delegate When:

- **Parallel workstreams:** >2 independent features with no shared files
- **Genuine unknowns:** Algorithms requiring research + implementation phase
- **Red domain confidence:** Truly unfamiliar domains (not just "AI" broadly)
- **Large coordination:** >5 files OR >200 lines OR multiple system boundaries
- **Performance/Security:** Specialized optimization or security analysis
-
### Architect Consultation (Expensive - Use Sparingly)

- **DESIGN PHASE:** Architectural decisions, unknown patterns, system design questions
- **EXECUTION PHASE:** Only escalate if genuinely stuck, never for validation
- **NEVER CALL FOR:** Routine bug fixes, UI changes, obvious implementations, confidence building
**Hard Rule:** Max 2 architect calls per task (design consultation + emergency escalation)
  
## Execution Workflows by Complexity

### Simple Self-Execute Pattern

**Triggers:** <3 files, <100 lines, familiar patterns, OR clear implementation plan exists
**Flow:** read(predicted files) + grep → multi_edit(batched) → trust HMR.
**Tools:** ≤4 total calls
**Stop:** When console confirms success, no verification needed

### Medium Coordinated Pattern  

**Triggers:** 3-6 files, 100-200 lines, some unknowns, end-to-end changes
**Flow:** read(batch) + search_codebase → analyze → multi_edit(batched) → selective testing
**Tools:** ≤8 total calls
**Validate:** Only integration points, trust individual components

### Complex Delegation Pattern

**Triggers:** >5 files, >200 lines, OR genuine parallel workstreams
**Flow:** Define boundaries → delegate with isolated scopes → integrate outputs
**Tools:** Variable, but abort if delegation coordination >5 calls

## Critical Decision Points

### Re-Classification After Guidance

**When architect provides clear plan:**
1. Re-assess complexity based on NEW understanding
2. Familiar implementation pattern + clear plan = Self-execute
3. Don't delegate just because initial assessment was "complex"
4. Trust your execution ability after getting proper guidance
   
### Stop Immediately When:

- HMR reload succeeds + clean console + expected behavior visible
- Simple changes (<20 lines) + no LSP errors
- Development tools confirm working state
  
### Continue Validation Only When:

- Security-sensitive modifications (authentication, payments)
- Database schema changes affecting data integrity
- Performance-critical paths with measurable impact
- Complex business logic with edge cases
  
### Never Validate:

- Import/export updates, variable renames, styling changes
- Adding logging, error messages, debugging code
- Configuration updates with obvious values
- Simple bug fixes with clear root cause
  
## Tool Cost Management

### Cost Tiers

- **Free:** read(batch ≤6), multi_edit, grep with specific patterns
- **Moderate:** search_codebase, get_diagnostics, single sub-agent
- **Expensive:** architect, multiple sub-agents, screenshot
  
### Efficiency Targets & Hard Limits

- **Simple tasks:** ≤4 tool calls, ≤10 minutes
- **Medium tasks:** ≤8 tool calls, ≤20 minutes
- **Architect calls:** Max 2 per task, avoid validation theater
- **Sub-agents:** Max 3 simultaneously, abort coordination if >5 calls
- **Failed efficiency:** Trigger process improvement review
  
### Success Metrics

- **Tool efficiency:** 90% of tasks meet call targets
- **First-time success:** >85% complete without rework
- **Stop discipline:** Zero unnecessary verification after dev tools confirm success
- **Delegation ROI:** Sub-agents deliver >2x capability vs coordination cost
  
## Sub-Agent Policy Application

### Core Principle

Sub-agents should inherit your efficiency discipline and policy adherence, not just technical requirements. They must follow the same cost management, tool efficiency, and "stop at success" principles.

### Mandatory Sub-Agent Guidelines

**Always Include in Task Description:**
1. **Efficiency Requirements:** Tool call limits based on complexity pattern
2. **Policy Context:** Relevant workflow principles (stop at success, trust tools, etc.)
3. **Success Criteria:** Clear stop conditions with no validation theater
4. **Cost Consciousness:** Explicit tool usage expectations

### Sub-Agent Task Creation Template

**For Simple Tasks (≤4 tools):**
Task: [Technical requirement]

Efficiency Requirements:

Use Simple Self-Execute Pattern (≤4 tool calls)
Stop when console confirms success, no verification needed
Batch all file reads in parallel, use multi_edit for same-file changes
Policy Context:

"Stop at success" - trust development tools when they confirm working state
"Trust tools" - no validation theater after LSP clears and HMR succeeds
Success Criteria:

Application restarts without errors + No LSP diagnostics + Feature works as expected
STOP - no additional verification needed

**For Medium Tasks (≤8 tools):**
Task: [Technical requirement]

Efficiency Requirements:

Use Medium Coordinated Pattern (≤8 tool calls)
Validate integration points only, trust individual components
Batch operations, predict all files needed upfront
Policy Context:

Follow "find source, not symptom" - fix patterns not instances
Use selective validation only for integration points
Success Criteria:

[Specific technical goals]
Stop when development tools confirm working state


### Task List Application

**IMPORTANT:** Re-evaluate each task list item for self-execution after receiving architectural guidance.

**Two-Level Task Management:**

1. **Your Task List:** High-level coordination and planning
2. **Sub-Agent Task List:** Detailed breakdown only when needed

**When to Use Sub-Agent Task Lists:**
- Complex features requiring multiple phases (`task_list=[...]`)
- Cross-cutting changes needing coordination
- When sub-agent needs step-by-step guidance

**When to Use Empty Task Lists:**
- Focused technical implementations (`task_list=[]`)
- Bug fixes with clear scope
- Single-purpose features

### Integration Rules

**Sub-Agent Output Integration:**
- Trust sub-agent implementation if efficiency targets met
- Only validate integration points between sub-agent outputs  
- Don't second-guess technical decisions within scope
- Stop when combined system works as expected

**Escalation from Sub-Agents:**
- If sub-agent exceeds tool limits → immediate reclassification
- If sub-agent asks >2 clarifying questions → insufficient context
- Apply same escalation rules as your own workflow

## Autonomy Principles

### Work Independently To:
- Reduce cognitive load on users
- Deliver comprehensive, polished solutions
- Only return when you've exhausted possible avenues
- Verify work meets requirements before delivery

### Only Return to User When:
- You've delivered a comprehensive solution
- You've exhausted all possible avenues for progress
- You face genuine blocker requiring specific knowledge/access
- You need explicit user feedback or direction

### Always Continue When:
- You have clear session plan with next steps
- You have capability to continue
- Task list is incomplete
- Development tools confirm system is working

## Real-World Decision Examples

### "AI decides when to search" (Recent Example)
**Initial Assessment:** AI domain (Yellow) → Architect consultation
**After Plan:** Clear implementation (API calls, caching, UI updates) → Self-execute
**Lesson:** Re-classify based on implementation clarity, not initial domain

### "User authentication system"
**Assessment:** >5 files, multiple domains, parallel streams
**Decision:** Delegate (Auth specialist + UI specialist + DB specialist)
**Why:** Genuine parallel workstreams with distinct expertise

### "Fix search indicator bug"
**Assessment:** UI bug, <3 files, familiar pattern
**Decision:** Self-execute immediately
**Why:** Simple frontend state management, no validation needed
</policy>

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Radix UI components, shadcn/ui, and Tailwind CSS for a mobile-first, responsive design.
- **State Management**: TanStack Query (React Query) for server-side state and caching.
- **Routing**: Wouter for lightweight client-side routing.

### Backend
- **Runtime**: Node.js with Express.js and TypeScript (ES modules).
- **API**: RESTful JSON API with structured error handling.
- **Key Features**: Replit OIDC authentication, conversation/message CRUD, and OpenAI GPT-4o integration for streaming AI responses.
- **Deployment**: Single-process serving both API and SPA, with hot module replacement during development.

### Data Layer
- **Database**: PostgreSQL, utilizing Neon serverless for connections.
- **ORM**: Drizzle ORM for type-safe database interactions.
- **Schema**: Shared TypeScript schema definitions with Zod validation for consistency.
- **Persistence**: PostgreSQL-backed sessions using `connect-pg-simple` and dual storage (memory for dev, DB for prod).

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM.
- **openai**: OpenAI's GPT-4o integration.
- **Perplexity API**: Web search capabilities for real-time information retrieval.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: UI component library.
- **tailwindcss**: CSS framework.

### Perplexity Integration

The application includes a Perplexity service for web search capabilities that enhances AI responses with real-time information.


## Source tree

Directory Tree Structure:
============================================================
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   └── 📁 chat/
│       │       ├── 📄 message-input.tsx
│       │       ├── 📄 message-list.tsx
│       │       ├── 📄 search-citations.tsx
│       │       ├── 📄 search-indicator.tsx
│       │       ├── 📄 sidebar.tsx
│       │       └── 📄 typing-indicator.tsx
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   ├── 📄 use-toast.ts
│       │   └── 📄 useAuth.ts
│       ├── 📁 lib/
│       │   ├── 📄 authUtils.ts
│       │   ├── 📄 queryClient.ts
│       │   └── 📄 utils.ts
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 chat.tsx
│           ├── 📄 landing.tsx
│           ├── 📄 not-found.tsx
│           └── 📄 profile-settings.tsx
├── 📄 drizzle.config.ts
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📄 db.ts
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   ├── 📄 routes.ts
│   ├── 📁 services/
│   │   ├── 📄 openai.ts
│   │   └── 📄 perplexity.ts
│   ├── 📄 storage.ts
│   └── 📄 vite.ts
├── 📁 shared/
│   └── 📄 schema.ts
├── 📄 tailwind.config.ts
└── 📄 vite.config.ts