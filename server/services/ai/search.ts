import { type User } from "@shared/schema";
import { openai } from "../openai";
import {
  ChatMessage,
  WebSearchDecision,
  BlogAnalysisDecision,
  safeJsonParse
} from "./intent";

export async function decideBlogAnalysis(
  messages: ChatMessage[],
  user?: User
): Promise<BlogAnalysisDecision> {
  const startTime = Date.now();
  try {
    console.log(`📝 [BLOG_AI] Analyzing if user wants blog analysis...`);

    // Get last 3 messages for context
    const contextMessages = messages.slice(-3);
    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a blog analysis detector. Determine if the user is asking to analyze their blog posts or blog content.

DETECTION RULES:
- Look for requests to "analyze", "read", "check", "review" blog posts or blog content
- Look for blog URLs or mentions of "my blog", "blog posts", "my website"
- Look for requests about writing style, tone, content analysis of blogs
- Look for competitor blog analysis requests
- Be liberal - if someone mentions wanting insights about blog content, they likely want analysis

Return ONLY valid JSON:
{
  "shouldAnalyze": boolean,
  "urls": ["array of blog URLs if mentioned, or empty array"],
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of the decision"
}`
        },
        {
          role: 'user',
          content: `RECENT CONVERSATION:
${conversationContext}

Should I analyze blog posts based on this conversation?`
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [BLOG_AI] No response from GPT-4o-mini after ${Date.now() - startTime}ms`);
      return {
        shouldAnalyze: false,
        urls: [],
        confidence: 0.0,
        reason: "No response from AI"
      };
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

    const decision: BlogAnalysisDecision = JSON.parse(sanitizedResult.trim());
    console.log(`📝 [BLOG_AI] Analysis decision: ${Date.now() - startTime}ms - shouldAnalyze: ${decision.shouldAnalyze}, urls: ${decision.urls.length}, confidence: ${decision.confidence}`);
    return decision;

  } catch (error) {
    console.error(`❌ [BLOG_AI] Blog analysis detection error after ${Date.now() - startTime}ms:`, error);
    return {
      shouldAnalyze: false,
      urls: [],
      confidence: 0.0,
      reason: "Error in analysis detection"
    };
  }
}

export async function decideWebSearch(
  messages: ChatMessage[],
  user?: User
): Promise<WebSearchDecision> {
  const startTime = Date.now();
  try {
    console.log(`🧠 [AI_SERVICE] Analyzing search decision with GPT-4o-mini...`);

    // Get last 5-8 messages for context
    const contextMessages = messages.slice(-8);
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Build user context
    let userContext = '';
    if (user) {
      userContext = `User Profile:
- Name: ${user.firstName || 'Not provided'}${user.lastName ? ' ' + user.lastName : ''}
- Content Niche: ${user.contentNiche?.join(', ') || 'Not specified'}
- Primary Platform: ${user.primaryPlatform || 'Not specified'}`;

      if (user.profileData) {
        const data = user.profileData as any;
        if (data.targetAudience) userContext += `\n- Target Audience: ${data.targetAudience}`;
        if (data.businessType) userContext += `\n- Business Type: ${data.businessType}`;
      }
    }

    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI search decision assistant. Analyze conversation context to decide if web search is needed for the latest user message.

Current date: ${currentDate}

IMPORTANT: Be CONSERVATIVE with search decisions. Only recommend search for queries that genuinely need current, factual, or time-sensitive information.

LANGUAGE MATCHING: When searching specific websites, adapt search terms to the website's primary language context:
- For non-English sites: Use site-specific searches with minimal language-specific terms
- For site-specific searches, prioritize using just the domain URL (e.g., "site:example.com") rather than complex keyword combinations
- When user asks to "read" or "analyze" a specific website, use simple site: search with minimal additional terms
- Let the search service handle language detection and content extraction automatically

DO NOT search for:
- Greetings ("Hi", "Hello", "Thanks", "Goodbye")
- Social conversation ("How are you?", "Nice to meet you")
- General questions that can be answered with existing knowledge
- Personal opinions or subjective advice
- Basic how-to questions about common topics
- Conversational responses or acknowledgments
- Instagram profile analysis requests (these use dedicated Instagram analysis service)
- Instagram account mentions with @username (handled by Instagram analysis)

DO search for:
- Current events, news, or recent developments
- Specific facts, statistics, or data that may change
- Pricing information for products/services
- Recent algorithm changes or platform updates  
- Time-sensitive information (today, this week, latest, recent)
- Specific company or product information that may be outdated
- Website content analysis requests (use simple site: searches with minimal additional terms)
- X (Twitter) trends, discussions, or platform-specific content
- Social media trends and real-time discussions

PLATFORM-SPECIFIC PRIORITY RULES:
- Instagram analysis requests: DO NOT search - these are handled by dedicated Instagram analysis service
- X (Twitter) analysis requests: USE grok search with specific X-focused queries
- General social media trends: USE grok for real-time social discussions

SEARCH QUERY RULES:
- For X (Twitter) searches: Use specific X-focused terms like "site:x.com" or handle-based queries
- For any website: Use simple, effective approaches:
  1. Use "site:domain.com" (Search service will automatically try multiple fallback strategies)
  2. For business analysis, add universal business terms: "site:domain.com services business"
  3. Use universal keywords that apply across languages and cultures
- For website content requests: Use "site:domain.com" - let search service handle fallbacks and language detection
- Keep search terms simple and universal
- Keep queries simple and let advanced search parameters do the work

Return ONLY valid JSON with these exact fields:
{
  "shouldSearch": boolean,
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of decision",
  "refinedQuery": "optimized search query in appropriate language if shouldSearch=true, otherwise empty string",
  "recency": "hour|day|week|month|year (how recent info should be)",
  "domains": ["array", "of", "relevant", "website", "domains", "if", "any"],
  "searchService": "perplexity|grok (use grok ONLY for X/Twitter content, real-time social discussions; use perplexity for general web search)",
  "socialHandles": ["array", "of", "twitter", "handles", "if", "relevant", "for", "grok", "search"]
}

Be especially conservative - when in doubt, choose NO search.`
        },
        {
          role: 'user',
          content: `${userContext ? userContext + '\n\n' : ''}Recent Conversation:
${conversationContext}

Analyze the LATEST user message and decide if web search is needed.`
        }
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistent decisions
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [AI_SERVICE] No response from GPT-4.1 for search decision after ${Date.now() - startTime}ms`);
      return {
        shouldSearch: false,
        confidence: 0.9,
        reason: "Unable to analyze query, defaulting to no search",
        refinedQuery: "",
        recency: "month",
        domains: [],
        searchService: "perplexity",
        socialHandles: []
      };
    }

    // Robust JSON parsing with bracket-scanning to extract first top-level object
    let sanitizedResult = result.trim();

    // Remove code fences if present
    if (sanitizedResult.startsWith('```') && sanitizedResult.endsWith('```')) {
      const lines = sanitizedResult.split('\n');
      sanitizedResult = lines.slice(1, -1).join('\n');
    }

    // Remove json language identifier if present
    if (sanitizedResult.startsWith('json\n')) {
      sanitizedResult = sanitizedResult.replace('json\n', '');
    }

    sanitizedResult = sanitizedResult.trim();

    // Extract first top-level JSON object using bracket scanning
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

    const decision: WebSearchDecision = JSON.parse(sanitizedResult);
    console.log(`🧠 [AI_SERVICE] Search decision: ${Date.now() - startTime}ms - shouldSearch: ${decision.shouldSearch}, confidence: ${decision.confidence}`);
    return decision;

  } catch (error) {
    console.error(`❌ [AI_SERVICE] Search decision error after ${Date.now() - startTime}ms:`, error);
    // Conservative fallback - no search on error
    return {
      shouldSearch: false,
      confidence: 0.9,
      reason: "Error analyzing query, defaulting to no search for safety",
      refinedQuery: "",
      recency: "month",
      domains: [],
      searchService: "perplexity",
      socialHandles: []
    };
  }
}