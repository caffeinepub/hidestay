import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { HttpAgent } from "@icp-sdk/core/agent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BookOpen,
  Building2,
  Calendar,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Home,
  ImageIcon,
  Info,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ThumbsDown,
  ThumbsUp,
  Upload,
  User,
  UserCircle,
  Users,
  Wifi,
  Wind,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Booking, Hotel, PropertyListing } from "./backend.d";
import {
  HotelApprovalStatus,
  PropertyListingStatus,
  Status,
} from "./backend.d";
import { AdminPasswordAuth } from "./components/AdminPasswordAuth";
import { OwnerDashboard, useIsOwner } from "./components/OwnerDashboard";
import { SuperAdminPanel } from "./components/SuperAdminPanel";
import { loadConfig } from "./config";
import {
  CustomerAuthProvider,
  useCustomerAuth,
} from "./contexts/CustomerAuthContext";
import { StorageClient } from "./utils/StorageClient";

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
  1: "/assets/generated/haridwar-hotel-1.dim_800x500.jpg",
  2: "/assets/generated/haridwar-hotel-2.dim_800x500.jpg",
  3: "/assets/generated/haridwar-hotel-3.dim_800x500.jpg",
  4: "/assets/generated/rishikesh-hotel-1.dim_800x500.jpg",
  5: "/assets/generated/rishikesh-hotel-2.dim_800x500.jpg",
  6: "/assets/generated/rishikesh-hotel-3.dim_800x500.jpg",
  7: "/assets/generated/mussoorie-hotel-1.dim_800x500.jpg",
  8: "/assets/generated/mussoorie-hotel-2.dim_800x500.jpg",
  9: "/assets/generated/mussoorie-hotel-3.dim_800x500.jpg",
  10: "/assets/generated/dhanaulti-hotel-1.dim_800x500.jpg",
  11: "/assets/generated/dhanaulti-hotel-2.dim_800x500.jpg",
  12: "/assets/generated/dhanaulti-hotel-3.dim_800x500.jpg",
  13: "/assets/generated/dehradun-hotel-1.dim_800x500.jpg",
  14: "/assets/generated/dehradun-hotel-2.dim_800x500.jpg",
  15: "/assets/generated/dehradun-hotel-3.dim_800x500.jpg",
};

function getHotelImageSrc(imageIndex: bigint): string {
  const idx = Number(imageIndex);
  return (
    HOTEL_IMAGE_MAP[idx] ??
    HOTEL_IMAGE_MAP[((idx - 1) % 15) + 1] ??
    "/assets/generated/haridwar-hotel-1.dim_800x500.jpg"
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
// Hotel Detail Page
// ─────────────────────────────────────────────────────────────────────────────

interface HotelDetailPageProps {
  hotelId: bigint;
  actor: import("./backend").backendInterface | null;
  searchParams: SearchParams;
  onBack: () => void;
  onBookNow: (hotel: Hotel) => void;
}

function HotelDetailPage({
  hotelId,
  actor,
  searchParams: _searchParams,
  onBack,
  onBookNow,
}: HotelDetailPageProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const {
    data: hotel,
    isLoading,
    isError,
  } = useQuery<Hotel>({
    queryKey: ["hotel", hotelId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getHotel(hotelId);
    },
    enabled: !!actor,
  });

  // Fetch uploaded image URLs from backend
  const { data: imageUrlsData } = useQuery<string[]>({
    queryKey: ["hotelImageUrls", hotelId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHotelImageUrls(hotelId);
    },
    enabled: !!actor,
  });

  // Derived image sources — prefer uploaded images, fall back to seeded images
  const uploadedUrls = imageUrlsData ?? [];
  const imageSrcs =
    uploadedUrls.length > 0
      ? uploadedUrls
      : hotel
        ? [
            getHotelImageSrc(hotel.imageIndex),
            getHotelImageSrc((hotel.imageIndex % 15n) + 1n),
            getHotelImageSrc(((hotel.imageIndex + 1n) % 15n) + 1n),
          ]
        : ["/assets/generated/rishikesh-hotel-1.dim_800x500.jpg"];

  const handlePrevImage = () =>
    setActiveImageIndex((prev) =>
      prev === 0 ? imageSrcs.length - 1 : prev - 1,
    );
  const handleNextImage = () =>
    setActiveImageIndex((prev) =>
      prev === imageSrcs.length - 1 ? 0 : prev + 1,
    );

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        data-ocid="hotel_detail.loading_state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-background"
      >
        {/* Back button skeleton */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="skeleton-shimmer h-9 w-36 rounded-xl" />
        </div>
        {/* Gallery skeleton */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[320px] sm:h-[380px]">
            <div className="skeleton-shimmer rounded-2xl lg:col-span-2 h-full" />
            <div className="hidden lg:flex flex-col gap-3">
              <div className="skeleton-shimmer rounded-2xl flex-1" />
              <div className="skeleton-shimmer rounded-2xl flex-1" />
            </div>
          </div>
        </div>
        {/* Content skeletons */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="skeleton-shimmer h-9 w-3/4 rounded" />
          <div className="skeleton-shimmer h-5 w-1/3 rounded" />
          <div className="skeleton-shimmer h-5 w-1/2 rounded" />
          <div className="flex gap-2">
            {(["a", "b", "c"] as const).map((k) => (
              <div key={k} className="skeleton-shimmer h-7 w-16 rounded-full" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-5/6 rounded" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (isError || !hotel) {
    return (
      <motion.div
        data-ocid="hotel_detail.error_state"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center px-4"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          Hotel Not Found
        </h2>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          We couldn't load the hotel details. Please go back and try again.
        </p>
        <Button
          data-ocid="hotel_detail.back_button"
          onClick={onBack}
          className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>
      </motion.div>
    );
  }

  const descriptionParts = hotel.description.includes(" | ")
    ? hotel.description.split(" | ")
    : null;
  const roomType = descriptionParts?.[0] ?? null;
  const descriptionText = descriptionParts
    ? descriptionParts.slice(1).join(" | ")
    : hotel.description;

  const DEFAULT_RULES = [
    "Unmarried couples are welcome",
    "No smoking inside rooms (designated smoking areas available)",
    "Pets not allowed",
    "Outside food and alcohol not permitted",
    "Guests must carry valid government-issued ID (Aadhaar / PAN / Passport)",
    "Loud music and parties are not permitted after 10:00 PM",
    "Hotel is not responsible for loss of valuables",
  ];
  const RULES =
    hotel.rules && hotel.rules.trim().length > 0
      ? hotel.rules
          .split("\n")
          .map((r) => r.trim())
          .filter((r) => r.length > 0)
      : DEFAULT_RULES;

  const CANCELLATION_POLICIES = [
    {
      icon: (
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      ),
      text: "Free cancellation up to 24 hours before check-in",
    },
    {
      icon: (
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      ),
      text: "Cancellations within 24 hours: first night charge may apply",
    },
    {
      icon: (
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      ),
      text: "No-show policy: full booking amount charged",
    },
    {
      icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />,
      text: "To cancel, contact the hotel directly or use your booking ID",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-background pb-28"
    >
      {/* Back button */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <Button
          data-ocid="hotel_detail.back_button"
          variant="outline"
          onClick={onBack}
          className="gap-2 border-border text-foreground hover:bg-muted font-semibold rounded-xl text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* ── Image Gallery */}
        <section>
          {/* Desktop: adaptive layout based on image count */}
          <div className="hidden lg:block">
            {imageSrcs.length === 1 && (
              <div className="relative h-[380px] rounded-2xl overflow-hidden">
                <img
                  data-ocid="hotel_detail.gallery_image.1"
                  src={imageSrcs[0]}
                  alt={`${hotel.name} - main view`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>
            )}
            {imageSrcs.length === 2 && (
              <div className="grid grid-cols-2 gap-3 h-[380px] rounded-2xl overflow-hidden">
                {imageSrcs.map((src, idx) => (
                  <div key={src} className="relative overflow-hidden">
                    <img
                      data-ocid={`hotel_detail.gallery_image.${idx + 1}`}
                      src={src}
                      alt={`${hotel.name} - view ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                ))}
              </div>
            )}
            {imageSrcs.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 h-[380px] rounded-2xl overflow-hidden">
                <div className="col-span-2 relative overflow-hidden">
                  <img
                    data-ocid="hotel_detail.gallery_image.1"
                    src={imageSrcs[0]}
                    alt={`${hotel.name} - main view`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex-1 relative overflow-hidden rounded-tr-2xl">
                    <img
                      data-ocid="hotel_detail.gallery_image.2"
                      src={imageSrcs[1]}
                      alt={`${hotel.name} - view 2`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex-1 relative overflow-hidden rounded-br-2xl">
                    <img
                      data-ocid="hotel_detail.gallery_image.3"
                      src={imageSrcs[2]}
                      alt={`${hotel.name} - view 3`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                    {imageSrcs.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-display font-bold text-xl">
                          +{imageSrcs.length - 3} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: single image with navigation */}
          <div className="lg:hidden relative rounded-2xl overflow-hidden h-[260px] sm:h-[320px]">
            {imageSrcs.length > 0 && (
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageIndex}
                  data-ocid={`hotel_detail.gallery_image.${activeImageIndex + 1}`}
                  src={imageSrcs[activeImageIndex]}
                  alt={`${hotel.name} - view ${activeImageIndex + 1}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              </AnimatePresence>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            {/* Navigation arrows — only show if more than 1 image */}
            {imageSrcs.length > 1 && (
              <>
                <button
                  type="button"
                  data-ocid="hotel_detail.gallery_prev_button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  data-ocid="hotel_detail.gallery_next_button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Dots indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imageSrcs.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveImageIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === activeImageIndex
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/50"
                      }`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Hotel Header */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              {roomType && (
                <Badge
                  variant="secondary"
                  className="text-[11px] px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold rounded-md mb-2"
                >
                  {roomType}
                </Badge>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground leading-tight mb-2">
                {hotel.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand flex-shrink-0" />
                  <span className="font-medium text-foreground">
                    {hotel.city}
                  </span>
                </span>
                {hotel.address && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="line-clamp-1">{hotel.address}</span>
                  </span>
                )}
              </div>
              {/* Star rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= Number(hotel.starRating)
                          ? "star-gold fill-current"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground">
                  {Number(hotel.starRating)}.0
                </span>
                <span className="text-xs text-muted-foreground">
                  Star Hotel
                </span>
              </div>
            </div>
            {/* Price block */}
            <div className="sm:text-right">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                per night
              </div>
              <div className="text-4xl font-display font-extrabold text-brand leading-tight">
                ₹{formatPrice(hotel.pricePerNight)}
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold mt-2 text-xs gap-1">
                <Banknote className="w-3 h-3" />
                Pay at Hotel
              </Badge>
            </div>
          </div>
        </section>

        {/* ── Pay at Hotel Banner */}
        <section>
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-green-800 text-base leading-tight">
                Pay at Hotel — No Advance Payment Required
              </p>
              <p className="text-green-700 text-sm mt-0.5">
                Reserve your room now and pay when you arrive. Zero online
                payment, zero hassle.
              </p>
            </div>
          </div>
        </section>

        {/* ── Description */}
        {descriptionText && (
          <section>
            <h2 className="font-display font-bold text-lg text-foreground mb-3">
              About this Hotel
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              {descriptionText}
            </p>
          </section>
        )}

        {/* ── Amenities */}
        {hotel.amenities.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-lg text-foreground mb-3">
              Amenities
            </h2>
            <div className="flex flex-wrap gap-3">
              {hotel.amenities.map((amenity) => {
                const amenityConfig: Record<
                  string,
                  { icon: React.ReactNode; label: string }
                > = {
                  WiFi: {
                    icon: <Wifi className="w-4 h-4 text-blue-500" />,
                    label: "Free WiFi",
                  },
                  AC: {
                    icon: <Wind className="w-4 h-4 text-cyan-500" />,
                    label: "Air Conditioning",
                  },
                  Parking: {
                    icon: <Car className="w-4 h-4 text-gray-600" />,
                    label: "Free Parking",
                  },
                };
                const config = amenityConfig[amenity] ?? {
                  icon: <BadgeCheck className="w-4 h-4 text-green-500" />,
                  label: amenity,
                };
                return (
                  <div
                    key={amenity}
                    className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm"
                  >
                    {config.icon}
                    <span className="font-semibold text-sm text-foreground">
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Check-in / Check-out Times */}
        <section>
          <h2 className="font-display font-bold text-lg text-foreground mb-3">
            Check-in & Check-out
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              data-ocid="hotel_detail.checkin_time_card"
              className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                  Check-in
                </p>
                <p className="font-display font-extrabold text-2xl text-foreground">
                  12:00 PM
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Noon onwards
                </p>
              </div>
            </div>
            <div
              data-ocid="hotel_detail.checkout_time_card"
              className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                  Check-out
                </p>
                <p className="font-display font-extrabold text-2xl text-foreground">
                  11:00 AM
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Before 11 AM
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Rules & Regulations */}
        <section data-ocid="hotel_detail.rules_section">
          <h2 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            Rules & Regulations
          </h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {RULES.map((rule, idx) => (
              <motion.div
                key={rule}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className="flex items-start gap-3 px-5 py-3.5"
              >
                <div className="w-5 h-5 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-brand" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {rule}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Cancellation Policy */}
        <section data-ocid="hotel_detail.cancellation_section">
          <h2 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Cancellation Policy
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            {CANCELLATION_POLICIES.map((policy) => (
              <div key={policy.text} className="flex items-start gap-3">
                {policy.icon}
                <p className="text-sm text-foreground leading-relaxed">
                  {policy.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Inline Book Now */}
        <section className="pb-4">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-xl text-foreground mb-0.5">
                Ready to stay at {hotel.name}?
              </p>
              <p className="text-muted-foreground text-sm">
                Reserve now, pay on arrival — completely free to book
              </p>
            </div>
            <Button
              data-ocid="hotel_detail.book_now_button"
              onClick={() => onBookNow(hotel)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-8 py-5 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 gap-2 shadow-md shadow-green-200 whitespace-nowrap flex-shrink-0"
            >
              <Banknote className="w-5 h-5" />
              Book Now (Pay at Hotel)
            </Button>
          </div>
        </section>
      </div>

      {/* ── Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground text-base leading-tight truncate">
              {hotel.name}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-extrabold text-brand font-display text-lg">
                ₹{formatPrice(hotel.pricePerNight)}
              </span>{" "}
              / night · Pay at Hotel
            </p>
          </div>
          <Button
            data-ocid="hotel_detail.sticky_book_now_button"
            onClick={() => onBookNow(hotel)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-6 py-5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 gap-2 shadow-md shadow-green-200 flex-shrink-0"
          >
            <Banknote className="w-4 h-4" />
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hotel Card
// ─────────────────────────────────────────────────────────────────────────────

interface HotelCardProps {
  hotel: Hotel;
  index: number;
  onViewDetails: (hotel: Hotel) => void;
}

function HotelCard({ hotel, index, onViewDetails }: HotelCardProps) {
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
          src={
            hotel.imageUrls && hotel.imageUrls.length > 0
              ? hotel.imageUrls[0]
              : getHotelImageSrc(hotel.imageIndex)
          }
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
            data-ocid={`hotel.view_details_button.${index}`}
            onClick={() => onViewDetails(hotel)}
            className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.04] active:scale-95 shadow-sm shadow-[oklch(0.52_0.22_25.5/0.3)]"
          >
            View Details
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
  onOpenAuthModal?: () => void;
}

function BookingModal({
  hotel,
  open,
  onClose,
  searchParams,
  actor,
  onOpenAuthModal,
}: BookingModalProps) {
  const { isAuthenticated, profile } = useCustomerAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    phone: "",
    checkIn: searchParams.checkIn || getTodayStr(),
    checkOut: searchParams.checkOut || getTomorrowStr(),
    guestCount: searchParams.guests,
  });
  const [bookingId, setBookingId] = useState<bigint | null>(null);

  // Auto-fill from profile when modal opens and profile is available
  useEffect(() => {
    if (open && profile) {
      setForm((prev) => ({
        ...prev,
        guestName: profile.name || prev.guestName,
        guestEmail: profile.email || prev.guestEmail,
        checkIn: searchParams.checkIn || getTodayStr(),
        checkOut: searchParams.checkOut || getTomorrowStr(),
        guestCount: searchParams.guests,
      }));
    }
  }, [open, profile, searchParams]);

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
      );
      return id;
    },
    onSuccess: (id) => {
      setBookingId(id);
      queryClient.invalidateQueries({ queryKey: ["admin-all-bookings"] });
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
          {!isAuthenticated ? (
            /* Login Prompt */
            <motion.div
              key="login-prompt"
              data-ocid="booking.login_prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-10 text-center"
            >
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                Sign In to Book
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Please sign in to your HIDESTAY account to reserve your room.
              </p>
              <Button
                data-ocid="booking.login_button"
                onClick={() => {
                  handleClose();
                  onOpenAuthModal?.();
                }}
                className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8 py-5"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Continue
              </Button>
            </motion.div>
          ) : bookingId !== null ? (
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
// List Property Modal
// ─────────────────────────────────────────────────────────────────────────────

interface ListPropertyModalProps {
  open: boolean;
  onClose: () => void;
  actor: import("./backend").backendInterface | null;
}

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  status: "idle" | "uploading" | "done" | "error";
  uploadedUrl?: string;
}

const AMENITY_OPTIONS = ["WiFi", "AC", "Parking"];
const ROOM_TYPES = ["Standard", "Deluxe", "Suite"];

function ListPropertyModal({ open, onClose, actor }: ListPropertyModalProps) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const [submittedId, setSubmittedId] = useState<bigint | null>(null);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KYC document state
  const [kycFile, setKycFile] = useState<{
    file: File;
    previewUrl: string;
    status: "idle" | "uploading" | "done" | "error";
    uploadedUrl?: string;
  } | null>(null);
  const kycInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    hotelName: "",
    city: "",
    address: "",
    pricePerNight: "",
    roomType: "",
    description: "",
    amenities: [] as string[],
    rules: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    subscriptionPlan: "",
  });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleAmenity = (amenity: string) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));

  const handleFilesAdd = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const remaining = 5 - imageFiles.length;
    let added = 0;
    for (const file of newFiles) {
      if (added >= remaining) {
        toast.error("Maximum 5 images allowed");
        break;
      }
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast.error("Only JPG and PNG files are allowed");
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 2MB limit`);
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setImageFiles((prev) => [
        ...prev,
        { id, file, previewUrl, status: "idle" },
      ]);
      added++;
    }
  };

  const handleRemoveImage = (id: string) => {
    setImageFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleKycFileChange = (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("KYC document must be under 2MB");
      return;
    }
    if (kycFile?.previewUrl) URL.revokeObjectURL(kycFile.previewUrl);
    setKycFile({ file, previewUrl: URL.createObjectURL(file), status: "idle" });
  };

  const handleRemoveKyc = () => {
    if (kycFile?.previewUrl) URL.revokeObjectURL(kycFile.previewUrl);
    setKycFile(null);
  };

  const { mutate: submitListing, isPending } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");

      const imageUrls: string[] = [];
      let kycDocumentUrl = "";

      // Initialize storage client if we have any files to upload
      const needsStorage =
        (imageFiles.length > 0 || kycFile !== null) && identity;
      let storageClient: StorageClient | null = null;

      if (needsStorage && identity) {
        const config = await loadConfig();
        const agent = new HttpAgent({
          identity,
          host: config.backend_host,
        });
        if (config.backend_host?.includes("localhost")) {
          await agent.fetchRootKey().catch(console.error);
        }
        storageClient = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent,
        );
      }

      // Upload hotel images
      if (imageFiles.length > 0 && storageClient) {
        for (const imgFile of imageFiles) {
          setImageFiles((prev) =>
            prev.map((f) =>
              f.id === imgFile.id ? { ...f, status: "uploading" } : f,
            ),
          );
          try {
            const bytes = new Uint8Array(await imgFile.file.arrayBuffer());
            const { hash } = await storageClient.putFile(bytes);
            const url = await storageClient.getDirectURL(hash);
            imageUrls.push(url);
            setImageFiles((prev) =>
              prev.map((f) =>
                f.id === imgFile.id
                  ? { ...f, status: "done", uploadedUrl: url }
                  : f,
              ),
            );
          } catch {
            setImageFiles((prev) =>
              prev.map((f) =>
                f.id === imgFile.id ? { ...f, status: "error" } : f,
              ),
            );
            throw new Error(`Failed to upload ${imgFile.file.name}`);
          }
        }
      }

      // Upload KYC document
      if (kycFile && storageClient) {
        setKycFile((prev) => (prev ? { ...prev, status: "uploading" } : null));
        try {
          const bytes = new Uint8Array(await kycFile.file.arrayBuffer());
          const { hash } = await storageClient.putFile(bytes);
          const url = await storageClient.getDirectURL(hash);
          kycDocumentUrl = url;
          setKycFile((prev) =>
            prev ? { ...prev, status: "done", uploadedUrl: url } : null,
          );
        } catch {
          setKycFile((prev) => (prev ? { ...prev, status: "error" } : null));
          throw new Error("Failed to upload KYC document");
        }
      }

      const id = await actor.submitPropertyListing(
        form.ownerName,
        form.ownerPhone,
        form.ownerEmail,
        form.hotelName,
        form.city,
        form.address,
        BigInt(Math.round(Number(form.pricePerNight))),
        form.roomType,
        form.amenities,
        form.description,
        form.subscriptionPlan,
        BigInt(Date.now()),
        imageUrls,
        kycDocumentUrl,
        form.rules,
      );
      return id;
    },
    onSuccess: (id) => {
      setSubmittedId(id);
      toast.success("Property submitted for review!");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.",
      );
    },
  });

  const handleClose = () => {
    onClose();
    setSubmittedId(null);
    for (const f of imageFiles) URL.revokeObjectURL(f.previewUrl);
    setImageFiles([]);
    setIsDragging(false);
    if (kycFile?.previewUrl) URL.revokeObjectURL(kycFile.previewUrl);
    setKycFile(null);
    setForm({
      hotelName: "",
      city: "",
      address: "",
      pricePerNight: "",
      roomType: "",
      description: "",
      amenities: [],
      rules: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      subscriptionPlan: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error("Please log in to submit your property.");
      return;
    }
    submitListing();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="list_property.modal"
        className="max-w-2xl w-full max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl shadow-modal"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 bg-brand text-white rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-display font-bold text-white">
                List Your Property
              </DialogTitle>
              <p className="text-white/80 text-sm mt-1">
                Submit your hotel for review — get listed on HIDESTAY.
              </p>
            </div>
            <button
              type="button"
              data-ocid="list_property.close_button"
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors rounded-full p-1.5 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {submittedId !== null ? (
            /* ── Success State */
            <motion.div
              data-ocid="list_property.success_state"
              key="success"
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle className="w-11 h-11 text-green-500" />
              </motion.div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                Application Submitted!
              </h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
                Your property has been submitted for review.{" "}
                <strong>Status: Pending Approval.</strong> Our team will contact
                you within 24 hours.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-amber-700 text-sm font-semibold">
                  Pending Approval
                </span>
              </div>
              <div className="bg-muted rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                  Submission ID
                </p>
                <p className="text-2xl font-display font-bold text-brand">
                  #{submittedId.toString()}
                </p>
              </div>
              <Button
                data-ocid="list_property.done_button"
                onClick={handleClose}
                className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
              >
                Close
              </Button>
            </motion.div>
          ) : !isLoggedIn ? (
            /* ── Login Prompt */
            <motion.div
              key="login-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-10 text-center"
            >
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                Sign In Required
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                Please log in with Internet Identity to submit your property
                listing.
              </p>
              <Button
                data-ocid="list_property.login_button"
                onClick={() => login()}
                disabled={isLoggingIn}
                className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8 py-5"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In to Continue
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            /* ── Form */
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 py-6 space-y-6"
            >
              {/* Section: Hotel Details */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Hotel Details
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* Hotel Name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lp-hotel-name"
                      className="text-sm font-semibold"
                    >
                      Hotel Name <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="lp-hotel-name"
                      data-ocid="list_property.hotel_name_input"
                      placeholder="e.g. Hotel Grand Palace"
                      value={form.hotelName}
                      onChange={(e) => updateField("hotelName", e.target.value)}
                      required
                      className="rounded-lg border-input"
                    />
                  </div>

                  {/* City + Price row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lp-city"
                        className="text-sm font-semibold"
                      >
                        City <span className="text-brand">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="lp-city"
                          data-ocid="list_property.city_input"
                          placeholder="e.g. Haridwar"
                          value={form.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          required
                          className="pl-9 rounded-lg border-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lp-price"
                        className="text-sm font-semibold"
                      >
                        Price Per Night (₹){" "}
                        <span className="text-brand">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                          ₹
                        </span>
                        <Input
                          id="lp-price"
                          data-ocid="list_property.price_input"
                          type="number"
                          min={100}
                          placeholder="999"
                          value={form.pricePerNight}
                          onChange={(e) =>
                            updateField("pricePerNight", e.target.value)
                          }
                          required
                          className="pl-7 rounded-lg border-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lp-address"
                      className="text-sm font-semibold"
                    >
                      Address <span className="text-brand">*</span>
                    </Label>
                    <Input
                      id="lp-address"
                      data-ocid="list_property.address_input"
                      placeholder="Street address, landmark"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      required
                      className="rounded-lg border-input"
                    />
                  </div>

                  {/* Room Type */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lp-room-type"
                      className="text-sm font-semibold"
                    >
                      Room Type <span className="text-brand">*</span>
                    </Label>
                    <Select
                      value={form.roomType}
                      onValueChange={(v) => updateField("roomType", v)}
                      required
                    >
                      <SelectTrigger
                        id="lp-room-type"
                        data-ocid="list_property.room_type_select"
                        className="rounded-lg border-input"
                      >
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPES.map((rt) => (
                          <SelectItem key={rt} value={rt}>
                            {rt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lp-description"
                      className="text-sm font-semibold"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="lp-description"
                      data-ocid="list_property.description_textarea"
                      placeholder="Brief description of your hotel, its location and unique offerings..."
                      value={form.description}
                      onChange={(e) =>
                        updateField("description", e.target.value)
                      }
                      className="rounded-lg border-input min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Amenities */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Amenities</Label>
                    <div className="flex flex-wrap gap-4">
                      {AMENITY_OPTIONS.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-2.5"
                        >
                          <Checkbox
                            id={`lp-amenity-${amenity.toLowerCase()}`}
                            data-ocid={`list_property.amenity_${amenity.toLowerCase()}_checkbox`}
                            checked={form.amenities.includes(amenity)}
                            onCheckedChange={() => toggleAmenity(amenity)}
                            className="border-border data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                          />
                          <Label
                            htmlFor={`lp-amenity-${amenity.toLowerCase()}`}
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            {amenity === "WiFi" && (
                              <Wifi className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {amenity === "AC" && (
                              <Wind className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {amenity === "Parking" && (
                              <Car className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {amenity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotel Rules & Regulations */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lp-rules" className="text-sm font-semibold">
                      Hotel Rules & Regulations{" "}
                      <span className="text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Textarea
                      id="lp-rules"
                      data-ocid="list_property.rules_textarea"
                      placeholder={
                        "Enter one rule per line, e.g.:\nNo smoking inside rooms\nCheck-in from 12:00 PM\nGuests must carry valid ID"
                      }
                      value={form.rules}
                      onChange={(e) => updateField("rules", e.target.value)}
                      className="rounded-lg border-input min-h-[100px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Write one rule per line. These will be displayed on your
                      hotel's detail page.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Hotel Images */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Hotel Images
                  </h3>
                  <span className="text-xs text-muted-foreground ml-1">
                    (Optional · JPG/PNG · max 5 · 2MB each)
                  </span>
                </div>

                {/* Dropzone */}
                {imageFiles.length < 5 && (
                  <button
                    type="button"
                    data-ocid="list_property.image_dropzone"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFilesAdd(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-brand/50 hover:bg-muted/30"
                    }`}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      Drop images here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG or PNG · Max 5 images · 2MB each
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFilesAdd(e.target.files);
                        e.target.value = "";
                      }}
                      data-ocid="list_property.image_upload_button"
                    />
                  </button>
                )}

                {/* Previews */}
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                    {imageFiles.map((img, idx) => (
                      <div
                        key={img.id}
                        data-ocid={`list_property.image_preview.${idx + 1}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border group"
                      >
                        <img
                          src={img.previewUrl}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Status overlay */}
                        {img.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                        {img.status === "done" && (
                          <div className="absolute top-1 left-1 bg-green-500 rounded-full p-0.5">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {img.status === "error" && (
                          <div className="absolute top-1 left-1 bg-red-500 rounded-full p-0.5">
                            <XCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {/* Remove button */}
                        {img.status !== "uploading" && (
                          <button
                            type="button"
                            data-ocid={`list_property.image_remove_button.${idx + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(img.id);
                            }}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {imageFiles.length}/5 images added
                </p>
              </div>

              <Separator />

              {/* Section: KYC Document */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    KYC Document (Aadhaar / Govt ID)
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 ml-9">
                  Required for verification · JPG or PNG · Max 2MB · Single file
                </p>

                {!kycFile ? (
                  /* KYC Dropzone */
                  <button
                    type="button"
                    data-ocid="list_property.kyc_dropzone"
                    onClick={() => kycInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-50/30 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      Upload Aadhaar / Government ID
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click to browse · JPG or PNG · Max 2MB
                    </p>
                    <input
                      ref={kycInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      data-ocid="list_property.kyc_upload_button"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleKycFileChange(file);
                        e.target.value = "";
                      }}
                    />
                  </button>
                ) : (
                  /* KYC Preview */
                  <div className="flex items-start gap-4">
                    <div
                      data-ocid="list_property.kyc_preview"
                      className="relative w-[120px] h-[120px] rounded-xl overflow-hidden border-2 border-teal-200 flex-shrink-0 group"
                    >
                      <img
                        src={kycFile.previewUrl}
                        alt="KYC document preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Secure document overlay (default) */}
                      {kycFile.status === "idle" && (
                        <div className="absolute bottom-0 left-0 right-0 bg-teal-900/70 flex items-center justify-center gap-1 py-1.5">
                          <ShieldCheck className="w-3 h-3 text-teal-200" />
                          <span className="text-[10px] text-teal-100 font-semibold">
                            Secure
                          </span>
                        </div>
                      )}
                      {/* Uploading overlay */}
                      {kycFile.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                      {/* Done overlay */}
                      {kycFile.status === "done" && (
                        <div className="absolute top-1.5 left-1.5 bg-green-500 rounded-full p-0.5">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      {/* Error overlay */}
                      {kycFile.status === "error" && (
                        <div className="absolute top-1.5 left-1.5 bg-red-500 rounded-full p-0.5">
                          <XCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      {/* Remove button */}
                      {kycFile.status !== "uploading" && (
                        <button
                          type="button"
                          data-ocid="list_property.kyc_remove_button"
                          onClick={handleRemoveKyc}
                          className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove KYC document"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {kycFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(kycFile.file.size / 1024).toFixed(0)} KB ·{" "}
                        {kycFile.file.type === "image/jpeg" ? "JPG" : "PNG"}
                      </p>
                      {kycFile.status === "idle" && (
                        <Badge className="mt-2 text-[10px] bg-teal-50 text-teal-700 border border-teal-200 gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Ready to upload
                        </Badge>
                      )}
                      {kycFile.status === "uploading" && (
                        <Badge className="mt-2 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Uploading securely…
                        </Badge>
                      )}
                      {kycFile.status === "done" && (
                        <Badge className="mt-2 text-[10px] bg-green-50 text-green-700 border border-green-200 gap-1">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Uploaded securely
                        </Badge>
                      )}
                      {kycFile.status === "error" && (
                        <Badge className="mt-2 text-[10px] bg-red-50 text-red-700 border border-red-200 gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          Upload failed
                        </Badge>
                      )}
                      {kycFile.status !== "uploading" && (
                        <button
                          type="button"
                          data-ocid="list_property.kyc_remove_button"
                          onClick={handleRemoveKyc}
                          className="mt-3 text-xs text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                  KYC documents are stored securely and only accessible to
                  administrators.
                </p>
              </div>

              <Separator />

              {/* Section: Owner Details */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Owner Details
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lp-owner-name"
                      className="text-sm font-semibold"
                    >
                      Owner Name <span className="text-brand">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="lp-owner-name"
                        data-ocid="list_property.owner_name_input"
                        placeholder="Full name"
                        value={form.ownerName}
                        onChange={(e) =>
                          updateField("ownerName", e.target.value)
                        }
                        required
                        className="pl-9 rounded-lg border-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lp-owner-phone"
                        className="text-sm font-semibold"
                      >
                        Phone <span className="text-brand">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="lp-owner-phone"
                          data-ocid="list_property.owner_phone_input"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={form.ownerPhone}
                          onChange={(e) =>
                            updateField("ownerPhone", e.target.value)
                          }
                          required
                          className="pl-9 rounded-lg border-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="lp-owner-email"
                        className="text-sm font-semibold"
                      >
                        Email <span className="text-brand">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="lp-owner-email"
                          data-ocid="list_property.owner_email_input"
                          type="email"
                          placeholder="owner@example.com"
                          value={form.ownerEmail}
                          onChange={(e) =>
                            updateField("ownerEmail", e.target.value)
                          }
                          required
                          className="pl-9 rounded-lg border-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Subscription Plan */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Choose a Plan <span className="text-brand">*</span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = form.subscriptionPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        data-ocid={`list_property.plan_${plan.id}_button`}
                        onClick={() => updateField("subscriptionPlan", plan.id)}
                        className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-brand bg-[oklch(0.97_0.01_25.5)] shadow-md"
                            : "border-border hover:border-brand/40 hover:bg-muted/40"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              Popular
                            </span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-4 h-4 text-brand" />
                          </div>
                        )}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${plan.badgeColor}`}
                        >
                          {plan.icon}
                        </div>
                        <div className="font-display font-bold text-sm text-foreground">
                          {plan.name}
                        </div>
                        <div className="flex items-baseline gap-0.5 mb-2">
                          <span className="text-lg font-display font-extrabold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {plan.period}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {plan.features.slice(0, 2).map((f) => (
                            <li
                              key={f}
                              className="text-[11px] text-muted-foreground flex items-start gap-1"
                            >
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
                {!form.subscriptionPlan && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please select a subscription plan to continue.
                  </p>
                )}
              </div>

              <Button
                data-ocid="list_property.submit_button"
                type="submit"
                disabled={isPending || !form.subscriptionPlan}
                className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold text-base py-5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Submit Property for Review
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
// My Bookings Page
// ─────────────────────────────────────────────────────────────────────────────

interface MyBookingsPageProps {
  open: boolean;
  onClose: () => void;
  actor: import("./backend").backendInterface | null;
  isOwner?: boolean;
  onOpenOwnerDashboard?: () => void;
}

function BookingStatusBadge({ status }: { status: Status }) {
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
        Reserved
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

function daysBetween(checkIn: string, checkOut: string): number {
  try {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diff = outDate.getTime() - inDate.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

function formatDateDisplay(dateStr: string): string {
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

interface BookingCardProps {
  booking: Booking;
  index: number;
  actor: import("./backend").backendInterface | null;
  onCancelled: () => void;
  onViewDetails: (bookingId: bigint) => void;
}

function BookingCard({
  booking,
  index,
  actor,
  onCancelled,
  onViewDetails,
}: BookingCardProps) {
  const { data: hotel, isLoading: hotelLoading } = useQuery<Hotel>({
    queryKey: ["hotel", booking.hotelId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getHotel(booking.hotelId);
    },
    enabled: !!actor,
  });

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.cancelBooking(booking.id);
    },
    onSuccess: () => {
      toast.success("Booking cancelled successfully.");
      onCancelled();
    },
    onError: () => {
      toast.error("Failed to cancel booking. Please try again.");
    },
  });

  const imageSrc = hotel
    ? getHotelImageSrc(hotel.imageIndex)
    : "/assets/generated/haridwar-hotel-1.dim_800x500.jpg";

  const nights = daysBetween(booking.checkIn, booking.checkOut);
  const totalPrice = hotel ? BigInt(nights) * hotel.pricePerNight : null;

  const roomType = hotel?.description.includes(" | ")
    ? hotel.description.split(" | ")[0]
    : null;

  const canCancel =
    booking.status === Status.Confirmed || booking.status === Status.Pending;

  return (
    <motion.div
      data-ocid={`my_bookings.booking_item.${index}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Hotel Image */}
        <div className="relative sm:w-[160px] sm:flex-shrink-0 h-[180px] sm:h-auto overflow-hidden">
          {hotelLoading ? (
            <div className="skeleton-shimmer w-full h-full" />
          ) : (
            <img
              src={imageSrc}
              alt={hotel?.name ?? "Hotel"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-transparent" />
          {/* Status overlay on mobile */}
          <div className="absolute top-2 left-2 sm:hidden">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>

        {/* Booking Details */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          {/* Header Row: ID + Status */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest font-mono">
              #{booking.id.toString()}
            </p>
            <div className="hidden sm:block">
              <BookingStatusBadge status={booking.status} />
            </div>
            {roomType && (
              <Badge
                variant="secondary"
                className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold rounded-md"
              >
                {roomType}
              </Badge>
            )}
          </div>

          {/* Hotel Info */}
          {hotelLoading ? (
            <div className="space-y-1.5 mb-3">
              <div className="skeleton-shimmer h-5 w-48 rounded" />
              <div className="skeleton-shimmer h-4 w-28 rounded" />
            </div>
          ) : (
            <div className="mb-3">
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground leading-tight line-clamp-1 mb-1">
                {hotel?.name ?? "Hotel"}
              </h3>
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="font-medium text-foreground">
                    {hotel?.city ?? "—"}
                  </span>
                </p>
                {hotel?.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{hotel.address}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Stay Details Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-muted/50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Check-in
              </p>
              <p className="font-semibold text-xs text-foreground">
                {formatDateDisplay(booking.checkIn)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Check-out
              </p>
              <p className="font-semibold text-xs text-foreground">
                {formatDateDisplay(booking.checkOut)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Guests
              </p>
              <p className="font-semibold text-xs text-foreground">
                {Number(booking.guestCount)}{" "}
                {Number(booking.guestCount) === 1 ? "guest" : "guests"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-0.5">
                Nights
              </p>
              <p className="font-semibold text-xs text-foreground">
                {nights} {nights === 1 ? "night" : "nights"}
              </p>
            </div>
          </div>

          {/* Price + Payment + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-3">
              {/* Total Price */}
              {totalPrice !== null && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                    Total
                  </p>
                  <p className="font-display font-extrabold text-base text-brand leading-tight">
                    ₹{formatPrice(totalPrice)}
                  </p>
                  {hotel && (
                    <p className="text-[10px] text-muted-foreground">
                      {nights} × ₹{formatPrice(hotel.pricePerNight)}
                    </p>
                  )}
                </div>
              )}
              {/* Pay at Hotel badge */}
              <Badge className="bg-green-50 text-green-700 border-green-200 font-semibold text-[10px] gap-1 shrink-0">
                <Banknote className="w-3 h-3" />
                Pay at Hotel
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                data-ocid={`my_bookings.view_details_button.${index}`}
                size="sm"
                variant="outline"
                onClick={() => onViewDetails(booking.id)}
                className="border-brand/40 text-brand hover:bg-brand/5 hover:border-brand font-semibold rounded-xl text-xs gap-1.5 transition-all duration-200"
              >
                <BookOpen className="w-3.5 h-3.5" />
                View Details
              </Button>

              {canCancel && (
                <Button
                  data-ocid={`my_bookings.cancel_button.${index}`}
                  size="sm"
                  variant="outline"
                  disabled={isCancelling}
                  onClick={() => cancelBooking()}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-semibold rounded-xl text-xs gap-1.5 transition-all duration-200"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking Detail Page
// ─────────────────────────────────────────────────────────────────────────────

interface BookingDetailPageProps {
  bookingId: bigint;
  actor: import("./backend").backendInterface | null;
  onBack: () => void;
}

function BookingDetailPage({
  bookingId,
  actor,
  onBack,
}: BookingDetailPageProps) {
  const queryClient = useQueryClient();

  const {
    data: booking,
    isLoading: bookingLoading,
    isError: bookingError,
  } = useQuery<Booking>({
    queryKey: ["booking", bookingId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getBooking(bookingId);
    },
    enabled: !!actor,
  });

  const {
    data: hotel,
    isLoading: hotelLoading,
    isError: hotelError,
  } = useQuery<Hotel>({
    queryKey: ["hotel", booking?.hotelId.toString()],
    queryFn: async () => {
      if (!actor || !booking) throw new Error("Not ready");
      return actor.getHotel(booking.hotelId);
    },
    enabled: !!actor && !!booking,
  });

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.cancelBooking(bookingId);
    },
    onSuccess: () => {
      toast.success("Booking cancelled successfully.");
      queryClient.invalidateQueries({
        queryKey: ["booking", bookingId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: () => {
      toast.error("Failed to cancel booking. Please try again.");
    },
  });

  const isLoading = bookingLoading || hotelLoading;
  const isError = bookingError || hotelError;

  if (isLoading) {
    return (
      <motion.div
        data-ocid="booking_detail.loading_state"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-background overflow-y-auto"
      >
        {/* Header skeleton */}
        <div className="sticky top-0 z-10 bg-brand shadow-header h-16 flex items-center px-6">
          <div className="skeleton-shimmer h-8 w-32 rounded-lg opacity-50" />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
          <div className="skeleton-shimmer h-[280px] w-full rounded-2xl" />
          <div className="skeleton-shimmer h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="skeleton-shimmer h-24 rounded-xl" />
            <div className="skeleton-shimmer h-24 rounded-xl" />
            <div className="skeleton-shimmer h-24 rounded-xl" />
          </div>
          <div className="skeleton-shimmer h-36 w-full rounded-2xl" />
          <div className="skeleton-shimmer h-24 w-full rounded-2xl" />
        </div>
      </motion.div>
    );
  }

  if (isError || !booking || !hotel) {
    return (
      <motion.div
        data-ocid="booking_detail.error_state"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-4"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          Booking Not Found
        </h2>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          We couldn't load this booking. Please go back and try again.
        </p>
        <Button
          data-ocid="booking_detail.back_button"
          onClick={onBack}
          className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>
      </motion.div>
    );
  }

  const nights = daysBetween(booking.checkIn, booking.checkOut);
  const totalPrice = BigInt(nights) * hotel.pricePerNight;
  const roomType = hotel.description.includes(" | ")
    ? hotel.description.split(" | ")[0]
    : null;

  const canCancel =
    booking.status === Status.Confirmed || booking.status === Status.Pending;

  return (
    <motion.div
      data-ocid="booking_detail.panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-brand shadow-header">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                  Booking Details
                </span>
                <span className="text-white/70 text-xs font-medium">
                  HIDESTAY
                </span>
              </div>
            </div>
            <Button
              data-ocid="booking_detail.back_button"
              onClick={onBack}
              size="sm"
              className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Bookings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
        {/* Hotel Image */}
        <div
          data-ocid="booking_detail.hotel_image"
          className="relative w-full h-[280px] rounded-2xl overflow-hidden shadow-lg"
        >
          <img
            src={
              hotel.imageUrls && hotel.imageUrls.length > 0
                ? hotel.imageUrls[0]
                : getHotelImageSrc(hotel.imageIndex)
            }
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          {/* Hotel name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h2 className="font-display text-2xl font-extrabold text-white leading-tight mb-1">
              {hotel.name}
            </h2>
            <div className="flex items-center gap-2 text-white/85 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{hotel.city}</span>
              {hotel.address && (
                <>
                  <span className="text-white/50">·</span>
                  <span className="line-clamp-1 text-white/75">
                    {hotel.address}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Booking ID + Status Card */}
        <div
          data-ocid="booking_detail.booking_id_card"
          className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">
              Booking ID
            </p>
            <p className="font-display text-3xl font-extrabold text-brand leading-none">
              #{booking.id.toString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created:{" "}
              {new Date(Number(booking.created)).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <BookingStatusBadge status={booking.status} />
            {roomType && (
              <Badge
                variant="secondary"
                className="text-[11px] px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold rounded-md"
              >
                {roomType}
              </Badge>
            )}
          </div>
        </div>

        {/* Stay Details Grid */}
        <div>
          <h3 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            Stay Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                Check-in
              </p>
              <p className="font-display font-bold text-foreground text-sm leading-snug">
                {formatDateDisplay(booking.checkIn)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                12:00 PM
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                Check-out
              </p>
              <p className="font-display font-bold text-foreground text-sm leading-snug">
                {formatDateDisplay(booking.checkOut)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                11:00 AM
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                Duration
              </p>
              <p className="font-display font-bold text-foreground text-sm leading-snug">
                {nights} {nights === 1 ? "night" : "nights"}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                Guests
              </p>
              <p className="font-display font-bold text-foreground text-sm leading-snug">
                {Number(booking.guestCount)}{" "}
                {Number(booking.guestCount) === 1 ? "guest" : "guests"}
              </p>
            </div>
            {roomType && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                  Room Type
                </p>
                <p className="font-display font-bold text-foreground text-sm leading-snug">
                  {roomType}
                </p>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
                Hotel Stars
              </p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= Number(hotel.starRating) ? "star-gold fill-current" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div>
          <h3 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-600" />
            Pricing Breakdown
          </h3>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-muted-foreground">
                  Price per night
                </span>
                <span className="font-semibold text-sm text-foreground">
                  ₹{formatPrice(hotel.pricePerNight)}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-muted-foreground">
                  Number of nights
                </span>
                <span className="font-semibold text-sm text-foreground">
                  {nights}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 bg-green-50">
                <span className="font-display font-bold text-base text-foreground">
                  Total Amount
                </span>
                <span className="font-display font-extrabold text-2xl text-green-700">
                  ₹{formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-green-800 text-base leading-tight">
              Pay at Hotel — No Advance Required
            </p>
            <p className="text-green-700 text-sm mt-0.5">
              Payment mode: <strong>Pay at Hotel</strong>. No online payment
              needed.
            </p>
          </div>
        </div>

        {/* Guest Details */}
        <div>
          <h3 className="font-display font-bold text-base text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            Guest Details
          </h3>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border/60">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Name
                </p>
                <p className="font-semibold text-sm text-foreground">
                  {booking.guestName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Email
                </p>
                <p className="font-semibold text-sm text-foreground">
                  {booking.guestEmail}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Phone
                </p>
                <p className="font-semibold text-sm text-foreground">
                  {booking.phone}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Action */}
        {canCancel && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-display font-bold text-base text-red-800 mb-1">
              Cancel This Booking
            </h3>
            <p className="text-red-700 text-sm mb-4">
              Cancellations within 24 hours of check-in may incur a one-night
              charge. After cancellation, this action cannot be undone.
            </p>
            <Button
              data-ocid="booking_detail.cancel_button"
              variant="outline"
              disabled={isCancelling}
              onClick={() => cancelBooking()}
              className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 font-semibold rounded-xl gap-2"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cancel Booking
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MyBookingsPage({
  open,
  onClose,
  actor,
  isOwner = false,
  onOpenOwnerDashboard,
}: MyBookingsPageProps) {
  const queryClient = useQueryClient();
  const [selectedBookingId, setSelectedBookingId] = useState<bigint | null>(
    null,
  );

  const {
    data: rawBookings = [],
    isLoading,
    isError,
  } = useQuery<Booking[]>({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyBookings();
    },
    enabled: open && !!actor,
  });

  // Sort latest first on the frontend
  const bookings = [...rawBookings].sort((a, b) =>
    Number(b.created - a.created),
  );

  const handleCancelled = () => {
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  };

  if (!open) return null;

  // Show booking detail page when a booking is selected
  if (selectedBookingId !== null) {
    return (
      <BookingDetailPage
        bookingId={selectedBookingId}
        actor={actor}
        onBack={() => setSelectedBookingId(null)}
      />
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="my_bookings.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-brand shadow-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                      My Bookings
                    </span>
                    <span className="text-white/70 text-xs font-medium">
                      HIDESTAY
                    </span>
                  </div>
                </div>
                <Button
                  data-ocid="my_bookings.close_button"
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

          {/* Content */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Title */}
            <div className="mb-4">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-1">
                Your Reservations
              </h1>
              <p className="text-muted-foreground text-sm">
                All bookings linked to your account, sorted by latest first.
              </p>
            </div>

            {/* Customer RBAC info strip */}
            <div
              data-ocid="my_bookings.rbac_info.section"
              className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3"
            >
              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-blue-800 text-sm leading-snug">
                <span className="font-semibold">Your bookings only</span> — you
                can only see reservations linked to your account.
              </p>
            </div>

            {/* Hotel owner notice (only when user is also a hotel owner) */}
            {isOwner && (
              <div
                data-ocid="my_bookings.owner_notice.section"
                className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6"
              >
                <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 text-sm font-medium leading-snug">
                    You are also a hotel owner. Use the Owner Dashboard to
                    manage your hotel&apos;s bookings.
                  </p>
                </div>
                {onOpenOwnerDashboard && (
                  <Button
                    data-ocid="my_bookings.open_owner_dashboard_button"
                    size="sm"
                    onClick={onOpenOwnerDashboard}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs px-3 h-8 gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Open Owner Dashboard
                  </Button>
                )}
              </div>
            )}
            {!isOwner && <div className="mb-6" />}

            {/* Loading State */}
            {isLoading && (
              <div data-ocid="my_bookings.loading_state" className="space-y-4">
                {(["sk1", "sk2", "sk3"] as const).map((k) => (
                  <div
                    key={k}
                    className="bg-card border border-border rounded-2xl overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="skeleton-shimmer sm:w-[160px] h-[140px] sm:h-auto shrink-0" />
                      <div className="flex-1 p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="skeleton-shimmer h-4 w-24 rounded" />
                          <div className="skeleton-shimmer h-5 w-16 rounded-full" />
                        </div>
                        <div className="skeleton-shimmer h-6 w-3/4 rounded" />
                        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
                        <div className="grid grid-cols-4 gap-2 pt-2">
                          <div className="skeleton-shimmer h-14 rounded-xl" />
                          <div className="skeleton-shimmer h-14 rounded-xl" />
                          <div className="skeleton-shimmer h-14 rounded-xl" />
                          <div className="skeleton-shimmer h-14 rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div
                data-ocid="my_bookings.error_state"
                className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border"
              >
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-foreground font-semibold">
                  Failed to load bookings
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Please try closing and reopening the panel.
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && bookings.length === 0 && (
              <motion.div
                data-ocid="my_bookings.empty_state"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 px-6"
              >
                <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-5">
                  <BookOpen className="w-9 h-9 text-brand" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No bookings yet
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                  Your reservations will appear here after you book a hotel.
                  Start exploring hotels and reserve your stay!
                </p>
                <Button
                  onClick={onClose}
                  className="bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl px-8"
                >
                  Browse Hotels
                </Button>
              </motion.div>
            )}

            {/* Bookings List */}
            {!isLoading && !isError && bookings.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {bookings.length}{" "}
                  {bookings.length === 1 ? "booking" : "bookings"} found
                </p>
                <div data-ocid="my_bookings.list" className="space-y-4">
                  {bookings.map((booking, idx) => (
                    <BookingCard
                      key={booking.id.toString()}
                      booking={booking}
                      index={idx + 1}
                      actor={actor}
                      onCancelled={handleCancelled}
                      onViewDetails={(id) => setSelectedBookingId(id)}
                    />
                  ))}
                </div>
              </>
            )}
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
// Auth Modal (Email + Password Login / Sign Up)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  "data-ocid": dataOcid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  "data-ocid"?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        id={id}
        data-ocid={dataOcid}
        type={show ? "text" : "password"}
        placeholder={placeholder ?? "Password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="auth-input pl-9 pr-10 rounded-lg"
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

function PasswordStrengthBar({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-500",
    "bg-amber-500",
    "bg-yellow-400",
    "bg-green-500",
  ];

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      {score > 0 && (
        <p
          className={`text-xs font-medium ${score <= 1 ? "text-red-600" : score === 2 ? "text-amber-600" : score === 3 ? "text-yellow-600" : "text-green-600"}`}
        >
          {labels[score]}
        </p>
      )}
    </div>
  );
}

function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register, isAuthenticated, profile } = useCustomerAuth();
  const {
    identity,
    login: iiLogin,
    isLoggingIn: iiLoggingIn,
  } = useInternetIdentity();

  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const isIILoggedIn = !!identity;

  const handleClose = () => {
    onClose();
    setLoginError("");
    setSignupError("");
    setLoginForm({ email: "", password: "" });
    setSignupForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      confirmPassword: "",
    });
    setSignupSuccess(false);
  };

  // If already fully authenticated, show success
  if (isAuthenticated && profile) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent
          data-ocid="auth.modal"
          className="max-w-sm rounded-2xl p-0 overflow-hidden"
        >
          <div className="bg-brand px-6 pt-6 pb-5 rounded-t-2xl">
            <DialogTitle className="text-xl font-display font-bold text-white">
              Welcome back!
            </DialogTitle>
          </div>
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <p className="font-display font-bold text-lg text-foreground mb-1">
              {profile.name}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {profile.email}
            </p>
            <Button
              data-ocid="auth.continue_button"
              onClick={handleClose}
              className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white rounded-xl"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleIILogin = async () => {
    iiLogin();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.email || !loginForm.password) {
      setLoginError("Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);

    // If not II logged in, trigger II first
    if (!isIILoggedIn) {
      iiLogin();
      setIsSubmitting(false);
      return;
    }

    const result = await login(loginForm.email, loginForm.password);
    setIsSubmitting(false);
    if (result.success) {
      toast.success("Signed in successfully!");
      handleClose();
    } else {
      setLoginError(result.error ?? "Login failed. Please try again.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");

    if (
      !signupForm.name ||
      !signupForm.email ||
      !signupForm.mobile ||
      !signupForm.password
    ) {
      setSignupError("Please fill in all fields.");
      return;
    }
    // Validate mobile: must be exactly 10 digits
    const mobileDigits = signupForm.mobile.replace(/\D/g, "");
    if (mobileDigits.length !== 10) {
      setSignupError("Mobile number must be 10 digits.");
      return;
    }
    if (signupForm.password.length < 8) {
      setSignupError("Password must be at least 8 characters.");
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);

    // If not II logged in, trigger II first
    if (!isIILoggedIn) {
      iiLogin();
      setIsSubmitting(false);
      return;
    }

    const result = await register(
      signupForm.name,
      signupForm.email,
      signupForm.mobile,
      signupForm.password,
    );
    setIsSubmitting(false);
    if (result.success) {
      setSignupSuccess(true);
      setSignupForm({
        name: "",
        email: "",
        mobile: "",
        password: "",
        confirmPassword: "",
      });
      toast.success("Account created successfully!");
    } else {
      setSignupError(result.error ?? "Registration failed. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="auth.modal"
        className="max-w-sm w-full p-0 gap-0 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-brand px-6 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display font-bold text-white">
                {activeTab === "login" ? "Sign In" : "Create Account"}
              </DialogTitle>
              <p className="text-white/70 text-xs mt-0.5 font-medium">
                HIDESTAY · Uttarakhand
              </p>
            </div>
            <button
              type="button"
              data-ocid="auth.close_button"
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors rounded-full p-1.5 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* II login prompt if not connected */}
        {!isIILoggedIn && (
          <div className="px-6 pt-5 pb-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 text-xs font-semibold leading-snug">
                  Connect with Internet Identity first
                </p>
                <p className="text-amber-700 text-[11px] mt-0.5 leading-snug">
                  Required for secure authentication on ICP.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleIILogin}
                disabled={iiLoggingIn}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg px-3 h-7 gap-1 ml-auto"
              >
                {iiLoggingIn ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 pt-4">
          <AnimatePresence mode="wait">
            {signupSuccess ? (
              <motion.div
                key="signup-success"
                data-ocid="auth.success_state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                <h3 className="font-display font-bold text-lg text-foreground mb-1">
                  Account Created!
                </h3>
                <p className="text-muted-foreground text-sm mb-5">
                  Welcome to HIDESTAY. You can now browse and book hotels.
                </p>
                <Button
                  data-ocid="auth.done_button"
                  onClick={handleClose}
                  className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl"
                >
                  Start Exploring
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="auth-tabs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as "login" | "signup")}
                >
                  <TabsList className="w-full mb-5 bg-muted rounded-xl h-10">
                    <TabsTrigger
                      value="login"
                      data-ocid="auth.login_tab"
                      className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      data-ocid="auth.signup_tab"
                      className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      Create Account
                    </TabsTrigger>
                  </TabsList>

                  {/* LOGIN */}
                  <TabsContent value="login">
                    <form
                      data-ocid="auth.login_form"
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="login-email"
                          className="text-sm font-semibold"
                        >
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            data-ocid="auth.login_email_input"
                            type="email"
                            placeholder="you@example.com"
                            value={loginForm.email}
                            onChange={(e) =>
                              setLoginForm((p) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                            required
                            autoComplete="email"
                            className="auth-input pl-9 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="login-password"
                          className="text-sm font-semibold"
                        >
                          Password
                        </Label>
                        <PasswordInput
                          id="login-password"
                          data-ocid="auth.login_password_input"
                          value={loginForm.password}
                          onChange={(v) =>
                            setLoginForm((p) => ({ ...p, password: v }))
                          }
                          placeholder="Your password"
                          required
                        />
                      </div>

                      {loginError && (
                        <div
                          data-ocid="auth.login_error_state"
                          className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                        >
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-red-700 text-xs font-medium">
                            {loginError}
                          </p>
                        </div>
                      )}

                      <Button
                        data-ocid="auth.login_submit_button"
                        type="submit"
                        disabled={
                          isSubmitting || (!isIILoggedIn && iiLoggingIn)
                        }
                        className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold py-5 rounded-xl mt-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : !isIILoggedIn ? (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Connect &amp; Sign In
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        No account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("signup")}
                          className="text-brand font-semibold hover:underline"
                        >
                          Create one
                        </button>
                      </p>
                    </form>
                  </TabsContent>

                  {/* SIGN UP */}
                  <TabsContent value="signup">
                    <form
                      data-ocid="auth.signup_form"
                      onSubmit={handleSignup}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-name"
                          className="text-sm font-semibold"
                        >
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            data-ocid="auth.signup_name_input"
                            type="text"
                            placeholder="Your full name"
                            value={signupForm.name}
                            onChange={(e) =>
                              setSignupForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            required
                            autoComplete="name"
                            className="auth-input pl-9 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-email"
                          className="text-sm font-semibold"
                        >
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            data-ocid="auth.signup_email_input"
                            type="email"
                            placeholder="you@example.com"
                            value={signupForm.email}
                            onChange={(e) =>
                              setSignupForm((p) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                            required
                            autoComplete="email"
                            className="auth-input pl-9 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-mobile"
                          className="text-sm font-semibold"
                        >
                          Mobile Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-mobile"
                            data-ocid="auth.signup_mobile_input"
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={signupForm.mobile}
                            onChange={(e) =>
                              setSignupForm((p) => ({
                                ...p,
                                mobile: e.target.value,
                              }))
                            }
                            required
                            autoComplete="tel"
                            className="auth-input pl-9 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-password"
                          className="text-sm font-semibold"
                        >
                          Password
                        </Label>
                        <PasswordInput
                          id="signup-password"
                          data-ocid="auth.signup_password_input"
                          value={signupForm.password}
                          onChange={(v) =>
                            setSignupForm((p) => ({ ...p, password: v }))
                          }
                          placeholder="Min. 8 characters"
                          required
                        />
                        <PasswordStrengthBar password={signupForm.password} />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-confirm"
                          className="text-sm font-semibold"
                        >
                          Confirm Password
                        </Label>
                        <PasswordInput
                          id="signup-confirm"
                          data-ocid="auth.signup_confirm_password_input"
                          value={signupForm.confirmPassword}
                          onChange={(v) =>
                            setSignupForm((p) => ({
                              ...p,
                              confirmPassword: v,
                            }))
                          }
                          placeholder="Repeat password"
                          required
                        />
                      </div>

                      {signupError && (
                        <div
                          data-ocid="auth.signup_error_state"
                          className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                        >
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-red-700 text-xs font-medium">
                            {signupError}
                          </p>
                        </div>
                      )}

                      <Button
                        data-ocid="auth.signup_submit_button"
                        type="submit"
                        disabled={
                          isSubmitting || (!isIILoggedIn && iiLoggingIn)
                        }
                        className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-bold py-5 rounded-xl mt-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : !isIILoggedIn ? (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Connect &amp; Create Account
                          </>
                        ) : (
                          <>
                            <User className="mr-2 h-4 w-4" />
                            Create Account
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("login")}
                          className="text-brand font-semibold hover:underline"
                        >
                          Sign in
                        </button>
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Profile Page
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerProfilePageProps {
  open: boolean;
  onClose: () => void;
  actor: import("./backend").backendInterface | null;
  onMyBookingsClick: () => void;
}

function CustomerProfilePage({
  open,
  onClose,
  actor,
  onMyBookingsClick,
}: CustomerProfilePageProps) {
  const { profile, logout, refetchProfile } = useCustomerAuth();
  const queryClient = useQueryClient();

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    mobile: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [pwForm, setPwForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [editError, setEditError] = useState("");

  // Sync edit form when profile loads
  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name,
        email: profile.email,
        mobile: (profile as { mobile?: string }).mobile ?? profile.phone ?? "",
      });
    }
  }, [profile]);

  const initials =
    profile?.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const { data: bookingsCount = 0 } = useQuery<number>({
    queryKey: ["my-bookings-count"],
    queryFn: async () => {
      if (!actor) return 0;
      const bookings = await actor.getMyBookings();
      return bookings.length;
    },
    enabled: open && !!actor,
  });

  const { mutate: saveProfile, isPending: isSavingProfile } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.updateCustomerProfile(
        editForm.name,
        editForm.email,
        editForm.mobile,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      refetchProfile();
      setIsEditingProfile(false);
      setEditError("");
      toast.success("Profile updated successfully!");
    },
    onError: (err: Error) => {
      setEditError(err.message ?? "Failed to update profile.");
    },
  });

  const { mutate: changePassword, isPending: isChangingPassword } = useMutation(
    {
      mutationFn: async () => {
        if (!actor) throw new Error("Not connected");
        await actor.changeCustomerPassword(pwForm.newPassword);
      },
      onSuccess: () => {
        setPwSuccess(true);
        setPwError("");
        setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        toast.success("Password changed successfully!");
      },
      onError: (err: Error) => {
        setPwError(err.message ?? "Failed to change password.");
      },
    },
  );

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.oldPassword || !pwForm.newPassword) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    changePassword();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="profile.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-brand shadow-header">
            <div className="max-w-2xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2">
                    <UserCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                      My Profile
                    </span>
                    <span className="text-white/70 text-xs font-medium">
                      HIDESTAY
                    </span>
                  </div>
                </div>
                <Button
                  data-ocid="profile.close_button"
                  onClick={onClose}
                  size="sm"
                  className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-16">
            {/* Profile Hero Card */}
            <motion.div
              data-ocid="profile.hero_card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              {/* Red gradient header */}
              <div className="bg-gradient-to-br from-brand to-[oklch(0.42_0.22_25.5)] px-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-lg">
                    <span className="font-display text-2xl font-extrabold text-white">
                      {initials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl font-extrabold text-white leading-tight truncate">
                      {profile?.name ?? "Loading..."}
                    </h2>
                    <p className="text-white/75 text-sm truncate">
                      {profile?.email}
                    </p>
                    <p className="text-white/55 text-xs mt-1">
                      HIDESTAY Member
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                <button
                  type="button"
                  data-ocid="profile.my_bookings_button"
                  onClick={() => {
                    onClose();
                    onMyBookingsClick();
                  }}
                  className="flex flex-col items-center py-4 hover:bg-muted/40 transition-colors"
                >
                  <span className="font-display font-extrabold text-2xl text-brand">
                    {bookingsCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand" />
                    My Bookings
                  </span>
                </button>
                <button
                  type="button"
                  data-ocid="profile.signout_button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex flex-col items-center py-4 hover:bg-red-50 transition-colors text-red-600"
                >
                  <LogOut className="w-5 h-5 mb-1" />
                  <span className="text-xs font-semibold">Sign Out</span>
                </button>
              </div>
            </motion.div>

            {/* Edit Profile */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    Personal Information
                  </h3>
                </div>
                {!isEditingProfile && (
                  <Button
                    data-ocid="profile.edit_button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="border-border text-foreground hover:bg-muted font-semibold rounded-lg text-xs gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditingProfile ? (
                <form
                  data-ocid="profile.edit_form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveProfile();
                  }}
                  className="px-5 py-5 space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-name"
                      className="text-sm font-semibold"
                    >
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-name"
                        data-ocid="profile.name_input"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, name: e.target.value }))
                        }
                        required
                        className="auth-input pl-9 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-email"
                      className="text-sm font-semibold"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-email"
                        data-ocid="profile.email_input"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, email: e.target.value }))
                        }
                        required
                        className="auth-input pl-9 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-mobile"
                      className="text-sm font-semibold"
                    >
                      Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-mobile"
                        data-ocid="profile.mobile_input"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={editForm.mobile}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, mobile: e.target.value }))
                        }
                        className="auth-input pl-9 rounded-lg"
                      />
                    </div>
                  </div>

                  {editError && (
                    <div
                      data-ocid="profile.edit_error_state"
                      className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-red-700 text-xs">{editError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      data-ocid="profile.save_button"
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      data-ocid="profile.cancel_button"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditError("");
                        if (profile)
                          setEditForm({
                            name: profile.name,
                            email: profile.email,
                            mobile:
                              (profile as { mobile?: string }).mobile ??
                              profile.phone ??
                              "",
                          });
                      }}
                      className="border-border font-semibold rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="px-5 py-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Full Name
                      </p>
                      <p className="font-semibold text-foreground text-sm">
                        {profile?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Email Address
                      </p>
                      <p className="font-semibold text-foreground text-sm">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Mobile Number
                      </p>
                      <p className="font-semibold text-foreground text-sm">
                        {((profile as { mobile?: string } | undefined)
                          ?.mobile ?? profile?.phone) ? (
                          ((profile as { mobile?: string } | undefined)
                            ?.mobile ?? profile?.phone)
                        ) : (
                          <span className="text-muted-foreground font-normal italic">
                            Not set
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Change Password */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-brand" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Change Password
                </h3>
              </div>

              <form
                data-ocid="profile.change_password_form"
                onSubmit={handlePasswordSubmit}
                className="px-5 py-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="old-password"
                    className="text-sm font-semibold"
                  >
                    Current Password
                  </Label>
                  <PasswordInput
                    id="old-password"
                    data-ocid="profile.current_password_input"
                    value={pwForm.oldPassword}
                    onChange={(v) =>
                      setPwForm((p) => ({ ...p, oldPassword: v }))
                    }
                    placeholder="Current password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new-password"
                    className="text-sm font-semibold"
                  >
                    New Password
                  </Label>
                  <PasswordInput
                    id="new-password"
                    data-ocid="profile.new_password_input"
                    value={pwForm.newPassword}
                    onChange={(v) =>
                      setPwForm((p) => ({ ...p, newPassword: v }))
                    }
                    placeholder="Min. 8 characters"
                    required
                  />
                  <PasswordStrengthBar password={pwForm.newPassword} />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-new-password"
                    className="text-sm font-semibold"
                  >
                    Confirm New Password
                  </Label>
                  <PasswordInput
                    id="confirm-new-password"
                    data-ocid="profile.confirm_new_password_input"
                    value={pwForm.confirmPassword}
                    onChange={(v) =>
                      setPwForm((p) => ({ ...p, confirmPassword: v }))
                    }
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                {pwError && (
                  <div
                    data-ocid="profile.password_error_state"
                    className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-red-700 text-xs">{pwError}</p>
                  </div>
                )}

                {pwSuccess && (
                  <div
                    data-ocid="profile.password_success_state"
                    className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-green-700 text-xs font-medium">
                      Password changed successfully!
                    </p>
                  </div>
                )}

                <Button
                  data-ocid="profile.change_password_submit_button"
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </motion.div>

            {/* My Bookings Link Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <button
                type="button"
                data-ocid="profile.go_to_bookings_button"
                onClick={() => {
                  onClose();
                  onMyBookingsClick();
                }}
                className="w-full bg-card border border-border rounded-2xl px-5 py-5 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-base text-foreground leading-tight">
                    My Bookings
                  </p>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    View all your hotel reservations
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {bookingsCount > 0 && (
                    <Badge className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {bookingsCount}
                    </Badge>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                </div>
              </button>
            </motion.div>

            {/* Sign Out */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <Button
                data-ocid="profile.bottom_signout_button"
                variant="outline"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-semibold rounded-2xl py-5 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onLoginClick: () => void;
  onListPropertyClick: () => void;
  onAdminClick: () => void;
  onMyBookingsClick: () => void;
  onOwnerDashboardClick: () => void;
  onProfileClick: () => void;
  onLogoClick: () => void;
  isAdmin: boolean;
  isOwner: boolean;
  pendingListingsCount: number;
}

function Header({
  onLoginClick,
  onListPropertyClick,
  onAdminClick,
  onMyBookingsClick,
  onOwnerDashboardClick,
  onProfileClick,
  onLogoClick,
  isAdmin,
  isOwner,
  pendingListingsCount,
}: HeaderProps) {
  const { isAuthenticated, profile, logout } = useCustomerAuth();

  const initials =
    profile?.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 bg-brand shadow-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            type="button"
            data-ocid="header.logo"
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0"
            onClick={onLogoClick}
          >
            <div className="bg-white/20 rounded-xl p-2">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-extrabold text-white tracking-tight">
                HIDESTAY
              </span>
              <span className="text-white/60 text-[9px] font-semibold tracking-widest uppercase hidden sm:block">
                Uttarakhand Hill Stations
              </span>
            </div>
          </button>

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

            {isAuthenticated && (
              <Button
                data-ocid="header.my_bookings_button"
                onClick={onMyBookingsClick}
                size="sm"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold rounded-lg text-sm gap-1.5"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">My Bookings</span>
              </Button>
            )}

            {isOwner && (
              <Button
                data-ocid="header.owner_dashboard_button"
                onClick={onOwnerDashboardClick}
                size="sm"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold rounded-lg text-sm gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Owner Dashboard</span>
              </Button>
            )}

            {isAdmin && (
              <Button
                data-ocid="header.admin_button"
                onClick={onAdminClick}
                size="sm"
                variant="outline"
                className="relative border-white/50 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold rounded-lg text-sm gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Panel</span>
                {pendingListingsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
                    {pendingListingsCount}
                  </span>
                )}
              </Button>
            )}

            {isAuthenticated && profile ? (
              /* User avatar dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-ocid="header.profile_button"
                    className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl px-2.5 py-1.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-white/30 text-white font-display font-extrabold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block font-semibold text-white text-sm max-w-[100px] truncate">
                      {profile.name.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/70 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  data-ocid="header.profile_dropdown_menu"
                  align="end"
                  className="w-48 rounded-xl shadow-modal"
                >
                  <DropdownMenuItem
                    data-ocid="header.profile_link"
                    onClick={onProfileClick}
                    className="gap-2.5 cursor-pointer font-medium"
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-ocid="header.bookings_link"
                    onClick={onMyBookingsClick}
                    className="gap-2.5 cursor-pointer font-medium"
                  >
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    My Bookings
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem
                    data-ocid="header.signout_button"
                    onClick={() => logout()}
                    className="gap-2.5 cursor-pointer font-medium text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                data-ocid="header.login_button"
                onClick={onLoginClick}
                size="sm"
                className="bg-white text-brand hover:bg-white/90 font-semibold rounded-lg text-sm gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In
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
  "Haridwar",
  "Rishikesh",
  "Mussoorie",
  "Dhanaulti",
  "Dehradun",
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
            Uttarakhand Hill Stations
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 leading-[1.05] tracking-tight">
            Book Budget &amp; Hill View
            <br className="hidden sm:block" />{" "}
            <span className="text-white/90">Hotels in Uttarakhand</span>
          </h1>
          <p className="text-white/75 text-base sm:text-lg font-medium max-w-xl mx-auto">
            Affordable stays in Haridwar, Rishikesh, Mussoorie, Dhanaulti &amp;
            Dehradun
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
                  placeholder="e.g. Haridwar, Rishikesh, Mussoorie"
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
      value: "Uttarakhand",
      label: "& Hill Stations",
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

function AppInner() {
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

  const [selectedHotelId, setSelectedHotelId] = useState<bigint | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [listPropertyModalOpen, setListPropertyModalOpen] = useState(false);
  const [profilePageOpen, setProfilePageOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(
    () => window.location.pathname === "/admin",
  );
  const [adminOtpVerified, setAdminOtpVerified] = useState(false);
  const [adminPasswordVerified, setAdminPasswordVerified] = useState(false);
  const [myBookingsPanelOpen, setMyBookingsPanelOpen] = useState(false);
  const [ownerDashboardOpen, setOwnerDashboardOpen] = useState(false);

  // ── URL-based /admin routing (no router library) ──────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      setSuperAdminOpen(window.location.pathname === "/admin");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openAdminPanel = useCallback(() => {
    history.pushState({}, "", "/admin");
    setSuperAdminOpen(true);
  }, []);

  const closeAdminPanel = useCallback(() => {
    history.pushState({}, "", "/");
    setSuperAdminOpen(false);
    setAdminOtpVerified(false);
    setAdminPasswordVerified(false);
  }, []);

  // ── Auth
  const { identity } = useInternetIdentity();
  const isIILoggedIn = !!identity;
  const { isAuthenticated } = useCustomerAuth();

  // ── Admin check
  const { data: isAdmin = false } = useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorLoading,
  });

  // ── Owner check
  const { isOwner } = useIsOwner(isIILoggedIn && !!actor && !actorLoading);

  // ── Pending listings count (admin only)
  const { data: pendingListingsCount = 0 } = useQuery<number>({
    queryKey: ["pending-listings-count"],
    queryFn: async () => {
      if (!actor || !isAdmin) return 0;
      const listings = await actor.getPropertyListings();
      return listings.filter(
        (l) => l.status === PropertyListingStatus.PendingApproval,
      ).length;
    },
    enabled: !!actor && !actorLoading && isAdmin,
    refetchInterval: 30000,
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

  const handleViewDetails = (hotel: Hotel) => {
    setSelectedHotelId(hotel.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleBackFromDetail = () => {
    setSelectedHotelId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Close profile page if user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setProfilePageOpen(false);
    }
  }, [isAuthenticated]);

  // ── Admin route guard: redirect unauthorized users away from /admin ────────
  useEffect(() => {
    if (actorLoading || !actor) return;
    if (superAdminOpen && isAdmin === false) {
      closeAdminPanel();
      toast.error(
        "Access restricted. Only administrators can access this panel.",
      );
    }
  }, [isAdmin, actorLoading, actor, superAdminOpen, closeAdminPanel]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <Toaster position="top-right" richColors />

      {/* Header — always visible */}
      <Header
        onLoginClick={() => setAuthModalOpen(true)}
        onListPropertyClick={() => setListPropertyModalOpen(true)}
        onAdminClick={openAdminPanel}
        onMyBookingsClick={() => setMyBookingsPanelOpen(true)}
        onOwnerDashboardClick={() => setOwnerDashboardOpen(true)}
        onProfileClick={() => setProfilePageOpen(true)}
        onLogoClick={handleBackFromDetail}
        isAdmin={isAdmin}
        isOwner={isOwner}
        pendingListingsCount={pendingListingsCount}
      />

      {/* Hotel Detail Page */}
      <AnimatePresence mode="wait">
        {selectedHotelId !== null ? (
          <motion.div
            key="hotel-detail"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <HotelDetailPage
              hotelId={selectedHotelId}
              actor={actor}
              searchParams={searchParams}
              onBack={handleBackFromDetail}
              onBookNow={handleBookNow}
            />
          </motion.div>
        ) : (
          <motion.div
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
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
                          {hotels.length === 1 ? "property" : "properties"}{" "}
                          found
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
                      {(
                        ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"] as const
                      ).map((k) => (
                        <HotelCardSkeleton key={k} />
                      ))}
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
                        We couldn't find any hotels matching your search. Try
                        Haridwar, Rishikesh, Mussoorie or other hill stations.
                      </p>
                      <Button
                        onClick={() => {
                          setSearchParams((p) => ({ ...p, city: "" }));
                          setFilters({
                            minPrice: "",
                            maxPrice: "",
                            amenities: [],
                          });
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
                          onViewDetails={handleViewDetails}
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
                        Uttarakhand Hill Stations
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <BookingModal
        hotel={selectedHotel}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        searchParams={searchParams}
        actor={actor}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      {/* Auth Modal (Email + Password) */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Customer Profile Page */}
      <CustomerProfilePage
        open={profilePageOpen}
        onClose={() => setProfilePageOpen(false)}
        actor={actor}
        onMyBookingsClick={() => {
          setProfilePageOpen(false);
          setMyBookingsPanelOpen(true);
        }}
      />

      {/* List Property Modal */}
      <ListPropertyModal
        open={listPropertyModalOpen}
        onClose={() => setListPropertyModalOpen(false)}
        actor={actor}
      />

      {/* Super Admin Password Auth Gate */}
      {superAdminOpen && isAdmin && !adminPasswordVerified && (
        <AdminPasswordAuth
          principalId={identity?.getPrincipal().toString() ?? ""}
          onSuccess={() => setAdminPasswordVerified(true)}
        />
      )}

      {/* Super Admin Panel — accessible at /admin */}
      <SuperAdminPanel
        open={superAdminOpen && adminPasswordVerified}
        onClose={closeAdminPanel}
        actor={actor}
        isAdmin={isAdmin}
        isOtpVerified={adminOtpVerified}
        onOtpVerified={() => setAdminOtpVerified(true)}
        onSessionTimeout={() => setAdminOtpVerified(false)}
        adminPrincipalId={identity?.getPrincipal().toString() ?? ""}
      />

      {/* My Bookings Panel */}
      <MyBookingsPage
        open={myBookingsPanelOpen}
        onClose={() => setMyBookingsPanelOpen(false)}
        actor={actor}
        isOwner={isOwner}
        onOpenOwnerDashboard={() => {
          setMyBookingsPanelOpen(false);
          setOwnerDashboardOpen(true);
        }}
      />

      {/* Owner Dashboard */}
      <OwnerDashboard
        open={ownerDashboardOpen}
        onClose={() => setOwnerDashboardOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <CustomerAuthProvider>
      <AppInner />
    </CustomerAuthProvider>
  );
}
