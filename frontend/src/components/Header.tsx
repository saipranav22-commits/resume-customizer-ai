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
      <header className="border-b border-[#30384B] bg-[#0B101A]/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#1B2231] flex items-center justify-center text-[#F7F7FA] shadow-xs border border-[#30384B]">
              <Sparkles className="w-4 h-4 text-[#7C4DFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-base sm:text-lg text-[#F7F7FA] tracking-tight">
                  ResumeCustomizer
                </span>
                <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-[#B89AFF] bg-[#2C224B] px-1.5 py-0.5 rounded border border-[#7C4DFF]/40">
                  Studio
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-mono text-[#B8B9D0] bg-[#111827] border border-[#30384B]">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-[#B8B9D0] hidden sm:block">
                Precision AI Resume Studio & ATS Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B2231] text-xs font-semibold text-[#B8B9D0] border border-[#30384B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FDBB83]" />
              <span>Anti-Fabrication Guard</span>
            </div>

            <div
              id="backend-status-indicator"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#30384B] bg-[#111827] text-[#F7F7FA]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5 text-[#B8B9D0]">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#7C4DFF]" />
                  Connecting API...
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-[#F7F7FA] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C4DFF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C4DFF]"></span>
                  </span>
                  Studio Engine Live
                  {health.gemini_key_present && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2C224B] text-[#B89AFF] font-mono font-semibold border border-[#7C4DFF]/30">
                      Gemini
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Studio Engine Offline
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1B2231] hover:bg-[#232C3E] text-[#F7F7FA] border border-[#30384B] shadow-xs transition-colors"
                      title="View saved resume history"
                    >
                      <History className="w-3.5 h-3.5 text-[#7C4DFF]" />
                      <span>History</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#1B2231] text-[#F7F7FA] border border-[#30384B] hover:bg-[#232C3E] shadow-xs transition-all"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#7C4DFF] text-white flex items-center justify-center font-bold text-[10px]">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                          {user.full_name || user.email?.split("@")[0]}
                        </span>
                        <ChevronDown className="w-3 h-3 text-[#B8B9D0]" />
                      </button>

                      {isUserMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-[#111827] rounded-xl shadow-2xl border border-[#30384B] py-1 z-20">
                            <div className="px-3 py-2 border-b border-[#30384B]">
                              <p className="text-xs font-semibold text-[#F7F7FA] truncate">
                                {user.full_name || "Account"}
                              </p>
                              <p className="text-[11px] text-[#B8B9D0] truncate">
                                {user.email}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenHistory?.();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#F7F7FA] hover:bg-[#1B2231] flex items-center gap-2 font-medium"
                            >
                              <History className="w-3.5 h-3.5 text-[#7C4DFF]" />
                              <span>Resume History</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-[#30384B] font-medium"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#7C4DFF] hover:bg-[#6940DE] active:bg-[#5833C5] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#7C4DFF]/25 transition-all"
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
