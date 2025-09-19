
interface AIActivityIndicatorProps {
  activity: 'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | null;
  message?: string;
  searchQuery?: string;
}

export default function AIActivityIndicator({ activity, message, searchQuery }: AIActivityIndicatorProps) {
  if (!activity) return null;

  const getActivityConfig = () => {
    switch (activity) {
      case 'thinking':
        return {
          icon: '🤔',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          text: message || 'AI is thinking...',
          animation: 'animate-pulse'
        };
      case 'reasoning':
        return {
          icon: '🧠',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          text: message || 'AI is reasoning through your request...',
          animation: 'animate-pulse'
        };
      case 'searching':
        return {
          icon: '🔍',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          text: searchQuery ? `Searching the web for "${searchQuery.substring(0, 50)}${searchQuery.length > 50 ? '...' : ''}"` : 'Searching the web...',
          animation: 'animate-bounce'
        };
      case 'recalling':
        return {
          icon: '💭',
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          text: message || 'Recalling relevant memories...',
          animation: 'animate-pulse'
        };
      case 'analyzing':
        return {
          icon: '📊',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          text: message || 'Analyzing your workflow and context...',
          animation: 'animate-pulse'
        };
      case 'generating':
        return {
          icon: '✍️',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          text: message || 'Generating response...',
          animation: 'animate-pulse'
        };
      default:
        return {
          icon: '🤖',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          text: 'AI is working...',
          animation: 'animate-pulse'
        };
    }
  };

  const config = getActivityConfig();

  return (
    <div 
      className={`flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg ${config.bgColor} animate-fade-in`}
      data-testid="ai-activity-indicator"
    >
      <div className={`flex items-center space-x-2 ${config.color}`}>
        <span className={`text-lg ${config.animation}`}>{config.icon}</span>
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}
