import { type User } from "@shared/schema";
import { openai } from "../openai";

// Shared types for AI services (centralized in intent.ts)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WebSearchDecision {
  shouldSearch: boolean;
  confidence: number;
  reason: string;
  refinedQuery: string;
  recency: 'hour' | 'day' | 'week' | 'month' | 'year';
  domains: string[];
  searchService: 'perplexity' | 'grok';
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
  } = {}
): T {
  try {
    let sanitized = jsonString.trim();
    
    // Remove code blocks if present
    if (options.removeCodeBlocks !== false) {
      if (sanitized.startsWith('```') && sanitized.endsWith('```')) {
        const lines = sanitized.split('\n');
        sanitized = lines.slice(1, -1).join('\n');
      }
      
      if (sanitized.startsWith('json\n')) {
        sanitized = sanitized.replace('json\n', '');
      }
    }
    
    // Find the first complete JSON object
    if (options.removeBrackets !== false) {
      const firstBraceIndex = sanitized.indexOf('{');
      if (firstBraceIndex !== -1) {
        let braceCount = 0;
        let endIndex = firstBraceIndex;

        for (let i = firstBraceIndex; i < sanitized.length; i++) {
          if (sanitized[i] === '{') braceCount++;
          else if (sanitized[i] === '}') braceCount--;

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
    console.error('JSON parsing failed:', error, 'Input:', jsonString);
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
  user?: User
): Promise<UnifiedIntentDecision> {
  const startTime = Date.now();
  const timeoutMs = 4000; // Reduced to 4 seconds for faster response
  
  try {
    console.log(`🧠 [UNIFIED_INTENT] Starting unified intent analysis...`);

    // Get last 3 messages for context (reduced for speed)
    const contextMessages = messages.slice(-3);
    const latestMessage = messages[messages.length - 1]?.content || '';

    // Minimal user context
    const hasBasicInfo = user?.firstName && user?.contentNiche?.length;
    const userSummary = user ? `${user.firstName || 'User'} - ${user.primaryPlatform || 'Unknown platform'} - ${user.contentNiche?.join(', ') || 'No niche'}` : 'No profile';

    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create timeout promise for robust error handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });

    const aiPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster model for simple decisions
      messages: [
        {
          role: 'system',
          content: `Analyze intent quickly. Return JSON with:
- webSearch: need current info? (websites, news, prices)
- instagramAnalysis: mentions @username or competitor Instagram?
- blogAnalysis: mentions blog URLs or content analysis?
- workflowPhase: user stage (Discovery if no basic info, Idea Generation if ready)

{
  "webSearch": {"shouldSearch": boolean, "confidence": 0.8, "reason": "", "refinedQuery": "", "recency": "week", "domains": [], "searchService": "perplexity"},
  "instagramAnalysis": {"shouldAnalyze": boolean, "username": null, "confidence": 0.8, "reason": ""},
  "blogAnalysis": {"shouldAnalyze": boolean, "urls": [], "confidence": 0.8, "reason": ""},
  "workflowPhase": {"currentPhase": "Discovery & Personalization", "missingFields": [], "readyToAdvance": false, "suggestedPrompts": [], "profilePatch": {}, "shouldBlockContentGeneration": true, "confidence": 0.8}
}`
        },
        {
          role: 'user',
          content: `User: ${userSummary}
Has basic info: ${hasBasicInfo}
Latest: "${latestMessage}"
Context: ${conversationContext}`
        }
      ],
      max_tokens: 300,  // Much smaller for speed
      temperature: 0,   // Deterministic for consistency
    });

    const response = await Promise.race([aiPromise, timeoutPromise]) as any;

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [UNIFIED_INTENT] No response from GPT-4o-mini after ${Date.now() - startTime}ms`);
      return getDefaultUnifiedDecision();
    }

    // Use the safe JSON parser with proper error handling
    const decision = safeJsonParse<UnifiedIntentDecision>(
      result, 
      getDefaultUnifiedDecision(),
      { timeout: timeoutMs }
    );
    
    console.log(`🧠 [UNIFIED_INTENT] Analysis complete: ${Date.now() - startTime}ms - webSearch: ${decision.webSearch.shouldSearch}, instagram: ${decision.instagramAnalysis.shouldAnalyze}, blog: ${decision.blogAnalysis.shouldAnalyze}, phase: ${decision.workflowPhase.currentPhase}`);
    
    return decision;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [UNIFIED_INTENT] Error after ${Date.now() - startTime}ms:`, errorMessage);
    
    // Return appropriate fallback based on error type
    if (errorMessage.includes('timeout')) {
      console.log(`⏱️ [UNIFIED_INTENT] Request timed out after ${timeoutMs}ms - using safe fallback`);
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
      recency: 'week',
      domains: [],
      searchService: 'perplexity',
      socialHandles: []
    },
    instagramAnalysis: {
      shouldAnalyze: false,
      username: undefined,
      confidence: 0.0,
      reason: "Error in analysis"
    },
    blogAnalysis: {
      shouldAnalyze: false,
      urls: [],
      confidence: 0.0,
      reason: "Error in analysis"
    },
    workflowPhase: {
      currentPhase: "Discovery & Personalization",
      missingFields: ["name", "niche", "platform"],
      readyToAdvance: false,
      suggestedPrompts: ["What's your name?", "What type of content do you create?"],
      profilePatch: {},
      shouldBlockContentGeneration: true,
      confidence: 0.9
    }
  };
}

// Backward compatibility functions - extract specific decisions from unified result
export function extractWebSearchDecision(unifiedDecision: UnifiedIntentDecision): WebSearchDecision {
  return unifiedDecision.webSearch;
}

export function extractInstagramAnalysisDecision(unifiedDecision: UnifiedIntentDecision): InstagramAnalysisDecision {
  return unifiedDecision.instagramAnalysis;
}

export function extractBlogAnalysisDecision(unifiedDecision: UnifiedIntentDecision): BlogAnalysisDecision {
  return unifiedDecision.blogAnalysis;
}

export function extractWorkflowPhaseDecision(unifiedDecision: UnifiedIntentDecision): WorkflowPhaseDecision {
  return unifiedDecision.workflowPhase;
}

// Legacy wrapper functions for backward compatibility
export async function decideWebSearch(
  messages: ChatMessage[],
  user?: User
): Promise<WebSearchDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractWebSearchDecision(unifiedDecision);
}

export async function decideInstagramAnalysis(
  messages: ChatMessage[],
  user?: User  
): Promise<InstagramAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractInstagramAnalysisDecision(unifiedDecision);
}

export async function decideBlogAnalysis(
  messages: ChatMessage[],
  user?: User
): Promise<BlogAnalysisDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractBlogAnalysisDecision(unifiedDecision);
}

export async function decideWorkflowPhase(
  messages: ChatMessage[],
  user?: User
): Promise<WorkflowPhaseDecision> {
  const unifiedDecision = await analyzeUnifiedIntent(messages, user);
  return extractWorkflowPhaseDecision(unifiedDecision);
}