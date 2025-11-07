
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ClientOnly } from "@/components/client-only";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50/50 via-emerald-50/30 to-teal-50/50 dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                WryteBot
              </span>
            </a>
          </Link>
          <div className="flex items-center space-x-4">
            <ClientOnly>
              <ThemeToggle />
            </ClientOnly>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last Updated: November 3, 2025</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                At WryteBot, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
                disclose, and safeguard your information when you use our AI-powered content creation service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <h4 className="font-semibold mt-4">Account Information</h4>
              <ul>
                <li>Name and email address (from Replit authentication)</li>
                <li>Profile picture and username</li>
                <li>Subscription and payment information (processed by Stripe)</li>
              </ul>

              <h4 className="font-semibold mt-4">Profile Data</h4>
              <ul>
                <li>Content niche and business type</li>
                <li>Brand voice and writing style preferences</li>
                <li>Target audience information</li>
                <li>Content goals and topics of interest</li>
                <li>Primary social media platforms</li>
              </ul>

              <h4 className="font-semibold mt-4">Usage Data</h4>
              <ul>
                <li>Conversation history and messages</li>
                <li>AI-generated content</li>
                <li>Search queries and web research data</li>
                <li>Social media analysis requests</li>
                <li>Feature usage and interaction patterns</li>
              </ul>

              <h4 className="font-semibold mt-4">Technical Data</h4>
              <ul>
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage analytics and performance metrics</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We use your information to:</p>
              <ul>
                <li><strong>Provide the Service:</strong> Generate personalized AI content based on your brand voice and preferences</li>
                <li><strong>Improve User Experience:</strong> Learn your content style and provide increasingly relevant suggestions</li>
                <li><strong>Process Payments:</strong> Manage subscriptions and message pack purchases</li>
                <li><strong>Communicate:</strong> Send service updates, feature announcements, and support responses</li>
                <li><strong>Analyze Performance:</strong> Monitor service usage and improve our algorithms</li>
                <li><strong>Ensure Security:</strong> Detect and prevent fraudulent or unauthorized activity</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. AI and Machine Learning</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                WryteBot uses AI technology (including OpenAI's GPT models) to:
              </p>
              <ul>
                <li>Analyze your conversations to understand your content needs</li>
                <li>Learn and replicate your unique brand voice</li>
                <li>Generate personalized content suggestions</li>
                <li>Provide insights based on social media trends</li>
              </ul>
              <p>
                Your conversations and profile data are used to train our personalization algorithms specifically 
                for your account. We do not use your data to train third-party AI models without your consent.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Sharing and Third Parties</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We share your information with:</p>
              
              <h4 className="font-semibold mt-4">Service Providers</h4>
              <ul>
                <li><strong>OpenAI:</strong> For AI content generation (subject to OpenAI's privacy policy)</li>
                <li><strong>Stripe:</strong> For payment processing (subject to Stripe's privacy policy)</li>
                <li><strong>Replit:</strong> For authentication services</li>
                <li><strong>Social Media APIs:</strong> For content analysis (when you authorize access)</li>
              </ul>

              <h4 className="font-semibold mt-4">Legal Requirements</h4>
              <p>
                We may disclose your information if required by law, court order, or to protect our rights and safety.
              </p>

              <p className="mt-4">
                <strong>We do not sell your personal information to third parties.</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Storage and Security</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We implement industry-standard security measures to protect your data:
              </p>
              <ul>
                <li>Encryption of data in transit and at rest</li>
                <li>Secure database storage with access controls</li>
                <li>Regular security audits and updates</li>
                <li>Limited employee access to personal data</li>
              </ul>
              <p>
                However, no method of transmission over the internet is 100% secure. While we strive to protect 
                your data, we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access:</strong> View your personal data and profile information</li>
                <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Delete your account and associated data</li>
                <li><strong>Data Portability:</strong> Export your conversation history and content</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p>
                You can exercise these rights through your Profile Settings or by contacting us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>We retain your data:</p>
              <ul>
                <li><strong>Active Accounts:</strong> For as long as your account is active</li>
                <li><strong>Deleted Accounts:</strong> Up to 30 days after deletion for backup purposes</li>
                <li><strong>Legal Requirements:</strong> As required by applicable law</li>
              </ul>
              <p>
                You can delete specific conversations, profile data, or your entire account at any time through 
                your Profile Settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul>
                <li>Maintain your login session</li>
                <li>Remember your preferences (theme, settings)</li>
                <li>Analyze service usage and performance</li>
              </ul>
              <p>
                You can control cookies through your browser settings, but disabling them may affect service functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                WryteBot is not intended for users under 13 years of age. We do not knowingly collect personal 
                information from children. If you believe we have collected information from a child, please 
                contact us immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                Your data may be transferred to and processed in countries other than your own. We ensure 
                appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes via 
                email or through a notice on the Service. Your continued use after such changes constitutes 
                acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                For questions about this Privacy Policy or to exercise your privacy rights, please contact us 
                through the Service support page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              WryteBot
            </span>
          </div>
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <Link href="/terms-of-service"><a>Terms of Service</a></Link>
            <Link href="/privacy-policy"><a>Privacy Policy</a></Link>
            <a href="mailto:support@wrytebot.com" className="hover:text-foreground">Contact: support@wrytebot.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
