import { Button } from "@/components/ui/button";
import { Plus, X, Settings, MoreHorizontal } from "lucide-react";
import { type Conversation, type User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

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

  const formatTimeAgo = (date: Date | string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">✨</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">ContentCraft AI</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
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
          <div className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Recent Conversations
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No conversations yet</div>
              <div className="text-xs mt-1">Start chatting to see your history</div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button 
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className={`block rounded-lg p-3 cursor-pointer transition-colors group ${
                  conversation.id === currentConversationId
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${
                      conversation.id === currentConversationId
                        ? 'text-emerald-900'
                        : 'text-gray-900'
                    }`}>
                      {conversation.title}
                    </h3>
                    <p className={`text-xs mt-1 ${
                      conversation.id === currentConversationId
                        ? 'text-emerald-600'
                        : 'text-gray-500'
                    }`}>
                      {formatTimeAgo(conversation.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 ${
                      conversation.id === currentConversationId
                        ? 'text-emerald-400 hover:text-emerald-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 p-4">
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
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || "User"}
            </p>
            <p className="text-xs text-gray-500">
              Content Creator
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-1">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}