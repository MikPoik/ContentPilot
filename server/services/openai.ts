import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateChatResponse(messages: ChatMessage[]): Promise<ReadableStream<string>> {
  const systemPrompt = `You are ContentCraft AI, a friendly and expert social media content strategist. Your role is to:

1. Help users discover their content niche and focus areas through thoughtful questions
2. Brainstorm creative social media content ideas tailored to their brand
3. Provide actionable strategies for Instagram, TikTok, LinkedIn, and other platforms
4. Suggest trending topics, hashtags, and engagement tactics
5. Guide users through content planning and creation processes

Always be conversational, enthusiastic, and provide specific, actionable advice. Use emojis appropriately to make conversations engaging. Focus on understanding the user's brand, audience, and goals before suggesting content ideas.

If this is a new conversation, start by getting to know the user's content focus areas and interests.`;

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
