import { Button } from "@/components/ui/button";
import { Plus, X, Trash2, Settings } from "lucide-react";
import { type Conversation, type User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle"; // Import ThemeToggle

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  user?: User;
  onNewConversation: () => void;
  onClose: () => void;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  user,
  onNewConversation,
  onClose
}: SidebarProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formatTimeAgo = (date: Date | string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setLocation(`/chat/${conversationId}`);
    onClose(); // Close sidebar on mobile after selection
  };

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: (_, deletedConversationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      // If we deleted the current conversation, navigate to home
      if (deletedConversationId === currentConversationId) {
        setLocation("/");
      }

      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(conversationId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">✨</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">ContentCraft AI</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2"
          onClick={onClose}
          data-testid="button-close-sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={onNewConversation}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4" />
          <span>New Conversation</span>
        </Button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-sm">No conversations yet</div>
              <div className="text-xs mt-1">Start chatting to see your history</div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={`block rounded-lg p-3 cursor-pointer transition-colors group ${
                  conversation.id === currentConversationId
                    ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${
                      conversation.id === currentConversationId
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-foreground'
                    }`}>
                      {conversation.title}
                    </h3>
                    <p className={`text-xs mt-1 ${
                      conversation.id === currentConversationId
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-muted-foreground'
                    }`}>
                      {formatTimeAgo(conversation.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    disabled={deleteConversationMutation.isPending}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 disabled:opacity-50 ${
                      conversation.id === currentConversationId
                        ? 'text-red-500 hover:text-red-700'
                        : 'text-red-400 hover:text-red-600'
                    }`}
                    data-testid={`button-delete-conversation-${conversation.id}`}
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground">
              Content Creator
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            asChild
            data-testid="button-profile-settings"
          >
            <Link href={`/profile-settings?from=${encodeURIComponent(window.location.pathname)}`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}