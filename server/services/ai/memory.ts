import { openai } from "../openai";
import logger from "../../logger";
import OpenAI from "openai";
// Centralized OpenAI client initialization for query rephrasing (using Gemini for cost efficiency)
const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL:"https://generativelanguage.googleapis.com/v1beta/openai"
});


/**
 * Builds a query for memory search using smart concatenation.
 * SIMPLIFIED VERSION - No AI rephrasing for better performance.
 * 
 * Strategy:
 * 1. User message is already good for most cases
 * 2. If too short, add context from last assistant response
 * 3. Truncate to optimal embedding length (60-200 chars)
 * 
 * CRITICAL: Embedding search queries should be SHORT and FOCUSED
 * - Optimal: 15-40 tokens (60-160 chars)
 * - Max acceptable: 50 tokens (200 chars)
 * - Longer queries dilute semantic similarity and reduce search quality
 */
export async function buildMemorySearchQuery(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
): Promise<string> {
  const startTime = Date.now();
  const OPTIMAL_MIN = 60;  // Minimum chars for good embedding
  const OPTIMAL_MAX = 200; // Maximum chars for focused embedding
  const userMessageLength = userMessage.trim().length;

  try {
    logger.log(`🔍 [AI_SERVICE] Building memory search query (simplified)...`);

    // If user message is already in optimal range, use it directly
    if (userMessageLength >= OPTIMAL_MIN && userMessageLength <= OPTIMAL_MAX) {
      logger.log(
        `✅ [AI_SERVICE] Using user message directly (${userMessageLength} chars, optimal range): ${Date.now() - startTime}ms`
      );
      return userMessage.trim();
    }

    // If user message is too long, truncate intelligently
    if (userMessageLength > OPTIMAL_MAX) {
      // Try to truncate at sentence boundary
      const truncated = userMessage.substring(0, OPTIMAL_MAX);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);
      
      const result = lastSentence > OPTIMAL_MIN 
        ? truncated.substring(0, lastSentence + 1).trim()
        : truncated.trim();
      
      logger.log(
        `✅ [AI_SERVICE] Truncated long message (${userMessageLength} → ${result.length} chars): ${Date.now() - startTime}ms`
      );
      return result;
    }

    // If user message is too short, add context from last assistant response
    if (userMessageLength < OPTIMAL_MIN && conversationHistory.length > 0) {
      const lastAssistant = conversationHistory
        .slice()
        .reverse()
        .find(m => m.role === 'assistant');
      
      if (lastAssistant) {
        // Extract key phrases from assistant response (nouns, verbs, important words)
        const assistantWords = lastAssistant.content
          .toLowerCase()
          .split(/\s+/)
          .filter(word => 
            word.length > 4 && // Skip short words
            !['that', 'this', 'with', 'have', 'been', 'they', 'your', 'from', 'about'].includes(word)
          );
        
        const contextSnippet = assistantWords.slice(0, 15).join(' ');
        const contextQuery = `${userMessage.trim()} ${contextSnippet}`.substring(0, OPTIMAL_MAX);
        
        logger.log(
          `✅ [AI_SERVICE] Added assistant context (${userMessageLength} → ${contextQuery.length} chars): ${Date.now() - startTime}ms`
        );
        return contextQuery;
      }
    }

    // Fallback: just use the user message as-is
    logger.log(
      `✅ [AI_SERVICE] Using user message as-is (${userMessageLength} chars): ${Date.now() - startTime}ms`
    );
    return userMessage.trim();
  } catch (error) {
    logger.error(
      `❌ [AI_SERVICE] Query building error after ${Date.now() - startTime}ms:`,
      error
    );
    // Fallback to truncated user message
    return userMessage.substring(0, OPTIMAL_MAX);
  }
}

/**
 * AI-powered query rephrasing (ADVANCED USE ONLY - adds 70-100ms latency)
 * Only use this for explicit "search my memories" commands or when
 * the user query is extremely vague and needs clarification.
 * 
 * For normal conversation, use buildMemorySearchQuery() instead.
 */
export async function rephraseQueryWithAI(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
  startTime?: number,
): Promise<string> {
  const internalStartTime = startTime || Date.now();
  try {
    logger.log(`🤖 [AI_SERVICE] AI rephrasing query for embedding search...`);

    // Build conversation context from recent messages
    const contextMessages = conversationHistory
      .slice(-2) // Last 2 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Build user context
    let userContext = "";
    if (user) {
      const platforms = (user as any).primaryPlatforms?.length
        ? (user as any).primaryPlatforms.join(", ")
        : (user.primaryPlatform || "Not specified");
      userContext = `User Profile:
 - Name: ${user.firstName || "Not provided"}${user.lastName ? " " + user.lastName : ""}
 - Content Niche: ${user.contentNiche?.join(", ") || "Not specified"}
 - Primary Platform(s): ${platforms}`;

      if (user.profileData) {
        const data = user.profileData as any;
        if (data.targetAudience)
          userContext += `\n- Target Audience: ${data.targetAudience}`;
        if (data.businessType)
          userContext += `\n- Business Type: ${data.businessType}`;
      }
    }

    const response = await geminiClient.chat.completions.create({
      model: "gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are a query optimization assistant for semantic memory search. Create a SHORT, FOCUSED search query optimized for vector embeddings.

CRITICAL CONSTRAINTS:
- Target length: 15-40 tokens (60-160 characters)
- Maximum acceptable: 50 tokens (200 characters)
- Focus on KEY CONCEPTS and SEMANTIC MEANING
- Remove filler words, keep only meaningful terms
- Make implicit concepts explicit
- Use synonyms that might appear in stored memories

OPTIMIZATION TECHNIQUES:
1. Extract core intent and key concepts
2. Add relevant context terms that improve semantic matching
3. Use natural language (not just keywords)
4. Keep it concise but semantically rich

EXAMPLES (showing optimal length):
Input: "How do I post more frequently on my Instagram without burning out?"
Output: "increase Instagram posting frequency avoid burnout sustainable content strategy"

Input: "That carousel format you suggested didn't get good engagement"
Output: "carousel format low engagement unsuccessful content strategy"

Input: "What are some ideas for fitness content?"
Output: "fitness content ideas workout posts health wellness topics"

Input: "Tell me about my audience demographics"
Output: "audience demographics target audience characteristics"

Return ONLY the optimized query (60-160 chars), nothing else.`,
        },
        {
          role: "user",
          content: `${userContext ? userContext + "\n\n" : ""}Recent Conversation Context:
${contextMessages}

Latest User Message to Rephrase: "${userMessage}"

Rephrase this query for better memory search:`,
        },
      ],
      max_tokens: 100,
      temperature: 0.1,
    });

    const rephrasedQuery =
      response.choices[0]?.message?.content?.trim() || userMessage;
    logger.log(
      `🤖 [AI_SERVICE] AI query rephrasing completed: ${Date.now() - internalStartTime}ms`
    );
    return rephrasedQuery;
  } catch (error) {
    logger.error(
      `❌ [AI_SERVICE] AI query rephrasing error after ${Date.now() - internalStartTime}ms:`,
      error
    );
    // Fallback to original query on error
    return userMessage;
  }
}

/**
 * Legacy function for backward compatibility - now uses buildMemorySearchQuery
 * @deprecated Use buildMemorySearchQuery instead
 */
export async function rephraseQueryForEmbedding(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
): Promise<string> {
  return buildMemorySearchQuery(userMessage, conversationHistory, user);
}

export interface ExtractedMemory {
  content: string;
  confidence: number;
  source: 'user' | 'assistant' | 'conversation';
}

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  existingMemories?: Array<{ content: string; similarity?: number }>,
): Promise<ExtractedMemory[]> {
  try {
    // Use GPT-4o-mini for more precise instruction following
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract valuable insights from this conversation. Be thorough but selective - capture 2-6 memories depending on information density.

MEMORY EXTRACTION RULES:
- Extract valuable insights from BOTH user messages AND assistant responses
- Focus on confirmed preferences, decisions, and discovered business information
- Include specific content requests and strategy discussions
- Capture user's stated goals and content direction
- Be inclusive of important details but avoid speculation

EXTRACT FROM USER MESSAGES:
- Content preferences and directions ("I want to create...", "I'm interested in...")
- Business goals and objectives they mention
- Platform preferences and strategies they want to pursue
- Feedback on past content or strategies
- Personal/business details they share
- Explicit decisions or confirmations

EXTRACT FROM ASSISTANT RESPONSES:
- Discovered business information from website/Instagram analysis (confirmed facts only)
- Data-driven observations about their current performance
- User-confirmed strategic decisions or preferences
- Concrete facts about their content or audience

DO NOT EXTRACT FROM ASSISTANT RESPONSES:
- Suggestions, recommendations, or "could try" statements
- Generic advice or ideas not yet confirmed by user
- Questions the assistant asks to the user
- Any statement phrased as advice ("You should...", "You could...", "Try...")
- Speculative content ideas that haven't been explicitly accepted

EXAMPLES:
✅ GOOD: "User wants to create relationship-focused content for Instagram"
✅ GOOD: "Business focuses on couples therapy and neuropsychiatric coaching"
✅ GOOD: "Current Instagram engagement rate is 1.66% with 885 followers"
✅ GOOD: "User confirmed interest in weekly posting schedule"
❌ BAD: "Assistant suggests trying carousel format"
❌ BAD: "User is asked about preferred content formats"
❌ BAD: "Could explore fashion-wellness combination"

${existingMemories && existingMemories.length > 0 ? 
`EXISTING MEMORIES TO AVOID DUPLICATING:
${existingMemories.slice(0, 3).map(m => `- ${m.content}`).join('\n')}` : ''}

Each memory: complete sentence, 20-150 chars, specific and actionable.

Return JSON array or [] if no confirmed user insights found.`,
        },
        {
          role: "user",
          content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.15, // Low temperature for consistent extraction with some flexibility
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return [];
    logger.log(`🧠 [AI_SERVICE] Raw memory extraction result:`, result)
    try {
      // Clean up the result before parsing
      let cleanResult = result.trim();

      // Remove any markdown code blocks
      if (cleanResult.startsWith("```") && cleanResult.endsWith("```")) {
        const lines = cleanResult.split("\n");
        cleanResult = lines.slice(1, -1).join("\n");
      }

      // Remove any "json" prefix
      if (cleanResult.startsWith("json\n")) {
        cleanResult = cleanResult.replace("json\n", "");
      }

      // Find the JSON array bounds
      const firstBracketIndex = cleanResult.indexOf("[");
      const lastBracketIndex = cleanResult.lastIndexOf("]");

      if (
        firstBracketIndex !== -1 &&
        lastBracketIndex !== -1 &&
        lastBracketIndex > firstBracketIndex
      ) {
        cleanResult = cleanResult.substring(
          firstBracketIndex,
          lastBracketIndex + 1,
        );
      }

      // Fix common JSON issues
      cleanResult = cleanResult
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\n/g, " ") // Replace literal \n with spaces
        .replace(/\\"/g, '"') // Fix escaped quotes
        .replace(/"\s*,\s*]/g, '"]') // Fix trailing commas before closing bracket
        .replace(/,\s*]/g, "]") // Remove trailing commas
        .replace(/[^"]*$/g, (match) => {
          // Handle unterminated strings at the end by removing incomplete entries
          if (match.includes('"') && !match.endsWith('"]')) {
            return '"]';
          }
          return match;
        });

      const memories = JSON.parse(cleanResult);

      // Post-processing filter with confidence scoring
      const filteredMemories: ExtractedMemory[] = Array.isArray(memories)
        ? memories.map((m) => {
            if (typeof m !== "string") return null;
            const trimmed = m.trim();

            // Basic sanity checks
            if (trimmed.length < 10 || trimmed.length > 500) return null;

            const meaningfulChars = trimmed.replace(/[\s\p{P}\p{S}]/gu, '');
            if (meaningfulChars.length < trimmed.length * 0.4) return null;

            // Calculate confidence score (0-1)
            let confidence = 0.7; // Base confidence
            const wordCount = trimmed.split(/\s+/).length;

            // POST-PROCESSING FILTER: Language-agnostic using character diversity

            // 1. Filter out questions (universal - ends with ?)
            if (trimmed.match(/\?$/)) {
              logger.log(`🧠 [MEMORY_FILTER] Filtered question: "${trimmed}"`);
              return null;
            }

            // 2. Filter out JSON-like structures (but not hashtag lists)
            const hasHashtags = trimmed.includes('#');
            if (!hasHashtags && (trimmed.match(/^\{.*".*".*\}$/) || trimmed.match(/^\[.*\]$/))) {
              logger.log(`🧠 [MEMORY_FILTER] Filtered JSON structure: "${trimmed}"`);
              return null;
            }

            // 3. Character diversity check (more language-agnostic, but skip for hashtag-heavy content)
            const hashtagCount = (trimmed.match(/#/g) || []).length;
            if (hashtagCount < 3) { // Only apply diversity check if not a hashtag list
              const uniqueChars = new Set(trimmed.toLowerCase()).size;
              const diversityRatio = uniqueChars / trimmed.length;
              if (diversityRatio < 0.15) {
                logger.log(`🧠 [MEMORY_FILTER] Filtered low diversity (${diversityRatio.toFixed(2)}): "${trimmed}"`);
                return null;
              }

              // Boost confidence for good diversity
              if (diversityRatio > 0.3) confidence += 0.1;
            }

            // 4. Detect quoted text patterns (but allow some quotes for hashtag contexts)
            const quoteCount = (trimmed.match(/["'«»"'"]/g) || []).length;
            if (quoteCount >= 8) { // Increased threshold from 6 to 8
              logger.log(`🧠 [MEMORY_FILTER] Filtered multiple quotes: "${trimmed}"`);
              return null;
            }

            // 5. Word count quality checks (relaxed for structured data like hashtags)
            if (wordCount < 4 && hashtagCount < 2) { // Allow shorter if has hashtags
              logger.log(`🧠 [MEMORY_FILTER] Filtered too short (${wordCount} words): "${trimmed}"`);
              return null;
            }
            if (wordCount > 80) { // Increased from 60 to allow hashtag lists
              logger.log(`🧠 [MEMORY_FILTER] Filtered too long (${wordCount} words): "${trimmed}"`);
              return null;
            }

            // Boost confidence for optimal length (10-40 words) or hashtag-rich content
            if ((wordCount >= 10 && wordCount <= 40) || hashtagCount >= 3) confidence += 0.15;

            // 6. Detect excessive parentheticals (but allow hashtag lists with commas)
            const parenCount = (trimmed.match(/[()[\]]/g) || []).length;
            if (parenCount >= 8 && hashtagCount < 2) { // Increased threshold and exclude hashtag content
              logger.log(`🧠 [MEMORY_FILTER] Filtered excessive parentheticals: "${trimmed}"`);
              return null;
            }

            // Determine source from content patterns
            const lowerContent = trimmed.toLowerCase();
            let source: 'user' | 'assistant' | 'conversation' = 'conversation';
            
            if (lowerContent.includes('user wants') || lowerContent.includes('user confirmed')) {
              source = 'user';
              confidence += 0.1;
            } else if (lowerContent.includes('analysis') || lowerContent.includes('discovered')) {
              source = 'assistant';
            }

            return { content: trimmed, confidence: Math.min(1.0, confidence), source };
          }).filter((m): m is ExtractedMemory => m !== null)
        : [];

      logger.log(`🧠 [AI_SERVICE] Extracted ${filteredMemories.length} memories with confidence scores`);
      return filteredMemories;
    } catch (parseError) {
      logger.log("Memory extraction JSON parse error:", parseError);
      logger.log("Raw result:", result);

      // Fallback: try to extract complete strings manually using regex
      try {
        // Find complete quoted strings, being more careful about incomplete ones
        const stringMatches = result.match(/"[^"]*"/g);
        if (stringMatches) {
          const extractedStrings = stringMatches
            .map((match) => match.slice(1, -1)) // Remove quotes
            .filter((str) => {
              const trimmed = str.trim();

              // Basic fallback filtering - keep it simple
              if (trimmed.length < 10 || trimmed.length > 500) return false;

              // Filter out content that's mostly punctuation/symbols
              const meaningfulChars = trimmed.replace(/[\s\p{P}\p{S}]/gu, '');
              if (meaningfulChars.length < trimmed.length * 0.4) return false;

              return true;
            })
            .slice(0, 5); // Max 5 memories

          logger.log(
            "Fallback extraction found:",
            extractedStrings.length,
            "memories",
          );
          // Return properly formatted ExtractedMemory objects
          return extractedStrings.map(content => ({
            content,
            confidence: 0.5, // Lower confidence for fallback extraction
            source: 'conversation' as const
          }));
        }
      } catch (fallbackError) {
        logger.log("Fallback extraction also failed:", fallbackError);
      }

      return [];
    }
  } catch (error) {
    logger.log("Memory extraction error:", error);
    return [];
  }
}