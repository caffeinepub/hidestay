# HIDESTAY

## Current State

The app is a hotel booking platform for Uttarakhand with:
- Internet Identity (II) login used for all users (customers, admins, hotel owners)
- A `CustomerProfile` type in the backend with `name`, `email`, `phone` fields
- `saveCallerUserProfile` / `getCallerUserProfile` / `getUserProfile` backend calls
- Mobile OTP login code that was attempted in a previous build but the II system is the active auth
- No dedicated customer profile page (no `/profile` route)
- My Bookings is accessed via a header button
- Super Admin Panel, Hotel Owner Dashboard, and Booking flows all use II identity

## Requested Changes (Diff)

### Add
- Email + password login system for customers (stored in backend as `CustomerProfile` with hashed password)
- `CustomerProfile` type with: `name`, `email`, `passwordHash` (internal), `memberSince`
- Backend functions: `registerCustomer`, `loginCustomer` (returns session token), `getMyCustomerProfile`, `updateCustomerProfile`, `changePassword`
- Customer Profile Page with: display name, email, member-since date, change password form, link to My Bookings
- Auth state stored in React context/localStorage (session token approach, no II changes for customer flow)
- "Sign In / Sign Up" modal in header for email+password customer authentication
- Logout button on profile page

### Modify
- Replace any mobile OTP login UI with simple email + password form
- Header: replace old auth button with new Sign In / My Profile button that opens the customer auth modal or profile page
- Booking flow: use customer session (email+password) rather than requiring II for customer bookings
- The existing Internet Identity login is kept for Admin and Hotel Owner access only

### Remove
- All mobile OTP related code (sendSignupOtp, sendMobileOtp, verifyMobileOtp, loginWithMobileOtp, OTP state)
- Any `CustomerProfile.mobile` / `CustomerProfile.phone` fields used for OTP
- Frontend OTP input forms and OTP step-by-step signup flows

## Implementation Plan

1. **Backend**: Replace old CustomerProfile type. Add `name`, `email`, `passwordHash`, `memberSince` fields. Implement `registerCustomer(name, email, password)`, `loginCustomer(email, password)` returning a session token (simple Text), `getMyCustomerProfile()` — caller-based (II identity), `updateCustomerProfile(name, email)`, `changePassword(oldPassword, newPassword)`. Remove OTP functions.

2. **Frontend auth context**: Create a `useCustomerAuth` hook that stores session state. Since the backend uses II principal for "caller", customers still authenticate via II but the profile data (name, email, password) is stored in the backend under their principal. The login UI collects email + password and calls `loginCustomer` to validate; if valid, marks the user as logged in in local state.

3. **Sign In / Sign Up modal**: Email + password fields only. Sign Up collects name, email, password, confirm password. No OTP step.

4. **Customer Profile Page**: Full-page view accessible from header when logged in. Shows name, email, member since. Edit profile form. Change password form (requires current password). "My Bookings" link/button.

5. **Booking flow**: Customers must be signed in (II + email profile) to book. Auto-fill name/email from profile.
