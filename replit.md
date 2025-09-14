# ContentCraft AI

## Overview
ContentCraft AI is an AI-powered social media content strategist delivered as a full-stack web application. It provides a chat interface for users to interact with an AI assistant for content brainstorming, platform-specific advice, and strategic planning. The project aims to streamline social media presence and enhance content creation efficiency for content creators and marketers.

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
      <rule>Apply patterns consistently - If one component needs safeLocalStorage, likely others do safeLocalStorage too</rule>
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