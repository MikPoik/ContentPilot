import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, User as UserIcon, Target, Share2, Database, Shield, ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubscriptionManagement from "@/components/subscription-management";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Link, useLocation } from "wouter";

export default function ProfileSettings() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get the 'from' parameter to know where to go back
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const fromPath = urlParams.get('from') || '/';

  // Refetch user data when the page mounts to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  // Mutation for updating profile data
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      const response = await apiRequest("PATCH", "/api/auth/user/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleDeleteField = (fieldName: keyof User, displayName: string) => {
    const updateData = {
      [fieldName]: fieldName === 'contentNiche' ? [] : fieldName === 'profileCompleteness' ? "0" : null
    };
    updateProfileMutation.mutate(updateData);
  };

  const handleClearAllProfile = () => {
    const updateData = {
      contentNiche: [],
      primaryPlatform: null,
      primaryPlatforms: [],
      profileData: null,
      profileCompleteness: "0",
    };
    updateProfileMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-4">You must be logged in to view profile settings.</p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProfileData = !!(user.contentNiche?.length || (user as any).primaryPlatforms?.length || user.primaryPlatform || (user.profileData && Object.keys(user.profileData as object).length > 0));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-back-to-chat"
            >
              <Link href={fromPath}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
                Profile Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your AI-collected profile information
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            ContentCraft AI learns about your content creation preferences through conversations to provide personalized assistance. 
            You can review and delete any collected information at any time.
          </AlertDescription>
        </Alert>

        {/* Tabbed Interface */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Subscription</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
        {/* Basic Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5" />
              <span>Basic Information</span>
            </CardTitle>
            <CardDescription>
              Your account information from Replit authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900" data-testid="text-user-email">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900" data-testid="text-user-name">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI-Collected Profile Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>AI-Collected Profile Data</span>
              </div>
              {hasProfileData ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-clear-all-profile"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Profile Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all AI-collected profile information. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleClearAllProfile()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </CardTitle>
            <CardDescription>
              Information learned from your conversations to personalize assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasProfileData ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Collected Yet</h3>
                <p className="text-gray-600">
                  Start chatting with ContentCraft AI to receive personalized content creation assistance.
                  The AI will learn your preferences over time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Content Niches */}
                {user.contentNiche && user.contentNiche.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Content Focus Areas</label>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-delete-content-niche"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Content Focus Areas</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all learned information about your content focus areas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteField('contentNiche', 'Content Focus Areas')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex flex-wrap gap-2" data-testid="content-niche-list">
                      {user.contentNiche.map((niche: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {String(niche)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Primary Platform(s) */}
                {(user as any).primaryPlatforms?.length || user.primaryPlatform ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Share2 className="h-4 w-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Primary Platform(s)</label>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-delete-primary-platform"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Primary Platform(s)</AlertDialogTitle>
                          <AlertDialogDescription>
                              This will remove information about your primary content platform(s).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => updateProfileMutation.mutate({ primaryPlatform: null, primaryPlatforms: [] } as any)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {((user as any).primaryPlatforms?.length
                        ? (user as any).primaryPlatforms
                        : (user.primaryPlatform ? [user.primaryPlatform] : [])
                      ).map((p: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-sm" data-testid="text-primary-platform">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Additional Profile Data */}
                {user.profileData && typeof user.profileData === 'object' && user.profileData !== null && Object.keys(user.profileData).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Additional Profile Information</label>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-delete-profile-data"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Additional Profile Information</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove all additional learned information about your preferences and background.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteField('profileData', 'Additional Profile Information')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="space-y-4" data-testid="profile-data-display">
                      {(() => {
                        const profileData = user.profileData as any;
                        
                        return (
                          <>
                            {/* Blog Profile Analysis */}
                            {profileData.blogProfile && (
                              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-base">
                                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                    </svg>
                                    <span>Blog Content Analysis</span>
                                    <Badge variant="secondary" className="text-xs">Writing Style</Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="text-center p-2 bg-white rounded-lg border">
                                      <div className="text-base font-semibold text-blue-600">{profileData.blogProfile.writingStyle || 'N/A'}</div>
                                      <div className="text-xs text-gray-600">Writing Style</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded-lg border">
                                      <div className="text-base font-semibold text-blue-600">{profileData.blogProfile.averagePostLength || 'N/A'}</div>
                                      <div className="text-xs text-gray-600">Post Length</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded-lg border">
                                      <div className="text-base font-semibold text-blue-600">{profileData.blogProfile.analyzedUrls?.length || 0}</div>
                                      <div className="text-xs text-gray-600">Analyzed Posts</div>
                                    </div>
                                  </div>
                                  
                                  {profileData.blogProfile.brandVoice && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Brand Voice</label>
                                      <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border">{profileData.blogProfile.brandVoice}</p>
                                    </div>
                                  )}
                                  
                                  {profileData.blogProfile.toneKeywords?.length > 0 && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Tone Keywords</label>
                                      <div className="flex flex-wrap gap-1">
                                        {profileData.blogProfile.toneKeywords.slice(0, 8).map((keyword: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {profileData.blogProfile.contentThemes?.length > 0 && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Content Themes</label>
                                      <div className="flex flex-wrap gap-1">
                                        {profileData.blogProfile.contentThemes.map((theme: string, index: number) => (
                                          <Badge key={index} variant="secondary" className="text-xs">{theme}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {profileData.blogProfile.commonTopics?.length > 0 && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Common Topics</label>
                                      <div className="flex flex-wrap gap-1">
                                        {profileData.blogProfile.commonTopics.map((topic: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs bg-blue-50">{topic}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {profileData.blogProfile.targetAudience && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Target Audience</label>
                                      <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border">{profileData.blogProfile.targetAudience}</p>
                                    </div>
                                  )}

                                  {profileData.blogProfile.postingPattern && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-700 mb-1 block">Content Pattern</label>
                                      <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border">{profileData.blogProfile.postingPattern}</p>
                                    </div>
                                  )}
                                  
                                  {profileData.blogProfile.cached_at && (
                                    <div className="text-xs text-gray-500 border-t pt-2">
                                      Last analyzed: {new Date(profileData.blogProfile.cached_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}

                            {/* Instagram Profile Analysis */}
                            {profileData.instagramProfile && (
                              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-lg">
                                    <svg className="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                    <span>Instagram Profile Analysis</span>
                                    <Badge variant="secondary" className="text-xs">@{profileData.instagramProfile.username}</Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-2xl font-bold text-purple-600">{profileData.instagramProfile.followers?.toLocaleString() || 'N/A'}</div>
                                      <div className="text-sm text-gray-600">Followers</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-2xl font-bold text-purple-600">{profileData.instagramProfile.engagement_rate?.toFixed(2) || 'N/A'}%</div>
                                      <div className="text-sm text-gray-600">Engagement Rate</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-2xl font-bold text-purple-600">{profileData.instagramProfile.posts || 'N/A'}</div>
                                      <div className="text-sm text-gray-600">Posts</div>
                                    </div>
                                  </div>
                                  
                                  {profileData.instagramProfile.top_hashtags?.length > 0 && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">Top Hashtags</label>
                                      <div className="flex flex-wrap gap-2">
                                        {profileData.instagramProfile.top_hashtags.slice(0, 8).map((tag: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs">#{tag}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {profileData.instagramProfile.biography && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-1 block">Biography</label>
                                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">{profileData.instagramProfile.biography}</p>
                                    </div>
                                  )}
                                  
                                  {profileData.instagramProfile.similar_accounts?.length > 0 && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-700 mb-2 block">Similar Accounts</label>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {profileData.instagramProfile.similar_accounts.slice(0, 6).map((account: any, index: number) => (
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
                                  
                                  {profileData.instagramProfile.cached_at && (
                                    <div className="text-xs text-gray-500 border-t pt-2">
                                      Last analyzed: {new Date(profileData.instagramProfile.cached_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}

                            {/* Competitor Analyses */}
                            {profileData.competitorAnalyses && Object.keys(profileData.competitorAnalyses).length > 0 && (
                              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center space-x-2 text-lg">
                                    <Target className="h-5 w-5 text-orange-600" />
                                    <span>Competitor Analysis</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {Object.entries(profileData.competitorAnalyses).map(([username, analysis]: [string, any], index: number) => (
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
                            )}

                            {/* Other Profile Data */}
                            {(() => {
                              const otherData = { ...profileData };
                              delete otherData.instagramProfile;
                              delete otherData.competitorAnalyses;
                              delete otherData.blogProfile;
                              
                              if (Object.keys(otherData).length === 0) return null;
                              
                              return (
                                <Card className="bg-gray-50">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center space-x-2 text-lg">
                                      <Database className="h-5 w-5 text-gray-600" />
                                      <span>Other Profile Information</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {Object.entries(otherData).map(([key, value]) => {
                                        if (value === null || value === undefined) return null;
                                        
                                        return (
                                          <div key={key} className="bg-white p-3 rounded-lg border">
                                            <label className="text-sm font-medium text-gray-700 capitalize mb-1 block">
                                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            </label>
                                            {Array.isArray(value) ? (
                                              <div className="flex flex-wrap gap-1">
                                                {value.map((item: any, index: number) => (
                                                  <Badge key={index} variant="secondary" className="text-xs">
                                                    {typeof item === 'string' ? item : JSON.stringify(item)}
                                                  </Badge>
                                                ))}
                                              </div>
                                            ) : typeof value === 'object' ? (
                                              <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                                {JSON.stringify(value, null, 2)}
                                              </pre>
                                            ) : (
                                              <p className="text-sm text-gray-600">{String(value)}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Profile Completeness */}
                {user.profileCompleteness && user.profileCompleteness !== "0" && (
                  <div>
                    <Separator />
                    <div className="pt-4">
                      <label className="text-sm font-medium text-gray-700">Profile Completeness</label>
                      <div className="mt-2 flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${user.profileCompleteness}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600" data-testid="text-profile-completeness">
                          {user.profileCompleteness}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>How Your Data Is Used</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Data Collection</h4>
                <p className="text-sm text-gray-600">
                  We collect information from your conversations to understand your content creation needs and preferences.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Personalization</h4>
                <p className="text-sm text-gray-600">
                  This data helps provide more relevant content suggestions and tailored assistance for your specific niche.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Your Control</h4>
                <p className="text-sm text-gray-600">
                  You can delete any or all collected information at any time using the controls on this page.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Privacy</h4>
                <p className="text-sm text-gray-600">
                  Your data is stored securely and is only used to improve your ContentCraft AI experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
