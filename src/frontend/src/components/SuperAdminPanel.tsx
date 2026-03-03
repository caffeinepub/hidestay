import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  HelpCircle,
  Hotel,
  Info,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Moon,
  Phone,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Star,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  Booking,
  Hotel as HotelType,
  PropertyListing,
} from "../backend.d";
import {
  HotelApprovalStatus,
  PropertyListingStatus,
  Status,
  UserRole,
} from "../backend.d";
import { useAdminCredentials } from "../hooks/useAdminCredentials";
import {
  PasswordStrengthBar,
  getPasswordStrengthScore,
} from "./PasswordStrengthBar";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Props
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_WARN_MS = 5 * 60 * 1000; // warn at 5 minutes remaining

interface SuperAdminPanelProps {
  open: boolean;
  onClose: () => void;
  actor: import("../backend").backendInterface | null;
  isAdmin: boolean;
  isOtpVerified: boolean;
  onOtpVerified: () => void;
  onSessionTimeout: () => void;
  adminPrincipalId?: string;
}

type AdminTab =
  | "dashboard"
  | "hotels"
  | "bookings"
  | "users"
  | "subscriptions"
  | "security";

// Enriched booking type — joins Booking with Hotel data on the frontend
interface EnrichedBooking extends Booking {
  hotelName: string;
  hotelCity: string;
  totalAmount: bigint;
  paymentMode: string;
  nights: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(ts: bigint | string): string {
  try {
    if (typeof ts === "bigint") {
      // nanoseconds to ms
      return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(ts);
  }
}

function formatPrice(price: bigint): string {
  return new Intl.NumberFormat("en-IN").format(Number(price));
}

function computeNights(checkIn: string, checkOut: string): number {
  try {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.round(ms / 86_400_000));
  } catch {
    return 1;
  }
}

function enrichBookings(
  bookings: Booking[],
  hotels: HotelType[],
): EnrichedBooking[] {
  const hotelMap = new Map(hotels.map((h) => [h.id.toString(), h]));
  return bookings
    .map((b) => {
      const hotel = hotelMap.get(b.hotelId.toString());
      const nights = computeNights(b.checkIn, b.checkOut);
      const totalAmount = hotel ? hotel.pricePerNight * BigInt(nights) : 0n;
      return {
        ...b,
        hotelName: hotel?.name ?? `Hotel #${b.hotelId.toString()}`,
        hotelCity: hotel?.city ?? "Unknown",
        totalAmount,
        paymentMode: "Pay at Hotel",
        nights,
      };
    })
    .sort((a, b) => Number(b.created - a.created));
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Badge Components
// ─────────────────────────────────────────────────────────────────────────────

function HotelStatusBadge({ status }: { status: HotelApprovalStatus }) {
  if (status === HotelApprovalStatus.Approved) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </Badge>
    );
  }
  if (status === HotelApprovalStatus.Pending) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-xs gap-1">
      <Ban className="w-3 h-3" />
      Rejected / Suspended
    </Badge>
  );
}

function BookingStatusBadge({ status }: { status: Status }) {
  if (status === Status.Confirmed) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Confirmed
      </Badge>
    );
  }
  if (status === Status.Pending) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-xs gap-1">
      <XCircle className="w-3 h-3" />
      Cancelled
    </Badge>
  );
}

function ListingStatusBadge({ status }: { status: PropertyListingStatus }) {
  if (status === PropertyListingStatus.Approved) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </Badge>
    );
  }
  if (status === PropertyListingStatus.PendingApproval) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs gap-1">
        <AlertCircle className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-xs gap-1">
      <XCircle className="w-3 h-3" />
      Rejected
    </Badge>
  );
}

function SubscriptionPlanBadge({ plan }: { plan: string }) {
  const lPlan = plan.toLowerCase();
  if (lPlan.includes("premium")) {
    return (
      <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 font-semibold text-xs gap-1">
        <Crown className="w-3 h-3" />
        Premium
      </Badge>
    );
  }
  if (lPlan.includes("standard")) {
    return (
      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs gap-1">
        <Star className="w-3 h-3" />
        Standard
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-50 text-slate-600 border border-slate-200 font-semibold text-xs gap-1">
      <Layers className="w-3 h-3" />
      Basic
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  iconBg: string;
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  iconBg,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-center gap-3 ${bgColor}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-foreground leading-none">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Row
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
      <div className="skeleton-shimmer h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton-shimmer h-3.5 w-2/3 rounded" />
        <div className="skeleton-shimmer h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton-shimmer h-6 w-16 rounded-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardTabProps {
  hotels: HotelType[];
  bookings: Booking[];
  listings: PropertyListing[];
  hotelsLoading: boolean;
  bookingsLoading: boolean;
  listingsLoading: boolean;
}

function DashboardTab({
  hotels,
  bookings,
  listings,
  hotelsLoading,
  bookingsLoading,
  listingsLoading,
}: DashboardTabProps) {
  const totalHotels = hotels.length;
  const approvedHotels = hotels.filter(
    (h) => h.approvalStatus === HotelApprovalStatus.Approved,
  ).length;
  const pendingHotels = hotels.filter(
    (h) => h.approvalStatus === HotelApprovalStatus.Pending,
  ).length;
  const rejectedHotels = hotels.filter(
    (h) => h.approvalStatus === HotelApprovalStatus.Rejected,
  ).length;

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(
    (b) => b.status === Status.Confirmed,
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === Status.Cancelled,
  ).length;

  const totalListings = listings.length;
  const pendingListings = listings.filter(
    (l) => l.status === PropertyListingStatus.PendingApproval,
  ).length;

  const isLoading = hotelsLoading || bookingsLoading || listingsLoading;

  const recentBookings = [...bookings]
    .sort((a, b) => Number(b.created - a.created))
    .slice(0, 5);

  const recentListings = [...listings]
    .sort((a, b) => Number(b.submittedAt - a.submittedAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Platform Overview
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((k) => (
              <div key={k} className="skeleton-shimmer h-[76px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total Hotels"
              value={totalHotels}
              icon={<Hotel className="w-5 h-5" />}
              color="text-blue-600"
              bgColor="bg-blue-50/50 border-blue-100"
              iconBg="bg-blue-100"
            />
            <StatCard
              label="Approved Hotels"
              value={approvedHotels}
              icon={<BadgeCheck className="w-5 h-5" />}
              color="text-emerald-600"
              bgColor="bg-emerald-50/50 border-emerald-100"
              iconBg="bg-emerald-100"
            />
            <StatCard
              label="Pending Approval"
              value={pendingHotels}
              icon={<AlertCircle className="w-5 h-5" />}
              color="text-amber-600"
              bgColor="bg-amber-50/50 border-amber-100"
              iconBg="bg-amber-100"
            />
            <StatCard
              label="Suspended"
              value={rejectedHotels}
              icon={<Ban className="w-5 h-5" />}
              color="text-red-600"
              bgColor="bg-red-50/50 border-red-100"
              iconBg="bg-red-100"
            />
            <StatCard
              label="Total Bookings"
              value={totalBookings}
              icon={<BookOpen className="w-5 h-5" />}
              color="text-purple-600"
              bgColor="bg-purple-50/50 border-purple-100"
              iconBg="bg-purple-100"
            />
            <StatCard
              label="Confirmed"
              value={confirmedBookings}
              icon={<CheckCircle className="w-5 h-5" />}
              color="text-emerald-600"
              bgColor="bg-emerald-50/50 border-emerald-100"
              iconBg="bg-emerald-100"
            />
            <StatCard
              label="Cancelled"
              value={cancelledBookings}
              icon={<XCircle className="w-5 h-5" />}
              color="text-red-600"
              bgColor="bg-red-50/50 border-red-100"
              iconBg="bg-red-100"
            />
            <StatCard
              label="Listings / Pending"
              value={totalListings}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-orange-600"
              bgColor="bg-orange-50/50 border-orange-100"
              iconBg="bg-orange-100"
            />
          </div>
        )}
      </div>

      {/* Quick summary strip */}
      {!isLoading && (
        <div className="rounded-xl border border-border bg-gradient-to-r from-slate-50 to-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Platform Health
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${pendingHotels > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
              />
              {pendingHotels > 0
                ? `${pendingHotels} hotel(s) awaiting approval`
                : "All hotel submissions reviewed"}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${pendingListings > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
              />
              {pendingListings > 0
                ? `${pendingListings} listing(s) pending review`
                : "All listings up to date"}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {approvedHotels} hotels live in search
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            Recent Bookings
          </h3>
          {bookingsLoading ? (
            <div className="space-y-2">
              {["r1", "r2", "r3", "r4", "r5"].map((k) => (
                <SkeletonRow key={k} />
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <div
              data-ocid="super_admin.dashboard.bookings.empty_state"
              className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
            >
              No bookings yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id.toString()}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {booking.guestName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {booking.guestEmail} · Hotel #{booking.hotelId.toString()}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Listings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-4 h-4" />
            Recent Property Submissions
          </h3>
          {listingsLoading ? (
            <div className="space-y-2">
              {["p1", "p2", "p3", "p4", "p5"].map((k) => (
                <SkeletonRow key={k} />
              ))}
            </div>
          ) : recentListings.length === 0 ? (
            <div
              data-ocid="super_admin.dashboard.listings.empty_state"
              className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl"
            >
              No property submissions yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentListings.map((listing) => (
                <div
                  key={listing.id.toString()}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {listing.hotelName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {listing.ownerName} · {listing.city}
                    </p>
                  </div>
                  <ListingStatusBadge status={listing.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotels Tab
// ─────────────────────────────────────────────────────────────────────────────

interface HotelsTabProps {
  hotels: HotelType[];
  isLoading: boolean;
  onApprove: (id: bigint) => void;
  onSuspend: (id: bigint) => void;
  approveIsPending: boolean;
  suspendIsPending: boolean;
  pendingId: bigint | null;
}

function HotelsTab({
  hotels,
  isLoading,
  onApprove,
  onSuspend,
  approveIsPending,
  suspendIsPending,
  pendingId,
}: HotelsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = hotels.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" &&
        h.approvalStatus === HotelApprovalStatus.Approved) ||
      (statusFilter === "pending" &&
        h.approvalStatus === HotelApprovalStatus.Pending) ||
      (statusFilter === "rejected" &&
        h.approvalStatus === HotelApprovalStatus.Rejected);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="super_admin.hotels.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hotel name or city…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            data-ocid="super_admin.hotels.status_select"
            className="w-full sm:w-44"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected / Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {hotels.length} hotels
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {["h1", "h2", "h3", "h4", "h5", "h6"].map((k) => (
            <SkeletonRow key={k} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="super_admin.hotels.empty_state"
          className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl"
        >
          <Hotel className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hotels match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((hotel, idx) => {
            const isPending = pendingId === hotel.id;
            const isApproved =
              hotel.approvalStatus === HotelApprovalStatus.Approved;
            const isHotelPending =
              hotel.approvalStatus === HotelApprovalStatus.Pending;
            const isRejected =
              hotel.approvalStatus === HotelApprovalStatus.Rejected;

            return (
              <div
                key={hotel.id.toString()}
                data-ocid={`super_admin.hotels.item.${idx + 1}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <Hotel className="w-5 h-5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {hotel.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {hotel.city}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-foreground">
                        ₹{formatPrice(hotel.pricePerNight)}/night
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <HotelStatusBadge status={hotel.approvalStatus} />

                  {/* Actions */}
                  {isHotelPending && (
                    <>
                      <Button
                        data-ocid={`super_admin.hotels.approve_button.${idx + 1}`}
                        size="sm"
                        disabled={isPending && approveIsPending}
                        onClick={() => onApprove(hotel.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 gap-1"
                      >
                        {isPending && approveIsPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        Approve
                      </Button>
                      <Button
                        data-ocid={`super_admin.hotels.reject_button.${idx + 1}`}
                        size="sm"
                        variant="destructive"
                        disabled={isPending && suspendIsPending}
                        onClick={() => onSuspend(hotel.id)}
                        className="text-xs h-7 px-3 gap-1"
                      >
                        {isPending && suspendIsPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Reject
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      data-ocid={`super_admin.hotels.suspend_button.${idx + 1}`}
                      size="sm"
                      disabled={isPending && suspendIsPending}
                      onClick={() => onSuspend(hotel.id)}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3 gap-1"
                    >
                      {isPending && suspendIsPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Ban className="w-3 h-3" />
                      )}
                      Suspend
                    </Button>
                  )}

                  {isRejected && (
                    <Button
                      data-ocid={`super_admin.hotels.restore_button.${idx + 1}`}
                      size="sm"
                      disabled={isPending && approveIsPending}
                      onClick={() => onApprove(hotel.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 gap-1"
                    >
                      {isPending && approveIsPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bookings Tab
// ─────────────────────────────────────────────────────────────────────────────

interface BookingsTabProps {
  bookings: EnrichedBooking[];
  isLoading: boolean;
}

function BookingsTab({ bookings, isLoading }: BookingsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Deduplicated, sorted city list derived from enriched bookings
  const cityOptions = Array.from(
    new Set(bookings.map((b) => b.hotelCity).filter(Boolean)),
  ).sort();

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      b.guestName.toLowerCase().includes(q) ||
      b.guestEmail.toLowerCase().includes(q) ||
      b.phone.includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && b.status === Status.Confirmed) ||
      (statusFilter === "pending" && b.status === Status.Pending) ||
      (statusFilter === "cancelled" && b.status === Status.Cancelled);
    const matchesCity = cityFilter === "all" || b.hotelCity === cityFilter;
    return matchesSearch && matchesStatus && matchesCity;
  });

  // Already sorted by created desc from enrichBookings(), just preserve order
  const sorted = filtered;

  return (
    <div className="space-y-4">
      {/* RBAC Info Strip — Super Admin sees all bookings */}
      <div
        data-ocid="super_admin.bookings.rbac_info.section"
        className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3"
      >
        <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-indigo-800 text-sm font-medium leading-snug">
            <span className="font-bold">Super Admin View</span> — All platform
            bookings are visible to you.
          </p>
        </div>
        <span className="shrink-0 bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-1 rounded-full">
          {bookings.length} total
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Text search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="super_admin.bookings.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, email, or phone…"
            className="pl-9"
          />
        </div>

        {/* City filter */}
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger
            data-ocid="super_admin.bookings.city_select"
            className="w-full sm:w-44"
          >
            <SelectValue placeholder="Filter by city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cityOptions.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            data-ocid="super_admin.bookings.status_select"
            className="w-full sm:w-44"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        Showing {sorted.length} of {bookings.length} bookings
      </p>

      {/* Skeleton state */}
      {isLoading ? (
        <div className="space-y-3">
          {["b1", "b2", "b3", "b4", "b5", "b6"].map((k) => (
            <div
              key={k}
              className="p-4 rounded-xl border border-border space-y-3"
            >
              <div className="flex justify-between">
                <div className="skeleton-shimmer h-4 w-32 rounded" />
                <div className="skeleton-shimmer h-6 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="skeleton-shimmer h-12 rounded-lg" />
                <div className="skeleton-shimmer h-12 rounded-lg" />
              </div>
              <div className="skeleton-shimmer h-8 rounded-lg" />
              <div className="flex justify-between">
                <div className="skeleton-shimmer h-5 w-24 rounded" />
                <div className="skeleton-shimmer h-6 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          data-ocid="super_admin.bookings.empty_state"
          className="text-center py-14 text-muted-foreground border border-dashed border-border rounded-xl"
        >
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No bookings match your filters</p>
          <p className="text-xs mt-1 opacity-70">
            Try adjusting the search or filter criteria
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((booking, idx) => (
            <motion.div
              key={booking.id.toString()}
              data-ocid={`super_admin.bookings.item.${idx + 1}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="rounded-xl border border-border bg-card hover:bg-accent/10 transition-colors overflow-hidden"
            >
              {/* Card header: Booking ID | Date | Status */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono font-bold bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded">
                    Booking #{booking.id.toString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(booking.created)}
                  </span>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                {/* Two-column: Guest info + Hotel info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Guest info */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/50 border border-blue-100/60 p-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {booking.guestName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {booking.guestEmail}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {booking.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hotel info */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/60 p-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Hotel className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {booking.hotelName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {booking.hotelCity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stay dates row */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50/60 border border-slate-100 px-3 py-2">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    {booking.checkIn}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs font-medium text-foreground">
                    {booking.checkOut}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {booking.nights} night{booking.nights !== 1 ? "s" : ""}
                    </span>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {booking.guestCount.toString()} guest
                      {Number(booking.guestCount) !== 1 ? "s" : ""}
                    </span>
                  </span>
                </div>

                {/* Footer: Total amount + Payment mode */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                      Total Amount
                    </p>
                    <p className="text-lg font-bold text-foreground font-display leading-none">
                      ₹{formatPrice(booking.totalAmount)}
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs gap-1">
                    <Wallet className="w-3 h-3" />
                    {booking.paymentMode}
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────────────────────────────────────

interface UsersTabProps {
  actor: import("../backend").backendInterface | null;
  currentPrincipal: string;
}

function UsersTab({ actor, currentPrincipal }: UsersTabProps) {
  const queryClient = useQueryClient();
  const [principalInput, setPrincipalInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [unlockPrincipalInput, setUnlockPrincipalInput] = useState("");

  const { data: myRole } = useQuery<UserRole>({
    queryKey: ["my-role"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getCallerUserRole();
    },
    enabled: !!actor,
  });

  const { mutate: assignRole, isPending: assignPending } = useMutation({
    mutationFn: async ({
      principal,
      role,
    }: {
      principal: string;
      role: UserRole;
    }) => {
      if (!actor) throw new Error("Not connected");
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      await actor.assignCallerUserRole(p as unknown as Principal, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-role"] });
      toast.success("Role assigned successfully.");
      setPrincipalInput("");
      setSelectedRole("");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to assign role: ${msg}`);
    },
  });

  const { mutate: unlockAdmin, isPending: unlockPending } = useMutation({
    mutationFn: async (principal: string) => {
      if (!actor) throw new Error("Not connected");
      const { Principal } = await import("@icp-sdk/core/principal");
      const p = Principal.fromText(principal);
      await actor.unlockAdminAccount(p as unknown as Principal);
    },
    onSuccess: () => {
      toast.success("Admin account unlocked successfully.");
      setUnlockPrincipalInput("");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to unlock account: ${msg}`);
    },
  });

  const handleAssign = () => {
    if (!principalInput.trim()) {
      toast.error("Please enter a principal ID.");
      return;
    }
    if (!selectedRole) {
      toast.error("Please select a role.");
      return;
    }
    assignRole({
      principal: principalInput.trim(),
      role: selectedRole as UserRole,
    });
  };

  const handleUnlock = () => {
    if (!unlockPrincipalInput.trim()) {
      toast.error("Please enter the locked admin's principal ID.");
      return;
    }
    unlockAdmin(unlockPrincipalInput.trim());
  };

  const roleLabel = (role: UserRole) => {
    if (role === UserRole.admin) return "Super Admin";
    if (role === UserRole.user) return "Registered User";
    return "Guest";
  };

  const roleBadgeClass = (role?: UserRole) => {
    if (role === UserRole.admin)
      return "bg-red-50 text-red-700 border border-red-200";
    if (role === UserRole.user)
      return "bg-blue-50 text-blue-700 border border-blue-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Current Session Info */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-brand" />
          <h3 className="font-semibold text-sm text-foreground">
            Your Session
          </h3>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Your Principal ID
            </p>
            <code className="text-xs bg-muted px-3 py-2 rounded-lg font-mono block break-all">
              {currentPrincipal || "Loading…"}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your Role</p>
            {myRole !== undefined ? (
              <Badge
                className={`font-semibold text-xs gap-1 ${roleBadgeClass(myRole)}`}
              >
                <ShieldAlert className="w-3 h-3" />
                {roleLabel(myRole)}
              </Badge>
            ) : (
              <div className="skeleton-shimmer h-6 w-28 rounded-full" />
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Role Assignment Form */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">
            Assign Role to User
          </h3>
        </div>

        <div className="rounded-xl border border-border bg-amber-50/30 p-4 flex gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed space-y-1">
            <p>
              To assign admin privileges, enter the user's Internet Identity
              principal ID. Admins gain full access to this Super Admin Panel.
              This action is irreversible without explicit revocation.
            </p>
            <p className="font-semibold">
              ⚡ Assigning the "Super Admin" role grants full access to this
              panel, including hotel management, bookings, and user role
              assignment.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="principal-input" className="text-sm font-medium">
              Principal ID
            </Label>
            <Input
              id="principal-input"
              data-ocid="super_admin.users.principal_input"
              value={principalInput}
              onChange={(e) => setPrincipalInput(e.target.value)}
              placeholder="e.g. 2vxsx-fae or rdmx6-jaaaa-aaaaa-aaadq-cai"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-select" className="text-sm font-medium">
              Role
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger
                id="role-select"
                data-ocid="super_admin.users.role_select"
                className="w-full"
              >
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.admin}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Super Admin</span>
                  </div>
                </SelectItem>
                <SelectItem value={UserRole.user}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>User</span>
                  </div>
                </SelectItem>
                <SelectItem value={UserRole.guest}>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <span>Guest</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            data-ocid="super_admin.users.assign_button"
            onClick={handleAssign}
            disabled={assignPending}
            className="w-full bg-brand hover:bg-brand/90 text-white font-semibold gap-2"
          >
            {assignPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {assignPending ? "Assigning…" : "Assign Role"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Unlock Admin Account */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-foreground">
            Unlock Admin Account
          </h3>
        </div>
        <div className="rounded-xl border border-border bg-red-50/30 p-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 leading-relaxed">
            An admin account is locked after 5 consecutive failed OTP
            verification attempts. Enter the locked admin's principal ID to
            unlock their account. You cannot unlock your own account.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Locked Admin Principal ID
            </Label>
            <Input
              data-ocid="super_admin.users.unlock_principal_input"
              value={unlockPrincipalInput}
              onChange={(e) => setUnlockPrincipalInput(e.target.value)}
              placeholder="e.g. 2vxsx-fae or rdmx6-jaaaa-aaaaa-aaadq-cai"
              className="font-mono text-sm"
            />
          </div>
          <Button
            data-ocid="super_admin.users.unlock_button"
            onClick={handleUnlock}
            disabled={unlockPending}
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 font-semibold gap-2"
          >
            {unlockPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {unlockPending ? "Unlocking…" : "Unlock Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions Tab
// ─────────────────────────────────────────────────────────────────────────────

interface KycViewerState {
  open: boolean;
  listingId: bigint | null;
  url: string | null;
  ownerName: string;
  ownerEmail: string;
  loading: boolean;
}

interface SubscriptionsTabProps {
  listings: PropertyListing[];
  isLoading: boolean;
  onApprove: (id: bigint) => void;
  onReject: (id: bigint) => void;
  approvePending: boolean;
  rejectPending: boolean;
  pendingListingId: bigint | null;
  actor: import("../backend").backendInterface | null;
}

function SubscriptionsTab({
  listings,
  isLoading,
  onApprove,
  onReject,
  approvePending,
  rejectPending,
  pendingListingId,
  actor,
}: SubscriptionsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kycViewer, setKycViewer] = useState<KycViewerState>({
    open: false,
    listingId: null,
    url: null,
    ownerName: "",
    ownerEmail: "",
    loading: false,
  });

  const handleViewKyc = async (listing: PropertyListing) => {
    if (!actor || !listing.kycDocumentUrl) return;
    setKycViewer({
      open: true,
      listingId: listing.id,
      url: null,
      ownerName: listing.ownerName,
      ownerEmail: listing.ownerEmail,
      loading: true,
    });
    try {
      const url = await actor.getKycDocumentUrl(listing.id);
      setKycViewer((prev) => ({ ...prev, url, loading: false }));
    } catch (err) {
      setKycViewer((prev) => ({ ...prev, loading: false }));
      toast.error(
        `Failed to load KYC document: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const handleCloseKycViewer = () => {
    setKycViewer({
      open: false,
      listingId: null,
      url: null,
      ownerName: "",
      ownerEmail: "",
      loading: false,
    });
  };

  const filtered = listings.filter((l) => {
    const matchesSearch =
      l.hotelName.toLowerCase().includes(search.toLowerCase()) ||
      l.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" &&
        l.status === PropertyListingStatus.PendingApproval) ||
      (statusFilter === "approved" &&
        l.status === PropertyListingStatus.Approved) ||
      (statusFilter === "rejected" &&
        l.status === PropertyListingStatus.Rejected);
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) =>
    Number(b.submittedAt - a.submittedAt),
  );

  return (
    <div className="space-y-4">
      {/* KYC Viewer Dialog */}
      <Dialog
        open={kycViewer.open}
        onOpenChange={(v) => !v && handleCloseKycViewer()}
      >
        <DialogContent
          data-ocid="admin.kyc_viewer.dialog"
          className="max-w-lg w-full p-0 gap-0 rounded-2xl overflow-hidden"
        >
          <DialogHeader className="px-6 pt-5 pb-4 bg-gradient-to-r from-teal-700 to-teal-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-display font-bold text-white leading-tight">
                    KYC Document — {kycViewer.ownerName || "Owner"}
                  </DialogTitle>
                  {kycViewer.ownerEmail && (
                    <p className="text-teal-200 text-xs mt-0.5">
                      {kycViewer.ownerEmail}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                data-ocid="admin.kyc_viewer.close_button"
                onClick={handleCloseKycViewer}
                className="text-white/70 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-5">
            {/* Security notice */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <span className="font-semibold">Confidential document.</span>{" "}
                This KYC document is only visible to administrators and must not
                be shared externally.
              </p>
            </div>

            {/* Image area */}
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30 min-h-[200px] flex items-center justify-center">
              {kycViewer.loading ? (
                <div
                  data-ocid="admin.kyc_viewer.loading_state"
                  className="flex flex-col items-center gap-3 py-10"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-sm text-muted-foreground">
                    Loading KYC document…
                  </p>
                </div>
              ) : kycViewer.url ? (
                <img
                  src={kycViewer.url}
                  alt={`KYC document for ${kycViewer.ownerName}`}
                  className="w-full h-auto max-h-[400px] object-contain"
                />
              ) : (
                <div
                  data-ocid="admin.kyc_viewer.error_state"
                  className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
                >
                  <XCircle className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Could not load document</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                data-ocid="admin.kyc_viewer.close_button"
                variant="outline"
                onClick={handleCloseKycViewer}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="super_admin.subscriptions.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by hotel, owner, or city…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            data-ocid="super_admin.subscriptions.status_select"
            className="w-full sm:w-44"
          >
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {sorted.length} of {listings.length} submissions
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {["l1", "l2", "l3", "l4", "l5", "l6"].map((k) => (
            <SkeletonRow key={k} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          data-ocid="super_admin.subscriptions.empty_state"
          className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl"
        >
          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No subscription submissions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((listing, idx) => {
            const isPending = pendingListingId === listing.id;
            const isListingPending =
              listing.status === PropertyListingStatus.PendingApproval;
            const isApproved =
              listing.status === PropertyListingStatus.Approved;

            return (
              <div
                key={listing.id.toString()}
                data-ocid={`super_admin.subscriptions.item.${idx + 1}`}
                className="p-4 rounded-xl border border-border bg-card hover:bg-accent/20 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {listing.hotelName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {listing.ownerName} · {listing.ownerEmail}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {listing.city}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <SubscriptionPlanBadge
                          plan={listing.subscriptionPlan}
                        />
                        <span className="text-xs text-muted-foreground">·</span>
                        <ListingStatusBadge status={listing.status} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* View KYC button — only shown if KYC document exists */}
                    {listing.kycDocumentUrl ? (
                      <Button
                        data-ocid={`admin.subscriptions.view_kyc_button.${idx + 1}`}
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewKyc(listing)}
                        className="text-xs h-7 px-3 gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                      >
                        <Eye className="w-3 h-3" />
                        View KYC
                      </Button>
                    ) : (
                      <Badge className="bg-slate-50 text-slate-400 border border-slate-200 text-[10px] gap-1">
                        No KYC
                      </Badge>
                    )}

                    {isListingPending && (
                      <>
                        <Button
                          data-ocid={`super_admin.subscriptions.approve_button.${idx + 1}`}
                          size="sm"
                          disabled={isPending && approvePending}
                          onClick={() => onApprove(listing.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 gap-1"
                        >
                          {isPending && approvePending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          data-ocid={`super_admin.subscriptions.reject_button.${idx + 1}`}
                          size="sm"
                          variant="destructive"
                          disabled={isPending && rejectPending}
                          onClick={() => onReject(listing.id)}
                          className="text-xs h-7 px-3 gap-1"
                        >
                          {isPending && rejectPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Reject
                        </Button>
                      </>
                    )}
                    {isApproved && (
                      <Button
                        data-ocid={`super_admin.subscriptions.reject_button.${idx + 1}`}
                        size="sm"
                        variant="destructive"
                        disabled={isPending && rejectPending}
                        onClick={() => onReject(listing.id)}
                        className="text-xs h-7 px-3 gap-1"
                      >
                        {isPending && rejectPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-2 pl-13 text-xs text-muted-foreground ml-13">
                  <span className="ml-[52px]">
                    Submitted: {formatDate(listing.submittedAt)} · Phone:{" "}
                    {listing.ownerPhone}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin OTP Gate
// ─────────────────────────────────────────────────────────────────────────────

interface AdminOtpGateProps {
  actor: import("../backend").backendInterface | null;
  onOtpVerified: () => void;
}

const OTP_RESEND_COOLDOWN = 60;

function AdminOtpGate({ actor, onOtpVerified }: AdminOtpGateProps) {
  const [otpValue, setOtpValue] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isCheckingLock, setIsCheckingLock] = useState(true);

  const triggerCooldown = () => {
    setCooldown(OTP_RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Generate OTP on mount (and when actor becomes available)
  useEffect(() => {
    if (!actor) return;
    let cancelled = false;

    const run = async () => {
      setIsCheckingLock(true);
      setIsGenerating(true);
      setErrorMsg(null);
      setOtpValue("");
      try {
        // First check if account is locked
        const lockStatus = await actor.getAdminLockStatus();
        if (cancelled) return;
        if (lockStatus.locked) {
          setIsLocked(true);
          setFailedAttempts(Number(lockStatus.failedAttempts));
          return;
        }

        // Not locked — proceed with OTP generation
        const code = await actor.generateAdminOtp();
        if (!cancelled) {
          setDemoCode(code);
          setCooldown(OTP_RESEND_COOLDOWN);
          timerRef.current = setInterval(() => {
            setCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current!);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to generate OTP";
          toast.error(msg);
          setErrorMsg(msg);
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
          setIsCheckingLock(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [actor]);

  const generateOtp = async () => {
    if (!actor) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setOtpValue("");
    try {
      const code = await actor.generateAdminOtp();
      setDemoCode(code);
      triggerCooldown();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate OTP";
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6 || !actor) return;
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const result = await actor.verifyAdminOtp(otpValue);
      if (result.__kind__ === "ok") {
        setFailedAttempts(0);
        toast.success("Identity verified. Welcome to the Admin Panel.");
        onOtpVerified();
      } else {
        const errMessage = result.error ?? "Invalid OTP. Please try again.";
        // Check if account just got locked
        if (errMessage.toLowerCase().includes("locked")) {
          setIsLocked(true);
          setFailedAttempts(5);
          toast.error(errMessage);
        } else {
          // Try to extract remaining attempts from message (e.g., "X attempts remaining")
          const remainingMatch = errMessage.match(
            /(\d+)\s+attempts?\s+remaining/i,
          );
          if (remainingMatch) {
            const remaining = Number.parseInt(remainingMatch[1], 10);
            setFailedAttempts(5 - remaining);
          }
          setErrorMsg(errMessage);
          setOtpValue("");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setErrorMsg(msg);
      setOtpValue("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <motion.div
      data-ocid="admin_otp.gate_section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-0 overflow-y-auto"
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div
            className={`bg-gradient-to-br px-6 py-6 text-center ${isLocked ? "from-red-700 to-red-900" : "from-slate-800 to-slate-900"}`}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${isLocked ? "bg-white/10 border-white/20" : "bg-white/10 border-white/20"}`}
            >
              {isLocked ? (
                <Lock className="w-8 h-8 text-white" />
              ) : (
                <ShieldPlus className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <h2 className="font-display text-xl font-bold text-white mb-1">
              {isLocked ? "Account Locked" : "Admin Verification Required"}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {isLocked
                ? "Too many failed verification attempts"
                : "Enter the 6-digit code to access the Super Admin Panel"}
            </p>
          </div>

          {/* Card Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Checking lock status spinner */}
            {isCheckingLock && (
              <div
                data-ocid="admin_otp.loading_state"
                className="flex flex-col items-center gap-3 py-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                <p className="text-sm text-muted-foreground">
                  Checking account status…
                </p>
              </div>
            )}

            {/* Locked state */}
            {!isCheckingLock && isLocked && (
              <div
                data-ocid="admin_otp.locked_state"
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">
                    Account Locked
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    Your account has been locked after 5 failed OTP attempts.
                    Contact another Super Admin to unlock your account.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>5 / 5 failed attempts</span>
                </div>
              </div>
            )}

            {/* Normal OTP flow — only shown when not locked and not checking */}
            {!isCheckingLock && !isLocked && (
              <>
                {/* Loading state (generating OTP) */}
                {isGenerating && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    <p className="text-sm text-muted-foreground">
                      Generating your verification code…
                    </p>
                  </div>
                )}

                {/* Demo OTP Banner */}
                {!isGenerating && demoCode && (
                  <motion.div
                    data-ocid="admin_otp.demo_banner"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5"
                  >
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-800 text-sm font-semibold mb-0.5">
                        Demo Mode — OTP Generated
                      </p>
                      <p className="text-amber-700 text-sm">
                        Your OTP is:{" "}
                        <span className="font-bold font-mono text-amber-900 text-base tracking-widest">
                          {demoCode}
                        </span>
                      </p>
                      <p className="text-amber-600 text-xs mt-1">
                        In production, this would be sent via SMS/email.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Error state */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      data-ocid="admin_otp.error_state"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                    >
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-red-700 text-sm font-medium">
                        {errorMsg}
                        {failedAttempts > 0 && failedAttempts < 5 && (
                          <span className="ml-1 font-semibold">
                            ({failedAttempts}/5 failed)
                          </span>
                        )}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OTP Input */}
                {!isGenerating && (
                  <div className="flex flex-col items-center gap-3">
                    <Label className="text-sm font-semibold text-foreground self-start">
                      Enter 6-digit code
                    </Label>
                    <InputOTP
                      data-ocid="admin_otp.otp_input"
                      maxLength={6}
                      value={otpValue}
                      onChange={setOtpValue}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                )}

                {/* Verify Button */}
                {!isGenerating && (
                  <Button
                    data-ocid="admin_otp.verify_button"
                    onClick={handleVerify}
                    disabled={otpValue.length !== 6 || isVerifying}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] gap-2 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Verify Access
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {/* Resend OTP — only shown when not locked and not checking */}
            {!isCheckingLock && !isLocked && !isGenerating && (
              <div className="text-center">
                <Button
                  data-ocid="admin_otp.resend_button"
                  variant="ghost"
                  size="sm"
                  onClick={generateOtp}
                  disabled={cooldown > 0 || isGenerating}
                  className="text-muted-foreground hover:text-foreground text-sm gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
          This verification step protects the Super Admin Panel from
          unauthorized access.
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Tab — Change Admin Password
// ─────────────────────────────────────────────────────────────────────────────

function SecurityTabPasswordInput({
  id,
  placeholder,
  value,
  onChange,
  ocid,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  ocid?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        id={id}
        data-ocid={ocid}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 pl-9 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface SecurityTabProps {
  principalId: string;
}

function SecurityTab({ principalId }: SecurityTabProps) {
  const creds = useAdminCredentials(principalId);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const strengthScore = getPasswordStrengthScore(newPw);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!currentPw) {
      setError("Current password is required");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New passwords do not match");
      return;
    }
    if (strengthScore < 2) {
      setError(
        "New password is too weak. Add uppercase letters, numbers, or special characters.",
      );
      return;
    }

    setLoading(true);
    const result = await creds.changePassword(currentPw, newPw);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Password changed successfully!");
    } else {
      setError(result.error ?? "Failed to change password");
    }
  };

  if (!creds.hasCredentials) {
    return (
      <div
        data-ocid="super_admin.security.panel"
        className="max-w-md mx-auto py-8"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm mb-1">
              No credentials configured
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Admin password credentials haven't been set up on this device yet.
              Please log out of the admin panel and complete the initial setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-ocid="super_admin.security.panel"
      className="max-w-lg mx-auto py-2"
    >
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">
            Change Admin Password
          </h2>
        </div>
        <p className="text-sm text-muted-foreground ml-10">
          Update your admin panel password. Current Admin ID:{" "}
          <span className="font-semibold text-foreground">{creds.userId}</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="sec-current-pw"
              className="text-sm font-semibold text-foreground"
            >
              Current Password
            </label>
            <SecurityTabPasswordInput
              id="sec-current-pw"
              placeholder="Enter current password"
              value={currentPw}
              onChange={setCurrentPw}
              ocid="super_admin.security.current_password_input"
            />
          </div>

          <Separator />

          {/* New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="sec-new-pw"
              className="text-sm font-semibold text-foreground"
            >
              New Password
            </label>
            <SecurityTabPasswordInput
              id="sec-new-pw"
              placeholder="Enter new password"
              value={newPw}
              onChange={setNewPw}
              ocid="super_admin.security.new_password_input"
            />
            <PasswordStrengthBar password={newPw} />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="sec-confirm-pw"
              className="text-sm font-semibold text-foreground"
            >
              Confirm New Password
            </label>
            <SecurityTabPasswordInput
              id="sec-confirm-pw"
              placeholder="Re-enter new password"
              value={confirmPw}
              onChange={setConfirmPw}
              ocid="super_admin.security.confirm_password_input"
            />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-red-500 mt-1">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                data-ocid="super_admin.security.error_state"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {success && (
              <motion.div
                data-ocid="super_admin.security.success_state"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-semibold">
                  Password changed successfully!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            data-ocid="super_admin.security.submit_button"
            type="submit"
            disabled={loading}
            className="w-full gap-2 font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Info */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Your password is hashed with SHA-256 and stored locally on this
          device. No passwords are stored in the backend database.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Access Denied Screen
// ─────────────────────────────────────────────────────────────────────────────

function AccessDenied({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-6"
      >
        <Lock className="w-8 h-8 text-red-500" />
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
          You don't have administrator privileges to access this panel. Contact
          a super admin to request access.
        </p>
        <Button onClick={onClose} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Site
        </Button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Super Admin Panel (Main)
// ─────────────────────────────────────────────────────────────────────────────

export function SuperAdminPanel({
  open,
  onClose,
  actor,
  isAdmin,
  isOtpVerified,
  onOtpVerified,
  onSessionTimeout,
  adminPrincipalId = "",
}: SuperAdminPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  // Track pending IDs for optimistic loading states
  const [pendingHotelId, setPendingHotelId] = useState<bigint | null>(null);
  const [pendingListingId, setPendingListingId] = useState<bigint | null>(null);

  // ── Session timeout (30 min inactivity) ───────────────────────────────────
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef<boolean>(false);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Reset activity timestamp on any user interaction inside the panel
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
  }, []);

  useEffect(() => {
    if (!open || !isOtpVerified) {
      // Clear interval when panel is closed or OTP not verified
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      }
      return;
    }

    // Start fresh activity tracking when session begins
    lastActivityRef.current = Date.now();
    warnedRef.current = false;

    // Listen for user activity
    const onActivity = () => resetActivity();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    window.addEventListener("scroll", onActivity, true);

    // Check every 60 seconds
    sessionIntervalRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = SESSION_TIMEOUT_MS - idle;

      if (remaining <= 0) {
        // Session expired
        clearInterval(sessionIntervalRef.current!);
        sessionIntervalRef.current = null;
        toast.error(
          "Admin session expired due to 30 minutes of inactivity. Please verify OTP again.",
          {
            duration: 6000,
          },
        );
        onSessionTimeout();
      } else if (remaining <= SESSION_WARN_MS && !warnedRef.current) {
        // 5-minute warning
        warnedRef.current = true;
        toast.warning(
          "Your admin session will expire in 5 minutes due to inactivity.",
          {
            duration: 8000,
          },
        );
      }
    }, 60_000);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("scroll", onActivity, true);
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      }
    };
  }, [open, isOtpVerified, onSessionTimeout, resetActivity]);

  // ── Data Queries ──────────────────────────────────────────────────────────

  const { data: hotels = [], isLoading: hotelsLoading } = useQuery<HotelType[]>(
    {
      queryKey: ["super-admin-hotels"],
      queryFn: async () => {
        if (!actor) return [];
        return actor.getHotelsForAdmin();
      },
      enabled: open && isAdmin && !!actor,
    },
  );

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<
    Booking[]
  >({
    queryKey: ["super-admin-bookings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBookings();
    },
    enabled: open && isAdmin && !!actor,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<
    PropertyListing[]
  >({
    queryKey: ["super-admin-listings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPropertyListings();
    },
    enabled: open && isAdmin && !!actor,
  });

  // ── Hotel Mutations ───────────────────────────────────────────────────────

  const { mutate: approveHotel, isPending: approveHotelPending } = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      setPendingHotelId(id);
      await actor.approveHotel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-hotels"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      setPendingHotelId(null);
      toast.success("Hotel approved — it will now appear in search results.");
    },
    onError: (err) => {
      setPendingHotelId(null);
      toast.error(
        `Failed to approve hotel: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  const { mutate: suspendHotel, isPending: suspendHotelPending } = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      setPendingHotelId(id);
      await actor.rejectHotel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-hotels"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      setPendingHotelId(null);
      toast.success(
        "Hotel has been suspended and removed from search results.",
      );
    },
    onError: (err) => {
      setPendingHotelId(null);
      toast.error(
        `Failed to suspend hotel: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    },
  });

  // ── Listing Mutations ─────────────────────────────────────────────────────

  const { mutate: approveListing, isPending: approveListingPending } =
    useMutation({
      mutationFn: async (id: bigint) => {
        if (!actor) throw new Error("Not connected");
        setPendingListingId(id);
        await actor.approvePropertyListing(id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["super-admin-listings"] });
        queryClient.invalidateQueries({
          queryKey: ["admin-property-listings"],
        });
        queryClient.invalidateQueries({ queryKey: ["pending-listings-count"] });
        setPendingListingId(null);
        toast.success("Property listing approved.");
      },
      onError: (err) => {
        setPendingListingId(null);
        toast.error(
          `Failed to approve listing: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      },
    });

  const { mutate: rejectListing, isPending: rejectListingPending } =
    useMutation({
      mutationFn: async (id: bigint) => {
        if (!actor) throw new Error("Not connected");
        setPendingListingId(id);
        await actor.rejectPropertyListing(id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["super-admin-listings"] });
        queryClient.invalidateQueries({
          queryKey: ["admin-property-listings"],
        });
        queryClient.invalidateQueries({ queryKey: ["pending-listings-count"] });
        setPendingListingId(null);
        toast.success("Property listing rejected.");
      },
      onError: (err) => {
        setPendingListingId(null);
        toast.error(
          `Failed to reject listing: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      },
    });
  // ── Current user principal (for Users tab) ────────────────────────────────
  const { identity } = useInternetIdentity();
  const currentPrincipal: string = identity?.getPrincipal().toString() ?? "";

  // ── Enrich bookings with hotel data ──────────────────────────────────────
  const enrichedBookings: EnrichedBooking[] = enrichBookings(bookings, hotels);

  // ── Tab badge counts ──────────────────────────────────────────────────────
  const pendingHotelsCount = hotels.filter(
    (h) => h.approvalStatus === HotelApprovalStatus.Pending,
  ).length;
  const pendingListingsCount = listings.filter(
    (l) => l.status === PropertyListingStatus.PendingApproval,
  ).length;

  // ── Prevent body scroll ───────────────────────────────────────────────────
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="super_admin.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden"
        >
          {/* Header */}
          <div
            className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.14 0.03 255) 0%, oklch(0.18 0.02 255) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-white leading-none">
                  Super Admin Panel
                </h1>
                <p className="text-white/50 text-xs font-medium tracking-widest uppercase mt-0.5">
                  HIDESTAY · Super Admin · Secure Access
                </p>
              </div>
            </div>

            <Button
              data-ocid="super_admin.close_button"
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Site</span>
            </Button>
          </div>

          {/* Body */}
          {!isAdmin ? (
            <AccessDenied onClose={onClose} />
          ) : !isOtpVerified ? (
            <AdminOtpGate actor={actor} onOtpVerified={onOtpVerified} />
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as AdminTab)}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Tab Navigation */}
              <div className="shrink-0 border-b border-border bg-card px-4 pt-3 overflow-x-auto">
                <TabsList className="bg-transparent gap-1 h-auto p-0 flex-nowrap">
                  <TabsTrigger
                    data-ocid="super_admin.dashboard.tab"
                    value="dashboard"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="super_admin.hotels.tab"
                    value="hotels"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <Hotel className="w-4 h-4" />
                    Hotels
                    {pendingHotelsCount > 0 && (
                      <span className="ml-1 bg-amber-400 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {pendingHotelsCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="super_admin.bookings.tab"
                    value="bookings"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    Bookings
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="super_admin.users.tab"
                    value="users"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <Users className="w-4 h-4" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="super_admin.subscriptions.tab"
                    value="subscriptions"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <Wallet className="w-4 h-4" />
                    Subscriptions
                    {pendingListingsCount > 0 && (
                      <span className="ml-1 bg-amber-400 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {pendingListingsCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="super_admin.security.tab"
                    value="security"
                    className="data-[state=active]:bg-brand data-[state=active]:text-white rounded-lg px-4 py-2 text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    <KeyRound className="w-4 h-4" />
                    Security
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-5 max-w-6xl mx-auto">
                    <TabsContent value="dashboard" className="mt-0">
                      <DashboardTab
                        hotels={hotels}
                        bookings={bookings}
                        listings={listings}
                        hotelsLoading={hotelsLoading}
                        bookingsLoading={bookingsLoading}
                        listingsLoading={listingsLoading}
                      />
                    </TabsContent>

                    <TabsContent value="hotels" className="mt-0">
                      <HotelsTab
                        hotels={hotels}
                        isLoading={hotelsLoading}
                        onApprove={approveHotel}
                        onSuspend={suspendHotel}
                        approveIsPending={approveHotelPending}
                        suspendIsPending={suspendHotelPending}
                        pendingId={pendingHotelId}
                      />
                    </TabsContent>

                    <TabsContent value="bookings" className="mt-0">
                      <BookingsTab
                        bookings={enrichedBookings}
                        isLoading={bookingsLoading}
                      />
                    </TabsContent>

                    <TabsContent value="users" className="mt-0">
                      <UsersTab
                        actor={actor}
                        currentPrincipal={currentPrincipal}
                      />
                    </TabsContent>

                    <TabsContent value="subscriptions" className="mt-0">
                      <SubscriptionsTab
                        listings={listings}
                        isLoading={listingsLoading}
                        onApprove={approveListing}
                        onReject={rejectListing}
                        approvePending={approveListingPending}
                        rejectPending={rejectListingPending}
                        pendingListingId={pendingListingId}
                        actor={actor}
                      />
                    </TabsContent>

                    <TabsContent value="security" className="mt-0">
                      <SecurityTab principalId={adminPrincipalId} />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </Tabs>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
