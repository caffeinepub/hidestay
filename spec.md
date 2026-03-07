# HIDESTAY

## Current State
The Hotel Owner Dashboard has 5 tabs: Overview, Bookings, Inventory, Calendar, Rules. Owners can view hotel info, manage bookings, update total room count, block/unblock calendar dates, and edit rules text. There is no way to edit core property details (name, address, description, contact info), upload/delete hotel images, or set pricing/discounts.

Backend has: `updateHotelRules`, `updateRoomInventory`, `getOwnerHotel`, `getOwnerRoomInventory`, `getHotelImageUrls`. No endpoint exists to update hotel details, images, or pricing.

## Requested Changes (Diff)

### Add
- Backend: `updateHotelDetails(name, address, description, contactInfo)` — owner-only, updates name/address/description/contact on the hotel record
- Backend: `updateHotelPricing(pricePerNight, discount)` — owner-only, updates pricing and discount fields
- Backend: `updateHotelImages(imageUrls)` — owner-only, replaces hotel imageUrls array
- Backend: `Hotel` type gains `contactInfo: Text` and `discount: Nat` fields (discount = % off, 0 means none)
- Frontend: New "Edit Property" tab (6th tab) in Owner Dashboard
  - Section 1: Property Details form (hotel name, address, description, contact info) with Save
  - Section 2: Pricing & Discounts form (price per night, discount %) with Save
  - Section 3: Hotel Images manager (upload new images via blob storage, delete individual images, drag-to-reorder) with Save
- Frontend: Inventory tab extended to allow setting available rooms directly (not just total rooms), with separate total/available fields
- Frontend: Overview tab quick-action button added for "Edit Property"
- Changes reflect instantly on the public hotel detail page (already reads from `getHotel`/`searchHotels` which return the live hotel record)

### Modify
- Backend: `Hotel` type — add `contactInfo: Text` and `discount: Nat` fields
- Backend: All places that construct a Hotel record (approveHotel, rejectHotel, suspendHotel, approvePropertyListing, updateHotelRules) must carry through `contactInfo` and `discount`
- Backend: `updateRoomInventory` — already accepts `totalRooms` and `availableRooms`; frontend currently passes same value for both; fix frontend to send separate values
- Frontend: `InventoryTab` — add `availableRooms` field as a separate editable field
- Frontend: `OverviewTab` — add "Edit Property" quick action button
- Frontend: `DashboardTab` type — add `"edit"` variant
- Frontend: `TABS` array — add "Edit Property" tab entry

### Remove
- Nothing removed

## Implementation Plan
1. Update `Hotel` type in main.mo to include `contactInfo: Text` and `discount: Nat`
2. Update all hotel record construction sites to include the two new fields (default empty/0 for existing hotels)
3. Add `updateHotelDetails(name, address, description, contactInfo)` owner-only endpoint
4. Add `updateHotelPricing(pricePerNight, discount)` owner-only endpoint
5. Add `updateHotelImages(imageUrls)` owner-only endpoint
6. Update `backend.d.ts` to reflect new Hotel fields and new methods
7. Add `EditPropertyTab` component with three form sections: Details, Pricing, Images
8. Add `"edit"` to `DashboardTab` type and add tab entry to `TABS` array
9. Wire blob-storage upload in EditPropertyTab image section
10. Fix InventoryTab to send separate totalRooms and availableRooms values
11. Add "Edit Property" quick-action button in OverviewTab
