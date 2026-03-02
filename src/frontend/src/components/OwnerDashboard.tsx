import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Info,
  Loader2,
  MapPin,
  Package,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { BlockedDate, Booking, Hotel, RoomInventory } from "../backend.d";
import { Status } from "../backend.d";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DashboardTab = "overview" | "bookings" | "inventory" | "calendar";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking Status Badge
// ─────────────────────────────────────────────────────────────────────────────

function OwnerBookingStatusBadge({ status }: { status: Status }) {
  if (status === Status.Confirmed) {
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200 font-semibold text-xs gap-1 shrink-0">
        <CheckCircle className="w-3 h-3" />
        Confirmed
      </Badge>
    );
  }
  if (status === Status.Pending) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-xs gap-1 shrink-0">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-50 text-red-700 border-red-200 font-semibold text-xs gap-1 shrink-0">
      <XCircle className="w-3 h-3" />
      Cancelled
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Overview
// ─────────────────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  hotel: Hotel;
  inventory: RoomInventory | null;
  bookings: Booking[];
  onGoToBookings: () => void;
  onGoToCalendar: () => void;
}

function OverviewTab({
  hotel,
  inventory,
  bookings,
  onGoToBookings,
  onGoToCalendar,
}: OverviewTabProps) {
  const totalRooms = Number(inventory?.totalRooms ?? 0);
  const availableRooms = Number(inventory?.availableRooms ?? 0);
  const occupancyPct =
    totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms) * 100 : 0;

  const confirmedCount = bookings.filter(
    (b) => b.status === Status.Confirmed,
  ).length;
  const pendingCount = bookings.filter(
    (b) => b.status === Status.Pending,
  ).length;
  const cancelledCount = bookings.filter(
    (b) => b.status === Status.Cancelled,
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hotel Info Card */}
      <div className="bg-gradient-to-br from-[oklch(0.52_0.22_25.5)] to-[oklch(0.38_0.20_25.5)] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
              Your Hotel
            </p>
            <h2 className="font-display text-2xl font-extrabold text-white leading-tight mb-2">
              {hotel.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-white/60" />
                {hotel.city}
              </span>
              {hotel.address && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-white/60" />
                  <span className="line-clamp-1 text-white/70">
                    {hotel.address}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 bg-white/15 rounded-xl px-3 py-2 shrink-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i <= Number(hotel.starRating) ? "text-yellow-300 fill-yellow-300" : "text-white/30"}`}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onGoToBookings}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 border border-white/20"
          >
            <BookOpen className="w-4 h-4" />
            Bookings
          </button>
          <button
            type="button"
            onClick={onGoToCalendar}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all duration-200 border border-white/20"
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </button>
        </div>
      </div>

      {/* Room Inventory Summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-display font-bold text-base text-foreground">
            Room Inventory
          </h3>
        </div>

        {inventory ? (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-display font-extrabold text-foreground">
                  {availableRooms}
                  <span className="text-lg font-semibold text-muted-foreground">
                    /{totalRooms}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  rooms available · {inventory.roomType}
                </p>
              </div>
              <Badge
                className={`shrink-0 font-semibold ${
                  occupancyPct >= 80
                    ? "bg-red-50 text-red-700 border-red-200"
                    : occupancyPct >= 50
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-green-50 text-green-700 border-green-200"
                }`}
              >
                {Math.round(occupancyPct)}% occupied
              </Badge>
            </div>
            <Progress value={occupancyPct} className="h-2.5 rounded-full" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalRooms - availableRooms} room
              {totalRooms - availableRooms !== 1 ? "s" : ""} currently occupied
            </p>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No inventory data yet. Set up your room inventory in the Inventory
            tab.
          </div>
        )}
      </div>

      {/* Booking Stats */}
      <div>
        <h3 className="font-display font-bold text-base text-foreground mb-3">
          Booking Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total",
              value: bookings.length,
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "Confirmed",
              value: confirmedCount,
              color: "bg-green-50 text-green-700 border-green-100",
            },
            {
              label: "Pending",
              value: pendingCount,
              color: "bg-amber-50 text-amber-700 border-amber-100",
            },
            {
              label: "Cancelled",
              value: cancelledCount,
              color: "bg-red-50 text-red-700 border-red-100",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border p-4 ${stat.color}`}
            >
              <p className="text-2xl font-display font-extrabold">
                {stat.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest mt-1 opacity-70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Bookings
// ─────────────────────────────────────────────────────────────────────────────

interface BookingsTabProps {
  bookings: Booking[];
  isLoading: boolean;
  actor: import("../backend").backendInterface | null;
  onRefresh: () => void;
}

function BookingsTab({
  bookings,
  isLoading,
  actor,
  onRefresh,
}: BookingsTabProps) {
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: Status }) => {
      if (!actor) throw new Error("Not connected");
      await actor.updateBookingStatus(id, status);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["owner-inventory"] });
      onRefresh();
      toast.success(
        status === Status.Confirmed
          ? "Booking confirmed — room count updated."
          : "Booking cancelled — room restored.",
      );
    },
    onError: () => {
      toast.error("Failed to update booking status.");
    },
  });

  if (isLoading) {
    return (
      <div
        data-ocid="owner_dashboard.bookings.loading_state"
        className="space-y-3"
      >
        {[1, 2, 3].map((k) => (
          <div key={k} className="bg-card border border-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="skeleton-shimmer h-4 w-32 rounded" />
                <div className="skeleton-shimmer h-5 w-48 rounded" />
                <div className="skeleton-shimmer h-4 w-36 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton-shimmer h-8 w-20 rounded-lg" />
                <div className="skeleton-shimmer h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <motion.div
        data-ocid="owner_dashboard.bookings.empty_state"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 px-6"
      >
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground mb-2">
          No bookings yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Bookings for your hotel will appear here once guests make
          reservations.
        </p>
      </motion.div>
    );
  }

  // Sort: latest first
  const sorted = [...bookings].sort(
    (a, b) => Number(b.created) - Number(a.created),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground mb-2">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"} total
        · sorted by latest first
      </p>

      {sorted.map((booking, idx) => (
        <motion.div
          key={booking.id.toString()}
          data-ocid={`owner_dashboard.booking.item.${idx + 1}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Top row: ID + status */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                  Booking #{booking.id.toString()}
                </span>
                <OwnerBookingStatusBadge status={booking.status} />
              </div>

              {/* Guest info */}
              <p className="font-display font-bold text-base text-foreground leading-tight mb-1">
                {booking.guestName}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{booking.guestEmail}</span>
                <span>{booking.phone}</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                </span>
                <span>
                  {booking.guestCount.toString()} guest
                  {Number(booking.guestCount) !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              {booking.status === Status.Pending && (
                <Button
                  data-ocid={`owner_dashboard.booking.confirm_button.${idx + 1}`}
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({ id: booking.id, status: Status.Confirmed })
                  }
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-xs gap-1.5"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Confirm
                </Button>
              )}
              {(booking.status === Status.Pending ||
                booking.status === Status.Confirmed) && (
                <Button
                  data-ocid={`owner_dashboard.booking.cancel_button.${idx + 1}`}
                  size="sm"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({ id: booking.id, status: Status.Cancelled })
                  }
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold rounded-lg text-xs gap-1.5"
                >
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Inventory
// ─────────────────────────────────────────────────────────────────────────────

interface InventoryTabProps {
  inventory: RoomInventory | null;
  isLoading: boolean;
  actor: import("../backend").backendInterface | null;
  onRefresh: () => void;
}

function InventoryTab({
  inventory,
  isLoading,
  actor,
  onRefresh,
}: InventoryTabProps) {
  const queryClient = useQueryClient();
  const [roomType, setRoomType] = useState(inventory?.roomType ?? "");
  const [totalRooms, setTotalRooms] = useState(
    inventory ? Number(inventory.totalRooms).toString() : "",
  );

  const { mutate: updateInventory, isPending } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.updateRoomInventory(
        roomType,
        BigInt(Number.parseInt(totalRooms)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-inventory"] });
      onRefresh();
      toast.success("Room inventory updated successfully.");
    },
    onError: () => {
      toast.error("Failed to update inventory. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomType.trim() || !totalRooms || Number.parseInt(totalRooms) < 1) {
      toast.error("Please enter a valid room type and total rooms (min 1).");
      return;
    }
    updateInventory();
  };

  const totalRoomsNum = Number(inventory?.totalRooms ?? 0);
  const availableRoomsNum = Number(inventory?.availableRooms ?? 0);
  const occupancyPct =
    totalRoomsNum > 0
      ? ((totalRoomsNum - availableRoomsNum) / totalRoomsNum) * 100
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Current Inventory Display */}
      {isLoading ? (
        <div
          data-ocid="owner_dashboard.inventory.loading_state"
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="space-y-3">
            <div className="skeleton-shimmer h-5 w-48 rounded" />
            <div className="skeleton-shimmer h-8 w-32 rounded" />
            <div className="skeleton-shimmer h-3 w-full rounded-full" />
          </div>
        </div>
      ) : inventory ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-display font-bold text-base text-foreground">
              Current Inventory
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                Room Type
              </p>
              <p className="font-display font-bold text-lg text-foreground">
                {inventory.roomType}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 font-semibold uppercase tracking-widest mb-1">
                Available
              </p>
              <p className="font-display font-bold text-2xl text-green-700">
                {availableRoomsNum}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
                Total
              </p>
              <p className="font-display font-bold text-2xl text-foreground">
                {totalRoomsNum}
              </p>
            </div>
          </div>

          {/* Occupancy Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="font-semibold text-foreground">Occupancy</span>
              <span className="font-bold text-foreground">
                {Math.round(occupancyPct)}%
              </span>
            </div>
            <Progress value={occupancyPct} className="h-3 rounded-full" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {totalRoomsNum - availableRoomsNum} occupied · {availableRoomsNum}{" "}
              available
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">
              No inventory set up yet
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Use the form below to add your room inventory.
            </p>
          </div>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm">
          Available rooms are automatically reduced when bookings are confirmed
          and restored when cancelled.
        </p>
      </div>

      {/* Edit Form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center">
            <Package
              className="w-4 h-4 text-brand"
              style={{ color: "var(--brand-red)" }}
            />
          </div>
          <h3 className="font-display font-bold text-base text-foreground">
            {inventory ? "Update Inventory" : "Set Up Inventory"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-room-type" className="text-sm font-semibold">
              Room Type
            </Label>
            <Input
              id="inv-room-type"
              placeholder="e.g. Standard, Deluxe, Suite"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              required
              className="rounded-xl border-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-total-rooms" className="text-sm font-semibold">
              Total Rooms
            </Label>
            <Input
              id="inv-total-rooms"
              data-ocid="owner_dashboard.inventory.totalrooms_input"
              type="number"
              min={1}
              placeholder="e.g. 20"
              value={totalRooms}
              onChange={(e) => setTotalRooms(e.target.value)}
              required
              className="rounded-xl border-input"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 1 room required.
            </p>
          </div>

          <Button
            data-ocid="owner_dashboard.inventory.submit_button"
            type="submit"
            disabled={isPending}
            className="w-full bg-[oklch(0.52_0.22_25.5)] hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold py-5 rounded-xl transition-all duration-200"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Update Inventory
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Grid
// ─────────────────────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  bookings,
  blockedDates,
}: {
  year: number;
  month: number; // 0-indexed
  bookings: Booking[];
  blockedDates: BlockedDate[];
}) {
  // Build grid data
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blockedSet = new Set(blockedDates.map((bd) => bd.date));

  function getBookingsForDate(dateStr: string) {
    return bookings.filter(
      (b) => dateStr >= b.checkIn && dateStr <= b.checkOut,
    );
  }

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const today = getTodayStr();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Day names header */}
      <div className="grid grid-cols-7 bg-muted/40 border-b border-border">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wide py-2.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          // Use a composite key: for empty padding cells use negative offset, for day cells use the day number
          const cellKey =
            day === null
              ? `pad-${year}-${month}-pos${idx}`
              : `day-${year}-${month}-${day}`;
          if (day === null) {
            return (
              <div
                key={cellKey}
                className="min-h-[80px] border-b border-r border-border/40 bg-muted/10"
              />
            );
          }

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayBookings = getBookingsForDate(dateStr);
          const isBlocked = blockedSet.has(dateStr);
          const isToday = dateStr === today;

          return (
            <div
              key={cellKey}
              className={`min-h-[80px] p-1.5 border-b border-r border-border/40 relative transition-colors ${
                isBlocked
                  ? "bg-red-50/70"
                  : isToday
                    ? "bg-blue-50/50"
                    : "bg-card hover:bg-muted/20"
              }`}
            >
              {/* Day number */}
              <div
                className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  isToday
                    ? "bg-[oklch(0.52_0.22_25.5)] text-white"
                    : isBlocked
                      ? "text-red-600"
                      : "text-foreground"
                }`}
              >
                {day}
              </div>

              {/* Blocked indicator */}
              {isBlocked && (
                <div className="flex items-center gap-0.5 mb-1">
                  <Ban className="w-2.5 h-2.5 text-red-500" />
                  <span className="text-[9px] text-red-500 font-semibold">
                    Blocked
                  </span>
                </div>
              )}

              {/* Booking dots */}
              <div className="flex flex-wrap gap-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id.toString()}
                    title={`${b.guestName} (${b.status})`}
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      b.status === Status.Confirmed
                        ? "bg-green-500"
                        : b.status === Status.Pending
                          ? "bg-amber-400"
                          : "bg-gray-300"
                    }`}
                  />
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    +{dayBookings.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/20 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <Ban className="w-2.5 h-2.5 text-red-500" />
          Blocked
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Calendar
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarTabProps {
  bookings: Booking[];
  blockedDates: BlockedDate[];
  isLoading: boolean;
  actor: import("../backend").backendInterface | null;
  onRefresh: () => void;
}

function CalendarTab({
  bookings,
  blockedDates,
  isLoading,
  actor,
  onRefresh,
}: CalendarTabProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const { mutate: doBlockDate, isPending: isBlocking } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.blockDate(blockDate, blockReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-blocked-dates"] });
      onRefresh();
      setBlockDate("");
      setBlockReason("");
      toast.success("Date blocked successfully.");
    },
    onError: () => {
      toast.error("Failed to block date. Please try again.");
    },
  });

  const { mutate: doUnblockDate, isPending: isUnblocking } = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.unblockDate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-blocked-dates"] });
      onRefresh();
      toast.success("Date unblocked.");
    },
    onError: () => {
      toast.error("Failed to unblock date.");
    },
  });

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) {
      toast.error("Please select a date to block.");
      return;
    }
    doBlockDate();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-xl text-foreground">
          {monthNames[viewMonth]} {viewYear}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="w-9 h-9 p-0 rounded-xl border-border"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="w-9 h-9 p-0 rounded-xl border-border"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div
          data-ocid="owner_dashboard.calendar.loading_state"
          className="skeleton-shimmer rounded-2xl h-[360px]"
        />
      ) : (
        <CalendarGrid
          year={viewYear}
          month={viewMonth}
          bookings={bookings}
          blockedDates={blockedDates}
        />
      )}

      <Separator />

      {/* Block a Date Form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <Ban className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="font-display font-bold text-base text-foreground">
            Block a Date
          </h3>
        </div>

        <form onSubmit={handleBlockSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="block-date-input"
                className="text-sm font-semibold"
              >
                Date to Block
              </Label>
              <Input
                id="block-date-input"
                data-ocid="owner_dashboard.calendar.date_input"
                type="date"
                value={blockDate}
                min={getTodayStr()}
                onChange={(e) => setBlockDate(e.target.value)}
                required
                className="rounded-xl border-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="block-reason-input"
                className="text-sm font-semibold"
              >
                Reason (optional)
              </Label>
              <Input
                id="block-reason-input"
                data-ocid="owner_dashboard.calendar.reason_input"
                placeholder="e.g. Maintenance, Private event"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="rounded-xl border-input"
              />
            </div>
          </div>

          <Button
            data-ocid="owner_dashboard.calendar.block_date_button"
            type="submit"
            disabled={isBlocking}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2.5 rounded-xl transition-all duration-200"
          >
            {isBlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Blocking...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Block Date
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Blocked Dates List */}
      <div>
        <h3 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-500" />
          Blocked Dates
          {blockedDates.length > 0 && (
            <Badge className="bg-red-50 text-red-700 border-red-200 font-semibold text-xs ml-1">
              {blockedDates.length}
            </Badge>
          )}
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div key={k} className="skeleton-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : blockedDates.length === 0 ? (
          <div
            data-ocid="owner_dashboard.blocked_dates.empty_state"
            className="text-center py-8 bg-muted/30 rounded-2xl border border-dashed border-border"
          >
            <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-medium">
              No dates blocked yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedDates.map((bd, idx) => (
              <motion.div
                key={bd.id.toString()}
                data-ocid={`owner_dashboard.blocked_date.item.${idx + 1}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center justify-between gap-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-800">
                      {formatDate(bd.date)}
                    </p>
                    {bd.reason && (
                      <p className="text-xs text-red-600">{bd.reason}</p>
                    )}
                  </div>
                </div>
                <Button
                  data-ocid={`owner_dashboard.blocked_date.delete_button.${idx + 1}`}
                  size="sm"
                  variant="outline"
                  disabled={isUnblocking}
                  onClick={() => doUnblockDate(bd.id)}
                  className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 font-semibold rounded-lg text-xs gap-1.5 shrink-0"
                >
                  {isUnblocking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Unblock
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner Dashboard
// ─────────────────────────────────────────────────────────────────────────────

interface OwnerDashboardProps {
  open: boolean;
  onClose: () => void;
}

export function OwnerDashboard({ open, onClose }: OwnerDashboardProps) {
  const { actor, isFetching: actorLoading } = useActor();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const queryClient = useQueryClient();

  // Load owner hotel
  const {
    data: hotel,
    isLoading: hotelLoading,
    isError: hotelError,
  } = useQuery<Hotel>({
    queryKey: ["owner-hotel"],
    queryFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.getOwnerHotel();
    },
    enabled: open && !!actor && !actorLoading,
    retry: false,
  });

  // Load owner bookings
  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery<Booking[]>({
    queryKey: ["owner-bookings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOwnerBookings();
    },
    enabled: open && !!actor && !actorLoading && !!hotel,
  });

  // Load room inventory
  const {
    data: inventory,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useQuery<RoomInventory | null>({
    queryKey: ["owner-inventory"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getOwnerRoomInventory();
      } catch {
        return null;
      }
    },
    enabled: open && !!actor && !actorLoading && !!hotel,
  });

  // Load blocked dates
  const {
    data: blockedDates = [],
    isLoading: blockedDatesLoading,
    refetch: refetchBlockedDates,
  } = useQuery<BlockedDate[]>({
    queryKey: ["owner-blocked-dates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlockedDates();
    },
    enabled: open && !!actor && !actorLoading && !!hotel,
  });

  const handleRefreshAll = () => {
    void refetchBookings();
    void refetchInventory();
    void refetchBlockedDates();
    queryClient.invalidateQueries({ queryKey: ["owner-hotel"] });
  };

  if (!open) return null;

  const TABS: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Home className="w-4 h-4" /> },
    {
      id: "bookings",
      label: "Bookings",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <CalendarDays className="w-4 h-4" />,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="owner_dashboard.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[oklch(0.52_0.22_25.5)] shadow-[0_2px_12px_oklch(0_0_0/0.12)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                      Owner Dashboard
                    </span>
                    <span className="text-white/70 text-xs font-medium">
                      {hotel ? hotel.name : "HIDESTAY"}
                    </span>
                  </div>
                </div>
                <Button
                  data-ocid="owner_dashboard.close_button"
                  onClick={onClose}
                  size="sm"
                  className="bg-white text-[oklch(0.52_0.22_25.5)] hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Listings</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Loading hotel */}
          {(hotelLoading || actorLoading) && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[oklch(0.52_0.22_25.5)] mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                Loading your dashboard...
              </p>
            </div>
          )}

          {/* Error: not an owner */}
          {!hotelLoading && hotelError && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div
                data-ocid="owner_dashboard.error_state"
                className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border"
              >
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Hotel Not Assigned
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  No hotel is linked to your account. Please contact a super
                  admin to assign your hotel.
                </p>
                <Button
                  onClick={onClose}
                  className="bg-[oklch(0.52_0.22_25.5)] hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8"
                >
                  Back to Listings
                </Button>
              </div>
            </div>
          )}

          {/* Dashboard content */}
          {!hotelLoading && !hotelError && hotel && (
            <>
              {/* Tab Navigation */}
              <div className="sticky top-16 z-10 bg-background border-b border-border shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        data-ocid={`owner_dashboard.tab.${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
                          activeTab === tab.id
                            ? "border-[oklch(0.52_0.22_25.5)] text-[oklch(0.52_0.22_25.5)]"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.id === "bookings" && bookings.length > 0 && (
                          <span className="bg-[oklch(0.52_0.22_25.5)] text-white text-[10px] font-extrabold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none">
                            {bookings.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div key="overview">
                      <OverviewTab
                        hotel={hotel}
                        inventory={inventory ?? null}
                        bookings={bookings}
                        onGoToBookings={() => setActiveTab("bookings")}
                        onGoToCalendar={() => setActiveTab("calendar")}
                      />
                    </motion.div>
                  )}

                  {activeTab === "bookings" && (
                    <motion.div key="bookings">
                      <BookingsTab
                        bookings={bookings}
                        isLoading={bookingsLoading}
                        actor={actor}
                        onRefresh={handleRefreshAll}
                      />
                    </motion.div>
                  )}

                  {activeTab === "inventory" && (
                    <motion.div key="inventory">
                      <InventoryTab
                        inventory={inventory ?? null}
                        isLoading={inventoryLoading}
                        actor={actor}
                        onRefresh={handleRefreshAll}
                      />
                    </motion.div>
                  )}

                  {activeTab === "calendar" && (
                    <motion.div key="calendar">
                      <CalendarTab
                        bookings={bookings}
                        blockedDates={blockedDates}
                        isLoading={blockedDatesLoading}
                        actor={actor}
                        onRefresh={handleRefreshAll}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsOwner hook — checks if user has an associated hotel
// ─────────────────────────────────────────────────────────────────────────────

export function useIsOwner(enabled: boolean) {
  const { actor, isFetching: actorLoading } = useActor();

  const { data: isOwner = false, isLoading } = useQuery<boolean>({
    queryKey: ["is-owner"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        await actor.getOwnerHotel();
        return true;
      } catch {
        return false;
      }
    },
    enabled: enabled && !!actor && !actorLoading,
    retry: false,
    staleTime: 60_000,
  });

  return { isOwner, isLoading };
}
