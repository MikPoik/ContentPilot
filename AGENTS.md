# ContentCraft AI


## Important Development guideline
- NEVER use any language-specific hardcoded keyword patterns, only dynamic language agnostic patterns prefer to avoid any keyword triggers, filters, patterns.

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It offers a chat interface for AI-driven content brainstorming, platform-specific advice, and strategic planning. The project aims to enhance social media presence and content creation efficiency for marketers and content creators by integrating sophisticated chat functionalities.


## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Radix UI, shadcn/ui, and Tailwind CSS for a responsive, mobile-first design.
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
- **Schema**: Shared TypeScript schema definitions with Zod validation.
- **Persistence**: PostgreSQL-backed sessions using `connect-pg-simple` and dual storage (memory for dev, DB for prod).

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM.
- **openai**: OpenAI's GPT-4o integration.
- **Perplexity API**: Web search capabilities.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: UI component library.
- **tailwindcss**: CSS framework.

# Directory Tree

Generated on: 2025-10-24T11:36:20.270Z

*Simple mode: Directory structure only*

```
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   ├── 📁 chat/
│       │   │   ├── 📄 ai-activity-indicator.tsx
│       │   │   ├── 📄 export-menu.tsx
│       │   │   ├── 📄 instagram-indicator.tsx
│       │   │   ├── 📄 message-input.tsx
│       │   │   ├── 📄 message-list.tsx
│       │   │   ├── 📄 search-citations.tsx
│       │   │   ├── 📄 search-indicator.tsx
│       │   │   ├── 📄 sidebar.tsx
│       │   │   └── 📄 typing-indicator.tsx
│       │   ├── 📁 profile/
│       │   │   ├── 📄 ai-collected-data-card.tsx
│       │   │   ├── 📄 basic-profile-card.tsx
│       │   │   ├── 📄 blog-analysis-card.tsx
│       │   │   ├── 📄 competitor-analysis-card.tsx
│       │   │   ├── 📄 data-usage-info-card.tsx
│       │   │   ├── 📄 editable-array-field.tsx
│       │   │   ├── 📄 editable-text-field.tsx
│       │   │   ├── 📄 hashtag-search-card.tsx
│       │   │   ├── 📄 instagram-analysis-card.tsx
│       │   │   └── 📄 other-profile-data-card.tsx
│       │   ├── 📄 subscription-management.tsx
│       │   └── 📁 ui/
│       │       ├── (ui components omitted from list)
│       ├── 📁 contexts/
│       │   └── 📄 theme-context.tsx
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   ├── 📄 use-toast.ts
│       │   └── 📄 useAuth.ts
│       ├── 📄 index.css
│       ├── 📁 lib/
│       │   ├── 📄 authUtils.ts
│       │   ├── 📄 exportUtils.ts
│       │   ├── 📄 queryClient.ts
│       │   └── 📄 utils.ts
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 chat.tsx
│           ├── 📄 landing.tsx
│           ├── 📄 not-found.tsx
│           └── 📄 profile-settings.tsx
├── 📄 components.json
├── 📄 drizzle.config.ts
├── 📄 package-lock.json
├── 📄 package.json
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📄 db.ts
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   ├── 📁 routes/
│   │   ├── 📄 auth.ts
│   │   ├── 📄 conversations.ts
│   │   ├── 📄 instagram.ts
│   │   ├── 📄 memories.ts
│   │   ├── 📄 messages.ts
│   │   └── 📄 subscriptions.ts
│   ├── 📄 routes.ts
│   ├── 📁 services/
│   │   ├── 📁 ai/
│   │   │   ├── 📄 blog.ts
│   │   │   ├── 📄 chat.ts
│   │   │   ├── 📄 instagram.ts
│   │   │   ├── 📄 intent.ts
│   │   │   ├── 📄 memory-utils.ts
│   │   │   ├── 📄 memory.ts
│   │   │   ├── 📄 profile.ts
│   │   │   ├── 📄 search.ts
│   │   │   ├── 📄 workflow-constants.ts
│   │   │   └── 📄 workflow.ts
│   │   ├── 📄 errors.ts
│   │   ├── 📄 grok.ts
│   │   ├── 📄 hikerapi.ts
│   │   ├── 📄 instagrapi.ts
│   │   ├── 📄 openai.ts
│   │   └── 📄 perplexity.ts
│   ├── 📄 storage.ts
│   └── 📄 vite.ts
├── 📁 shared/
│   └── 📄 schema.ts
├── 📄 tailwind.config.ts
├── 📄 tsconfig.json
└── 📄 vite.config.ts

```
