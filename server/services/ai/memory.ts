import { openai } from "../openai";
import OpenAI from "openai";
// Centralized OpenAI client initialization for query rephrasing (using Gemini for cost efficiency)
const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL:"https://generativelanguage.googleapis.com/v1beta/openai"
});


/**
 * Builds a query for memory search using smart concatenation with AI fallback.
 * Strategy:
 * 1. Use just the user message if it's focused (60-200 chars = optimal for embeddings)
 * 2. If user message is too short or vague, add last assistant response for context
 * 3. If still not optimal, use AI to create a focused search query (15-40 tokens / 60-160 chars)
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
    console.log(`🔍 [AI_SERVICE] Building memory search query...`);

    // If user message is already in optimal range, use it directly
    if (userMessageLength >= OPTIMAL_MIN && userMessageLength <= OPTIMAL_MAX) {
      console.log(
        `✅ [AI_SERVICE] Using user message directly (${userMessageLength} chars, optimal range): ${Date.now() - startTime}ms`
      );
      return userMessage.trim();
    }

    // If user message is too short (< 60 chars), add last assistant response for context
    if (userMessageLength < OPTIMAL_MIN && conversationHistory.length > 0) {
      const lastAssistant = conversationHistory
        .slice()
        .reverse()
        .find(m => m.role === 'assistant');

      if (lastAssistant) {
        // Combine user message with snippet of last response
        const contextQuery = `${userMessage.trim()} ${lastAssistant.content.substring(0, 150)}`;

        if (contextQuery.length <= OPTIMAL_MAX) {
          console.log(
            `✅ [AI_SERVICE] Using user message + assistant context (${contextQuery.length} chars): ${Date.now() - startTime}ms`
          );
          return contextQuery;
        }
      }
    }

    // If message is too long or context didn't help, use AI to create focused query
    console.log(
      `⚠️ [AI_SERVICE] Message length ${userMessageLength} chars not optimal, using AI to create focused search query...`
    );
    return await rephraseQueryWithAI(userMessage, conversationHistory, user, startTime);
  } catch (error) {
    console.error(
      `❌ [AI_SERVICE] Query building error after ${Date.now() - startTime}ms:`,
      error
    );
    // Fallback to truncated user message
    return userMessage.substring(0, OPTIMAL_MAX);
  }
}

/**
 * AI-powered query rephrasing (used as fallback when concatenation is too long)
 */
async function rephraseQueryWithAI(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
  startTime?: number,
): Promise<string> {
  const internalStartTime = startTime || Date.now();
  try {
    console.log(`🤖 [AI_SERVICE] AI rephrasing query for embedding search...`);

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
    console.log(
      `🤖 [AI_SERVICE] AI query rephrasing completed: ${Date.now() - internalStartTime}ms`
    );
    return rephrasedQuery;
  } catch (error) {
    console.error(
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

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  existingMemories?: Array<{ content: string; similarity?: number }>,
): Promise<string[]> {
  try {
    // Use GPT-4o-mini for more precise instruction following
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract only the MOST valuable insights from this conversation. Quality over quantity - aim for 2-4 memories max.

MEMORY EXTRACTION RULES:
- Extract valuable insights from BOTH user messages AND assistant responses
- Focus on confirmed preferences, decisions, and discovered business information
- Include specific content requests and strategy discussions
- Capture user's stated goals and content direction

EXTRACT FROM USER MESSAGES:
- Content preferences and directions ("I want to create...", "I'm interested in...")
- Business goals and objectives they mention
- Platform preferences and strategies they want to pursue
- Feedback on past content or strategies
- Personal/business details they share

EXTRACT FROM ASSISTANT RESPONSES:
- Discovered business information from website/Instagram analysis (confirmed facts only)
- Data-driven observations about their current performance
- User-confirmed strategic decisions or preferences

DO NOT EXTRACT FROM ASSISTANT RESPONSES:
- Suggestions, recommendations, or "could try" statements
- Generic advice or ideas not yet confirmed by user
- Assistant's strategic suggestions that user hasn't agreed to
- Questions the assistant asks to the user (e.g., "User is asked about...")
- Assistant prompts or queries for more information
- Any statement phrased as advice ("You should...", "You could...", "Try...")
- Content ideas that haven't been explicitly accepted by user

GOOD EXTRACTIONS:
- "User wants to create relationship-focused content for Instagram"
- "Business focuses on couples therapy and neuropsychiatric coaching"
- "User is interested in growing awareness through Instagram content"
- "Current Instagram engagement rate is 1.66% with 885 followers"

BAD EXTRACTIONS (DO NOT EXTRACT):
- "Might explore fashion-wellness combination"
- "Could try community challenges"
- "You could consider posting daily"
- "Here are some content ideas"
- "Assistant suggests content that highlights local community"
- "Assistant recommends trying carousel format"
- "User is asked about preferred content formats"
- "Assistant asks about business type"
- "User is prompted to share more details"

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
      max_tokens: 250,
      temperature: 0.05, // Very low temperature for consistent, precise extraction
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return [];
    console.log(`🧠 [AI_SERVICE] Raw memory extraction result:`, result)
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

      // Post-processing filter to catch problematic extractions
      const filteredMemories = Array.isArray(memories)
        ? memories.filter((m) => {
            if (typeof m !== "string") return false;
            const trimmed = m.trim();

            // Basic sanity checks
            if (trimmed.length < 10 || trimmed.length > 500) return false;

            const meaningfulChars = trimmed.replace(/[\s\p{P}\p{S}]/gu, '');
            if (meaningfulChars.length < trimmed.length * 0.4) return false;

            // POST-PROCESSING FILTER: Truly language-agnostic using structural patterns only

            // 1. Filter out questions (universal - ends with ?)
            if (trimmed.match(/\?$/)) {
              console.log(`🧠 [MEMORY_FILTER] Filtered question (ends with ?): "${trimmed}"`);
              return false;
            }

            // 2. Filter out JSON-like structures or malformed extractions
            if (trimmed.match(/^\{.*".*".*\}$/) || trimmed.match(/^\[.*\]$/)) {
              console.log(`🧠 [MEMORY_FILTER] Filtered JSON structure: "${trimmed}"`);
              return false;
            }

            // 3. Statistical pattern: Too many punctuation marks = likely malformed or meta-text
            const punctuationCount = (trimmed.match(/[,;:.!?]/g) || []).length;
            const wordCount = trimmed.split(/\s+/).length;
            const punctuationRatio = punctuationCount / wordCount;

            // If more than 30% of words followed by punctuation, likely a list or malformed text
            if (punctuationRatio > 0.3 && wordCount > 3) {
              console.log(`🧠 [MEMORY_FILTER] Filtered high punctuation ratio (${punctuationRatio.toFixed(2)}): "${trimmed}"`);
              return false;
            }

            // 4. Detect quoted text patterns - often indicates suggestions or examples
            const quoteCount = (trimmed.match(/["'«»"'"]/g) || []).length;
            if (quoteCount >= 4) { // At least 2 quoted phrases
              console.log(`🧠 [MEMORY_FILTER] Filtered multiple quoted phrases: "${trimmed}"`);
              return false;
            }

            // 5. Statistical: Very short or very long memories are often malformed
            if (wordCount < 3) {
              console.log(`🧠 [MEMORY_FILTER] Filtered too short (${wordCount} words): "${trimmed}"`);
              return false;
            }

            if (wordCount > 50) {
              console.log(`🧠 [MEMORY_FILTER] Filtered too long (${wordCount} words): "${trimmed}"`);
              return false;
            }

            // 6. Detect parenthetical/explanatory text patterns - often meta-commentary
            const parenCount = (trimmed.match(/[()[\]]/g) || []).length;
            if (parenCount >= 4) { // Multiple parenthetical phrases
              console.log(`🧠 [MEMORY_FILTER] Filtered excessive parentheticals: "${trimmed}"`);
              return false;
            }
            return true;
          })
        : [];

      console.log(`🧠 [AI_SERVICE] Extracted ${filteredMemories.length} memories after post-processing filter`);
      return filteredMemories;
    } catch (parseError) {
      console.log("Memory extraction JSON parse error:", parseError);
      console.log("Raw result:", result);

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

          console.log(
            "Fallback extraction found:",
            extractedStrings.length,
            "memories",
          );
          return extractedStrings;
        }
      } catch (fallbackError) {
        console.log("Fallback extraction also failed:", fallbackError);
      }

      return [];
    }
  } catch (error) {
    console.log("Memory extraction error:", error);
    return [];
  }
}