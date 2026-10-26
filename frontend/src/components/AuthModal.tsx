"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export default function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          onClose();
        }
      } else if (mode === "signup") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters long.");
          setLoading(false);
          return;
        }
        const res = await signUp(email, password, fullName);
        if (res.error) {
          setError(res.error);
        } else if (res.message) {
          setSuccessMessage(res.message);
        } else {
          onClose();
        }
      } else if (mode === "reset") {
        const res = await resetPassword(email);
        if (res.error) {
          setError(res.error);
        } else if (res.message) {
          setSuccessMessage(res.message);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#291B32]/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#DDD0D7] overflow-hidden text-[#291B32]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#DDD0D7] bg-[#F7F2EB]">
          <div>
            <h2 className="font-heading text-xl font-bold text-[#291B32]">
              {mode === "signin" && "Sign In to Studio"}
              {mode === "signup" && "Create Studio Account"}
              {mode === "reset" && "Reset Password"}
            </h2>
            <p className="text-xs text-[#674E61] mt-0.5">
              {mode === "signin" && "Access your saved resumes and revision trees"}
              {mode === "signup" && "Save, view and manage your customized resumes securely"}
              {mode === "reset" && "Enter your email to receive recovery instructions"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close auth modal"
            className="p-1.5 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice if Supabase keys not set */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#E8D9E8] border border-[#DDD0D7] text-xs text-[#291B32]">
            <strong>Development Mode:</strong> Cloud Supabase credentials are not configured in local environment. Local simulated authentication is active.
          </div>
        )}

        {/* Alerts */}
        <div className="px-6 pt-4 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-[#291B32] bg-[#E8D9E8] border border-[#DDD0D7] rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#C45D39]" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-[#291B32] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#674E61] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#291B32] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#674E61] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#291B32]">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-[#C45D39] hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#674E61] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#C45D39] hover:bg-[#b35230] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#C45D39]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === "signin" && "Sign In"}
                  {mode === "signup" && "Create Account"}
                  {mode === "reset" && "Send Reset Link"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch mode */}
        <div className="p-4 border-t border-[#DDD0D7] bg-[#F7F2EB] text-center text-xs text-[#674E61]">
          {mode === "signin" && (
            <span>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-[#C45D39] hover:underline"
              >
                Sign up
              </button>
            </span>
          )}
          {mode === "signup" && (
            <span>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-[#C45D39] hover:underline"
              >
                Sign in
              </button>
            </span>
          )}
          {mode === "reset" && (
            <button
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccessMessage(null);
              }}
              className="font-semibold text-[#C45D39] hover:underline"
            >
              Back to Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
