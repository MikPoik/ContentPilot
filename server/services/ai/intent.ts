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
    let userContext = "User Profile: ";
    if (user) {
      const currentProfile = {
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        contentNiche: user?.contentNiche || [],
        primaryPlatform: user?.primaryPlatform || null,
        profileData: user?.profileData || {},
      };

      userContext += `
  - Name: ${user.firstName || "Not provided"}${user.lastName ? " " + user.lastName : ""}
  - Content Niche: ${user.contentNiche?.join(", ") || "Not specified"}
  - Primary Platform: ${user.primaryPlatform || "Not specified"}`;

      if (user.profileData) {
        const data = user.profileData as any;
        if (data.targetAudience)
          userContext += `\n- Target Audience: ${data.targetAudience}`;
        if (data.businessType)
          userContext += `\n- Business Type: ${data.businessType}`;
        if (data.brandVoice)
          userContext += `\n- Brand Voice: ${data.brandVoice}`;
        if (data.contentGoals?.length)
          userContext += `\n- Content Goals: ${data.contentGoals.join(", ")}`;
      }

      userContext += `\n\nCURRENT PROFILE DATA:\n${JSON.stringify(currentProfile, null, 2)}`;
    } else {
      userContext += "No user profile available";
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
• Blog URL mentions with analytical intent
• Writing style/strategy analysis requests

4. WORKFLOW PHASE - User journey stage:
• Discovery: Getting to know user (name, niche, platform)
• Positioning: Brand voice/identity
• Ideas: Content concepts
• Development: Specific content creation
• Review: Content refinement
• Finalization: Publishing prep

RULES:
- Block content creation until profile complete (name/niche/platform)
- Extract usernames without @ symbol
- Use semantic patterns, not keywords

Return JSON:
{
"webSearch": {"shouldSearch": boolean, "confidence": number, "refinedQuery": string, "recency": "hour|day|week|month|year", "domains": [], "searchService": "perplexity|grok", "socialHandles": []},
"instagramAnalysis": {"shouldAnalyze": boolean, "username": string|null, "confidence": number},
"blogAnalysis": {"shouldAnalyze": boolean, "urls": [], "confidence": number},
"workflowPhase": {"currentPhase": "Discovery & Personalization|Brand Voice & Positioning|Collaborative Idea Generation|Developing Chosen Ideas|Content Drafting & Iterative Review|Finalization & Scheduling", "missingFields": [], "readyToAdvance": boolean, "suggestedPrompts": [], "profilePatch": {}, "shouldBlockContentGeneration": boolean, "confidence": number}
}`,
        },
        {
          role: "user",
          content: `${userContext}

      RECENT CONVERSATION:
      ${conversationContext}

      Analyze this conversation using semantic understanding for language-agnostic intent detection.`,
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

    // Use the safe JSON parser with proper error handling
    const decision = safeJsonParse<UnifiedIntentDecision>(
      result,
      getDefaultUnifiedDecision(),
      { timeout: timeoutMs },
    );

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
