import { Ed25519KeyIdentity } from "@dfinity/identity";
import { useMemo } from "react";

const STORAGE_KEY = "hidestay_customer_keypair";

/**
 * Returns a stable Ed25519KeyIdentity for the customer.
 * On first use, generates a new key pair and persists it to localStorage.
 * On subsequent visits, reloads the same key pair.
 *
 * This gives customers a real non-anonymous ICP principal without requiring
 * Internet Identity, and works correctly in WebView mobile apps.
 */
export function useCustomerIdentity(): Ed25519KeyIdentity {
  return useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const secretKeyArray = JSON.parse(stored) as number[];
        const secretKeyBytes = Uint8Array.from(secretKeyArray);
        return Ed25519KeyIdentity.fromSecretKey(secretKeyBytes);
      }
    } catch {
      // Fall through to generate a new key pair
    }

    // Generate a new identity and persist it
    const identity = Ed25519KeyIdentity.generate();
    try {
      const { secretKey } = identity.getKeyPair();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(secretKey)));
    } catch {
      // If we can't persist, the identity will be regenerated next time
      // but this is acceptable — the user just won't have the same principal
    }
    return identity;
  }, []);
}
