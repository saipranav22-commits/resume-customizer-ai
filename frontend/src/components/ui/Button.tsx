import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ai"
  | "recheck"
  | "save"
  | "export"
  | "editing"
  | "destructive"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 select-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C45D39] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F2EB] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5 min-h-[38px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3.5 text-base gap-2.5 min-h-[50px]",
  }[size];

  const variantClasses = {
    // Primary: Burnished Copper fill #C45D39, accessible contrast and subtle shadow
    primary:
      "bg-[#C45D39] hover:bg-[#B34E2C] active:bg-[#9E4324] text-white shadow-md shadow-[#C45D39]/25 hover:shadow-lg hover:shadow-[#C45D39]/35 active:scale-[0.98]",
    // Secondary: Aubergine outline or lightly tinted background
    secondary:
      "bg-white hover:bg-[#F7F2EB] active:bg-[#E8D9E8]/40 text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32] shadow-xs active:scale-[0.98]",
    // AI Improve: Distinctive copper/lavender treatment with AI icon
    ai:
      "bg-gradient-to-r from-[#C45D39] via-[#D16B47] to-[#C45D39] hover:from-[#B34E2C] hover:to-[#9E4324] text-white shadow-md shadow-[#C45D39]/20 hover:brightness-105 active:scale-[0.98]",
    // Re-check Score: Strong dark-aubergine button with copper icon or accent
    recheck:
      "bg-[#291B32] hover:bg-[#3B2848] active:bg-[#1F1426] text-[#FAF6F2] border border-[#291B32] shadow-md active:scale-[0.98]",
    // Save Version: Aubergine surface with clear text
    save:
      "bg-[#291B32] hover:bg-[#3B2848] active:bg-[#1F1426] text-[#FAF6F2] border border-[#4A355A] shadow-sm active:scale-[0.98]",
    // Export: Neutral white/porcelain buttons with small format icons
    export:
      "bg-white hover:bg-[#F7F2EB] active:bg-[#E8D9E8]/50 text-[#291B32] border border-[#DDD0D7] hover:border-[#C45D39]/50 shadow-xs active:scale-[0.98]",
    // Editing / Lavender
    editing:
      "bg-[#E8D9E8] hover:bg-[#DDD0D7] active:bg-[#C8BAC8] text-[#291B32] border border-[#D8C3D8] shadow-xs active:scale-[0.98]",
    // Destructive
    destructive:
      "bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 shadow-xs active:scale-[0.98]",
    // Ghost
    ghost:
      "bg-transparent hover:bg-[#E8D9E8]/50 text-[#674E61] hover:text-[#291B32] active:bg-[#DDD0D7]/40",
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;
