import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Zap, Star, CreditCard, ArrowUp, ArrowDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionPlan } from "@shared/schema";
import { useState } from "react";

export default function SubscriptionManagement() {
  const { user, isLoading: userLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [activeUntil, setActiveUntil] = useState<string | null>(null);
  const [confirmUpgradeDialog, setConfirmUpgradeDialog] = useState<{
    open: boolean;
    planId: string;
    planName: string;
    isUpgrade: boolean;
  }>({ open: false, planId: '', planName: '', isUpgrade: false });

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscriptions/plans'],
    enabled: !userLoading
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      setProcessingPlanId(planId);
      const response = await apiRequest("POST", "/api/subscriptions/create-checkout", { planId });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingPlanId(null);
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      setProcessingPlanId(null);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      setCanceling(true);
      const response = await apiRequest("POST", "/api/subscriptions/cancel", {});
      return response.json();
    },
    onSuccess: (data: any) => {
      setCanceling(false);
      if (data?.currentPeriodEnd) {
        const dateStr = new Date(data.currentPeriodEnd).toISOString();
        setActiveUntil(dateStr);
      }
      toast({
        title: "Subscription will cancel",
        description: "You'll retain access until the end of your current billing period.",
      });
      // Refresh user to reflect status change (cancels_at_period_end)
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      setCanceling(false);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Resume subscription mutation
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      setCanceling(true);
      const response = await apiRequest("POST", "/api/subscriptions/resume", {});
      return response.json();
    },
    onSuccess: () => {
      setCanceling(false);
      setActiveUntil(null);
      toast({
        title: "Subscription resumed",
        description: "Your subscription is now active and will auto-renew.",
      });
      // Refresh user to reflect status change (active)
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      setCanceling(false);
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive",
      });
    },
  });

  // Update plan mutation (upgrade/downgrade)
  const updatePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      setProcessingPlanId(planId);
      const response = await apiRequest("POST", "/api/subscriptions/update-plan", { planId });
      return response.json();
    },
    onSuccess: () => {
      setProcessingPlanId(null);
      toast({
        title: "Plan updated",
        description: "Your subscription plan has been updated successfully.",
      });
      // Refresh user to reflect new plan
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      setProcessingPlanId(null);
      toast({
        title: "Error",
        description: "Failed to update subscription plan",
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
  const messagesLimit = user.messagesLimit || 20;
  const messagePacks = (user as any).messagePacks || 0;
  const totalLimit = messagesLimit + messagePacks;
  
  // Calculate how many pack messages have been used
  const packMessagesRemaining = messagePacks;
  const subscriptionMessagesUsed = messagesUsed;
  const totalUsed = Math.max(0, totalLimit - packMessagesRemaining - (messagesLimit - subscriptionMessagesUsed));
  
  const usagePercentage = Math.min((totalUsed / totalLimit) * 100, 100);

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('basic')) return <Zap className="h-5 w-5" />;
    if (name.includes('pro')) return <Star className="h-5 w-5" />;
    if (name.includes('premium') || name.includes('enterprise')) return <Crown className="h-5 w-5" />;
    return <CreditCard className="h-5 w-5" />;
  };

  const isCurrentPlan = (planId: string) => user.subscriptionPlanId === planId;
  const isPaidUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'cancels_at_period_end';

  // Determine if a plan is an upgrade or downgrade
  const getPlanRelationship = (planPrice: number): 'current' | 'upgrade' | 'downgrade' => {
    if (!plans || !user.subscriptionPlanId) return 'upgrade';
    
    const currentPlan = plans.find(p => p.id === user.subscriptionPlanId);
    if (!currentPlan) return 'upgrade';
    
    const currentPrice = currentPlan.priceAmount;
    
    if (planPrice > currentPrice) return 'upgrade';
    if (planPrice < currentPrice) return 'downgrade';
    return 'current';
  };

  const handlePlanChange = (planId: string, planName: string, planPrice: number) => {
    const relationship = getPlanRelationship(planPrice);
    
    if (relationship === 'current') {
      // If somehow trying to "change" to current plan, just use checkout
      createCheckoutMutation.mutate(planId);
      return;
    }

    // Show confirmation dialog for upgrades and downgrades
    setConfirmUpgradeDialog({
      open: true,
      planId,
      planName,
      isUpgrade: relationship === 'upgrade',
    });
  };

  const confirmPlanChange = () => {
    const planId = confirmUpgradeDialog.planId;
    const isUpgrade = confirmUpgradeDialog.isUpgrade;
    setConfirmUpgradeDialog({ open: false, planId: '', planName: '', isUpgrade: false });
    
    // Use update-plan endpoint for existing subscribers (upgrade/downgrade)
    updatePlanMutation.mutate(planId);
  };

  return (
    <div className="space-y-6">
      {/* Upgrade/Downgrade Confirmation Dialog */}
      <AlertDialog open={confirmUpgradeDialog.open} onOpenChange={(open) => 
        setConfirmUpgradeDialog({ ...confirmUpgradeDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmUpgradeDialog.isUpgrade ? 'Upgrade' : 'Downgrade'} Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmUpgradeDialog.isUpgrade ? (
                <>
                  You're about to upgrade to <strong>{confirmUpgradeDialog.planName}</strong>.
                  <br /><br />
                  You'll be charged a prorated amount for the remainder of your current billing period, 
                  and your new rate will apply on your next billing date.
                </>
              ) : (
                <>
                  You're about to downgrade to <strong>{confirmUpgradeDialog.planName}</strong>.
                  <br /><br />
                  Your current plan benefits will remain active until the end of your billing period, 
                  then the new plan will take effect.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPlanChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {totalUsed} / {totalLimit}
            </span>
          </div>
          {messagePacks > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>📦 Message packs: {messagePacks} remaining (used first)</div>
              <div>📅 Subscription: {messagesLimit - messagesUsed} / {messagesLimit} remaining</div>
            </div>
          )}
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
          <>
            {/* Subscription Plans Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {plans.filter(plan => (plan as any).planType !== 'message_pack').map((plan) => {
                const isCurrentUserPlan = isCurrentPlan(plan.id);
                const priceDisplay = (plan.priceAmount / 100).toFixed(2);
                const planRelationship = getPlanRelationship(plan.priceAmount);
                
                // Determine button text and icon
                let buttonText = 'Subscribe';
                let buttonIcon = null;
                
                if (isCurrentUserPlan) {
                  buttonText = 'Current Plan';
                } else if (isPaidUser && user.subscriptionPlanId) {
                  if (planRelationship === 'upgrade') {
                    buttonText = 'Upgrade';
                    buttonIcon = <ArrowUp className="h-4 w-4 mr-1" />;
                  } else if (planRelationship === 'downgrade') {
                    buttonText = 'Downgrade';
                    buttonIcon = <ArrowDown className="h-4 w-4 mr-1" />;
                  }
                }
                
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
                        €{priceDisplay}
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
                        disabled={isCurrentUserPlan || processingPlanId !== null}
                        type="button"
                        onClick={() => {
                          if (isPaidUser && user.subscriptionPlanId && !isCurrentUserPlan) {
                            handlePlanChange(plan.id, plan.name, plan.priceAmount);
                          } else {
                            createCheckoutMutation.mutate(plan.id);
                          }
                        }}
                        data-testid={`button-subscribe-${plan.id}`}
                      >
                        {processingPlanId === plan.id ? (
                          "Processing..."
                        ) : (
                          <span className="flex items-center justify-center">
                            {buttonIcon}
                            {buttonText}
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Message Packs Section */}
            {plans.filter(plan => (plan as any).planType === 'message_pack').length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-4 mt-8">Message Packs</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.filter(plan => (plan as any).planType === 'message_pack').map((plan) => {
                    const priceDisplay = (plan.priceAmount / 100).toFixed(2);
                    
                    return (
                      <Card 
                        key={plan.id} 
                        className="relative border-purple-200"
                        data-testid={`card-plan-${plan.id}`}
                      >
                        <Badge className="absolute -top-2 left-4 bg-purple-500">
                          One-time Purchase
                        </Badge>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center space-x-2">
                            <Crown className="h-5 w-5 text-purple-500" />
                            <span>{plan.name}</span>
                          </CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                          <div className="text-2xl font-bold">
                            €{priceDisplay}
                            <span className="text-sm text-gray-500 font-normal"> one-time</span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-semibold">
                                +{plan.messagesLimit} messages
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">Never expires</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">Stacks with subscription</span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            disabled={processingPlanId !== null}
                            type="button"
                            onClick={() => createCheckoutMutation.mutate(plan.id)}
                            data-testid={`button-subscribe-${plan.id}`}
                          >
                            {processingPlanId === plan.id ? "Processing..." : "Buy Now"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </>
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
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {user.subscriptionStatus === 'cancels_at_period_end' ? 'Active (cancels at period end)' : user.subscriptionStatus}
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

              {/* Show active-until date immediately after cancellation */}
              {activeUntil && (
                <div className="flex justify-between" data-testid="text-active-until">
                  <span className="text-sm text-gray-600">Active until</span>
                  <span className="text-sm">{new Date(activeUntil).toLocaleDateString()}</span>
                </div>
              )}

              {/* Cancel subscription action */}
              <div className="pt-2">
                {user.subscriptionStatus === 'cancels_at_period_end' ? (
                  <Button
                    variant="default"
                    className="w-full sm:w-auto"
                    disabled={canceling}
                    onClick={() => resumeSubscriptionMutation.mutate()}
                    data-testid="button-resume-subscription"
                  >
                    {canceling ? 'Resuming...' : 'Resume subscription'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={canceling}
                    onClick={() => cancelSubscriptionMutation.mutate()}
                    data-testid="button-cancel-subscription"
                  >
                    {canceling ? 'Canceling...' : 'Cancel subscription'}
                  </Button>
                )}
                {user.subscriptionStatus === 'cancels_at_period_end' && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your subscription will remain active until the end of the current billing period.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}