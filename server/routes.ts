import type { Express } from "express";
import Stripe from "stripe";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, updateUserProfileSchema, insertMemorySchema, updateUserSubscriptionSchema } from "@shared/schema";
import { generateChatResponse, generateConversationTitle, extractProfileInfo, generateEmbedding, extractMemoriesFromConversation, type ChatResponseWithMetadata } from "./services/openai";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all conversations for authenticated user
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get a specific conversation
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      // Verify ownership
      const userId = req.user.claims.sub;
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse({ ...req.body, userId });
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Conversation creation error:", error);
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  // Delete a conversation
  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Verify ownership first
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const userId = req.user.claims.sub;
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

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
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.messagesUsed >= user.messagesLimit) {
        return res.status(429).json({ 
          message: "Message limit reached. Please upgrade your subscription.",
          messagesUsed: user.messagesUsed,
          messagesLimit: user.messagesLimit
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

      // Search for relevant memories using user message
      const memorySearchStart = Date.now();
      let relevantMemories: any[] = [];
      try {
        const embeddingStart = Date.now();
        const queryEmbedding = await generateEmbedding(content);
        console.log(`🧠 [CHAT_FLOW] Embedding generation: ${Date.now() - embeddingStart}ms`);
        
        const similaritySearchStart = Date.now();
        relevantMemories = await storage.searchSimilarMemories(userId, queryEmbedding, 5);
        console.log(`🔍 [CHAT_FLOW] Vector similarity search: ${Date.now() - similaritySearchStart}ms`);
        console.log(`🎯 [CHAT_FLOW] Total memory search: ${Date.now() - memorySearchStart}ms (found ${relevantMemories.length} memories)`);
      } catch (error) {
        console.log('❌ [CHAT_FLOW] Memory search error:', error);
        console.log(`🎯 [CHAT_FLOW] Memory search failed: ${Date.now() - memorySearchStart}ms`);
      }

      // Set up streaming response
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

      // Generate AI response stream with user profile and memories
      const aiResponseStart = Date.now();
      console.log(`🤖 [CHAT_FLOW] Starting AI response generation...`);
      const responseWithMetadata: ChatResponseWithMetadata = await generateChatResponse(chatHistory, user, relevantMemories);
      let fullResponse = '';

      // Send search metadata first if search was performed
      if (responseWithMetadata.searchPerformed) {
        const searchMetadata = JSON.stringify({
          type: 'search_metadata',
          searchPerformed: true,
          citations: responseWithMetadata.citations,
          searchQuery: responseWithMetadata.searchQuery
        });
        res.write(`[SEARCH_META]${searchMetadata}[/SEARCH_META]\n`);
        if (typeof (res as any).flush === 'function') {
          try { (res as any).flush(); } catch {}
        }
        console.log(`🔍 [CHAT_FLOW] Search metadata sent: ${responseWithMetadata.citations.length} citations`);
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
        await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: fullResponse,
        });
        console.log(`💾 [CHAT_FLOW] AI response saved: ${Date.now() - saveAiResponseStart}ms`);

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
          
          // Also extract profile info from conversation (for backward compatibility)
          const profileExtractionStart = Date.now();
          const conversationProfileUpdates = await extractProfileInfo(content, fullResponse, user!);
          console.log(`👤 [CHAT_FLOW] Profile extraction: ${Date.now() - profileExtractionStart}ms`);
          
          // Merge workflow patches with conversation-extracted updates
          if (conversationProfileUpdates && Object.keys(conversationProfileUpdates).length > 0) {
            combinedProfileUpdates = { ...combinedProfileUpdates, ...conversationProfileUpdates };
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
          const newMemories = await extractMemoriesFromConversation(content, fullResponse);
          console.log(`🧠 [CHAT_FLOW] Memory extraction: ${Date.now() - memoryExtractionStart}ms (found ${newMemories.length} memories)`);
          
          for (const memoryContent of newMemories) {
            const memoryEmbeddingStart = Date.now();
            const embedding = await generateEmbedding(memoryContent);
            console.log(`🧠 [CHAT_FLOW] Memory embedding: ${Date.now() - memoryEmbeddingStart}ms`);
            
            const memorySaveOneStart = Date.now();
            await storage.createMemory({
              userId,
              content: memoryContent,
              embedding,
              metadata: { source: 'conversation', conversationId }
            });
            console.log(`🧠 [CHAT_FLOW] Memory saved: ${Date.now() - memorySaveOneStart}ms`);
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
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = updateUserProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Get all memories for authenticated user
  app.get("/api/memories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memories = await storage.getMemories(userId);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get memories" });
    }
  });

  // Create a new memory with embedding
  app.post("/api/memories", isAuthenticated, async (req: any, res) => {
    try {
      const { content, metadata } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Memory content is required" });
      }

      const userId = req.user.claims.sub;
      
      // Generate embedding for the content
      const embedding = await generateEmbedding(content);
      
      const validatedData = insertMemorySchema.parse({
        userId,
        content,
        embedding,
        metadata: metadata || null
      });
      
      const memory = await storage.createMemory(validatedData);
      res.json(memory);
    } catch (error) {
      console.error("Memory creation error:", error);
      res.status(400).json({ message: "Failed to create memory" });
    }
  });

  // Delete a memory
  app.delete("/api/memories/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Verify ownership first
      const memory = await storage.getMemory(req.params.id);
      if (!memory) {
        return res.status(404).json({ message: "Memory not found" });
      }
      const userId = req.user.claims.sub;
      if (memory.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteMemory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Memory not found" });
      }
      res.json({ message: "Memory deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete memory" });
    }
  });

  // Search similar memories using vector similarity
  app.post("/api/memories/search", isAuthenticated, async (req: any, res) => {
    try {
      const { query, limit } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const userId = req.user.claims.sub;
      
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);
      
      // Search for similar memories
      const similarMemories = await storage.searchSimilarMemories(
        userId, 
        queryEmbedding, 
        limit || 10
      );
      
      res.json(similarMemories);
    } catch (error) {
      console.error("Memory search error:", error);
      res.status(500).json({ message: "Failed to search memories" });
    }
  });

  // Subscription management routes
  app.get("/api/subscriptions/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  app.post("/api/subscriptions/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Create or get Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        });
        stripeCustomerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId });
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: plan.stripePriceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.REPLIT_DOMAINS ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/settings?success=true`,
        cancel_url: `${process.env.REPLIT_DOMAINS ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/settings?canceled=true`,
        metadata: {
          userId,
          planId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout creation error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/subscriptions/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as any;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;
          
          if (userId && planId) {
            await storage.updateUserSubscription(userId, {
              stripeSubscriptionId: session.subscription,
              subscriptionPlanId: planId,
              subscriptionStatus: 'active',
              subscriptionStartedAt: new Date(),
            });

            // Update message limit based on plan
            const plan = await storage.getSubscriptionPlan(planId);
            if (plan) {
              await storage.updateUserSubscription(userId, {
                messagesLimit: plan.messagesLimit,
                messagesUsed: 0,
              });
            }
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as any;
          const customer = await stripe.customers.retrieve(subscription.customer);
          
          // Find user by customer ID
          const users = await storage.getSubscriptionPlans(); // We need a method to find user by stripe customer ID
          // For now, we'll handle this in a future update
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
