import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Memory } from "@shared/schema";

export default function MemoryTester() {
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(Memory & { similarity: number })[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all memories
  const { data: memories = [], refetch: refetchMemories } = useQuery<Memory[]>({
    queryKey: ["/api/memories"],
  });

  // Create memory mutation
  const createMemoryMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/memories", { 
        content,
        metadata: { source: "memory_tester" } as Record<string, any>
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      setNewMemoryContent("");
      toast({
        title: "Success",
        description: "Memory created successfully with embedding",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create memory: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete memory mutation
  const deleteMemoryMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      await apiRequest("DELETE", `/api/memories/${memoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      toast({
        title: "Success",
        description: "Memory deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete memory: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Search memories mutation
  const searchMemoriesMutation = useMutation({
    mutationFn: async ({ query, limit }: { query: string; limit?: number }) => {
      const response = await apiRequest("POST", "/api/memories/search", { query, limit });
      return response.json();
    },
    onSuccess: (results) => {
      setSearchResults(results);
      toast({
        title: "Search Complete",
        description: `Found ${results.length} similar memories`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search Error",
        description: `Failed to search memories: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateMemory = () => {
    if (!newMemoryContent.trim()) return;
    createMemoryMutation.mutate(newMemoryContent);
  };

  const handleSearchMemories = () => {
    if (!searchQuery.trim()) return;
    searchMemoriesMutation.mutate({ query: searchQuery, limit: 10 });
  };

  const handleDeleteMemory = (memoryId: string) => {
    deleteMemoryMutation.mutate(memoryId);
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Memory System Tester</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create New Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              placeholder="Enter memory content (will generate embeddings automatically)..."
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              data-testid="input-memory-content"
            />
            <Button 
              onClick={handleCreateMemory}
              disabled={createMemoryMutation.isPending || !newMemoryContent.trim()}
              data-testid="button-create-memory"
            >
              {createMemoryMutation.isPending ? "Creating..." : "Create Memory"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Similar Memories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input
              placeholder="Enter search query for vector similarity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-query"
            />
            <Button 
              onClick={handleSearchMemories}
              disabled={searchMemoriesMutation.isPending || !searchQuery.trim()}
              data-testid="button-search-memories"
            >
              {searchMemoriesMutation.isPending ? "Searching..." : "Search Memories"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Search Results ({searchResults.length})</h4>
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div key={result.id} className="p-3 border rounded bg-blue-50" data-testid={`search-result-${result.id}`}>
                    <div className="text-sm text-gray-600 mb-1">
                      Similarity: {(result.similarity * 100).toFixed(2)}%
                    </div>
                    <div>{result.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Memories ({memories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <div className="text-gray-500" data-testid="text-no-memories">No memories found. Create one to test the system.</div>
          ) : (
            <div className="space-y-2">
              {memories.map((memory) => (
                <div key={memory.id} className="p-3 border rounded bg-gray-50 flex justify-between items-start" data-testid={`memory-${memory.id}`}>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      Created: {new Date(memory.createdAt).toLocaleString()}
                    </div>
                    <div>{memory.content}</div>
                    {memory.metadata ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Metadata: {JSON.stringify(memory.metadata as object)}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteMemory(memory.id)}
                    disabled={deleteMemoryMutation.isPending}
                    data-testid={`button-delete-${memory.id}`}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}