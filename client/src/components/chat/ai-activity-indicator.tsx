import { Search, Globe, Brain, Eye, BarChart3, PenTool, Lightbulb, Instagram, Hash, User, FileText, Database, Archive } from "lucide-react";

interface AIActivityIndicatorProps {
  activity: 'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | 'instagram_analyzing' | 'blog_analyzing' | 'hashtag_searching' | 'profile_extracting' | 'extracting_memories' | 'saving_memories' | null;
  message?: string;
  searchQuery?: string;
  details?: string;
}

export default function AIActivityIndicator({ activity, message, searchQuery, details }: AIActivityIndicatorProps) {
  if (!activity) return null;

  const getActivityConfig = () => {
    switch (activity) {
      case 'thinking':
        return {
          icon: Brain,
          color: 'text-blue-600',
          text: message || 'Thinking...',
          animation: 'animate-pulse'
        };
      case 'reasoning':
        return {
          icon: Lightbulb,
          color: 'text-purple-600',
          text: message || 'Reasoning...',
          animation: 'animate-pulse'
        };
      case 'searching':
        return {
          icon: Search,
          color: 'text-emerald-600',
          text: searchQuery ? `Searching for "${searchQuery.substring(0, 30)}${searchQuery.length > 30 ? '...' : ''}"` : 'Searching the web...',
          animation: 'animate-pulse'
        };
      case 'recalling':
        return {
          icon: Eye,
          color: 'text-indigo-600',
          text: message || 'Recalling memories...',
          animation: 'animate-pulse'
        };
      case 'analyzing':
        return {
          icon: BarChart3,
          color: 'text-orange-600',
          text: message || 'Analyzing...',
          animation: 'animate-pulse'
        };
      case 'generating':
        return {
          icon: PenTool,
          color: 'text-green-600',
          text: message || 'Writing response...',
          animation: 'animate-pulse'
        };
      case 'instagram_analyzing':
        return {
          icon: Instagram,
          color: 'text-pink-600',
          text: message || 'Analyzing Instagram profile...',
          animation: 'animate-pulse'
        };
      case 'blog_analyzing':
        return {
          icon: FileText,
          color: 'text-blue-600',
          text: message || 'Analyzing blog content...',
          animation: 'animate-pulse'
        };
      case 'hashtag_searching':
        return {
          icon: Hash,
          color: 'text-purple-600',
          text: message?.startsWith('#')
            ? `Searching ${message} for content ideas...`
            : message || 'Searching hashtag for content ideas...',
          animation: 'animate-pulse'
        };
      case 'profile_extracting':
        return {
          icon: User,
          color: 'text-teal-600',
          text: message || 'Updating your profile...',
          animation: 'animate-pulse'
        };
      case 'extracting_memories':
        return {
          icon: Brain,
          color: 'text-purple-600',
          text: message || 'Extracting insights from conversation...',
          animation: 'animate-pulse'
        };
      case 'saving_memories':
        return {
          icon: Database,
          color: 'text-green-600',
          text: message || 'Saving memories for future reference...',
          animation: 'animate-pulse'
        };
      default:
        return {
          icon: Brain,
          color: 'text-gray-600',
          text: '',
          animation: 'animate-pulse'
        };
    }
  };

  const config = getActivityConfig();
  const IconComponent = config.icon;

  return (
    <div
      className="flex items-center space-x-2 text-sm mb-2 animate-fade-in"
      data-testid="ai-activity-indicator"
    >
      <div className="flex items-center space-x-1">
        <IconComponent className={`h-4 w-4 ${config.color} ${config.animation}`} />
      </div>
      <span className="text-gray-700">
        {config.text}
      </span>
    </div>
  );
}