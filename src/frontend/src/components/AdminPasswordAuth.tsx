// ─────────────────────────────────────────────────────────────────────────────
// AdminPasswordAuth — Frontend-only admin password gate
// Sits between Internet Identity auth check and the OTP gate
// ─────────────────────────────────────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminCredentials } from "@/hooks/useAdminCredentials";
import {
  AlertCircle,
  Crown,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  PasswordStrengthBar,
  getPasswordStrengthScore,
} from "./PasswordStrengthBar";

// ─────────────────────────────────────────────────────────────────────────────

type AuthView = "login" | "setup" | "forgot" | "forgot-verify";

interface AdminPasswordAuthProps {
  principalId: string;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared card wrapper
// ─────────────────────────────────────────────────────────────────────────────

function AuthCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      {/* Crown / logo */}
      <div className="flex justify-center mb-7">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.38 0.18 280) 0%, oklch(0.28 0.14 260) 100%)",
          }}
        >
          <Crown className="w-8 h-8 text-white" />
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold text-white text-center mb-1.5 leading-tight">
        {title}
      </h1>
      <p className="text-white/50 text-sm text-center mb-8">{subtitle}</p>

      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Show/hide password toggle
// ─────────────────────────────────────────────────────────────────────────────

function PasswordInput({
  id,
  placeholder,
  value,
  onChange,
  ocid,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  ocid?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
      <Input
        id={id}
        data-ocid={ocid}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="pl-9 pr-10 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login View
// ─────────────────────────────────────────────────────────────────────────────

function LoginView({
  principalId,
  onSuccess,
  onForgot,
}: {
  principalId: string;
  onSuccess: () => void;
  onForgot: () => void;
}) {
  const creds = useAdminCredentials(principalId);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await creds.verify(userId, password);
    setLoading(false);
    if (result.success) {
      toast.success("Admin credentials verified");
      onSuccess();
    } else {
      setError(result.error ?? "Login failed");
    }
  };

  return (
    <AuthCard
      title="Super Admin Login"
      subtitle="Secure access — HIDESTAY Administration"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID */}
        <div className="space-y-1.5">
          <Label
            htmlFor="admin-userId"
            className="text-white/70 text-sm font-semibold"
          >
            Admin User ID
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              id="admin-userId"
              data-ocid="admin_login.input"
              type="text"
              placeholder="admin"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              autoComplete="username"
              className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="admin-password"
            className="text-white/70 text-sm font-semibold"
          >
            Password
          </Label>
          <PasswordInput
            id="admin-password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            ocid="admin_login.password_input"
          />
        </div>

        {/* Forgot Password link */}
        <div className="flex justify-end">
          <button
            type="button"
            data-ocid="admin_login.forgot_link"
            onClick={onForgot}
            className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors font-medium"
          >
            Forgot Password?
          </button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              data-ocid="admin_login.error_state"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          data-ocid="admin_login.submit_button"
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl font-bold text-sm gap-2 mt-2"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.22 280) 0%, oklch(0.35 0.18 265) 100%)",
            color: "white",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Sign In
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup View (first-time credential configuration)
// ─────────────────────────────────────────────────────────────────────────────

function SetupView({
  principalId,
  onSuccess,
}: {
  principalId: string;
  onSuccess: () => void;
}) {
  const creds = useAdminCredentials(principalId);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strengthScore = getPasswordStrengthScore(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (strengthScore < 2) {
      setError("Password is too weak. Add uppercase, numbers, or symbols.");
      return;
    }
    setLoading(true);
    const result = await creds.setup(userId, email, password);
    setLoading(false);
    if (result.success) {
      toast.success("Admin credentials configured successfully!");
      onSuccess();
    } else {
      setError(result.error ?? "Setup failed");
    }
  };

  return (
    <AuthCard
      title="Setup Admin Credentials"
      subtitle="First-time setup — configure your secure login"
    >
      {/* Info banner */}
      <div className="bg-indigo-500/15 border border-indigo-400/25 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-300 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-200 leading-relaxed">
          These credentials are stored securely on this device. You'll need them
          every time you access the admin panel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID */}
        <div className="space-y-1.5">
          <Label
            htmlFor="setup-userId"
            className="text-white/70 text-sm font-semibold"
          >
            Admin User ID
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              id="setup-userId"
              data-ocid="admin_setup.input"
              type="text"
              placeholder="Choose a user ID (e.g. admin)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              autoComplete="username"
              className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label
            htmlFor="setup-email"
            className="text-white/70 text-sm font-semibold"
          >
            Admin Email (for password reset)
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              id="setup-email"
              data-ocid="admin_setup.email_input"
              type="email"
              placeholder="admin@hidestay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="setup-password"
            className="text-white/70 text-sm font-semibold"
          >
            Password
          </Label>
          <PasswordInput
            id="setup-password"
            placeholder="Create a strong password"
            value={password}
            onChange={setPassword}
            ocid="admin_setup.password_input"
          />
          <PasswordStrengthBar password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="setup-confirm"
            className="text-white/70 text-sm font-semibold"
          >
            Confirm Password
          </Label>
          <PasswordInput
            id="setup-confirm"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={setConfirm}
            ocid="admin_setup.confirm_input"
          />
          {confirm && password !== confirm && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              data-ocid="admin_setup.error_state"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          data-ocid="admin_setup.submit_button"
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl font-bold text-sm gap-2 mt-2"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.22 280) 0%, oklch(0.35 0.18 265) 100%)",
            color: "white",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Configuring...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              Configure Credentials
            </>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password — Step 1 (enter email, get code)
// ─────────────────────────────────────────────────────────────────────────────

function ForgotView({
  principalId,
  onCodeGenerated,
  onBack,
}: {
  principalId: string;
  onCodeGenerated: () => void;
  onBack: () => void;
}) {
  const creds = useAdminCredentials(principalId);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // small delay for UX
    const result = creds.generateResetToken(email);
    setLoading(false);
    if (result.success && result.code) {
      setDemoCode(result.code);
    } else {
      setError(result.error ?? "Failed to generate reset code");
    }
  };

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Enter your registered admin email to reset your password"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="forgot-email"
            className="text-white/70 text-sm font-semibold"
          >
            Admin Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              id="forgot-email"
              data-ocid="admin_forgot.email_input"
              type="email"
              placeholder="admin@hidestay.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              data-ocid="admin_forgot.error_state"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo code banner */}
        <AnimatePresence>
          {demoCode && (
            <motion.div
              data-ocid="admin_forgot.success_state"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3.5 space-y-1"
            >
              <p className="text-xs text-amber-200 font-semibold uppercase tracking-wider">
                Demo Mode — Reset Code
              </p>
              <p className="font-display text-2xl font-bold text-amber-300 tracking-[0.15em]">
                {demoCode}
              </p>
              <p className="text-xs text-amber-200/70">
                Expires in 10 minutes. Use this code to set a new password.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!demoCode ? (
          <Button
            data-ocid="admin_forgot.submit_button"
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl font-bold text-sm gap-2"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.22 280) 0%, oklch(0.35 0.18 265) 100%)",
              color: "white",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Send Reset Code
              </>
            )}
          </Button>
        ) : (
          <Button
            data-ocid="admin_forgot.continue_button"
            type="button"
            onClick={onCodeGenerated}
            className="w-full h-11 rounded-xl font-bold text-sm gap-2"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.22 280) 0%, oklch(0.35 0.18 265) 100%)",
              color: "white",
            }}
          >
            <KeyRound className="w-4 h-4" />I Have the Code →
          </Button>
        )}

        <button
          type="button"
          data-ocid="admin_forgot.back_button"
          onClick={onBack}
          className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors mt-2"
        >
          ← Back to Login
        </button>
      </form>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password — Step 2 (enter code + new password)
// ─────────────────────────────────────────────────────────────────────────────

function ForgotVerifyView({
  principalId,
  onSuccess,
  onBack,
}: {
  principalId: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const creds = useAdminCredentials(principalId);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strengthScore = getPasswordStrengthScore(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (strengthScore < 2) {
      setError("Password is too weak. Add uppercase, numbers, or symbols.");
      return;
    }
    setLoading(true);
    const result = await creds.resetPassword(code, newPassword);
    setLoading(false);
    if (result.success) {
      toast.success("Password reset successfully! Please sign in.");
      onSuccess();
    } else {
      setError(result.error ?? "Reset failed");
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter the 6-digit code and your new password"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code */}
        <div className="space-y-1.5">
          <Label
            htmlFor="reset-code"
            className="text-white/70 text-sm font-semibold"
          >
            Reset Code (6 digits)
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <Input
              id="reset-code"
              data-ocid="admin_reset.code_input"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              className="pl-9 bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl h-11 tracking-[0.25em] font-mono"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="reset-newpw"
            className="text-white/70 text-sm font-semibold"
          >
            New Password
          </Label>
          <PasswordInput
            id="reset-newpw"
            placeholder="Create a strong new password"
            value={newPassword}
            onChange={setNewPassword}
            ocid="admin_reset.password_input"
          />
          <PasswordStrengthBar password={newPassword} />
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label
            htmlFor="reset-confirm"
            className="text-white/70 text-sm font-semibold"
          >
            Confirm New Password
          </Label>
          <PasswordInput
            id="reset-confirm"
            placeholder="Re-enter new password"
            value={confirm}
            onChange={setConfirm}
            ocid="admin_reset.confirm_input"
          />
          {confirm && newPassword !== confirm && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              data-ocid="admin_reset.error_state"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          data-ocid="admin_reset.submit_button"
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl font-bold text-sm gap-2"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.22 280) 0%, oklch(0.35 0.18 265) 100%)",
            color: "white",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Reset Password
            </>
          )}
        </Button>

        <button
          type="button"
          data-ocid="admin_reset.back_button"
          onClick={onBack}
          className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors mt-2"
        >
          ← Back
        </button>
      </form>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPasswordAuth component
// ─────────────────────────────────────────────────────────────────────────────

export function AdminPasswordAuth({
  principalId,
  onSuccess,
}: AdminPasswordAuthProps) {
  const creds = useAdminCredentials(principalId);

  // Start on setup if no credentials, otherwise login
  const [view, setView] = useState<AuthView>(
    creds.hasCredentials ? "login" : "setup",
  );

  return (
    <div
      data-ocid="admin_auth.panel"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.11 0.03 255) 0%, oklch(0.16 0.02 255) 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.25 280) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.20 260) 0%, transparent 70%)",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {view === "setup" && (
          <SetupView
            key="setup"
            principalId={principalId}
            onSuccess={onSuccess}
          />
        )}
        {view === "login" && (
          <LoginView
            key="login"
            principalId={principalId}
            onSuccess={onSuccess}
            onForgot={() => setView("forgot")}
          />
        )}
        {view === "forgot" && (
          <ForgotView
            key="forgot"
            principalId={principalId}
            onCodeGenerated={() => setView("forgot-verify")}
            onBack={() => setView("login")}
          />
        )}
        {view === "forgot-verify" && (
          <ForgotVerifyView
            key="forgot-verify"
            principalId={principalId}
            onSuccess={() => setView("login")}
            onBack={() => setView("forgot")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
