
import { Instagram, Search } from "lucide-react";

interface InstagramIndicatorProps {
  isAnalyzing: boolean;
  username?: string;
}

export default function InstagramIndicator({ isAnalyzing, username }: InstagramIndicatorProps) {
  if (!isAnalyzing) return null;

  return (
    <div 
      className="flex items-center space-x-2 text-purple-600 text-sm mb-2 animate-fade-in"
      data-testid="instagram-indicator"
    >
      <div className="flex items-center space-x-1">
        <Instagram className="h-4 w-4 animate-pulse" />
        <Search className="h-3 w-3 animate-spin" />
      </div>
      <span className="text-gray-700">
        Analyzing Instagram{username ? ` profile @${username.substring(0, 20)}${username.length > 20 ? '...' : ''}` : ' profile...'}
      </span>
    </div>
  );
}
