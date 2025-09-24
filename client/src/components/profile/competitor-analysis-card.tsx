
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface CompetitorAnalysisCardProps {
  competitorAnalyses: any;
}

export default function CompetitorAnalysisCard({ competitorAnalyses }: CompetitorAnalysisCardProps) {
  return (
    <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Target className="h-5 w-5 text-orange-600" />
          <span>Competitor Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(competitorAnalyses).map(([username, analysis]: [string, any], index: number) => (
          <div key={index} className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">@{username}</Badge>
                {analysis.is_verified && <Badge variant="outline" className="text-xs">✓ Verified</Badge>}
              </div>
              <div className="text-xs text-gray-500">
                {analysis.cached_at && `Analyzed: ${new Date(analysis.cached_at).toLocaleDateString()}`}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <div className="font-bold text-orange-600">{analysis.followers?.toLocaleString() || 'N/A'}</div>
                <div className="text-xs text-gray-600">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">{analysis.engagement_rate?.toFixed(2) || 'N/A'}%</div>
                <div className="text-xs text-gray-600">Engagement</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">{Math.round(analysis.avg_likes || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Avg Likes</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600">{analysis.posts || 'N/A'}</div>
                <div className="text-xs text-gray-600">Posts</div>
              </div>
            </div>
            
            {analysis.top_hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.top_hashtags.slice(0, 6).map((tag: string, tagIndex: number) => (
                  <Badge key={tagIndex} variant="outline" className="text-xs">#{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
