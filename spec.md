# HIDESTAY

## Current State

A hotel booking platform for Bihar and nearby states. Features:
- Hotel search and listing with 20 seeded demo hotels
- Booking modal (Pay at Hotel flow) connected to backend `createBooking`
- Header with "List Your Property" button that opens a `SubscriptionModal` -- shows 3 subscription plan cards with a "Contact Us" CTA but **does not collect or save any hotel data**
- Hotel Admin Panel (full-page) with booking lookup by email and subscription plan display
- Authorization system with admin role

## Requested Changes (Diff)

### Add
- `PropertyListing` type in backend with fields: id, ownerName, ownerPhone, ownerEmail, hotelName, city, address, pricePerNight, roomType, amenities, description, subscriptionPlan, status (`#PendingApproval` | `#Approved` | `#Rejected`), submittedAt (Int)
- `submitPropertyListing` backend function: saves a new PropertyListing with status `#PendingApproval`
- `getPropertyListings` backend query: admin-only, returns all property listings
- `getMyPropertyListings` backend query: returns listings submitted by the caller
- A proper multi-field "List Your Property" form modal (replaces the subscription-plan-only modal):
  - Fields: Hotel Name, City, Address, Price Per Night, Room Type (select), Amenities (checkboxes), Description, Owner Name, Owner Phone, Owner Email, Subscription Plan (radio)
  - On submit: calls `submitPropertyListing`, shows a confirmation/success state with "Application submitted — Pending Approval" message
- Super Admin dashboard "Pending Submissions" section in the Admin Panel:
  - Shows a notification badge/count of pending submissions on the Admin Panel button in the header
  - Lists all submitted properties with status badges (Pending Approval / Approved / Rejected)
  - Approve and Reject action buttons per submission

### Modify
- `SubscriptionModal` → replaced by `ListPropertyModal` with the actual form
- Admin Panel header button to show a badge with pending submission count
- Admin Panel to include a "Property Submissions" section above the Bookings section

### Remove
- The current `SubscriptionModal` (subscription plans moved into the List Property form as a plan selection step)
