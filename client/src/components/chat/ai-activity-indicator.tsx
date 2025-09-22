
import { Search, Globe, Brain, Eye, BarChart3, PenTool, Lightbulb } from "lucide-react";

interface AIActivityIndicatorProps {
  activity: 'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | 'instagram_analyzing' | null;
  message?: string;
  searchQuery?: string;
}

export default function AIActivityIndicator({ activity, message, searchQuery }: AIActivityIndicatorProps) {
  if (!activity) return null;

  const getActivityConfig = () => {
    switch (activity) {
      case 'thinking':
        return {
          icon: Brain,
          color: 'text-blue-600',
          text: message || '',
          animation: 'animate-pulse'
        };
      case 'reasoning':
        return {
          icon: Lightbulb,
          color: 'text-purple-600',
          text: message || '',
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
          text: message || '',
          animation: 'animate-pulse'
        };
      case 'analyzing':
        return {
          icon: BarChart3,
          color: 'text-orange-600',
          text: message || '',
          animation: 'animate-pulse'
        };
      case 'generating':
        return {
          icon: PenTool,
          color: 'text-green-600',
          text: message || '',
          animation: 'animate-pulse'
        };
      case 'instagram_analyzing':
        return {
          icon: Search,
          color: 'text-pink-600',
          text: message || 'Analyzing Instagram profile...',
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
        {activity === 'searching' && <Globe className="h-3 w-3 animate-spin text-emerald-600" />}
        {activity === 'instagram_analyzing' && <Brain className="h-3 w-3 animate-spin text-pink-600" />}
      </div>
      <span className="text-gray-700">
        {config.text}
      </span>
    </div>
  );
}
