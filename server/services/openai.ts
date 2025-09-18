import OpenAI from "openai";
import { type User, type UpdateUserProfile } from "@shared/schema";
import { perplexityService } from "./perplexity";

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function buildPersonalizedSystemPrompt(user?: User, memories?: any[], webSearchContext?: { context: string; citations: string[] }): string {
  const basePrompt = `You are ContentCraft AI, a friendly and expert social media content strategist. Your role is to:

1. Get to know the user personally - ask for their name if you don't know it yet
2. Help users discover their content niche and focus areas through thoughtful questions
3. Brainstorm creative social media content ideas tailored to their brand
4. Provide actionable strategies for Instagram, TikTok, LinkedIn, and other platforms
5. Suggest trending topics, hashtags, and engagement tactics
6. Guide users through content planning and creation processes

Always be conversational, enthusiastic, and provide specific, actionable advice. Use emojis appropriately to make conversations engaging. Make sure to learn their name early in the conversation so you can personalize your responses.`;

  if (!user || (!user.firstName && !user.contentNiche?.length && !user.primaryPlatform && !user.profileData)) {
    return basePrompt + `\n\nIf this is a new conversation, start by getting to know the user personally - ask for their name and then explore their content focus areas and interests.`;
  }

  let personalizedPrompt = basePrompt;
  
  if (user.firstName) {
    personalizedPrompt += `\n\nUser's name: ${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`;
  } else {
    personalizedPrompt += `\n\nUser's name: Not yet provided - ask for their name to personalize the conversation`;
  }
  
  if (user.contentNiche?.length) {
    personalizedPrompt += `\nUser's content niche: ${user.contentNiche.join(', ')}`;
  }
  
  if (user.primaryPlatform) {
    personalizedPrompt += `\nPrimary platform: ${user.primaryPlatform}`;
  }
  
  if (user.profileData) {
    const data = user.profileData as any;
    if (data.targetAudience) personalizedPrompt += `\nTarget audience: ${data.targetAudience}`;
    if (data.brandVoice) personalizedPrompt += `\nBrand voice: ${data.brandVoice}`;
    if (data.businessType) personalizedPrompt += `\nBusiness type: ${data.businessType}`;
    if (data.contentGoals?.length) personalizedPrompt += `\nContent goals: ${data.contentGoals.join(', ')}`;
  }
  
  personalizedPrompt += `\n\nTailor your advice to their specific situation and ask relevant follow-up questions to fill in any missing profile information, especially their name if not yet known.`;
  
  // Add relevant memories to context
  if (memories && memories.length > 0) {
    personalizedPrompt += `\n\nRELEVANT MEMORIES FROM PAST CONVERSATIONS (use this context to provide personalized responses):`;
    memories.forEach((memory, index) => {
      personalizedPrompt += `\n${index + 1}. ${memory.content} (similarity: ${(memory.similarity * 100).toFixed(1)}%)`;
    });
    personalizedPrompt += `\n\nReference these memories naturally when relevant to provide continuity and personalized advice.`;
  }

  // Add web search context if available
  if (webSearchContext && webSearchContext.context) {
    personalizedPrompt += `\n\nCURRENT WEB SEARCH RESULTS (use this up-to-date information to provide accurate, current advice):`;
    personalizedPrompt += `\n${webSearchContext.context}`;
    if (webSearchContext.citations.length > 0) {
      personalizedPrompt += `\n\nSOURCES: ${webSearchContext.citations.slice(0, 3).join(', ')}`;
      personalizedPrompt += `\n\nWhen referencing this information, naturally mention it's current/recent information and cite sources when helpful.`;
    }
  }
  
  return personalizedPrompt;
}

export interface WebSearchDecision {
  shouldSearch: boolean;
  confidence: number;
  reason: string;
  refinedQuery: string;
  recency: 'hour' | 'day' | 'week' | 'month' | 'year';
  domains: string[];
}

export interface ChatResponseWithMetadata {
  stream: ReadableStream<string>;
  searchPerformed: boolean;
  citations: string[];
  searchQuery?: string;
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

export async function generateChatResponse(messages: ChatMessage[], user?: User, memories?: any[]): Promise<ChatResponseWithMetadata> {
  const startTime = Date.now();
  console.log(`🤖 [AI_SERVICE] Building system prompt...`);
  
  // Use AI-driven search decision system
  let webSearchContext: { context: string; citations: string[] } | undefined = undefined;
  let searchPerformed = false;
  let searchQuery: string | undefined = undefined;

  // Get AI decision on whether to perform web search
  const searchDecision = await decideWebSearch(messages, user);
  console.log(`🧠 [AI_SERVICE] Search decision - shouldSearch: ${searchDecision.shouldSearch}, confidence: ${searchDecision.confidence}, reason: ${searchDecision.reason}`);

  if (perplexityService.isConfigured() && searchDecision.shouldSearch && searchDecision.confidence >= 0.7) {
    try {
      // Fallback to last user message if refinedQuery is empty
      searchQuery = searchDecision.refinedQuery;
      if (!searchQuery.trim() && searchDecision.shouldSearch) {
        // Find the actual last user message by searching backwards through messages
        const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content?.trim() || '';
        if (lastUserMessage) {
          searchQuery = lastUserMessage;
          console.log(`🔍 [AI_SERVICE] Using fallback query from last user message: "${searchQuery}"`);
        } else {
          console.log(`⚠️ [AI_SERVICE] No user message found for fallback, skipping search`);
          searchPerformed = false;
        }
      }
      
      console.log(`🔍 [AI_SERVICE] Performing web search with query: "${searchQuery}"`);
      const searchStart = Date.now();
      searchPerformed = true;
      // searchQuery already set above with fallback logic
      
      // Use the search query with AI decision parameters
      webSearchContext = await perplexityService.searchForChatContext(
        searchQuery,
        "Provide current, relevant information that would help a social media content strategist give accurate advice. Focus on recent trends, current events, or factual data mentioned in the query.",
        searchDecision.recency,
        searchDecision.domains
      );
      
      console.log(`🔍 [AI_SERVICE] Web search completed: ${Date.now() - searchStart}ms (${webSearchContext.citations.length} sources)`);
    } catch (error) {
      console.log(`❌ [AI_SERVICE] Web search failed, continuing without search context:`, error);
      searchPerformed = false;
    }
  } else if (!perplexityService.isConfigured()) {
    console.log(`⚠️ [AI_SERVICE] Perplexity not configured, skipping search despite AI recommendation`);
  } else if (searchDecision.shouldSearch) {
    console.log(`🔍 [AI_SERVICE] AI recommended search but confidence too low (${searchDecision.confidence}), skipping search`);
  }
  
  const promptBuildStart = Date.now();
  const systemPrompt = buildPersonalizedSystemPrompt(user, memories, webSearchContext);
  console.log(`🤖 [AI_SERVICE] System prompt built: ${Date.now() - promptBuildStart}ms (length: ${systemPrompt.length} chars)`);

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];
  
  console.log(`🤖 [AI_SERVICE] Total messages: ${chatMessages.length}, Total tokens estimate: ${Math.ceil(chatMessages.reduce((acc, msg) => acc + msg.content.length, 0) / 4)}`);

  const openaiRequestStart = Date.now();
  console.log(`🤖 [AI_SERVICE] Sending request to OpenAI...`);
  const stream = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: chatMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });
  console.log(`🤖 [AI_SERVICE] OpenAI stream initialized: ${Date.now() - openaiRequestStart}ms`);

  const responseStream = new ReadableStream({
    async start(controller) {
      let chunkCount = 0;
      let totalContentLength = 0;
      const firstChunkStart = Date.now();
      let firstChunkReceived = false;
      
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            if (!firstChunkReceived) {
              console.log(`🤖 [AI_SERVICE] First chunk received: ${Date.now() - firstChunkStart}ms (TTFB)`);
              firstChunkReceived = true;
            }
            chunkCount++;
            totalContentLength += content.length;
            controller.enqueue(content);
          }
        }
        console.log(`🤖 [AI_SERVICE] Stream completed: ${chunkCount} chunks, ${totalContentLength} chars, total: ${Date.now() - startTime}ms`);
        controller.close();
      } catch (error) {
        console.log(`❌ [AI_SERVICE] Stream error after ${Date.now() - startTime}ms:`, error);
        controller.error(error);
      }
    },
  });

  return {
    stream: responseStream,
    searchPerformed,
    citations: webSearchContext?.citations || [],
    searchQuery: searchPerformed ? searchQuery : undefined
  };
}

export async function generateConversationTitle(messages: ChatMessage[]): Promise<string> {
  const startTime = Date.now();
  try {
    console.log(`📝 [AI_SERVICE] Generating conversation title...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (max 50 characters) for this conversation about social media content creation. Focus on the main topic or theme. Respond with just the title, no quotes or extra text.'
        },
        {
          role: 'user',
          content: `Conversation: ${messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}`
        }
      ],
      max_tokens: 20,
      temperature: 0.3,
    });
    
    const title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
    console.log(`📝 [AI_SERVICE] Title generated: ${Date.now() - startTime}ms ("${title}")`);
    return title;
  } catch (error) {
    console.error(`❌ [AI_SERVICE] Error generating title after ${Date.now() - startTime}ms:`, error);
    return 'New Conversation';
  }
}

export async function extractProfileInfo(userMessage: string, aiResponse: string, currentUser: User): Promise<Partial<UpdateUserProfile> | null> {
  const startTime = Date.now();
  try {
    console.log(`👤 [AI_SERVICE] Extracting profile info...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the conversation between a user and ContentCraft AI to extract profile information. Return ONLY valid JSON with these fields if mentioned:
- firstName: string (user's first name)
- lastName: string (user's last name)
- contentNiche: array of strings (e.g. ["fitness", "business"]) - CRITICAL: ALWAYS include existing content niches from the current profile plus any new ones mentioned. Never replace existing niches unless user explicitly says they want to stop focusing on something. Use consistent lowercase casing.
- primaryPlatform: string (e.g. "instagram", "tiktok", "linkedin")
- profileData: object with fields like targetAudience, brandVoice, businessType, contentGoals (array)

Only include fields that are explicitly mentioned or clearly implied. Return empty object {} if no new profile info found.

For contentNiche: If user mentions expanding, adding, or also doing content in new areas, combine ALL existing niches with the new ones. Examples:
- Current: ["therapy"] + User says "expanded to AI consulting" → Return: ["therapy", "ai consulting"]
- Current: ["fitness", "nutrition"] + User says "also do business coaching" → Return: ["fitness", "nutrition", "business coaching"]
Only exclude existing niches if user explicitly says they stopped or no longer focus on them.`
        },
        {
          role: 'user',
          content: `EXISTING USER PROFILE:
${JSON.stringify({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            contentNiche: currentUser.contentNiche || [],
            primaryPlatform: currentUser.primaryPlatform,
            profileData: currentUser.profileData
          }, null, 2)}

CONVERSATION TO ANALYZE:
User: "${userMessage}"
AI: "${aiResponse}"

EXTRACT PROFILE UPDATES:
For contentNiche: Include ALL existing niches (${JSON.stringify(currentUser.contentNiche || [])}) plus any new ones mentioned, unless user explicitly says they stopped focusing on existing ones.`
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return null;

    const profileData = JSON.parse(result);
    if (Object.keys(profileData).length === 0) {
      console.log(`👤 [AI_SERVICE] No profile updates found: ${Date.now() - startTime}ms`);
      return null;
    }

    // Calculate profile completeness
    const fields = ['firstName', 'contentNiche', 'primaryPlatform', 'targetAudience', 'brandVoice', 'businessType'];
    const currentData = {
      ...currentUser,
      ...currentUser.profileData as any,
      ...profileData,
      ...profileData.profileData as any
    };
    
    const completedFields = fields.filter(field => {
      const value = currentData[field];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    }).length;
    
    const completeness = Math.round((completedFields / fields.length) * 100);
    
    const finalProfileData = {
      ...profileData,
      profileCompleteness: completeness.toString()
    };
    
    console.log(`👤 [AI_SERVICE] Profile extracted: ${Date.now() - startTime}ms (${Object.keys(profileData).length} fields)`);
    return finalProfileData;
  } catch (error) {
    console.error(`❌ [AI_SERVICE] Profile extraction error after ${Date.now() - startTime}ms:`, error);
    return null;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const startTime = Date.now();
  try {
    console.log(`🧠 [AI_SERVICE] Generating embedding for ${text.length} chars...`);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
      encoding_format: 'float',
    });
    
    console.log(`🧠 [AI_SERVICE] Embedding generated: ${Date.now() - startTime}ms (${response.data[0].embedding.length} dimensions)`);
    return response.data[0].embedding;
  } catch (error) {
    console.error(`❌ [AI_SERVICE] Embedding generation error after ${Date.now() - startTime}ms:`, error);
    throw new Error('Failed to generate embedding');
  }
}

export async function extractMemoriesFromConversation(userMessage: string, aiResponse: string): Promise<string[]> {
  const startTime = Date.now();
  try {
    console.log(`🧠 [AI_SERVICE] Extracting memories from conversation...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this conversation between a user and ContentCraft AI to extract important information that should be remembered for future conversations. 

Extract 0-3 key facts, insights, or important details that would be valuable to remember. Focus on:
- Specific business details, goals, or strategies discussed
- Important preferences or constraints mentioned
- Key insights or advice given
- Concrete plans or decisions made

Return ONLY a JSON array of strings, each being a concise memory (1-2 sentences). Return empty array [] if nothing important to remember.

Example: ["User is launching a fitness coaching business targeting busy professionals", "Prefers Instagram Reels over TikTok due to audience demographics"]`
        },
        {
          role: 'user',
          content: `User message: "${userMessage}"\n\nAI response: "${aiResponse}"`
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return [];

    const memories = JSON.parse(result);
    const validMemories = Array.isArray(memories) ? memories.filter(m => typeof m === 'string' && m.length > 0) : [];
    console.log(`🧠 [AI_SERVICE] Memories extracted: ${Date.now() - startTime}ms (${validMemories.length} memories)`);
    return validMemories;
  } catch (error) {
    console.error(`❌ [AI_SERVICE] Memory extraction error after ${Date.now() - startTime}ms:`, error);
    return [];
  }
}
