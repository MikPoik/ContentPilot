import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { generateChatResponse, generateConversationTitle, type ChatResponseWithMetadata } from "../services/ai/chat";
import { generateEmbedding } from "../services/openai";
import { extractProfileInfo } from "../services/ai/profile";
import { extractMemoriesFromConversation, buildMemorySearchQuery } from "../services/ai/memory";
import { analyzeUnifiedIntent, extractWebSearchDecision, extractInstagramAnalysisDecision, extractInstagramHashtagDecision, extractBlogAnalysisDecision, extractProfileUpdateDecision } from "../services/ai/intent"; // Unified intent classification
import { performInstagramAnalysis, performInstagramHashtagSearch, formatInstagramAnalysisForChat, formatInstagramHashtagSearchForChat } from "../services/ai/instagram"; // Added Instagram integration
import { performBlogAnalysis, formatBlogAnalysisForChat } from "../services/ai/blog"; // Added blog analysis

export function registerMessageRoutes(app: Express) {
  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.claims.sub;

      // Verify conversation exists and user owns it
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send a message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    const requestStartTime = Date.now();
    console.log(`\n🚀 [CHAT_FLOW] Starting message processing at ${new Date().toISOString()}`);

    try {
      const { content } = req.body;
      
      // Enhanced input validation
      if (!content || typeof content !== 'string') {
        console.log(`❌ [CHAT_FLOW] Invalid input: content missing or not a string`);
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // Validate content is not empty/whitespace only
      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        console.log(`❌ [CHAT_FLOW] Invalid input: empty or whitespace-only message`);
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      
      // Check message length limits (prevent abuse)
      if (trimmedContent.length > 10000) {
        console.log(`❌ [CHAT_FLOW] Invalid input: message too long (${trimmedContent.length} chars)`);
        return res.status(400).json({ message: "Message is too long (max 10,000 characters)" });
      }

      const conversationId = req.params.id;
      const userId = req.user.claims.sub;
      console.log(`📝 [CHAT_FLOW] Processing message for user: ${userId}, conversation: ${conversationId}`);
      console.log(`📏 [CHAT_FLOW] Message length: ${trimmedContent.length} characters`);

      // Check message usage limits
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const messagesUsed = currentUser.messagesUsed || 0;
      const messagesLimit = currentUser.messagesLimit || 10;

      // Check message limits (skip check for unlimited plans where messagesLimit is -1)
      if (messagesLimit !== -1 && messagesUsed >= messagesLimit) {
        return res.status(429).json({
          message: "Message limit reached. Please upgrade your subscription.",
          messagesUsed,
          messagesLimit
        });
      }

      // Verify conversation exists and user owns it
      const verificationStartTime = Date.now();
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      console.log(`✅ [CHAT_FLOW] Conversation verification: ${Date.now() - verificationStartTime}ms`);

      // Save user message
      const saveUserMessageStart = Date.now();
      await storage.createMessage({
        conversationId,
        role: 'user',
        content,
      });
      console.log(`💾 [CHAT_FLOW] User message saved: ${Date.now() - saveUserMessageStart}ms`);

      // Get conversation history and user profile
      const dataFetchStart = Date.now();
      const messages = await storage.getMessages(conversationId);
  const user = await storage.getUser(userId);
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));
      console.log(`📚 [CHAT_FLOW] Data fetch (messages + user): ${Date.now() - dataFetchStart}ms`);

      // Search for relevant memories using user message with smart query building
      const memorySearchStart = Date.now();
      let relevantMemories: any[] = [];
      try {
        // Build query using smart concatenation with AI fallback
        const queryBuildingStart = Date.now();
        const searchQuery = await buildMemorySearchQuery(content, chatHistory.slice(-6), user);
        console.log(`🔄 [CHAT_FLOW] Query building: ${Date.now() - queryBuildingStart}ms`);
        console.log(`🔍 [CHAT_FLOW] Original query: "${content}"`);
        console.log(`🔍 [CHAT_FLOW] Search query: "${searchQuery}"`);

        const embeddingStart = Date.now();
        const queryEmbedding = await generateEmbedding(searchQuery);
        console.log(`🧠 [CHAT_FLOW] Embedding generation: ${Date.now() - embeddingStart}ms`);

        const similaritySearchStart = Date.now();
        relevantMemories = await storage.searchSimilarMemories(userId, queryEmbedding, 5);
        const memorySearchEnd = Date.now(); // Capture end time here
        console.log(`🔍 [CHAT_FLOW] Vector similarity search: ${memorySearchEnd - similaritySearchStart}ms`);
        console.log(`🎯 [CHAT_FLOW] Total memory search: ${memorySearchEnd - memorySearchStart}ms (found ${relevantMemories.length} memories)`);

        // Log actual memory contents
        if (relevantMemories.length > 0) {
          console.log(`🧠 [CHAT_FLOW] Retrieved memories:`);
          relevantMemories.forEach((memory, index) => {
            console.log(`  ${index + 1}. [Similarity: ${memory.similarity?.toFixed(3) || 'N/A'}] ${memory.content}`);
          });
        } else {
          console.log(`🧠 [CHAT_FLOW] No relevant memories found for this query`);
        }

        } catch (error) {
        console.log(`❌ [CHAT_FLOW] Memory search failed: ${error}`);
      }

      // Use unified intent analysis to make all decisions in a single AI call
      const unifiedIntentStart = Date.now();
      let instagramAnalysisResult: any = null;
      let instagramHashtagResult: any = null;
      let blogAnalysisResult: any = null;
      let searchDecision: any = null;
      let workflowPhaseDecision: any = null;
      let profileUpdateDecision: any = null;

      try {
        console.log(`🧠 [CHAT_FLOW] Starting unified intent analysis...`);
        const unifiedDecision = await analyzeUnifiedIntent(chatHistory, user);
        console.log(`🧠 [CHAT_FLOW] Unified intent analysis: ${Date.now() - unifiedIntentStart}ms - webSearch: ${unifiedDecision.webSearch.shouldSearch}, instagram: ${unifiedDecision.instagramAnalysis.shouldAnalyze}, hashtag: ${unifiedDecision.instagramHashtagSearch.shouldSearch}, blog: ${unifiedDecision.blogAnalysis.shouldAnalyze}, profileUpdate: ${unifiedDecision.profileUpdate?.shouldExtract || false}, phase: ${unifiedDecision.workflowPhase.currentPhase}`);

        // Extract individual decisions for backward compatibility
        const instagramDecision = extractInstagramAnalysisDecision(unifiedDecision);
        const instagramHashtagDecision = extractInstagramHashtagDecision(unifiedDecision);
        const blogDecision = extractBlogAnalysisDecision(unifiedDecision);
        // Assign to the outer-scoped variable (avoid shadowing) so it can be used later
        profileUpdateDecision = extractProfileUpdateDecision(unifiedDecision);
        searchDecision = extractWebSearchDecision(unifiedDecision);
        workflowPhaseDecision = unifiedDecision.workflowPhase;

        // Set up streaming response headers BEFORE any res.write() calls
        // Important: prevent any intermediary (proxies) from buffering so chunks reach client immediately
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        // Disable nginx-style proxy buffering if present
        res.setHeader('X-Accel-Buffering', 'no');
        // Flush headers so the client begins processing the stream ASAP
        if (typeof (res as any).flushHeaders === 'function') {
          (res as any).flushHeaders();
        }

        // Perform Instagram analysis if needed
        if (instagramDecision.shouldAnalyze && instagramDecision.username) {
          const instagramAnalysisStart = Date.now();
          try {
            // Send Instagram analysis activity indicator
            res.write(`[AI_ACTIVITY]{"type":"instagram_analyzing","message":"@${instagramDecision.username}"}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramAnalysisResult = await performInstagramAnalysis(
              instagramDecision.username, 
              userId,
              instagramDecision.isOwnProfile, // Pass flag from intent analysis
              (message: string) => {
                // Send progress updates
                res.write(`[AI_ACTIVITY]{"type":"instagram_analyzing","message":"${message}"}[/AI_ACTIVITY]`);
                if (typeof (res as any).flush === 'function') {
                  try { (res as any).flush(); } catch {}
                }
              }
            );

            // Clear activity indicator
            res.write(`[AI_ACTIVITY]{"type":null,"message":""}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            console.log(`📸 [CHAT_FLOW] Instagram analysis completed: ${Date.now() - instagramAnalysisStart}ms - success: ${instagramAnalysisResult.success}`);
          } catch (error) {
            console.error(`❌ [CHAT_FLOW] Instagram analysis failed: ${Date.now() - instagramAnalysisStart}ms`, error);

            // Clear activity indicator on error
            res.write(`[AI_ACTIVITY]{"type":null,"message":""}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramAnalysisResult = {
              success: false,
              error: 'Failed to analyze Instagram profile'
            };
          }
        }

        // Perform Instagram hashtag search if needed
        if (instagramHashtagDecision.shouldSearch && instagramHashtagDecision.hashtag) {
          const hashtagSearchStart = Date.now();
          try {
            // Send hashtag search activity indicator
            res.write(`[AI_ACTIVITY]{"type":"hashtag_searching","message":"#${instagramHashtagDecision.hashtag}"}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramHashtagResult = await performInstagramHashtagSearch(
              instagramHashtagDecision.hashtag, 
              userId,
              (message: string) => {
                // Send progress updates
                res.write(`[AI_ACTIVITY]{"type":"hashtag_searching","message":"${message}"}[/AI_ACTIVITY]`);
                if (typeof (res as any).flush === 'function') {
                  try { (res as any).flush(); } catch {}
                }
              }
            );

            // Clear activity indicator
            res.write(`[AI_ACTIVITY]{"type":null,"message":""}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            console.log(`🏷️ [CHAT_FLOW] Hashtag search completed: ${Date.now() - hashtagSearchStart}ms - success: ${instagramHashtagResult.success}`);
          } catch (error) {
            console.error(`❌ [CHAT_FLOW] Hashtag search failed: ${Date.now() - hashtagSearchStart}ms`, error);

            // Clear activity indicator on error
            res.write(`[AI_ACTIVITY]{"type":null,"message":""}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramHashtagResult = {
              success: false,
              error: 'Failed to search Instagram hashtag'
            };
          }
        }

        // Handle blog analysis if needed
        if (blogDecision.shouldAnalyze && blogDecision.urls.length > 0 && blogDecision.confidence >= 0.7) {
          console.log(`📝 [CHAT_FLOW] Performing blog analysis for ${blogDecision.urls.length} URLs...`);
          const analysisStart = Date.now();
          blogAnalysisResult = await performBlogAnalysis(blogDecision.urls, userId);
          console.log(`📝 [CHAT_FLOW] Blog analysis completed: ${Date.now() - analysisStart}ms - success: ${blogAnalysisResult.success}`);
        }

      } catch (error) {
        console.log(`❌ [CHAT_FLOW] Unified intent analysis error: ${error}`);
        // Fallback to safe defaults
        searchDecision = {
          shouldSearch: false,
          confidence: 0.0,
          reason: "Error in unified analysis",
          refinedQuery: "",
          recency: 'week',
          domains: [],
          searchService: 'perplexity'
        };
        profileUpdateDecision = {
          shouldExtract: false,
          confidence: 0.0,
          reason: "Error in unified analysis",
          expectedFields: []
        };

        // Set up streaming response headers even in error case
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof (res as any).flushHeaders === 'function') {
          (res as any).flushHeaders();
        }
      }

      // Send memory recall indicator if memories were found
      if (relevantMemories.length > 0) {
        res.write(`[AI_ACTIVITY]{"type":"recalling","message":""}[/AI_ACTIVITY]`);
      }

      // Send search activity indicator if search is recommended
      if (searchDecision.shouldSearch && searchDecision.confidence >= 0.7) {
        const searchActivityMessage = searchDecision.refinedQuery?.trim() || 
          chatHistory
            .slice()
            .reverse()
            .find((m) => m.role === "user")
            ?.content?.trim() || "";
        res.write(`[AI_ACTIVITY]{"type":"searching","message":"${searchActivityMessage}"}[/AI_ACTIVITY]`);
        if (typeof (res as any).flush === 'function') {
          try { (res as any).flush(); } catch {}
        }
      }

      // Generate AI response stream with user profile and memories
      const aiResponseStart = Date.now();
      console.log(`🤖 [CHAT_FLOW] Starting AI response generation...`);
  const responseWithMetadata: ChatResponseWithMetadata = await generateChatResponse(chatHistory, user!, relevantMemories, searchDecision, instagramAnalysisResult, instagramHashtagResult, blogAnalysisResult, workflowPhaseDecision); // Pass workflow decision from unified intent analysis
      let fullResponse = '';

      // Send search metadata immediately when search is performed (even with 0 citations)
      if (responseWithMetadata.searchPerformed || responseWithMetadata.searchQuery) {
        const searchMetadata = JSON.stringify({
          type: 'search_metadata',
          searchPerformed: responseWithMetadata.searchPerformed || false,
          citations: responseWithMetadata.citations || [],
          searchQuery: responseWithMetadata.searchQuery || ''
        });
        res.write(`[SEARCH_META]${searchMetadata}[/SEARCH_META]\n`);
        if (typeof (res as any).flush === 'function') {
          try { (res as any).flush(); } catch {}
        }
        console.log(`🔍 [CHAT_FLOW] Search metadata sent: searchPerformed=${responseWithMetadata.searchPerformed}, citations=${(responseWithMetadata.citations || []).length}, query="${responseWithMetadata.searchQuery}"`);
      }

      const reader = responseWithMetadata.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fullResponse += value;
          res.write(value);
          // Hint to flush on each chunk if supported by the underlying impl
          if (typeof (res as any).flush === 'function') {
            try { (res as any).flush(); } catch {}
          }
        }

        console.log(`🤖 [CHAT_FLOW] AI response generation completed: ${Date.now() - aiResponseStart}ms`);
        console.log(`📏 [CHAT_FLOW] AI response length: ${fullResponse.length} characters`);

        // Save AI response
        const saveAiResponseStart = Date.now();
        const savedMessage = await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: fullResponse,
        });
        console.log(`💾 [CHAT_FLOW] AI response saved: ${Date.now() - saveAiResponseStart}ms`);

        // Send the real database message ID to frontend
        const messageIdMetadata = JSON.stringify({
          type: 'message_id',
          messageId: savedMessage.id
        });
        res.write(`[MESSAGE_ID]${messageIdMetadata}[/MESSAGE_ID]\n`);
        if (typeof (res as any).flush === 'function') {
          try { (res as any).flush(); } catch {}
        }

        // Increment message usage count
        const incrementUsageStart = Date.now();
        await storage.incrementMessageUsage(userId);
        console.log(`📈 [CHAT_FLOW] Message usage incremented: ${Date.now() - incrementUsageStart}ms`);

        // Extract and update user profile from conversation and workflow
        const profileUpdateStart = Date.now();
        try {
          let combinedProfileUpdates: any = {};

          // Get workflow profile patches if available (e.g., instagramUsername discovered in conversation)
          if (responseWithMetadata.workflowDecision?.profilePatch &&
              Object.keys(responseWithMetadata.workflowDecision.profilePatch).length > 0) {
            combinedProfileUpdates = { ...responseWithMetadata.workflowDecision.profilePatch };
            console.log(`🔄 [CHAT_FLOW] Workflow profile patches:`, Object.keys(combinedProfileUpdates));
          }

          // UNIFIED PROFILE EXTRACTION LOGIC
          // Extract profile in these specific cases:
          // 1. After successful external analysis (Instagram/Blog) - ALWAYS extract to capture new insights
          // 2. Intent analysis explicitly recommends extraction with high confidence (>= 0.75)
          // 3. Explicit profile update request from user
          
          const hasSuccessfulAnalysis = (instagramAnalysisResult?.success || blogAnalysisResult?.success);
          const highConfidenceIntent = profileUpdateDecision?.shouldExtract && profileUpdateDecision.confidence >= 0.75;
          const shouldExtractProfile = hasSuccessfulAnalysis || highConfidenceIntent;

          const userMessage = content; // Keep original user message for extraction
          const assistantMessage = fullResponse; // Use the full generated response for extraction

          let conversationProfileUpdates: any = {};
          if (shouldExtractProfile) {
            const profileExtractionStart = Date.now();
            const extractionReason = hasSuccessfulAnalysis 
              ? "post-analysis extraction (always runs after IG/blog analysis)" 
              : `intent-driven extraction (confidence: ${profileUpdateDecision?.confidence})`;
            
            console.log(`👤 [CHAT_FLOW] Running profile extraction - reason: ${extractionReason}`);
            
            // Send profile extraction activity indicator
            res.write(`[AI_ACTIVITY]{"type":"profile_extracting","message":"Updating your profile..."}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }
            
            // Pass analysis context flags to help AI be more conservative
            const extractedProfile = await extractProfileInfo(
              userMessage,
              assistantMessage,
              user!,
              {
                blogAnalysisPerformed: blogAnalysisResult?.success,
                instagramAnalysisPerformed: instagramAnalysisResult?.success
              }
            );
            conversationProfileUpdates = extractedProfile;
            
            // Clear profile extraction indicator
            res.write(`[AI_ACTIVITY]{"type":null,"message":""}[/AI_ACTIVITY]`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }
            
            console.log(`👤 [CHAT_FLOW] Profile extraction completed: ${Date.now() - profileExtractionStart}ms - extracted fields: ${Object.keys(extractedProfile || {}).join(', ') || 'none'}`);
          } else {
            console.log(`👤 [CHAT_FLOW] Skipping profile extraction - conditions not met (shouldExtract: ${profileUpdateDecision?.shouldExtract || false}, confidence: ${profileUpdateDecision?.confidence || 0}, hasAnalysis: ${hasSuccessfulAnalysis})`);
          }

          // Merge workflow patches with conversation-extracted updates
          if (conversationProfileUpdates && Object.keys(conversationProfileUpdates).length > 0) {
            // Deep merge profileData to avoid overwriting nested objects like blogProfile
            if (combinedProfileUpdates.profileData && conversationProfileUpdates.profileData) {
              combinedProfileUpdates = {
                ...combinedProfileUpdates,
                ...conversationProfileUpdates,
                profileData: {
                  ...combinedProfileUpdates.profileData,
                  ...conversationProfileUpdates.profileData
                }
              };
            } else {
              combinedProfileUpdates = { ...combinedProfileUpdates, ...conversationProfileUpdates };
            }
          }

          // REMOVED: Auto Instagram analysis during streaming (causes race conditions)
          // Instead, queue it for next conversation turn if username is discovered
          if (combinedProfileUpdates.instagramUsername && !instagramAnalysisResult) {
            console.log(`📸 [CHAT_FLOW] Discovered Instagram username: @${combinedProfileUpdates.instagramUsername} - user can explicitly request analysis in next message`);
            // Note: Workflow system will suggest Instagram analysis in next turn via suggested prompts
          }

          if (Object.keys(combinedProfileUpdates).length > 0) {
            const profileSaveStart = Date.now();
            await storage.updateUserProfile(userId, combinedProfileUpdates);
            console.log(`👤 [CHAT_FLOW] Profile update saved: ${Date.now() - profileSaveStart}ms`);
            console.log(`👤 [CHAT_FLOW] Combined profile updates:`, Object.keys(combinedProfileUpdates));
          } else {
            console.log(`👤 [CHAT_FLOW] No profile updates found`);
          }
          console.log(`👤 [CHAT_FLOW] Total profile processing: ${Date.now() - profileUpdateStart}ms`);
        } catch (error) {
          console.log('❌ [CHAT_FLOW] Profile processing error:', error);
          console.log(`👤 [CHAT_FLOW] Profile processing failed: ${Date.now() - profileUpdateStart}ms`);
        }

        // Extract and save new memories from conversation
        const memorySaveStart = Date.now();
        try {
          const memoryExtractionStart = Date.now();
          const newMemories = await extractMemoriesFromConversation(content, fullResponse, relevantMemories);
          console.log(`🧠 [CHAT_FLOW] Memory extraction: ${Date.now() - memoryExtractionStart}ms (found ${newMemories.length} memories)`);

          if (newMemories.length > 0) {
            // Generate embeddings in parallel for much faster processing
            const embeddingStart = Date.now();
            const embeddings = await Promise.all(
              newMemories.map(memoryContent => generateEmbedding(memoryContent))
            );
            console.log(`🧠 [CHAT_FLOW] Parallel embeddings: ${Date.now() - embeddingStart}ms (${embeddings.length} embeddings)`);

            // SEMANTIC DEDUPLICATION: Check each new memory against existing ones before insertion
            const deduplicationStart = Date.now();
            const memoriesToSave: Array<{ content: string; embedding: number[]; isDuplicate: boolean }> = [];
            
            for (let i = 0; i < newMemories.length; i++) {
              const memoryContent = newMemories[i];
              const embedding = embeddings[i];
              
              // Check similarity with existing memories
              const similarExisting = await storage.searchSimilarMemories(userId, embedding, 5);
              const highestSimilarity = similarExisting.length > 0 ? similarExisting[0].similarity : 0;
              
              // Use 0.92 threshold for true duplicates (semantic deduplication)
              // This prevents near-identical memories while allowing semantically different ones
              if (highestSimilarity >= 0.92) {
                console.log(`🧠 [DEDUP] Skipping duplicate memory (similarity: ${highestSimilarity.toFixed(3)}): "${memoryContent.substring(0, 60)}..."`);
                memoriesToSave.push({ content: memoryContent, embedding, isDuplicate: true });
              } else {
                console.log(`🧠 [DEDUP] Accepting new memory (highest similarity: ${highestSimilarity.toFixed(3)}): "${memoryContent.substring(0, 60)}..."`);
                memoriesToSave.push({ content: memoryContent, embedding, isDuplicate: false });
              }
            }
            console.log(`🧠 [CHAT_FLOW] Semantic deduplication check: ${Date.now() - deduplicationStart}ms (${memoriesToSave.filter(m => !m.isDuplicate).length}/${newMemories.length} unique)`);

            // Save only non-duplicate memories with importance scoring
            const saveStart = Date.now();
            const uniqueMemories = memoriesToSave.filter(m => !m.isDuplicate);
            
            if (uniqueMemories.length > 0) {
              await Promise.all(
                uniqueMemories.map((memory) => {
                  // Calculate importance score based on:
                  // 1. Profile-related content (higher importance)
                  // 2. Explicit user statements vs inferred facts
                  // 3. Business-critical information
                  const content = memory.content.toLowerCase();
                  let importanceScore = 0.5; // Base score
                  
                  // Boost for profile-related content
                  if (content.includes('my name') || content.includes('my business') || 
                      content.includes('i am') || content.includes("i'm")) {
                    importanceScore += 0.2;
                  }
                  
                  // Boost for business information
                  if (content.includes('target audience') || content.includes('brand voice') ||
                      content.includes('content goal') || content.includes('niche')) {
                    importanceScore += 0.15;
                  }
                  
                  // Boost for analysis results
                  if ((memory.content as any)?.metadata?.source === 'instagram_analysis' ||
                      (memory.content as any)?.metadata?.source === 'blog_analysis') {
                    importanceScore += 0.1;
                  }
                  
                  // Cap at 1.0
                  importanceScore = Math.min(1.0, importanceScore);
                  
                  return storage.createMemory({
                    userId,
                    content: memory.content,
                    embedding: memory.embedding,
                    metadata: { 
                      source: 'conversation', 
                      conversationId,
                      importance: importanceScore,
                      createdAt: new Date().toISOString()
                    }
                  });
                })
              );
              console.log(`🧠 [CHAT_FLOW] Saved ${uniqueMemories.length} unique memories with importance scoring: ${Date.now() - saveStart}ms`);
            } else {
              console.log(`🧠 [CHAT_FLOW] No new unique memories to save (all were duplicates)`);
            }
          }
          console.log(`🧠 [CHAT_FLOW] Total memory processing: ${Date.now() - memorySaveStart}ms`);
        } catch (error) {
          console.log('❌ [CHAT_FLOW] Memory extraction error:', error);
          console.log(`🧠 [CHAT_FLOW] Memory processing failed: ${Date.now() - memorySaveStart}ms`);
        }

        // Update conversation title if it's the first exchange (ASYNC - don't block response)
        if (messages.length <= 2 && conversation.title === 'New Conversation') {
          // Fire and forget - title generation happens in background
          generateConversationTitle([
            ...chatHistory,
            { role: 'assistant', content: fullResponse }
          ]).then(newTitle => {
            return storage.updateConversation(conversationId, { title: newTitle });
          }).then(() => {
            console.log(`📝 [CHAT_FLOW] Title generated and saved asynchronously`);
          }).catch(error => {
            console.error(`❌ [CHAT_FLOW] Background title generation failed:`, error);
            // Non-critical error - title will remain "New Conversation"
          });
          console.log(`📝 [CHAT_FLOW] Title generation started in background (non-blocking)`);
        }

        const totalDuration = Date.now() - requestStartTime;
        
        // Comprehensive performance summary
        console.log(`\n📊 [PERFORMANCE] Request Summary:`);
        console.log(`  Total Duration: ${totalDuration}ms`);
        console.log(`  Breakdown:`);
        console.log(`    • Verification & Setup: ${Date.now() - requestStartTime - totalDuration}ms`);
        console.log(`    • Memory Search: ${memorySearchStart ? (Date.now() - memorySearchStart) : 0}ms`);
        console.log(`    • Intent Analysis: ${unifiedIntentStart ? (Date.now() - unifiedIntentStart) : 0}ms`);
        if (instagramAnalysisResult) {
          console.log(`    • Instagram Analysis: included in intent time`);
        }
        if (blogAnalysisResult) {
          console.log(`    • Blog Analysis: included in intent time`);
        }
        console.log(`    • AI Response Generation: ${aiResponseStart ? (Date.now() - aiResponseStart) : 0}ms`);
        console.log(`    • Profile Update: ${profileUpdateStart ? (Date.now() - profileUpdateStart) : 0}ms`);
        console.log(`  Response Size: ${fullResponse.length} chars`);
        console.log(`  Memories Used: ${relevantMemories.length}`);
        console.log(`🏁 [CHAT_FLOW] Request completed at ${new Date().toISOString()}\n`);

        res.end();
      } catch (error) {
        console.error('❌ [CHAT_FLOW] Streaming error:', error);
        
        // Try to send error indicator to client if possible
        if (!res.headersSent) {
          res.status(500).json({ 
            message: "An error occurred while generating the response. Please try again.",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        } else {
          // If streaming was started, send error marker
          try {
            res.write(`\n\n⚠️ An error occurred while processing your request. Please try again.`);
          } catch (writeError) {
            console.error('❌ [CHAT_FLOW] Failed to write error message:', writeError);
          }
        }
        res.end();
      }
    } catch (error) {
      const totalDuration = Date.now() - requestStartTime;
      console.error('❌ [CHAT_FLOW] Message error:', error);
      console.log(`🏁 [CHAT_FLOW] Request failed after: ${totalDuration}ms\n`);

      // Provide user-friendly error messages based on error type
      let errorMessage = "Failed to process message. Please try again.";
      let statusCode = 500;
      
      if (error instanceof Error) {
        // Network/timeout errors
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          errorMessage = "Request timed out. Please try again or simplify your message.";
          statusCode = 504;
        }
        // API rate limiting errors
        else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = "Service is currently busy. Please wait a moment and try again.";
          statusCode = 429;
        }
        // Authentication errors
        else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          errorMessage = "Authentication failed. Please refresh the page and try again.";
          statusCode = 401;
        }
        // Database errors
        else if (error.message.includes('database') || error.message.includes('connection')) {
          errorMessage = "Database connection issue. Please try again in a moment.";
          statusCode = 503;
        }
        
        console.log(`🔍 [CHAT_FLOW] Error classification: ${statusCode} - ${errorMessage}`);
      }

      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(statusCode).json({ 
          message: errorMessage,
          retryable: statusCode !== 401 // Don't retry auth errors
        });
      } else {
        // If streaming was started, just end the response
        res.end();
      }
    }
  });

  // Delete a message
  app.delete("/api/conversations/:id/messages/:messageId", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const messageId = req.params.messageId;
      const userId = req.user.claims.sub;

      // Verify conversation exists and user owns it
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify message exists and belongs to this conversation
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      if (message.conversationId !== conversationId) {
        return res.status(403).json({ message: "Message does not belong to this conversation" });
      }

      // Delete the message
      const deleted = await storage.deleteMessage(messageId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete message" });
      }

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });
}