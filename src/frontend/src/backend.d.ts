import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
    address: string;
    imageIndex: bigint;
}
export interface UserProfile {
    name: string;
    email: string;
    phone: string;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelBooking(id: bigint): Promise<void>;
    createBooking(hotelId: bigint, guestName: string, guestEmail: string, phone: string, checkIn: string, checkOut: string, guestCount: bigint, created: bigint): Promise<bigint>;
    getBooking(id: bigint): Promise<Booking>;
    getBookingsByEmail(email: string): Promise<Array<Booking>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getHotel(id: bigint): Promise<Hotel>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchHotels(queryParams: HotelQueryParams): Promise<Array<Hotel>>;
}
