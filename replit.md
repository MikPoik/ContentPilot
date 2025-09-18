# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.

# Dynamic Development Workflow Policy v4.2

## Core Philosophy
**Find source, not symptom → Fix pattern, not instance → Batch operations → Delegate strategically → Trust tools → Stop at success**

## Pre-Execution Assessment (MANDATORY)
1. **Classify complexity:** Count affected files + estimated lines + domain knowledge required
2. **Validate domain confidence:** Green (familiar patterns) / Yellow (some unknowns) / Red (unfamiliar) → Any Red = delegate
3. **Assess integration risk:** Shared state + interface conflicts + timing dependencies → High risk = sequential not parallel
4. **Predict tools needed:** Analysis files + edit targets + searches before starting
5. **Decision point:** Self-execute vs delegate vs architect consultation

## Delegation Decision Matrix

### Execute Self When:
- **Simple:** <3 files, <50 lines, familiar patterns (Green domain knowledge)
- **Sequential dependencies:** Changes must coordinate tightly (schema→API→UI)
- **Single domain:** All changes within known expertise area

### Delegate When:
- **Parallel workstreams:** >2 independent features that can run simultaneously (Low integration risk)
- **Specialized domains:** ML/AI, advanced algorithms, security analysis, performance optimization (Yellow/Red domains)
- **Research + implement:** Unknown patterns requiring investigation phase
- **Large scope:** >5 files OR >200 lines OR multiple system boundaries

### Consult Architect When:
- **Design uncertainty:** "How should I structure this integration?"
- **Performance questions:** "Will this approach scale?"
- **Pattern validation:** "Is this the right architectural approach?"
- **Multiple escalations:** Task reclassified twice or integration conflicts

## Execution Workflows by Complexity

### Simple Self-Execute Pattern
**Triggers:** <3 files, <50 lines, known patterns  
**Flow:** read(predicted files) + grep/rg → multi_edit(all changes) → trust HMR  
**Tools:** 2-4 total calls  
**Stop when:** Console confirms success

### Medium Coordinated Pattern  
**Triggers:** 3-6 files, 50-200 lines, some unknowns  
**Flow:** read(batch) + search_codebase → analyze → multi_edit(batched) → selective validation  
**Consider delegation:** If >2 independent parallel workstreams identified  
**Tools:** 4-8 total calls

### Complex Delegation Pattern
**Triggers:** >5 files, >200 lines, multiple domains  
**Default:** Delegate specialized components to sub-agents  
**Coordination:** Define boundaries → parallel execution → batch integration  
**Tools:** Variable based on delegation scope

## Sub-Agent Handoff Protocol

### Context Package (Enhanced Transfer)
```
Problem: [Specific issue in 1-2 sentences]
Scope: [Exact files/components to modify]
Success: [Concrete completion criteria]
Constraints: [API patterns, coding style, dependencies]
Context Anchors: [3 key architectural decisions that MUST be preserved]
Integration Points: [Required interfaces/contracts]
```

### Delegation Execution
1. **Launch parallel sub-agents** with isolated scopes (no file overlap)
2. **Monitor for early failure signals** (confusion, repeated questions)  
3. **Abort if >3 clarification exchanges** → fallback to self-execute
4. **Batch integrate outputs** → resolve conflicts → validate integration

### Integration Rules
- **File conflicts:** Manual review + merge, prefer implementation over config changes
- **Pattern conflicts:** Apply most restrictive/defensive approach
- **API conflicts:** Escalate to architect consultation
- **Validation:** Test integration points, not individual components

## Critical Stop/Continue/Escalate Decisions

### Escalate Immediately When:
- **4 tools spent without progress** → Mandatory reclassification
- **"Familiar pattern" breaks** → Unknown APIs/complexity discovered
- **Sub-agent asks >2 clarifying questions** → Context insufficient
- **Integration conflicts emerge** → Architectural decisions needed

### Stop Immediately When:
- HMR reload succeeds + clean console + expected behavior visible
- Simple change (<10 lines) + LSP errors cleared
- Defensive patterns applied (try-catch, null checks, validation)

### Continue Only When:
- Complex business logic changes (validate thoroughly)
- Security-sensitive modifications (test boundary conditions)  
- Performance-critical paths (measure impact)
- Database schema changes (verify migration + rollback)

### Never Verify:
- Import/export updates, variable renames, formatting changes
- Adding logging, error messages, or debugging code
- Configuration file updates with obvious values

## Tool Cost Budget & Efficiency Rules

### Cost Tiers (Use strategically)
- **Free:** read(batch ≤6), multi_edit, grep/rg with specific patterns
- **Moderate:** search_codebase, get_diagnostics, single sub-agent  
- **Expensive:** architect consultation, multiple sub-agents, screenshot, restart_workflow

### Efficiency Maximization
- **Predict before acting:** All files needed for analysis AND modification
- **Batch operations:** Never do serial reads when parallel possible
- **One multi_edit per file:** Combine all changes to same file
- **Trust first success:** Stop when development tools confirm working state
- **Sub-agent ROI:** Delegate only if capability gain > coordination cost

### Hard Limits
- **Max 6 files per read batch** (context window management)
- **Max 3 sub-agents simultaneously** (coordination complexity)
- **Max 3 architect consultations per task** (cost control)
- **Abort delegation if >5 coordination tool calls** (efficiency threshold)
- **Any Red domain knowledge** → Automatic delegation or architect consult

## Real-World Execution Examples

### Example 1: "Add user authentication"
**Assessment:** >5 files (routes, middleware, UI, database), multiple domains  
**Decision:** Delegate - Auth specialist + UI specialist + Database specialist  
**Expected tools:** 8-12 total (including coordination)

### Example 2: "Fix localStorage error in sandbox"  
**Assessment:** Pattern fix, <3 files, known solution  
**Decision:** Self-execute  
**Expected tools:** 3-4 total (search pattern → read files → multi_edit → trust HMR)

### Example 3: "Optimize slow database queries"
**Assessment:** Performance domain, unknown bottlenecks, research needed  
**Decision:** Performance specialist sub-agent + architect consultation  
**Expected tools:** 6-10 total

**Success Metrics:**
- **Tool efficiency:** Simple tasks ≤4 calls, Medium ≤8 calls, Complex ≤15 calls
- **First-time success:** >80% of tasks complete without rework/restart
- **Accurate classification:** >85% initial assessments correct (with escalation tracking)
- **Delegation ROI:** Sub-agent tasks deliver >2x capability vs coordination cost
- **Stop discipline:** Zero unnecessary verification after development tools confirm success


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

**Configuration:**
- Requires `PERPLEXITY_API_KEY` environment variable
- Automatically integrates with the chat service when configured
- Gracefully degrades when API key is not available

**Features:**
- Automatic detection of queries that would benefit from web search
- Real-time information retrieval for current events, trends, and facts
- Citation tracking for source attribution
- Configurable search parameters (recency, domains, etc.)

**Usage:**
The service is automatically used by the chat system when:
- User queries contain time-sensitive keywords (today, current, latest, etc.)
- Questions involve factual data, statistics, or current events
- Business/product-specific inquiries are detected

**Service Location:** `server/services/perplexity.ts`

## Source tree

Source Code Tree with Directory Structure:
============================================================

├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   └── 📁 chat/
│       │       ├── 📄 message-input.tsx
│       │       ├── 📄 message-list.tsx
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