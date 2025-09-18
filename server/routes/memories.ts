import type { Express } from "express";
import { storage } from "../storage";
import { insertMemorySchema } from "@shared/schema";
import { generateEmbedding } from "../services/ai/chat";
import { isAuthenticated } from "../replitAuth";

export function registerMemoryRoutes(app: Express) {
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
}