# Neon Auth Migration Guide

## Changes Made

### 1. Fixed Login Redirect Issue

**Problem**: Users weren't redirected after login - they stayed on the login screen.

**Solution**: Added `redirectMethod` configuration to `stack.ts`:

```typescript
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
  redirectMethod: { useNavigate }, // Added this for proper redirects
  urls: {
    home: '/',
    afterSignIn: '/',
    afterSignUp: '/',
    signIn: '/handler/sign-in',
  },
});
```

### 2. Updated Schema for Neon Auth

**Problem**: App was still referencing the old `users` table for user identity.

**Solution**: 
- Created reference to `neon_auth.users_sync` table in schema
- Removed foreign key constraint from `images` table (Neon Auth manages users separately)
- Updated drizzle config to exclude `neon_auth` schema from migrations

### 3. User Data Handling

With Neon Auth, user data is split between two tables:

#### `neon_auth.users_sync` (Managed by Neon Auth)
- `id` - User ID
- `email` - User email
- `name` - User display name
- `created_at`, `updated_at`, `deleted_at` - Timestamps
- `raw_json` - Complete user profile as JSON

#### `users` (Managed by your app)
- `id` - References the Neon Auth user ID
- `stripeCustomerId`, `stripeSubscriptionId` - Stripe data
- `subscriptionTier`, `credits`, `maxCredits` - Subscription details
- Other app-specific fields

### 4. Database Setup

The `neon_auth.users_sync` table is automatically created and managed by Neon Auth. You don't need to create it.

Your app's `users` table stores app-specific data (subscriptions, credits) and references Neon Auth users by ID.

## How User Data Works Now

1. **User Signs Up/In**: Handled by Neon Auth through the StackHandler
2. **User Data Sync**: Neon Auth automatically creates/updates records in `neon_auth.users_sync`
3. **App-Specific Data**: Your app creates records in the `users` table via the `/api/ensure-user` endpoint

## Code Changes Summary

### Files Modified:
1. `client/src/lib/stack.ts` - Added redirectMethod and URL configs
2. `shared/schema.ts` - Added neonAuthUsers reference, removed FK from images
3. `client/src/components/navigation.tsx` - Fixed user property access
4. `drizzle.config.ts` - Excluded neon_auth schema from migrations

### No Changes Needed:
- `server/storage.ts` - Still works with the `users` table for app data
- `server/routes/auth.ts` - Already set up for lazy user creation
- `server/routes/subscriptions.ts` - Already queries neon_auth.users_sync for email/name

## Testing Checklist

- [ ] User can sign up successfully
- [ ] User is redirected to home page after signup
- [ ] User can sign in successfully
- [ ] User is redirected to home page after signin
- [ ] User profile displays correctly in navigation
- [ ] User can create/edit images
- [ ] Subscription flow works correctly
- [ ] Sign out works and redirects properly

## Troubleshooting

### User not redirected after login
- Verify `VITE_STACK_PROJECT_ID` and `VITE_STACK_PUBLISHABLE_CLIENT_KEY` are set
- Check browser console for errors
- Ensure StackHandler is mounted at `/handler/*` route

### User data not found
- Check that `/api/ensure-user` is being called on first login
- Verify the `users` table exists in your database
- Check that `x-user-id` header is being sent with API requests

### Database errors
- Ensure `neon_auth` schema exists in your database (created by Neon Auth)
- Don't try to create `neon_auth.users_sync` manually - Neon Auth manages it
- Run migrations if the `users` table structure changed

## Next Steps

After testing, you can:
1. Remove old Replit Auth code if it exists
2. Clean up any unused auth-related imports
3. Update documentation to reflect Neon Auth usage
