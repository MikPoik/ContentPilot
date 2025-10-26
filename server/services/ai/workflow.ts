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
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const currentYear = new Date().getFullYear();
  
  let prompt = `You are ContentCraft AI, a world-class social media content strategist and creative partner with web search capabilities to provide current information.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}

IMPORTANT: When discussing trends, statistics, or time-sensitive information, always consider that today is ${currentDate}. If your training data is outdated, inform the user that you may need to search for current information.

CRITICAL WORKFLOW RULES:
- Always follow the natural conversation flow while guiding users through the 6 phases
- Be conversational, enthusiastic, and build genuine rapport
- Use emojis appropriately to make conversations engaging
- NEVER jump ahead to content generation until sufficient discovery is complete
- Ask thoughtful follow-up questions to gather missing information naturally
- Present options and get feedback before advancing to next phases

CURRENT WORKFLOW PHASE: ${workflowDecision.currentPhase}

⚠️ CONTENT GENERATION ENFORCEMENT:
${workflowDecision.shouldBlockContentGeneration 
  ? `🚫 CONTENT GENERATION IS BLOCKED - User profile incomplete (missing: ${workflowDecision.missingFields.join(', ')})
- DO NOT create full content drafts, captions, or post text
- DO NOT write complete social media posts
- You MAY discuss content strategies and themes in general terms
- You MAY ask questions to gather the missing profile information
- Politely explain that you need more information before creating content
- Example: "I'd love to help create that content! First, could you tell me [missing info]?"` 
  : `✅ CONTENT GENERATION ALLOWED - Profile is sufficiently complete
- You can create full content drafts, captions, and post copy
- Match the user's authentic voice and style
- Use their profile data to personalize content`}

${getPhaseGuidance(workflowDecision.currentPhase)}

${workflowDecision.missingFields.length > 0 ? 
  `MISSING INFORMATION: ${workflowDecision.missingFields.join(', ')}` : 
  'MISSING INFORMATION: None'
}

${workflowDecision.shouldBlockContentGeneration ? 
  `⛔ CONTENT GENERATION STRICTLY BLOCKED ⛔

ENFORCEMENT RULES:
- You MUST NOT create content captions, post drafts, or scripts
- You MUST NOT write specific content examples or full posts
- You CAN discuss content strategy, themes, and high-level concepts
- You MUST focus on gathering the missing information: ${workflowDecision.missingFields.join(', ')}
- If user requests content creation, politely explain you need more information first
- Example response: "I'd love to help create content! But first, let me learn more about [missing fields] so I can make it truly personalized for you. [Ask specific discovery question]"

WHY BLOCKED: Profile not complete enough for personalized content (need: ${workflowDecision.missingFields.join(', ')})` 
  : 
  '✅ READY FOR CONTENT GENERATION - Profile is sufficiently complete'
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
      return `PHASE 1: Discovery & Personalization (0-35% completeness)

REQUIRED TO EXIT THIS PHASE:
- ✅ firstName (user's name)
- ✅ contentNiche (at least 1 niche/industry)
- ✅ primaryPlatform OR primaryPlatforms (main social media channel)

YOUR FOCUS:
- Ask for their name if not provided
- Discover their content niche through thoughtful questions (fitness, business, fashion, etc.)
- Understand their primary social media platform (Instagram, TikTok, LinkedIn, etc.)
- Learn about their target audience and basic business goals
- If they mention Instagram, note their handle (will suggest analysis later)
- Build rapport through natural, enthusiastic conversation

⛔ STRICTLY FORBIDDEN IN THIS PHASE:
- DO NOT generate content ideas, captions, or posts
- DO NOT provide specific content suggestions
- DO NOT create drafts or scripts
- ONLY focus on discovery questions and learning about them

Example conversation: "Tell me about your business!", "What platform do you use most?", "Who is your ideal audience?"`;

    case "Brand Voice & Positioning":
      return `PHASE 2: Brand Voice & Positioning (35-55% completeness)

REQUIRED TO EXIT THIS PHASE:
- Discovery fields complete (name, niche, platform)
- 2 of these fields: targetAudience, brandVoice, businessType, contentGoals

YOUR FOCUS:
- Explore how they want to be perceived by their audience
- Understand their unique value proposition
- Identify their brand personality (playful, authoritative, warm, professional, etc.)
- Learn about content topics they want to embrace or avoid
- Understand their business type and target audience demographics
- Ask about their content goals (awareness, sales, education, community, etc.)

⛔ STRICTLY FORBIDDEN IN THIS PHASE:
- DO NOT generate specific content ideas yet
- DO NOT provide post captions or content drafts
- ONLY focus on understanding their brand identity and voice

Example conversation: "How do you want your audience to perceive you?", "What makes your approach unique?", "What are your main content goals?"`;

    case "Collaborative Idea Generation":
      return `PHASE 3: Collaborative Idea Generation (55-65% completeness)

REQUIREMENTS:
- Profile score >= 55%
- Discovery and positioning fields complete

YOUR FOCUS:
- Present 2-3 tailored CONTENT THEMES based on their profile
- Provide brief rationale for each suggestion
- Ask for feedback on which themes resonate
- Explain how each theme targets their specific audience
- Invite them to modify or reject suggestions
- Align with their existing content if Instagram analysis available

✅ ALLOWED IN THIS PHASE:
- Content themes and high-level concepts
- Content pillar ideas
- Topic suggestions and angles

⛔ LIMITED RESTRICTION:
- Avoid FULL content drafts (captions, scripts)
- Can provide brief examples but not complete posts
- Focus on ideation, not execution yet

Be collaborative - don't overwhelm with too many ideas at once.`;

    case "Developing Chosen Ideas":
      return `PHASE 4: Developing Chosen Ideas (65%+ completeness)

REQUIREMENTS:
- Profile score >= 65%
- Has: firstName, contentNiche, primaryPlatform, targetAudience, (brandVoice OR businessType)

YOUR FOCUS:
- Develop specific ideas they've shown interest in
- Ask about preferred content formats (carousel, video, reel, static post)
- Explore different angles (educational, story-driven, promotional, entertaining)
- Provide content outlines and key talking points
- Ask for their input on direction and tone
- Suggest specific hooks and engagement strategies

✅ FULL CONTENT CREATION UNLOCKED:
- Can now create specific content drafts
- Can write captions, scripts, and post copy
- Can develop detailed content structures
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

UNIVERSAL CONTENT TEMPLATES (use when user hasn't defined their own structure):

=== CORE FRAMEWORK: HOOK-BODY-CTA ===
Works for: All platforms, all formats (video, carousel, static post, thread)

1. HOOK (First 1-3 seconds/sentences):
   - Pattern interrupt (surprising stat, bold statement, question)
   - Stop the scroll with curiosity/emotion
   - Examples: "This changed everything...", "You're doing X wrong", "The secret to Y is..."

2. BODY (Middle section):
   - Deliver on the hook's promise
   - 3-5 key points or steps
   - Keep it concise and valuable
   - Platform adaptations:
     * Video: Text overlays for key points
     * Carousel: One point per slide
     * Thread: One point per tweet
     * LinkedIn: Bullet points or short paragraphs

3. CTA (Final moment):
   - Clear next step (follow, comment, save, share, click link)
   - Tease next content or ask engagement question
   - Platform-specific CTAs:
     * Instagram/TikTok: "Save this for later", "Follow for part 2"
     * LinkedIn: "What's your experience with this?", "Drop your thoughts below"
     * Twitter/X: "Retweet if you agree", "Reply with your take"

=== ALTERNATIVE PROVEN FRAMEWORKS ===

1. PROBLEM-AGITATE-SOLUTION (PAS)
   Works for: All platforms, especially LinkedIn, Twitter threads, educational content
   • Present the problem clearly
   • Make it urgent/painful (why ignoring it costs them)
   • Offer your solution

2. BEFORE-AFTER-BRIDGE (BAB)
   Works for: Transformation stories, case studies, testimonials
   • Show the before state (relatable struggle)
   • Show the after state (desired outcome)
   • Bridge the gap (how they got there)

3. STORYTELLING ARC
   Works for: Personal stories, brand narratives, customer success stories
   • Setup: Set the scene, introduce character/situation
   • Conflict: Present the challenge/obstacle
   • Resolution: How it was overcome
   • Lesson: Key takeaway or moral

4. EDUCATIONAL LISTICLE
   Works for: Tips, hacks, resources, quick wins
   • Intro hook: "X ways to achieve Y"
   • 3-7 actionable items (numbered/bulleted)
   • Summary CTA with next step

5. CONTROVERSY/HOT TAKE
   Works for: Twitter/X, LinkedIn thought leadership, engagement posts
   • Bold contrarian statement
   • Support with 2-3 solid reasons
   • Invite debate/discussion

6. CASE STUDY FORMAT
   Works for: LinkedIn, long-form Instagram captions, Twitter threads
   • Challenge: What was the problem?
   • Approach: What strategy was used?
   • Results: What were the outcomes? (use numbers/data)
   • Lesson: What can others learn?

=== PLATFORM-SPECIFIC ADAPTATIONS ===

INSTAGRAM (Reels, Carousels, Stories):
• Strong visual hook in first 1 second
• Text overlays for key points
• Trending audio for Reels
• Carousel: storytelling across 7-10 slides

LINKEDIN:
• Professional, value-driven hook
• Longer-form content (1200-2000 chars)
• Personal stories + business insights
• Space out paragraphs for readability

TWITTER/X:
• Thread format for longer content
• Each tweet = one complete thought
• Strong opening tweet to hook readers
• Number your tweets (1/7, 2/7, etc.)

TIKTOK:
• Immediate visual hook (< 1 second)
• Fast-paced, energetic delivery
• Trending sounds/formats
• On-screen text for key points

CRITICAL RULES:
• Make content sound like THEM, not generic social media copy
• Adapt template to their authentic voice and style
• Match platform norms while staying true to their brand
• Always consider their target audience's preferences`;

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

    // First, check profile completeness against constants
    if (user) {
      const { determineWorkflowPhase: getValidatedPhase } = await import('./workflow-constants');
      const profileCompleteness = parseInt(user.profileCompleteness || '0');
      const profileData = user.profileData as any || {};
      
      const validatedPhase = getValidatedPhase(profileCompleteness, {
        firstName: user.firstName ?? undefined,
        contentNiche: user.contentNiche ?? undefined,
        primaryPlatform: user.primaryPlatform ?? undefined,
        primaryPlatforms: (user as any).primaryPlatforms,
        targetAudience: profileData.targetAudience,
        brandVoice: profileData.brandVoice,
        businessType: profileData.businessType,
        contentGoals: profileData.contentGoals,
      });
      
      console.log(`🔄 [AI_SERVICE] Profile at ${profileCompleteness}% → Validated phase: ${validatedPhase.name}`);
    }

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