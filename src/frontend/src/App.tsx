import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Crown,
  Home,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  User,
  Users,
  Wifi,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Booking, Hotel } from "./backend.d";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface SearchParams {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

interface FilterState {
  minPrice: string;
  maxPrice: string;
  amenities: string[];
}

const HOTEL_IMAGE_MAP: Record<number, string> = {
  1: "/assets/generated/patna-hotel-1.dim_800x500.jpg",
  2: "/assets/generated/patna-hotel-2.dim_800x500.jpg",
  3: "/assets/generated/patna-hotel-3.dim_800x500.jpg",
  4: "/assets/generated/gaya-hotel-1.dim_800x500.jpg",
  5: "/assets/generated/gaya-hotel-2.dim_800x500.jpg",
  6: "/assets/generated/gaya-hotel-3.dim_800x500.jpg",
  7: "/assets/generated/muzaffarpur-hotel-1.dim_800x500.jpg",
  8: "/assets/generated/muzaffarpur-hotel-2.dim_800x500.jpg",
  9: "/assets/generated/muzaffarpur-hotel-3.dim_800x500.jpg",
  10: "/assets/generated/ranchi-hotel-1.dim_800x500.jpg",
  11: "/assets/generated/ranchi-hotel-2.dim_800x500.jpg",
  12: "/assets/generated/ranchi-hotel-3.dim_800x500.jpg",
  13: "/assets/generated/varanasi-hotel-1.dim_800x500.jpg",
  14: "/assets/generated/varanasi-hotel-2.dim_800x500.jpg",
  15: "/assets/generated/varanasi-hotel-3.dim_800x500.jpg",
  16: "/assets/generated/lucknow-hotel-1.dim_800x500.jpg",
  17: "/assets/generated/lucknow-hotel-2.dim_800x500.jpg",
  18: "/assets/generated/lucknow-hotel-3.dim_800x500.jpg",
};

function getHotelImageSrc(imageIndex: bigint): string {
  const idx = Number(imageIndex);
  return (
    HOTEL_IMAGE_MAP[idx] ??
    HOTEL_IMAGE_MAP[((idx - 1) % 18) + 1] ??
    "/assets/generated/patna-hotel-1.dim_800x500.jpg"
  );
}

function formatPrice(price: bigint): string {
  return new Intl.NumberFormat("en-IN").format(Number(price));
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Plans Data
// ─────────────────────────────────────────────────────────────────────────────

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "₹999",
    period: "/month",
    icon: <Home className="w-5 h-5" />,
    color: "border-border",
    badgeColor: "bg-muted text-muted-foreground",
    features: ["1 Hotel Listing", "Basic Support", "Booking Notifications"],
    ocid: "subscription.basic_button" as const,
  },
  {
    id: "standard",
    name: "Standard",
    price: "₹1,999",
    period: "/month",
    icon: <Zap className="w-5 h-5" />,
    color: "border-brand",
    badgeColor: "bg-brand text-white",
    features: [
      "Up to 5 Hotel Listings",
      "Priority Support",
      "Booking Notifications",
      "Featured Badge",
    ],
    ocid: "subscription.standard_button" as const,
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "₹3,999",
    period: "/month",
    icon: <Crown className="w-5 h-5" />,
    color: "border-[oklch(0.65_0.18_60)]",
    badgeColor: "bg-[oklch(0.75_0.15_75)] text-white",
    features: [
      "Unlimited Listings",
      "Dedicated Manager",
      "All Standard Features",
      "Homepage Promotion",
    ],
    ocid: "subscription.premium_button" as const,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Card
// ─────────────────────────────────────────────────────────────────────────────

function HotelCardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-card border border-border">
      <div className="skeleton-shimmer h-[200px] w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton-shimmer h-5 w-3/4 rounded" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded" />
        <div className="flex gap-2">
          <div className="skeleton-shimmer h-6 w-14 rounded-full" />
          <div className="skeleton-shimmer h-6 w-10 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton-shimmer h-7 w-24 rounded" />
          <div className="skeleton-shimmer h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Amenity Chip
// ─────────────────────────────────────────────────────────────────────────────

function AmenityChip({ amenity }: { amenity: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string }> = {
    WiFi: { icon: <Wifi className="w-3 h-3" />, label: "WiFi" },
    AC: { icon: <Wind className="w-3 h-3" />, label: "AC" },
    Parking: { icon: <Car className="w-3 h-3" />, label: "Parking" },
  };
  const item = config[amenity] || { icon: null, label: amenity };
  return (
    <Badge
      variant="secondary"
      className="text-xs px-2 py-0.5 gap-1 bg-accent text-accent-foreground border-0 font-medium"
    >
      {item.icon}
      {item.label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotel Card
// ─────────────────────────────────────────────────────────────────────────────

interface HotelCardProps {
  hotel: Hotel;
  index: number;
  onBookNow: (hotel: Hotel) => void;
}

function HotelCard({ hotel, index, onBookNow }: HotelCardProps) {
  return (
    <motion.div
      data-ocid={`hotel.card.${index}`}
      className="bg-card rounded-2xl overflow-hidden hotel-card-hover group"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.055,
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-[210px]">
        <img
          src={getHotelImageSrc(hotel.imageIndex)}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Star badge */}
        <div className="absolute top-3 left-3">
          <div className="bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/15">
            <div className="flex items-center gap-0.5">
              {(["s1", "s2", "s3", "s4", "s5"] as const).map((k, i) => (
                <Star
                  key={k}
                  className={`w-3 h-3 ${i < Number(hotel.starRating) ? "star-gold fill-current" : "text-white/30"}`}
                />
              ))}
              <span className="text-white/90 text-[11px] font-bold ml-1">
                {Number(hotel.starRating)}.0
              </span>
            </div>
          </div>
        </div>

        {/* Pay at Hotel badge */}
        <div className="absolute top-3 right-3">
          <div className="bg-green-600/90 backdrop-blur-md rounded-lg px-2 py-1 border border-green-400/30">
            <span className="text-white text-[10px] font-bold">
              Pay at Hotel
            </span>
          </div>
        </div>

        {/* City tag */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90 text-xs font-medium">
          <MapPin className="w-3 h-3 text-white/70 flex-shrink-0" />
          <span>{hotel.city}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-4">
        <h3 className="font-display font-bold text-[15px] leading-snug text-card-foreground line-clamp-1 mb-1.5">
          {hotel.name}
        </h3>

        {/* Room Type Badge */}
        {hotel.description.includes(" | ") && (
          <div className="mb-2">
            <Badge
              variant="secondary"
              className="text-[11px] px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold rounded-md"
            >
              {hotel.description.split(" | ")[0]}
            </Badge>
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
          {hotel.description.includes(" | ")
            ? hotel.description.split(" | ").slice(1).join(" | ")
            : hotel.description}
        </p>

        {/* Amenities */}
        {hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {hotel.amenities.slice(0, 3).map((a) => (
              <AmenityChip key={a} amenity={a} />
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-border/70">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
              per night
            </span>
            <span className="text-2xl font-display font-extrabold text-brand leading-tight">
              ₹{formatPrice(hotel.pricePerNight)}
            </span>
          </div>
          <Button
            data-ocid={`hotel.book_now_button.${index}`}
            onClick={() => onBookNow(hotel)}
            className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.04] active:scale-95 shadow-sm shadow-[oklch(0.52_0.22_25.5/0.3)]"
          >
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking Modal
// ─────────────────────────────────────────────────────────────────────────────

interface BookingModalProps {
  hotel: Hotel | null;
  open: boolean;
  onClose: () => void;
  searchParams: SearchParams;
  actor: import("./backend").backendInterface | null;
}

function BookingModal({
  hotel,
  open,
  onClose,
  searchParams,
  actor,
}: BookingModalProps) {
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    phone: "",
    checkIn: searchParams.checkIn || getTodayStr(),
    checkOut: searchParams.checkOut || getTomorrowStr(),
    guestCount: searchParams.guests,
  });
  const [bookingId, setBookingId] = useState<bigint | null>(null);

  const updateField = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: async () => {
      if (!actor || !hotel) throw new Error("Not ready");
      const id = await actor.createBooking(
        hotel.id,
        form.guestName,
        form.guestEmail,
        form.phone,
        form.checkIn,
        form.checkOut,
        BigInt(form.guestCount),
        BigInt(Date.now()),
      );
      return id;
    },
    onSuccess: (id) => {
      setBookingId(id);
      toast.success("Room reserved! Pay at the hotel on arrival.");
    },
    onError: () => {
      toast.error("Reservation failed. Please try again.");
    },
  });

  const handleClose = () => {
    onClose();
    setBookingId(null);
    setForm({
      guestName: "",
      guestEmail: "",
      phone: "",
      checkIn: searchParams.checkIn || getTodayStr(),
      checkOut: searchParams.checkOut || getTomorrowStr(),
      guestCount: searchParams.guests,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBooking();
  };

  if (!hotel) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="booking.modal"
        className="max-w-md w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl shadow-modal"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-brand text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display font-bold text-white">
                Reserve Your Stay
              </DialogTitle>
              <p className="text-white/80 text-sm mt-1 font-medium">
                {hotel.name}
              </p>
            </div>
            <button
              type="button"
              data-ocid="booking.close_button"
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Price badges */}
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1 font-semibold">
              ₹{formatPrice(hotel.pricePerNight)} / night
            </Badge>
            <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1">
              <MapPin className="w-3 h-3 mr-1" />
              {hotel.city}
            </Badge>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {bookingId !== null ? (
            /* Success State */
            <motion.div
              data-ocid="booking.success_state"
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-9 h-9 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                Room Reserved!
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                Your reservation at <strong>{hotel.name}</strong> is confirmed.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-center">
                <p className="text-green-700 font-semibold text-sm flex items-center justify-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  Pay at Hotel — No advance needed
                </p>
              </div>
              <div className="bg-muted rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                  Booking ID
                </p>
                <p className="text-2xl font-display font-bold text-brand">
                  #{bookingId.toString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                <div className="bg-muted/50 rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Check-in
                  </p>
                  <p className="font-semibold">{form.checkIn}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Check-out
                  </p>
                  <p className="font-semibold">{form.checkOut}</p>
                </div>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl"
              >
                Done
              </Button>
            </motion.div>
          ) : (
            /* Form */
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="px-6 py-5 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Pay at Hotel Banner */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-bold text-sm">
                    Pay at Hotel
                  </p>
                  <p className="text-green-600 text-xs">
                    No advance payment required
                  </p>
                </div>
              </div>

              {/* Guest Name */}
              <div className="space-y-1.5">
                <Label htmlFor="guest-name" className="text-sm font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="guest-name"
                    data-ocid="booking.name_input"
                    type="text"
                    placeholder="John Doe"
                    value={form.guestName}
                    onChange={(e) => updateField("guestName", e.target.value)}
                    required
                    className="pl-9 rounded-lg border-input"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="guest-email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="guest-email"
                    data-ocid="booking.email_input"
                    type="email"
                    placeholder="john@example.com"
                    value={form.guestEmail}
                    onChange={(e) => updateField("guestEmail", e.target.value)}
                    required
                    className="pl-9 rounded-lg border-input"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="guest-phone" className="text-sm font-semibold">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="guest-phone"
                    data-ocid="booking.phone_input"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                    className="pl-9 rounded-lg border-input"
                  />
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="check-in" className="text-sm font-semibold">
                    Check-in
                  </Label>
                  <Input
                    id="check-in"
                    data-ocid="booking.checkin_input"
                    type="date"
                    value={form.checkIn}
                    min={getTodayStr()}
                    onChange={(e) => updateField("checkIn", e.target.value)}
                    required
                    className="rounded-lg border-input text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="check-out" className="text-sm font-semibold">
                    Check-out
                  </Label>
                  <Input
                    id="check-out"
                    data-ocid="booking.checkout_input"
                    type="date"
                    value={form.checkOut}
                    min={form.checkIn || getTodayStr()}
                    onChange={(e) => updateField("checkOut", e.target.value)}
                    required
                    className="rounded-lg border-input text-sm"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="space-y-1.5">
                <Label htmlFor="guest-count" className="text-sm font-semibold">
                  Number of Guests
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="guest-count"
                    data-ocid="booking.guests_input"
                    type="number"
                    min={1}
                    max={20}
                    value={form.guestCount}
                    onChange={(e) =>
                      updateField(
                        "guestCount",
                        Number.parseInt(e.target.value) || 1,
                      )
                    }
                    required
                    className="pl-9 rounded-lg border-input"
                  />
                </div>
              </div>

              <Button
                data-ocid="booking.submit_button"
                type="submit"
                disabled={isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-5 rounded-xl mt-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  <>
                    <Banknote className="mr-2 h-4 w-4" />
                    Reserve Room (Pay at Hotel)
                  </>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscription Modal
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="subscription.modal"
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 bg-brand text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-display font-bold text-white">
                List Your Property on HIDESTAY
              </DialogTitle>
              <p className="text-white/80 text-sm mt-1">
                Choose a plan that fits your business. No hidden charges.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: SUBSCRIPTION_PLANS.indexOf(plan) * 0.1 }}
                className={`relative rounded-2xl border-2 ${plan.color} p-5 flex flex-col gap-4 ${plan.popular ? "shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.badgeColor}`}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-display font-extrabold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  data-ocid={plan.ocid}
                  onClick={() =>
                    toast.info(
                      `Contact us at hidestay@example.com to subscribe to ${plan.name} plan.`,
                    )
                  }
                  className={`w-full font-semibold rounded-xl ${
                    plan.popular
                      ? "bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            All plans include unlimited guest bookings. Contact{" "}
            <strong>hidestay@example.com</strong> to get started.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Panel
// ─────────────────────────────────────────────────────────────────────────────

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  actor: import("./backend").backendInterface | null;
}

function AdminPanel({ open, onClose, actor }: AdminPanelProps) {
  const [emailSearch, setEmailSearch] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isFetching: bookingsFetching,
  } = useQuery<Booking[]>({
    queryKey: ["admin-bookings", searchedEmail],
    queryFn: async () => {
      if (!actor || !searchedEmail) return [];
      return actor.getBookingsByEmail(searchedEmail);
    },
    enabled: !!actor && !!searchedEmail,
  });

  const handleSearch = () => {
    if (emailSearch.trim()) {
      setSearchedEmail(emailSearch.trim());
    }
  };

  const isLoadingBookings = bookingsLoading || bookingsFetching;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="admin.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background overflow-y-auto"
        >
          {/* Admin Header */}
          <div className="sticky top-0 z-10 bg-brand shadow-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                      Hotel Admin Panel
                    </span>
                    <span className="text-white/70 text-xs font-medium">
                      HIDESTAY
                    </span>
                  </div>
                </div>
                <Button
                  data-ocid="admin.close_button"
                  onClick={onClose}
                  size="sm"
                  className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Listings</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Bookings Section */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Guest Bookings Lookup
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                Enter a guest email to look up their bookings.
              </p>

              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-ocid="admin.bookings_email_input"
                    type="email"
                    placeholder="guest@example.com"
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 rounded-xl border-input"
                  />
                </div>
                <Button
                  data-ocid="admin.bookings_search_button"
                  onClick={handleSearch}
                  className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Bookings List */}
              {isLoadingBookings ? (
                <div
                  data-ocid="admin.bookings.loading_state"
                  className="text-center py-8"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
                  <p className="text-muted-foreground text-sm mt-2">
                    Loading bookings...
                  </p>
                </div>
              ) : searchedEmail && !isLoadingBookings ? (
                <div data-ocid="admin.bookings_list">
                  {bookings.length === 0 ? (
                    <div
                      data-ocid="admin.bookings.empty_state"
                      className="text-center py-10 bg-muted/40 rounded-2xl"
                    >
                      <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-foreground font-semibold">
                        No bookings found
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        No bookings for <strong>{searchedEmail}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((booking, idx) => (
                        <motion.div
                          key={booking.id.toString()}
                          data-ocid={`admin.booking_item.${idx + 1}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-card border border-border rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-display font-bold text-foreground">
                                Booking #{booking.id.toString()}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {booking.guestName} · {booking.phone}
                              </p>
                            </div>
                            <Badge className="bg-green-50 text-green-700 border-green-200 shrink-0">
                              Pay at Hotel
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Check-in
                              </p>
                              <p className="font-semibold">{booking.checkIn}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Check-out
                              </p>
                              <p className="font-semibold">
                                {booking.checkOut}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Guests
                              </p>
                              <p className="font-semibold">
                                {booking.guestCount.toString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Hotel ID
                              </p>
                              <p className="font-semibold">
                                #{booking.hotelId.toString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {!searchedEmail && (
                <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed border-border">
                  <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Enter an email address to search bookings
                  </p>
                </div>
              )}
            </section>

            <Separator />

            {/* Subscription Plans Section */}
            <section>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Choose Your Subscription Plan
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                List your hotel on HIDESTAY and reach budget travelers across
                Bihar and nearby states.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: SUBSCRIPTION_PLANS.indexOf(plan) * 0.1,
                    }}
                    className={`relative rounded-2xl border-2 ${plan.color} p-5 flex flex-col gap-4 ${plan.popular ? "shadow-lg" : ""}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.badgeColor}`}
                      >
                        {plan.icon}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-foreground">
                          {plan.name}
                        </h3>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl font-display font-extrabold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {plan.period}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-2 flex-1">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() =>
                        toast.info(
                          `Contact us at hidestay@example.com to subscribe to ${plan.name} plan.`,
                        )
                      }
                      className={`w-full font-semibold rounded-xl ${
                        plan.popular
                          ? "bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      Contact Us
                    </Button>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

function FilterSidebar({
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: FilterSidebarProps) {
  const toggleAmenity = (amenity: string) => {
    onFiltersChange({
      ...filters,
      amenities: filters.amenities.includes(amenity)
        ? filters.amenities.filter((a) => a !== amenity)
        : [...filters.amenities, amenity],
    });
  };

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-brand" />
          Filters
        </h2>
        <button
          type="button"
          data-ocid="filter.reset_button"
          onClick={onReset}
          className="text-xs text-brand hover:text-[oklch(0.45_0.22_25.5)] font-semibold underline underline-offset-2 transition-colors"
        >
          Reset all
        </button>
      </div>

      <Separator className="mb-5" />

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3 text-foreground">
          Price per Night (₹)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label
              htmlFor="min-price"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Min Price
            </Label>
            <Input
              id="min-price"
              data-ocid="filter.min_price_input"
              type="number"
              min={0}
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) =>
                onFiltersChange({ ...filters, minPrice: e.target.value })
              }
              className="text-sm rounded-lg"
            />
          </div>
          <div>
            <Label
              htmlFor="max-price"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Max Price
            </Label>
            <Input
              id="max-price"
              data-ocid="filter.max_price_input"
              type="number"
              min={0}
              placeholder="50000"
              value={filters.maxPrice}
              onChange={(e) =>
                onFiltersChange({ ...filters, maxPrice: e.target.value })
              }
              className="text-sm rounded-lg"
            />
          </div>
        </div>
      </div>

      <Separator className="mb-5" />

      {/* Amenities */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3 text-foreground">
          Amenities
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Checkbox
              id="wifi"
              data-ocid="filter.wifi_checkbox"
              checked={filters.amenities.includes("WiFi")}
              onCheckedChange={() => toggleAmenity("WiFi")}
              className="border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
            />
            <Label
              htmlFor="wifi"
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Wifi className="w-4 h-4 text-muted-foreground" />
              Free WiFi
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="ac"
              data-ocid="filter.ac_checkbox"
              checked={filters.amenities.includes("AC")}
              onCheckedChange={() => toggleAmenity("AC")}
              className="border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
            />
            <Label
              htmlFor="ac"
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Wind className="w-4 h-4 text-muted-foreground" />
              Air Conditioning
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="parking"
              data-ocid="filter.parking_checkbox"
              checked={filters.amenities.includes("Parking")}
              onCheckedChange={() => toggleAmenity("Parking")}
              className="border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
            />
            <Label
              htmlFor="parking"
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Car className="w-4 h-4 text-muted-foreground" />
              Free Parking
            </Label>
          </div>
        </div>
      </div>

      <Button
        data-ocid="filter.apply_button"
        onClick={onApply}
        className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-2.5 transition-all duration-200"
      >
        Apply Filters
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Modal
// ─────────────────────────────────────────────────────────────────────────────

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

function LoginModal({ open, onClose }: LoginModalProps) {
  const { login, isLoggingIn, identity } = useInternetIdentity();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Sign In to HIDESTAY
          </DialogTitle>
        </DialogHeader>
        {identity ? (
          <div className="py-4 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-xs font-mono bg-muted rounded-lg p-2 break-all text-foreground">
              {identity.getPrincipal().toString()}
            </p>
            <Button
              onClick={onClose}
              className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white rounded-xl"
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect securely with Internet Identity — no passwords required.
            </p>
            <Button
              onClick={() => {
                login();
                onClose();
              }}
              disabled={isLoggingIn}
              className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in with Internet Identity
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onLoginClick: () => void;
  onListPropertyClick: () => void;
  onAdminClick: () => void;
  isAdmin: boolean;
}

function Header({
  onLoginClick,
  onListPropertyClick,
  onAdminClick,
  isAdmin,
}: HeaderProps) {
  const { identity, clear } = useInternetIdentity();
  const isLoggedIn = !!identity;

  return (
    <header className="sticky top-0 z-50 bg-brand shadow-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            data-ocid="header.logo"
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="bg-white/20 rounded-xl p-2">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-extrabold text-white tracking-tight">
                HIDESTAY
              </span>
              <span className="text-white/60 text-[9px] font-semibold tracking-widest uppercase hidden sm:block">
                Bihar & Nearby States
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              data-ocid="header.list_property_button"
              onClick={onListPropertyClick}
              variant="outline"
              size="sm"
              className="hidden sm:flex border-white/50 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold rounded-lg text-sm"
            >
              <Building2 className="w-4 h-4 mr-1.5" />
              List Your Property
            </Button>

            {isAdmin && (
              <Button
                data-ocid="header.admin_button"
                onClick={onAdminClick}
                size="sm"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold rounded-lg text-sm gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Button>
            )}

            {isLoggedIn ? (
              <Button
                data-ocid="header.login_button"
                onClick={clear}
                size="sm"
                className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            ) : (
              <Button
                data-ocid="header.login_button"
                onClick={onLoginClick}
                size="sm"
                className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Search Section
// ─────────────────────────────────────────────────────────────────────────────

const CITY_CHIPS = [
  "Patna",
  "Gaya",
  "Muzaffarpur",
  "Ranchi",
  "Varanasi",
  "Lucknow",
  "Kolkata",
];

interface HeroSectionProps {
  searchParams: SearchParams;
  onSearchChange: (p: SearchParams) => void;
  onSearch: () => void;
  onCityChip: (city: string) => void;
  isLoading: boolean;
}

function HeroSection({
  searchParams,
  onSearchChange,
  onSearch,
  onCityChip,
  isLoading,
}: HeroSectionProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section
      className="relative min-h-[500px] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `url('/assets/generated/hero-bg.dim_1600x800.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Layered overlay for depth */}
      <div className="absolute inset-0 hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

      {/* Atmospheric blobs */}
      <div className="absolute top-8 right-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[oklch(0.52_0.22_25.5/0.2)] blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-14">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5 border border-white/20">
            <MapPin className="w-3 h-3 text-white/80" />
            Bihar &amp; Nearby States
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight">
            Find your
            <br className="hidden sm:block" />{" "}
            <span className="text-white/90">perfect stay</span>
          </h1>
          <p className="text-white/75 text-base sm:text-lg font-medium max-w-xl mx-auto">
            Affordable stays in Bihar, Jharkhand, UP &amp; West Bengal
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-modal overflow-hidden"
          >
            {/* Field row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_0.7fr_auto]">
              {/* City */}
              <div className="px-5 py-3.5 flex flex-col gap-1">
                <label
                  htmlFor="search-city"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <MapPin className="w-3 h-3 text-brand" />
                  Destination
                </label>
                <input
                  id="search-city"
                  data-ocid="search.city_input"
                  type="text"
                  placeholder="e.g. Patna, Gaya, Ranchi"
                  value={searchParams.city}
                  onChange={(e) =>
                    onSearchChange({ ...searchParams, city: e.target.value })
                  }
                  className="text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 bg-transparent border-0 outline-none focus:outline-none w-full"
                />
              </div>

              {/* Divider */}
              <div className="hidden lg:block self-stretch w-px bg-border my-3" />

              {/* Check-in */}
              <div className="px-5 py-3.5 flex flex-col gap-1 border-t border-border sm:border-t-0 lg:border-l-0">
                <label
                  htmlFor="search-checkin"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Calendar className="w-3 h-3 text-brand" />
                  Check-in
                </label>
                <input
                  id="search-checkin"
                  data-ocid="search.checkin_input"
                  type="date"
                  value={searchParams.checkIn}
                  min={getTodayStr()}
                  onChange={(e) =>
                    onSearchChange({ ...searchParams, checkIn: e.target.value })
                  }
                  className="text-sm font-semibold text-foreground bg-transparent border-0 outline-none focus:outline-none w-full"
                />
              </div>

              {/* Divider */}
              <div className="hidden lg:block self-stretch w-px bg-border my-3" />

              {/* Check-out */}
              <div className="px-5 py-3.5 flex flex-col gap-1 border-t border-border sm:border-l sm:border-t-0 lg:border-l-0">
                <label
                  htmlFor="search-checkout"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Calendar className="w-3 h-3 text-brand" />
                  Check-out
                </label>
                <input
                  id="search-checkout"
                  data-ocid="search.checkout_input"
                  type="date"
                  value={searchParams.checkOut}
                  min={searchParams.checkIn || getTodayStr()}
                  onChange={(e) =>
                    onSearchChange({
                      ...searchParams,
                      checkOut: e.target.value,
                    })
                  }
                  className="text-sm font-semibold text-foreground bg-transparent border-0 outline-none focus:outline-none w-full"
                />
              </div>

              {/* Divider */}
              <div className="hidden lg:block self-stretch w-px bg-border my-3" />

              {/* Guests */}
              <div className="px-5 py-3.5 flex flex-col gap-1 border-t border-border lg:border-t-0">
                <label
                  htmlFor="search-guests"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                >
                  <Users className="w-3 h-3 text-brand" />
                  Guests
                </label>
                <input
                  id="search-guests"
                  data-ocid="search.guests_input"
                  type="number"
                  min={1}
                  max={20}
                  value={searchParams.guests}
                  onChange={(e) =>
                    onSearchChange({
                      ...searchParams,
                      guests: Number.parseInt(e.target.value) || 1,
                    })
                  }
                  className="text-sm font-semibold text-foreground bg-transparent border-0 outline-none focus:outline-none w-full"
                />
              </div>

              {/* Search Button */}
              <div className="p-3">
                <Button
                  data-ocid="search.submit_button"
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-full min-h-[52px] bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold rounded-xl text-sm whitespace-nowrap transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md shadow-[oklch(0.52_0.22_25.5/0.35)] gap-2 flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </form>

          {/* City Chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
            className="flex flex-wrap gap-2 mt-4 justify-center"
          >
            {CITY_CHIPS.map((city, idx) => (
              <button
                key={city}
                type="button"
                data-ocid={`search.city_chip.${idx + 1}`}
                onClick={() => onCityChip(city)}
                className="bg-white/20 hover:bg-white/35 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full border border-white/25 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {city}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust Strip
// ─────────────────────────────────────────────────────────────────────────────

function TrustStrip() {
  const stats = [
    {
      icon: <Building2 className="w-5 h-5 text-brand" />,
      value: "Budget",
      label: "Friendly Prices",
    },
    {
      icon: <MapPin className="w-5 h-5 text-brand" />,
      value: "Bihar+",
      label: "Nearby States",
    },
    {
      icon: <Banknote className="w-5 h-5 text-brand" />,
      value: "Pay at",
      label: "Hotel — No Advance",
    },
    {
      icon: <BadgeCheck className="w-5 h-5 text-brand" />,
      value: "Zero",
      label: "Hidden Charges",
    },
  ];

  return (
    <div className="trust-strip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[oklch(0.9_0.01_25.5)]">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-3 px-4 sm:px-6 py-4"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white shadow-xs flex items-center justify-center border border-[oklch(0.93_0.01_25.5)]">
                {s.icon}
              </div>
              <div>
                <div className="text-base font-display font-extrabold text-foreground leading-tight">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground font-medium leading-tight">
                  {s.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Filter Toggle
// ─────────────────────────────────────────────────────────────────────────────

function MobileFilterPanel({
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);

  const handleApply = () => {
    onApply();
    setOpen(false);
  };

  return (
    <div className="lg:hidden mb-4">
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between border-border font-semibold"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand" />
          Filters
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-2"
          >
            <FilterSidebar
              filters={filters}
              onFiltersChange={onFiltersChange}
              onApply={handleApply}
              onReset={onReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { actor, isFetching: actorLoading } = useActor();

  // ── State
  const [searchParams, setSearchParams] = useState<SearchParams>({
    city: "",
    checkIn: getTodayStr(),
    checkOut: getTomorrowStr(),
    guests: 2,
  });

  const [filters, setFilters] = useState<FilterState>({
    minPrice: "",
    maxPrice: "",
    amenities: [],
  });

  const [queryParams, setQueryParams] = useState<{
    city?: string;
    minPrice?: bigint;
    maxPrice?: bigint;
    amenities?: string[];
  }>({});

  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // ── Admin check
  const { data: isAdmin = false } = useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorLoading,
  });

  // ── Hotels Query
  const {
    data: hotels = [],
    isLoading,
    isFetching,
  } = useQuery<Hotel[]>({
    queryKey: ["hotels", queryParams],
    queryFn: async () => {
      if (!actor) return [];
      return actor.searchHotels(queryParams);
    },
    enabled: !!actor && !actorLoading,
  });

  // ── Handlers
  const buildSearchParams = useCallback(
    (city: string) => {
      const params: typeof queryParams = {};
      if (city.trim()) params.city = city.trim();
      if (filters.minPrice)
        params.minPrice = BigInt(Number.parseInt(filters.minPrice));
      if (filters.maxPrice)
        params.maxPrice = BigInt(Number.parseInt(filters.maxPrice));
      if (filters.amenities.length > 0) params.amenities = filters.amenities;
      return params;
    },
    [filters],
  );

  const handleSearch = useCallback(() => {
    setQueryParams(buildSearchParams(searchParams.city));
  }, [searchParams.city, buildSearchParams]);

  const handleApplyFilters = useCallback(() => {
    setQueryParams(buildSearchParams(searchParams.city));
  }, [searchParams.city, buildSearchParams]);

  const handleResetFilters = useCallback(() => {
    setFilters({ minPrice: "", maxPrice: "", amenities: [] });
    setQueryParams(
      searchParams.city.trim() ? { city: searchParams.city.trim() } : {},
    );
  }, [searchParams.city]);

  const handleBookNow = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setBookingModalOpen(true);
  };

  // City chip handler: update search params & trigger search
  const handleCityChipSearch = useCallback(
    (city: string) => {
      setSearchParams((prev) => ({ ...prev, city }));
      setQueryParams(buildSearchParams(city));
    },
    [buildSearchParams],
  );

  const isSearching = isLoading || isFetching || actorLoading;

  // ── Section heading
  const sectionHeading = queryParams.city
    ? `Hotels in ${queryParams.city}`
    : "Popular Hotels";

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <Header
        onLoginClick={() => setLoginModalOpen(true)}
        onListPropertyClick={() => setSubscriptionModalOpen(true)}
        onAdminClick={() => setAdminPanelOpen(true)}
        isAdmin={isAdmin}
      />

      {/* Hero */}
      <HeroSection
        searchParams={searchParams}
        onSearchChange={setSearchParams}
        onSearch={handleSearch}
        onCityChip={handleCityChipSearch}
        isLoading={isSearching}
      />

      {/* Trust Strip */}
      <TrustStrip />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Filters */}
        <MobileFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
            </div>
          </aside>

          {/* Hotel Grid */}
          <section className="flex-1 min-w-0">
            {/* Section Heading */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {sectionHeading}
                </h2>
                {!isSearching && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {hotels.length}{" "}
                    {hotels.length === 1 ? "property" : "properties"} found
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isSearching && (
              <div
                data-ocid="hotel.loading_state"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                {(["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"] as const).map(
                  (k) => (
                    <HotelCardSkeleton key={k} />
                  ),
                )}
              </div>
            )}

            {/* Empty State */}
            {!isSearching && hotels.length === 0 && (
              <motion.div
                data-ocid="hotel.empty_state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-4"
              >
                <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-5">
                  <Search className="w-9 h-9 text-brand" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No hotels found
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  We couldn't find any hotels matching your search. Try Patna,
                  Gaya, Ranchi or other cities.
                </p>
                <Button
                  onClick={() => {
                    setSearchParams((p) => ({ ...p, city: "" }));
                    setFilters({ minPrice: "", maxPrice: "", amenities: [] });
                    setQueryParams({});
                  }}
                  className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl"
                >
                  View all hotels
                </Button>
              </motion.div>
            )}

            {/* Hotel Grid */}
            {!isSearching && hotels.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {hotels.map((hotel, i) => (
                  <HotelCard
                    key={hotel.id.toString()}
                    hotel={hotel}
                    index={i + 1}
                    onBookNow={handleBookNow}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-brand rounded-lg p-1.5">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-foreground block leading-none">
                  HIDESTAY
                </span>
                <span className="text-xs text-muted-foreground">
                  Bihar & Nearby States
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="hover:text-brand transition-colors cursor-pointer">
                About Us
              </span>
              <span className="hover:text-brand transition-colors cursor-pointer">
                Privacy Policy
              </span>
              <span className="hover:text-brand transition-colors cursor-pointer">
                Terms of Service
              </span>
              <span className="hover:text-brand transition-colors cursor-pointer">
                Contact
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-center sm:text-right">
              © {new Date().getFullYear()}. Built with ♥ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline font-medium"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <BookingModal
        hotel={selectedHotel}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        searchParams={searchParams}
        actor={actor}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
      />

      {/* Admin Panel */}
      <AdminPanel
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        actor={actor}
      />
    </div>
  );
}
