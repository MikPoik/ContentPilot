
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ClientOnly } from "@/components/client-only";
import { Link } from "wouter";

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: November 3, 2025</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                By accessing or using WryteBot ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Description of Service</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                WryteBot is an AI-powered content creation platform that helps users create engaging social media 
                content for platforms including Twitter/X and Instagram. The Service includes:
              </p>
              <ul>
                <li>AI-powered content generation</li>
                <li>Social media analysis and insights</li>
                <li>Brand voice learning and replication</li>
                <li>Web research capabilities</li>
                <li>Content optimization suggestions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                To use certain features of the Service, you must create an account. You agree to:
              </p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Subscription Plans and Payments</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                WryteBot offers various subscription plans with different features and message limits:
              </p>
              <ul>
                <li><strong>Free Plan:</strong> Limited features with 10 messages per month</li>
                <li><strong>Starter Plan:</strong> Enhanced features with 100 messages per month</li>
                <li><strong>Pro Plan:</strong> Full features with 500 messages per month</li>
                <li><strong>Message Packs:</strong> Additional messages available for purchase</li>
              </ul>
              <p>
                All payments are processed securely through Stripe. Subscriptions automatically renew unless cancelled. 
                You may cancel your subscription at any time through your account settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>Generate content that violates any applicable laws or regulations</li>
                <li>Create spam, misleading, or deceptive content</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Harass, abuse, or harm others</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Content Ownership and License</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                You retain ownership of all content you create using WryteBot. By using the Service, you grant us 
                a limited license to process your inputs and data solely for the purpose of providing the Service.
              </p>
              <p>
                AI-generated content is provided "as-is" and you are responsible for reviewing and editing all 
                content before publication.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                The Service integrates with third-party platforms and services including:
              </p>
              <ul>
                <li>Twitter/X (for content analysis)</li>
                <li>Instagram (for content analysis)</li>
                <li>OpenAI (for AI content generation)</li>
                <li>Stripe (for payment processing)</li>
              </ul>
              <p>
                Your use of these third-party services is subject to their respective terms of service and privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Disclaimers and Limitations of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
              </p>
              <ul>
                <li>Accuracy or quality of AI-generated content</li>
                <li>Uninterrupted or error-free service</li>
                <li>Specific results or engagement metrics</li>
              </ul>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We reserve the right to suspend or terminate your account at any time for violations of these Terms. 
                You may terminate your account at any time by contacting us or through your account settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                We may modify these Terms at any time. We will notify you of material changes via email or through 
                the Service. Your continued use of the Service after such modifications constitutes acceptance of 
                the updated Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none">
              <p>
                For questions about these Terms, please contact us through the Service or visit our support page.
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
