# HIDESTAY

## Current State
The Super Admin Panel uses Internet Identity login + a 6-digit OTP gate. `generateAdminOtp` creates an OTP keyed by caller principal, and `verifyAdminOtp` validates it. There is no limit on failed OTP attempts — a bad actor can guess indefinitely.

## Requested Changes (Diff)

### Add
- `adminLoginAttempts` map: `Principal → Nat` tracking consecutive failed OTP verifications per admin
- `adminLockedAccounts` map: `Principal → Bool` — set to true after 5 consecutive failures
- `verifyAdminOtp` increments failure count on wrong code; locks account at 5 failures; resets count on success
- `getAdminLockStatus` query: returns `{ locked: Bool; failedAttempts: Nat }` for the caller
- `unlockAdminAccount(target: Principal)` — admin-callable (for recovery by another trusted principal); for now the super-admin cannot unlock themselves
- Frontend: OTP gate reads `getAdminLockStatus` on mount; if locked shows a "Account Locked" error screen with a clear message; if unlocked, proceeds with normal OTP flow

### Modify
- `verifyAdminOtp` — wrap existing logic to check lock first, increment/reset counters
- SuperAdminPanel OTP gate — add lock-status check and locked UI state
- Error messages in frontend OTP gate to show remaining attempts (e.g. "2 attempts remaining before lockout")

### Remove
- Nothing removed

## Implementation Plan
1. Add `adminLoginAttempts` and `adminLockedAccounts` state maps in main.mo
2. Add `getAdminLockStatus` query returning `{ locked: Bool; failedAttempts: Nat }`
3. Modify `verifyAdminOtp` to: check locked → reject immediately; on wrong code increment counter and lock at 5; on correct code reset counter
4. Add `unlockAdminAccount(target: Principal)` admin-only function
5. Update frontend SuperAdminPanel OTP gate to: (a) query lock status on mount, (b) show locked screen if locked, (c) show remaining attempts in error messages
6. Validate TypeScript build
