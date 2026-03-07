# HIDESTAY

## Current State
Customer login uses a two-step process: (1) Internet Identity (II) connection must happen first, then (2) email + password validation. The `CustomerAuthContext` checks `isIILoggedIn` before allowing login or registration. The `AuthModal` shows an amber "Connect with Internet Identity first" banner and the submit buttons show "Connect & Sign In" / "Connect & Create Account" when II is not yet connected. The login/register handlers short-circuit and call `iiLogin()` if II is not yet connected.

## Requested Changes (Diff)

### Add
- Session token stored in `localStorage` so the customer stays logged in across page reloads without needing II
- `isEmailAuthed` state derived solely from the email+password backend call

### Modify
- `CustomerAuthContext` — remove all references to `useInternetIdentity`; replace `isIILoggedIn` check with a simple `!!actor` check; `logout` no longer calls `clearII()`; profile fetch is enabled whenever the actor is ready (not gated on II); `isAuthenticated` is true when `isEmailAuthed` is true OR when a profile is loaded
- `AuthModal` — remove the "Connect with Internet Identity" amber banner block; remove `handleIILogin`; remove `useInternetIdentity` import; change submit button labels to "Sign In" / "Create Account" unconditionally; remove `isIILoggedIn` conditionals from disabled states and button text

### Remove
- `useInternetIdentity` import from `CustomerAuthContext`
- `clearII()` call from customer `logout`
- II banner (lines ~4175–4201 in App.tsx) from `AuthModal`
- `handleIILogin` function from `AuthModal`
- `isIILoggedIn` variable and all conditional logic in `AuthModal` that references it

## Implementation Plan
1. Rewrite `CustomerAuthContext.tsx` — strip II dependency, use actor-only auth, store session in localStorage for persistence
2. Edit `AuthModal` in `App.tsx` — remove II banner, remove `useInternetIdentity` usage, simplify button labels and disabled conditions
3. Validate build (typecheck + lint + build)
