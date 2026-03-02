# HIDESTAY Super Admin Panel

## Current State

The app is a hotel booking platform for Uttarakhand with:
- 25 seeded hotels across Haridwar, Rishikesh, Mussoorie, Dhanaulti, Dehradun
- Authorization system with `#admin` and `#user` roles
- An existing AdminPanel component (full-screen overlay, opened via header button) that handles: hotel approval/rejection, property listing approval, all bookings view, assign hotel owner
- Hotel approval statuses: `#Approved`, `#Pending`, `#Rejected`
- The existing `isAdmin` check uses `AccessControl.isAdmin()` which checks for the `#admin` role
- No `super_admin` role exists — only `#admin` and `#user`
- No `/admin` route — admin panel is a React state overlay
- No hotel suspension, user management, or subscription tracking in the backend
- No dashboard overview with aggregate stats

## Requested Changes (Diff)

### Add
- New `#super_admin` role in the authorization system (separate from `#admin`, higher privilege)
- Backend APIs:
  - `isSuperAdmin()` — returns bool for caller
  - `getSuperAdminStats()` — returns aggregate counts: totalHotels, approvedHotels, pendingHotels, suspendedHotels, totalBookings, confirmedBookings, cancelledBookings, totalListings, pendingListings, totalUsers
  - `suspendHotel(id)` — marks hotel as suspended (new status `#Suspended`), removes from search results
  - `unsuspendHotel(id)` — restores hotel to `#Approved` status
  - `getAllUsers()` — returns list of all registered principals with their roles
  - `assignSuperAdmin(principal)` — allows existing super_admin to promote another user (or use token-based bootstrap)
  - `getSubscriptionStats()` — returns breakdown of subscription plans from property listings
- New `HotelApprovalStatus` variant: `#Suspended`
- Frontend `/admin` route rendered by React Router (or hash-based routing) accessible only to `super_admin` role
- Super Admin Panel page at `/admin` with 5 tabs:
  1. **Dashboard** — stat cards (total hotels, pending approvals, suspended hotels, total bookings, confirmed bookings, total users), recent activity list
  2. **Hotels** — full hotel table with search/filter by city/status, Approve/Reject/Suspend/Unsuspend actions per row
  3. **Bookings** — all bookings table with search by guest email/name, status filter, booking details
  4. **Users** — list of all registered users with their roles and principal IDs
  5. **Subscriptions** — property listings with subscription plan info, status badges, owner contact details

### Modify
- `searchHotels` — filter out `#Suspended` hotels (in addition to non-approved)
- `getHotelsForAdmin` — return suspended hotels too (admin sees all)
- Hotel type: add `#Suspended` to `HotelApprovalStatus` variant
- Header: add "Super Admin" button visible only when `isSuperAdmin` is true (separate from existing `isAdmin` Admin Panel button)
- The existing AdminPanel overlay remains unchanged for `#admin` role users; the new `/admin` route is for `super_admin` only

### Remove
- Nothing removed

## Implementation Plan

1. **Backend**: Add `#super_admin` role to access-control, add `isSuperAdmin()` and `assignSuperAdmin()` functions, add `#Suspended` to `HotelApprovalStatus`, add `suspendHotel` / `unsuspendHotel`, add `getSuperAdminStats()`, add `getAllUsers()`, add `getSubscriptionStats()`. Update `searchHotels` to exclude suspended hotels.

2. **Frontend**: 
   - Add React Router (already likely available) or hash-based routing to handle `/admin` path
   - Create `SuperAdminPanel.tsx` component with 5-tab layout (Dashboard, Hotels, Bookings, Users, Subscriptions)
   - Dashboard tab: stat cards grid with icons + totals, recent booking/listing activity
   - Hotels tab: searchable/filterable table with Approve/Reject/Suspend/Unsuspend actions; city and status dropdowns
   - Bookings tab: table with guest info, hotel ID, dates, status; email search filter; status filter
   - Users tab: table of principal IDs + roles + action to assign/change role
   - Subscriptions tab: property listings grouped by plan (Basic/Standard/Premium) with owner details and listing status
   - Add `isSuperAdmin` query in App.tsx; show "Super Admin" button in header when true
   - Route `/admin` renders `SuperAdminPanel` if super_admin, otherwise redirects to access-denied screen
   - All admin mutations wrapped in error toasts
