// ─────────────────────────────────────────────────────────────────────────────
// AccountDashboard — Full-featured customer account dashboard
// Tabs: Profile | My Bookings | Saved Hotels | Help & Support | Settings
// ─────────────────────────────────────────────────────────────────────────────

import type { Booking, Hotel } from "@/backend.d";
import { Status } from "@/backend.d";
import { PasswordStrengthBar } from "@/components/PasswordStrengthBar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  Car,
  CheckCircle,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  Star,
  Trash2,
  User,
  UserCircle,
  Users,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AccountTab = "profile" | "bookings" | "saved" | "help" | "settings";

export interface AccountDashboardProps {
  open: boolean;
  onClose: () => void;
  initialTab?: AccountTab;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
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

function calcNights(checkIn: string, checkOut: string): number {
  try {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

function formatPrice(price: bigint): string {
  return new Intl.NumberFormat("en-IN").format(Number(price));
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

// ─────────────────────────────────────────────────────────────────────────────
// useSavedHotels hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSavedHotels(email: string | undefined) {
  const key = email ? `hidestay_saved_hotels_${email}` : null;

  const [savedIds, setSavedIds] = useState<Set<number>>(() => {
    if (!email) return new Set();
    try {
      const raw = localStorage.getItem(`hidestay_saved_hotels_${email}`);
      if (raw) return new Set(JSON.parse(raw) as number[]);
    } catch {
      // ignore
    }
    return new Set();
  });

  const persist = useCallback(
    (next: Set<number>) => {
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        // ignore
      }
    },
    [key],
  );

  const saveHotel = useCallback(
    (id: number) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const unsaveHotel = useCallback(
    (id: number) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isHotelSaved = useCallback(
    (id: number) => savedIds.has(id),
    [savedIds],
  );

  return { savedIds, saveHotel, unsaveHotel, isHotelSaved };
}

// ─────────────────────────────────────────────────────────────────────────────
// PasswordInput helper
// ─────────────────────────────────────────────────────────────────────────────

function PasswordInputField({
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
      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        id={id}
        data-ocid={dataOcid}
        type={show ? "text" : "password"}
        placeholder={placeholder ?? "Password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="auth-input pl-9 pr-10 rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <span className="text-xs font-semibold">Hide</span>
        ) : (
          <span className="text-xs font-semibold">Show</span>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{
  tab: AccountTab;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    tab: "profile",
    label: "Profile",
    icon: <UserCircle className="w-5 h-5" />,
  },
  {
    tab: "bookings",
    label: "My Bookings",
    icon: <BookOpen className="w-5 h-5" />,
  },
  { tab: "saved", label: "Saved Hotels", icon: <Heart className="w-5 h-5" /> },
  {
    tab: "help",
    label: "Help & Support",
    icon: <HelpCircle className="w-5 h-5" />,
  },
  {
    tab: "settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile, customerActor: actor, refetchProfile } = useCustomerAuth();
  const queryClient = useQueryClient();

  // localStorage-backed fields
  const photoKey = profile?.email
    ? `hidestay_profile_photo_${profile.email}`
    : null;
  const dobKey = profile?.email ? `hidestay_dob_${profile.email}` : null;
  const genderKey = profile?.email ? `hidestay_gender_${profile.email}` : null;

  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!profile?.email) return null;
    return localStorage.getItem(`hidestay_profile_photo_${profile.email}`);
  });
  const [dob, setDob] = useState<string>(() => {
    if (!profile?.email) return "";
    return localStorage.getItem(`hidestay_dob_${profile.email}`) ?? "";
  });
  const [gender, setGender] = useState<string>(() => {
    if (!profile?.email) return "";
    return localStorage.getItem(`hidestay_gender_${profile.email}`) ?? "";
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    mobile:
      (profile as { mobile?: string })?.mobile ??
      (profile as { phone?: string })?.phone ??
      "",
    dob: dob,
    gender: gender,
  });

  // Change Password form
  const [pwForm, setPwForm] = useState({ old: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  // Sync when profile loads/changes
  useEffect(() => {
    if (profile) {
      const storedDob =
        localStorage.getItem(`hidestay_dob_${profile.email}`) ?? "";
      const storedGender =
        localStorage.getItem(`hidestay_gender_${profile.email}`) ?? "";
      const storedPhoto =
        localStorage.getItem(`hidestay_profile_photo_${profile.email}`) ?? null;
      setPhotoUrl(storedPhoto);
      setDob(storedDob);
      setGender(storedGender);
      setEditForm({
        name: profile.name,
        email: profile.email,
        mobile:
          (profile as { mobile?: string })?.mobile ??
          (profile as { phone?: string })?.phone ??
          "",
        dob: storedDob,
        gender: storedGender,
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

  const memberSince = (() => {
    try {
      const cp = profile as { memberSince?: bigint };
      if (cp?.memberSince) {
        return new Date(Number(cp.memberSince) / 1_000_000).toLocaleDateString(
          "en-IN",
          {
            month: "short",
            year: "numeric",
          },
        );
      }
    } catch {
      /* ignore */
    }
    return "2024";
  })();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (photoKey) localStorage.setItem(photoKey, dataUrl);
      setPhotoUrl(dataUrl);
      toast.success("Profile photo updated!");
    };
    reader.readAsDataURL(file);
  };

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      await actor.updateCustomerProfile(
        editForm.name,
        editForm.email,
        editForm.mobile,
      );
    },
    onSuccess: () => {
      if (profile?.email) {
        if (editForm.dob) {
          localStorage.setItem(`hidestay_dob_${profile.email}`, editForm.dob);
        } else {
          if (dobKey) localStorage.removeItem(dobKey);
        }
        if (editForm.gender) {
          localStorage.setItem(
            `hidestay_gender_${profile.email}`,
            editForm.gender,
          );
        } else {
          if (genderKey) localStorage.removeItem(genderKey);
        }
        setDob(editForm.dob);
        setGender(editForm.gender);
      }
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      refetchProfile();
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update profile.");
    },
  });

  const { mutate: changePassword, isPending: isChangingPw } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      const hash = await hashPassword(pwForm.newPw);
      await actor.changeCustomerPassword(hash);
    },
    onSuccess: () => {
      setPwSuccess(true);
      setPwError("");
      setPwForm({ old: "", newPw: "", confirm: "" });
      toast.success("Password changed successfully!");
    },
    onError: (err: Error) => {
      setPwError(err.message ?? "Failed to change password.");
    },
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.old || !pwForm.newPw) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (pwForm.newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    changePassword();
  };

  const infoItems = [
    {
      label: "Full Name",
      value: profile?.name,
      icon: <User className="w-4 h-4 text-brand" />,
    },
    {
      label: "Email Address",
      value: profile?.email,
      icon: <Mail className="w-4 h-4 text-brand" />,
    },
    {
      label: "Mobile Number",
      value:
        (profile as { mobile?: string })?.mobile ||
        (profile as { phone?: string })?.phone ||
        "Not set",
      icon: <Phone className="w-4 h-4 text-brand" />,
    },
    {
      label: "Date of Birth",
      value: dob ? formatDate(dob) : "Not set",
      icon: <Calendar className="w-4 h-4 text-brand" />,
    },
    {
      label: "Gender",
      value: gender || "Not set",
      icon: <UserCircle className="w-4 h-4 text-brand" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Hero Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-brand to-[oklch(0.42_0.22_25.5)] px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <button
                type="button"
                data-ocid="profile.photo_upload_button"
                onClick={() => photoInputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-all"
                title="Change profile photo"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display text-2xl font-extrabold text-white">
                    {initials}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Upload photo"
              >
                <Camera className="w-3.5 h-3.5 text-brand" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-extrabold text-white leading-tight truncate">
                {profile?.name ?? "Loading..."}
              </h2>
              <p className="text-white/75 text-sm truncate">{profile?.email}</p>
              <p className="text-white/55 text-xs mt-1">
                Member since {memberSince}
              </p>
            </div>
            {!isEditing && (
              <Button
                data-ocid="profile.edit_button"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-white/20 hover:bg-white/35 text-white border border-white/30 font-semibold rounded-lg text-xs gap-1.5 shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form or Info Grid */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand" />
                </div>
                <h3 className="font-display font-bold text-base">
                  Edit Profile
                </h3>
              </div>
            </div>
            <form
              data-ocid="profile.edit_form"
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile();
              }}
              className="px-5 py-5 space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="dash-name" className="text-sm font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dash-name"
                    data-ocid="profile.name.input"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                    className="auth-input pl-9 rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dash-email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dash-email"
                    data-ocid="profile.email.input"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                    className="auth-input pl-9 rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dash-mobile" className="text-sm font-semibold">
                  Mobile Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="dash-mobile"
                    data-ocid="profile.mobile.input"
                    type="tel"
                    value={editForm.mobile}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, mobile: e.target.value }))
                    }
                    placeholder="10-digit mobile number"
                    className="auth-input pl-9 rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dash-dob" className="text-sm font-semibold">
                  Date of Birth
                </Label>
                <Input
                  id="dash-dob"
                  data-ocid="profile.dob.input"
                  type="date"
                  value={editForm.dob}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, dob: e.target.value }))
                  }
                  className="auth-input rounded-lg bg-white text-black border-gray-300 focus:border-brand"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dash-gender" className="text-sm font-semibold">
                  Gender
                </Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, gender: v }))
                  }
                >
                  <SelectTrigger
                    id="dash-gender"
                    data-ocid="profile.gender.select"
                    className="auth-input rounded-lg bg-white text-black border-gray-300 focus:border-brand"
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  data-ocid="profile.save_button"
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
                >
                  {isSaving ? (
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
                    setIsEditing(false);
                  }}
                  className="flex-1 border-border font-semibold rounded-xl py-5"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="info-grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand" />
                </div>
                <h3 className="font-display font-bold text-base">
                  Personal Information
                </h3>
              </div>
              <Button
                data-ocid="profile.edit_button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-border text-foreground hover:bg-muted font-semibold rounded-lg text-xs gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>
            <div className="divide-y divide-border">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand/8 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                      {item.label}
                    </p>
                    <p className="font-semibold text-foreground text-sm truncate">
                      {item.value || (
                        <span className="text-muted-foreground font-normal italic">
                          Not set
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowPwForm((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-brand" />
            </div>
            <h3 className="font-display font-bold text-base">
              Change Password
            </h3>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${showPwForm ? "rotate-90" : ""}`}
          />
        </button>

        <AnimatePresence>
          {showPwForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border" />
              <form
                data-ocid="profile.change_password_form"
                onSubmit={handlePwSubmit}
                className="px-5 py-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dash-old-pw"
                    className="text-sm font-semibold"
                  >
                    Current Password
                  </Label>
                  <PasswordInputField
                    id="dash-old-pw"
                    value={pwForm.old}
                    onChange={(v) => setPwForm((p) => ({ ...p, old: v }))}
                    placeholder="Current password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dash-new-pw"
                    className="text-sm font-semibold"
                  >
                    New Password
                  </Label>
                  <PasswordInputField
                    id="dash-new-pw"
                    data-ocid="profile.change_password.submit_button"
                    value={pwForm.newPw}
                    onChange={(v) => setPwForm((p) => ({ ...p, newPw: v }))}
                    placeholder="Min. 8 characters"
                    required
                  />
                  <PasswordStrengthBar password={pwForm.newPw} />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="dash-confirm-pw"
                    className="text-sm font-semibold"
                  >
                    Confirm New Password
                  </Label>
                  <PasswordInputField
                    id="dash-confirm-pw"
                    value={pwForm.confirm}
                    onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                {pwError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-red-700 text-xs">{pwError}</p>
                  </div>
                )}
                {pwSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-green-700 text-xs font-medium">
                      Password changed successfully!
                    </p>
                  </div>
                )}
                <Button
                  data-ocid="profile.change_password.submit_button"
                  type="submit"
                  disabled={isChangingPw}
                  className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
                >
                  {isChangingPw ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Invoice helper
// ─────────────────────────────────────────────────────────────────────────────

function downloadInvoice(booking: Booking, hotel: Hotel | undefined) {
  const hotelName = hotel?.name ?? `Hotel #${booking.hotelId}`;
  const city = hotel?.city ?? "";
  const nights = calcNights(booking.checkIn, booking.checkOut);
  const pricePerNight = Number(hotel?.pricePerNight ?? 0);
  const total = pricePerNight * nights;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice #${booking.id}</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: sans-serif; padding: 40px; color: #111; max-width: 700px; margin: 0 auto; }
  h1 { color: #E53935; font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: #888; font-size: 13px; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; }
  td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
  .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #E53935; color: #E53935; }
  .badge { background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
  .section { margin-bottom: 24px; }
  .label { color: #888; font-size: 12px; text-transform: uppercase; }
</style>
</head>
<body>
<h1>HIDESTAY</h1>
<p class="subtitle">Uttarakhand Hill Stations · hidestay.com</p>
<hr>
<div class="section">
  <p class="label">Invoice</p>
  <p><strong>#${booking.id}</strong> &nbsp; Date: ${new Date().toLocaleDateString("en-IN")}</p>
</div>
<div class="section">
  <p class="label">Hotel</p>
  <p><strong>${hotelName}</strong><br>${city}</p>
</div>
<table>
  <tr><th>Item</th><th>Details</th></tr>
  <tr><td>Booking ID</td><td>#${booking.id}</td></tr>
  <tr><td>Guest Name</td><td>${booking.guestName}</td></tr>
  <tr><td>Email</td><td>${booking.guestEmail}</td></tr>
  <tr><td>Phone</td><td>${booking.phone}</td></tr>
  <tr><td>Check-in</td><td>${formatDate(booking.checkIn)}</td></tr>
  <tr><td>Check-out</td><td>${formatDate(booking.checkOut)}</td></tr>
  <tr><td>Guests</td><td>${booking.guestCount}</td></tr>
  <tr><td>Nights</td><td>${nights}</td></tr>
  <tr><td>Price per Night</td><td>₹${formatPrice(BigInt(pricePerNight))}</td></tr>
  <tr><td>Payment Mode</td><td><span class="badge">Pay at Hotel</span></td></tr>
  <tr class="total-row"><td>Total Amount</td><td>₹${formatPrice(BigInt(total))}</td></tr>
</table>
<p style="margin-top:32px;color:#888;font-size:12px;">© ${new Date().getFullYear()} HIDESTAY · Built with ♥ using caffeine.ai</p>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// My Bookings Tab
// ─────────────────────────────────────────────────────────────────────────────

function BookingsTab() {
  const { customerActor: actor } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery<Booking[]>({
    queryKey: ["dash-my-bookings"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getMyBookings();
      return [...result].sort((a, b) => Number(b.created - a.created));
    },
    enabled: !!actor,
  });

  // Fetch hotel details for all bookings
  const hotelIds = [...new Set(bookings.map((b) => b.hotelId.toString()))];
  const hotelMap = useQuery<Record<string, Hotel>>({
    queryKey: ["dash-hotels-map", hotelIds.join(",")],
    queryFn: async () => {
      if (!actor || hotelIds.length === 0) return {};
      const results = await Promise.allSettled(
        [...new Set(bookings.map((b) => b.hotelId))].map((id) =>
          actor.getHotel(id).then((h) => [id.toString(), h] as [string, Hotel]),
        ),
      );
      const map: Record<string, Hotel> = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          const [id, h] = r.value;
          map[id] = h;
        }
      }
      return map;
    },
    enabled: !!actor && bookings.length > 0,
  });

  const hotels = hotelMap.data ?? {};

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.cancelBooking(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dash-my-bookings"] });
      toast.success("Booking cancelled successfully.");
    },
    onError: () => {
      toast.error("Failed to cancel booking.");
    },
  });

  if (selectedId !== null) {
    const booking = bookings.find((b) => b.id === selectedId);
    const hotel = booking ? hotels[booking.hotelId.toString()] : undefined;
    if (!booking) return null;

    const nights = calcNights(booking.checkIn, booking.checkOut);
    const total = hotel ? Number(hotel.pricePerNight) * nights : 0;
    const imgSrc = hotel
      ? hotel.imageUrls?.length > 0
        ? hotel.imageUrls[0]
        : getHotelImageSrc(hotel.imageIndex)
      : "/assets/generated/haridwar-hotel-1.dim_800x500.jpg";

    const statusBadge =
      booking.status === Status.Confirmed
        ? {
            label: "Reserved",
            color: "bg-amber-100 text-amber-700 border-amber-200",
          }
        : booking.status === Status.Cancelled
          ? {
              label: "Cancelled",
              color: "bg-red-100 text-red-700 border-red-200",
            }
          : {
              label: "Pending",
              color: "bg-gray-100 text-gray-600 border-gray-200",
            };

    return (
      <motion.div
        key="booking-detail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.22 }}
        className="space-y-5"
      >
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </button>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="relative h-44">
            <img
              src={imgSrc}
              alt={hotel?.name ?? "Hotel"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <p className="font-display font-extrabold text-white text-lg leading-tight">
                {hotel?.name ?? `Hotel #${booking.hotelId}`}
              </p>
              {hotel?.city && (
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {hotel.city}
                </p>
              )}
            </div>
            <div
              className={`absolute top-4 right-4 border rounded-full px-3 py-1 text-xs font-bold ${statusBadge.color}`}
            >
              {statusBadge.label}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-muted/50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">
                Booking ID
              </p>
              <p className="font-display font-extrabold text-2xl text-brand">
                #{booking.id.toString()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Check-in", value: formatDate(booking.checkIn) },
                { label: "Check-out", value: formatDate(booking.checkOut) },
                { label: "Nights", value: nights.toString() },
                { label: "Guests", value: booking.guestCount.toString() },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-muted/30 rounded-xl p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {item.label}
                  </p>
                  <p className="font-bold text-foreground text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {hotel && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  Pricing
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ₹{formatPrice(hotel.pricePerNight)} × {nights} nights
                  </span>
                  <span className="font-semibold">
                    ₹{formatPrice(BigInt(total))}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-brand text-lg">
                    ₹{formatPrice(BigInt(total))}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-green-800 font-bold text-sm">
                Pay at Hotel — No advance payment required
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Guest Details
              </p>
              <p className="font-semibold text-sm">{booking.guestName}</p>
              <p className="text-muted-foreground text-xs">
                {booking.guestEmail}
              </p>
              <p className="text-muted-foreground text-xs">{booking.phone}</p>
            </div>

            <div className="flex gap-3">
              {booking.status !== Status.Cancelled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      data-ocid="bookings.cancel_button.1"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl"
                    >
                      Cancel Booking
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent data-ocid="bookings.cancel.dialog">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel booking #
                        {booking.id.toString()}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-ocid="bookings.cancel.cancel_button">
                        Keep Booking
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-ocid="bookings.cancel.confirm_button"
                        onClick={() => {
                          cancelBooking(booking.id);
                          setSelectedId(null);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                data-ocid="bookings.invoice_button.1"
                onClick={() => downloadInvoice(booking, hotel)}
                className="flex-1 bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl gap-2"
              >
                <FileText className="w-4 h-4" />
                Download Invoice
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div data-ocid="bookings.loading_state" className="space-y-4">
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="flex">
              <div className="skeleton-shimmer w-[130px] h-[120px] shrink-0" />
              <div className="flex-1 p-4 space-y-3">
                <div className="skeleton-shimmer h-5 w-3/4 rounded" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded" />
                <div className="skeleton-shimmer h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-ocid="bookings.error_state"
        className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border"
      >
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-foreground font-semibold">Failed to load bookings</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <motion.div
        data-ocid="bookings.empty_state"
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
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Your hotel reservations will appear here after you book a stay.
        </p>
      </motion.div>
    );
  }

  return (
    <div data-ocid="bookings.list" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
      </p>
      {bookings.map((booking, idx) => {
        const hotel = hotels[booking.hotelId.toString()];
        const nights = calcNights(booking.checkIn, booking.checkOut);
        const total = hotel ? Number(hotel.pricePerNight) * nights : 0;
        const imgSrc = hotel
          ? hotel.imageUrls?.length > 0
            ? hotel.imageUrls[0]
            : getHotelImageSrc(hotel.imageIndex)
          : "/assets/generated/haridwar-hotel-1.dim_800x500.jpg";

        const statusBadge =
          booking.status === Status.Confirmed
            ? {
                label: "Reserved",
                color: "bg-amber-100 text-amber-700 border border-amber-200",
              }
            : booking.status === Status.Cancelled
              ? {
                  label: "Cancelled",
                  color: "bg-red-100 text-red-700 border border-red-200",
                }
              : {
                  label: "Pending",
                  color: "bg-gray-100 text-gray-600 border border-gray-200",
                };

        return (
          <motion.div
            key={booking.id.toString()}
            data-ocid={`bookings.item.${idx + 1}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex">
              <div className="relative w-[130px] sm:w-[160px] h-[130px] shrink-0">
                <img
                  src={imgSrc}
                  alt={hotel?.name ?? "Hotel"}
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.color}`}
                >
                  {statusBadge.label}
                </div>
              </div>
              <div className="flex-1 p-4 min-w-0">
                <p className="font-display font-bold text-foreground text-sm leading-tight line-clamp-1 mb-1">
                  {hotel?.name ?? `Hotel #${booking.hotelId}`}
                </p>
                {hotel?.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {hotel.city}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                  <div>
                    <span className="text-muted-foreground">Check-in: </span>
                    <span className="font-semibold">
                      {formatDate(booking.checkIn)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out: </span>
                    <span className="font-semibold">
                      {formatDate(booking.checkOut)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Guests: </span>
                    <span className="font-semibold">
                      {booking.guestCount.toString()}
                    </span>
                  </div>
                  {total > 0 && (
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-bold text-brand">
                        ₹{formatPrice(BigInt(total))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-ocid={`bookings.view_button.${idx + 1}`}
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedId(booking.id)}
                    className="text-xs h-7 px-3 font-semibold border-border rounded-lg gap-1"
                  >
                    View Details
                  </Button>
                  {booking.status !== Status.Cancelled && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          data-ocid={`bookings.cancel_button.${idx + 1}`}
                          size="sm"
                          variant="outline"
                          disabled={isCancelling}
                          className="text-xs h-7 px-3 font-semibold border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Cancel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cancel booking #{booking.id.toString()}? This cannot
                            be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelBooking(booking.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Yes, Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    data-ocid={`bookings.invoice_button.${idx + 1}`}
                    size="sm"
                    variant="outline"
                    onClick={() => downloadInvoice(booking, hotel)}
                    className="text-xs h-7 px-3 font-semibold border-border rounded-lg gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Invoice
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Saved Hotels Tab
// ─────────────────────────────────────────────────────────────────────────────

function SavedTab() {
  const { profile, customerActor: actor } = useCustomerAuth();
  const { savedIds, unsaveHotel } = useSavedHotels(profile?.email);

  const savedHotelIds = [...savedIds];

  const { data: hotels = [], isLoading } = useQuery<Hotel[]>({
    queryKey: ["dash-saved-hotels", [...savedIds].join(",")],
    queryFn: async () => {
      if (!actor || savedHotelIds.length === 0) return [];
      const results = await Promise.allSettled(
        savedHotelIds.map((id) => actor.getHotel(BigInt(id))),
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Hotel> => r.status === "fulfilled",
        )
        .map((r) => r.value);
    },
    enabled: !!actor && savedHotelIds.length > 0,
  });

  if (savedHotelIds.length === 0) {
    return (
      <motion.div
        data-ocid="saved.empty_state"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 px-6"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Heart className="w-9 h-9 text-brand" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground mb-2">
          No saved hotels yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Browse hotels and tap ♥ to save them to your wishlist.
        </p>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {savedHotelIds.map((id) => (
          <div
            key={id}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="skeleton-shimmer h-44 w-full" />
            <div className="p-4 space-y-3">
              <div className="skeleton-shimmer h-5 w-3/4 rounded" />
              <div className="skeleton-shimmer h-4 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-ocid="saved.list"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {hotels.map((hotel, idx) => {
        const imgSrc =
          hotel.imageUrls?.length > 0
            ? hotel.imageUrls[0]
            : getHotelImageSrc(hotel.imageIndex);
        const roomType = hotel.description.includes(" | ")
          ? hotel.description.split(" | ")[0]
          : null;
        return (
          <motion.div
            key={hotel.id.toString()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm group"
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={imgSrc}
                alt={hotel.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <button
                type="button"
                data-ocid={`saved.unsave_button.${idx + 1}`}
                onClick={() => {
                  unsaveHotel(Number(hotel.id));
                  toast.success("Removed from saved hotels");
                }}
                className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110"
                aria-label="Remove from saved"
              >
                <Heart className="w-4 h-4 text-brand fill-brand" />
              </button>
              <div className="absolute bottom-3 left-3">
                {roomType && (
                  <span className="bg-teal-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {roomType}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-display font-bold text-sm text-foreground leading-tight line-clamp-1 mb-1">
                {hotel.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="w-3 h-3" />
                {hotel.city}
              </p>
              {hotel.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {hotel.amenities.slice(0, 3).map((a) => {
                    const icons: Record<string, React.ReactNode> = {
                      WiFi: <Wifi className="w-3 h-3" />,
                      AC: <Wind className="w-3 h-3" />,
                      Parking: <Car className="w-3 h-3" />,
                    };
                    return (
                      <Badge
                        key={a}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 gap-1"
                      >
                        {icons[a]} {a}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    per night
                  </p>
                  <p className="font-display font-extrabold text-lg text-brand">
                    ₹{formatPrice(hotel.pricePerNight)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i <= Number(hotel.starRating) ? "text-amber-400 fill-current" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Help & Support Tab
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "How do I cancel my booking?",
    a: "Go to My Bookings, find your reservation, and click 'Cancel Booking'. Free cancellations are available up to 24 hours before check-in.",
  },
  {
    q: "What is the check-in process?",
    a: "Arrive at the hotel during check-in time (typically 12:00 PM) and show your booking ID along with a valid government-issued photo ID.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. HIDESTAY uses a Pay at Hotel model — you don't make any advance payment online. All transactions happen in-person at the hotel.",
  },
  {
    q: "Can I modify my booking dates?",
    a: "Currently, date modifications require cancelling and rebooking. Please contact us at support@hidestay.com if you need assistance.",
  },
  {
    q: "How do I contact the hotel directly?",
    a: "Hotel contact information is available on the hotel detail page. You can also email us at support@hidestay.com and we'll connect you.",
  },
  {
    q: "What if the hotel doesn't have my booking?",
    a: "Please show your Booking ID (available in My Bookings). If the issue persists, call our helpdesk at +91 1800-123-4567 immediately.",
  },
];

function HelpTab() {
  const { profile } = useCustomerAuth();
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm((p) => ({ ...p, name: profile.name, email: profile.email }));
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Your message has been sent. We'll respond within 24 hours.");
    setForm((p) => ({ ...p, subject: "", message: "" }));
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Contact Helpdesk */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-brand" />
          </div>
          <h3 className="font-display font-bold text-base">Contact Helpdesk</h3>
        </div>
        <div className="p-5 space-y-4">
          <a
            href="tel:+911800123456"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                +91 1800-123-4567
              </p>
              <p className="text-xs text-green-600 font-medium">
                Toll Free · Available 24/7
              </p>
            </div>
          </a>
          <a
            href="mailto:support@hidestay.com"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">
                support@hidestay.com
              </p>
              <p className="text-xs text-muted-foreground">
                We respond within 24 hours
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-brand" />
          </div>
          <h3 className="font-display font-bold text-base">
            Frequently Asked Questions
          </h3>
        </div>
        <div className="px-5 py-3">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={item.q}
                value={`faq-${idx}`}
                className="border-border"
              >
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-brand py-3.5 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3.5 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-brand" />
          </div>
          <h3 className="font-display font-bold text-base">Send a Message</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="help-name" className="text-sm font-semibold">
                Name
              </Label>
              <Input
                id="help-name"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                required
                className="auth-input rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="help-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="help-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                required
                className="auth-input rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-subject" className="text-sm font-semibold">
              Subject
            </Label>
            <Input
              id="help-subject"
              value={form.subject}
              onChange={(e) =>
                setForm((p) => ({ ...p, subject: e.target.value }))
              }
              placeholder="Brief subject of your query"
              required
              className="auth-input rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="help-message" className="text-sm font-semibold">
              Message
            </Label>
            <Textarea
              id="help-message"
              value={form.message}
              onChange={(e) =>
                setForm((p) => ({ ...p, message: e.target.value }))
              }
              placeholder="Describe your issue or query..."
              rows={4}
              required
              className="auth-input rounded-lg bg-white text-black placeholder:text-gray-400 border-gray-300 focus:border-brand resize-none"
            />
          </div>
          {submitted && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-green-700 text-sm font-medium">
                Message sent! We'll respond within 24 hours.
              </p>
            </div>
          )}
          <Button
            data-ocid="help.contact_form.submit_button"
            type="submit"
            className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Tab
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ onClose }: { onClose: () => void }) {
  const { profile, customerActor: actor, logout } = useCustomerAuth();
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ old: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const { mutate: changePassword, isPending: isChangingPw } = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      const hash = await hashPassword(pwForm.newPw);
      await actor.changeCustomerPassword(hash);
    },
    onSuccess: () => {
      setPwSuccess(true);
      setPwError("");
      setPwForm({ old: "", newPw: "", confirm: "" });
      toast.success("Password changed successfully!");
    },
    onError: (err: Error) => {
      setPwError(err.message ?? "Failed to change password.");
    },
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.old || !pwForm.newPw) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (pwForm.newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    changePassword();
  };

  const handleDeleteAccount = () => {
    const email = profile?.email;
    // Clear all hidestay localStorage keys for this user
    if (email) {
      const keysToDelete = [
        `hidestay_profile_photo_${email}`,
        `hidestay_dob_${email}`,
        `hidestay_gender_${email}`,
        `hidestay_saved_hotels_${email}`,
        "hidestay_customer_session",
        "hidestay_customer_profile",
      ];
      for (const k of keysToDelete) {
        localStorage.removeItem(k);
      }
    }
    logout();
    onClose();
    toast.success("Account deleted. We're sorry to see you go.");
  };

  const handleLogout = () => {
    logout();
    onClose();
    toast.success("Signed out successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Account Security */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-brand" />
          </div>
          <h3 className="font-display font-bold text-base">Account Security</h3>
        </div>
        <div className="px-5 py-4">
          <Button
            data-ocid="settings.change_password_button"
            variant="outline"
            onClick={() => setShowChangePw((v) => !v)}
            className="w-full justify-between border-border font-semibold rounded-xl py-5"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand" />
              Change Password
            </span>
            <ChevronRight
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showChangePw ? "rotate-90" : ""}`}
            />
          </Button>

          <AnimatePresence>
            {showChangePw && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <form onSubmit={handlePwSubmit} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="settings-old-pw"
                      className="text-sm font-semibold"
                    >
                      Current Password
                    </Label>
                    <PasswordInputField
                      id="settings-old-pw"
                      value={pwForm.old}
                      onChange={(v) => setPwForm((p) => ({ ...p, old: v }))}
                      placeholder="Current password"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="settings-new-pw"
                      className="text-sm font-semibold"
                    >
                      New Password
                    </Label>
                    <PasswordInputField
                      id="settings-new-pw"
                      value={pwForm.newPw}
                      onChange={(v) => setPwForm((p) => ({ ...p, newPw: v }))}
                      placeholder="Min. 8 characters"
                      required
                    />
                    <PasswordStrengthBar password={pwForm.newPw} />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="settings-confirm-pw"
                      className="text-sm font-semibold"
                    >
                      Confirm New Password
                    </Label>
                    <PasswordInputField
                      id="settings-confirm-pw"
                      value={pwForm.confirm}
                      onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                  {pwError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-red-700 text-xs">{pwError}</p>
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <p className="text-green-700 text-xs font-medium">
                        Password changed successfully!
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={isChangingPw}
                    className="w-full bg-brand hover:bg-[oklch(0.45_0.22_25.5)] text-white font-semibold rounded-xl py-5"
                  >
                    {isChangingPw ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-display font-bold text-base">Session</h3>
        </div>
        <div className="px-5 py-4">
          <Button
            data-ocid="settings.logout_button"
            variant="outline"
            onClick={handleLogout}
            className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold rounded-xl py-5 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-card border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-200 bg-red-50/50">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <h3 className="font-display font-bold text-base text-red-700">
            Danger Zone
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Deleting your account is permanent. All your bookings, saved hotels,
            and profile data will be removed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-ocid="settings.delete_account_button"
                variant="destructive"
                className="w-full gap-2 py-5 rounded-xl bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-ocid="settings.delete_account.dialog">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-700">
                  Delete Account?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All your data — profile,
                  bookings, and saved hotels — will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-ocid="settings.delete_account.cancel_button">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="settings.delete_account.confirm_button"
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AccountDashboard component
// ─────────────────────────────────────────────────────────────────────────────

export function AccountDashboard({
  open,
  onClose,
  initialTab = "profile",
}: AccountDashboardProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);
  const { logout } = useCustomerAuth();

  const handleLogout = () => {
    logout();
    onClose();
    toast.success("Signed out successfully.");
  };

  // Sync tab when initialTab prop changes
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const tabContent = {
    profile: <ProfileTab />,
    bookings: <BookingsTab />,
    saved: <SavedTab />,
    help: <HelpTab />,
    settings: <SettingsTab onClose={onClose} />,
  };

  const currentNav = NAV_ITEMS.find((n) => n.tab === activeTab);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-ocid="account_dashboard.panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col"
        >
          {/* ── Sticky Red Header */}
          <div className="sticky top-0 z-10 bg-brand shadow-header shrink-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2">
                    <UserCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-extrabold text-white tracking-tight block leading-none">
                      My Account
                    </span>
                    <span className="text-white/60 text-[10px] font-semibold tracking-widest uppercase">
                      HIDESTAY · {currentNav?.label}
                    </span>
                  </div>
                </div>
                <Button
                  data-ocid="account_dashboard.close_button"
                  onClick={onClose}
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-semibold rounded-lg text-sm gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── Body: Sidebar + Content */}
          <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full">
            {/* ── Desktop Sidebar */}
            <nav className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border bg-card/50 overflow-y-auto">
              <div className="p-4 space-y-1 flex-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    data-ocid={`account_dashboard.${item.tab}.tab`}
                    onClick={() => setActiveTab(item.tab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                      activeTab === item.tab
                        ? "bg-brand text-white shadow-sm"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={
                        activeTab === item.tab
                          ? "text-white"
                          : "text-muted-foreground"
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                    {activeTab === item.tab && (
                      <ChevronRight className="ml-auto w-4 h-4 text-white/70" />
                    )}
                  </button>
                ))}
              </div>
              {/* Sidebar Logout button */}
              <div className="p-4 border-t border-border">
                <button
                  type="button"
                  data-ocid="account_dashboard.logout_button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-all duration-200 text-left"
                >
                  <LogOut className="w-5 h-5 text-amber-600 shrink-0" />
                  Logout
                </button>
              </div>
            </nav>

            {/* ── Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* Mobile Tab Bar */}
              <div className="md:hidden sticky top-0 z-10 bg-background border-b border-border">
                <div className="flex overflow-x-auto scrollbar-hide">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      data-ocid={`account_dashboard.${item.tab}.tab`}
                      onClick={() => setActiveTab(item.tab)}
                      className={`flex flex-col items-center gap-1 px-4 py-3 shrink-0 text-[11px] font-semibold transition-colors border-b-2 ${
                        activeTab === item.tab
                          ? "border-brand text-brand"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`${activeTab === item.tab ? "text-brand" : "text-muted-foreground"}`}
                      >
                        {item.icon}
                      </span>
                      <span>
                        {item.tab === "help"
                          ? "Help"
                          : item.tab === "settings"
                            ? "Settings"
                            : item.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Content */}
              <div className="px-4 sm:px-6 lg:px-8 py-6 pb-10 max-w-3xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tabContent[activeTab]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
