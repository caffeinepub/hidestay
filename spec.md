# HIDESTAY – Header User Account System Upgrade

## Current State
- Header shows "Sign In" text button when unauthenticated; when authenticated it shows an avatar dropdown with initials, "My Profile", "My Bookings", and "Sign Out".
- `CustomerProfile` backend type has: `name`, `email`, `mobile`, `passwordHash`, `memberSince`.
- `CustomerProfilePage` shows Name, Email, Mobile, Change Password, My Bookings link, and Sign Out.
- Profile hero shows initials in a square box; no profile photo support.
- No Date of Birth field in the backend or frontend.
- The header "Sign In" button is a rectangular text button.

## Requested Changes (Diff)

### Add
- `dateOfBirth: Text` and `photoUrl: Text` fields to `CustomerProfile` Motoko type.
- `updateCustomerProfileFull(name, email, mobile, dateOfBirth, photoUrl)` backend endpoint.
- Profile Photo upload in the `CustomerProfilePage` (client-side base64 or blob URL, stored as `photoUrl` text).
- Date of Birth field in the profile view and edit form.
- Round profile avatar icon in the header (replaces the rectangular sign-in button layout when logged in, and replaces the text "Sign In" with a cleaner icon button when logged out).
- Dropdown menu with: My Profile, My Bookings, Logout (already exists but avatar shape to become fully round).

### Modify
- Header avatar: change from rounded-xl pill shape to a purely circular avatar (`rounded-full`), no name/chevron text beside it — just the round avatar icon.
- When logged out: replace the rectangular "Sign In" button with a round icon-only avatar placeholder button.
- `CustomerProfilePage`: add Date of Birth field (view + edit), add Profile Photo upload/preview.
- Backend `CustomerProfile` type: add `dateOfBirth` and `photoUrl` with empty string defaults.
- `updateCustomerProfile` → update to also persist `dateOfBirth` and `photoUrl`.
- `registerCustomer` → initialize `dateOfBirth` and `photoUrl` as empty strings.
- `backend.d.ts` → add new fields to `CustomerProfile`, add new endpoint signature.
- `CustomerAuthContext` → pass through the extended profile fields.

### Remove
- Nothing removed; "My Bookings" button in the header (beside the avatar) can remain for convenience.

## Implementation Plan
1. Update Motoko `CustomerProfile` type to include `dateOfBirth: Text` and `photoUrl: Text`.
2. Update `registerCustomer`, `updateCustomerProfile`, `changeCustomerPassword`, and `getCustomerProfile` to carry the new fields.
3. Add new `updateCustomerProfileFull` endpoint accepting all fields including dateOfBirth and photoUrl.
4. Update `backend.d.ts` with the new type fields and endpoint.
5. Update `CustomerAuthContext` to expose extended profile (typecast as needed).
6. In the Header component: make avatar button fully round (`rounded-full`), remove name/chevron text from the authenticated state, add a round icon-only "Sign In" button for unauthenticated state.
7. In `CustomerProfilePage`: add Date of Birth field to view and edit form; add profile photo upload (file input → base64 → stored in `photoUrl`); display photo in the hero circle.
8. Validate and fix build errors.
