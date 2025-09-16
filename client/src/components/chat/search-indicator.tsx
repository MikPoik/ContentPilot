import { Search, Globe } from "lucide-react";

interface SearchIndicatorProps {
  isSearching: boolean;
  searchQuery?: string;
}

export default function SearchIndicator({ isSearching, searchQuery }: SearchIndicatorProps) {
  if (!isSearching) return null;

  return (
    <div 
      className="flex items-center space-x-2 text-emerald-600 text-sm mb-2 animate-fade-in"
      data-testid="search-indicator"
    >
      <div className="flex items-center space-x-1">
        <Search className="h-4 w-4 animate-pulse" />
        <Globe className="h-3 w-3 animate-spin" />
      </div>
      <span className="text-gray-700">
        Searching the web{searchQuery ? ` for "${searchQuery.substring(0, 50)}${searchQuery.length > 50 ? '...' : ''}"` : '...'}
      </span>
    </div>
  );
}