import { openai } from "../openai";
import OpenAI from "openai";
// Centralized OpenAI client initialization
const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL:"https://generativelanguage.googleapis.com/v1beta/openai"
});


export async function rephraseQueryForEmbedding(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
): Promise<string> {
  const startTime = Date.now();
  try {
    console.log(`🔄 [AI_SERVICE] Rephrasing query for embedding search...`);

    // Build conversation context from recent messages
    const contextMessages = conversationHistory
      .slice(-2) // Last 6 messages for context
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
      model: "gemini-2.0-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are a query rephrasing assistant for memory search. Your job is to rephrase the user's latest message into a better search query that will find relevant memories from past conversations.

IMPORTANT RULES:
1. Expand abbreviations and make implicit concepts explicit
2. Add relevant context from conversation history when it clarifies the query
3. Include synonyms and related terms that might be in stored memories
4. Keep the rephrased query focused and concise (1-2 sentences max)
5. If the query is already clear and specific, return it unchanged
6. Focus on the semantic meaning and intent, not just keywords

Examples:
- "How do I post more?" → "How to increase posting frequency and maintain consistency on social media platforms"
- "That didn't work" → "Content strategy or posting approach that was unsuccessful or didn't generate expected results"
- "What about Instagram?" → "Instagram-specific content strategies, posting tips, and platform best practices"

Return ONLY the rephrased query text, nothing else.`,
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
      `🔄 [AI_SERVICE] Query rephrasing completed: ${Date.now() - startTime}ms`,
    );
    return rephrasedQuery;
  } catch (error) {
    console.error(
      `❌ [AI_SERVICE] Query rephrasing error after ${Date.now() - startTime}ms:`,
      error,
    );
    // Fallback to original query on error
    return userMessage;
  }
}

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  existingMemories?: Array<{ content: string; similarity?: number }>,
): Promise<string[]> {
  try {
    const response = await geminiClient.chat.completions.create({
      model: "gemini-2.0-flash-lite",
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

GOOD EXTRACTIONS:
- "User wants to create relationship-focused content for Instagram"
- "Business focuses on couples therapy and neuropsychiatric coaching"
- "User is interested in growing awareness through Instagram content"
- "Current Instagram engagement rate is 1.66% with 885 followers"

${existingMemories && existingMemories.length > 0 ? 
`EXISTING MEMORIES TO AVOID DUPLICATING:
${existingMemories.slice(0, 3).map(m => `- ${m.content}`).join('\n')}` : ''}

Each memory: complete sentence, 20-150 chars, specific and actionable.

Return JSON array or [] if no confirmed user insights found.

GOOD EXAMPLES FROM USER:
["Confirmed: wants to combine fashion and wellness content", "Agreed to try carousel format for better engagement"]

GOOD EXAMPLES FROM AI DISCOVERIES:
["The startup offers financial consulting, tax planning, and wealth management services", "Business focuses on small to medium enterprises, risk assessment and strategic planning"]

BAD EXAMPLES (DO NOT EXTRACT):
["Might explore fashion-wellness combination", "Could try community challenges", "You could consider posting daily", "Here are some content ideas", "Assistant suggests content that highlights local community", "Assistant recommends trying carousel format", "User is asked about preferred content formats", "Assistant asks about business type", "User is prompted to share more details"]`,
        },
        {
          role: "user",
          content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.1,
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
      return Array.isArray(memories)
        ? memories.filter((m) => {
            if (typeof m !== "string") return false;
            const trimmed = m.trim();

            // Basic sanity checks - trust the AI for quality
            if (trimmed.length < 10 || trimmed.length > 500) return false;
            
            // Filter out obviously broken content (too much punctuation/symbols)
            const meaningfulChars = trimmed.replace(/[\s\p{P}\p{S}]/gu, '');
            if (meaningfulChars.length < trimmed.length * 0.4) return false;

            return true;
          })
        : [];
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
