# HIDESTAY

## Current State
- `Hotel` type has `imageIndex: Nat` (integer used to index into a static 15-image map) but NO `imageUrls: [Text]` field
- When `approvePropertyListing` runs, it creates a Hotel with `imageIndex = 0` and silently discards `listing.imageUrls`
- `HotelCard` calls `getHotelImageSrc(hotel.imageIndex)` — index 0 has no mapping, so it always falls back to the placeholder image
- `HotelDetailPage` accepts `uploadedImageUrls` as a prop, but `handleViewDetails` always sets `selectedHotelImages = []`, so images are never passed in
- Result: hotels submitted by owners via "List Your Property" always show placeholder images, even after admin approval

## Requested Changes (Diff)

### Add
- `imageUrls: [Text]` field to the `Hotel` type in Motoko
- A new `getHotelImageUrls(hotelId: Nat) : async [Text]` query that returns the stored image URLs for any hotel (public, no auth required)

### Modify
- `approvePropertyListing`: when creating the Hotel record, copy `listing.imageUrls` into `hotel.imageUrls`
- All other functions that reconstruct Hotel records (`approveHotel`, `rejectHotel`, `suspendHotel`, `updateHotelRules`, `addHotelAdmin`) must carry the `imageUrls` field through to avoid compile errors
- **Frontend `HotelCard`**: update `src` to prefer `hotel.imageUrls[0]` when available, fall back to `getHotelImageSrc(hotel.imageIndex)`
- **Frontend `HotelDetailPage`**: 
  - Remove the `uploadedImageUrls` prop entirely
  - Inside the component, call `getHotelImageUrls(hotelId)` directly from the backend
  - Use those URLs as the gallery images, fall back to `imageIndex`-based images for seeded hotels with no URLs
- **Frontend `handleViewDetails`**: remove the now-redundant `setSelectedHotelImages([])` call
- **Frontend `AppInner`**: remove `selectedHotelImages` state and the `uploadedImageUrls` prop on `HotelDetailPage`
- Placeholder image: use `/assets/generated/rishikesh-hotel-1.dim_800x500.jpg` as the default fallback

### Remove
- `selectedHotelImages` state in `AppInner`
- `uploadedImageUrls` prop on `HotelDetailPage`

## Implementation Plan
1. Regenerate Motoko backend with `imageUrls: [Text]` on `Hotel`, carried through all Hotel-constructing functions, and `getHotelImageUrls` public query
2. Update frontend:
   - `HotelCard`: use `hotel.imageUrls[0]` if present, else `getHotelImageSrc`
   - `HotelDetailPage`: fetch image URLs directly via `getHotelImageUrls`, drop `uploadedImageUrls` prop
   - `AppInner`: remove `selectedHotelImages` state and prop
3. Validate build
