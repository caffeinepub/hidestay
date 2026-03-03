import type { CustomerProfile } from "@/backend.d";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

interface CustomerAuthState {
  isAuthenticated: boolean; // II is logged in AND has a customer profile
  profile: CustomerProfile | null;
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
  const { identity, clear: clearII } = useInternetIdentity();
  const queryClient = useQueryClient();

  // Whether the user has completed the email+password flow this session
  const [isEmailAuthed, setIsEmailAuthed] = useState(false);

  const isIILoggedIn = !!identity;

  // Fetch profile when II is logged in
  const {
    data: profile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useQuery<CustomerProfile | null>({
    queryKey: ["customer-profile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyCustomerProfile();
    },
    enabled: isIILoggedIn && !!actor && !actorLoading,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!actor) return { success: false, error: "Not connected" };

      // If not II logged in, trigger II login first
      if (!isIILoggedIn) {
        return {
          success: false,
          error: "Please wait for authentication to initialize",
        };
      }

      try {
        const result = await actor.loginCustomer(email, password);
        if (result.__kind__ === "ok") {
          setIsEmailAuthed(true);
          await queryClient.invalidateQueries({
            queryKey: ["customer-profile"],
          });
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch (_e) {
        return { success: false, error: "Login failed. Please try again." };
      }
    },
    [actor, isIILoggedIn, queryClient],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      mobile: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!actor) return { success: false, error: "Not connected" };
      if (!isIILoggedIn) {
        return {
          success: false,
          error: "Please wait for authentication to initialize",
        };
      }

      try {
        const result = await actor.registerCustomer(
          name,
          email,
          mobile,
          password,
        );
        if (result.__kind__ === "ok") {
          setIsEmailAuthed(true);
          await queryClient.invalidateQueries({
            queryKey: ["customer-profile"],
          });
          return { success: true };
        }
        return { success: false, error: result.error };
      } catch (_e) {
        return {
          success: false,
          error: "Registration failed. Please try again.",
        };
      }
    },
    [actor, isIILoggedIn, queryClient],
  );

  const logout = useCallback(() => {
    setIsEmailAuthed(false);
    queryClient.removeQueries({ queryKey: ["customer-profile"] });
    clearII(); // Also clears the II session
  }, [clearII, queryClient]);

  // User is fully authenticated if II is logged in AND (they completed email login OR they have a profile)
  const isAuthenticated =
    isIILoggedIn && (isEmailAuthed || (!!profile && !isLoadingProfile));

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
