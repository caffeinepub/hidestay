import type { UserProfile } from "@/backend.d";
import { useActor } from "@/hooks/useActor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SESSION_KEY = "hidestay_customer_session";

interface CustomerAuthState {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoadingProfile: boolean;
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
  login: async () => ({ success: false }),
  register: async (_name, _email, _mobile, _password) => ({ success: false }),
  logout: () => {},
  refetchProfile: () => {},
});

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching: actorLoading } = useActor();
  const queryClient = useQueryClient();

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

  // Fetch profile whenever actor is ready and user is email-authed
  const {
    data: profile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: isEmailAuthed && !!actor && !actorLoading,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!actor) return { success: false, error: "Not connected" };

      try {
        const success = await actor.loginCustomer(email, password);
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
    [actor, queryClient],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      mobile: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!actor) return { success: false, error: "Not connected" };

      try {
        await actor.registerCustomer(name, email, mobile, password);
        // After registering, log in automatically
        const loginSuccess = await actor.loginCustomer(email, password);
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
    [actor, queryClient],
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
