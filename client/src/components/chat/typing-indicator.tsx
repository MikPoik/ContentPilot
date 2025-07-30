export default function TypingIndicator() {
  return (
    <div className="flex space-x-1" data-testid="typing-indicator">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing"></div>
      <div 
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing" 
        style={{ animationDelay: '0.2s' }}
      ></div>
      <div 
        className="w-2 h-2 bg-gray-400 rounded-full animate-typing" 
        style={{ animationDelay: '0.4s' }}
      ></div>
    </div>
  );
}