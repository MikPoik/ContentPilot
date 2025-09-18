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
import { Trash2, User as UserIcon, Target, Share2, Database, Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { Link } from "wouter";

export default function ProfileSettings() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const hasProfileData = !!(user.contentNiche?.length || user.primaryPlatform || (user.profileData && Object.keys(user.profileData as object).length > 0));

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
              <Link href="/">
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
                          {niche}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Primary Platform */}
                {user.primaryPlatform ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Share2 className="h-4 w-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Primary Platform</label>
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
                            <AlertDialogTitle>Delete Primary Platform</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove information about your primary content platform.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteField('primaryPlatform', 'Primary Platform')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Badge variant="outline" className="text-sm" data-testid="text-primary-platform">
                      {user.primaryPlatform}
                    </Badge>
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
                    <div className="bg-gray-50 rounded-lg p-4" data-testid="profile-data-display">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(user.profileData, null, 2)}
                      </pre>
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
      </div>
    </div>
  );
}