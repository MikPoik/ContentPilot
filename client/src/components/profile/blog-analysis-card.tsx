
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlogAnalysisCardProps {
  blogProfile: any;
}

export default function BlogAnalysisCard({ blogProfile }: BlogAnalysisCardProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span>Blog Content Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="text-center p-2 bg-white rounded-lg border">
            <Badge variant="secondary" className="text-xs">Writing Style</Badge>
            <div className="text-xs font-normal text-blue-600">{blogProfile.writingStyle || 'N/A'}</div>
          </div>
          <div className="text-center p-2 bg-white rounded-lg border">
            <Badge variant="secondary" className="text-xs">Avg Post Length</Badge>
            <div className="text-xs font-normal text-blue-600">{blogProfile.averagePostLength || 'N/A'}</div>
            <br/>
            <Badge variant="secondary" className="text-xs">Analyzed Posts</Badge>

            <div className="text-xs font-normal text-blue-600">{blogProfile.analyzedUrls?.length || 0}</div>
          </div>

        </div>
        
        {blogProfile.brandVoice && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Brand Voice</label>
            <p className="text-xs font-normal text-gray-600 bg-white p-2 rounded-lg border">{blogProfile.brandVoice}</p>
          </div>
        )}
        
        {blogProfile.toneKeywords?.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Tone Keywords</label>
            <div className="flex flex-wrap gap-1">
              {blogProfile.toneKeywords.slice(0, 8).map((keyword: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {blogProfile.contentThemes?.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Content Themes</label>
            <div className="flex flex-wrap gap-1">
              {blogProfile.contentThemes.map((theme: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">{theme}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {blogProfile.commonTopics?.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Common Topics</label>
            <div className="flex flex-wrap gap-1">
              {blogProfile.commonTopics.map((topic: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs bg-blue-50">{topic}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {blogProfile.targetAudience && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Target Audience</label>
            <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border">{blogProfile.targetAudience}</p>
          </div>
        )}

        {blogProfile.postingPattern && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Content Pattern</label>
            <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border">{blogProfile.postingPattern}</p>
          </div>
        )}
        
        {blogProfile.cached_at && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Last analyzed: {new Date(blogProfile.cached_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
