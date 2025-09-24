
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InstagramAnalysisCardProps {
  instagramProfile: any;
}

export default function InstagramAnalysisCard({ instagramProfile }: InstagramAnalysisCardProps) {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span>Instagram Profile Analysis</span>
          <Badge variant="secondary" className="text-xs">@{instagramProfile.username}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{instagramProfile.followers?.toLocaleString() || 'N/A'}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{instagramProfile.engagement_rate?.toFixed(2) || 'N/A'}%</div>
            <div className="text-sm text-gray-600">Engagement Rate</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{instagramProfile.posts || 'N/A'}</div>
            <div className="text-sm text-gray-600">Posts</div>
          </div>
        </div>
        
        {instagramProfile.top_hashtags?.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Top Hashtags</label>
            <div className="flex flex-wrap gap-2">
              {instagramProfile.top_hashtags.slice(0, 8).map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {instagramProfile.biography && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Biography</label>
            <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">{instagramProfile.biography}</p>
          </div>
        )}
        
        {instagramProfile.similar_accounts?.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Similar Accounts</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {instagramProfile.similar_accounts.slice(0, 6).map((account: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded-lg border text-sm">
                  <div className="font-medium">@{account.username}</div>
                  <div className="text-gray-600">{account.followers?.toLocaleString() || 'N/A'} followers</div>
                  {account.engagement_rate && (
                    <div className="text-gray-500 text-xs">{account.engagement_rate.toFixed(2)}% engagement</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {instagramProfile.cached_at && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Last analyzed: {new Date(instagramProfile.cached_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
