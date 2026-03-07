# HIDESTAY

## Current State
- Hotel cards in search results show an image but it is NOT clickable — only the "View Details" button opens the hotel detail page.
- `HotelDetailPage` already exists with a gallery section that renders uploaded images (via `getHotelImageUrls`) with a fallback to seeded images.
- The desktop gallery shows a fixed grid (no click-to-fullscreen). The mobile carousel has prev/next arrows but no fullscreen.
- No lightbox / fullscreen image preview exists anywhere in the app.
- `HotelCard` renders the image in a `<div>` with no click handler on the image itself; only the "View Details" `<Button>` calls `onViewDetails(hotel)`.

## Requested Changes (Diff)

### Add
- Clickable hotel image on `HotelCard`: wrapping the image `<div>` in a button/clickable area that calls `onViewDetails(hotel)`, navigating to the hotel detail page.
- Fullscreen image lightbox component (`ImageLightbox`): renders a full-viewport dark overlay with the selected image, prev/next navigation arrows, keyboard (ArrowLeft/ArrowRight/Escape) support, image counter (e.g. "2 / 5"), and a close button.
- Click-to-open lightbox on every gallery image in `HotelDetailPage` (both desktop grid and mobile carousel images).
- Cursor pointer and a subtle hover overlay on all gallery images to signal they are clickable.
- Default placeholder image (`/assets/generated/hotel-placeholder.dim_800x500.jpg`) shown when `imageSrcs` is empty or all images fail to load.

### Modify
- `HotelCard`: wrap the image container with an `onClick` that calls `onViewDetails(hotel)`. Add `cursor-pointer` and hover scale effect to the image container (already has group hover scale — just needs the click handler).
- `HotelDetailPage` desktop gallery images: add `onClick={() => openLightbox(idx)}` and `cursor-pointer` to each `<img>`.
- `HotelDetailPage` mobile carousel: add `onClick={() => openLightbox(activeImageIndex)}` to the active image.
- `imageSrcs` derivation: ensure an empty array falls back to the placeholder image so the gallery never renders empty.

### Remove
- Nothing removed.

## Implementation Plan
1. Add a `hotel-placeholder.dim_800x500.jpg` placeholder generation call (or reuse an existing Rishikesh image as the default placeholder).
2. Create an `ImageLightbox` component (inline in App.tsx or as a separate file) with:
   - Props: `images: string[]`, `initialIndex: number`, `onClose: () => void`
   - State: `currentIndex`
   - Prev / Next handlers with wrap-around
   - Keyboard listener (ArrowLeft, ArrowRight, Escape) via `useEffect`
   - Framer Motion fade animation for image transitions
   - Dark overlay backdrop with `z-50`
   - Image counter badge and close button
3. Add `lightboxOpen`, `lightboxIndex` state to `HotelDetailPage`.
4. On `HotelCard`, add `onClick` to the image wrapper `<div>` that calls `onViewDetails(hotel)`, plus `cursor-pointer` styling and `data-ocid="hotel.card_image.{index}"`.
5. On `HotelDetailPage` desktop gallery, add `onClick={() => openLightbox(idx)}` to each image wrapper.
6. On `HotelDetailPage` mobile carousel, add `onClick={() => openLightbox(activeImageIndex)}` to the animated image.
7. Ensure `imageSrcs` fallback includes the placeholder when the array would otherwise be empty.
8. Validate build (typecheck, lint, build).
