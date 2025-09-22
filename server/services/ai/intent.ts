import OpenAI from "openai";
import { type User } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Unified interface that combines all existing decision types
export interface UnifiedIntentDecision {
  // Web Search Decision
  webSearch: {
    shouldSearch: boolean;
    confidence: number;
    reason: string;
    refinedQuery: string;
    recency: 'hour' | 'day' | 'week' | 'month' | 'year';
    domains: string[];
    searchService: 'perplexity' | 'grok';
    socialHandles?: string[];
  };
  
  // Instagram Analysis Decision
  instagramAnalysis: {
    shouldAnalyze: boolean;
    username?: string;
    confidence: number;
    reason: string;
  };
  
  // Blog Analysis Decision
  blogAnalysis: {
    shouldAnalyze: boolean;
    urls: string[];
    confidence: number;
    reason: string;
  };
  
  // Workflow Phase Decision
  workflowPhase: {
    currentPhase: string;
    missingFields: string[];
    readyToAdvance: boolean;
    suggestedPrompts: string[];
    profilePatch: any;
    shouldBlockContentGeneration: boolean;
    confidence: number;
  };
}

// Backward compatibility interfaces - these extract specific decisions from unified result
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

/**
 * Unified intent classification system that analyzes conversation context once 
 * and returns decisions for all four decision types in a single AI call
 */
export async function analyzeUnifiedIntent(
  messages: ChatMessage[],
  user?: User
): Promise<UnifiedIntentDecision> {
  const startTime = Date.now();
  try {
    console.log(`🧠 [UNIFIED_INTENT] Starting unified intent analysis...`);

    // Get last 8 messages for context
    const contextMessages = messages.slice(-8);
    const currentDate = new Date().toISOString().split('T')[0];

    // Build user context
    let userContext = 'User Profile: ';
    if (user) {
      const currentProfile = {
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        contentNiche: user?.contentNiche || [],
        primaryPlatform: user?.primaryPlatform || null,
        profileData: user?.profileData || {}
      };

      userContext += `
- Name: ${user.firstName || 'Not provided'}${user.lastName ? ' ' + user.lastName : ''}
- Content Niche: ${user.contentNiche?.join(', ') || 'Not specified'}
- Primary Platform: ${user.primaryPlatform || 'Not specified'}`;

      if (user.profileData) {
        const data = user.profileData as any;
        if (data.targetAudience) userContext += `\n- Target Audience: ${data.targetAudience}`;
        if (data.businessType) userContext += `\n- Business Type: ${data.businessType}`;
        if (data.brandVoice) userContext += `\n- Brand Voice: ${data.brandVoice}`;
        if (data.contentGoals?.length) userContext += `\n- Content Goals: ${data.contentGoals.join(', ')}`;
      }

      userContext += `\n\nCURRENT PROFILE DATA:\n${JSON.stringify(currentProfile, null, 2)}`;
    } else {
      userContext += 'No user profile available';
    }

    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a unified intent classifier for ContentCraft AI. Analyze the conversation context and user profile to make ALL four decision types simultaneously. Use semantic understanding rather than keyword matching for language-agnostic pattern detection.

Current date: ${currentDate}

ANALYZE FOR FOUR DECISION TYPES:

1. WEB SEARCH DECISION:
- Only recommend search for queries needing current, factual, or time-sensitive information
- DO NOT search for: greetings, social conversation, general questions, personal opinions, basic how-to questions
- DO search for: current events, news, recent developments, pricing info, algorithm changes, time-sensitive info, company/product info, website content analysis
- For specific website analysis, use simple "site:domain.com" searches
- Adapt search terms to website's primary language context

2. INSTAGRAM ANALYSIS DECISION:
- Look for requests to "analyze", "check", "look at", "review" Instagram accounts
- Detect Instagram usernames (with @ or mentioned usernames)
- Look for competitor analysis requests, Instagram engagement questions
- Be liberal - if someone mentions wanting insights about Instagram accounts, they likely want analysis

3. BLOG ANALYSIS DECISION:  
- Look for requests to analyze, read, check, review blog posts or blog content
- Detect blog URLs or mentions of "my blog", "blog posts", "my website"
- Look for requests about writing style, tone, content analysis of blogs
- Include competitor blog analysis requests

4. WORKFLOW PHASE ANALYSIS:
The 6-step workflow phases:
1. "Discovery & Personalization" - Getting name, niche, platform, audience, business goals
2. "Brand Voice & Positioning" - Understanding brand voice, positioning, do's/don'ts  
3. "Collaborative Idea Generation" - Presenting content ideas, getting feedback
4. "Developing Chosen Ideas" - Working on specific selected ideas, formats, angles
5. "Content Drafting & Iterative Review" - Creating content drafts, refining based on feedback
6. "Finalization & Scheduling" - Finalizing content, adding hashtags, scheduling

CRITICAL WORKFLOW RULES:
- DO NOT allow content generation (phases 3+) until Discovery is substantially complete
- Block content generation if confidence is low that user profile is sufficient
- If user mentions Instagram username during discovery, add "instagramUsername" to profilePatch
- If this appears to be user's OWN Instagram account, also add "ownInstagramUsername"

Return ONLY valid JSON with this exact structure:
{
  "webSearch": {
    "shouldSearch": boolean,
    "confidence": number (0.0-1.0),
    "reason": "brief explanation",
    "refinedQuery": "search query or empty string",
    "recency": "hour|day|week|month|year",
    "domains": ["array of specific domains if any"],
    "searchService": "perplexity|grok",
    "socialHandles": ["array of social handles if relevant"]
  },
  "instagramAnalysis": {
    "shouldAnalyze": boolean,
    "username": "extracted username without @ or null",
    "confidence": number (0.0-1.0),
    "reason": "brief explanation"
  },
  "blogAnalysis": {
    "shouldAnalyze": boolean,
    "urls": ["array of blog URLs if mentioned"],
    "confidence": number (0.0-1.0),
    "reason": "brief explanation"
  },
  "workflowPhase": {
    "currentPhase": "Discovery & Personalization|Brand Voice & Positioning|Collaborative Idea Generation|Developing Chosen Ideas|Content Drafting & Iterative Review|Finalization & Scheduling",
    "missingFields": ["array of missing info like name, niche, platform, etc"],
    "readyToAdvance": boolean,
    "suggestedPrompts": ["1-2 specific questions to ask next"],
    "profilePatch": {"any new profile data to store"},
    "shouldBlockContentGeneration": boolean,
    "confidence": number (0.0-1.0)
  }
}`
        },
        {
          role: 'user',
          content: `${userContext}

RECENT CONVERSATION:
${conversationContext}

Analyze this conversation and provide unified intent classification for all four decision types. Use semantic understanding for language-agnostic pattern detection.`
        }
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [UNIFIED_INTENT] No response from GPT-4o after ${Date.now() - startTime}ms`);
      return getDefaultUnifiedDecision();
    }

    // Parse JSON with robust parsing
    let sanitizedResult = result.trim();

    if (sanitizedResult.startsWith('```') && sanitizedResult.endsWith('```')) {
      const lines = sanitizedResult.split('\n');
      sanitizedResult = lines.slice(1, -1).join('\n');
    }

    if (sanitizedResult.startsWith('json\n')) {
      sanitizedResult = sanitizedResult.replace('json\n', '');
    }

    // Extract JSON object using brace matching
    const firstBraceIndex = sanitizedResult.indexOf('{');
    if (firstBraceIndex !== -1) {
      let braceCount = 0;
      let endIndex = firstBraceIndex;

      for (let i = firstBraceIndex; i < sanitizedResult.length; i++) {
        if (sanitizedResult[i] === '{') braceCount++;
        else if (sanitizedResult[i] === '}') braceCount--;

        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }

      if (braceCount === 0) {
        sanitizedResult = sanitizedResult.substring(firstBraceIndex, endIndex + 1);
      }
    }

    const decision: UnifiedIntentDecision = JSON.parse(sanitizedResult);
    
    console.log(`🧠 [UNIFIED_INTENT] Analysis complete: ${Date.now() - startTime}ms - webSearch: ${decision.webSearch.shouldSearch}, instagram: ${decision.instagramAnalysis.shouldAnalyze}, blog: ${decision.blogAnalysis.shouldAnalyze}, phase: ${decision.workflowPhase.currentPhase}`);
    
    return decision;

  } catch (error) {
    console.error(`❌ [UNIFIED_INTENT] Error after ${Date.now() - startTime}ms:`, error);
    return getDefaultUnifiedDecision();
  }
}

/**
 * Returns a safe default unified decision when analysis fails
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