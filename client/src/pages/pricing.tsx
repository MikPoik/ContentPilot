import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Sparkles, Zap, Star } from "lucide-react";
import type { SubscriptionPlan } from "@shared/schema";
import { Link } from "wouter";
import { ClientOnly } from "@/components/client-only";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function PricingPage() {
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const subscriptionPlans = (plans || []).filter((p) => (p as any).planType !== "message_pack");
  const messagePacks = (plans || []).filter((p) => (p as any).planType === "message_pack");

  const getPlanIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("basic")) return <Zap className="h-5 w-5" />;
    if (lower.includes("pro")) return <Star className="h-5 w-5" />;
    if (lower.includes("premium") || lower.includes("enterprise")) return <Crown className="h-5 w-5" />;
    return <Sparkles className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              WryteBot
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline-block">How it works</Link>
            <Link href="/pricing" className="text-sm text-foreground font-medium hidden sm:inline-block">Pricing</Link>
            <ClientOnly>
              <ThemeToggle />
            </ClientOnly>
            <Button onClick={handleLogin} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-slate-950/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">Simple pricing</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Pick a plan to get started</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade anytime. No hidden fees.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      {getPlanIcon(plan.name)}
                      <span>{plan.name}</span>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="text-3xl font-bold">
                      ${(plan.priceAmount / 100).toFixed(2)}
                      <span className="text-sm text-muted-foreground font-normal">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          {plan.messagesLimit === -1 ? "Unlimited messages" : `${plan.messagesLimit} messages/month`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">AI-powered content generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Priority support</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleLogin}>Start with {plan.name}</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {messagePacks.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-semibold mb-4">Message Packs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {messagePacks.map((plan) => (
                  <Card key={plan.id} className="relative border-purple-200">
                    <Badge className="absolute -top-2 left-4 bg-purple-600">One-time Purchase</Badge>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        {getPlanIcon(plan.name)}
                        <span>{plan.name}</span>
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="text-2xl font-bold">
                        ${(plan.priceAmount / 100).toFixed(2)}
                        <span className="text-sm text-muted-foreground"> one-time</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold">+{plan.messagesLimit} messages</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">AI-powered content generation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Never expires</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Stacks with subscription</span>
                      </div>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleLogin}>Buy Now</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              WryteBot
            </span>
          </div>
          <p className="text-muted-foreground">&copy; 2025 WryteBot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}