# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.

# Cost-Effective Development Workflow

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
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: UI component library.
- **tailwindcss**: CSS framework.

## Source tree

Source Code Tree with Directory Structure:
============================================================
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       │   ⚡ Router(): Element
│       │   ⚡ App(): Element
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   │   ⚡ export MemoryTester(): Element
│       │   └── 📁 chat/
│       │       ├── 📄 message-input.tsx
│       │       │   ⚡ export MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps): Element
│       │       │   📋 MessageInputProps
│       │       ├── 📄 message-list.tsx
│       │       │   ⚡ export MessageList({ 
  messages, 
  streamingMessage, 
  isStreaming, 
  user,
  conversationId 
}: MessageListProps): Element
│       │       │   📋 MessageListProps
│       │       ├── 📄 sidebar.tsx
│       │       │   ⚡ export Sidebar({ 
  conversations, 
  currentConversationId, 
  user, 
  onNewConversation, 
  onClose 
}: SidebarProps): Element
│       │       │   📋 SidebarProps
│       │       └── 📄 typing-indicator.tsx
│       │           ⚡ export TypingIndicator(): Element
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   │   ⚡ export useIsMobile(): boolean
│       │   ├── 📄 use-toast.ts
│       │   │   ⚡ genId(): string
│       │   │   ➡️ addToRemoveQueue(toastId: string): void
│       │   │   ➡️ export reducer(state: State, action: Action): State
│       │   │   ⚡ dispatch(action: Action): void
│       │   │   ⚡ toast({ ...props }: Toast): { id: string; dismiss: () => void; update: (props: any) => void; }
│       │   │   ⚡ useToast(): { toast: ({ ...props }: Toast) => { id: string; dismiss: () => void; update: (props: any) => void; }; dismiss: (toastId?: string | undefined) => void; toasts: any[]; }
│       │   │   📋 State
│       │   └── 📄 useAuth.ts
│       │       ⚡ export useAuth(): { user: any; isLoading: boolean; isAuthenticated: boolean; }
│       ├── 📁 lib/
│       │   ├── 📄 authUtils.ts
│       │   │   ⚡ export isUnauthorizedError(error: Error): boolean
│       │   ├── 📄 queryClient.ts
│       │   │   ⚡ async throwIfResNotOk(res: Response): Promise<void>
│       │   │   ⚡ export async apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response>
│       │   │   ➡️ export getQueryFn({ on401: unauthorizedBehavior }: any): ({ queryKey }: { queryKey: QueryKey; signal: AbortSignal; meta: Record<string, unknown> | undefined; pageParam?: unknown; direction?: unknown; }) => Promise<any>
│       │   └── 📄 utils.ts
│       │       ⚡ export cn(inputs: ClassValue[]): string
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 chat.tsx
│           │   ⚡ export Chat(): Element
│           ├── 📄 landing.tsx
│           │   ⚡ export Landing(): Element
│           ├── 📄 not-found.tsx
│           │   ⚡ export NotFound(): Element
│           └── 📄 profile-settings.tsx
│               ⚡ export ProfileSettings(): Element
├── 📄 drizzle.config.ts
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📄 db.ts
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   │   ⚡ export getSession(): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
│   │   ⚡ updateUserSession(user: any, tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers): void
│   │   ⚡ async upsertUser(claims: any): Promise<void>
│   │   ⚡ resolveDomain(host: string): string
│   │   ⚡ export async setupAuth(app: Express): Promise<void>
│   │   ➡️ export async isAuthenticated(req: any, res: any, next: any): Promise<void | Response<any, Record<string, any>, number>>
│   ├── 📄 routes.ts
│   │   ⚡ export async registerRoutes(app: Express): Promise<Server>
│   ├── 📁 services/
│   │   └── 📄 openai.ts
│   │       ⚡ buildPersonalizedSystemPrompt(user?: User, memories?: any[]): string
│   │       ⚡ export async generateChatResponse(messages: ChatMessage[], user?: User, memories?: any[]): Promise<ReadableStream<string>>
│   │       ⚡ export async generateConversationTitle(messages: ChatMessage[]): Promise<string>
│   │       ⚡ export async extractProfileInfo(userMessage: string, aiResponse: string, currentUser: User): Promise<Partial<UpdateUserProfile> | null>
│   │       ⚡ export async generateEmbedding(text: string): Promise<number[]>
│   │       ⚡ export async extractMemoriesFromConversation(userMessage: string, aiResponse: string): Promise<string[]>
│   │       📋 ChatMessage
│   ├── 📄 storage.ts
│   │   📋 IStorage
│   │   │  🔧 getUser(id: string): Promise<User | undefined>
│   │   │  🔧 upsertUser(user: UpsertUser): Promise<User>
│   │   │  🔧 updateUserProfile(id: string, profileData: Partial<UpdateUserProfile>): Promise<User | undefined>
│   │   │  🔧 getConversations(userId: string): Promise<Conversation[]>
│   │   │  🔧 getConversation(id: string): Promise<Conversation | undefined>
│   │   │  🔧 createConversation(conversation: InsertConversation): Promise<Conversation>
│   │   │  🔧 updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>
│   │   │  🔧 deleteConversation(id: string): Promise<boolean>
│   │   │  🔧 getMessages(conversationId: string): Promise<Message[]>
│   │   │  🔧 getMessage(id: string): Promise<Message | undefined>
│   │   │  🔧 createMessage(message: InsertMessage): Promise<Message>
│   │   │  🔧 getMemories(userId: string): Promise<Memory[]>
│   │   │  🔧 getMemory(id: string): Promise<Memory | undefined>
│   │   │  🔧 createMemory(memory: InsertMemory): Promise<Memory>
│   │   │  🔧 deleteMemory(id: string): Promise<boolean>
│   │   │  🔧 searchSimilarMemories(userId: string, embedding: number[], limit?: number): Promise<(Memory & { similarity: number })[]>
│   │   🏛️ DatabaseStorage
│   │   │  🔧 async getUser(id: string): Promise<User | undefined>
│   │   │  🔧 async upsertUser(userData: UpsertUser): Promise<User>
│   │   │  🔧 async getConversations(userId: string): Promise<Conversation[]>
│   │   │  🔧 async getConversation(id: string): Promise<Conversation | undefined>
│   │   │  🔧 async createConversation(insertConversation: InsertConversation): Promise<Conversation>
│   │   │  🔧 async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>
│   │   │  🔧 async deleteConversation(id: string): Promise<boolean>
│   │   │  🔧 async getMessages(conversationId: string): Promise<Message[]>
│   │   │  🔧 async getMessage(id: string): Promise<Message | undefined>
│   │   │  🔧 async createMessage(insertMessage: InsertMessage): Promise<Message>
│   │   │  🔧 async updateUserProfile(id: string, profileData: Partial<UpdateUserProfile>): Promise<User | undefined>
│   │   │  🔧 async getMemories(userId: string): Promise<Memory[]>
│   │   │  🔧 async getMemory(id: string): Promise<Memory | undefined>
│   │   │  🔧 async createMemory(insertMemory: InsertMemory): Promise<Memory>
│   │   │  🔧 async deleteMemory(id: string): Promise<boolean>
│   │   │  🔧 async searchSimilarMemories(userId: string, embedding: number[], limit: number): Promise<(Memory & { similarity: number })[]>
│   └── 📄 vite.ts
│       ⚡ export log(message: string, source: any): void
│       ⚡ export async setupVite(app: Express, server: Server): Promise<void>
│       ⚡ export serveStatic(app: Express): void
├── 📁 shared/
│   └── 📄 schema.ts
├── 📄 tailwind.config.ts
└── 📄 vite.config.ts
