import { useUser as useStackUser } from "@stackframe/react";
import type { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom auth hook that combines Stack Auth user with app-specific user data
 */
export function useAuth() {
  // Get Stack Auth user (from Neon Auth)
  const stackUser = useStackUser();
  
  // Get app-specific user data (subscriptions, credits, etc.)
  const { data: appUser, isLoading: isLoadingAppUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!stackUser, // Only fetch if Stack user exists
    retry: false,
  });

  const isLoading = !stackUser && isLoadingAppUser;
  const isAuthenticated = !!stackUser;

  // Merge Stack user data with app user data
  const user = appUser ? {
    ...appUser,
    // Ensure we have the Stack Auth email/name if not in app database yet
    email: appUser.email || stackUser?.primaryEmail || undefined,
    firstName: appUser.firstName || stackUser?.displayName?.split(' ')[0] || undefined,
    lastName: appUser.lastName || stackUser?.displayName?.split(' ').slice(1).join(' ') || undefined,
  } : undefined;

  return {
    user,
    stackUser, // Expose raw Stack user for advanced use cases
    isLoading,
    isAuthenticated,
  };
}
