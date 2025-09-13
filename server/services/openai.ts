import OpenAI from "openai";
import { type User, type UpdateUserProfile } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function buildPersonalizedSystemPrompt(user?: User): string {
  const basePrompt = `You are ContentCraft AI, a friendly and expert social media content strategist. Your role is to:

1. Help users discover their content niche and focus areas through thoughtful questions
2. Brainstorm creative social media content ideas tailored to their brand
3. Provide actionable strategies for Instagram, TikTok, LinkedIn, and other platforms
4. Suggest trending topics, hashtags, and engagement tactics
5. Guide users through content planning and creation processes

Always be conversational, enthusiastic, and provide specific, actionable advice. Use emojis appropriately to make conversations engaging.`;

  if (!user || (!user.contentNiche?.length && !user.primaryPlatform && !user.profileData)) {
    return basePrompt + `\n\nIf this is a new conversation, start by getting to know the user's content focus areas and interests.`;
  }

  let personalizedPrompt = basePrompt;
  
  if (user.contentNiche?.length) {
    personalizedPrompt += `\n\nUser's content niche: ${user.contentNiche.join(', ')}`;
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
  
  personalizedPrompt += `\n\nTailor your advice to their specific situation and ask relevant follow-up questions to fill in any missing profile information.`;
  
  return personalizedPrompt;
}

export async function generateChatResponse(messages: ChatMessage[], user?: User): Promise<ReadableStream<string>> {
  const systemPrompt = buildPersonalizedSystemPrompt(user);

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: chatMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(content);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function generateConversationTitle(messages: ChatMessage[]): Promise<string> {
  try {
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

    return response.choices[0]?.message?.content?.trim() || 'New Conversation';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Conversation';
  }
}

export async function extractProfileInfo(userMessage: string, aiResponse: string, currentUser: User): Promise<Partial<UpdateUserProfile> | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analyze the conversation between a user and ContentCraft AI to extract profile information. Return ONLY valid JSON with these fields if mentioned:
- contentNiche: array of strings (e.g. ["fitness", "business"])
- primaryPlatform: string (e.g. "instagram", "tiktok", "linkedin")
- profileData: object with fields like targetAudience, brandVoice, businessType, contentGoals (array)

Only include fields that are explicitly mentioned or clearly implied. Return empty object {} if no new profile info found. DO NOT include existing information already known.`
        },
        {
          role: 'user',
          content: `Current user profile: ${JSON.stringify({
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
    if (Object.keys(profileData).length === 0) return null;

    // Calculate profile completeness
    const fields = ['contentNiche', 'primaryPlatform', 'targetAudience', 'brandVoice', 'businessType'];
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
    
    return {
      ...profileData,
      profileCompleteness: completeness.toString()
    };
  } catch (error) {
    console.error('Profile extraction error:', error);
    return null;
  }
}
