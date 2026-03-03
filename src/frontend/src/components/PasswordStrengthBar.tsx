// ─────────────────────────────────────────────────────────────────────────────
// PasswordStrengthBar — Visual password strength indicator
// ─────────────────────────────────────────────────────────────────────────────

interface PasswordStrengthBarProps {
  password: string;
}

function getStrengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getStrengthLevel(score: number): {
  level: number; // 0-4 bars filled
  label: string;
  color: string;
  textColor: string;
} {
  if (score === 0)
    return {
      level: 0,
      label: "",
      color: "bg-border",
      textColor: "text-muted-foreground",
    };
  if (score <= 2)
    return {
      level: 1,
      label: "Weak",
      color: "bg-red-500",
      textColor: "text-red-600",
    };
  if (score === 3)
    return {
      level: 2,
      label: "Fair",
      color: "bg-orange-400",
      textColor: "text-orange-600",
    };
  if (score === 4)
    return {
      level: 3,
      label: "Strong",
      color: "bg-yellow-400",
      textColor: "text-yellow-600",
    };
  return {
    level: 4,
    label: "Very Strong",
    color: "bg-emerald-500",
    textColor: "text-emerald-600",
  };
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const score = getStrengthScore(password);
  const { level, label, color, textColor } = getStrengthLevel(score);

  if (!password) return null;

  return (
    <div
      className="mt-2 space-y-1.5"
      aria-label={`Password strength: ${label}`}
    >
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              bar <= level ? color : "bg-border"
            }`}
          />
        ))}
      </div>
      {label && <p className={`text-xs font-semibold ${textColor}`}>{label}</p>}
    </div>
  );
}

export function getPasswordStrengthScore(password: string): number {
  return getStrengthScore(password);
}
