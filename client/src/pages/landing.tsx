import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, TrendingUp, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">ContentCraft AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button
              onClick={handleLogin}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2"
              data-testid="button-login"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Social Media
            <span className="text-emerald-500 block">Content Strategy</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your social media presence with intelligent content ideas,
            platform-specific advice, and strategic planning powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-lg"
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 px-8 py-3 text-lg"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <MessageSquare className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Conversations</h3>
              <p className="text-gray-600">
                Chat with AI to brainstorm content ideas and get instant feedback on your social media strategy.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <TrendingUp className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Optimization</h3>
              <p className="text-gray-600">
                Get tailored advice for Instagram, TikTok, Twitter, and other platforms to maximize engagement.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <Users className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Audience Insights</h3>
              <p className="text-gray-600">
                Understand your niche better and create content that resonates with your target audience.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 ContentCraft AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}