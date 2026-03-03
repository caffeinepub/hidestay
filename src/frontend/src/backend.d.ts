import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface HotelQueryParams {
    city?: string;
    amenities?: Array<string>;
    maxPrice?: bigint;
    minPrice?: bigint;
}
export interface Hotel {
    id: bigint;
    starRating: bigint;
    city: string;
    pricePerNight: bigint;
    name: string;
    description: string;
    amenities: Array<string>;
    approvalStatus: HotelApprovalStatus;
    address: string;
    imageIndex: bigint;
}
export interface RoomInventory {
    availableRooms: bigint;
    hotelId: bigint;
    roomType: string;
    totalRooms: bigint;
}
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
    city: string;
    pricePerNight: bigint;
    subscriptionPlan: string;
    ownerPhone: string;
    submittedAt: bigint;
    submittedBy: Principal;
    description: string;
    amenities: Array<string>;
    address: string;
    roomType: string;
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
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
}
export interface BlockedDate {
    id: bigint;
    date: string;
    hotelId: bigint;
    reason: string;
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
    approveHotel(id: bigint): Promise<void>;
    approvePropertyListing(listingId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignHotelOwner(hotelId: bigint, ownerPrincipal: Principal): Promise<void>;
    blockDate(date: string, reason: string): Promise<void>;
    cancelBooking(id: bigint): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "error";
        error: string;
    }>;
    createBooking(hotelId: bigint, guestName: string, guestEmail: string, phone: string, checkIn: string, checkOut: string, guestCount: bigint, created: bigint): Promise<bigint>;
    getAllBookings(): Promise<Array<Booking>>;
    getBlockedDates(): Promise<Array<BlockedDate>>;
    getBooking(id: bigint): Promise<Booking>;
    getBookingsByEmail(email: string): Promise<Array<Booking>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getHotel(id: bigint): Promise<Hotel>;
    getHotelsForAdmin(): Promise<Array<Hotel>>;
    getMyBookings(): Promise<Array<Booking>>;
    getMyCustomerProfile(): Promise<CustomerProfile | null>;
    getMyPropertyListings(): Promise<Array<PropertyListing>>;
    getOwnerBookings(): Promise<Array<Booking>>;
    getOwnerHotel(): Promise<Hotel>;
    getOwnerRoomInventory(): Promise<RoomInventory>;
    getPropertyListings(): Promise<Array<PropertyListing>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isCallerHotelOwner(): Promise<boolean>;
    loginCustomer(email: string, password: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "error";
        error: string;
    }>;
    registerCustomer(name: string, email: string, mobile: string, password: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "error";
        error: string;
    }>;
    rejectHotel(id: bigint): Promise<void>;
    rejectPropertyListing(id: bigint): Promise<void>;
    revokeHotelOwner(hotelId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchHotels(queryParams: HotelQueryParams): Promise<Array<Hotel>>;
    submitPropertyListing(ownerName: string, ownerPhone: string, ownerEmail: string, hotelName: string, city: string, address: string, pricePerNight: bigint, roomType: string, amenities: Array<string>, description: string, subscriptionPlan: string, submittedAt: bigint): Promise<bigint>;
    suspendHotel(id: bigint): Promise<void>;
    unblockDate(blockedDateId: bigint): Promise<void>;
    updateBookingStatus(bookingId: bigint, newStatus: Status): Promise<void>;
    updateCustomerProfile(name: string, email: string, mobile: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "error";
        error: string;
    }>;
    updateRoomInventory(roomType: string, totalRooms: bigint): Promise<void>;
}
