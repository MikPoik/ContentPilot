# ContentCraft AI

## Overview

ContentCraft AI is a full-stack web application that serves as an AI-powered social media content strategist. The application features a chat interface where users can interact with an AI assistant to brainstorm content ideas, get platform-specific advice, and plan their social media strategy. Built as a modern React SPA with an Express backend, it uses PostgreSQL for data persistence and OpenAI's GPT-4o for AI-powered conversations.

## User Preferences

Preferred communication style: Simple, everyday language.

### Agent policy for the project

<?xml version="1.0" encoding="UTF-8"?>
<development-workflow-policy>
  <title>Development Workflow Policies &amp; Guidelines</title>
  <version>2.0</version>
  <target>3-5 total tool calls for most modification requests</target>

  <!-- Core Philosophy -->
  <core-principles>
    <principle>Find the source, not the symptom</principle>
    <principle>Fix the pattern, not just the instance</principle>
    <principle>Batch all related changes</principle>
    <principle>Trust development tools</principle>
    <principle>Stop when success is confirmed</principle>
    <principle>Trace to source, not symptoms - Find the actual originating file/function, not just where errors surface</principle>
  </core-principles>
  
  <!-- File Prediction & Surgical Reading -->
  <file-prediction-mastery priority="CRITICAL">
    <core-principle>Always predict BOTH analysis files AND edit targets before starting</core-principle>
  
    <mandatory-workflow>
      <step-1>Map problem → affected system components → specific files</step-1>
      <step-2>Predict which files you'll need to READ (analysis) AND EDIT (changes)</step-2>
      <step-3>Batch ALL predicted files in initial information gathering</step-3>
      <step-4>Execute all changes in single multi_edit operation</step-4>
    </mandatory-workflow>
    <file-prediction-rules>
      <rule>For UI issues: Read component + parent + related hooks/state</rule>
      <rule>For API issues: Read routes + services + storage + schema</rule>
      <rule>For data issues: Read schema + storage + related API endpoints</rule>
      <rule>For feature additions: Read similar existing implementations</rule>
    </file-prediction-rules>
    <cost-optimization>
      <target>2 tool calls maximum: 1 read batch + 1 edit batch</target>
      <anti-pattern>read → analyze → search → read more → edit</anti-pattern>
      <optimal-pattern>read everything predicted → edit everything needed</optimal-pattern>
    </cost-optimization>
    <success-metric>Zero search_codebase calls when project structure is known</success-metric>
  </file-prediction-mastery>
  
  <!-- Super-Batching Workflow -->
  <super-batching-workflow priority="CRITICAL">
    <target>3-5 tool calls maximum for any feature implementation</target>
    
    <phase-1 name="Planning Before Acting" requirement="MANDATORY" max-calls="0">
      <rule>Map ALL information needed (files to read, searches to do) before starting</rule>
      <rule>Map ALL changes to make (edits, database updates, new files)</rule>
      <rule>Identify dependencies between operations</rule>
      <rule>Target minimum possible tool calls</rule>
      <rule>Read error stack traces completely - The deepest stack frame often contains the real issue</rule>
      <rule>Search for error patterns first before assuming location (e.g., "localStorage" across codebase)</rule>
    </phase-1>

    <phase-2 name="Information Gathering &amp; Discovery" requirement="MAX PARALLELIZATION" max-calls="1-2">
      <rule>Batch ALL independent reads/searches in one function_calls block</rule>
      <rule>NEVER do: read(file1) → analyze → read(file2) → analyze</rule>
      <rule>ALWAYS do: read(file1) + read(file2) + read(file3) + search_codebase() + grep()</rule>
      <rule>Only make sequential calls if later reads depend on analysis of earlier reads</rule>
      <rule>Use `search_codebase` ONLY if truly don't know where relevant code lives</rule>
      <rule>Otherwise, directly `read` target files in parallel (batch 3-6 files at once)</rule>
      <rule>Skip exploratory reading - be surgical about what you need</rule>
    </phase-2>

    <phase-3 name="Implementation &amp; Pattern-Based Execution" requirement="AGGRESSIVE MULTI-EDITING" max-calls="1-3">
      <rule>Use multi_edit for ANY file needing multiple changes</rule>
      <rule>NEVER do multiple separate edit() calls to same file</rule>
      <rule>Batch independent file changes in parallel</rule>
      <rule>Example: multi_edit(schema.ts) + multi_edit(routes.ts) + multi_edit(storage.ts)</rule>
      <rule>Plan all related changes upfront - Don't fix incrementally</rule>
      <rule>Identify change scope before starting - localStorage issue = all localStorage calls need fixing</rule>
      <rule>Apply patterns consistently - If one component needs safeLocalStorage, likely others do too</rule>
      <rule>Group by file impact - All changes to same file in one `multi_edit`</rule>
      <rule>Fix root causes, not band-aids - One proper fix beats multiple symptom patches</rule>
    </phase-3>

    <phase-4 name="Operations &amp; Selective Validation" requirement="SMART BUNDLING" max-calls="0-1">
      <rule>Bundle logically connected operations</rule>
      <rule>Example: bash("npm run db:push") + refresh_logs() + get_diagnostics() + restart_workflow()</rule>
      <rule>NEVER do sequential operations when they can be batched</rule>
      <rule>Skip validation for simple/obvious changes (&lt; 5 lines, defensive patterns, imports)</rule>
      <rule>Only use expensive validation tools for substantial changes</rule>
      <rule>Stop immediately when development tools confirm success</rule>
      <rule>One `restart_workflow` only if runtime actually fails</rule>
    </phase-4>

    <cost-targets>
      <feature-implementation max-calls="5">Feature implementation: 3-5 tool calls maximum</feature-implementation>
      <bug-fixes max-calls="3">Bug fixes: 2-3 tool calls maximum</bug-fixes>
      <information-gathering max-calls="1">Information gathering: 1 tool call (parallel everything)</information-gathering>
      <file-modifications max-calls="2">File modifications: 1-2 tool calls (multi_edit everything)</file-modifications>
    </cost-targets>

    <decision-framework>
      <question>What else can I batch with this?</question>
      <question>Do I have ALL the information I need before making changes?</question>
      <question>Can I combine this edit with others using multi_edit?</question>
      <question>What's the dependency chain - can I collapse it?</question>
    </decision-framework>

    <success-metric>Target: 30-50% cost reduction compared to sequential approach</success-metric>
  </super-batching-workflow>

  <!-- Tool Selection Matrix -->
  <tool-selection-matrix>
    <high-value-low-cost description="use liberally">
      <tool>`read` (batch 3-6 files)</tool>
      <tool>`edit`/`multi_edit`</tool>
      <tool>`grep` with specific patterns</tool>
    </high-value-low-cost>

    <medium-cost description="use judiciously">
      <tool>`search_codebase` (only when truly lost)</tool>
      <tool>`get_latest_lsp_diagnostics` (complex changes only)</tool>
    </medium-cost>

    <high-cost description="use sparingly">
      <tool>`architect` (major issues only)</tool>
      <tool>`screenshot` (substantial changes only)</tool>
      <tool>`restart_workflow` (actual failures only)</tool>
    </high-cost>
  </tool-selection-matrix>

  <!-- Mandatory Workflow Adherence -->
  <mandatory-workflow-adherence>
    <rule>MAXIMUM 5 tool calls for any change request</rule>
    <rule>No exploration - be surgical about file reading</rule>
    <rule>No incremental changes - make all related edits in one batch</rule>
    <rule>No workflow restarts unless runtime actually fails (not just for verification)</rule>
    <rule>Maximum 6 tools per batch to prevent overwhelming output</rule>
  </mandatory-workflow-adherence>

  <!-- Parallel Execution Rules -->
  <parallel-execution-rules>
    <rule>Read multiple files simultaneously when investigating related issues</rule>
    <rule>Apply edits in parallel when files are independent</rule>
    <rule>Never serialize independent operations - batch aggressively</rule>
    <rule>Maximum 6 tools per batch to prevent overwhelming output</rule>
  </parallel-execution-rules>

  <!-- Defensive Coding Patterns -->
  <defensive-coding-patterns>
    <pattern>Apply sandbox-safe patterns by default (safeLocalStorage, safe DOM access)</pattern>
    <pattern>Wrap external API calls in try-catch from the start</pattern>
    <pattern>Use null-safe operations for optional properties</pattern>
    <pattern>Apply security patterns consistently across similar code</pattern>
  </defensive-coding-patterns>

  <!-- Verification Rules -->
  <verification-anxiety-prevention>
    <principle>Stop checking once the development environment confirms success</principle>
    <principle>Resist urge to "double-check" working changes</principle>
    <principle>Trust professional development tools over manual verification</principle>
    <principle>Remember: More verification ≠ better quality, just higher cost</principle>
  </verification-anxiety-prevention>

  <verification-stopping-conditions description="Stop immediately when">
    <condition>HMR shows successful reload</condition>
    <condition>Console logs show expected behavior</condition>
    <condition>LSP errors cleared for simple syntax fixes</condition>
    <condition>Development server responds correctly</condition>
  </verification-stopping-conditions>

  <never-verify-when>
    <condition>Change is &lt; 5 lines of obvious code</condition>
    <condition>Only added try-catch wrappers or similar defensive patterns</condition>
    <condition>Just moved/renamed variables or functions</condition>
    <condition>Only updated imports or type annotations</condition>
  </never-verify-when>

<sub-agent-usage-policy priority="CRITICAL">
  <title>Strategic Sub-agent Delegation Guidelines</title>
  <version>1.0</version>
  <target>Minimize overhead while maximizing execution efficiency</target>
  <!-- Core Philosophy -->
  <core-principle>Sub-agents are expensive tools that should be used very selectively</core-principle>

  <!-- Cost Analysis -->
  <cost-reality>
    <overhead-factors>
      <factor>Context transfer overhead: 1-2 extra tool calls for problem explanation and handoff</factor>
      <factor>Cold-start reasoning: Each sub-agent rediscovers what primary agent already knows</factor>
      <factor>Tool multiplication: Two agents often double the read/edit/validate calls</factor>
      <factor>Coordination complexity: Merging outputs and reconciliation reviews</factor>
    </overhead-factors>

    <optimal-approach>Single agent with parallel tools can batch discovery + edits in 3-5 calls</optimal-approach>
  </cost-reality>
  <!-- Strategic Use Cases -->
  <effective-delegation-scenarios>
    <scenario type="independent-deliverables">
      <description>Independent text deliverables</description>
      <examples>Documentation, test plans, release notes, README files</examples>
      <rationale>Output doesn't require tight coordination with ongoing code changes</rationale>
    </scenario>

    <scenario type="specialized-audits">
      <description>Specialized expertise audits</description>
      <examples>Security reviews, performance analysis, accessibility passes</examples>
      <rationale>Requires deep specialized knowledge separate from main implementation</rationale>
    </scenario>

    <scenario type="research-tasks">
      <description>Large, loosely coupled research tasks</description>
      <examples>Background research while primary agent codes, API exploration</examples>
      <rationale>Can run in parallel without blocking main development flow</rationale>
    </scenario>
  </effective-delegation-scenarios>
  <!-- Anti-patterns -->
  <avoid-delegation-for priority="MANDATORY">
    <anti-pattern>Code fixes and refactors (our bread and butter)</anti-pattern>
    <anti-pattern>Pattern-based changes across files</anti-pattern>
    <anti-pattern>Schema/route/UI modifications</anti-pattern>
    <anti-pattern>React UI tweaks, route additions, API handler adjustments</anti-pattern>
    <anti-pattern>Anything well-served by grep+batch+HMR approach</anti-pattern>
    <rationale>These require tight coordination and unified execution patterns</rationale>
  </avoid-delegation-for>
  <!-- Decision Framework -->
  <delegation-decision-tree>
    <question>Is this an independent deliverable that doesn't affect ongoing code?</question>
    <if-yes>Consider delegation</if-yes>
    <if-no>
      <question>Does this require specialized expertise separate from main task?</question>
      <if-yes>Consider delegation</if-yes>
      <if-no>Execute with single agent + parallel tools</if-no>
    </if-no>
  </delegation-decision-tree>
  <!-- Recommended Approach -->
  <single-agent-focus>
    <recommendation>For 80-90% of development tasks, use proven single-agent patterns:</recommendation>
    <pattern>4-tool pattern: discovery → batch execution → trust HMR</pattern>
    <pattern>Parallel tool usage for maximum efficiency</pattern>
    <pattern>Pattern-based fixes requiring tight coordination</pattern>
    <efficiency-target>3-5 tool calls maximum for most modification requests</efficiency-target>
  </single-agent-focus>
  <!-- Success Metrics -->
  <success-criteria>
    <metric>Sub-agent usage limited to truly independent or specialized tasks</metric>
    <metric>No sub-agent delegation for standard CRUD, UI, or API tasks</metric>
    <metric>Maintain 3-5 call efficiency target for main development workflows</metric>
  </success-criteria>
</sub-agent-usage-policy>

  <!-- Expert Architect Sub-Agent Usage Policy -->
  <architect-usage-policy priority="CRITICAL" cost-model="expensive Opus 4">
    <warning>⚠️ CRITICAL: Architect uses expensive Opus 4 model - use SPARINGLY</warning>
    
    <self-review-first-principle>
      <description>Before calling architect, I must first attempt to:</description>
      <step>Self-assess code quality from architectural perspective</step>
      <step>Review my changes for obvious issues, patterns, maintainability</step>
      <step>Think through edge cases and potential improvements myself</step>
      <step>Consider user requirements and ensure solution aligns with goals</step>
    </self-review-first-principle>

    <usage-hierarchy description="ascending expense">
      <never-use>
        <case>Simple code fixes (&lt; 10 lines)</case>
        <case>Obvious syntax errors or imports</case>
        <case>Adding defensive patterns (try-catch, null checks)</case>
        <case>Straightforward feature additions</case>
        <case>When development tools (HMR, logs) confirm success</case>
      </never-use>

      <only-use-when description="I genuinely cannot">
        <case>Debug complex issues - When truly stuck after multiple approaches</case>
        <case>Design system architecture - For major structural decisions beyond my reasoning</case>
        <case>Review substantial changes - When changes >50 lines or affect core architecture</case>
        <case>Evaluate trade-offs - When multiple valid approaches exist and I need expert analysis</case>
      </only-use-when>
    </usage-hierarchy>

    <mandatory-self-reflection>
      <description>Ask myself these questions:</description>
      <question>"Have I thoroughly understood the problem scope?"</question>
      <question>"Can I identify the architectural concerns myself?"</question>
      <question>"Are there obvious code quality issues I can spot?"</question>
      <question>"Does this change align with project patterns and goals?"</question>
      <question>"Am I calling architect due to laziness or genuine complexity?"</question>
    </mandatory-self-reflection>

    <goal>The goal is to develop my own architectural thinking, not outsource it</goal>
  </architect-usage-policy>

  <!-- Success Examples -->
  <workflow-examples>
    <successful-example name="localStorage Fix" tool-calls="4">
      <step number="1">Discovery: Read replit.md + search codebase + read target file (parallel)</step>
      <step number="2">Execution: Applied safeLocalStorage wrapper to all localStorage calls (multi_edit)</step>
      <step number="3">Result: Fixed SecurityError in sandboxed environments</step>
      <step number="4">No over-verification: Trusted HMR reload confirmation</step>
    </successful-example>

    <inefficient-example name="Previous Approach" tool-calls="11">
      <problem>Multiple exploratory reads</problem>
      <problem>Incremental fixes</problem>
      <problem>Excessive verification (screenshots, log checks, restarts)</problem>
      <problem>Verification anxiety leading to over-checking</problem>
    </inefficient-example>
  </workflow-examples>
</development-workflow-policy>


## Project Structure

A full-stack TypeScript app: React + Vite + Tailwind (client), Express + Drizzle ORM + Neon Postgres (server), OpenAI GPT-4o integration, and Replit OIDC auth. Built as a single process that serves both API and SPA.

- `/` (root)
  - `package.json` — Project metadata, scripts (`dev`, `build`, `start`, `db:push`), dependencies.
  - `package-lock.json` — Locked dependency versions.
  - `tsconfig.json` — TypeScript config with path aliases (`@`, `@shared`).
  - `vite.config.ts` — Vite config for client build/dev, aliases, Replit plugins.
  - `tailwind.config.ts` — Tailwind theme, content paths, plugins.
  - `postcss.config.js` — PostCSS plugins (Tailwind, Autoprefixer).
  - `drizzle.config.ts` — Drizzle Kit config (schema path, migrations dir, DATABASE_URL).
  - `components.json` — shadcn/ui generator configuration and path aliases.
  - `replit.md` — Project overview and development workflow policies.
  - `attached_assets/` — Static assets used by the app.
    - `image_1753874927528.png` — Image asset.
  - `shared/` — Code shared across server and client.
    - `schema.ts` — Drizzle schema and Zod helpers for `sessions`, `users`, `conversations`, `messages`; exported types and insert/update schemas.

- `server/` — Express API + auth + persistence + dev server wiring
  - `index.ts` — Bootstraps Express, JSON parsing, request logging for `/api/*`, registers routes, global error handler, mounts Vite dev middleware (dev) or static files (prod), starts HTTP server on `PORT`.
  - `routes.ts` — REST API routes secured by auth:
    - `GET /api/auth/user` — Current user profile.
    - Conversation CRUD: list, get, create, delete.
    - Messages: list for conversation; `POST` streams assistant response, persists both user and AI messages, updates title and profile.
    - Returns the created `http.Server` for Vite HMR.
  - `storage.ts` — Data access layer using Drizzle. `IStorage` interface and `DatabaseStorage` implementation for users (get/upsert/updateProfile), conversations (CRUD), and messages (CRUD, ordered); keeps conversation `updatedAt` fresh.
  - `db.ts` — Neon serverless Postgres pool + Drizzle client, loads `@shared/schema`; requires `DATABASE_URL`.
  - `services/openai.ts` — OpenAI client and chat domain logic:
    - Builds personalized system prompt from user profile.
    - `generateChatResponse` — Streams GPT-4o completions via Web API `ReadableStream<string>`.
    - `generateConversationTitle` — Short title from recent turns.
    - `extractProfileInfo` — LLM-assisted extraction of profile fields from a turn; computes completeness.
  - `replitAuth.ts` — Replit OIDC auth with Passport/OpenID:
    - Session storage via `connect-pg-simple` (table `sessions`).
    - Multi-domain strategy setup from `REPLIT_DOMAINS`; login, callback, logout routes.
    - `isAuthenticated` middleware with token refresh flow; user upsert on login.
  - `vite.ts` — Dev tooling integration and static serving:
    - `setupVite` mounts Vite middleware and transforms `index.html` with a cache-busting query.
    - `serveStatic` serves built SPA from `dist/public` in production.
    - `log` helper for formatted console logs.

- `client/` — React SPA (Vite)
  - `index.html` — SPA shell mounting `#root`, loads `/src/main.tsx`.
  - `src/main.tsx` — React root renderer.
  - `src/App.tsx` — App providers (React Query, Tooltip, Toaster) and routes (Wouter): Landing for unauthenticated, Chat for `/` and `/chat/:id?` when authenticated.
  - `src/index.css` — Tailwind layers, design tokens (CSS variables), and keyframe utilities (fade, typing, bounce).
  - `src/pages/`
    - `landing.tsx` — Marketing/entry page with CTA to `/api/login` and feature highlights.
    - `chat.tsx` — Chat experience: loads conversations/messages, optimistic user/assistant messages, streaming via `fetch` reader, mobile sidebar, logout button.
    - `not-found.tsx` — Simple 404 screen.
  - `src/components/chat/`
    - `sidebar.tsx` — Left sidebar: new conversation, list with relative times, delete action, user mini-profile; mobile close behavior.
    - `message-list.tsx` — Scrollable thread with Markdown rendering for assistant, welcome message for empty/new chats, inline streaming placeholder.
    - `message-input.tsx` — Textarea with Enter-to-send, char limit, and send button.
    - `typing-indicator.tsx` — Animated three-dot typing indicator.
  - `src/components/ui/` — shadcn/ui primitives and wrappers used across the app.
    - `accordion.tsx` — Collapsible content sections.
    - `alert-dialog.tsx` — Modal confirmation dialogs.
    - `alert.tsx` — Inline alert styles.
    - `aspect-ratio.tsx` — Box maintaining aspect ratio.
    - `avatar.tsx` — User avatar primitive.
    - `badge.tsx` — Status/label chips.
    - `breadcrumb.tsx` — Breadcrumb navigation.
    - `button.tsx` — Button variants.
    - `calendar.tsx` — Date picker component.
    - `card.tsx` — Card layout container.
    - `carousel.tsx` — Carousel wrapper around Embla.
    - `chart.tsx` — Chart container/styles for Recharts.
    - `checkbox.tsx` — Checkbox control.
    - `collapsible.tsx` — Show/hide wrapper.
    - `command.tsx` — Command palette primitives (cmdk).
    - `context-menu.tsx` — Context menu wrapper.
    - `dialog.tsx` — Dialog/modal primitive.
    - `drawer.tsx` — Drawer/sheet UI.
    - `dropdown-menu.tsx` — Dropdown menu.
    - `form.tsx` — Form field helpers with React Hook Form.
    - `hover-card.tsx` — Hover-activated info card.
    - `input-otp.tsx` — OTP input field group.
    - `input.tsx` — Text input.
    - `label.tsx` — Form label.
    - `menubar.tsx` — Menu bar components.
    - `navigation-menu.tsx` — Top navigation menu.
    - `pagination.tsx` — Pagination controls.
    - `popover.tsx` — Popover wrapper.
    - `progress.tsx` — Progress bar.
    - `radio-group.tsx` — Radio inputs.
    - `resizable.tsx` — Resizable panels.
    - `scroll-area.tsx` — Scrollable container.
    - `select.tsx` — Select dropdown.
    - `separator.tsx` — Horizontal/vertical separators.
    - `sheet.tsx` — Sheet/side panel.
    - `sidebar.tsx` — Advanced responsive sidebar system with offcanvas/icon modes and keyboard toggle.
    - `skeleton.tsx` — Loading skeletons.
    - `slider.tsx` — Slider input.
    - `switch.tsx` — Toggle switch.
    - `table.tsx` — Table primitives.
    - `tabs.tsx` — Tabs UI.
    - `textarea.tsx` — Textarea input.
    - `toast.tsx` — Toast primitives; used by `Toaster`.
    - `toaster.tsx` — Toast container component.
    - `toggle-group.tsx` — Toggle button group.
    - `toggle.tsx` — Toggle button.
    - `tooltip.tsx` — Tooltip primitives.
  - `src/hooks/`
    - `useAuth.ts` — React Query hook to fetch `/api/auth/user`; returns auth state.
    - `use-mobile.tsx` — Media-query-based mobile breakpoint detection.
    - `use-toast.ts` — Client-side toast store/utilities (imperative API and hook).
  - `src/lib/`
    - `queryClient.ts` — Configured React Query client, default `queryFn`, and `apiRequest` helper with credentials and error handling.
    - `authUtils.ts` — Helpers to detect `401 Unauthorized` errors.
    - `utils.ts` — `cn` className utility using `clsx` and `tailwind-merge`.

## Notes
- Environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `REPLIT_DOMAINS`, `SESSION_SECRET`, `ISSUER_URL`, `REPL_ID`, `PORT` are used across server/auth/DB.
- Build outputs: Client builds to `dist/public`; server bundles to `dist/index.js` via esbuild.
- Data model: Users own Conversations, which have Messages; sessions table supports Replit auth sessions.

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