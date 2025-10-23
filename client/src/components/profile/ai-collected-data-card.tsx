import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Database, Trash2, CheckCircle, Target, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import EditableArrayField from "./editable-array-field";
import EditableTextField from "./editable-text-field";
import BlogAnalysisCard from "./blog-analysis-card";
import InstagramAnalysisCard from "./instagram-analysis-card";
import CompetitorAnalysisCard from "./competitor-analysis-card";
import HashtagSearchCard from "./hashtag-search-card";
import OtherProfileDataCard from "./other-profile-data-card";

interface AiCollectedDataCardProps {
  user: User;
}

export default function AiCollectedDataCard({ user }: AiCollectedDataCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Helpers for array normalization and updates
  const normalizeLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const uniqueMerge = (arr: string[]) => {
    const map = new Map<string, string>();
    arr.forEach((v) => {
      if (v && typeof v === 'string') {
        const key = v.trim().toLowerCase();
        if (key) map.set(key, normalizeLabel(v));
      }
    });
    return Array.from(map.values());
  };

  // Content Niche handlers
  const addContentNiche = () => {
    const value = window.prompt('Add a content niche label');
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = (user.contentNiche || []) as string[];
    const next = uniqueMerge([...current, label]);
    updateProfileMutation.mutate({ contentNiche: next, replaceArrays: true } as any);
  };

  const removeContentNiche = (index: number) => {
    const current = (user.contentNiche || []) as string[];
    const next = current.filter((_: string, i: number) => i !== index);
    updateProfileMutation.mutate({ contentNiche: next, replaceArrays: true } as any);
  };

  const deleteAllContentNiche = () => {
    updateProfileMutation.mutate({ contentNiche: [], replaceArrays: true } as any);
  };

  // Primary Platforms handlers
  const addPrimaryPlatform = () => {
    const value = window.prompt('Add a primary platform (e.g., Instagram, TikTok)');
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = ((user as any).primaryPlatforms && Array.isArray((user as any).primaryPlatforms)
      ? (user as any).primaryPlatforms
      : (user.primaryPlatform ? [user.primaryPlatform] : [])) as string[];
    const next = uniqueMerge([...current, label]);
    updateProfileMutation.mutate({ primaryPlatforms: next, primaryPlatform: next[0] ?? null, replaceArrays: true } as any);
  };

  const removePrimaryPlatform = (index: number) => {
    const current = ((user as any).primaryPlatforms && Array.isArray((user as any).primaryPlatforms)
      ? (user as any).primaryPlatforms
      : (user.primaryPlatform ? [user.primaryPlatform] : [])) as string[];
    const next = current.filter((_: string, i: number) => i !== index);
    updateProfileMutation.mutate({ primaryPlatforms: next, primaryPlatform: next[0] ?? null, replaceArrays: true } as any);
  };

  const deleteAllPrimaryPlatforms = () => {
    updateProfileMutation.mutate({ primaryPlatform: null, primaryPlatforms: [], replaceArrays: true } as any);
  };

  const handleClearAllProfile = () => {
    const updateData = {
      contentNiche: [],
      primaryPlatform: null,
      primaryPlatforms: [],
      profileData: null,
      profileCompleteness: "0",
      replaceArrays: true,
    };
    updateProfileMutation.mutate(updateData);
  };

  const hasProfileData = !!(user.contentNiche?.length || (user as any).primaryPlatforms?.length || user.primaryPlatform || (user.profileData && Object.keys(user.profileData as object).length > 0));

  const profileData = user.profileData as any || {};

  const removeContentGoal = (index: number) => {
    const current = contentGoals; // Use the already normalized array
    const next = current.filter((_: string, i: number) => i !== index);
    const newProfileData = { ...profileData, contentGoals: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const deleteAllContentGoals = () => {
    const newProfileData = { ...profileData, contentGoals: [] };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const removeTargetAudience = (index: number) => {
    const current = targetAudience; // Use the already normalized array
    const next = current.filter((_: string, i: number) => i !== index);
    const newProfileData = { ...profileData, targetAudience: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const deleteAllTargetAudience = () => {
    const newProfileData = { ...profileData, targetAudience: [] };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  // Handle both string and array cases for contentGoals
  const contentGoals = (() => {
    if (Array.isArray(profileData?.contentGoals)) return profileData.contentGoals;
    if (typeof profileData?.contentGoals === 'string' && profileData.contentGoals) return [profileData.contentGoals];
    return [];
  })();

  // Handle both string and array cases for targetAudience
  const targetAudience = (() => {
    if (Array.isArray(profileData?.targetAudience)) return profileData.targetAudience;
    if (typeof profileData?.targetAudience === 'string' && profileData.targetAudience) return [profileData.targetAudience];
    return [];
  })();

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span>AI-Collected Profile Data</span>
        </CardTitle>
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
            {user.contentNiche && user.contentNiche.length > 0 && (
              <EditableArrayField
                title="Content Focus Areas"
                icon={<Target className="h-4 w-4 text-gray-600" />}
                items={user.contentNiche}
                onAdd={addContentNiche}
                onRemove={removeContentNiche}
                onDeleteAll={deleteAllContentNiche}
                isUpdating={updateProfileMutation.isPending}
                testId="content-niche"
              />
            )}

            {/* Primary Platform(s) */}
            {((user as any).primaryPlatforms?.length || user.primaryPlatform) && (
              <EditableArrayField
                title="Primary Platform(s)"
                icon={<Share2 className="h-4 w-4 text-gray-600" />}
                items={((user as any).primaryPlatforms?.length
                  ? (user as any).primaryPlatforms
                  : (user.primaryPlatform ? [user.primaryPlatform] : [])
                )}
                onAdd={addPrimaryPlatform}
                onRemove={removePrimaryPlatform}
                onDeleteAll={deleteAllPrimaryPlatforms}
                isUpdating={updateProfileMutation.isPending}
                testId="primary-platform"
              />
            )}

            {/* Content Goals */}
            {contentGoals.length > 0 && (
              <EditableArrayField
                title="Content Goals"
                icon={<Target className="h-4 w-4 text-gray-600" />}
                items={contentGoals}
                onAdd={() => {}} // Add functionality for content goals if needed
                onRemove={removeContentGoal}
                onDeleteAll={deleteAllContentGoals}
                isUpdating={updateProfileMutation.isPending}
                testId="content-goals"
              />
            )}

            {/* Target Audience */}
            {targetAudience.length > 0 && (
              <EditableArrayField
                title="Target Audience"
                icon={<Share2 className="h-4 w-4 text-gray-600" />}
                items={targetAudience}
                onAdd={() => {}} // Add functionality for target audience if needed
                onRemove={removeTargetAudience}
                onDeleteAll={deleteAllTargetAudience}
                isUpdating={updateProfileMutation.isPending}
                testId="target-audience"
              />
            )}

            {/* Additional Profile Data */}
            {user.profileData && typeof user.profileData === 'object' && user.profileData !== null && Object.keys(user.profileData).length > 0 && (
              <>
                {/* Blog Profile Analysis */}
                {profileData.blogProfile && (
                  <BlogAnalysisCard blogProfile={profileData.blogProfile} />
                )}

                {/* Instagram Profile Analysis */}
                {profileData.instagramProfile && (
                  <InstagramAnalysisCard instagramProfile={profileData.instagramProfile} />
                )}

                {/* Competitor Analyses */}
                {profileData.competitorAnalyses && Object.keys(profileData.competitorAnalyses).length > 0 && (
                  <CompetitorAnalysisCard competitorAnalyses={profileData.competitorAnalyses} />
                )}

                {/* Hashtag Searches */}
                {profileData.hashtagSearches && Object.keys(profileData.hashtagSearches).length > 0 && (
                  <HashtagSearchCard hashtagSearches={profileData.hashtagSearches} />
                )}

                {/* Other Profile Data */}
                <OtherProfileDataCard
                  user={user}
                  updateProfileMutation={updateProfileMutation}
                />
              </>
            )}
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
      </CardContent>
    </Card>
  );
}