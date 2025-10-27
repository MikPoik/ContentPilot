import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Instagram,
  Search,
  Zap,
  BarChart3,
  Star,
  Twitter,
  Paintbrush,
  Target
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Twitter,
      title: "Twitter Analysis",
      description: "Deep-dive into trending topics, hashtags, and engagement patterns to create viral-worthy content.",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      icon: Instagram,
      title: "Instagram Insights",
      description: "Analyze top-performing posts, reels, and stories to craft content that resonates with your audience.",
      gradient: "from-pink-500 to-orange-500"
    },
    {
      icon: Search,
      title: "Web Research",
      description: "Real-time web search to gather the latest trends, news, and insights for your content strategy.",
      gradient: "from-rose-500 to-pink-500"
    },
    {
      icon: Paintbrush,
      title: "Brand Voice AI",
      description: "Learn and replicate your unique brand voice to ensure consistent, authentic messaging.",
      gradient: "from-red-500 to-rose-500"
    },
    {
      icon: Sparkles,
      title: "Content Generation",
      description: "Generate posts, captions, and hashtags that align with your brand and drive engagement.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: BarChart3,
      title: "Performance Optimization",
      description: "Get AI-powered suggestions to optimize posting times, formats, and content strategies.",
      gradient: "from-fuchsia-500 to-pink-500"
    }
  ];

  const stats = [
    { value: "10K+", label: "Content Created" },
    { value: "95%", label: "Satisfaction Rate" },
    { value: "24/7", label: "AI Assistant" }
  ];

  const testimonials = [
    {
      quote: "ContentPilot transformed how we create content. The AI understands our brand voice perfectly and saves us hours every week.",
      author: "Sarah Johnson",
      role: "Social Media Manager",
      rating: 5
    },
    {
      quote: "The Twitter and Instagram analysis features are game-changers. I can now spot trends before they go viral.",
      author: "Michael Chen",
      role: "Content Creator",
      rating: 5
    },
    {
      quote: "Our engagement rates doubled since using ContentPilot. The AI-generated content feels authentic and on-brand.",
      author: "Emily Rodriguez",
      role: "Marketing Director",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50/50 via-emerald-50/30 to-teal-50/50 dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              ContentCraft AI
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button
              onClick={handleLogin}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-24 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/80 via-teal-50/60 to-transparent dark:from-slate-900/80 dark:via-gray-950/60 dark:to-slate-950/80" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/40 via-emerald-50/30 to-teal-100/40 dark:from-transparent dark:via-transparent dark:to-transparent" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 px-4 py-1.5 text-sm font-medium shadow-lg">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              AI-Powered Content Creation
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Create{" "}
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent animate-gradient">
                Engaging
              </span>
              <br />
              Social Content with AI
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              ContentPilot analyzes your brand voice, researches trends, and generates high-performing content for Twitter and Instagram in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
                data-testid="button-get-started"
              >
                <Zap className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 px-8 py-6 text-lg"
                data-testid="button-learn-more"
              >
                <Target className="w-5 h-5 mr-2" />
                See Examples
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Powered by{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Advanced AI
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, optimize, and schedule social media content that performs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group bg-white dark:bg-gray-900 border-border/50 dark:border-gray-800 hover:border-border dark:hover:border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-card-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-pink-50/50 via-rose-50/40 to-purple-50/50 dark:from-slate-950/80 dark:via-gray-950/60 dark:to-slate-900/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Loved by{" "}
              <span className="bg-gradient-to-r from-orange-500 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
                Content Creators
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of creators who are revolutionizing their content strategy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white dark:bg-gray-900 border-border/50 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <div className="font-semibold text-card-foreground">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 dark:from-purple-900 dark:via-pink-900 dark:to-orange-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <Sparkles className="w-16 h-16 text-white/90 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Content?
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-8 leading-relaxed">
              Join ContentPilot today and experience AI-powered content creation that understands your brand voice and drives engagement.
            </p>
            
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 px-10 py-6 text-lg font-semibold shadow-2xl hover:shadow-white/30 transition-all transform hover:scale-105"
              data-testid="button-cta"
            >
              Get Started Free
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
            
            <p className="text-sm text-white/80 mt-6">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
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
              ContentCraft AI
            </span>
          </div>
          <p className="text-muted-foreground">
            &copy; 2025 ContentCraft AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}