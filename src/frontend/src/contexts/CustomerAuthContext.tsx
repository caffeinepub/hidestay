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

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
});

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const customerIdentity = useCustomerIdentity();

  // Whether the user has completed email+password login this session
  const [isEmailAuthed, setIsEmailAuthed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist session flag to localStorage
  useEffect(() => {
    try {
      if (isEmailAuthed) {
        localStorage.setItem(SESSION_KEY, "true");
      } else {
        localStorage.removeItem(SESSION_KEY);
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
      // NOTE: Do NOT call _initializeAccessControlWithSecret here.
      // The backend no longer requires role registration for customer endpoints.
      return actor;
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // Fetch profile whenever actor is ready and user is email-authed
  const {
    data: profile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      if (!customerActor) return null;
      return customerActor.getCallerUserProfile();
    },
    enabled: isEmailAuthed && !!customerActor,
    staleTime: 60_000,
  });

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

  const logout = useCallback(() => {
    setIsEmailAuthed(false);
    queryClient.removeQueries({ queryKey: ["customer-profile"] });
  }, [queryClient]);

  // Authenticated when session is active and profile has loaded (or session flag set)
  const isAuthenticated = isEmailAuthed && (!!profile || !isLoadingProfile);

  return (
    <CustomerAuthContext.Provider
      value={{
        isAuthenticated,
        profile: profile ?? null,
        isLoadingProfile,
        customerActor: customerActor ?? null,
        login,
        register,
        logout,
        refetchProfile: () => refetchProfile(),
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}
