# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

## User Preferences
Preferred communication style: Simple, everyday language.

# Development Workflow Policies & Guidelines

**Version:** 2.0  
**Target:** 3-5 total tool calls for most modification requests

## Core Philosophy

The following principles guide all development work:

- **Find the source, not the symptom**
- **Fix the pattern, not just the instance**
- **Batch all related changes**
- **Trust development tools**
- **Stop when success is confirmed**
- **Trace to source, not symptoms** - Find the actual originating file/function, not just where errors surface

## File Prediction & Surgical Reading ⚠️ CRITICAL

### Core Principle
Always predict BOTH analysis files AND edit targets before starting.

### Mandatory Workflow
1. **Map problem** → affected system components → specific files
2. **Predict which files** you'll need to READ (analysis) AND EDIT (changes)
3. **Batch ALL predicted files** in initial information gathering
4. **Execute all changes** in single multi_edit operation

### File Prediction Rules
- **For UI issues:** Read component + parent + related hooks/state
- **For API issues:** Read routes + services + storage + schema
- **For data issues:** Read schema + storage + related API endpoints
- **For feature additions:** Read similar existing implementations

### Cost Optimization
- **Target:** 2 tool calls maximum: 1 read batch + 1 edit batch
- **Anti-pattern:** read → analyze → search → read more → edit
- **Optimal pattern:** read everything predicted → edit everything needed

### Success Metric
Zero search_codebase calls when project structure is known.

## Super-Batching Workflow ⚠️ CRITICAL

**Target:** 3-5 tool calls maximum for any feature implementation

### Phase 1: Planning Before Acting (MANDATORY - 0 tool calls)
- Map ALL information needed (files to read, searches to do) before starting
- Map ALL changes to make (edits, database updates, new files)
- Identify dependencies between operations
- Target minimum possible tool calls
- Read error stack traces completely - The deepest stack frame often contains the real issue
- Search for error patterns first before assuming location (e.g., "localStorage" across codebase)

### Phase 2: Information Gathering & Discovery (MAX PARALLELIZATION - 1-2 tool calls)
- Batch ALL independent reads/searches in one function_calls block
- **NEVER do:** read(file1) → analyze → read(file2) → analyze
- **ALWAYS do:** read(file1) + read(file2) + read(file3) + search_codebase() + grep()
- Only make sequential calls if later reads depend on analysis of earlier reads
- Use `search_codebase` ONLY if truly don't know where relevant code lives
- Otherwise, directly `read` target files in parallel (batch 3-6 files at once)
- Skip exploratory reading - be surgical about what you need

### Phase 3: Implementation & Pattern-Based Execution (AGGRESSIVE MULTI-EDITING - 1-3 tool calls)
- Use multi_edit for ANY file needing multiple changes
- **NEVER** do multiple separate edit() calls to same file
- Batch independent file changes in parallel
- **Example:** multi_edit(schema.ts) + multi_edit(routes.ts) + multi_edit(storage.ts)
- Plan all related changes upfront - Don't fix incrementally
- Identify change scope before starting - localStorage issue = all localStorage calls need fixing
- Apply patterns consistently - If one component needs safeLocalStorage, likely others do too
- Group by file impact - All changes to same file in one `multi_edit`
- Fix root causes, not band-aids - One proper fix beats multiple symptom patches

### Phase 4: Operations & Selective Validation (SMART BUNDLING - 0-1 tool calls)
- Bundle logically connected operations
- **Example:** bash("npm run db:push") + refresh_logs() + get_diagnostics() + restart_workflow()
- **NEVER** do sequential operations when they can be batched
- Skip validation for simple/obvious changes (< 5 lines, defensive patterns, imports)
- Only use expensive validation tools for substantial changes
- Stop immediately when development tools confirm success
- One `restart_workflow` only if runtime actually fails

### Cost Targets
- **Feature implementation:** 3-5 tool calls maximum
- **Bug fixes:** 2-3 tool calls maximum
- **Information gathering:** 1 tool call (parallel everything)
- **File modifications:** 1-2 tool calls (multi_edit everything)

### Decision Framework
Ask yourself:
- What else can I batch with this?
- Do I have ALL the information I need before making changes?
- Can I combine this edit with others using multi_edit?
- What's the dependency chain - can I collapse it?

**Success Metric:** Target 30-50% cost reduction compared to sequential approach.

## Tool Selection Matrix

### High-Value Low-Cost (use liberally)
- `read` (batch 3-6 files)
- `edit`/`multi_edit`
- `grep` with specific patterns

### Medium-Cost (use judiciously)
- `search_codebase` (only when truly lost)
- `get_latest_lsp_diagnostics` (complex changes only)

### High-Cost (use sparingly)
- `architect` (major issues only)
- `screenshot` (substantial changes only)
- `restart_workflow` (actual failures only)

## Mandatory Workflow Adherence

- **MAXIMUM 5 tool calls** for any change request
- No exploration - be surgical about file reading
- No incremental changes - make all related edits in one batch
- No workflow restarts unless runtime actually fails (not just for verification)
- Maximum 6 tools per batch to prevent overwhelming output

## Parallel Execution Rules

- Read multiple files simultaneously when investigating related issues
- Apply edits in parallel when files are independent
- Never serialize independent operations - batch aggressively
- Maximum 6 tools per batch to prevent overwhelming output

## Defensive Coding Patterns

- Apply sandbox-safe patterns by default (safeLocalStorage, safe DOM access)
- Wrap external API calls in try-catch from the start
- Use null-safe operations for optional properties
- Apply security patterns consistently across similar code

## Verification Rules

### Verification Anxiety Prevention
- **Stop checking once the development environment confirms success**
- Resist urge to "double-check" working changes
- Trust professional development tools over manual verification
- Remember: More verification ≠ better quality, just higher cost

### Stop Immediately When
- HMR shows successful reload
- Console logs show expected behavior
- LSP errors cleared for simple syntax fixes
- Development server responds correctly

### Never Verify When
- Change is < 5 lines of obvious code
- Only added try-catch wrappers or similar defensive patterns
- Just moved/renamed variables or functions
- Only updated imports or type annotations

## Strategic Sub-agent Delegation Guidelines ⚠️ CRITICAL

**Target:** Minimize overhead while maximizing execution efficiency

### Core Principle
Sub-agents are expensive tools that should be used very selectively.

### Cost Reality

**Overhead factors:**
- Context transfer overhead: 1-2 extra tool calls for problem explanation and handoff
- Cold-start reasoning: Each sub-agent rediscovers what primary agent already knows
- Tool multiplication: Two agents often double the read/edit/validate calls
- Coordination complexity: Merging outputs and reconciliation reviews

**Optimal approach:** Single agent with parallel tools can batch discovery + edits in 3-5 calls.

### Effective Delegation Scenarios

#### Independent Deliverables
- **Description:** Independent text deliverables
- **Examples:** Documentation, test plans, release notes, README files
- **Rationale:** Output doesn't require tight coordination with ongoing code changes

#### Specialized Audits
- **Description:** Specialized expertise audits
- **Examples:** Security reviews, performance analysis, accessibility passes
- **Rationale:** Requires deep specialized knowledge separate from main implementation

#### Research Tasks
- **Description:** Large, loosely coupled research tasks
- **Examples:** Background research while primary agent codes, API exploration
- **Rationale:** Can run in parallel without blocking main development flow

### Avoid Delegation For (MANDATORY)

**Anti-patterns:**
- Code fixes and refactors (our bread and butter)
- Pattern-based changes across files
- Schema/route/UI modifications
- React UI tweaks, route additions, API handler adjustments
- Anything well-served by grep+batch+HMR approach

**Rationale:** These require tight coordination and unified execution patterns.

### Decision Framework

1. **Is this an independent deliverable that doesn't affect ongoing code?**
   - If yes: Consider delegation
   - If no: Continue to next question

2. **Does this require specialized expertise separate from main task?**
   - If yes: Consider delegation
   - If no: Execute with single agent + parallel tools

### Single-Agent Focus

For 80-90% of development tasks, use proven single-agent patterns:
- **4-tool pattern:** discovery → batch execution → trust HMR
- Parallel tool usage for maximum efficiency
- Pattern-based fixes requiring tight coordination
- **Efficiency target:** 3-5 tool calls maximum for most modification requests

### Success Criteria
- Sub-agent usage limited to truly independent or specialized tasks
- No sub-agent delegation for standard CRUD, UI, or API tasks
- Maintain 3-5 call efficiency target for main development workflows

## Expert Architect Sub-Agent Usage Policy ⚠️ CRITICAL

**Cost Model:** Expensive Opus 4

### ⚠️ WARNING
CRITICAL: Architect uses expensive Opus 4 model - use SPARINGLY

### Self-Review First Principle

Before calling architect, I must first attempt to:
1. Self-assess code quality from architectural perspective
2. Review my changes for obvious issues, patterns, maintainability
3. Think through edge cases and potential improvements myself
4. Consider user requirements and ensure solution aligns with goals

### Usage Hierarchy (Ascending Expense)

#### Never Use For
- Simple code fixes (< 10 lines)
- Obvious syntax errors or imports
- Adding defensive patterns (try-catch, null checks)
- Straightforward feature additions
- When development tools (HMR, logs) confirm success

#### Only Use When I Genuinely Cannot
- **Debug complex issues** - When truly stuck after multiple approaches
- **Design system architecture** - For major structural decisions beyond my reasoning
- **Review substantial changes** - When changes >50 lines or affect core architecture
- **Evaluate trade-offs** - When multiple valid approaches exist and I need expert analysis

### Mandatory Self-Reflection

Ask myself these questions:
- "Have I thoroughly understood the problem scope?"
- "Can I identify the architectural concerns myself?"
- "Are there obvious code quality issues I can spot?"
- "Does this change align with project patterns and goals?"
- "Am I calling architect due to laziness or genuine complexity?"

**Goal:** The goal is to develop my own architectural thinking, not outsource it.

## Workflow Examples

### Successful Example: localStorage Fix (4 tool calls)
1. **Discovery:** Read replit.md + search codebase + read target file (parallel)
2. **Execution:** Applied safeLocalStorage wrapper to all localStorage calls (multi_edit)
3. **Result:** Fixed SecurityError in sandboxed environments
4. **No over-verification:** Trusted HMR reload confirmation

### Inefficient Example: Previous Approach (11 tool calls)
**Problems:**
- Multiple exploratory reads
- Incremental fixes
- Excessive verification (screenshots, log checks, restarts)
- Verification anxiety leading to over-checking

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
│       │   ├── 📁 chat/
│       │   │   ├── 📄 message-input.tsx
│       │   │   │   ⚡ export MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps): Element
│       │   │   │   📋 MessageInputProps
│       │   │   ├── 📄 message-list.tsx
│       │   │   │   ⚡ export MessageList({ 
  messages, 
  streamingMessage, 
  isStreaming, 
  user,
  conversationId 
}: MessageListProps): Element
│       │   │   │   📋 MessageListProps
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
│       │   └── 📁 ui/
│       │       ├── 📄 accordion.tsx
│       │       ├── 📄 alert-dialog.tsx
│       │       │   ➡️ AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       │   ➡️ AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       ├── 📄 alert.tsx
│       │       ├── 📄 aspect-ratio.tsx
│       │       ├── 📄 avatar.tsx
│       │       ├── 📄 badge.tsx
│       │       │   ⚡ Badge({ className, variant, ...props }: BadgeProps): Element
│       │       │   📋 BadgeProps
│       │       ├── 📄 breadcrumb.tsx
│       │       │   ➡️ BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">): Element
│       │       │   ➡️ BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">): Element
│       │       ├── 📄 button.tsx
│       │       │   📋 ButtonProps
│       │       ├── 📄 calendar.tsx
│       │       │   ⚡ Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps): Element
│       │       ├── 📄 card.tsx
│       │       ├── 📄 carousel.tsx
│       │       │   ⚡ useCarousel(): CarouselContextProps
│       │       ├── 📄 chart.tsx
│       │       │   ⚡ useChart(): ChartContextProps
│       │       │   ➡️ ChartStyle({ id, config }: { id: string; config: ChartConfig }): Element | null
│       │       │   ⚡ getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string): ({ label?: ReactNode; icon?: ComponentType<{}> | undefined; } & ({ color?: string | undefined; theme?: undefined; } | { color?: undefined; theme: Record<"light" | "dark", string>; })) | undefined
│       │       ├── 📄 checkbox.tsx
│       │       ├── 📄 collapsible.tsx
│       │       ├── 📄 command.tsx
│       │       │   ➡️ CommandDialog({ children, ...props }: DialogProps): Element
│       │       │   ➡️ CommandShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): Element
│       │       ├── 📄 context-menu.tsx
│       │       │   ➡️ ContextMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): Element
│       │       ├── 📄 dialog.tsx
│       │       │   ➡️ DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       │   ➡️ DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       ├── 📄 drawer.tsx
│       │       │   ➡️ Drawer({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>): Element
│       │       │   ➡️ DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       │   ➡️ DrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       ├── 📄 dropdown-menu.tsx
│       │       │   ➡️ DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): Element
│       │       ├── 📄 form.tsx
│       │       │   ➡️ FormField({
  ...props
}: ControllerProps<TFieldValues, TName>): Element
│       │       │   ➡️ useFormField(): { invalid: boolean; isDirty: boolean; isTouched: boolean; isValidating: boolean; error?: FieldError | undefined; id: string; name: string; formItemId: string; formDescriptionId: string; formMessageId: string; }
│       │       ├── 📄 hover-card.tsx
│       │       ├── 📄 input-otp.tsx
│       │       ├── 📄 input.tsx
│       │       ├── 📄 label.tsx
│       │       ├── 📄 menubar.tsx
│       │       │   ⚡ MenubarMenu({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>): Element
│       │       │   ⚡ MenubarGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>): Element
│       │       │   ⚡ MenubarPortal({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>): Element
│       │       │   ⚡ MenubarRadioGroup({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>): Element
│       │       │   ⚡ MenubarSub({
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>): Element
│       │       │   ➡️ MenubarShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): Element
│       │       ├── 📄 navigation-menu.tsx
│       │       ├── 📄 pagination.tsx
│       │       │   ➡️ Pagination({ className, ...props }: React.ComponentProps<"nav">): Element
│       │       │   ➡️ PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps): Element
│       │       │   ➡️ PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>): Element
│       │       │   ➡️ PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>): Element
│       │       │   ➡️ PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">): Element
│       │       ├── 📄 popover.tsx
│       │       ├── 📄 progress.tsx
│       │       ├── 📄 radio-group.tsx
│       │       ├── 📄 resizable.tsx
│       │       │   ➡️ ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>): Element
│       │       │   ➡️ ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}): Element
│       │       ├── 📄 scroll-area.tsx
│       │       ├── 📄 select.tsx
│       │       ├── 📄 separator.tsx
│       │       ├── 📄 sheet.tsx
│       │       │   ➡️ SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       │   ➡️ SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       │   📋 SheetContentProps
│       │       ├── 📄 sidebar.tsx
│       │       │   ⚡ useSidebar(): SidebarContextProps
│       │       ├── 📄 skeleton.tsx
│       │       │   ⚡ Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): Element
│       │       ├── 📄 slider.tsx
│       │       ├── 📄 switch.tsx
│       │       ├── 📄 table.tsx
│       │       ├── 📄 tabs.tsx
│       │       ├── 📄 textarea.tsx
│       │       ├── 📄 toast.tsx
│       │       ├── 📄 toaster.tsx
│       │       │   ⚡ export Toaster(): Element
│       │       ├── 📄 toggle-group.tsx
│       │       ├── 📄 toggle.tsx
│       │       └── 📄 tooltip.tsx
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