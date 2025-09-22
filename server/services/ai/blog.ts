import { type User } from "@shared/schema";
import { perplexityService } from "../perplexity.js";
import { storage } from "../../storage.js";
import { openai, generateEmbedding } from "../openai.js";
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
  userId: string
): Promise<BlogAnalysisResult> {
  const startTime = Date.now();
  try {
    console.log(`📝 [BLOG_AI] Performing blog analysis for ${urls.length} URLs...`);

    // Check if blog was analyzed recently (within 24 hours)
    const user = await storage.getUser(userId);
    const existingData = user?.profileData as any;

    if (existingData?.blogProfile) {
      const cachedAt = new Date(existingData.blogProfile.cached_at);
      const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      // Check if URLs overlap significantly with cached analysis
      const existingUrls = existingData.blogProfile.analyzedUrls || [];
      const urlOverlap = urls.filter(url => existingUrls.includes(url));
      
      if (hoursSinceCache < 24 && urlOverlap.length > 0) {
        console.log(`📝 [BLOG_AI] Using cached blog analysis (${hoursSinceCache.toFixed(1)}h old)`);
        return { 
          success: true,
          analysis: existingData.blogProfile,
          cached: true
        };
      }
    }

    // Collect blog content via Perplexity
    const blogContents: string[] = [];
    
    for (const url of urls.slice(0, 5)) { // Limit to 5 URLs to avoid rate limits
      try {
        console.log(`📝 [BLOG_AI] Fetching content from: ${url}`);
        
        // Ensure URL has protocol for proper parsing
        let fullUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          fullUrl = `https://${url}`;
        }
        
        const searchResult = await perplexityService.searchForChatContext(
          `site:${new URL(fullUrl).hostname} blog content text`,
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

    const blogProfile: BlogProfile = {
      analyzedUrls: urls,
      writingStyle: blogAnalysis.writingStyle || 'conversational',
      averagePostLength: blogAnalysis.averagePostLength || 'medium',
      commonTopics: blogAnalysis.commonTopics || [],
      toneKeywords: blogAnalysis.toneKeywords || [],
      contentThemes: blogAnalysis.contentThemes || [],
      brandVoice: blogAnalysis.brandVoice || 'authentic and personal',
      targetAudience: blogAnalysis.targetAudience,
      postingPattern: blogAnalysis.postingPattern,
      cached_at: new Date().toISOString()
    };

    // Store the blog profile data
    const updatedProfileData = {
      ...existingData,
      blogProfile
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
