// ─────────────────────────────────────────────────────────────────────────────
// useAdminCredentials — Frontend-only admin auth (localStorage + Web Crypto)
// ─────────────────────────────────────────────────────────────────────────────

interface StoredCredentials {
  userId: string;
  email: string;
  passwordHash: string; // SHA-256 hex
}

interface ResetToken {
  code: string;
  expiresAt: number; // ms timestamp
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return digits.toString();
}

export function useAdminCredentials(principalId: string) {
  const credsKey = `hidestay_admin_creds_${principalId}`;
  const resetKey = `hidestay_admin_reset_${principalId}`;

  function getStored(): StoredCredentials | null {
    try {
      const raw = localStorage.getItem(credsKey);
      if (!raw) return null;
      return JSON.parse(raw) as StoredCredentials;
    } catch {
      return null;
    }
  }

  const hasCredentials = getStored() !== null;
  const storedUserId = getStored()?.userId ?? "";
  const storedEmail = getStored()?.email ?? "";

  async function verify(
    userId: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const stored = getStored();
    if (!stored) return { success: false, error: "No credentials configured" };
    const hash = await sha256Hex(password);
    if (stored.userId !== userId || stored.passwordHash !== hash) {
      return { success: false, error: "Invalid User ID or password" };
    }
    return { success: true };
  }

  async function setup(
    userId: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!userId.trim()) return { success: false, error: "User ID is required" };
    if (!email.trim() || !email.includes("@"))
      return { success: false, error: "Valid email is required" };
    if (password.length < 8)
      return {
        success: false,
        error: "Password must be at least 8 characters",
      };
    const hash = await sha256Hex(password);
    const creds: StoredCredentials = {
      userId: userId.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
    };
    localStorage.setItem(credsKey, JSON.stringify(creds));
    return { success: true };
  }

  async function changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    const stored = getStored();
    if (!stored) return { success: false, error: "No credentials configured" };
    const oldHash = await sha256Hex(oldPassword);
    if (stored.passwordHash !== oldHash) {
      return { success: false, error: "Current password is incorrect" };
    }
    if (newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters",
      };
    }
    const newHash = await sha256Hex(newPassword);
    const updated: StoredCredentials = { ...stored, passwordHash: newHash };
    localStorage.setItem(credsKey, JSON.stringify(updated));
    return { success: true };
  }

  function generateResetToken(email: string): {
    success: boolean;
    code?: string;
    error?: string;
  } {
    const stored = getStored();
    if (!stored) return { success: false, error: "No credentials configured" };
    if (stored.email.toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, error: "Email not found in admin credentials" };
    }
    const code = generateCode();
    const token: ResetToken = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    localStorage.setItem(resetKey, JSON.stringify(token));
    return { success: true, code };
  }

  async function resetPassword(
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const raw = localStorage.getItem(resetKey);
      if (!raw) return { success: false, error: "No reset code found" };
      const token: ResetToken = JSON.parse(raw);
      if (Date.now() > token.expiresAt) {
        localStorage.removeItem(resetKey);
        return {
          success: false,
          error: "Reset code has expired. Please request a new one.",
        };
      }
      if (token.code !== code.trim()) {
        return { success: false, error: "Invalid reset code" };
      }
      if (newPassword.length < 8) {
        return {
          success: false,
          error: "Password must be at least 8 characters",
        };
      }
      const stored = getStored();
      if (!stored)
        return { success: false, error: "No credentials configured" };
      const newHash = await sha256Hex(newPassword);
      const updated: StoredCredentials = { ...stored, passwordHash: newHash };
      localStorage.setItem(credsKey, JSON.stringify(updated));
      localStorage.removeItem(resetKey);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "An error occurred during password reset",
      };
    }
  }

  return {
    hasCredentials,
    userId: storedUserId,
    email: storedEmail,
    verify,
    setup,
    changePassword,
    generateResetToken,
    resetPassword,
  };
}
