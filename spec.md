# HIDESTAY

## Current State

- Super Admin Panel exists at `/admin`, rendered via `SuperAdminPanel` component with `isAdmin` prop derived from `actor.isCallerAdmin()` (Internet Identity RBAC).
- Access control: `isAdmin` is checked via `AccessControl.isAdmin()` which checks for `#admin` role in the ICP authorization module.
- The panel itself shows an "Access Denied" screen if `isAdmin` is false, but the URL `/admin` is not redirected — any anonymous visitor can navigate to `/admin` and see the panel container (just the access denied screen).
- Admin panel button in header only shown to admins, but direct URL access is unguarded at the routing level.
- Customer authentication uses email + password stored in `CustomerProfile`. `CustomerProfile` currently has: `name`, `email`, `passwordHash`, `memberSince`. No `mobile` field.
- `emailToPrincipal` map enforces email uniqueness. No mobile uniqueness map exists.
- Login flow: email + password only (no mobile field collected or stored).

## Requested Changes (Diff)

### Add
- Mobile number field (`mobile: Text`) to `CustomerProfile` in the backend.
- `mobileToPrincipal` lookup map for uniqueness enforcement in the backend.
- Mobile uniqueness validation in `registerCustomer` and `updateCustomerProfile`.
- Mobile field to the Sign Up form in `AuthModal`.
- Mobile field to the Customer Profile edit form.
- Route guard: when `/admin` is loaded and user is not admin, redirect to `/` with a toast.
- `AdminLoginGate` component: if user navigates directly to `/admin` without being an admin (after role check resolves), close the panel and redirect.

### Modify
- `registerCustomer` backend function: accept `mobile` parameter, validate uniqueness, store in `mobileToPrincipal` map.
- `updateCustomerProfile` backend function: accept `mobile` parameter, validate uniqueness on update.
- `CustomerProfile` type: add `mobile: Text`.
- `AuthModal` signup form: add mobile number input field (required).
- `CustomerProfilePage`: show mobile number in profile view, include mobile in edit form.
- Admin route guard in `AppInner`: after `isAdmin` resolves (not loading), if path is `/admin` and `isAdmin` is false, push to `/` and close panel with a toast "Access restricted to administrators."

### Remove
- Nothing removed.

## Implementation Plan

1. **Backend (main.mo)**:
   - Add `mobile: Text` to `CustomerProfile` type.
   - Add `mobileToPrincipal = Map.empty<Text, Principal>()`.
   - Update `registerCustomer` to accept `mobile`, validate uniqueness against both email and mobile maps, store `mobile` in profile and `mobileToPrincipal`.
   - Update `updateCustomerProfile` to accept `mobile`, validate uniqueness on change, update `mobileToPrincipal` accordingly.
   - `getMyCustomerProfile` already returns the full profile — no change needed.

2. **Frontend — Admin route guard (App.tsx)**:
   - After `isAdmin` query resolves (`!actorLoading && actor`), add a `useEffect` that: if `window.location.pathname === "/admin"` and `isAdmin === false`, call `closeAdminPanel()` and show a toast error "Access restricted to administrators."
   - This prevents the panel from staying open on direct URL access for non-admins.

3. **Frontend — AuthModal signup (App.tsx)**:
   - Add `mobile` field to `signupForm` state.
   - Add mobile number input in the signup tab (required, tel type, 10-digit validation).
   - Pass `mobile` to `register()` call.

4. **Frontend — CustomerAuthContext**:
   - Update `register()` to accept and forward `mobile` parameter to `actor.registerCustomer`.

5. **Frontend — CustomerProfilePage (App.tsx)**:
   - Show `mobile` field in profile view.
   - Add `mobile` to `editForm` state and include in `updateCustomerProfile` call.
