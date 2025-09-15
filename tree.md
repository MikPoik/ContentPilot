# Source Code Tree

Generated on: 2025-09-15T10:02:24.959Z

```
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

```
