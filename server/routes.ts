import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, updateUserProfileSchema, insertMemorySchema } from "@shared/schema";
import { generateChatResponse, generateConversationTitle, extractProfileInfo, generateEmbedding, extractMemoriesFromConversation } from "./services/openai";
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
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

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

      // Save user message
      await storage.createMessage({
        conversationId,
        role: 'user',
        content,
      });

      // Get conversation history and user profile
      const messages = await storage.getMessages(conversationId);
      const user = await storage.getUser(userId);
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // Search for relevant memories using user message
      let relevantMemories: any[] = [];
      try {
        const queryEmbedding = await generateEmbedding(content);
        relevantMemories = await storage.searchSimilarMemories(userId, queryEmbedding, 5);
      } catch (error) {
        console.log('Memory search error:', error);
      }

      // Set up streaming response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Generate AI response stream with user profile and memories
      const responseStream = await generateChatResponse(chatHistory, user, relevantMemories);
      let fullResponse = '';

      const reader = responseStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          fullResponse += value;
          res.write(value);
        }
        
        // Save AI response
        await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: fullResponse,
        });

        // Extract and update user profile from conversation
        try {
          const profileUpdates = await extractProfileInfo(content, fullResponse, user!);
          if (profileUpdates && Object.keys(profileUpdates).length > 0) {
            await storage.updateUserProfile(userId, profileUpdates);
          }
        } catch (error) {
          console.log('Profile extraction error:', error);
        }

        // Extract and save new memories from conversation
        try {
          const newMemories = await extractMemoriesFromConversation(content, fullResponse);
          for (const memoryContent of newMemories) {
            const embedding = await generateEmbedding(memoryContent);
            await storage.createMemory({
              userId,
              content: memoryContent,
              embedding,
              metadata: { source: 'conversation', conversationId }
            });
          }
        } catch (error) {
          console.log('Memory extraction error:', error);
        }

        // Update conversation title if it's the first exchange
        if (messages.length <= 2 && conversation.title === 'New Conversation') {
          const newTitle = await generateConversationTitle([
            ...chatHistory,
            { role: 'assistant', content: fullResponse }
          ]);
          await storage.updateConversation(conversationId, { title: newTitle });
        }

        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        res.end();
      }
    } catch (error) {
      console.error('Message error:', error);
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

  const httpServer = createServer(app);
  return httpServer;
}
