import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface CustomerProfile {
    name: string;
    email: string;
    memberSince: bigint;
    passwordHash: string;
    mobile: string;
}
export interface PropertyListing {
    id: bigint;
    ownerEmail: string;
    status: PropertyListingStatus;
    hotelName: string;
    ownerName: string;
    imageUrls: Array<string>;
    city: string;
    pricePerNight: bigint;
    subscriptionPlan: string;
    ownerPhone: string;
    submittedAt: bigint;
    submittedBy: Principal;
    description: string;
    checkInTime: string;
    amenities: Array<string>;
    address: string;
    checkOutTime: string;
    kycDocumentUrl: string;
    roomType: string;
    rules: string;
}
export interface HotelQueryParams {
    city?: string;
    amenities?: Array<string>;
    maxPrice?: bigint;
    minPrice?: bigint;
}
export interface Hotel {
    id: bigint;
    ownerEmail: string;
    starRating: bigint;
    imageUrls: Array<string>;
    city: string;
    ownerPrincipal: string;
    pricePerNight: bigint;
    name: string;
    description: string;
    checkInTime: string;
    amenities: Array<string>;
    approvalStatus: HotelApprovalStatus;
    address: string;
    checkOutTime: string;
    imageIndex: bigint;
    rules: string;
}
export interface RoomInventory {
    availableRooms: bigint;
    hotelId: bigint;
    roomType: string;
    totalRooms: bigint;
}
export interface Booking {
    id: bigint;
    status: Status;
    created: bigint;
    checkIn: string;
    owner: Principal;
    guestCount: bigint;
    hotelId: bigint;
    guestName: string;
    guestEmail: string;
    checkOut: string;
    phone: string;
}
export interface BlockedDate {
    id: bigint;
    date: string;
    hotelId: bigint;
    reason: string;
}
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export enum HotelApprovalStatus {
    Approved = "Approved",
    Rejected = "Rejected",
    Pending = "Pending"
}
export enum PropertyListingStatus {
    Approved = "Approved",
    Rejected = "Rejected",
    PendingApproval = "PendingApproval"
}
export enum Status {
    Confirmed = "Confirmed",
    Cancelled = "Cancelled",
    Pending = "Pending"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addHotelAdmin(name: string, city: string, description: string, starRating: bigint, pricePerNight: bigint, amenities: Array<string>, address: string, imageIndex: bigint, imageUrls: Array<string>, rules: string, checkInTime: string, checkOutTime: string): Promise<bigint>;
    approveHotel(id: bigint): Promise<void>;
    approvePropertyListing(listingId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignHotelOwner(user: Principal, hotelId: bigint): Promise<void>;
    blockDate(date: string, reason: string): Promise<bigint>;
    cancelBooking(id: bigint): Promise<void>;
    changeCustomerPassword(newPasswordHash: string): Promise<void>;
    createBooking(hotelId: bigint, guestName: string, guestEmail: string, phone: string, checkIn: string, checkOut: string, guestCount: bigint): Promise<bigint>;
    generateAdminOtp(): Promise<string>;
    getAdminLockStatus(): Promise<boolean>;
    getAllBookings(): Promise<Array<Booking>>;
    getBlockedDates(): Promise<Array<BlockedDate>>;
    getBooking(id: bigint): Promise<Booking>;
    getBookingsByEmail(email: string): Promise<Array<Booking>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomerProfile(): Promise<CustomerProfile | null>;
    getHotel(id: bigint): Promise<Hotel>;
    getHotelImageUrls(id: bigint): Promise<Array<string>>;
    getHotelsForAdmin(): Promise<Array<Hotel>>;
    getKycDocumentUrl(listingId: bigint): Promise<string>;
    getMyBookings(): Promise<Array<Booking>>;
    getMyPropertyListings(): Promise<Array<PropertyListing>>;
    getOwnerBookings(): Promise<Array<Booking>>;
    getOwnerHotel(): Promise<Hotel>;
    getOwnerHotelByEmail(email: string): Promise<Hotel>;
    getOwnerRoomInventory(): Promise<RoomInventory>;
    getPropertyListings(): Promise<Array<PropertyListing>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerHotelOwner(): Promise<boolean>;
    loginCustomer(email: string, passwordHash: string): Promise<boolean>;
    registerCustomer(name: string, email: string, mobile: string, passwordHash: string): Promise<void>;
    rejectHotel(id: bigint): Promise<void>;
    rejectPropertyListing(listingId: bigint): Promise<void>;
    revokeHotelOwner(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchHotels(queryParams: HotelQueryParams): Promise<Array<Hotel>>;
    submitPropertyListing(ownerName: string, ownerPhone: string, ownerEmail: string, hotelName: string, city: string, address: string, pricePerNight: bigint, roomType: string, amenities: Array<string>, description: string, subscriptionPlan: string, submittedAt: bigint, imageUrls: Array<string>, kycDocumentUrl: string, rules: string, checkInTime: string, checkOutTime: string): Promise<bigint>;
    suspendHotel(id: bigint): Promise<void>;
    unblockDate(blockedDateId: bigint): Promise<void>;
    unlockAdminAccount(): Promise<void>;
    updateBookingStatus(bookingId: bigint, newStatus: Status): Promise<void>;
    updateCustomerProfile(name: string, email: string, mobile: string): Promise<void>;
    updateHotelRules(rules: string): Promise<void>;
    updateHotelTimes(checkInTime: string, checkOutTime: string): Promise<void>;
    updateRoomInventory(totalRooms: bigint, availableRooms: bigint): Promise<void>;
    verifyAdminOtp(code: string): Promise<boolean>;
}
