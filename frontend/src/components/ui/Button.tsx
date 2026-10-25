import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ai" | "editing" | "destructive" | "ghost";
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
    "inline-flex items-center justify-center font-semibold transition-all duration-200 select-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C4DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B101A] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3.5 text-base gap-2.5 min-h-[50px]",
  }[size];

  const variantClasses = {
    primary:
      "bg-[#7C4DFF] hover:bg-[#6940DE] active:bg-[#5833C5] text-white shadow-lg shadow-[#7C4DFF]/25 hover:shadow-[#7C4DFF]/40 active:scale-[0.98]",
    secondary:
      "bg-[#1B2231] hover:bg-[#232C3E] active:bg-[#161C28] text-[#F7F7FA] border border-[#30384B] hover:border-[#7C4DFF]/50 shadow-sm active:scale-[0.98]",
    ai:
      "bg-gradient-to-r from-[#7C4DFF] via-[#8F65FF] to-[#6940DE] hover:from-[#6940DE] hover:to-[#5833C5] text-white shadow-md shadow-[#7C4DFF]/30 hover:shadow-[#7C4DFF]/50 hover:brightness-105 active:scale-[0.98]",
    editing:
      "bg-[#2C224B] hover:bg-[#382B5F] active:bg-[#231A3D] text-[#B89AFF] border border-[#7C4DFF]/40 hover:border-[#7C4DFF] shadow-sm active:scale-[0.98]",
    destructive:
      "bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.98]",
    ghost:
      "bg-transparent hover:bg-[#1B2231] text-[#B8B9D0] hover:text-[#F7F7FA] active:bg-[#111827]",
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
