import type { backendInterface } from "@/backend";
import type { UserProfile } from "@/backend.d";
import { createActorWithConfig } from "@/config";
import { useCustomerIdentity } from "@/hooks/useCustomerIdentity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SESSION_KEY = "hidestay_customer_session";
const PROFILE_CACHE_KEY = "hidestay_customer_profile";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch {
    // ignore
  }
  return null;
}

function saveCachedProfile(profile: UserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

interface CustomerAuthState {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoadingProfile: boolean;
  customerActor: backendInterface | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    mobile: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refetchProfile: () => void;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; otp?: string; error?: string }>;
  resetPasswordWithOtp: (
    email: string,
    otp: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const CustomerAuthContext = createContext<CustomerAuthState>({
  isAuthenticated: false,
  profile: null,
  isLoadingProfile: false,
  customerActor: null,
  login: async () => ({ success: false }),
  register: async (_name, _email, _mobile, _password) => ({ success: false }),
  logout: () => {},
  refetchProfile: () => {},
  requestPasswordReset: async () => ({ success: false }),
  resetPasswordWithOtp: async () => ({ success: false }),
});

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const customerIdentity = useCustomerIdentity();

  // Whether the user has completed email+password login
  const [isEmailAuthed, setIsEmailAuthed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Cached profile for instant restore on page load
  const [cachedProfile, setCachedProfile] = useState<UserProfile | null>(() =>
    loadCachedProfile(),
  );

  // Persist session flag to localStorage
  useEffect(() => {
    try {
      if (isEmailAuthed) {
        localStorage.setItem(SESSION_KEY, "true");
      } else {
        localStorage.removeItem(SESSION_KEY);
        saveCachedProfile(null);
        setCachedProfile(null);
      }
    } catch {
      // ignore storage errors
    }
  }, [isEmailAuthed]);

  // Create a customer-specific actor using the Ed25519 identity (non-anonymous)
  const principalStr = customerIdentity.getPrincipal().toString();
  const { data: customerActor = null } = useQuery<backendInterface | null>({
    queryKey: ["customer-actor", principalStr],
    queryFn: async () => {
      const actor = await createActorWithConfig({
        agentOptions: { identity: customerIdentity },
      });
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // Fetch profile whenever actor is ready and user is email-authed
  const {
    data: fetchedProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      if (!customerActor) return null;
      const result = await customerActor.getCallerUserProfile();
      return result;
    },
    enabled: isEmailAuthed && !!customerActor,
    staleTime: 60_000,
  });

  // Keep the cached profile in sync with the fetched one
  useEffect(() => {
    if (fetchedProfile) {
      saveCachedProfile(fetchedProfile);
      setCachedProfile(fetchedProfile);
    }
  }, [fetchedProfile]);

  // Active profile: prefer fetched, fall back to cached during loading
  const profile = fetchedProfile ?? (isEmailAuthed ? cachedProfile : null);

  const { mutateAsync: loginMutate } = useMutation({
    mutationFn: async ({
      email,
      passwordHash,
    }: {
      email: string;
      passwordHash: string;
    }) => {
      if (!customerActor) throw new Error("Not connected");
      return customerActor.loginCustomer(email, passwordHash);
    },
  });

  const { mutateAsync: registerMutate } = useMutation({
    mutationFn: async ({
      name,
      email,
      mobile,
      passwordHash,
    }: {
      name: string;
      email: string;
      mobile: string;
      passwordHash: string;
    }) => {
      if (!customerActor) throw new Error("Not connected");
      await customerActor.registerCustomer(name, email, mobile, passwordHash);
      return customerActor.loginCustomer(email, passwordHash);
    },
  });

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!customerActor) return { success: false, error: "Not connected" };

      try {
        const passwordHash = await hashPassword(password);
        const success = await loginMutate({ email, passwordHash });
        if (success) {
          setIsEmailAuthed(true);
          await queryClient.invalidateQueries({
            queryKey: ["customer-profile"],
          });
          return { success: true };
        }
        return { success: false, error: "Invalid email or password." };
      } catch (_e) {
        return { success: false, error: "Login failed. Please try again." };
      }
    },
    [customerActor, loginMutate, queryClient],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      mobile: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!customerActor) return { success: false, error: "Not connected" };

      try {
        const passwordHash = await hashPassword(password);
        const loginSuccess = await registerMutate({
          name,
          email,
          mobile,
          passwordHash,
        });
        if (loginSuccess) {
          setIsEmailAuthed(true);
          await queryClient.invalidateQueries({
            queryKey: ["customer-profile"],
          });
        }
        return { success: true };
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Registration failed. Please try again.";
        return {
          success: false,
          error: msg,
        };
      }
    },
    [customerActor, registerMutate, queryClient],
  );

  const requestPasswordReset = useCallback(
    async (
      email: string,
    ): Promise<{ success: boolean; otp?: string; error?: string }> => {
      if (!customerActor)
        return { success: false, error: "Not connected. Please try again." };
      try {
        const result = await customerActor.requestPasswordReset(email);
        if (result === "NOT_FOUND") {
          return {
            success: false,
            error: "No account found with this email.",
          };
        }
        return { success: true, otp: result };
      } catch (_e) {
        return {
          success: false,
          error: "Failed to send reset code. Please try again.",
        };
      }
    },
    [customerActor],
  );

  const resetPasswordWithOtp = useCallback(
    async (
      email: string,
      otp: string,
      newPassword: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!customerActor)
        return { success: false, error: "Not connected. Please try again." };
      try {
        const newPasswordHash = await hashPassword(newPassword);
        const success = await customerActor.resetPasswordWithOtp(
          email,
          otp,
          newPasswordHash,
        );
        if (success) {
          return { success: true };
        }
        return { success: false, error: "Invalid or expired OTP." };
      } catch (_e) {
        return {
          success: false,
          error: "Password reset failed. Please try again.",
        };
      }
    },
    [customerActor],
  );

  const logout = useCallback(() => {
    setIsEmailAuthed(false);
    saveCachedProfile(null);
    setCachedProfile(null);
    queryClient.removeQueries({ queryKey: ["customer-profile"] });
  }, [queryClient]);

  // Authenticated when session flag is set AND profile is available (from cache or fetched)
  const isAuthenticated = isEmailAuthed && !!profile;

  return (
    <CustomerAuthContext.Provider
      value={{
        isAuthenticated,
        profile,
        isLoadingProfile,
        customerActor: customerActor ?? null,
        login,
        register,
        logout,
        refetchProfile: () => refetchProfile(),
        requestPasswordReset,
        resetPasswordWithOtp,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}
