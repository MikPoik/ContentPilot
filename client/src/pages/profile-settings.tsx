import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Trash2,
  User as UserIcon,
  Target,
  Share2,
  Database,
  Shield,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Plus,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubscriptionManagement from "@/components/subscription-management";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Conversation } from "@shared/schema";
import { Link, useLocation } from "wouter";
import BasicProfileCard from "@/components/profile/basic-profile-card";
import AiCollectedDataCard from "@/components/profile/ai-collected-data-card";
import DataUsageInfoCard from "@/components/profile/data-usage-info-card";

export default function ProfileSettings() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local state for input fields to prevent constant updates
  const [localBusinessType, setLocalBusinessType] = useState("");
  const [localBusinessLocation, setLocalBusinessLocation] = useState("");

  // Get the 'from' parameter to know where to go back
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const fromPath = urlParams.get("from") || "/";

  // Fetch conversations to validate the 'from' path
  const {
    data: conversations = [],
    isLoading: convLoading,
    isFetching: convFetching,
  } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Validate that the fromPath conversation exists, otherwise default to home
  const backHref = (() => {
    // While conversations are loading, trust the provided fromPath to avoid premature fallback
    if (convLoading || convFetching) {
      return fromPath;
    }

    // Validate provided fromPath points to an existing conversation
    const m = fromPath.match(/\/chat\/([^/?]+)/);
    if (m && m[1]) {
      const exists = conversations.some((c) => c.id === m[1]);
      if (exists) return fromPath;
    }

    // If fromPath wasn't a chat path or the chat no longer exists, try localStorage last conversation
    try {
      const lastId = localStorage.getItem("lastConversationId");
      if (lastId && conversations.some((c) => c.id === lastId)) {
        return `/chat/${lastId}`;
      }
    } catch {
      // ignore storage errors
    }

    // Fallback to home
    return "/";
  })();

  // Initialize local state when user data loads
  useEffect(() => {
    if (user?.profileData) {
      const profileData = user.profileData as any;
      setLocalBusinessType(profileData.businessType || "");
      setLocalBusinessLocation(profileData.businessLocation || "");
    }
  }, [user?.profileData]);

  // Refresh user data when page mounts
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, []); // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Mutation for updating profile data
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      const response = await apiRequest(
        "PATCH",
        "/api/auth/user/profile",
        profileData,
      );
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

  // Ref for cleanup (no longer used for debouncing)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const handleDeleteField = (fieldName: keyof User, displayName: string) => {
    const updateData = {
      [fieldName]:
        fieldName === "contentNiche"
          ? []
          : fieldName === "profileCompleteness"
            ? "0"
            : null,
      // Ensure arrays get replaced (cleared) on server
      ...(fieldName === "contentNiche" ? { replaceArrays: true } : {}),
    };
    updateProfileMutation.mutate(updateData as any);
  };

  // Helpers for array normalization and updates
  const normalizeLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const uniqueMerge = (arr: string[]) => {
    const map = new Map<string, string>();
    arr.forEach((v) => {
      if (v && typeof v === "string") {
        const key = v.trim().toLowerCase();
        if (key) map.set(key, normalizeLabel(v));
      }
    });
    return Array.from(map.values());
  };

  // Content Niche add/remove
  const addContentNiche = () => {
    const value = window.prompt("Add a content niche label");
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = (user!.contentNiche || []) as string[];
    const next = uniqueMerge([...current, label]);
    updateProfileMutation.mutate({
      contentNiche: next,
      replaceArrays: true,
    } as any);
  };

  const removeContentNiche = (index: number) => {
    const current = (user!.contentNiche || []) as string[];
    const next = current.filter((_: string, i: number) => i !== index);
    updateProfileMutation.mutate({
      contentNiche: next,
      replaceArrays: true,
    } as any);
  };

  // Primary Platforms add/remove
  const addPrimaryPlatform = () => {
    const value = window.prompt(
      "Add a primary platform (e.g., Instagram, TikTok)",
    );
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = (
      (user as any).primaryPlatforms &&
      Array.isArray((user as any).primaryPlatforms)
        ? (user as any).primaryPlatforms
        : user!.primaryPlatform
          ? [user!.primaryPlatform]
          : []
    ) as string[];
    const next = uniqueMerge([...current, label]);
    updateProfileMutation.mutate({
      primaryPlatforms: next,
      primaryPlatform: next[0] ?? null,
      replaceArrays: true,
    } as any);
  };

  const removePrimaryPlatform = (index: number) => {
    const current = (
      (user as any).primaryPlatforms &&
      Array.isArray((user as any).primaryPlatforms)
        ? (user as any).primaryPlatforms
        : user!.primaryPlatform
          ? [user!.primaryPlatform]
          : []
    ) as string[];
    const next = current.filter((_: string, i: number) => i !== index);
    updateProfileMutation.mutate({
      primaryPlatforms: next,
      primaryPlatform: next[0] ?? null,
      replaceArrays: true,
    } as any);
  };

  // Brand Voice add/remove
  const addBrandVoice = () => {
    const value = window.prompt(
      "Add a brand voice trait (e.g., Professional, Friendly, Inspiring)",
    );
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.brandVoice)
      ? profileData.brandVoice
      : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, brandVoice: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
  };

  const removeBrandVoice = (index: number) => {
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.brandVoice)
      ? profileData.brandVoice
      : [];
    const next = current.filter((_: string, i: number) => i !== index);
    const newProfileData = { ...profileData, brandVoice: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
  };

  // Content Goals add/remove
  const addContentGoal = () => {
    const value = window.prompt(
      "Add a content goal (e.g., Increase engagement, Build trust, Drive sales)",
    );
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.contentGoals)
      ? profileData.contentGoals
      : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, contentGoals: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
  };

  const removeContentGoal = (index: number) => {
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.contentGoals)
      ? profileData.contentGoals
      : [];
    const next = current.filter((_: string, i: number) => i !== index);
    const newProfileData = { ...profileData, contentGoals: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
  };

  // Target Audience add/remove
  const addTargetAudience = () => {
    const value = window.prompt(
      "Add a target audience segment (e.g., Young professionals, Parents, Students)",
    );
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.targetAudience)
      ? profileData.targetAudience
      : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, targetAudience: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
  };

  const removeTargetAudience = (index: number) => {
    const profileData = (user!.profileData as any) || {};
    const current = Array.isArray(profileData.targetAudience)
      ? profileData.targetAudience
      : [];
    const next = current.filter((_: string, i: number) => i !== index);
    const newProfileData = { ...profileData, targetAudience: next };
    updateProfileMutation.mutate({
      profileData: newProfileData,
      replaceArrays: true,
    } as any);
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
              <p className="text-gray-600 mb-4">
                You must be logged in to view profile settings.
              </p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasProfileData = !!(
    user.contentNiche?.length ||
    (user as any).primaryPlatforms?.length ||
    user.primaryPlatform ||
    (user.profileData && Object.keys(user.profileData as object).length > 0)
  );

  return (
    <div className="h-screen bg-background overflow-y-scroll">
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-32">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-back-to-chat"
            >
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1
                className="text-xl sm:text-2xl font-bold text-foreground"
                data-testid="text-page-title"
              >
                Profile Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Manage your AI-collected profile information
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              window.location.reload();
            }}
            data-testid="button-refresh-profile"
          >
            Refresh Data
          </Button>
        </div>

        {/* Privacy Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            ContentCraft AI learns about your content creation preferences
            through conversations to provide personalized assistance. You can
            review and delete any collected information at any time.
          </AlertDescription>
        </Alert>

        {/* Tabbed Interface */}
        <Tabs defaultValue="profile" className="space-y-6" onValueChange={(value) => {
          if (value === "subscription") {
            // Refetch user data and subscription plans when switching to subscription tab
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/plans"] });
          } else if (value === "profile") {
            // Refetch user data when switching to profile tab
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="profile"
              className="flex items-center space-x-2"
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:border-transparent"
            >
              <CreditCard className="h-4 w-4" />
              <span>Subscription</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Basic Profile Information */}
            <BasicProfileCard user={user} />

            {/* AI-Collected Profile Data */}
            <AiCollectedDataCard user={user} />

            {/* Data Usage Information */}
            <DataUsageInfoCard />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement />
          </TabsContent>
        </Tabs>

        {/* Support Contact */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{" "}
            <a
              href="mailto:support@wrytebot.com"
              className="text-primary hover:underline font-medium"
            >
              support@wrytebot.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
