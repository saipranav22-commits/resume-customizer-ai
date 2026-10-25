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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B101A]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#111827] rounded-2xl shadow-2xl border border-[#30384B] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#30384B] bg-[#1B2231]">
          <div>
            <h2 className="font-heading text-xl font-bold text-[#F7F7FA]">
              {mode === "signin" && "Sign In to Studio"}
              {mode === "signup" && "Create Studio Account"}
              {mode === "reset" && "Reset Password"}
            </h2>
            <p className="text-xs text-[#B8B9D0] mt-0.5">
              {mode === "signin" && "Access your saved resumes and revision trees"}
              {mode === "signup" && "Save, view and manage your customized resumes securely"}
              {mode === "reset" && "Enter your email to receive recovery instructions"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B8B9D0] hover:text-[#F7F7FA] hover:bg-[#0B101A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice if Supabase keys not set */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#2C224B]/40 border border-[#7C4DFF]/30 text-xs text-[#B89AFF]">
            <strong>Development Mode:</strong> Cloud Supabase credentials are not configured in local environment. Local simulated authentication is active.
          </div>
        )}

        {/* Alerts */}
        <div className="px-6 pt-4 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-[#F7F7FA] bg-[#2C224B] border border-[#7C4DFF]/40 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#7C4DFF]" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-[#F7F7FA] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#B8B9D0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#30384B] bg-[#0B101A] text-[#F7F7FA] placeholder-[#B8B9D0]/50 focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#F7F7FA] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#B8B9D0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#30384B] bg-[#0B101A] text-[#F7F7FA] placeholder-[#B8B9D0]/50 focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
              />
            </div>
          </div>

          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#F7F7FA]">
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
                    className="text-xs text-[#B89AFF] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#B8B9D0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[#30384B] bg-[#0B101A] text-[#F7F7FA] placeholder-[#B8B9D0]/50 focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#7C4DFF] hover:bg-[#6940DE] active:bg-[#5833C5] text-white text-sm font-semibold rounded-xl shadow-md shadow-[#7C4DFF]/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
        <div className="p-4 border-t border-[#30384B] bg-[#1B2231] text-center text-xs text-[#B8B9D0]">
          {mode === "signin" && (
            <span>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-[#B89AFF] hover:underline"
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
                className="font-semibold text-[#B89AFF] hover:underline"
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
              className="font-semibold text-[#B89AFF] hover:underline"
            >
              Back to Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
