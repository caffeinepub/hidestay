# HIDESTAY

## Current State

The app uses a dual-identity system:
- **Hotel owners / Super Admin**: Internet Identity (II) via `useInternetIdentity` hook, principal-based RBAC
- **Customers**: Email + password login, but `registerCustomer` and all customer endpoints require `#user` role via `AccessControl.hasPermission`, which internally calls `Runtime.trap("User is not registered")` for any unknown principal — meaning any caller who hasn't been registered via `_initializeAccessControlWithSecret` (the II flow) is blocked from calling these endpoints

This means:
- New customers (without II) hit "Unauthorized: Only users can register" when calling `registerCustomer`
- WebView apps that don't support II cookies/redirects are completely blocked
- `createBooking`, `getMyBookings`, `cancelBooking`, `submitPropertyListing`, `getMyPropertyListings`, `getCustomerProfile`, `updateCustomerProfile`, `changeCustomerPassword`, `isCallerHotelOwner`, `getOwnerHotel`, `getOwnerBookings`, etc. all have the same `#user` role blocker

## Requested Changes (Diff)

### Add
- `isKnownPrincipal(caller)` helper in backend that returns true for any non-anonymous principal (replaces #user role check for customer endpoints)
- `registerCustomer` callable by any non-anonymous principal without prior role registration

### Modify
- `registerCustomer`: Remove `AccessControl.hasPermission(..., #user)` check — replace with simple anonymous-principal guard
- All customer endpoints (`createBooking`, `cancelBooking`, `getBooking`, `getMyBookings`, `submitPropertyListing`, `getMyPropertyListings`, `getCustomerProfile`, `updateCustomerProfile`, `changeCustomerPassword`, `isCallerHotelOwner`, `getCallerUserProfile`, `saveCallerUserProfile`, `getUserProfile`, `getOwnerHotel`, `getOwnerBookings`, `getOwnerRoomInventory`, `updateRoomInventory`, `getBlockedDates`, `blockDate`, `unblockDate`, `updateHotelRules`, `updateHotelTimes`, `updateBookingStatus`): Replace `AccessControl.hasPermission(..., #user)` with `not caller.isAnonymous()` guard
- Frontend `CustomerAuthContext.tsx`: Remove any remaining II-related logic, ensure register/login work purely via email+password
- Frontend `App.tsx`: Remove `useInternetIdentity` usage for customer flows; keep II only for Hotel Owner Dashboard and Super Admin panel

### Remove
- "Unauthorized: Only users can register" restriction from `registerCustomer`
- "Unauthorized: Only users can..." restrictions from all customer-facing endpoints (replaced with non-anonymous guard)

## Implementation Plan

1. **Backend `main.mo`**: Add `isKnownPrincipal` helper. Replace all `AccessControl.hasPermission(accessControlState, caller, #user)` calls in customer/owner endpoints with `not caller.isAnonymous()`. Keep admin checks unchanged.
2. **Frontend `CustomerAuthContext.tsx`**: Audit and ensure no II dependency remains; context is already mostly clean.
3. **Frontend `App.tsx`**: Search for any UI that gates customer actions on II login; ensure customer login modal shows only email+password; confirm II is only referenced for admin/owner flows.
4. **Build validation**: Run typecheck + lint + build to confirm clean compilation.
