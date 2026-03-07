# HIDESTAY

## Current State

- `Hotel` type has no `ownerEmail` or `ownerPrincipal` fields.
- Ownership is tracked via a separate `hotelOwners: Map<Principal, Nat>` (principal → hotelId).
- `approvePropertyListing` correctly calls `hotelOwners.add(listing.submittedBy, hotelId)` when approving.
- `getOwnerHotel()` and `isCallerHotelOwner()` use the caller's II principal to look up their hotel from `hotelOwners`.
- The frontend `useIsOwner` hook checks `isCallerHotelOwner()` using the II principal.
- `OwnerDashboard` calls `getOwnerHotel()` to load the correct hotel by the logged-in principal.
- The dashboard visibility button relies on `isOwner` being true (from `isCallerHotelOwner()`).
- Issue: `Hotel` type lacks `ownerEmail` and `ownerPrincipal`, so ownership metadata is not persisted with the hotel record itself — it only lives in the `hotelOwners` side-map.
- Issue: If `hotelOwners` ever gets out of sync (e.g. a hotel is re-approved or admin uses `addHotelAdmin`), ownership data is lost.
- Issue: No `getOwnerHotelById` or reverse lookup exists — if a hotel owner's principal is not in `hotelOwners`, the dashboard shows "Hotel Not Assigned" even if the hotel was correctly submitted.
- Issue: `addHotelAdmin` does not set an owner in `hotelOwners` at all.

## Requested Changes (Diff)

### Add
- `ownerEmail: Text` and `ownerPrincipal: Text` fields to the `Hotel` type.
- Store `ownerEmail` and `ownerPrincipal` in every hotel record created via `approvePropertyListing` (using `listing.ownerEmail` and `Principal.toText(listing.submittedBy)`).
- New backend query `getOwnerHotelByEmail(email: Text): Hotel` — admin-only helper to diagnose ownership issues; returns hotel where `hotel.ownerEmail == email`.
- Ensure `hotelOwners.add(listing.submittedBy, hotelId)` is still called on approval (already exists, keep it).
- `getOwnerHotel()` already uses `hotelOwners.get(caller)` — keep this as primary lookup; add a fallback that also searches hotels by `ownerPrincipal == Principal.toText(caller)` if the map lookup fails, to self-heal broken state.

### Modify
- `approvePropertyListing`: set `ownerEmail = listing.ownerEmail` and `ownerPrincipal = Principal.toText(listing.submittedBy)` in the new hotel record.
- `getOwnerHotel()`: add fallback lookup by `ownerPrincipal` field if `hotelOwners` map has no entry for caller. If found via fallback, also re-add entry to `hotelOwners` map to self-heal.
- `approveHotel`, `rejectHotel`, `suspendHotel`, `addHotelAdmin`: carry `ownerEmail` and `ownerPrincipal` fields when rebuilding hotel records (use empty string `""` as default since these hotels are not submitted via owner flow).
- `updateHotelRules`: carry `ownerEmail` and `ownerPrincipal` when updating hotel record.

### Remove
- Nothing removed.

## Implementation Plan

1. Update `Hotel` type: add `ownerEmail: Text` and `ownerPrincipal: Text`.
2. Update every place that constructs a `Hotel` record to include these two fields (approvePropertyListing sets real values; all other places use `""`).
3. Update `getOwnerHotel()` to add fallback: if `hotelOwners.get(caller)` returns null, scan hotels for one where `hotel.ownerPrincipal == Principal.toText(caller)`; if found, re-add to `hotelOwners` map and return hotel.
4. Add `getOwnerHotelByEmail` admin-only query.
5. Update `backend.d.ts` types to include new Hotel fields.
6. Frontend `OwnerDashboard`: no structural changes needed — it already calls `getOwnerHotel()` correctly. The fix is purely in the backend self-healing logic.
7. Ensure all existing hotel records (seeded) compile cleanly with empty string defaults for new fields.
