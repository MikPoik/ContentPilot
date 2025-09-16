# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Cost-Effective Development Workflow

**Target: 3-5 tool calls maximum**

## Core Rules

**Before Acting:** Plan ALL reads + edits mentally first
**Information:** Batch all file reads in 1 call (predict what you need)
**Changes:** Use multi_edit for everything, batch parallel edits
**Verification:** Trust dev tools, stop when they confirm success

## Critical Batching

**Phase 1:** read(file1) + read(file2) + grep(pattern) + diagnostics() [1 call]
**Phase 2:** multi_edit(file1) + multi_edit(file2) + bash() [1-2 calls]
**Phase 3:** restart_workflow() only if runtime fails [0-1 call]

## Anti-Patterns ❌
- Sequential: read → analyze → read more → edit
- Multiple edits to same file
- Verification anxiety (checking working changes)
- Using architect for normal development

## ZERO DELEGATION RULE 🚫

**NEVER USE:**
- `start_subagent` - Execute everything yourself
- `write_task_list` - Plan mentally, act directly  
- `architect` - Only for genuine 3+ attempt failures

**WHY:** Sub-agents cost 2x+ tool calls via context transfer + cold starts

**ALWAYS:** Direct execution with batched tools = 3-5 calls total

## Surgical Precision
- **UI issues:** component + parent + hooks
- **API issues:** routes + services + schema  
- **Data issues:** schema + storage + endpoints
- **Errors:** Follow stack trace to deepest frame, work bottom-up, try the simplest fix, switch layers when stuck

## Stop Conditions
- HMR reload success
- Console shows expected behavior
- LSP errors cleared
- Dev server responds correctly

**Success metric:** Fix root cause with pattern-based changes in minimum tool calls


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