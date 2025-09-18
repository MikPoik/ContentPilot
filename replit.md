# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.

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