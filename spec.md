# HIDESTAY

## Current State

- Super Admin Panel has a Bookings tab that calls `getAllBookings()` which returns raw `Booking[]`
- `Booking` type has: id, hotelId, guestName, guestEmail, phone, checkIn, checkOut, guestCount, status, created, owner
- The BookingsTab currently shows: guest name, email, phone, Hotel #ID (not name), check-in/out, guest count, booking ID, status badge
- Missing fields: hotel name, hotel city, total amount, payment mode, booking date formatted, city filter
- The backend has no enriched booking view — hotel info requires a separate lookup
- `getAllBookings()` returns bookings unsorted (frontend sorts by `created` desc)

## Requested Changes (Diff)

### Add
- New `AdminBookingView` type in Motoko: all Booking fields + hotelName, hotelCity, totalAmount (pricePerNight * nights), paymentMode (hardcoded "Pay at Hotel")
- New `getAdminBookings()` backend endpoint that returns `[AdminBookingView]` sorted by created desc, joining hotel data for each booking
- City filter dropdown in BookingsTab (derived from unique cities in loaded bookings)
- Status filter (already exists, keep)
- Total amount column computed from hotel pricePerNight and number of nights between checkIn and checkOut
- Display hotel name and city per booking row
- Display number of guests
- Display total amount with ₹ formatting
- Display payment mode badge ("Pay at Hotel")
- Display booking ID and booking date

### Modify
- BookingsTab: replace Hotel #ID display with hotel name + city
- BookingsTab: add total amount, payment mode, booking date fields to each card
- BookingsTab: add city filter dropdown
- BookingsTab: ensure data comes from `getAdminBookings()` (new enriched endpoint) instead of `getAllBookings()`
- backend.d.ts: add `AdminBookingView` interface and `getAdminBookings()` method

### Remove
- Nothing removed

## Implementation Plan

1. Add `AdminBookingView` type to `main.mo` with hotelName, hotelCity, totalAmount (Int), paymentMode (Text)
2. Add `getAdminBookings()` query function to `main.mo` — admin-only, joins hotel data, computes totalAmount from nights * pricePerNight, sorts by created desc
3. Update `backend.d.ts` to add `AdminBookingView` interface and `getAdminBookings()` method signature
4. Update `SuperAdminPanel.tsx` BookingsTab:
   - Change data type from `Booking[]` to `AdminBookingView[]`
   - Replace `hotelId` display with `hotelName` + `hotelCity`
   - Add total amount display
   - Add "Pay at Hotel" payment mode badge
   - Add city filter dropdown (unique cities from loaded bookings)
   - Keep status filter
   - Add booking date formatted display
   - Ensure sorted latest first (backend handles this, frontend preserves order)
5. Update main SuperAdminPanel query to use `getAdminBookings()` instead of `getAllBookings()`
