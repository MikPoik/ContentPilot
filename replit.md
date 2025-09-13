# ContentCraft AI

## Overview

ContentCraft AI is a full-stack web application that serves as an AI-powered social media content strategist. The application features a chat interface where users can interact with an AI assistant to brainstorm content ideas, get platform-specific advice, and plan their social media strategy. Built as a modern React SPA with an Express backend, it uses PostgreSQL for data persistence and OpenAI's GPT-4o for AI-powered conversations.

## User Preferences

Preferred communication style: Simple, everyday language.
<policy>
  <title>Development Workflow Policies & Guidelines</title>

  <cost-efficient-workflow target="3-5 total tool calls for most modification requests">
    <phase number="1" name="Error Investigation & Discovery" max-calls="1-2">
      <rule>Trace to source, not symptoms - Find the actual originating file/function, not just where errors surface</rule>
      <rule>Read error stack traces completely - The deepest stack frame often contains the real issue</rule>
      <rule>Search for error patterns first before assuming location (e.g., "localStorage" across codebase)</rule>
      <rule>Use `search_codebase` ONLY if truly don't know where relevant code lives</rule>
      <rule>Otherwise, directly `read` target files in parallel (batch 3-6 files at once)</rule>
      <rule>Skip exploratory reading - be surgical about what you need</rule>
    </phase>
  </cost-efficient-workflow>

  <mandatory-workflow-adherence>
    <rule>MAXIMUM 5 tool calls for any change request</rule>
    <rule>No exploration - be surgical about file reading</rule>
    <rule>No incremental changes - make all related edits in one batch</rule>
    <rule>No workflow restarts unless runtime actually fails (not just for verification)</rule>
  </mandatory-workflow-adherence>

  <defensive-coding-patterns>
    <pattern>Apply sandbox-safe patterns by default (safeLocalStorage, safe DOM access)</pattern>
    <pattern>Wrap external API calls in try-catch from the start</pattern>
    <pattern>Use null-safe operations for optional properties</pattern>
    <pattern>Apply security patterns consistently across similar code</pattern>
  </defensive-coding-patterns>

  <verification-anxiety-prevention>
    <principle>Stop checking once the development environment confirms success</principle>
    <principle>Resist urge to "double-check" working changes</principle>
    <principle>Trust professional development tools over manual verification</principle>
    <principle>Remember: More verification ≠ better quality, just higher cost</principle>
  </verification-anxiety-prevention>
</policy>

## Recent Changes

### January 30, 2025
- **Authentication Implementation**: Added complete Replit Auth integration with OpenID Connect
- **Database Migration**: Migrated from memory storage to PostgreSQL with proper user associations
- **Schema Updates**: Added users and sessions tables, updated conversations to include userId
- **Access Control**: Implemented ownership verification for all user resources
- **Frontend Updates**: Added landing page for logged-out users and authentication flows
- **Error Handling**: Added comprehensive unauthorized error handling with automatic login redirects
- **User Interface**: Updated sidebar and message components to use Replit user profiles
- **Session Management**: Implemented secure session storage with PostgreSQL backend

### Work instructions for Agent
If you need to use OpenAI models, model "gpt-4.1" is the newest model released on 14.4.2025 

You can use grep commands to get overview of current routes and functions with these commands when needed:

For JavaScript/TypeScript function declarations: grep -r -n "^ *app." server/

For JavaScript/TypeScript function declarations: grep -r -n "^ *(function|export function|async function)" server/

For arrow functions and method definitions: grep -r -n "^ (const|let|var).=.*=>" server/

For TypeScript/JavaScript methods in classes or objects: grep -r -n "^ [a-zA-Z_][a-zA-Z0-9_]\s*(" server/

For Express route handlers specifically: grep -r -n "^ *app.(get|post|put|delete|patch)" server/

Always test the api routes after changes with "curl" e.g. curl https://localhost:5000 ... 

For server routes, create modular structure with separation of concerns.
UI design choices should be mobile first unless stated otherwise.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Mobile-First Design**: Responsive design with mobile breakpoint detection

### Backend Architecture  
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API**: RESTful JSON API with structured error handling
- **Middleware**: Request logging, JSON parsing, and error handling
- **Development**: Hot module replacement via Vite integration

### Data Layer
- **Database**: PostgreSQL with connection via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared TypeScript schema definitions with Zod validation
- **Storage**: Dual storage implementation (memory for development, database for production)

## Key Components

### Core Entities
1. **Conversations**: Chat sessions with titles and timestamps
2. **Messages**: Individual chat messages with role-based content (user/assistant/system)
3. **User Profile**: User preferences including name, niche, platforms, and interests

### Chat System
- **Real-time Streaming**: OpenAI GPT-4o integration with streaming responses
- **Message Management**: Persistent conversation history with message threading
- **UI Components**: Responsive chat interface with typing indicators and auto-scroll

### Authentication & Sessions
- **Replit Auth Integration**: Full OpenID Connect authentication with Replit as provider
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **User Data**: User profiles stored with email, name, and profile images from Replit
- **Access Control**: All conversations and messages are user-scoped with ownership verification

## Data Flow

1. **Client Interaction**: User sends message through React chat interface
2. **API Processing**: Express server receives message, validates with Zod schemas
3. **Storage**: Message stored in database/memory via storage abstraction layer
4. **AI Integration**: OpenAI API called with conversation context for streaming response
5. **Response Handling**: Streamed AI response sent back to client and stored as assistant message
6. **UI Updates**: React Query manages cache invalidation and UI state updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon database
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **openai**: Official OpenAI SDK for GPT-4o integration
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Comprehensive UI component library
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **drizzle-kit**: Database migration and schema management
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public` directory
- **Backend**: esbuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **OPENAI_API_KEY**: OpenAI API authentication (required)
- **NODE_ENV**: Environment mode (development/production)

### Production Setup
- Single-process deployment with Express serving both API and static files
- Database migrations handled through Drizzle Kit
- Session persistence via PostgreSQL with connect-pg-simple
- Error handling with structured JSON responses and appropriate HTTP status codes

### Development Workflow
- **Hot Reloading**: Vite dev server with HMR for frontend development
- **API Development**: tsx with auto-restart for backend changes
- **Database**: Local PostgreSQL or Neon database with shared schema
- **Type Safety**: Shared TypeScript definitions between client and server