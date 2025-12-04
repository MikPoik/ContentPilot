import { StackClientApp } from '@stackframe/react';
import { useLocation } from 'wouter';

// Create a navigation hook compatible with Stack Auth
function useNavigate() {
  const [, setLocation] = useLocation();
  return (path: string) => setLocation(path);
}

export const stackClientApp = new StackClientApp({
  projectId: import.meta.env.VITE_STACK_PROJECT_ID!,
  publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY!,
  tokenStore: 'cookie',
  redirectMethod: { useNavigate },
  urls: {
    home: '/',
    afterSignIn: '/',
    afterSignUp: '/',
    signIn: '/handler/sign-in',
  },
});
