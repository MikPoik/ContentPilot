import OpenAI from "openai";
import { type User, type UpdateUserProfile } from "@shared/schema";
import { perplexityService } from "./perplexity";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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

export async function generateChatResponse(messages: ChatMessage[], user?: User, memories?: any[]): Promise<ReadableStream<string>> {
  const startTime = Date.now();
  console.log(`🤖 [AI_SERVICE] Building system prompt...`);
  
  // Check if the latest user message needs web search
  const latestUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  let webSearchContext: { context: string; citations: string[] } | undefined = undefined;

  if (perplexityService.isConfigured() && perplexityService.shouldUseWebSearch(latestUserMessage)) {
    try {
      console.log(`🔍 [AI_SERVICE] Performing web search for: "${latestUserMessage.substring(0, 100)}..."`);
      const searchStart = Date.now();
      webSearchContext = await perplexityService.searchForChatContext(
        latestUserMessage,
        "Provide current, relevant information that would help a social media content strategist give accurate advice. Focus on recent trends, current events, or factual data mentioned in the query."
      );
      console.log(`🔍 [AI_SERVICE] Web search completed: ${Date.now() - searchStart}ms (${webSearchContext.citations.length} sources)`);
    } catch (error) {
      console.log(`❌ [AI_SERVICE] Web search failed, continuing without search context:`, error);
    }
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
    model: 'gpt-4o',
    messages: chatMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });
  console.log(`🤖 [AI_SERVICE] OpenAI stream initialized: ${Date.now() - openaiRequestStart}ms`);

  return new ReadableStream({
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
}

export async function generateConversationTitle(messages: ChatMessage[]): Promise<string> {
  const startTime = Date.now();
  try {
    console.log(`📝 [AI_SERVICE] Generating conversation title...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze the conversation between a user and ContentCraft AI to extract profile information. Return ONLY valid JSON with these fields if mentioned:
- firstName: string (user's first name)
- lastName: string (user's last name)
- contentNiche: array of strings (e.g. ["fitness", "business"])
- primaryPlatform: string (e.g. "instagram", "tiktok", "linkedin")
- profileData: object with fields like targetAudience, brandVoice, businessType, contentGoals (array)

Only include fields that are explicitly mentioned or clearly implied. Return empty object {} if no new profile info found. DO NOT include existing information already known.`
        },
        {
          role: 'user',
          content: `Current user profile: ${JSON.stringify({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            contentNiche: currentUser.contentNiche,
            primaryPlatform: currentUser.primaryPlatform,
            profileData: currentUser.profileData
          }, null, 2)}

User message: "${userMessage}"
AI response: "${aiResponse}"

Extract any NEW profile information:`
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
      model: 'gpt-4o',
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
