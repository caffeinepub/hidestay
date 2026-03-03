# HIDESTAY

## Current State

- Super Admin uses Internet Identity (II) login + 6-digit OTP gate before dashboard access.
- No username/password-based login for the Super Admin panel — the admin is identified purely by their II principal.
- OTP gate (lock after 5 attempts, 30-min session timeout) exists inside SuperAdminPanel.tsx.
- Customer profiles use email + password stored as plaintext `passwordHash` field.
- No "Forgot Password" flow exists anywhere.
- No "Change Password" option exists inside the Super Admin dashboard.
- No password strength validation in the admin UI.

## Requested Changes (Diff)

### Add

- **Admin User ID + Password login**: A dedicated Admin Login screen (separate from customer login) where the Super Admin enters a User ID (stored in backend) and a password. This replaces the need for a second credential layer beyond II — practically, the admin now has an explicit credential pair stored on-chain (User ID is a fixed text label, password is hashed).
- **Backend: Admin credential storage**: `adminCredentials` map keyed by Principal storing `{ userId: Text; passwordHash: Text }`. New functions: `setAdminPassword(userId, password)` (first-time setup or admin-only), `loginWithAdminPassword(userId, password)` → `#ok | #error`. Password stored as a simple SHA-256-like hash using a deterministic text transformation (no external crypto lib — use iterative hashing pattern already used in project).
- **Change Password in Admin Dashboard**: A "Change Password" tab/section inside the admin panel. Requires current password, new password with strength validation, and confirm new password. Calls new `changeAdminPassword(oldPassword, newPassword)` backend function.
- **Password strength validation**: Frontend utility — validates minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char. Displayed as a strength bar with labels (Weak / Fair / Strong / Very Strong).
- **Forgot Password flow**: Admin-facing "Forgot Password" link on the admin login screen. Collects registered admin email. Backend generates a reset token (6-digit code with 10-minute expiry) stored in `passwordResetTokens` map. Token displayed on screen in demo mode (no email sending since email is disabled). After entering the token, allow setting a new password via `resetAdminPassword(token, newPassword)` backend function.
- **Backend: `generatePasswordResetToken(email)`**: Admin-accessible, generates a 10-min token for the given email if it matches an admin credential. Returns token in demo mode.
- **Backend: `resetAdminPassword(token, newPassword)`**: Validates token expiry, updates password hash, clears token.

### Modify

- **Admin login flow in frontend**: After II login confirms admin role, show the Admin Password Login screen (User ID + Password) before the OTP gate. The sequence becomes: II login → Admin ID+Password screen → OTP gate → Dashboard.
- **SuperAdminPanel.tsx**: Add a "Security" or "Change Password" section inside the dashboard tabs. Existing tabs (Dashboard, Hotels, Bookings, Users, Subscriptions) remain intact.
- **Backend password hashing**: Use a deterministic multi-pass text hash (consistent with existing Motoko patterns) instead of storing plaintext. The `setAdminPassword` and `changeAdminPassword` functions hash before storage.

### Remove

- Nothing removed.

## Implementation Plan

1. **Backend**: Add `AdminCredential` type, `adminCredentials` map, `adminEmailIndex` map. Add functions: `setupAdminCredentials(userId, email, password)`, `loginWithAdminPassword(userId, password)`, `changeAdminPassword(oldPassword, newPassword)`, `generatePasswordResetToken(email)`, `resetAdminPassword(token, newPassword)`. Hash passwords using a simple iterative hash (XOR + shift pattern in Motoko). Keep all existing functions untouched.
2. **Frontend — Admin Password Login screen**: A modal/screen that appears after II confirms admin role but before OTP gate. Fields: User ID, Password. "Forgot Password?" link opens the reset flow. On success, advances to OTP gate.
3. **Frontend — Forgot Password flow**: Slide-in sub-view within the admin auth screens. Step 1: enter email → get demo token. Step 2: enter token + new password + confirm. On success, return to login screen.
4. **Frontend — Change Password in admin dashboard**: New "Security" tab in the admin panel. Password strength bar, old password field, new password + confirm. Calls `changeAdminPassword`.
5. **Frontend — Password strength utility**: Reusable `PasswordStrengthBar` component with 4-level visual indicator.
6. Validate build, fix any type errors.
