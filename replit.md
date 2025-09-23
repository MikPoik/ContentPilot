# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It offers a chat interface for AI-driven content brainstorming, platform-specific advice, and strategic planning. The project aims to enhance social media presence and content creation efficiency for marketers and content creators by integrating sophisticated chat functionalities and providing a comprehensive tool for strategic content development.

## User Preferences
Preferred communication style: like talking to a software developer, technical and detailed.

## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript and Vite for a modern development experience.
- **UI/UX**: Utilizes Radix UI, shadcn/ui, and Tailwind CSS to ensure a responsive, mobile-first design and consistent user experience.
- **State Management**: TanStack Query (React Query) manages server-side state and caching for efficient data handling.
- **Routing**: Wouter provides lightweight client-side routing.

### Backend
- **Runtime**: Node.js with Express.js and TypeScript (ES modules) forms the core of the backend.
- **API**: A RESTful JSON API is implemented with robust error handling.
- **Key Features**: Includes Replit OIDC authentication, CRUD operations for conversations and messages, and integrates OpenAI GPT-4o for streaming AI responses.
- **Deployment**: The application is designed for single-process deployment, serving both the API and the Single Page Application (SPA), with hot module replacement during development for rapid iteration.

### Data Layer
- **Database**: PostgreSQL is used as the primary data store, leveraging Neon serverless for scalable connections.
- **ORM**: Drizzle ORM ensures type-safe interactions with the database.
- **Schema**: Shared TypeScript schema definitions with Zod validation maintain data consistency across the stack.
- **Persistence**: PostgreSQL-backed sessions are managed using `connect-pg-simple`, employing a dual storage strategy (memory for development, database for production).

### AI Services
- **Intent Analysis**: Advanced AI models determine user intent, enabling dynamic triggering of various AI workflows such as web search, Instagram analysis, blog analysis, and profile updates.
- **Content Generation**: Leverages OpenAI GPT-4o for generating chat responses, conversation titles, and extracting user profile information and memories.
- **Memory Management**: AI-driven rephrasing of queries and extraction of memories from conversations to enhance context and personalize interactions.
- **Workflow Management**: Analyzes user writing style and builds workflow-aware system prompts to guide users through content creation processes.

## External Dependencies
- **@neondatabase/serverless**: For PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM for database interactions.
- **openai**: Integration with OpenAI's GPT-4o for AI capabilities.
- **Perplexity API**: Provides web search functionalities to enrich AI responses with real-time information.
- **@tanstack/react-query**: Used for server state management in the frontend.
- **@radix-ui/***: A collection of unstyled, accessible UI components.
- **tailwindcss**: A utility-first CSS framework for styling.