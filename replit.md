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

```
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       │   ⚡ Router(): Element
│       │   ⚡ App(): Element
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   │   ⚡ export MemoryTester(): Element
│       │   ├── 📁 chat/
│       │   │   ├── 📄 ai-activity-indicator.tsx
│       │   │   │   ⚡ export AIActivityIndicator({ activity, message, searchQuery }: AIActivityIndicatorProps): Element | null
│       │   │   │   📋 AIActivityIndicatorProps
│       │   │   ├── 📄 export-menu.tsx
│       │   │   │   ⚡ ExportMenuImpl({ messages, conversationTitle, conversation, disabled }: ExportMenuProps): Element
│       │   │   │   📋 ExportMenuProps
│       │   │   ├── 📄 message-input.tsx
│       │   │   │   ⚡ export MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps): Element
│       │   │   │   📋 MessageInputProps
│       │   │   ├── 📄 message-list.tsx
│       │   │   │   ⚡ export MessageList({ 
  messages, 
  streamingMessage, 
  isStreaming, 
  isSearching = false,
  searchQuery,
  searchCitations = [],
  aiActivity = null,
  aiActivityMessage = '',
  user,
  conversationId 
}: MessageListProps): Element
│       │   │   │   📋 MessageListProps
│       │   │   ├── 📄 search-citations.tsx
│       │   │   │   ⚡ export SearchCitations({ citations, searchQuery }: SearchCitationsProps): Element | null
│       │   │   │   📋 SearchCitationsProps
│       │   │   ├── 📄 search-indicator.tsx
│       │   │   │   ⚡ export SearchIndicator({ isSearching, searchQuery }: SearchIndicatorProps): Element | null
│       │   │   │   📋 SearchIndicatorProps
│       │   │   ├── 📄 sidebar.tsx
│       │   │   │   ⚡ export Sidebar({
  conversations,
  currentConversationId,
  user,
  onNewConversation,
  onClose
}: SidebarProps): Element
│       │   │   │   📋 SidebarProps
│       │   │   └── 📄 typing-indicator.tsx
│       │   │       ⚡ export TypingIndicator(): Element
│       │   └── 📄 subscription-management.tsx
│       │       ⚡ export SubscriptionManagement(): Element
│       ├── 📁 contexts/
│       │   └── 📄 theme-context.tsx
│       │       ⚡ export ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps): Element
│       │       ➡️ export useTheme(): ThemeProviderState
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
│       │   ├── 📄 exportUtils.ts
│       │   │   ⚡ export formatDate(date: string | Date): string
│       │   │   ⚡ export exportToMarkdown(messages: Message[], conversation?: Conversation, options: ExportOptions): string
│       │   │   ⚡ export exportToHTML(messages: Message[], conversation?: Conversation, options: ExportOptions): string
│       │   │   ⚡ export downloadFile(content: string, filename: string, contentType: string): void
│       │   │   ⚡ export generateFilename(conversation?: Conversation, format: 'md' | 'html'): string
│       │   │   ⚡ export async exportConversation(messages: Message[], format: 'markdown' | 'txt' | 'json', conversationTitle?: string): Promise<void>
│       │   │   📋 ExportOptions
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
│   ├── 📁 routes/
│   │   ├── 📄 auth.ts
│   │   │   ⚡ export registerAuthRoutes(app: Express): void
│   │   ├── 📄 conversations.ts
│   │   │   ⚡ export registerConversationRoutes(app: Express): void
│   │   ├── 📄 instagram.ts
│   │   │   ⚡ export registerInstagramRoutes(app: Express): void
│   │   ├── 📄 memories.ts
│   │   │   ⚡ export registerMemoryRoutes(app: Express): void
│   │   ├── 📄 messages.ts
│   │   │   ⚡ export registerMessageRoutes(app: Express): void
│   │   └── 📄 subscriptions.ts
│   │       ⚡ export registerSubscriptionRoutes(app: Express): void
│   ├── 📄 routes.ts
│   │   ⚡ export async registerRoutes(app: Express): Promise<Server>
│   ├── 📁 services/
│   │   ├── 📁 ai/
│   │   │   ├── 📄 blog.ts
│   │   │   │   ⚡ export async performBlogAnalysis(urls: string[], userId: string): Promise<BlogAnalysisResult>
│   │   │   │   ⚡ export formatBlogAnalysisForChat(analysis: BlogProfile, cached: boolean): string
│   │   │   ├── 📄 chat.ts
│   │   │   │   ⚡ export async generateChatResponse(messages: ChatMessage[], user?: User, relevantMemories: any[], searchDecision?: any, instagramAnalysisResult?: any, blogAnalysisResult?: any, workflowDecision?: WorkflowPhaseDecision): Promise<ChatResponseWithMetadata>
│   │   │   │   ⚡ export async generateConversationTitle(messages: ChatMessage[]): Promise<string>
│   │   │   │   ⚡ export async extractProfileInfo(userMessage: string, assistantResponse: string, user: any): Promise<any>
│   │   │   │   ⚡ export async extractMemoriesFromConversation(userMessage: string, assistantResponse: string, existingMemories?: Array<{ content: string; similarity?: number }>): Promise<string[]>
│   │   │   │   📋 ChatResponseWithMetadata
│   │   │   ├── 📄 instagram.ts
│   │   │   │   ⚡ export async decideInstagramAnalysis(messages: ChatMessage[], user?: User): Promise<InstagramAnalysisDecision>
│   │   │   │   ⚡ export async performInstagramAnalysis(username: string, userId: string, progressCallback?: (message: string) => void): Promise<{
  success: boolean;
  analysis?: any;
  cached?: boolean;
  error?: string;
  partialSuccess?: boolean;
}>
│   │   │   │   ⚡ export formatInstagramAnalysisForChat(analysis: any, cached: boolean): string
│   │   │   ├── 📄 intent.ts
│   │   │   │   ⚡ export safeJsonParse(jsonString: string, fallback: T, options: {
    removeBrackets?: boolean;
    removeCodeBlocks?: boolean;
    timeout?: number;
  }): T
│   │   │   │   ⚡ export async analyzeUnifiedIntent(messages: ChatMessage[], user?: User): Promise<UnifiedIntentDecision>
│   │   │   │   ⚡ getDefaultUnifiedDecision(): UnifiedIntentDecision
│   │   │   │   ⚡ normalizeCondensedResponse(condensedResponse: any): UnifiedIntentDecision
│   │   │   │   ⚡ export extractWebSearchDecision(unifiedDecision: UnifiedIntentDecision): WebSearchDecision
│   │   │   │   ⚡ export extractInstagramAnalysisDecision(unifiedDecision: UnifiedIntentDecision): InstagramAnalysisDecision
│   │   │   │   ⚡ export extractBlogAnalysisDecision(unifiedDecision: UnifiedIntentDecision): BlogAnalysisDecision
│   │   │   │   ⚡ export extractProfileUpdateDecision(unifiedDecision: UnifiedIntentDecision): ProfileUpdateDecision
│   │   │   │   ⚡ export extractWorkflowPhaseDecision(unifiedDecision: UnifiedIntentDecision): WorkflowPhaseDecision
│   │   │   │   ⚡ export async decideWebSearch(messages: ChatMessage[], user?: User): Promise<WebSearchDecision>
│   │   │   │   ⚡ export async decideInstagramAnalysis(messages: ChatMessage[], user?: User): Promise<InstagramAnalysisDecision>
│   │   │   │   ⚡ export async decideBlogAnalysis(messages: ChatMessage[], user?: User): Promise<BlogAnalysisDecision>
│   │   │   │   ⚡ export async decideWorkflowPhase(messages: ChatMessage[], user?: User): Promise<WorkflowPhaseDecision>
│   │   │   │   📋 ChatMessage
│   │   │   │   📋 WebSearchDecision
│   │   │   │   📋 InstagramAnalysisDecision
│   │   │   │   📋 BlogAnalysisDecision
│   │   │   │   📋 WorkflowPhaseDecision
│   │   │   │   📋 ProfileUpdateDecision
│   │   │   │   📋 UnifiedIntentDecision
│   │   │   │   📋 UserStyleAnalysis
│   │   │   │   📋 BlogProfile
│   │   │   │   📋 BlogAnalysisResult
│   │   │   ├── 📄 memory.ts
│   │   │   │   ⚡ export async rephraseQueryForEmbedding(userMessage: string, conversationHistory: Array<{ role: string; content: string }>, user?: any): Promise<string>
│   │   │   │   ⚡ export async extractMemoriesFromConversation(userMessage: string, assistantResponse: string, existingMemories?: Array<{ content: string; similarity?: number }>): Promise<string[]>
│   │   │   ├── 📄 profile.ts
│   │   │   │   ⚡ calculateProfileCompleteness(user: User, updates: any): string
│   │   │   │   ⚡ export async extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any>
│   │   │   ├── 📄 search.ts
│   │   │   │   ⚡ export async decideBlogAnalysis(messages: ChatMessage[], user?: User): Promise<BlogAnalysisDecision>
│   │   │   │   ⚡ export async decideWebSearch(messages: ChatMessage[], user?: User): Promise<WebSearchDecision>
│   │   │   └── 📄 workflow.ts
│   │   │       ⚡ export async analyzeUserWritingStyle(postTexts: string[]): Promise<UserStyleAnalysis | null>
│   │   │       ⚡ export async buildWorkflowAwareSystemPrompt(workflowPhase: WorkflowPhaseDecision, user?: User, memories?: any[], webSearchContext?: { context: string; citations: string[] }, instagramAnalysisContext?: { analysis: any; cached: boolean; error?: string }): Promise<string>
│   │   │       ⚡ getPhaseSpecificGuidance(workflowPhase: WorkflowPhaseDecision): string
│   │   │       ⚡ export async decideWorkflowPhase(messages: ChatMessage[], user?: User): Promise<WorkflowPhaseDecision>
│   │   ├── 📄 grok.ts
│   │   │   📋 GrokSearchParameters
│   │   │   📋 CacheEntry
│   │   │   🏛️ GrokService
│   │   │   │  🏗️ constructor(): void
│   │   │   │  🔧 isConfigured(): boolean
│   │   │   │  🔧 generateCacheKey(query: string, searchParams?: GrokSearchParameters): string
│   │   │   │  🔧 simpleHash(str: string): string
│   │   │   │  🔧 isCacheEntryValid(entry: CacheEntry): boolean
│   │   │   │  🔧 getCachedResult(cacheKey: string): { context: string; citations: string[] } | null
│   │   │   │  🔧 setCachedResult(cacheKey: string, context: string, citations: string[]): void
│   │   │   │  🔧 evictLeastRecentlyUsed(): void
│   │   │   │  🔧 async search(query: string, options?: {
      socialHandles?: string[];
      excludeHandles?: string[];
      minFavorites?: number;
      minViews?: number;
      systemPrompt?: string;
    }): Promise<WebSearchResult>
│   │   │   │  🔧 extractCitations(content: string, sources?: any[]): string[]
│   │   │   │  🔧 async searchForChatContext(query: string, contextPrompt: string, socialHandles?: string[]): Promise<{ context: string; citations: string[] }>
│   │   ├── 📄 hikerapi.ts
│   │   │   📋 HikerAPIResponse
│   │   │   📋 HikerAPIUserData
│   │   │   🏛️ HikerAPIService
│   │   │   │  🏗️ constructor(): void
│   │   │   │  🔧 async request(endpoint: string, params?: Record<string, any>): Promise<T>
│   │   │   │  🔧 async getUserByUsername(username: string): Promise<HikerAPIUserData>
│   │   │   │  🔧 async getUserMediasChunk(userId: string, endCursor?: string): Promise<{ medias: InstagramPost[], endCursor: string | null }>
│   │   │   │  🔧 async getAllUserMedias(userId: string, maxAmount: number, maxRetries: number): Promise<InstagramPost[]>
│   │   │   │  🔧 async getRelatedProfiles(userId: string): Promise<any[]>
│   │   │   │  🔧 async analyzeInstagramProfile(username: string): Promise<InstagramProfile>
│   │   ├── 📄 openai.ts
│   │   │   ⚡ export async generateEmbedding(text: string): Promise<number[]>
│   │   └── 📄 perplexity.ts
│   │       📋 ChatMessage
│   │       📋 PerplexityMessage
│   │       📋 PerplexityResponse
│   │       📋 WebSearchResult
│   │       📋 CacheEntry
│   │       🏛️ PerplexityService
│   │       │  🏗️ constructor(): void
│   │       │  🔧 isConfigured(): boolean
│   │       │  🔧 generateCacheKey(query: string, recency?: string, domains?: string[], contextPrompt?: string): string
│   │       │  🔧 simpleHash(str: string): string
│   │       │  🔧 isCacheEntryValid(entry: CacheEntry): boolean
│   │       │  🔧 cleanupExpiredEntries(): void
│   │       │  🔧 getCachedResult(cacheKey: string): { context: string; citations: string[] } | null
│   │       │  🔧 setCachedResult(cacheKey: string, context: string, citations: string[]): void
│   │       │  🔧 evictLeastRecentlyUsed(): void
│   │       │  🔧 async search(query: string, options?: {
      model?: 'sonar' | 'llama-3.1-sonar-large-128k-online' | 'llama-3.1-sonar-huge-128k-online';
      temperature?: number;
      maxTokens?: number;
      searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year';
      searchDomainFilter?: string[];
      returnRelatedQuestions?: boolean;
      systemPrompt?: string;
    }): Promise<WebSearchResult>
│   │       │  🔧 async searchForChatContext(query: string, contextPrompt: string, recency?: 'hour' | 'day' | 'week' | 'month' | 'year', domains?: string[]): Promise<{ context: string; citations: string[] }>
│   │       │  🔧 shouldUseWebSearch(query: string): boolean
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
│   │   │  🔧 upsertMemory(memory: InsertMemory, similarityThreshold?: number): Promise<Memory>
│   │   │  🔧 deleteMemory(id: string): Promise<boolean>
│   │   │  🔧 searchSimilarMemories(userId: string, embedding: number[], limit?: number): Promise<(Memory & { similarity: number })[]>
│   │   │  🔧 updateUserSubscription(id: string, subscriptionData: Partial<UpdateUserSubscription>): Promise<User | undefined>
│   │   │  🔧 getSubscriptionPlans(): Promise<SubscriptionPlan[]>
│   │   │  🔧 createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>
│   │   │  🔧 getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>
│   │   │  🔧 incrementMessageUsage(userId: string): Promise<User | undefined>
│   │   │  🔧 resetMessageUsage(userId: string): Promise<User | undefined>
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
│   │   │  🔧 async upsertMemory(insertMemory: InsertMemory, similarityThreshold: number): Promise<Memory>
│   │   │  🔧 async deleteMemory(id: string): Promise<boolean>
│   │   │  🔧 async searchSimilarMemories(userId: string, embedding: number[], limit: number): Promise<(Memory & { similarity: number })[]>
│   │   │  🔧 async updateUserSubscription(id: string, subscriptionData: Partial<UpdateUserSubscription>): Promise<User | undefined>
│   │   │  🔧 async getSubscriptionPlans(): Promise<SubscriptionPlan[]>
│   │   │  🔧 async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>
│   │   │  🔧 async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>
│   │   │  🔧 async incrementMessageUsage(userId: string): Promise<User | undefined>
│   │   │  🔧 async resetMessageUsage(userId: string): Promise<User | undefined>
│   └── 📄 vite.ts
│       ⚡ export log(message: string, source: any): void
│       ⚡ export async setupVite(app: Express, server: Server): Promise<void>
│       ⚡ export serveStatic(app: Express): void
├── 📁 shared/
│   └── 📄 schema.ts
│       📋 InstagramProfile
│       📋 InstagramAccount
│       📋 InstagramPost
│       📋 SearchMessageMetadata
│       📋 MessageMetadata
├── 📄 tailwind.config.ts
└── 📄 vite.config.ts

```
