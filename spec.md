# HIDESTAY

## Current State

Full hotel booking platform for Uttarakhand with customer email+password auth, Account Dashboard (Profile, My Bookings, Saved Hotels, Help & Support, Settings), and a Super Admin panel.

### Auth System Issues

1. `isAuthenticated = isEmailAuthed && !!profile` — On page load, `isEmailAuthed=true` (from localStorage) but `profile` starts as `null` because the backend actor is created asynchronously. Even though `cachedProfile` is loaded from localStorage immediately, the `profile` computation may briefly return `null` before the cached profile is picked up. This causes `isAuthenticated=false` on initial render.
2. While `isAuthenticated=false`, the header renders the login button (UserCircle without dropdown). Clicking it fires `onLoginClick` → opens the Auth modal instead of the Account Dashboard.
3. The auth modal guard at line 4088 (`if (isAuthenticated && profile)`) shows a "welcome back" screen, but this only works if the modal is already open — it doesn't redirect to the dashboard.
4. `AccountDashboard` also has a `useEffect` that closes it when `isAuthenticated` becomes false, so any flicker resets the dashboard state.

## Requested Changes (Diff)

### Add
- A stable `isSessionLoaded` flag in `CustomerAuthContext` that is `true` as soon as localStorage session + cached profile are read (synchronously on mount), before any async actor load.

### Modify
- `CustomerAuthContext`: Change `isAuthenticated` to be `isEmailAuthed && (!!fetchedProfile || !!cachedProfile)` — using the cached profile immediately so auth state is stable from first render.
- `App.tsx` header profile icon click handler: When `isAuthenticated` is true, always open Account Dashboard directly. Never open the auth modal for authenticated users.
- `App.tsx` auth modal open handler (`onLoginClick`): Guard against opening if already authenticated — redirect to account dashboard instead.
- `AccountDashboard` close-on-logout `useEffect`: Only close if `isEmailAuthed` becomes false, not just `isAuthenticated` (to avoid closing on profile load delay).
- The `AccountDashboard` component itself: Ensure all 6 required sections are present — Profile (edit name, email, mobile, DOB), My Bookings, Saved Hotels / Wishlist, Help & Support, Settings (change password, delete account, logout). These are already implemented; verify they are wired and accessible.

### Remove
- Nothing to remove.

## Implementation Plan

1. Fix `CustomerAuthContext.tsx`: Change `isAuthenticated` computation to `isEmailAuthed && (!!fetchedProfile || !!cachedProfile)` so that cached profile from localStorage counts immediately.
2. Fix `App.tsx` `AppInner`: 
   - The `onLoginClick` handler should check `isAuthenticated` first and open account dashboard if already logged in.
   - The `useEffect` that closes the account dashboard should only fire when `isEmailAuthed` is false (via a separate context export or by reading `isAuthenticated` which is now stable).
   - Header `onProfileClick` is already wired to `openAccountDashboard("profile")` — verify this is correct.
3. Ensure `AccountDashboard` has the "My Account" label and all 6 nav items visible (Profile, My Bookings, Saved Hotels, Help & Support, Settings, Logout in Settings tab).
4. Run validation and deploy.
