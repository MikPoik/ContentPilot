import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Zap, Star, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionPlan } from "@shared/schema";

export default function SubscriptionManagement() {
  const { user, isLoading: userLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscriptions/plans'],
    enabled: !userLoading
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/subscriptions/create-checkout", { planId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  if (userLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to manage your subscription.</p>
      </div>
    );
  }

  const messagesUsed = user.messagesUsed || 0;
  const messagesLimit = user.messagesLimit || 10;
  const usagePercentage = Math.min((messagesUsed / messagesLimit) * 100, 100);

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('basic')) return <Zap className="h-5 w-5" />;
    if (name.includes('pro')) return <Star className="h-5 w-5" />;
    if (name.includes('premium') || name.includes('enterprise')) return <Crown className="h-5 w-5" />;
    return <CreditCard className="h-5 w-5" />;
  };

  const isCurrentPlan = (planId: string) => user.subscriptionPlanId === planId;
  const isPaidUser = user.subscriptionStatus === 'active';

  return (
    <div className="space-y-6">
      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Current Usage</span>
          </CardTitle>
          <CardDescription>
            Track your message usage for this billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Messages Used</span>
            <span className="text-sm text-gray-600" data-testid="text-message-usage">
              {messagesUsed} / {messagesLimit}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" data-testid="progress-usage" />
          {usagePercentage >= 80 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                {usagePercentage >= 100 
                  ? "You've reached your message limit. Upgrade to continue chatting."
                  : "You're approaching your message limit. Consider upgrading for unlimited access."
                }
              </p>
            </div>
          )}
          {isPaidUser && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              Active Subscription
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Subscription Plans</h3>
        {!plans || plans.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">No subscription plans available at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentUserPlan = isCurrentPlan(plan.id);
              const priceDisplay = (plan.priceAmount / 100).toFixed(2);
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${isCurrentUserPlan ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  {isCurrentUserPlan && (
                    <Badge className="absolute -top-2 left-4 bg-blue-500">
                      Current Plan
                    </Badge>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                      {getPlanIcon(plan.name)}
                      <span>{plan.name}</span>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="text-2xl font-bold">
                      ${priceDisplay}
                      <span className="text-sm text-gray-500 font-normal">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          {plan.messagesLimit === -1 
                            ? 'Unlimited messages'
                            : `${plan.messagesLimit} messages/month`
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">AI-powered content generation</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Priority support</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={isCurrentUserPlan ? "outline" : "default"}
                      disabled={isCurrentUserPlan || createCheckoutMutation.isPending}
                      onClick={() => createCheckoutMutation.mutate(plan.id)}
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      {createCheckoutMutation.isPending ? (
                        "Processing..."
                      ) : isCurrentUserPlan ? (
                        "Current Plan"
                      ) : (
                        "Subscribe"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing Information */}
      {isPaidUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Billing Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {user.subscriptionStatus}
                </Badge>
              </div>
              {user.subscriptionStartedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Started</span>
                  <span className="text-sm">
                    {new Date(user.subscriptionStartedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}