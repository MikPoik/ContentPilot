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

export interface UnifiedIntentDecision {
  webSearch: WebSearchDecision;
  instagramAnalysis: InstagramAnalysisDecision;
  blogAnalysis: BlogAnalysisDecision;
  workflowPhase: WorkflowPhaseDecision;
}

export interface UserStyleAnalysis {
  toneKeywords: string[];
  avgSentenceLength: number;
  commonPhrases: string[];
  punctuationStyle: string;
  contentThemes: string[];
  voiceCharacteristics: string;
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
): Promise<UnifiedIntentDecision> {
  const startTime = Date.now();
  const timeoutMs = 120000; // Reduced to 4 seconds for faster response

  try {
    console.log(`🧠 [UNIFIED_INTENT] Starting unified intent analysis...`);

    // Get last 6 messages for context (optimized for performance)
    const contextMessages = messages.slice(-6);
    const currentDate = new Date().toISOString().split("T")[0];

    // Build user context efficiently
    let userContext = "CURRENT USER PROFILE STATUS:\n";
    if (user) {
      const data = user.profileData as any || {};
      
      // Check what we actually have
      const hasName = !!(user.firstName);
      const hasNiche = !!(user.contentNiche && user.contentNiche.length > 0);
      const hasPlatform = !!(user.primaryPlatform);
      const hasTargetAudience = !!(data.targetAudience);
      const hasBrandVoice = !!(data.brandVoice);
      const hasContentGoals = !!(data.contentGoals?.length);
      const hasBusinessType = !!(data.businessType);

      userContext += `PROFILE COMPLETENESS:
${hasName ? '✅' : '❌'} Name: ${hasName ? user.firstName + (user.lastName ? ' ' + user.lastName : '') : 'Missing'}
${hasNiche ? '✅' : '❌'} Content Niche: ${hasNiche ? user.contentNiche.join(", ") : 'Missing'}
${hasPlatform ? '✅' : '❌'} Primary Platform: ${hasPlatform ? user.primaryPlatform : 'Missing'}
${hasTargetAudience ? '✅' : '❌'} Target Audience: ${hasTargetAudience ? data.targetAudience : 'Missing'}
${hasBrandVoice ? '✅' : '❌'} Brand Voice: ${hasBrandVoice ? data.brandVoice : 'Missing'}
${hasContentGoals ? '✅' : '❌'} Content Goals: ${hasContentGoals ? data.contentGoals.join(", ") : 'Missing'}
${hasBusinessType ? '✅' : '❌'} Business Type: ${hasBusinessType ? data.businessType : 'Missing'}

WORKFLOW PHASE DETERMINATION:
- Discovery complete if: name + niche + platform are provided
- Ready for positioning if: discovery complete + some additional profile data
- Ready for content generation if: sufficient profile data for personalized content

EXISTING DATA TO CONSIDER:
${JSON.stringify({
  firstName: user.firstName,
  contentNiche: user.contentNiche,
  primaryPlatform: user.primaryPlatform,
  profileData: data
}, null, 2)}`;
    } else {
      userContext += "❌ No user profile available - stay in Discovery phase";
    }
    const conversationContext = contextMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Create timeout promise for robust error handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("AI request timeout")), timeoutMs);
    });

    const aiPromise = geminiClient.chat.completions.create({
      model: "gemini-2.0-flash-lite", // Faster model for simple decisions
      messages: [
        {
          role: "system",
          content: `You are a unified intent classifier for ContentCraft AI. Use semantic understanding to detect user intent across all languages.

Date: ${currentDate}

INTENT DETECTION:

1. WEB SEARCH - Need for current information:
• Questions about recent events, prices, status
• Website/competitor analysis requests
• Fact verification needs
Use GROK for X/Twitter content, PERPLEXITY for general web

2. INSTAGRAM ANALYSIS - Profile examination:
• "Analyze @username" or competitor research
• Content/engagement pattern requests

3. BLOG ANALYSIS - Content strategy examination:
• EXPLICIT blog URL mentions with analytical intent ("analyze my blog", "check this post", etc.)
• EXPLICIT writing style/strategy analysis requests for blogs
• MUST have actual URLs mentioned in conversation or clear blog analysis request

4. WORKFLOW PHASE - User journey stage:
• Discovery & Personalization: Getting to know user (name, niche, platform)
• Brand Voice & Positioning: Understanding brand identity and voice
• Collaborative Idea Generation: Content concepts and themes
• Developing Chosen Ideas: Specific content development
• Content Drafting & Iterative Review: Creating actual content
• Finalization & Scheduling: Final touches and publishing

WORKFLOW PROGRESSION RULES:
- Discovery complete when: name + contentNiche + primaryPlatform exist
- Can advance to positioning when: discovery complete + some additional context
- Only advance to content phases when: sufficient profile data for personalized recommendations
- ALWAYS check the PROFILE COMPLETENESS section to see what data actually exists
- Missing fields should only include fields that are truly empty/null/undefined
- Do NOT suggest prompts asking for information that already exists (marked with ✅)
- Only suggest prompts for fields marked with ❌ Missing
- If all key fields exist, focus on content-related prompts rather than profile gathering

STRICT VALIDATION RULES:
- Extract usernames without @ symbol ONLY if explicitly mentioned
- For blog analysis: REQUIRE explicit blog URLs or clear blog analysis requests
- For Instagram analysis: REQUIRE explicit username mentions or analysis requests
- Do NOT hallucinate URLs, usernames, or requests that weren't mentioned
- Be conservative - when in doubt, don't trigger analysis
- Use semantic patterns, not keywords, but don't invent data

Return JSON (only include fields when true/relevant):
{
"webSearch": {"refinedQuery": "string", "searchService": "perplexity|grok", "recency": "day", "confidence": 0.9} (only if shouldSearch=true),
"instagramAnalysis": {"username": "string", "confidence": 0.9} (only if shouldAnalyze=true), 
"blogAnalysis": {"urls": ["url1"], "confidence": 0.9} (only if shouldAnalyze=true),
"workflowPhase": {"currentPhase": "phase", "missingFields": ["field1"], "suggestedPrompts": ["prompt1"], "shouldBlockContentGeneration": true, "confidence": 0.9}
}

CRITICAL: For suggestedPrompts, ONLY suggest prompts for information that is actually missing (marked with ❌). DO NOT suggest prompts for information that already exists (marked with ✅). If profile is complete, suggest content-focused prompts instead.`,
        },
        {
          role: "user",
          content: `${userContext}

      RECENT CONVERSATION:
      ${conversationContext}

      Analyze this conversation using semantic understanding for language-agnostic intent detection.
      
      CRITICAL VALIDATION RULES:
      - For blog analysis: ONLY trigger if you see actual URLs (http/https) or explicit requests like "analyze my blog"
      - For Instagram analysis: ONLY trigger if you see @username mentions or explicit requests like "check my Instagram"
      - DO NOT use information from previous conversations or stored memories to infer analysis requests
      - DO NOT trigger analysis based on general conversation topics
      - When in doubt, set shouldAnalyze to false and confidence to 0.0
      - If the user is just chatting (like "week has gone well"), DO NOT trigger any analysis`,
        },
      ],
      max_tokens: 500, // Reduced for performance
      temperature: 0.05, // Lower for more consistent results
    });

    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(
        `❌ [UNIFIED_INTENT] No response from GPT-4o-mini after ${Date.now() - startTime}ms`,
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
      reason: "Error in analysis",
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
    } : defaults.webSearch,
    
    instagramAnalysis: condensedResponse.instagramAnalysis ? {
      shouldAnalyze: true,
      username: condensedResponse.instagramAnalysis.username,
      confidence: condensedResponse.instagramAnalysis.confidence || 0.8,
      reason: "AI recommended Instagram analysis",
    } : defaults.instagramAnalysis,
    
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

export function extractBlogAnalysisDecision(
  unifiedDecision: UnifiedIntentDecision,
): BlogAnalysisDecision {
  return unifiedDecision.blogAnalysis;
}

export function extractWorkflowPhaseDecision(
  unifiedDecision: UnifiedIntentDecision,
): WorkflowPhaseDecision {
  return unifiedDecision.workflowPhase;
}

// Legacy wrapper functions for backward compatibility
export async function decideWebSearch(
  messages: ChatMessage[],
  user?: User,
): Promise<WebSearchDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractWebSearchDecision(unifiedDecision);
}

export async function decideInstagramAnalysis(
  messages: ChatMessage[],
  user?: User,
): Promise<InstagramAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractInstagramAnalysisDecision(unifiedDecision);
}

export async function decideBlogAnalysis(
  messages: ChatMessage[],
  user?: User,
): Promise<BlogAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractBlogAnalysisDecision(unifiedDecision);
}

export async function decideWorkflowPhase(
  messages: ChatMessage[],
  user?: User,
): Promise<WorkflowPhaseDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractWorkflowPhaseDecision(unifiedDecision);
}
