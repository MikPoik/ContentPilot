import { type User } from "@shared/schema";
import { perplexityService } from "../perplexity.js";
import { storage } from "../../storage.js";
import { openai, generateEmbedding } from "../openai.js";
import { analyzeUserWritingStyle } from "./workflow.js";
import {
  BlogProfile,
  BlogAnalysisResult,
  safeJsonParse
} from "./intent";

/**
 * Performs blog analysis by reading blog posts via Perplexity and analyzing content
 */
export async function performBlogAnalysis(
  urls: string[], 
  userId: string,
  progressCallback?: (message: string) => void
): Promise<BlogAnalysisResult> {
  const startTime = Date.now();
  try {
    console.log(`📝 [BLOG_AI] Performing blog analysis for ${urls.length} URLs...`);

    // Check if blog was analyzed recently (within 7 days / 168 hours)
    // Extended from 24h to reduce API calls - blog content is relatively stable
    const CACHE_TTL_HOURS = 168; // 7 days
    const user = await storage.getUser(userId);
    const existingData = user?.profileData as any;

    if (existingData?.blogProfile) {
      const cachedAt = new Date(existingData.blogProfile.cached_at);
      const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      // Check if URLs overlap significantly with cached analysis
      const existingUrls = existingData.blogProfile.analyzedUrls || [];
      const urlOverlap = urls.filter(url => existingUrls.includes(url));
      
      if (hoursSinceCache < CACHE_TTL_HOURS && urlOverlap.length > 0) {
        console.log(`📝 [BLOG_AI] Using cached blog analysis (${hoursSinceCache.toFixed(1)}h old, cache valid for ${CACHE_TTL_HOURS}h)`);
        return { 
          success: true,
          analysis: existingData.blogProfile,
          cached: true
        };
      } else if (hoursSinceCache >= CACHE_TTL_HOURS) {
        console.log(`📝 [BLOG_AI] Cache expired (${hoursSinceCache.toFixed(1)}h > ${CACHE_TTL_HOURS}h), fetching fresh data...`);
      }
    }

    // Collect blog content via Perplexity
    const blogContents: string[] = [];
    
    for (const url of urls.slice(0, 5)) { // Limit to 5 URLs to avoid rate limits
      try {
        console.log(`📝 [BLOG_AI] Fetching content from: ${url}`);
        
        // Send progress update
        if (progressCallback) {
          const urlShort = url.length > 40 ? url.substring(0, 40) + '...' : url;
          progressCallback(`Fetching content from ${urlShort}`);
        }
        
        // Ensure URL has protocol for proper parsing
        let fullUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          fullUrl = `https://${url}`;
        }
        
        const searchResult = await perplexityService.searchForChatContext(
          `site:${new URL(fullUrl).hostname}`,
          "Extract and provide the full text content of blog posts, including headlines, main content, and any key information about writing style and topics.",
          'month'
        );

        if (searchResult.context && searchResult.context.length > 100) {
          blogContents.push(searchResult.context);
          console.log(`📝 [BLOG_AI] Successfully extracted ${searchResult.context.length} characters from ${url}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ [BLOG_AI] Error fetching content from ${url}:`, error);
      }
    }

    if (blogContents.length === 0) {
      return {
        success: false,
        error: "Could not extract content from the provided blog URLs"
      };
    }

    // Send progress update
    if (progressCallback) {
      progressCallback(`Analyzing writing style and content patterns...`);
    }

    // Analyze the collected blog content
    const combinedContent = blogContents.join('\n\n---\n\n');
    
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `Analyze the provided blog content and extract detailed insights about the writing style, tone, and content patterns.

Return a JSON object with these fields:
- writingStyle: Overall writing approach (conversational, formal, academic, personal, storytelling, instructional, etc.)
- averagePostLength: Post length category (short: <500 words, medium: 500-1500 words, long: >1500 words)
- commonTopics: Array of frequently discussed topics/themes
- toneKeywords: Array of emotional/descriptive words that characterize the tone
- contentThemes: Array of broader content categories
- brandVoice: Description of the unique voice/personality
- targetAudience: Inferred target audience based on language and topics
- postingPattern: Any patterns in content structure or approach

Be thorough and specific in your analysis.`
        },
        {
          role: 'user',
          content: `Please analyze this blog content:\n\n${combinedContent.substring(0, 8000)}`
        }
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const analysisResult = analysisResponse.choices[0]?.message?.content?.trim();
    if (!analysisResult) {
      throw new Error('No analysis result from OpenAI');
    }

    // Parse the analysis result
    let blogAnalysis;
    try {
      let cleanResult = analysisResult.trim();
      if (cleanResult.startsWith('```') && cleanResult.endsWith('```')) {
        const lines = cleanResult.split('\n');
        cleanResult = lines.slice(1, -1).join('\n');
      }
      if (cleanResult.startsWith('json\n')) {
        cleanResult = cleanResult.replace('json\n', '');
      }
      
      blogAnalysis = JSON.parse(cleanResult);
    } catch (parseError) {
      console.error('Error parsing blog analysis result:', parseError);
      throw new Error('Failed to parse blog analysis result');
    }

    // Safely extract string values (handle cases where AI returns objects/arrays instead of strings)
    const safeExtractString = (value: any, fallback: string = ''): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join(', ');
      if (value && typeof value === 'object') {
        // If it's an object with a field property, it might be an error structure
        if ('field' in value) return fallback;
        // Try to extract meaningful text from object
        return JSON.stringify(value);
      }
      return fallback;
    };

    const safeExtractArray = (value: any): string[] => {
      if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
      if (typeof value === 'string') return [value];
      return [];
    };

    const blogProfile: BlogProfile = {
      analyzedUrls: urls,
      writingStyle: safeExtractString(blogAnalysis.writingStyle, 'conversational'),
      averagePostLength: safeExtractString(blogAnalysis.averagePostLength, 'medium'),
      commonTopics: safeExtractArray(blogAnalysis.commonTopics),
      toneKeywords: safeExtractArray(blogAnalysis.toneKeywords),
      contentThemes: safeExtractArray(blogAnalysis.contentThemes),
      brandVoice: safeExtractString(blogAnalysis.brandVoice, 'authentic and personal'),
      targetAudience: blogAnalysis.targetAudience ? safeExtractString(blogAnalysis.targetAudience, '') || undefined : undefined,
      postingPattern: blogAnalysis.postingPattern ? safeExtractString(blogAnalysis.postingPattern, '') || undefined : undefined,
      cached_at: new Date().toISOString()
    };

    // Perform detailed writing style analysis (language-agnostic)
    console.log(`📝 [BLOG_AI] Analyzing writing style patterns from blog content...`);
    const styleAnalysis = await analyzeUserWritingStyle(blogContents);
    
    // Merge style analysis into existing user profile data (if exists)
    let mergedStyleData = styleAnalysis;
    if (existingData?.styleAnalysis) {
      console.log(`📝 [BLOG_AI] Merging blog style analysis with existing Instagram style data`);
      const existing = existingData.styleAnalysis;
      
      // Intelligently merge style data from both sources
      mergedStyleData = {
        toneKeywords: Array.from(new Set([
          ...(existing.toneKeywords || []),
          ...(styleAnalysis?.toneKeywords || [])
        ])).slice(0, 12), // Keep top 12 combined
        
        avgSentenceLength: styleAnalysis?.avgSentenceLength 
          ? Math.round((existing.avgSentenceLength + styleAnalysis.avgSentenceLength) / 2)
          : existing.avgSentenceLength,
        
        commonPhrases: Array.from(new Set([
          ...(existing.commonPhrases || []),
          ...(styleAnalysis?.commonPhrases || [])
        ])).slice(0, 7), // Keep top 7 combined
        
        punctuationStyle: styleAnalysis?.punctuationStyle || existing.punctuationStyle,
        
        contentThemes: Array.from(new Set([
          ...(existing.contentThemes || []),
          ...(styleAnalysis?.contentThemes || [])
        ])).slice(0, 8), // Keep top 8 combined
        
        voiceCharacteristics: styleAnalysis?.voiceCharacteristics || existing.voiceCharacteristics,
        
        // Track data sources
        sources: Array.from(new Set([
          ...(existing.sources || []),
          'blog'
        ]))
      };
    } else if (styleAnalysis) {
      // First time analyzing, add source tracking
      mergedStyleData = {
        ...styleAnalysis,
        sources: ['blog']
      };
    }

    // Store the blog profile data with merged style analysis
    const updatedProfileData = {
      ...existingData,
      blogProfile,
      ...(mergedStyleData && { styleAnalysis: mergedStyleData })
    };

    await storage.updateUserProfile(userId, {
      profileData: updatedProfileData
    });

    // Create memory entries for key insights
    const memoryTexts = [
      `Blog writing style: ${blogProfile.writingStyle}, average post length: ${blogProfile.averagePostLength}`,
      `Blog content themes: ${blogProfile.contentThemes.join(', ')}`,
      `Blog tone characteristics: ${blogProfile.toneKeywords.join(', ')}`,
      `Blog target audience: ${blogProfile.targetAudience || 'not specified'}`
    ];

    // Generate embeddings and store memories
    for (const text of memoryTexts) {
      try {
        const embedding = await generateEmbedding(text);
        await storage.createMemory({
          userId,
          content: text,
          embedding,
          metadata: { 
            source: 'blog_analysis',
            urls: urls,
            analysisDate: blogProfile.cached_at
          }
        });
      } catch (embeddingError) {
        console.error('Error creating blog memory embedding:', embeddingError);
      }
    }

    console.log(`📝 [BLOG_AI] Blog analysis completed: ${Date.now() - startTime}ms`);
    return { 
      success: true,
      analysis: blogProfile,
      cached: false
    };

  } catch (error) {
    console.error(`❌ [BLOG_AI] Blog analysis failed after ${Date.now() - startTime}ms:`, error);

    let errorMessage = 'Failed to analyze blog content';
    if (error instanceof Error) {
      if (error.message.includes('Could not extract')) {
        errorMessage = 'Could not extract content from the provided blog URLs';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Error processing blog content analysis';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Formats blog analysis results for display in chat
 */
export function formatBlogAnalysisForChat(analysis: BlogProfile, cached: boolean = false): string {
  if (!analysis) return "Unable to retrieve blog analysis.";

  const cacheIndicator = cached ? " (from recent analysis)" : "";

  return `📝 **Blog Content Analysis**${cacheIndicator}

✍️ **Writing Style & Tone:**
• Writing style: ${analysis.writingStyle}
• Brand voice: ${analysis.brandVoice}
• Average post length: ${analysis.averagePostLength}

🎯 **Content Insights:**
• Main themes: ${analysis.contentThemes.join(' • ')}
• Common topics: ${analysis.commonTopics.slice(0, 5).join(' • ')}
• Tone keywords: ${analysis.toneKeywords.slice(0, 5).join(' • ')}

👥 **Audience & Approach:**
${analysis.targetAudience ? `• Target audience: ${analysis.targetAudience}` : '• Target audience: Not clearly defined'}
${analysis.postingPattern ? `• Content pattern: ${analysis.postingPattern}` : ''}

📊 **Analysis Summary:**
Analyzed ${analysis.analyzedUrls.length} blog post(s) to understand your unique writing style and content approach.`;
}

/**
 * Cleans up malformed blog profile data from a user's profile
 * Fixes cases where AI returned objects/JSON instead of plain strings
 */
export function cleanupBlogProfile(blogProfile: any): BlogProfile | null {
  if (!blogProfile || typeof blogProfile !== 'object') return null;

  // Helper functions for safe extraction
  const safeString = (value: any, fallback: string): string => {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string').join(', ') || fallback;
    if (value && typeof value === 'object') {
      // If it's an object with a field property, it's likely an error structure
      if ('field' in value) return fallback;
    }
    return fallback;
  };

  const safeArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.trim());
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
  };

  return {
    analyzedUrls: safeArray(blogProfile.analyzedUrls),
    writingStyle: safeString(blogProfile.writingStyle, 'conversational'),
    averagePostLength: safeString(blogProfile.averagePostLength, 'medium'),
    commonTopics: safeArray(blogProfile.commonTopics),
    toneKeywords: safeArray(blogProfile.toneKeywords),
    contentThemes: safeArray(blogProfile.contentThemes),
    brandVoice: safeString(blogProfile.brandVoice, 'authentic and personal'),
    targetAudience: blogProfile.targetAudience ? safeString(blogProfile.targetAudience, '') || undefined : undefined,
    postingPattern: blogProfile.postingPattern ? safeString(blogProfile.postingPattern, '') || undefined : undefined,
    cached_at: blogProfile.cached_at || new Date().toISOString()
  };
}
