import { useState, useEffect, startTransition, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "../components/chat/sidebar";
import MessageList from "../components/chat/message-list";
import MessageInput from "../components/chat/message-input";
import ExportMenu from "../components/chat/export-menu";
import { type Conversation, type Message, type User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Share, MoreVertical, LogOut, TestTube, Download, SquareLibrary,LibraryBig } from "lucide-react";
import MemoryTester from "../components/MemoryTester";
import SearchIndicator from "../components/chat/search-indicator";
import AIActivityIndicator from "../components/chat/ai-activity-indicator";

export default function Chat() {
  const { id: conversationId } = useParams();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // This state is used for the indicator
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [searchCitations, setSearchCitations] = useState<string[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [showMemoryTester, setShowMemoryTester] = useState(false);
  const [aiActivity, setAiActivity] = useState<'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | 'extracting_memories' | 'saving_memories' | null>(null);
  const [aiActivityMessage, setAiActivityMessage] = useState<string>('');

  // Memoize handlers to prevent dropdown re-renders
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth() as { user: User | undefined };
  const { toast } = useToast();
  
  // Dynamic viewport height for mobile
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);

  // State for the typing indicator and the search query extracted from streaming data
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState<any>(null); // To store search metadata
  const [isLoading, setIsLoading] = useState(false); // General loading state for sending messages
  const [messages, setMessages] = useState<Message[]>([]); // Local state for messages to enable real-time updates
  const streamingMessageIdRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | undefined>(conversationId);
  const hasStreamedMessagesRef = useRef<boolean>(false);

  // Get conversations list
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Get messages for current conversation
  const { data: messagesFromApi, refetch: refetchMessages, isLoading: isLoadingMessages, isFetching: isFetchingMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
    staleTime: Infinity, // Never consider stale - we manage refetching manually
    gcTime: Infinity, // Keep in cache
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1,
  });

  // Effect to sync API messages with local state when API data changes
  // This runs whenever messagesFromApi updates (not tied to conversationId changes)
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      hasStreamedMessagesRef.current = false;
      return;
    }
    
    // Don't sync from API if we're streaming
    // This prevents the flash when queries refetch during message sending
    if (isStreaming) {
      return;
    }
    
    // If we have streamed messages in this conversation, don't overwrite with API data
    // The local state is the source of truth after streaming
    if (hasStreamedMessagesRef.current) {
      return;
    }
    
    // Only update messages when we have data OR when we're done loading/fetching
    // This prevents showing stale messages from a previous conversation
    if (messagesFromApi !== undefined) {
      setMessages(messagesFromApi as Message[]);
    } else if (!isLoadingMessages && !isFetchingMessages) {
      // If we're not loading and have no data, clear messages
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesFromApi, conversationId, isStreaming, isLoadingMessages, isFetchingMessages]);

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string = "New Conversation") => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations"],
        exact: true 
      });
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  // Streaming function outside mutation context
  const streamResponse = async (targetConversationId: string, content: string) => {
    console.log('🚀 Starting stream response');
    setIsStreaming(true);
    setIsSearching(false);
    setStreamingMessage("");
    setSearchCitations([]);
    setSearchQuery(undefined);
    setAiActivity('thinking');
    setAiActivityMessage('');
    
    // Mark that we're adding streamed messages - don't sync from API after this
    hasStreamedMessagesRef.current = true;

    // Create a single optimistic assistant message that we update in place
    const streamingId = `temp-stream-${Date.now()}`;
    streamingMessageIdRef.current = streamingId;
    const optimisticAssistant: Message = {
      id: streamingId,
      conversationId: targetConversationId,
      role: 'assistant',
      content: '',
      metadata: { streaming: true, citations: [], searchQuery: undefined, aiActivity: 'thinking', aiActivityMessage: '', clientKey: streamingId },
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticAssistant]);

    const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Message limit reached. Please upgrade your subscription.");
      }
      throw new Error("Failed to send message");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let accumulated = "";
    let actualContentStarted = false;
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;

        let chunkContent = chunk;

        // Check for various AI activity indicators in the stream
        const searchMetaRegex = /\[SEARCH_META\][\s\S]*?\[\/SEARCH_META\]/g;
        const activityRegex = /\[AI_ACTIVITY\](.*?)\[\/AI_ACTIVITY\]/g;
        const messageIdRegex = /\[MESSAGE_ID\][\s\S]*?\[\/MESSAGE_ID\]/g;
  const profileUpdatedRegex = /\[PROFILE_UPDATED\]([\s\S]*?)\[\/PROFILE_UPDATED\]/g;

        // Handle search metadata
        const searchMatches = chunkContent.match(searchMetaRegex);
        if (searchMatches) {
          searchMatches.forEach(match => {
            try {
              const metaContent = match.match(/\[SEARCH_META\]([\s\S]*?)\[\/SEARCH_META\]/);
              if (metaContent) {
                const searchMeta = JSON.parse(metaContent[1]);
                console.log('🔍 [CLIENT] Received search metadata:', searchMeta);
                setStreamingResponse(searchMeta);
                const sq = (searchMeta.searchQuery && searchMeta.searchQuery.trim()) ? searchMeta.searchQuery : undefined;
                const searchPerformed = searchMeta.searchPerformed || false;
                setIsSearching(!!sq);
                setSearchQuery(sq);
                setSearchCitations(searchMeta.citations || []);
                // Update the optimistic assistant message metadata using clientKey
                setMessages(current => current.map(m => (m.metadata as any)?.clientKey === streamingId ? {
                  ...m,
                  metadata: {
                    ...(m.metadata || {}),
                    searchQuery: sq,
                    searchPerformed: searchPerformed,
                    citations: searchMeta.citations || [],
                    aiActivity: sq ? 'searching' : (m.metadata?.aiActivity || null),
                  }
                } : m));
              }
            } catch (e) {
              console.error('Failed to parse search metadata:', e);
              setIsSearching(false); // Ensure indicator is off on parsing error
            }
          });
          chunkContent = chunkContent.replace(searchMetaRegex, '');
        }

        // Handle activity indicators
        const activityMatches = chunkContent.match(activityRegex);
        if (activityMatches) {
          activityMatches.forEach(match => {
            try {
              const activityContent = match.match(/\[AI_ACTIVITY\](.*?)\[\/AI_ACTIVITY\]/);
              if (activityContent) {
                const activityData = JSON.parse(activityContent[1]);
                setAiActivity(activityData.type);
                setAiActivityMessage(activityData.message || '');
                setMessages(current => current.map(m => (m.metadata as any)?.clientKey === streamingId ? {
                  ...m,
                  metadata: { ...(m.metadata || {}), aiActivity: activityData.type, aiActivityMessage: activityData.message || '' }
                } : m));
                console.log(`🤖 [CLIENT] AI Activity: ${activityData.type} - ${activityData.message}`);
              }
            } catch (e) {
              console.error('Failed to parse activity metadata:', e);
            }
          });
          chunkContent = chunkContent.replace(activityRegex, '');
        }

  // Handle profile-updated metadata (internal only - should not leak to UI)
  const profileMatches = chunkContent.match(profileUpdatedRegex);
        if (profileMatches) {
          profileMatches.forEach(match => {
            try {
              const profileContent = match.match(/\[PROFILE_UPDATED\]([\s\S]*?)\[\/PROFILE_UPDATED\]/);
              if (profileContent) {
                const profileData = JSON.parse(profileContent[1]);
                console.log('🔔 [CLIENT] PROFILE_UPDATED metadata received:', profileData);
                // Attach profile update metadata to the optimistic assistant message so the
                // UI can display a non-intrusive indicator based on message.metadata.profileUpdated
                setMessages(current => current.map(m => (m.metadata as any)?.clientKey === streamingId ? {
                  ...m,
                  metadata: {
                    ...(m.metadata || {}),
                    profileUpdated: profileData,
                  }
                } : m));
                // Optionally, you could also update any local profile-related state here,
                // but per request we avoid toasts or visible popups.
              }
            } catch (e) {
              console.error('Failed to parse PROFILE_UPDATED metadata:', e);
            }
          });
          // Remove profile metadata tokens from visible chunk content so it never appears
          // in the assistant message text.
          chunkContent = chunkContent.replace(profileUpdatedRegex, '');
        }

        // Handle message ID updates
        const messageIdMatches = chunkContent.match(messageIdRegex);
        if (messageIdMatches) {
          messageIdMatches.forEach(match => {
            try {
              const messageIdContent = match.match(/\[MESSAGE_ID\]([\s\S]*?)\[\/MESSAGE_ID\]/);
              if (messageIdContent) {
                const messageIdData = JSON.parse(messageIdContent[1]);
                console.log(`🆔 [CLIENT] Message ID update: ${streamingId} -> ${messageIdData.messageId}`);
                // Update the message with the real database ID using clientKey
                setMessages(current => current.map(m => (m.metadata as any)?.clientKey === streamingId ? {
                  ...m,
                  id: messageIdData.messageId,
                  metadata: {
                    ...(m.metadata || {}),
                    realDbId: messageIdData.messageId,
                    clientKey: streamingId // Keep original client key for reference
                  }
                } : m));
                // Update our local tracking
                streamingMessageIdRef.current = messageIdData.messageId;
              }
            } catch (e) {
              console.error('Failed to parse message ID metadata:', e);
            }
          });
          chunkContent = chunkContent.replace(messageIdRegex, '');
        }

        

        // Add clean content to accumulated display
        accumulated += chunkContent;

        // Once we get actual content, switch to generating activity
        if (!actualContentStarted && accumulated.trim()) {
          actualContentStarted = true;
          setAiActivity('generating');
          setAiActivityMessage('');
          setMessages(current => current.map(m => (m.metadata as any)?.clientKey === streamingId ? {
            ...m,
            metadata: { ...(m.metadata || {}), aiActivity: 'generating', aiActivityMessage: '' }
          } : m));
          // The search indicator should *remain* visible if a search was initiated,
          // even if content starts appearing. It only hides when the stream is done
          // or if explicitly turned off by new metadata.
        }

        // Update streaming message state for real-time display
        setStreamingMessage(accumulated);
        // Update assistant message content using clientKey for consistency
        setMessages(current => current.map(m => 
          (m.metadata as any)?.clientKey === streamingId ? 
          { ...m, content: accumulated } : m
        ));
      }

      console.log(`✅ Stream complete: ${chunkCount} chunks, ${accumulated.length} chars`);
    } catch (error) {
      console.error('❌ Stream error:', error);
      setIsSearching(false); // Ensure indicator is off on error
      throw error;
    } finally {
      console.log(`✅ [STREAM] Stream processing complete`);
      // Finalize streaming state
      setIsStreaming(false);
      setAiActivity(null);
      setAiActivityMessage('');
      setStreamingResponse(null);
      setOptimisticMessages([]);
      
      // Mark the optimistic assistant message as finalized using clientKey
      setMessages(current => current.map(m => 
        (m.metadata as any)?.clientKey === streamingId ? {
          ...m,
          metadata: { ...(m.metadata || {}), streaming: false, aiActivity: null, aiActivityMessage: '' }
        } : m
      ));
      
      // Only invalidate conversations list for updated timestamps (sidebar)
      // Do NOT refetch messages - they're already saved and in local state
      // Use exact: true to only invalidate the conversations list, not child queries like messages
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations"],
        exact: true 
      });
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      let targetConversationId = conversationId;

      // Add user message immediately to local state
      const userMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversationId: targetConversationId || 'temp',
        role: 'user',
        content,
        metadata: null,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      if (!conversationId) {
        // Create new conversation first
        const newConversation = await createConversationMutation.mutateAsync("New Conversation");
        targetConversationId = newConversation.id;
        setLocation(`/chat/${newConversation.id}`);
      }

      // Stream response
      await streamResponse(targetConversationId!, content);
    },
    onError: (error) => {
      console.error('Send message error:', error);
      setIsStreaming(false);
      setIsSearching(false); // Ensure search indicator is off on error
      setAiActivity(null);
      setAiActivityMessage('');
      setStreamingMessage("");
      setSearchCitations([]);
      setOptimisticMessages([]); // Clear optimistic messages on error
      setStreamingResponse(null); // Clear search metadata on error

      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      // Show specific error message if available
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // This is called after onSuccess or onError
      // Reset streaming states that are not handled by streamResponse's finally block
      setIsStreaming(false);
      setIsSearching(false); // Ensure search indicator is off when mutation settles
      setAiActivity(null);
      setAiActivityMessage('');
      setStreamingMessage("");
      setStreamingResponse(null); // Clear search metadata
    }
  });

  // Handle new conversation
  const handleNewConversation = () => {
    createConversationMutation.mutate("New Conversation");
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  // Get current conversation
  const currentConversation = conversations.find(c => c.id === conversationId);

  // Combined messages for display (real + optimistic) - stabilized
  const allMessages = useMemo(() => {
    if (optimisticMessages.length === 0) {
      return messages;
    }
    return [...messages, ...optimisticMessages].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, optimisticMessages]);

  // Stabilize message count; only depend on length
  const messageCount = useMemo(() => allMessages.length, [allMessages.length]);

  // Handle regenerate message
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    // Find the assistant message and get the previous user message
    const messageIndex = allMessages.findIndex(m => m.id.toString() === messageId);
    if (messageIndex === -1) return;

    // Find the user message that triggered this assistant response
    let userMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (allMessages[i].role === 'user') {
        userMessage = allMessages[i];
        break;
      }
    }

    if (!userMessage) return;

    // Remove the assistant message from local state first
    setMessages(prev => prev.filter(m => m.id.toString() !== messageId));

    try {
      // Regenerate the response using the same user content
      await streamResponse(conversationId, userMessage.content);
    } catch (error) {
      console.error('Regenerate message error:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate message",
        variant: "destructive",
      });
    }
  }, [conversationId, allMessages, toast]);

  // Helper function to check if message is temporary
  const isTemporaryMessage = useCallback((messageId: string) => {
    // Check if it's a UUID pattern (real database message) vs temporary ID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidPattern.test(messageId);
  }, []);

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("DELETE", `/api/conversations/${conversationId}/messages/${messageId}`);
    },
    onSuccess: (_, messageId) => {
      // Immediately update local state to remove the message
      setMessages(prev => prev.filter(m => m.id.toString() !== messageId));
      // Also invalidate messages query to keep cache in sync
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete message error:', error);
      toast({
        title: "Error", 
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  });

  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (isTemporaryMessage(messageId)) {
      // For temporary streaming messages, just remove from local state
      setMessages(prev => prev.filter(m => m.id.toString() !== messageId));
      toast({
        title: "Success",
        description: "Message removed successfully",
      });
    } else {
      // For real database messages, call the API to delete
      deleteMessageMutation.mutate(messageId);
    }
  }, [isTemporaryMessage, deleteMessageMutation, toast]);

  // Memoize dropdown disabled state to prevent infinite re-renders
  const isExportDisabled = useMemo(() =>
    !conversationId || messageCount === 0,
    [conversationId, messageCount]);

  // Memoize dropdown handlers to prevent re-renders
  const handleMemoryTesterToggle = useCallback(() => {
    setShowMemoryTester(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  // Update viewport height on resize for mobile browsers
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Initial update
    updateViewportHeight();

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  // Close sidebar when route changes and clear states
  useEffect(() => {
    // Check if conversation actually changed
    const conversationChanged = previousConversationIdRef.current !== conversationId;
    
    if (conversationChanged) {
      previousConversationIdRef.current = conversationId;
      hasStreamedMessagesRef.current = false; // Reset flag for new conversation
      
      setSidebarOpen(false); // Close sidebar when conversation changes
      // Clear states related to ongoing streams or searches when conversation changes
      setOptimisticMessages([]);
      setStreamingMessage("");
      setIsStreaming(false);
      setIsSearching(false);
      setAiActivity(null);
      setAiActivityMessage('');
      setSearchCitations([]);
      setSearchQuery(undefined);
      setStreamingResponse(null);
      
      // Only refetch messages when conversation actually changes
      if (conversationId) {
        refetchMessages?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only depend on conversationId, not refetchMessages

  // Persist last active conversation across navigations
  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('lastConversationId', conversationId);
      }
    } catch {
      // Ignore storage errors (e.g., private mode)
    }
  }, [conversationId]);

  return (
    <div 
      className="flex bg-background overflow-hidden"
      style={{ height: isMobile ? `${viewportHeight}px` : '100vh' }}
    >
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-card shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64 lg:flex-shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          conversations={conversations}
          currentConversationId={conversationId}
          user={user}
          onNewConversation={handleNewConversation}
          onClose={handleSidebarClose}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-background">
        {/* Header */}
        <header className="flex items-center bg-card border-b border-border px-2 py-2 shadow-sm">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden pr-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={handleSidebarToggle}
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="w-1 h-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-xs font-medium text-foreground truncate min-w-0">
              {currentConversation?.title || "WryteBot"}
            </h2>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-1 flex-none shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 ${showMemoryTester ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={handleMemoryTesterToggle}
              data-testid="button-memory-tester"
            >
              <LibraryBig className="h-4 w-4" />
            </Button>
            {!isExportDisabled && (
              <ExportMenu
                key={conversationId}
                messages={allMessages}
                conversation={currentConversation}
                disabled={false}
              />
            )}
            {/* <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-foreground">
              <Share className="h-4 w-4" />
            </Button> */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Dropdown Menu */}
          <div className="md:hidden flex-none shrink-0">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleMemoryTesterToggle}>
                  <LibraryBig className="h-4 w-4 mr-2" />
                  Memory Tester
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isExportDisabled}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Chat
                </DropdownMenuItem>
                {/* <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages or Memory Tester */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {showMemoryTester ? (
            <div className="h-full overflow-y-auto">
              <MemoryTester />
            </div>
          ) : (
            <div className="h-full pb-16 md:pb-20 overflow-y-auto relative">
              <MessageList
                messages={allMessages}
                streamingMessage={streamingMessage}
                isStreaming={isStreaming}
                isLoadingMessages={Boolean(conversationId) && (isLoadingMessages || isFetchingMessages)}
                isSearching={isSearching}
                searchQuery={searchQuery}
                searchCitations={searchCitations}
                aiActivity={aiActivity}
                aiActivityMessage={aiActivityMessage}
                user={user}
                conversationId={conversationId}
                onRegenerateMessage={handleRegenerateMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            </div>
          )}
        </div>

        {/* Message input - only show when not in memory tester mode */}
        {!showMemoryTester && (
          <div className="flex-shrink-0 bg-card border-t border-border">
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={sendMessageMutation.isPending || isStreaming}
              disabled={isStreaming}
            />
          </div>
        )}
      </div>
    </div>
  );
}