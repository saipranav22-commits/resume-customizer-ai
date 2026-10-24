"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  AlertCircle,
  LogIn,
  LogOut,
  History,
  ChevronDown
} from "lucide-react";
import { checkBackendHealth } from "@/lib/api";
import { HealthResponse } from "@/types/resume";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

interface HeaderProps {
  onOpenHistory?: () => void;
}

export default function Header({ onOpenHistory }: HeaderProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const { user, signOut, isLoading: authLoading } = useAuth();

  useEffect(() => {
    let mounted = true;
    async function fetchHealth() {
      try {
        const data = await checkBackendHealth();
        if (mounted) {
          setHealth(data);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setHealth(null);
          setLoading(false);
        }
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  ResumeCustomizer<span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  v1.1
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ethical AI-Powered Resume Tailoring & ATS Optimization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Anti-Fabrication Active</span>
            </div>

            <div
              id="backend-status-indicator"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-slate-50 dark:bg-slate-800/80"
            >
              {loading ? (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Activity className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  Connecting API...
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Backend Ready
                  {health.gemini_key_present && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 font-mono">
                      Gemini Live
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Backend Offline
                </span>
              )}
            </div>

            {/* Auth and History Section */}
            {!authLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onOpenHistory}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
                      title="View saved resume history"
                    >
                      <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>History</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-[120px] truncate">
                          {user.full_name || user.email?.split("@")[0]}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      {isUserMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {user.full_name || "Account"}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenHistory?.();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <History className="w-3.5 h-3.5 text-slate-400" />
                              <span>Resume History</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
