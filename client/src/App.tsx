import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { StackProvider, StackHandler, StackTheme } from "@stackframe/react";
import { stackClientApp } from "@/lib/stack";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import Landing from "@/pages/landing";
import ProfileSettings from "@/pages/profile-settings";
import PricingPage from "@/pages/pricing";
import HowItWorksPage from "@/pages/how-it-works";
import TermsOfService from "@/pages/terms-of-service";
import PrivacyPolicy from "@/pages/privacy-policy";
import { useLocation } from "wouter";
import React, { Suspense } from "react";
import CookieConsentBanner from "@/components/CookieConsentBanner";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function HandlerRoutes() {
  const [location] = useLocation();
  return (
    <StackHandler app={stackClientApp} location={location} fullPage />
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Stack Auth handler routes */}
      <Route path="/handler/:rest*" component={HandlerRoutes} />

      {/* Public routes */}
      <Route path="/pricing" component={PricingPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />

      {/* Root route depends on auth */}
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Chat} />
          <Route path="/chat/:id?" component={Chat} />
          <Route path="/profile-settings" component={ProfileSettings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

// Google Analytics loader with consent
function GoogleAnalyticsWithConsent() {
  const [consented, setConsented] = React.useState(false);
  const COOKIE_NAME = 'cookie_consent';

  React.useEffect(() => {
    if (localStorage.getItem(COOKIE_NAME) === 'true') {
      setConsented(true);
    }
  }, []);

  React.useEffect(() => {
    if (consented) {
      const GA_ID = import.meta.env.VITE_GA_ID;
      if (GA_ID && !window.gtag) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        document.head.appendChild(script);
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          (window.dataLayer as any[]).push(arguments);
        }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA_ID);
      }
    }
  }, [consented]);

  if (consented) return null;
  return <CookieConsentBanner onConsent={() => setConsented(true)} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StackProvider app={stackClientApp}>
        <StackTheme>
          <ThemeProvider defaultTheme="system" storageKey="contentcraft-ui-theme">
            <TooltipProvider>
              <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>}>
                <Toaster />
                <Router />
                <GoogleAnalyticsWithConsent />
              </Suspense>
            </TooltipProvider>
          </ThemeProvider>
        </StackTheme>
      </StackProvider>
    </QueryClientProvider>
  );
}

export default App;
