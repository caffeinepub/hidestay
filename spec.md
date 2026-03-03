# HIDESTAY — KYC Document Upload for List Your Property

## Current State

- "List Your Property" form (`ListPropertyModal` in `App.tsx`) allows hotel image upload (up to 5 JPG/PNG, 2MB each) via blob storage
- `PropertyListing` type in `main.mo` has `imageUrls: [Text]` field
- `submitPropertyListing` backend function accepts `imageUrls` parameter
- Blob storage (`MixinStorage`) is already integrated for hotel image uploads
- Super Admin Panel (`SuperAdminPanel.tsx`) shows property listings in the Subscriptions tab with approve/reject actions

## Requested Changes (Diff)

### Add
- KYC document upload field in "List Your Property" form, positioned after the Hotel Images section
- KYC upload accepts only JPG and PNG files, max 2MB, single file
- Preview of KYC document before submission (thumbnail)
- KYC document URL stored as a separate field in `PropertyListing` backend type
- `kycDocumentUrl: Text` field added to `PropertyListing` type in Motoko
- `submitPropertyListing` Motoko function updated to accept `kycDocumentUrl: Text` parameter
- KYC file uploaded to blob storage with a distinct path prefix (e.g., `kyc/`) to distinguish from hotel images
- A new admin-only query `getKycDocumentUrl(listingId: Nat)` that returns the KYC URL only to super_admin callers — KYC files never exposed to public or non-admin users
- In the Super Admin Panel Subscriptions tab: display a "View KYC" button per listing that fetches and shows the KYC document image in a secure preview dialog (admin-only, server-gated)

### Modify
- `PropertyListing` type: add `kycDocumentUrl: Text` field (empty string if not uploaded)
- `submitPropertyListing`: add `kycDocumentUrl` parameter
- `approvePropertyListing` and `rejectPropertyListing` functions: propagate `kycDocumentUrl` in the updated listing record
- `ListPropertyModal` (App.tsx): add KYC upload section below Hotel Images section
  - Single file input (not multiple), JPG/PNG only, 2MB limit
  - Preview thumbnail before submission
  - Upload to blob storage on submit (same StorageClient pattern used for hotel images)
  - Pass `kycDocumentUrl` to `submitPropertyListing`
- Super Admin Panel Subscriptions tab: add "View KYC" button that calls `getKycDocumentUrl` and shows the image in a modal dialog

### Remove
- Nothing removed

## Implementation Plan

1. Update `PropertyListing` Motoko type to include `kycDocumentUrl: Text`
2. Update `submitPropertyListing` to accept and store `kycDocumentUrl`
3. Update `approvePropertyListing` and `rejectPropertyListing` to propagate `kycDocumentUrl`
4. Add `getKycDocumentUrl(listingId: Nat)` admin-only query returning `Text`
5. Regenerate backend to update `backend.d.ts` bindings
6. In `ListPropertyModal` (App.tsx): add KYC upload state, file input, preview, and upload logic mirroring hotel image pattern (single file, distinct variable)
7. Pass `kycDocumentUrl` string to `submitPropertyListing` call
8. In `SuperAdminPanel.tsx` Subscriptions tab: add "View KYC" button per listing, call `getKycDocumentUrl`, show image in a dialog
9. Validate and build cleanly
