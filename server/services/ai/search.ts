import OpenAI from "openai";
import { type User } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface WebSearchDecision {
  shouldSearch: boolean;
  confidence: number;
  reason: string;
  refinedQuery: string;
  recency: 'hour' | 'day' | 'week' | 'month' | 'year';
  domains: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function decideWebSearch(messages: ChatMessage[], user?: User): Promise<WebSearchDecision> {
  const startTime = Date.now();
  try {
    console.log(`🧠 [AI_SERVICE] Analyzing search decision with GPT-4.1-mini...`);
    
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
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI search decision assistant. Analyze conversation context to decide if web search is needed for the latest user message.

Current date: ${currentDate}

IMPORTANT: Be CONSERVATIVE with search decisions. Only recommend search for queries that genuinely need current, factual, or time-sensitive information.

DO NOT search for:
- Greetings ("Hi", "Hello", "Thanks", "Goodbye")
- Social conversation ("How are you?", "Nice to meet you")
- General questions that can be answered with existing knowledge
- Personal opinions or subjective advice
- Basic how-to questions about common topics
- Conversational responses or acknowledgments

DO search for:
- Current events, news, or recent developments
- Specific facts, statistics, or data that may change
- Pricing information for products/services
- Recent algorithm changes or platform updates  
- Time-sensitive information (today, this week, latest, recent)
- Specific company or product information that may be outdated

Return ONLY valid JSON with these exact fields:
{
  "shouldSearch": boolean,
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of decision",
  "refinedQuery": "optimized search query if shouldSearch=true, otherwise empty string",
  "recency": "hour|day|week|month|year (how recent info should be)",
  "domains": ["array", "of", "relevant", "website", "domains", "if", "any"]
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
        domains: []
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
      domains: []
    };
  }
}