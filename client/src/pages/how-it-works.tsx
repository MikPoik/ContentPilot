import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Search, BarChart3, MessageSquare, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { ClientOnly } from "@/components/client-only";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function HowItWorksPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const steps = [
    {
      icon: Target,
      title: "Tell us your goals",
      desc: "Share your brand, audience, and platforms. The AI learns your voice and objectives.",
    },
    {
      icon: Search,
      title: "Research & insights",
      desc: "We search the web and socials for trends, examples, and winning angles.",
    },
    {
      icon: MessageSquare,
      title: "Chat to create",
      desc: "Brainstorm ideas, outlines, captions, and hashtags in a conversational workflow.",
    },
    {
      icon: BarChart3,
      title: "Optimize for performance",
      desc: "Get suggestions on timing, formats, and hooks to boost engagement.",
    },
  ];

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
            <Link href="/how-it-works" className="text-sm text-foreground font-medium hidden sm:inline-block">How it works</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline-block">Pricing</Link>
            <ClientOnly>
              <ThemeToggle />
            </ClientOnly>
            <Button onClick={handleLogin} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-slate-950/70 text-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">Product tour</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">How WryteBot works</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A focused workflow to research, ideate, and produce on-brand content—fast.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i} className="bg-white dark:bg-gray-900 border-border/50">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Why us */}
      <section className="pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="rounded-2xl border border-border p-6 sm:p-8 bg-white/70 dark:bg-slate-900/50">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Works with multiple platforms and adapts to your tone.</p>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Backed by web research to keep content timely and credible.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Clear pricing with optional message packs when you need more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Try WryteBot free</h2>
          <p className="text-white/90 mb-6">Create your first ideas in minutes. Cancel anytime.</p>
          <Button onClick={handleLogin} className="bg-white text-purple-600 hover:bg-gray-100">Get started</Button>
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