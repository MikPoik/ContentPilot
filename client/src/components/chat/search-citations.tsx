import { ExternalLink, Globe, AlertCircle } from "lucide-react";

interface SearchCitationsProps {
  citations: string[];
  searchQuery?: string;
  searchPerformed?: boolean;
}

export default function SearchCitations({ citations, searchQuery, searchPerformed }: SearchCitationsProps) {
  // Show feedback if search was performed even with 0 citations
  if (searchPerformed && (!citations || citations.length === 0)) {
    return (
      <div 
        className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800"
        data-testid="search-no-results"
      >
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Web search performed
            </p>
            {searchQuery && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Searched for: "{searchQuery}"
              </p>
            )}
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              No additional sources found, but I've provided an answer based on my knowledge.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!citations || citations.length === 0) return null;

  return (
    <div 
      className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
      data-testid="search-citations"
    >
      <div className="flex items-center space-x-2 mb-2">
        <Globe className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Sources from web search
        </span>
        {searchQuery && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            ({citations.length} source{citations.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>
      <div className="space-y-1">
        {citations.map((citation, index) => {
          // Extract domain from URL for cleaner display
          const domain = citation.replace(/^https?:\/\//, '').split('/')[0];
          
          return (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <ExternalLink className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <a 
                href={citation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:underline truncate"
                data-testid={`citation-link-${index}`}
              >
                {domain}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}