# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It offers a chat interface for AI-driven content brainstorming, platform-specific advice, and strategic planning. The project aims to enhance social media presence and content creation efficiency for marketers and content creators by integrating sophisticated chat functionalities.

## User Preferences
Preferred communication style: like talking to a software developer, technical and detailed.

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