# HIDESTAY

## Current State
Full-featured hotel booking platform with Super Admin Panel, customer auth, hotel owner dashboard, booking management, and a 3-step admin login (Internet Identity → Password → OTP gate).

The admin OTP is generated in `generateAdminOtp()` using a `padToSixDigits` helper that incorrectly serialises a Motoko array to text, producing output like `["0","0","4","8","3","9"]` instead of `483921`.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- `padToSixDigits` function: replace the `Array.repeat` + `.toText()` approach with proper string concatenation using the `#` operator, producing a plain 6-digit numeric string with no brackets, commas, or spaces.
- `generateAdminOtp`: use a random number derived from `Time.now()` modulo 1_000_000 instead of a sequential counter, ensuring codes are not predictable. The result is always zero-padded to exactly 6 digits via the fixed helper.

### Remove
- `var otpCounter` — no longer needed once random generation is used.

## Implementation Plan
1. Replace `padToSixDigits` with a text-concatenation loop using `pad # "0"` and `pad # s`.
2. Replace `otpCounter`-based code generation with `Nat.rem(Int.abs(Time.now()), 1_000_000)` converted to text, then padded.
3. All other backend logic (hotels, bookings, customers, listings, owner dashboard, RBAC) remains identical.
