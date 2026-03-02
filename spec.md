# HIDESTAY

## Current State
- Backend has 15 seeded hotels across Mumbai, Delhi, Goa, Jaipur, Hyderabad, Chennai, Bangalore
- Each hotel has a single `imageIndex` (1-10) pointing to shared hotel images
- Frontend renders one image per hotel card using `getHotelImageSrc(imageIndex)`
- Hotel type: id, name, city, description, starRating, pricePerNight, amenities, address, imageIndex
- No "roomType" or explicit "payAtHotel" / "availability" fields in the Hotel type

## Requested Changes (Diff)

### Add
- 20 new demo hotels replacing the existing 15, spread across 6 cities: Patna (4), Gaya (3), Muzaffarpur (3), Ranchi (4), Varanasi (3), Lucknow (3)
- Each hotel: name, 3 images (represented via imageIndex cycling through city-specific image assets), pricePerNight, amenities (WiFi/AC/Parking variants), roomType (encoded in description), availability=true (all hotels available), payAtHotel=true (already platform-wide)
- New hotel images generated per city (6 city-themed hotel images: patna-hotel, gaya-hotel, muzaffarpur-hotel, ranchi-hotel, varanasi-hotel, lucknow-hotel) plus enough variation (3 per city = 18 images mapped to imageIndex 1-18)
- Frontend image helper updated to reference new city-specific images
- Hotel card updated to show room type badge
- nextHotelId updated to 21

### Modify
- `initializeHotels()` in main.mo: replace all 15 existing hotels with 20 Bihar/UP/Jharkhand hotels
- `getHotelImageSrc` in App.tsx: update to support imageIndex 1-20 mapping to new generated images
- Hotel card: show room type from description prefix

### Remove
- All old hotel seed data (Mumbai, Delhi, Goa, Jaipur, Hyderabad, Chennai, Bangalore hotels)

## Implementation Plan
1. Generate 6 city-themed hotel images (one base per city, 3 variants each = 18 total images)
2. Update `initializeHotels()` in main.mo with 20 Bihar/nearby hotels, imageIndex 1-18
3. Update frontend `getHotelImageSrc()` to map indexes 1-18 to new city hotel images
4. Update hotel card to display room type (extracted from description)
5. Build and validate
