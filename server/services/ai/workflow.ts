import { type User } from "@shared/schema";
import { openai } from "../openai";
import {
  ChatMessage,
  WorkflowPhaseDecision,
  UserStyleAnalysis,
  safeJsonParse
} from "./intent";


/**
 * Analyzes user's writing style from their Instagram post texts using AI
 */
export async function analyzeUserWritingStyle(postTexts: string[]): Promise<UserStyleAnalysis | null> {
  if (!postTexts || postTexts.length === 0) return null;

  try {
    // Combine sample posts for AI analysis (limit to prevent token overflow)
    const sampleTexts = postTexts.slice(0, 5); // Take first 5 posts
    const combinedText = sampleTexts.join('\n\n---\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `Analyze the writing style from these social media posts. Extract universal patterns that work across all languages and cultures.

Return ONLY a JSON object with these fields:
- toneKeywords: Array of emotional/descriptive words that characterize the tone (max 10)
- avgSentenceLength: Average number of words per sentence (number)
- commonPhrases: Array of frequently used phrases or expressions (max 5)
- punctuationStyle: Overall punctuation approach ("formal", "casual", "enthusiastic", "minimal")
- contentThemes: Array of main topics/themes discussed (max 6)
- voiceCharacteristics: Overall voice description (string)

Focus on patterns, not specific language keywords. Be universal and language-agnostic.`
        },
        {
          role: 'user',
          content: `Analyze these social media posts:\n\n${combinedText.substring(0, 4000)}`
        }
      ],
      max_tokens: 400,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return null;

    // Parse the AI response
    let cleanResult = result.trim();
    if (cleanResult.startsWith('```') && cleanResult.endsWith('```')) {
      const lines = cleanResult.split('\n');
      cleanResult = lines.slice(1, -1).join('\n');
    }
    if (cleanResult.startsWith('json\n')) {
      cleanResult = cleanResult.replace('json\n', '');
    }

    const analysis = JSON.parse(cleanResult);

    return {
      toneKeywords: Array.isArray(analysis.toneKeywords) ? analysis.toneKeywords.slice(0, 10) : [],
      avgSentenceLength: typeof analysis.avgSentenceLength === 'number' ? Math.round(analysis.avgSentenceLength) : 12,
      commonPhrases: Array.isArray(analysis.commonPhrases) ? analysis.commonPhrases.slice(0, 5) : [],
      punctuationStyle: typeof analysis.punctuationStyle === 'string' ? analysis.punctuationStyle : 'casual',
      contentThemes: Array.isArray(analysis.contentThemes) ? analysis.contentThemes.slice(0, 6) : [],
      voiceCharacteristics: typeof analysis.voiceCharacteristics === 'string' ? analysis.voiceCharacteristics : 'conversational'
    };

  } catch (error) {
    console.error('Error analyzing writing style with AI:', error);
    return null;
  }
}

export async function buildWorkflowAwareSystemPrompt(
  workflowDecision: WorkflowPhaseDecision,
  user?: User,
  relevantMemories: any[] = [],
  webSearchContext?: { context: string; citations: string[] },
  instagramAnalysisResult?: any
): Promise<string> {
  let prompt = `You are ContentCraft AI, a world-class social media content strategist and creative partner with web search capabilities to provide current information.

CRITICAL WORKFLOW RULES:
- Always follow the natural conversation flow while guiding users through the 6 phases
- Be conversational, enthusiastic, and build genuine rapport
- Use emojis appropriately to make conversations engaging
- NEVER jump ahead to content generation until sufficient discovery is complete
- Ask thoughtful follow-up questions to gather missing information naturally
- Present options and get feedback before advancing to next phases

CURRENT WORKFLOW PHASE: ${workflowDecision.currentPhase}

${getPhaseGuidance(workflowDecision.currentPhase)}

${workflowDecision.missingFields.length > 0 ? 
  `MISSING INFORMATION: ${workflowDecision.missingFields.join(', ')}` : 
  'MISSING INFORMATION: None'
}

${workflowDecision.shouldBlockContentGeneration ? 
  '⚠️ CONTENT GENERATION BLOCKED - Must complete discovery first' : 
  '✅ READY FOR CONTENT GENERATION'
}

CURRENT USER PROFILE:
${formatUserProfile(user)}`;

  // Add detailed profile analysis data if available
  const profileData = user?.profileData as any;
  if (profileData) {
    prompt += await formatDetailedProfileData(profileData);
  }

  // Add memories section if available
  if (relevantMemories.length > 0) {
    prompt += `\n\nRELEVANT MEMORIES FROM PAST CONVERSATIONS:
${relevantMemories.map((memory, index) => 
  `${index + 1}. ${memory.content} (similarity: ${(memory.similarity * 100).toFixed(1)}%)`
).join('\n')}`;
  }

  // Add web search context if available
  if (webSearchContext?.context) {
    prompt += `\n\nCURRENT WEB SEARCH CONTEXT:
${webSearchContext.context}

Sources: ${webSearchContext.citations.join(', ')}`;
  }

  // Add Instagram analysis if available and recent
  if (instagramAnalysisResult?.success && !instagramAnalysisResult.cached) {
    const { formatInstagramAnalysisForChat } = await import('./instagram');
    prompt += `\n\n=== FRESH INSTAGRAM ANALYSIS ===
${formatInstagramAnalysisForChat(instagramAnalysisResult.analysis, false)}`;
  }

  return prompt;
}

function getPhaseGuidance(currentPhase: string): string {
  switch (currentPhase) {
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

function formatUserProfile(user?: User): string {
  if (!user) return "No user profile available";

  const profile = [
    user.firstName || user.lastName ? `- Name: ${[user.firstName, user.lastName].filter(Boolean).join(' ')}` : null,
    user.contentNiche?.length ? `- Content Niche: ${user.contentNiche.join(', ')}` : null,
    (user as any).primaryPlatforms?.length ? `- Primary Platform(s): ${(user as any).primaryPlatforms.join(', ')}` : 
      user.primaryPlatform ? `- Primary Platform: ${user.primaryPlatform}` : null,
  ].filter(Boolean);

  // Add profile data if available
  const profileData = user.profileData as any;
  if (profileData) {
    if (profileData.targetAudience) {
      profile.push(`- Target Audience: ${profileData.targetAudience}`);
    }
    if (profileData.brandVoice) {
      profile.push(`- Brand Voice: ${profileData.brandVoice}`);
    }
    if (profileData.businessType) {
      profile.push(`- Business Type: ${profileData.businessType}`);
    }
    if (profileData.contentGoals?.length) {
      profile.push(`- Content Goals: ${profileData.contentGoals.join(', ')}`);
    }
  }

  return profile.join('\n') || "No profile information available";
}

async function formatDetailedProfileData(profileData: any): Promise<string> {
  let detailedInfo = '';

  // Instagram Profile Analysis
  if (profileData.instagramProfile) {
    const ig = profileData.instagramProfile;
    detailedInfo += `\n\n📸 INSTAGRAM PROFILE INSIGHTS (@${ig.username}):
• ${ig.followers?.toLocaleString() || 'N/A'} followers, ${ig.engagement_rate?.toFixed(2) || 'N/A'}% engagement rate
• Top hashtags: ${ig.top_hashtags?.slice(0, 8).join(', ') || 'None'}
• Content style: ${ig.post_texts?.slice(0, 2).map((text: string) => `"${text.substring(0, 120)}${text.length > 120 ? '...' : ''}"`).join(' | ') || 'No samples'}
• Similar accounts: ${ig.similar_accounts?.slice(0, 3).map((acc: any) => `@${acc.username} (${acc.followers?.toLocaleString() || 'N/A'} followers)`).join(', ') || 'None'}`;

    if (ig.biography) {
      detailedInfo += `\n• Bio: "${ig.biography}"`;
    }
  }

  // Blog Profile Analysis
  if (profileData.blogProfile) {
    const blog = profileData.blogProfile;
    detailedInfo += `\n\n📝 BLOG CONTENT INSIGHTS:
• Writing style: ${blog.writingStyle || 'Unknown'}
• Brand voice: ${blog.brandVoice || 'Not defined'}
• Average post length: ${blog.averagePostLength || 'Unknown'}
• Content themes: ${blog.contentThemes?.join(', ') || 'None'}
• Common topics: ${blog.commonTopics?.slice(0, 5).join(', ') || 'None'}
• Tone keywords: ${blog.toneKeywords?.slice(0, 5).join(', ') || 'None'}`;

    if (blog.targetAudience) {
      detailedInfo += `\n• Target audience: ${blog.targetAudience}`;
    }
    if (blog.postingPattern) {
      detailedInfo += `\n• Content pattern: ${blog.postingPattern}`;
    }
  }

  // Competitor Analysis
  if (profileData.competitorAnalyses && Object.keys(profileData.competitorAnalyses).length > 0) {
    const competitors = Object.entries(profileData.competitorAnalyses).slice(0, 3);
    detailedInfo += `\n\n🎯 COMPETITOR INSIGHTS:`;

    competitors.forEach(([username, analysis]: [string, any]) => {
      detailedInfo += `\n• @${username}: ${analysis.followers?.toLocaleString() || 'N/A'} followers, ${analysis.engagement_rate?.toFixed(2) || 'N/A'}% engagement`;
      if (analysis.top_hashtags?.length > 0) {
        detailedInfo += ` | Top tags: ${analysis.top_hashtags.slice(0, 3).join(', ')}`;
      }
    });
  }

  // Recent Hashtag Research
  if (profileData.hashtagSearches && Object.keys(profileData.hashtagSearches).length > 0) {
    const recentSearches = Object.entries(profileData.hashtagSearches)
      .sort(([, a]: [string, any], [, b]: [string, any]) => new Date(b.cached_at).getTime() - new Date(a.cached_at).getTime())
      .slice(0, 2);

    if (recentSearches.length > 0) {
      detailedInfo += `\n\n🏷️ RECENT HASHTAG RESEARCH:`;

      recentSearches.forEach(([hashtag, data]: [string, any]) => {
        const topPosts = data.posts?.slice(0, 3) || [];
        detailedInfo += `\n• #${hashtag}: ${topPosts.length} trending posts analyzed`;
        if (topPosts.length > 0) {
          const avgEngagement = Math.round(topPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0) + (p.comment_count || 0), 0) / topPosts.length);
          detailedInfo += ` | Avg engagement: ${avgEngagement.toLocaleString()}`;
          detailedInfo += ` | Top creators: ${topPosts.map((p: any) => `@${p.username}`).join(', ')}`;
        }
      });
    }
  }

  return detailedInfo;
}

export async function decideWorkflowPhase(messages: ChatMessage[], user?: User): Promise<WorkflowPhaseDecision> {
  const startTime = Date.now();
  try {
    console.log(`🔄 [AI_SERVICE] Analyzing workflow phase with GPT-4o-mini...`);

    // Get last 8 messages for context
    const contextMessages = messages.slice(-4);

    // Build current user context
  const currentProfile = {
      firstName: user?.firstName || null,
      lastName: user?.lastName || null,
      contentNiche: user?.contentNiche || [],
      primaryPlatform: user?.primaryPlatform || null,
      primaryPlatforms: (user as any)?.primaryPlatforms || [],
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
  "profilePatch": {"any new profile data to store like firstName, contentNiche, primaryPlatforms (array), primaryPlatform (optional legacy), instagramUsername, etc"},
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