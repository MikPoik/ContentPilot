import { type User } from "@shared/schema";
import { openai } from "../openai";

import OpenAI from "openai";

// Centralized OpenAI client initialization
const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// Shared types for AI services (centralized in intent.ts)
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface WebSearchDecision {
  shouldSearch: boolean;
  confidence: number;
  reason: string;
  refinedQuery: string;
  recency: "hour" | "day" | "week" | "month" | "year";
  domains: string[];
  searchService: "perplexity" | "grok";
  socialHandles?: string[];
}

export interface InstagramAnalysisDecision {
  shouldAnalyze: boolean;
  username?: string;
  confidence: number;
  reason: string;
  isOwnProfile?: boolean; // true = user's profile, false = competitor, undefined = fallback logic
}

export interface InstagramHashtagDecision {
  shouldSearch: boolean;
  hashtag?: string;
  confidence: number;
  reason: string;
}

export interface BlogAnalysisDecision {
  shouldAnalyze: boolean;
  urls: string[];
  confidence: number;
  reason: string;
}

export interface WorkflowPhaseDecision {
  currentPhase: string;
  missingFields: string[];
  readyToAdvance: boolean;
  suggestedPrompts: string[];
  profilePatch: any;
  shouldBlockContentGeneration: boolean;
  confidence: number;
}

export interface ProfileUpdateDecision {
  shouldExtract: boolean;
  confidence: number;
  reason: string;
  expectedFields: string[];
}

export interface UnifiedIntentDecision {
  webSearch: WebSearchDecision;
  instagramAnalysis: InstagramAnalysisDecision;
  instagramHashtagSearch: InstagramHashtagDecision;
  blogAnalysis: BlogAnalysisDecision;
  workflowPhase: WorkflowPhaseDecision;
  profileUpdate: ProfileUpdateDecision;
}

export interface UserStyleAnalysis {
  toneKeywords: string[];
  avgSentenceLength: number;
  commonPhrases: string[];
  punctuationStyle: string;
  contentThemes: string[];
  voiceCharacteristics: string;
  sources?: string[]; // Track where style data came from: 'instagram', 'blog', etc.
}

export interface BlogProfile {
  analyzedUrls: string[];
  writingStyle: string;
  averagePostLength: string;
  commonTopics: string[];
  toneKeywords: string[];
  contentThemes: string[];
  brandVoice: string;
  targetAudience?: string;
  postingPattern?: string;
  cached_at: string;
}

export interface BlogAnalysisResult {
  success: boolean;
  analysis?: BlogProfile;
  cached?: boolean;
  error?: string;
}

/**
 * Safe JSON parsing utility with proper error handling and sanitization
 */
export function safeJsonParse<T>(
  jsonString: string,
  fallback: T,
  options: {
    removeBrackets?: boolean;
    removeCodeBlocks?: boolean;
    timeout?: number;
  } = {},
): T {
  try {
    let sanitized = jsonString.trim();

    // Remove code blocks if present
    if (options.removeCodeBlocks !== false) {
      if (sanitized.startsWith("```") && sanitized.endsWith("```")) {
        const lines = sanitized.split("\n");
        sanitized = lines.slice(1, -1).join("\n");
      }

      if (sanitized.startsWith("json\n")) {
        sanitized = sanitized.replace("json\n", "");
      }
    }

    // Find the first complete JSON object
    if (options.removeBrackets !== false) {
      const firstBraceIndex = sanitized.indexOf("{");
      if (firstBraceIndex !== -1) {
        let braceCount = 0;
        let endIndex = firstBraceIndex;

        for (let i = firstBraceIndex; i < sanitized.length; i++) {
          if (sanitized[i] === "{") braceCount++;
          else if (sanitized[i] === "}") braceCount--;

          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }

        if (braceCount === 0) {
          sanitized = sanitized.substring(firstBraceIndex, endIndex + 1);
        }
      }
    }

    return JSON.parse(sanitized.trim()) as T;
  } catch (error) {
    console.error("JSON parsing failed:", error, "Input:", jsonString);
    return fallback;
  }
}

/**
 * Unified intent classification system that analyzes conversation context once
 * and returns decisions for all four decision types in a single AI call.
 * Uses semantic understanding for truly language-agnostic pattern detection.
 */
export async function analyzeUnifiedIntent(
  messages: ChatMessage[],
  user?: User,
  relevantMemories: any[] = [],
): Promise<UnifiedIntentDecision> {
  const startTime = Date.now();
  const timeoutMs = 120000; // Reduced to 4 seconds for faster response

  try {
    console.log(`🧠 [UNIFIED_INTENT] Starting unified intent analysis...`);

    // Get last 4 messages for context (optimized for performance)
    const contextMessages = messages.slice(-4);
    const currentDate = new Date().toISOString().split("T")[0];

    // Build user context efficiently
    let userContext = "CURRENT USER PROFILE STATUS:\n";
    if (user) {
      const data = user.profileData as any || {};

      // Check what we actually have
      const hasName = !!(user.firstName);
      const hasNiche = !!(user.contentNiche && user.contentNiche?.length > 0);
      const hasPlatform = !!((user as any).primaryPlatforms?.length || user.primaryPlatform);
      const hasTargetAudience = !!(data.targetAudience);
      const hasBrandVoice = !!(data.brandVoice);
      const hasContentGoals = !!(data.contentGoals?.length);
      const hasBusinessType = !!(data.businessType);

      // Calculate profile completeness score
      const profileScore = parseInt(user.profileCompleteness || '0');

      userContext += `PROFILE COMPLETENESS SCORE: ${profileScore}%
${profileScore >= 60 ? '✅ Profile is substantial enough for content generation' : '❌ Profile needs more information before content generation'}

INDIVIDUAL FIELD STATUS:
${hasName ? '✅' : '❌'} Name: ${hasName ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : 'Missing'}
${hasNiche ? '✅' : '❌'} Content Niche: ${hasNiche ? user.contentNiche?.join(", ") || 'Missing' : 'Missing'}
${hasPlatform ? '✅' : '❌'} Primary Platform(s): ${hasPlatform ? (((user as any).primaryPlatforms?.length ? (user as any).primaryPlatforms.join(', ') : user.primaryPlatform) as string) : 'Missing'}
${hasTargetAudience ? '✅' : '❌'} Target Audience: ${hasTargetAudience ? data.targetAudience : 'Missing'}
${hasBrandVoice ? '✅' : '❌'} Brand Voice: ${hasBrandVoice ? data.brandVoice : 'Missing'}
${hasContentGoals ? '✅' : '❌'} Content Goals: ${hasContentGoals ? data.contentGoals.join(", ") : 'Missing'}
${hasBusinessType ? '✅' : '❌'} Business Type: ${hasBusinessType ? data.businessType : 'Missing'}

WORKFLOW PHASE DETERMINATION RULES:
- Discovery complete if: name + niche + platform are provided (minimum ~30% completeness)
- Ready for positioning if: discovery complete + some additional profile data (~40-50% completeness)
- Ready for content generation if: profile score >= 60% AND sufficient profile data for personalized content
- CRITICAL: If profile score < 60%, MUST set shouldBlockContentGeneration=true regardless of user request

EXISTING DATA TO CONSIDER:
${JSON.stringify({
  firstName: user.firstName,
  contentNiche: user.contentNiche,
  primaryPlatform: user.primaryPlatform,
  primaryPlatforms: (user as any).primaryPlatforms,
  profileData: data
}, null, 2)}`;
    } else {
      userContext += "❌ No user profile available - stay in Discovery phase";
    }

    const conversationContext = contextMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Build memories context
    let memoriesContext = "";
    if (relevantMemories && relevantMemories.length > 0) {
      memoriesContext = "\n\nSTORED MEMORIES (context about the user):\n";
      relevantMemories.forEach((memory: any, index: number) => {
        memoriesContext += `${index + 1}. ${memory.content}\n`;
      });
      memoriesContext += "\nIMPORTANT: Use these memories to determine if an Instagram account belongs to the user. If memories mention the user's Instagram username, then requests to analyze that account should have isOwnProfile=true.\n";
    }

    // Create timeout promise for robust error handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AI request timeout")), timeoutMs);
    });

    const aiPromise = geminiClient.chat.completions.create({
      model: "gemini-2.5-flash-lite", // Faster model for simple decisions
      messages: [
        {
          role: "system",
          content: `You are a unified intent classifier for ContentCraft AI. Use semantic understanding to detect user intent across all languages.

Date: ${currentDate}

INTENT DETECTION:

1. WEB SEARCH - Need for current information:
• Questions about recent events, prices, status
• Website/competitor analysis requests
• General website reading requests ("read my website", "check this site")
• Fact verification needs
• ANY request to read/understand website content (unless specifically about blog analysis)
• **TWITTER/X TRENDING TOPICS & SOCIAL DISCUSSIONS:**
  - Requests for "trending on Twitter/X", "what's popular on X", "Twitter trends"
  - Social media trend searches (e.g., "trending fitness ideas", "what's hot in marketing")
  - Real-time social discussions or viral content searches
  - When user asks about "latest ideas" or "current trends" in their niche
  - USE GROK for X/Twitter trending topics and real-time social discussions
  - USE PERPLEXITY for general web searches and website analysis

**SEARCH SERVICE SELECTION:**
- Use GROK when:
  * User explicitly mentions Twitter/X ("search Twitter", "X trends")
  * Asking about trending topics or viral content
  * Real-time social media discussions
  * User wants to see what people are talking about NOW
- Use PERPLEXITY when:
  * General website analysis
  * Factual information lookup
  * Non-social media content research
  * Website reading requests

2. INSTAGRAM ANALYSIS - Profile examination:
• E.g. "Analyze/Check/read @username" or competitor research  
• Content/engagement pattern requests
• DISTINGUISH: User's own profile vs competitor from user's prompt by infering the intent from user's prompt
• Check STORED MEMORIES for hint's about user's Instagram username, if available
• If user asks to search, check, analyze, research his/her's own Instagram account → isOwnProfile=true
• If user asks to search, check, analyze, research a competitor's Instagram account → isOwnProfile=false

3. INSTAGRAM HASHTAG SEARCH - Ideas and content inspiration:
• Requests for hashtag content ideas (like "show me #fitness posts", "get ideas from #marketing", "hashtag inspiration")
• Looking for trending content by hashtag
• Content research by hashtag for inspiration

4. BLOG ANALYSIS - Content strategy examination:
• EXPLICIT blog analysis requests with phrases like "analyze my blog", "check my blog posts", "review my writing style"
• MUST be specifically about analyzing BLOG CONTENT, not just reading a website
• For general website reading requests, use web search instead
• Only trigger for URLs that are clearly blog posts or when user explicitly asks for blog content analysis

5. WORKFLOW PHASE - User journey stage with explicit requirements:

PHASE 1: Discovery & Personalization (0-35% profile completeness)
• Required fields to EXIT: firstName + contentNiche (at least 1 item) + (primaryPlatform OR primaryPlatforms)
• Missing ANY of these = STAY in Discovery
• Block content generation: YES

PHASE 2: Brand Voice & Positioning (35-55% profile completeness)
• Required to ENTER: Discovery fields complete
• Required to EXIT: Discovery fields + 2 of [targetAudience, brandVoice, businessType, contentGoals]
• Focus: Understanding brand identity, voice, target audience
• Block content generation: YES

PHASE 3: Collaborative Idea Generation (55-65% profile completeness)
• Required to ENTER: Positioning fields complete + profile score >= 55%
• Can generate: Content themes and high-level ideas (not full content yet)
• Block full content drafts: YES (only allow idea generation)

PHASE 4+: Content Creation Phases (65%+ profile completeness)
• Required to ENTER: Profile score >= 65% AND has [firstName, contentNiche, primaryPlatform, targetAudience, brandVoice or businessType]
• Can generate: Full content drafts, captions, scripts
• Block content generation: NO

CRITICAL PHASE RULES:
- Check BOTH profile completeness percentage AND individual required fields
- If required fields missing OR score below threshold, CANNOT advance
- Phase determination is STRICT - missing ANY required field blocks advancement
- Content generation blocking:
  * Phase 1-2: Block ALL content generation
  * Phase 3: Allow content IDEAS only, block full drafts
  * Phase 4+: Allow full content creation
- Missing fields should only include fields that are truly empty/null/undefined
- Do NOT suggest prompts for information that already exists (marked with ✅)
- Only suggest prompts for fields marked with ❌ Missing

STRICT VALIDATION RULES:
**TWITTER/X TRENDING SEARCH DETECTION (HIGH PRIORITY):**
- Keywords: "trending", "trends", "viral", "popular", "hot", "what's happening", "latest ideas"
- Platforms: "Twitter", "X", "social media trends"
- Combined patterns: "search Twitter for...", "trending on X", "what's popular on Twitter", "latest from X"
- User intent: Looking for current, real-time social content inspiration
- When detected: Set searchService="grok", refinedQuery=[natural language about trends in their niche]
- Recency: Use "day" or "hour" for trending content (not "week" or "month")

**OTHER VALIDATIONS:**
- Extract usernames without @ symbol ONLY if explicitly mentioned
- For blog analysis: REQUIRE explicit blog URLs or clear blog analysis requests
- For Instagram analysis: REQUIRE explicit username mentions or analysis requests
- For Instagram hashtag search: REQUIRE hashtag mentions (#hashtag) or explicit hashtag content requests
- Do NOT hallucinate URLs, usernames, or requests that weren't mentioned
- Be conservative - when in doubt, don't trigger analysis
- Use semantic patterns, not keywords, but don't invent data

LANGUAGE MATCHING AND SEARCH OPTIMIZATION:
CRITICAL FOR BLOG AND WEBSITE ANALYSIS:
- For ANY website analysis request: Use ONLY "site:domain.com" format
- DO NOT add any keywords (services, business, company, etc.)
- DO NOT add language-specific terms
- Extract actual domain from user message
- Let Perplexity handle content extraction automatically
- Examples:
  * "Read mysite.com" → "site:mysite.com"
  * "Analyze company.fi" → "site:company.fi"
  * "What's on example.co.uk" → "site:example.co.uk"

WHY: Adding keywords causes language mismatches and zero results

SEARCH QUERY RULES BY REQUEST TYPE:
- Website analysis: "site:domain.com" (ONLY - nothing else)
- X/Twitter trending topics: Use GROK with natural language query about trends (e.g., "trending fitness content", "viral marketing ideas", "what's popular in [niche]")
- X/Twitter user content: "site:x.com @username" OR use GROK with handles
- X/Twitter topic search: "site:x.com [topic]" OR use GROK with topic query
- General facts: Natural language with key terms
- Trends: Include time indicators ("latest", "2025", "recent", "today")

**EXAMPLES FOR TWITTER/X TRENDING SEARCHES:**
- User: "search Twitter for trending fitness ideas" → searchService: "grok", query: "trending fitness content and ideas"
- User: "what's hot on X right now for marketing" → searchService: "grok", query: "viral marketing trends and popular content"
- User: "show me latest Twitter trends in my niche" → searchService: "grok", query: "trending [user's niche] content and discussions"
- User: "what are people talking about on X" → searchService: "grok", query: "current trending topics and discussions"

Return JSON (only include fields when true/relevant):
{
"webSearch": {"refinedQuery": "trending fitness content and ideas", "searchService": "grok", "recency": "day", "confidence": 0.9} (only if shouldSearch=true; use "grok" for Twitter/X trends, "perplexity" for general web),
"instagramAnalysis": {"username": "string", "isOwnProfile": true|false, "confidence": 0.9} (only if shouldAnalyze=true),
"instagramHashtagSearch": {"hashtag": "hashtag_without_#", "confidence": 0.9} (only if shouldSearch=true), 
"blogAnalysis": {"urls": ["url1"], "confidence": 0.9} (only if shouldAnalyze=true),
"workflowPhase": {"currentPhase": "phase", "missingFields": ["field1"], "suggestedPrompts": ["prompt1"], "shouldBlockContentGeneration": true, "confidence": 0.9},
"profileUpdate": {"expectedFields": ["field1"], "reason": "string", "confidence": 0.9} (only if shouldExtract=true OR user explicitly requests profile update)
}

CRITICAL RULE FOR MISSING FIELDS AND PROMPTS:
- ONLY include a field in "missingFields" if it shows ❌ Missing in the PROFILE COMPLETENESS section above
- NEVER include a field in "missingFields" if it shows ✅ with actual data in the PROFILE COMPLETENESS section  
- ONLY suggest prompts for fields that are actually marked as ❌ Missing
- If most profile fields show ✅ with data, the user should be in advanced workflow phases, NOT Discovery

EXAMPLES:
- If you see "✅ Brand Voice: warm, empathetic, encouraging" then DO NOT include "Brand Voice" in missingFields
- If you see "✅ Target Audience: individuals interested in personal growth" then DO NOT include "Target Audience" in missingFields
- If you see "❌ Business Type: Missing" then you CAN include "Business Type" in missingFields`,
        },
        {
          role: "user",
          content: `${userContext}

      RECENT CONVERSATION:
      ${conversationContext}
${memoriesContext}
      Analyze this conversation using semantic understanding for language-agnostic intent detection.

      CRITICAL VALIDATION RULES:
      - For blog analysis: ONLY trigger if you see actual URLs (http/https) or explicit requests like "analyze my blog"
      - For Instagram analysis: ONLY trigger if you see @username mentions or explicit requests like "check my Instagram"
      - For profile update: BE VERY CONSERVATIVE
        * ONLY trigger for explicit profile update requests ("update my profile", "change my business type")
        * OR when user shares significant NEW business information that fills ❌ missing fields
        * DO NOT trigger for:
          - Casual conversation about their business (just chatting)
          - Generic questions or acknowledgments
          - Discussions about content ideas (not profile data)
          - Vague statements without concrete new information
        * Examples of when TO extract:
          - "I'm a fitness coach" (when businessType is missing)
          - "My target audience is young professionals" (when targetAudience is missing)
          - "I want to focus on mental health content" (when contentNiche needs update)
        * Examples of when NOT to extract:
          - "Week has been good" (casual chat)
          - "That sounds great" (acknowledgment)
          - "I like that content idea" (discussing content, not profile)
          - "How should I post?" (question, no new data)
      - DO NOT use information from previous conversations or stored memories to infer analysis requests
      - DO NOT trigger analysis based on general conversation topics
      - When in doubt about profile updates, DO NOT extract (be conservative)`,
        },
      ],
     max_tokens: 500, // Reduced for performance
      temperature: 0.1, // Lower for more consistent results
    });

    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(
        `❌ [UNIFIED_INTENT] No response from Gemini flash after ${Date.now() - startTime}ms`,
      );
      return getDefaultUnifiedDecision();
    }
    console.log(`🧠 [UNIFIED_INTENT] Raw AI response:`, result);

    // Parse the condensed response and normalize it
    const condensedResponse = safeJsonParse<any>(
      result,
      {},
      { timeout: timeoutMs },
    );

    const decision = normalizeCondensedResponse(condensedResponse);

    // No heuristic fallback: rely on the AI's unified decision for instagramAnalysis.
    // Previous handle-detection heuristic removed to avoid unintended behavior.

    // POST-PROCESSING VALIDATION: Filter missing fields to ensure they're actually missing
    if (decision.workflowPhase.missingFields.length > 0 && user) {
      const actuallyMissingFields = decision.workflowPhase.missingFields.filter(field => {
        // Map friendly field names to actual user object properties
        switch (field.toLowerCase()) {
          case 'name':
          case 'firstname':
            return !user.firstName;
          case 'lastname':
            return !user.lastName;
          case 'niche':
          case 'contentniche':
            return !user.contentNiche || user.contentNiche.length === 0;
          case 'platform':
          case 'primaryplatform':
            return !user.primaryPlatform && (!(user as any).primaryPlatforms || (user as any).primaryPlatforms.length === 0);
          case 'primaryplatforms':
            return !(user as any).primaryPlatforms || (user as any).primaryPlatforms.length === 0;
          case 'targetaudience':
            return !(user.profileData as any)?.targetAudience;
          case 'brandvoice':
            return !(user.profileData as any)?.brandVoice;
          case 'businesstype':
            return !(user.profileData as any)?.businessType;
          case 'contentgoals':
            return !(user.profileData as any)?.contentGoals || (user.profileData as any).contentGoals.length === 0;
          case 'businesslocation':
            return !(user.profileData as any)?.businessLocation;
          default:
            // Unknown field - keep it to be safe
            return true;
        }
      });

      if (actuallyMissingFields.length !== decision.workflowPhase.missingFields.length) {
        console.log(`🔍 [VALIDATION] Filtered missing fields from ${decision.workflowPhase.missingFields.length} to ${actuallyMissingFields.length}`);
        console.log(`🔍 [VALIDATION] Removed fields that actually have values: ${decision.workflowPhase.missingFields.filter(f => !actuallyMissingFields.includes(f)).join(', ')}`);
        decision.workflowPhase.missingFields = actuallyMissingFields;
      }
    }

    console.log(
      `🧠 [UNIFIED_INTENT] Analysis complete: ${Date.now() - startTime}ms - webSearch: ${decision.webSearch.shouldSearch}, instagram: ${decision.instagramAnalysis.shouldAnalyze}, blog: ${decision.blogAnalysis.shouldAnalyze}, phase: ${decision.workflowPhase.currentPhase}`,
    );

    return decision;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `❌ [UNIFIED_INTENT] Error after ${Date.now() - startTime}ms:`,
      errorMessage,
    );

    // Return appropriate fallback based on error type
    if (errorMessage.includes("timeout")) {
      console.log(
        `⏱️ [UNIFIED_INTENT] Request timed out after ${timeoutMs}ms - using safe fallback`,
      );
    }

    return getDefaultUnifiedDecision();
  }
}

/**
 * Returns a safe default unified decision when analysis fails
 * Optimized for conservative behavior and user safety
 */
function getDefaultUnifiedDecision(): UnifiedIntentDecision {
  return {
    webSearch: {
      shouldSearch: false,
      confidence: 0.0,
      reason: "Analysis failed - defaulting to no search",
      refinedQuery: "",
      recency: "week",
      domains: [],
      searchService: "perplexity",
      socialHandles: [],
    },
    instagramAnalysis: {
      shouldAnalyze: false,
      username: undefined,
      confidence: 0.0,
      reason: "Error in analysis",
    },
    instagramHashtagSearch: {
      shouldSearch: false,
      hashtag: undefined,
      confidence: 0.0,
      reason: "Error in analysis",
    },
    blogAnalysis: {
      shouldAnalyze: false,
      urls: [],
      confidence: 0.0,
      reason: "Error in analysis",
    },
    workflowPhase: {
      currentPhase: "Discovery & Personalization",
      missingFields: ["name", "niche", "platform"],
      readyToAdvance: false,
      suggestedPrompts: [
        "What's your name?",
        "What type of content do you create?",
      ],
      profilePatch: {},
      shouldBlockContentGeneration: true,
      confidence: 0.9,
    },
    profileUpdate: {
      shouldExtract: false,
      confidence: 0.0,
      reason: "No profile extraction needed",
      expectedFields: [],
    },
  };
}

/**
 * Normalize condensed AI response to full UnifiedIntentDecision format
 */
function normalizeCondensedResponse(condensedResponse: any): UnifiedIntentDecision {
  const defaults = getDefaultUnifiedDecision();

  return {
    webSearch: condensedResponse.webSearch ? {
      shouldSearch: true,
      confidence: condensedResponse.webSearch.confidence || 0.8,
      reason: "AI recommended search",
      refinedQuery: condensedResponse.webSearch.refinedQuery || "",
      recency: condensedResponse.webSearch.recency || "week",
      domains: condensedResponse.webSearch.domains || [],
      searchService: condensedResponse.webSearch.searchService || "perplexity",
      socialHandles: condensedResponse.webSearch.socialHandles || [],
    } : {
      shouldSearch: false,
      confidence: 0.9,
      reason: "No web search needed for this query",
      refinedQuery: "",
      recency: "week",
      domains: [],
      searchService: "perplexity",
      socialHandles: [],
    },

    instagramAnalysis: condensedResponse.instagramAnalysis ? {
      shouldAnalyze: true,
      username: condensedResponse.instagramAnalysis.username,
      confidence: condensedResponse.instagramAnalysis.confidence || 0.8,
      reason: "AI recommended Instagram analysis",
      // Preserve explicit ownership signal from the AI when present so callers
      // (like performInstagramAnalysis) can decide whether this is the
      // user's own profile or a competitor. If absent, leave undefined so
      // existing fallback logic can safely run.
      isOwnProfile: typeof condensedResponse.instagramAnalysis.isOwnProfile === 'boolean'
        ? condensedResponse.instagramAnalysis.isOwnProfile
        : undefined,
    } : defaults.instagramAnalysis,

    instagramHashtagSearch: condensedResponse.instagramHashtagSearch ? {
      shouldSearch: true,
      hashtag: condensedResponse.instagramHashtagSearch.hashtag,
      confidence: condensedResponse.instagramHashtagSearch.confidence || 0.8,
      reason: "AI recommended Instagram hashtag search",
    } : defaults.instagramHashtagSearch,

    blogAnalysis: condensedResponse.blogAnalysis ? {
      shouldAnalyze: true,
      urls: condensedResponse.blogAnalysis.urls || [],
      confidence: condensedResponse.blogAnalysis.confidence || 0.8,
      reason: "AI recommended blog analysis",
    } : defaults.blogAnalysis,

    workflowPhase: {
      currentPhase: condensedResponse.workflowPhase?.currentPhase || defaults.workflowPhase.currentPhase,
      missingFields: condensedResponse.workflowPhase?.missingFields || [],
      readyToAdvance: condensedResponse.workflowPhase?.readyToAdvance !== undefined ? condensedResponse.workflowPhase.readyToAdvance : defaults.workflowPhase.readyToAdvance,
      suggestedPrompts: condensedResponse.workflowPhase?.suggestedPrompts || [],
      profilePatch: condensedResponse.workflowPhase?.profilePatch || {},
      shouldBlockContentGeneration: condensedResponse.workflowPhase?.shouldBlockContentGeneration !== undefined ? condensedResponse.workflowPhase.shouldBlockContentGeneration : defaults.workflowPhase.shouldBlockContentGeneration,
      confidence: condensedResponse.workflowPhase?.confidence || defaults.workflowPhase.confidence,
    },

    profileUpdate: condensedResponse.profileUpdate ? {
      shouldExtract: true,
      confidence: condensedResponse.profileUpdate.confidence || 0.8,
      reason: condensedResponse.profileUpdate.reason || "AI recommended profile update",
      expectedFields: condensedResponse.profileUpdate.expectedFields || [],
    } : defaults.profileUpdate,
  };
}

// Backward compatibility functions - extract specific decisions from unified result
export function extractWebSearchDecision(
  unifiedDecision: UnifiedIntentDecision,
): WebSearchDecision {
  return unifiedDecision.webSearch;
}

export function extractInstagramAnalysisDecision(
  unifiedDecision: UnifiedIntentDecision,
): InstagramAnalysisDecision {
  return unifiedDecision.instagramAnalysis;
}

export function extractInstagramHashtagDecision(
  unifiedDecision: UnifiedIntentDecision,
): InstagramHashtagDecision {
  return unifiedDecision.instagramHashtagSearch;
}

export function extractBlogAnalysisDecision(
  unifiedDecision: UnifiedIntentDecision,
): BlogAnalysisDecision {
  return unifiedDecision.blogAnalysis;
}

export function extractProfileUpdateDecision(
  unifiedDecision: UnifiedIntentDecision,
): ProfileUpdateDecision {
  return unifiedDecision.profileUpdate;
}

export function extractWorkflowPhaseDecision(
  unifiedDecision: UnifiedIntentDecision,
): WorkflowPhaseDecision {
  return unifiedDecision.workflowPhase;
}

/**
 * CENTRALIZED PROFILE EXTRACTION DECISION
 * This is the single source of truth for determining if profile extraction should occur.
 * Call this function instead of implementing extraction logic elsewhere.
 */
export function shouldExtractProfile(
  unifiedDecision: UnifiedIntentDecision,
  analysisResults: {
    instagramSuccess?: boolean;
    blogSuccess?: boolean;
    hashtagSuccess?: boolean;
  } = {}
): {
  shouldExtract: boolean;
  reason: string;
  confidence: number;
  source: 'analysis' | 'intent' | 'explicit';
} {
  // Priority 1: ALWAYS extract after successful external analysis
  // These provide concrete new data about the user's business
  const hasSuccessfulAnalysis = analysisResults.instagramSuccess || analysisResults.blogSuccess;
  
  if (hasSuccessfulAnalysis) {
    return {
      shouldExtract: true,
      reason: hasSuccessfulAnalysis 
        ? `Post-analysis extraction (Instagram: ${analysisResults.instagramSuccess}, Blog: ${analysisResults.blogSuccess})`
        : 'Post-analysis extraction',
      confidence: 0.95,
      source: 'analysis'
    };
  }

  // Priority 2: Explicit user request to update profile
  // Intent analysis detected explicit update request
  if (unifiedDecision.profileUpdate.shouldExtract && 
      unifiedDecision.profileUpdate.confidence >= 0.85) {
    return {
      shouldExtract: true,
      reason: `Explicit profile update request: ${unifiedDecision.profileUpdate.reason}`,
      confidence: unifiedDecision.profileUpdate.confidence,
      source: 'explicit'
    };
  }

  // Priority 3: Intent-based extraction with high confidence
  // AI detected significant new profile information in conversation
  if (unifiedDecision.profileUpdate.shouldExtract && 
      unifiedDecision.profileUpdate.confidence >= 0.75) {
    return {
      shouldExtract: true,
      reason: `Intent-based extraction: ${unifiedDecision.profileUpdate.reason}`,
      confidence: unifiedDecision.profileUpdate.confidence,
      source: 'intent'
    };
  }

  // Default: Don't extract
  return {
    shouldExtract: false,
    reason: unifiedDecision.profileUpdate.reason || 'No extraction conditions met',
    confidence: unifiedDecision.profileUpdate.confidence,
    source: 'intent'
  };
}

// Legacy wrapper functions for backward compatibility
export async function decideWebSearch(
  messages: ChatMessage[],
  user?: User,
  relevantMemories: any[] = [],
): Promise<WebSearchDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user, relevantMemories);
  return extractWebSearchDecision(unifiedDecision);
}

export async function decideInstagramAnalysis(
  messages: ChatMessage[],
  user?: User,
  relevantMemories: any[] = [],
): Promise<InstagramAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user, relevantMemories);
  return extractInstagramAnalysisDecision(unifiedDecision);
}

export async function decideBlogAnalysis(
  messages: ChatMessage[],
  user?: User,
  relevantMemories: any[] = [],
): Promise<BlogAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user, relevantMemories);
  return extractBlogAnalysisDecision(unifiedDecision);
}

export async function decideWorkflowPhase(
  messages: ChatMessage[],
  user?: User,
  relevantMemories: any[] = [],
): Promise<WorkflowPhaseDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user, relevantMemories);
  return extractWorkflowPhaseDecision(unifiedDecision);
}
