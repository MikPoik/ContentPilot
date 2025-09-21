import OpenAI from "openai";
import { type User } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface WorkflowPhaseDecision {
  currentPhase: string;
  missingFields: string[];
  readyToAdvance: boolean;
  suggestedPrompts: string[];
  profilePatch: any;
  shouldBlockContentGeneration: boolean;
  confidence: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function buildWorkflowAwareSystemPrompt(
  workflowPhase: WorkflowPhaseDecision, 
  user?: User, 
  memories?: any[], 
  webSearchContext?: { context: string; citations: string[] },
  instagramAnalysisContext?: { analysis: any; cached: boolean; error?: string }
): string {
  const baseWorkflowPrompt = `You are ContentCraft AI, a world-class social media content strategist and creative partner with web search capabilities to provide current information.

CRITICAL WORKFLOW RULES:
- Always follow the natural conversation flow while guiding users through the 6 phases
- Be conversational, enthusiastic, and build genuine rapport
- Use emojis appropriately to make conversations engaging
- NEVER jump ahead to content generation until sufficient discovery is complete
- Ask thoughtful follow-up questions to gather missing information naturally
- Present options and get feedback before advancing to next phases

CURRENT WORKFLOW PHASE: ${workflowPhase.currentPhase}

PHASE-SPECIFIC GUIDANCE:
${getPhaseSpecificGuidance(workflowPhase)}

MISSING INFORMATION: ${workflowPhase.missingFields.length > 0 ? workflowPhase.missingFields.join(', ') : 'None'}
${workflowPhase.shouldBlockContentGeneration ? '\n⚠️ CONTENT GENERATION BLOCKED - Must complete discovery first' : ''}`;

  // Add current user context
  let userContext = '';
  if (user) {
    userContext += `\n\nCURRENT USER PROFILE:`;
    userContext += `\n- Name: ${user.firstName || 'Not provided'}${user.lastName ? ' ' + user.lastName : ''}`;
    userContext += `\n- Content Niche: ${user.contentNiche?.join(', ') || 'Not specified'}`;
    userContext += `\n- Primary Platform: ${user.primaryPlatform || 'Not specified'}`;

    if (user.profileData) {
      const data = user.profileData as any;
      if (data.targetAudience) userContext += `\n- Target Audience: ${data.targetAudience}`;
      if (data.brandVoice) userContext += `\n- Brand Voice: ${data.brandVoice}`;
      if (data.businessType) userContext += `\n- Business Type: ${data.businessType}`;
      if (data.contentGoals?.length) userContext += `\n- Content Goals: ${data.contentGoals.join(', ')}`;
    }
  }

  // Add relevant memories to context
  if (memories && memories.length > 0) {
    userContext += `\n\nRELEVANT MEMORIES FROM PAST CONVERSATIONS:`;
    memories.forEach((memory, index) => {
      userContext += `\n${index + 1}. ${memory.content} (similarity: ${(memory.similarity * 100).toFixed(1)}%)`;
    });
  }

  // Add web search context if available
  if (webSearchContext && webSearchContext.context) {
    userContext += `\n\nCURRENT WEB SEARCH RESULTS:`;
    userContext += `\n${webSearchContext.context}`;
    if (webSearchContext.citations.length > 0) {
      userContext += `\nSOURCES: ${webSearchContext.citations.slice(0, 3).join(', ')}`;
    }
  }

  // Add Instagram analysis context if available
  if (instagramAnalysisContext) {
    userContext += `\n\nINSTAGRAM ANALYSIS RESULTS:`;
    if (instagramAnalysisContext.error) {
      userContext += `\nERROR: ${instagramAnalysisContext.error}`;
      userContext += `\nProvide helpful guidance on Instagram analysis and suggest alternative approaches.`;
    } else if (instagramAnalysisContext.analysis) {
      const analysis = instagramAnalysisContext.analysis;
      const cacheStatus = instagramAnalysisContext.cached ? ' (from recent analysis)' : ' (fresh analysis)';
      userContext += `\nAnalysis for @${analysis.username}${cacheStatus}:`;
      userContext += `\n- ${analysis.followers.toLocaleString()} followers, ${analysis.engagement_rate.toFixed(2)}% engagement rate`;
      userContext += `\n- Top hashtags: ${analysis.top_hashtags.slice(0, 5).join(', ')}`;
      userContext += `\n- Avg engagement: ${Math.round(analysis.avg_likes).toLocaleString()} likes, ${Math.round(analysis.avg_comments).toLocaleString()} comments`;
      if (analysis.similar_accounts?.length > 0) {
        userContext += `\n- Similar accounts: ${analysis.similar_accounts.slice(0, 3).map(acc => `@${acc.username}`).join(', ')}`;
      }
      userContext += `\nProvide detailed insights and actionable recommendations based on this data.`;
    }
  }

  return baseWorkflowPrompt + userContext;
}

function getPhaseSpecificGuidance(workflowPhase: WorkflowPhaseDecision): string {
  switch (workflowPhase.currentPhase) {
    case "Discovery & Personalization":
      return `Focus on getting to know the user personally:
- Ask for their name if not provided
- Discover their content niche and expertise areas through thoughtful questions
- Understand their primary social media platform preferences
- Learn about their target audience and business goals
- If they mention using Instagram, ask for their handle - this will trigger automatic profile analysis
- Users can also request analysis of competitor accounts by mentioning specific handles
- Explore their content creation experience and current challenges
DO NOT suggest content ideas yet - focus purely on discovery and building rapport.`;

    case "Brand Voice & Positioning":
      return `Help clarify their brand identity and voice:
- Explore how they want to be perceived by their audience
- Understand their unique value proposition and expertise
- Identify any content topics they want to avoid or embrace
- Clarify their brand personality (playful, authoritative, inspirational, etc.)
- Ask about successful content they've created before
Still avoid specific content ideas - focus on brand foundation.`;

    case "Collaborative Idea Generation":
      return `Now you can start collaborative content ideation:
- Present 2-3 tailored content themes based on their discovered profile
- Provide brief rationale for each suggestion
- Ask for their feedback on which ideas resonate
- Explain how each idea targets their specific audience
- Invite them to modify or reject suggestions
Be collaborative - don't overwhelm with too many ideas at once.`;

    case "Developing Chosen Ideas":
      return `Develop the ideas they've shown interest in:
- Ask about preferred content formats (carousel, video, reel, infographic)
- Explore different angles (educational, story-driven, promotional)
- Provide content outlines and key points
- Ask for their input on direction and tone
- Suggest specific hooks and engagement strategies`;

    case "Content Drafting & Iterative Review":
      return `Create actual content drafts for their approval:
- Write specific captions, scripts, or post content
- Provide multiple style options (long vs short, formal vs casual)
- Ask for feedback and be ready to iterate
- Include specific calls-to-action tailored to their goals
- Suggest visual content directions when relevant`;

    case "Finalization & Scheduling":
      return `Help finalize and optimize their content:
- Add platform-specific hashtags and optimization
- Suggest best posting times for their platform and audience
- Provide cross-platform adaptation suggestions
- Offer scheduling and batch creation tips
- Ask if they want additional content pieces in this style`;

    default:
      return `Stay in discovery mode and focus on getting to know the user better through natural conversation.`;
  }
}

export async function decideWorkflowPhase(messages: ChatMessage[], user?: User): Promise<WorkflowPhaseDecision> {
  const startTime = Date.now();
  try {
    console.log(`🔄 [AI_SERVICE] Analyzing workflow phase with GPT-4.1-mini...`);

    // Get last 8 messages for context
    const contextMessages = messages.slice(-8);

    // Build current user context
    const currentProfile = {
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      contentNiche: user?.contentNiche || [],
      primaryPlatform: user?.primaryPlatform || null,
      profileData: user?.profileData || {}
    };

    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are a workflow phase analyzer for ContentCraft AI. Analyze the conversation and user profile to determine the current workflow phase and what's needed next.

The 6-step workflow phases are:
1. "Discovery & Personalization" - Getting to know user's name, niche, platform, audience, business goals
2. "Brand Voice & Positioning" - Understanding how they want to be perceived, brand voice, do's/don'ts  
3. "Collaborative Idea Generation" - Presenting tailored content ideas with rationale, getting feedback
4. "Developing Chosen Ideas" - Working on specific selected ideas, formats, angles
5. "Content Drafting & Iterative Review" - Creating actual content drafts, refining based on feedback
6. "Finalization & Scheduling" - Finalizing content, adding hashtags, scheduling suggestions

CRITICAL RULES:
- DO NOT allow content generation (phases 3+) until Discovery (name + niche/platform + basic goals) is substantially complete
- If user asks for content ideas but missing basic profile info, stay in Discovery phase and ask for missing info first
- Be conservative - when in doubt, stay in earlier phases and gather more context
- Block content generation if confidence is low that user profile is sufficient

INSTAGRAM ANALYSIS DETECTION:
- If user mentions using Instagram as their platform or mentions their Instagram username during discovery, add "instagramUsername" to profilePatch
- Look for patterns like "I use Instagram", "my Instagram is @username", "I post on IG", "my handle is @username"
- Extract the username without @ symbol if mentioned

Return ONLY valid JSON:
{
  "currentPhase": "Discovery & Personalization|Brand Voice & Positioning|Collaborative Idea Generation|Developing Chosen Ideas|Content Drafting & Iterative Review|Finalization & Scheduling",
  "missingFields": ["array of missing key info like name, niche, platform, audience, etc"],
  "readyToAdvance": boolean,
  "suggestedPrompts": ["array of 1-2 specific questions to ask next"],
  "profilePatch": {"any new profile data to store like firstName, contentNiche, primaryPlatform, instagramUsername, etc"},
  "shouldBlockContentGeneration": boolean,
  "confidence": number (0.0 to 1.0)
}`
        },
        {
          role: 'user', 
          content: `CURRENT USER PROFILE:
${JSON.stringify(currentProfile, null, 2)}

RECENT CONVERSATION:
${conversationContext}

Analyze what workflow phase we're in and what's needed next. Be conservative about advancing to content generation phases. Also detect if user mentions Instagram usage or username.`
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [AI_SERVICE] No response from GPT-4.1 for workflow phase after ${Date.now() - startTime}ms`);
      return {
        currentPhase: "Discovery & Personalization",
        missingFields: ["name", "niche", "platform"],
        readyToAdvance: false,
        suggestedPrompts: ["What's your name?", "What type of content do you create?"],
        profilePatch: {},
        shouldBlockContentGeneration: true,
        confidence: 0.9
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

    sanitizedResult = sanitizedResult.trim();

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

    const decision: WorkflowPhaseDecision = JSON.parse(sanitizedResult);
    console.log(`🔄 [AI_SERVICE] Workflow phase: ${Date.now() - startTime}ms - phase: ${decision.currentPhase}, block content: ${decision.shouldBlockContentGeneration}`);
    return decision;

  } catch (error) {
    console.error(`❌ [AI_SERVICE] Workflow phase error after ${Date.now() - startTime}ms:`, error);
    // Conservative fallback - stay in discovery
    return {
      currentPhase: "Discovery & Personalization",
      missingFields: ["name", "niche", "platform"],
      readyToAdvance: false,
      suggestedPrompts: ["What's your name?", "What type of content do you create?"],
      profilePatch: {},
      shouldBlockContentGeneration: true,
      confidence: 0.9
    };
  }
}