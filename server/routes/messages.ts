import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { generateChatResponse, generateConversationTitle, type ChatResponseWithMetadata } from "../services/ai/chat";
import { generateEmbedding } from "../services/openai";
import { extractProfileInfo } from "../services/ai/profile";
import { extractMemoriesFromConversation, rephraseQueryForEmbedding } from "../services/ai/memory";
import { analyzeUnifiedIntent, extractWebSearchDecision, extractInstagramAnalysisDecision, extractBlogAnalysisDecision, extractProfileUpdateDecision } from "../services/ai/intent"; // Unified intent classification
import { performInstagramAnalysis, formatInstagramAnalysisForChat } from "../services/ai/instagram"; // Added Instagram integration
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
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conversationId = req.params.id;
      const userId = req.user.claims.sub;
      console.log(`📝 [CHAT_FLOW] Processing message for user: ${userId}, conversation: ${conversationId}`);

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

      // Search for relevant memories using user message with query rephrasing
      const memorySearchStart = Date.now();
      let relevantMemories: any[] = [];
      try {
        // Rephrase the query for better embedding search using conversation context
        const queryRephrasingStart = Date.now();
        const rephrasedQuery = await rephraseQueryForEmbedding(content, chatHistory.slice(-6), user);
        console.log(`🔄 [CHAT_FLOW] Query rephrasing: ${Date.now() - queryRephrasingStart}ms`);
        console.log(`🔍 [CHAT_FLOW] Original query: "${content}"`);
        console.log(`🔍 [CHAT_FLOW] Rephrased query: "${rephrasedQuery}"`);

        const embeddingStart = Date.now();
        const queryEmbedding = await generateEmbedding(rephrasedQuery);
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
      let blogAnalysisResult: any = null;
      let searchDecision: any = null;
      let workflowPhaseDecision: any = null;
      let profileUpdateDecision: any = null;

      try {
        console.log(`🧠 [CHAT_FLOW] Starting unified intent analysis...`);
        const unifiedDecision = await analyzeUnifiedIntent(chatHistory, user);
        console.log(`🧠 [CHAT_FLOW] Unified intent analysis: ${Date.now() - unifiedIntentStart}ms - webSearch: ${unifiedDecision.webSearch.shouldSearch}, instagram: ${unifiedDecision.instagramAnalysis.shouldAnalyze}, blog: ${unifiedDecision.blogAnalysis.shouldAnalyze}, profileUpdate: ${unifiedDecision.profileUpdate?.shouldExtract || false}, phase: ${unifiedDecision.workflowPhase.currentPhase}`);

        // Extract individual decisions for backward compatibility
        const instagramDecision = extractInstagramAnalysisDecision(unifiedDecision);
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
            res.write(`data: ${JSON.stringify({ 
              type: 'activity', 
              activity: 'instagram_analyzing',
              details: `@${instagramDecision.username}` 
            })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramAnalysisResult = await performInstagramAnalysis(
              instagramDecision.username, 
              userId,
              (message: string) => {
                // Send progress updates
                res.write(`data: ${JSON.stringify({ 
                  type: 'activity', 
                  activity: 'instagram_analyzing',
                  details: message 
                })}\n\n`);
                if (typeof (res as any).flush === 'function') {
                  try { (res as any).flush(); } catch {}
                }
              }
            );

            // Clear activity indicator
            res.write(`data: ${JSON.stringify({ 
              type: 'activity', 
              activity: null 
            })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            console.log(`📸 [CHAT_FLOW] Instagram analysis completed: ${Date.now() - instagramAnalysisStart}ms - success: ${instagramAnalysisResult.success}`);
          } catch (error) {
            console.error(`❌ [CHAT_FLOW] Instagram analysis failed: ${Date.now() - instagramAnalysisStart}ms`, error);

            // Clear activity indicator on error
            res.write(`data: ${JSON.stringify({ 
              type: 'activity', 
              activity: null 
            })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              try { (res as any).flush(); } catch {}
            }

            instagramAnalysisResult = {
              success: false,
              error: 'Failed to analyze Instagram profile'
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
      const responseWithMetadata: ChatResponseWithMetadata = await generateChatResponse(chatHistory, user, relevantMemories, searchDecision, instagramAnalysisResult, blogAnalysisResult, workflowPhaseDecision); // Pass workflow decision from unified intent analysis
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

          // Get workflow profile patches if available
          if (responseWithMetadata.workflowDecision?.profilePatch &&
              Object.keys(responseWithMetadata.workflowDecision.profilePatch).length > 0) {
            combinedProfileUpdates = { ...responseWithMetadata.workflowDecision.profilePatch };
            console.log(`🔄 [CHAT_FLOW] Workflow profile patches:`, Object.keys(combinedProfileUpdates));
          }

          // Use intent-driven profile extraction instead of always running it
          // Also trigger after successful blog/Instagram analysis when new data is available
          const hasSuccessfulAnalysis = (instagramAnalysisResult?.success || blogAnalysisResult?.success);

          let conversationProfileUpdates: any = {};
          if ((profileUpdateDecision?.shouldExtract && profileUpdateDecision.confidence >= 0.7) || hasSuccessfulAnalysis) {
            const profileExtractionStart = Date.now();
            conversationProfileUpdates = await extractProfileInfo(content, fullResponse, user!);
            const reason = hasSuccessfulAnalysis ? "post-analysis extraction" : (profileUpdateDecision?.reason || "intent analysis");
            console.log(`👤 [CHAT_FLOW] Profile extraction (intent-driven): ${Date.now() - profileExtractionStart}ms - reason: ${reason}`);
          } else {
            console.log(`👤 [CHAT_FLOW] Skipping profile extraction - not recommended by intent analysis (shouldExtract: ${profileUpdateDecision?.shouldExtract || false}, confidence: ${profileUpdateDecision?.confidence || 0})`);
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

          // Check for automatic Instagram analysis during discovery
          if (combinedProfileUpdates.instagramUsername && !instagramAnalysisResult) {
            console.log(`📸 [CHAT_FLOW] Auto-triggering Instagram analysis for discovered username: @${combinedProfileUpdates.instagramUsername}`);

            // Mark this as the user's own profile if detected during discovery
            if (combinedProfileUpdates.ownInstagramUsername) {
              combinedProfileUpdates.ownInstagramUsername = combinedProfileUpdates.instagramUsername;
            }

            try {
              const autoAnalysisStart = Date.now();
              instagramAnalysisResult = await performInstagramAnalysis(combinedProfileUpdates.instagramUsername, userId);
              console.log(`📸 [CHAT_FLOW] Auto Instagram analysis completed: ${Date.now() - autoAnalysisStart}ms - success: ${instagramAnalysisResult.success}`);

              // If analysis was successful, add a note to the response stream
              if (instagramAnalysisResult.success) {
                res.write(`\n\n📸 **Discovered your Instagram!** I've analyzed @${combinedProfileUpdates.instagramUsername} to better understand your content style and audience. This will help me provide more personalized recommendations.\n\n`);
                if (typeof (res as any).flush === 'function') {
                  try { (res as any).flush(); } catch {}
                }
              }
            } catch (autoAnalysisError) {
              console.log(`❌ [CHAT_FLOW] Auto Instagram analysis failed:`, autoAnalysisError);
            }
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

            // Save memories in parallel as well
            const saveStart = Date.now();
            await Promise.all(
              newMemories.map((memoryContent, index) => 
                storage.upsertMemory({
                  userId,
                  content: memoryContent,
                  embedding: embeddings[index],
                  metadata: { source: 'conversation', conversationId }
                }, 0.85) // Use 0.85 similarity threshold for updates
              )
            );
            console.log(`🧠 [CHAT_FLOW] Parallel memory saves: ${Date.now() - saveStart}ms`);
          }
          console.log(`🧠 [CHAT_FLOW] Total memory processing: ${Date.now() - memorySaveStart}ms`);
        } catch (error) {
          console.log('❌ [CHAT_FLOW] Memory extraction error:', error);
          console.log(`🧠 [CHAT_FLOW] Memory processing failed: ${Date.now() - memorySaveStart}ms`);
        }

        // Update conversation title if it's the first exchange
        if (messages.length <= 2 && conversation.title === 'New Conversation') {
          const titleGenerationStart = Date.now();
          const newTitle = await generateConversationTitle([
            ...chatHistory,
            { role: 'assistant', content: fullResponse }
          ]);
          await storage.updateConversation(conversationId, { title: newTitle });
          console.log(`📝 [CHAT_FLOW] Title generation and save: ${Date.now() - titleGenerationStart}ms`);
        }

        const totalDuration = Date.now() - requestStartTime;
        console.log(`🏁 [CHAT_FLOW] Total request processing: ${totalDuration}ms`);
        console.log(`🏁 [CHAT_FLOW] Request completed at ${new Date().toISOString()}\n`);

        res.end();
      } catch (error) {
        console.error('❌ [CHAT_FLOW] Streaming error:', error);
        res.end();
      }
    } catch (error) {
      const totalDuration = Date.now() - requestStartTime;
      console.error('❌ [CHAT_FLOW] Message error:', error);
      console.log(`🏁 [CHAT_FLOW] Request failed after: ${totalDuration}ms\n`);

      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to process message" });
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