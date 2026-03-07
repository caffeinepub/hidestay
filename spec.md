# HIDESTAY — Editable Check-in / Check-out System

## Current State

- `Hotel` type has fields: id, name, city, description, starRating, pricePerNight, amenities, address, imageIndex, imageUrls, approvalStatus, rules, ownerEmail, ownerPrincipal.
- Check-in and Check-out times on the Hotel Detail Page are **hardcoded** strings ("12:00 PM" / "11:00 AM") in App.tsx — they are not stored or fetched from the backend.
- `PropertyListing` type does not include checkInTime or checkOutTime fields.
- `submitPropertyListing` does not accept checkInTime/checkOutTime parameters.
- The Owner Dashboard has no UI to edit check-in/check-out times.
- No backend endpoint exists to update hotel check-in/check-out times.

## Requested Changes (Diff)

### Add
- `checkInTime: Text` and `checkOutTime: Text` fields to the `Hotel` type.
- `checkInTime: Text` and `checkOutTime: Text` fields to the `PropertyListing` type.
- `checkInTime` and `checkOutTime` parameters to `submitPropertyListing` backend function.
- `updateHotelTimes(checkInTime: Text, checkOutTime: Text)` — owner-only endpoint to update times directly on the hotel record (same pattern as `updateHotelRules`).
- Check-in Time and Check-out Time input fields in the "List Your Property" modal form (App.tsx).
- A new "Times" tab (or section within the existing "Rules" tab) in the Owner Dashboard where the owner can edit check-in/check-out times and save them instantly.

### Modify
- `approvePropertyListing` — copy `listing.checkInTime` and `listing.checkOutTime` to the new hotel record.
- `addHotelAdmin` — include default `checkInTime = "12:00 PM"` and `checkOutTime = "11:00 AM"` so seeded hotels keep working.
- All hotel record reconstructions (`approveHotel`, `rejectHotel`, `suspendHotel`, `updateHotelRules`) — carry through the new `checkInTime` and `checkOutTime` fields unchanged.
- Hotel Detail Page (App.tsx) — replace hardcoded "12:00 PM" / "11:00 AM" with `hotel.checkInTime` / `hotel.checkOutTime` from the fetched hotel object.
- Owner Dashboard — add a "Times" tab with editable time fields that call `updateHotelTimes`.

### Remove
- Nothing removed.

## Implementation Plan

1. **Backend (Motoko)**
   - Add `checkInTime: Text` and `checkOutTime: Text` to `Hotel` type.
   - Add `checkInTime: Text` and `checkOutTime: Text` to `PropertyListing` type.
   - Update `addHotelAdmin` to accept and store these fields (with defaults "12:00 PM" / "11:00 AM").
   - Update `submitPropertyListing` to accept `checkInTime` and `checkOutTime`.
   - Update `approvePropertyListing` to copy times from listing to hotel.
   - Update all hotel record reconstructions to carry the new fields.
   - Add `updateHotelTimes(checkInTime, checkOutTime)` — owner-only, updates hotel record directly (same pattern as `updateHotelRules`).

2. **Frontend — List Your Property form (App.tsx)**
   - Add `checkInTime` and `checkOutTime` to the form state (defaults: "12:00 PM", "11:00 AM").
   - Add time input fields (text inputs with time format hints) in the Hotel Details section.
   - Pass the two new fields to `submitPropertyListing`.

3. **Frontend — Hotel Detail Page (App.tsx)**
   - Replace hardcoded "12:00 PM" / "11:00 AM" strings with `hotel.checkInTime` / `hotel.checkOutTime` from the fetched hotel object.
   - Update subtitle hints accordingly (dynamic based on value).

4. **Frontend — Owner Dashboard (OwnerDashboard.tsx)**
   - Add a "Times" tab to `DashboardTab` type.
   - Build a `TimesTab` component: two text inputs for Check-in Time and Check-out Time, pre-filled with current hotel values, with a Save button that calls `updateHotelTimes`.
   - Add the tab button in the tab bar.
   - Wire the mutation and invalidate the hotel query on success.
