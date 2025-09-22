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

export interface UserStyleAnalysis {
  toneKeywords: string[];
  avgSentenceLength: number;
  commonPhrases: string[];
  punctuationStyle: string;
  contentThemes: string[];
  voiceCharacteristics: string;
}

/**
 * Analyzes user's writing style from their Instagram post texts
 */
export function analyzeUserWritingStyle(postTexts: string[]): UserStyleAnalysis | null {
  if (!postTexts || postTexts.length === 0) return null;

  try {
    // Combine all post texts for analysis
    const combinedText = postTexts.join(' ').toLowerCase();
    const sentences = postTexts.flatMap(text =>
      text.split(/[.!?]+/).filter(s => s.trim().length > 5)
    );

    // Calculate average sentence length
    const avgSentenceLength = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.trim().split(' ').length, 0) / sentences.length
      : 0;

    // Extract tone keywords (emotional and descriptive words)
    // Universal positive sentiment words and phrases
    const positivePattern = /\b\w*(?:amazing|love|excited|passionate|grateful|inspired|incredible|awesome|beautiful|perfect|happy|blessed|thankful|proud|creative|innovative|fun|energetic|positive|authentic|genuine|honest|humble|confident|motivated|dedicated|focused|successful|growth|journey|learning|exploring|discovering|sharing|connecting|building|creating|transforming|achieving|celebrating|inspiring|empowering|supporting|encouraging|challenging|pushing|striving|dreaming|believing|hoping|trusting|caring|helping|giving|serving|leading|guiding|teaching|mentoring|coaching|advising)\w*\b/gi;
    const toneWords = combinedText.match(positivePattern) || [];

    // Find common phrases (2-3 word combinations that appear multiple times)
    const words = combinedText.replace(/[^\w\s]/g, '').split(/\s+/);
    const phrases: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (phrase.length > 4) {
        phrases[phrase] = (phrases[phrase] || 0) + 1;
      }
    }
    const commonPhrases = Object.entries(phrases)
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([phrase]) => phrase);

    // Analyze punctuation style
    const exclamations = (combinedText.match(/!/g) || []).length;
    const questions = (combinedText.match(/\?/g) || []).length;
    const periods = (combinedText.match(/\./g) || []).length;
    const totalPunctuation = exclamations + questions + periods;

    let punctuationStyle = 'casual';
    if (totalPunctuation > 0) {
      const exclamationRatio = exclamations / totalPunctuation;
      if (exclamationRatio > 0.3) punctuationStyle = 'enthusiastic';
      else if (exclamationRatio < 0.1 && periods > exclamations) punctuationStyle = 'formal';
    }

    // Extract content themes based on keywords
    const themes: string[] = [];
    if (/\b(workout|fitness|gym|health|exercise|training|diet|nutrition)\b/i.test(combinedText)) themes.push('fitness & health');
    if (/\b(food|recipe|cooking|restaurant|delicious|tasty|meal)\b/i.test(combinedText)) themes.push('food & lifestyle');
    if (/\b(business|entrepreneur|startup|success|growth|marketing|sales)\b/i.test(combinedText)) themes.push('business & entrepreneurship');
    if (/\b(travel|adventure|explore|vacation|journey|destination)\b/i.test(combinedText)) themes.push('travel & adventure');
    if (/\b(family|kids|mom|dad|parent|home|life|personal)\b/i.test(combinedText)) themes.push('family & personal life');
    if (/\b(art|creative|design|photography|music|inspiration|aesthetic)\b/i.test(combinedText)) themes.push('creativity & arts');
    if (/\b(fashion|style|outfit|beauty|makeup|skincare)\b/i.test(combinedText)) themes.push('fashion & beauty');
    if (/\b(tech|technology|digital|innovation|future|AI|software)\b/i.test(combinedText)) themes.push('technology & innovation');

    // Determine voice characteristics
    let voiceCharacteristics = 'conversational';
    if (avgSentenceLength > 15) voiceCharacteristics = 'detailed and explanatory';
    else if (avgSentenceLength < 8) voiceCharacteristics = 'concise and punchy';
    if (exclamations > periods) voiceCharacteristics += ', enthusiastic';
    if (toneWords.length > postTexts.length * 2) voiceCharacteristics += ', emotionally expressive';

    return {
      toneKeywords: [...new Set(toneWords)].slice(0, 10),
      avgSentenceLength: Math.round(avgSentenceLength),
      commonPhrases,
      punctuationStyle,
      contentThemes: themes,
      voiceCharacteristics
    };

  } catch (error) {
    console.error('Error analyzing writing style:', error);
    return null;
  }
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

      // Analyze user's writing style from their post texts
      if (analysis.post_texts && analysis.post_texts.length > 0) {
        const styleAnalysis = analyzeUserWritingStyle(analysis.post_texts);
        if (styleAnalysis) {
          userContext += `\n\nUSER'S AUTHENTIC WRITING STYLE ANALYSIS:`;
          userContext += `\n- Voice: ${styleAnalysis.voiceCharacteristics}`;
          userContext += `\n- Avg sentence length: ${styleAnalysis.avgSentenceLength} words (${
            styleAnalysis.avgSentenceLength > 15 ? 'detailed posts' :
            styleAnalysis.avgSentenceLength < 8 ? 'concise posts' : 'moderate length posts'
          })`;
          userContext += `\n- Punctuation style: ${styleAnalysis.punctuationStyle}`;
          if (styleAnalysis.toneKeywords.length > 0) {
            userContext += `\n- Common tone words: ${styleAnalysis.toneKeywords.slice(0, 6).join(', ')}`;
          }
          if (styleAnalysis.commonPhrases.length > 0) {
            userContext += `\n- Signature phrases: "${styleAnalysis.commonPhrases.slice(0, 3).join('", "')}"`;
          }
          if (styleAnalysis.contentThemes.length > 0) {
            userContext += `\n- Content themes: ${styleAnalysis.contentThemes.join(', ')}`;
          }

          userContext += `\n\n🎯 CRITICAL INSTRUCTION FOR CONTENT GENERATION:`;
          userContext += `\nWhen creating content suggestions (phases 3+), MATCH this authentic style:`;
          userContext += `\n- Use similar sentence structure (${styleAnalysis.avgSentenceLength} word average)`;
          userContext += `\n- Mirror their ${styleAnalysis.punctuationStyle} punctuation style`;
          userContext += `\n- Incorporate their tone words naturally: ${styleAnalysis.toneKeywords.slice(0, 4).join(', ')}`;
          if (styleAnalysis.commonPhrases.length > 0) {
            userContext += `\n- Reference their signature phrases when relevant`;
          }
          userContext += `\n- Maintain their ${styleAnalysis.voiceCharacteristics} voice`;
          userContext += `\nDO NOT use generic social media language - make it sound authentically like THEM.`;
        }
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
- If they mention using Instagram, ask for their handle if not provided - this will trigger automatic profile analysis
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
- If Instagram analysis is available, suggest ideas that align with their existing content themes
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
- Write specific captions, scripts, or post content in THEIR authentic voice
- If style analysis is available, match their sentence length, tone, and punctuation patterns
- Use their signature phrases and tone words naturally when relevant
- Provide multiple style variations while staying true to their brand voice
- Ask for feedback and be ready to iterate on both content and style
- Include specific calls-to-action tailored to their goals using their authentic voice
- Suggest visual content directions when relevant
CRITICAL: Make content sound like THEM, not generic social media copy.`;

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
- If this appears to be the user's OWN Instagram account, also add "ownInstagramUsername" to profilePatch with the same value
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