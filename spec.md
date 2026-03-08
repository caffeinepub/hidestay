# HIDESTAY

## Current State
- Customer login uses email + password only (no Internet Identity)
- CustomerAuthContext manages session via localStorage
- AuthModal has Sign In and Create Account tabs
- Backend has `loginCustomer`, `registerCustomer`, `changeCustomerPassword`, `emailToPrincipal` map
- No forgot password flow exists for customers
- Email is disabled on the current plan — OTP must be demo mode (shown on screen)

## Requested Changes (Diff)

### Add
- "Forgot Password?" link below the password field on the Sign In tab in AuthModal
- Forgot Password view inside AuthModal (step 1: enter email, step 2: enter OTP + new password, step 3: success)
- Backend: `requestPasswordReset(email)` — generates 6-digit OTP (demo mode), stores with 10-min expiry keyed by email, returns OTP directly
- Backend: `resetPasswordWithOtp(email, otp, newPasswordHash)` — validates OTP, resets password, clears OTP
- Frontend: demo OTP amber banner showing the reset code (same pattern as admin OTP)
- Password strength bar on the new password field
- After successful reset, auto-switch to Sign In tab with success message

### Modify
- AuthModal: add `forgotPassword` view state alongside `login` and `signup`
- CustomerAuthContext: expose `requestPasswordReset` and `resetPasswordWithOtp` helpers
- backend.d.ts: add the two new function signatures

### Remove
- Nothing removed

## Implementation Plan
1. Add `resetTokens` map and helper functions to Motoko backend
2. Add `requestPasswordReset` and `resetPasswordWithOtp` public functions to backend
3. Update backend.d.ts with the two new method signatures
4. Add `requestPasswordReset` and `resetPasswordWithOtp` to CustomerAuthContext
5. Add Forgot Password view to AuthModal with 3-step flow (email → OTP+new password → success)
6. Add "Forgot Password?" link below password field in login tab
7. Validate build
