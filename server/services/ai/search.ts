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
    const contextMessages = messages.slice(-2);
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
    const contextMessages = messages.slice(-2);
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Build user context
    let userContext = '';
    if (user) {
      const platforms = (user as any).primaryPlatforms?.length
        ? (user as any).primaryPlatforms.join(', ')
        : (user.primaryPlatform || 'Not specified');
      userContext = `User Profile:
- Name: ${user.firstName || 'Not provided'}${user.lastName ? ' ' + user.lastName : ''}
- Content Niche: ${user.contentNiche?.join(', ') || 'Not specified'}
- Primary Platform(s): ${platforms}`;

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
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are an AI search decision assistant. Analyze conversation context to decide if web search is needed for the latest user message.

Current date: ${currentDate}

IMPORTANT: Be CONSERVATIVE with search decisions. Only recommend search for queries that genuinely need current, factual, or time-sensitive information.

CRITICAL SEARCH QUERY RULES FOR WEBSITE ANALYSIS:
1. For ANY website analysis request: Use ONLY "site:domain.com" format
2. DO NOT add keywords like "services", "business", "company", etc.
3. DO NOT add language-specific terms (English or otherwise)
4. Extract the actual domain from user's message (e.g., "example.com", "site.fi")
5. Let Perplexity's AI handle content extraction and understanding automatically
6. Examples:
   - User: "Read my website coolstartup.com" → Query: "site:coolstartup.com"
   - User: "Analyze example.fi" → Query: "site:example.fi"
   - User: "What does mysite.com say?" → Query: "site:mysite.com"

WHY THIS MATTERS:
- Adding keywords causes language mismatches (English terms on Finnish sites = 0 results)
- Perplexity automatically extracts ALL content from the domain
- Simple site: queries have highest success rate across all languages

LANGUAGE-AGNOSTIC APPROACH:
- Use ONLY domain name in query for website analysis
- No additional terms needed - Perplexity reads entire site
- Works for all languages: English, Finnish, Spanish, Japanese, etc.

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
- Website content analysis requests (use ONLY "site:domain.com" format)
- X (Twitter) trends, discussions, or platform-specific content
- Social media trends and real-time discussions

PLATFORM-SPECIFIC PRIORITY RULES:
- Instagram analysis requests: DO NOT search - these are handled by dedicated Instagram analysis service
- X (Twitter) analysis requests: USE grok search with specific X-focused queries
- General social media trends: USE grok for real-time social discussions

SEARCH QUERY RULES BY TYPE:
- Website analysis: "site:domain.com" (NOTHING ELSE)
- X/Twitter: "site:x.com [topic]" OR use grok with handles
- General web facts: Use natural language query with key terms
- Recent trends: Include time-bound terms ("2025", "latest", "recent")
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
