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
      <header className="border-b border-[#DDD0D7] bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-[0_1px_3px_0_rgba(41,27,50,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#291B32] flex items-center justify-center text-[#F7F2EB] shadow-xs border border-[#DDD0D7]">
              <Sparkles className="w-4 h-4 text-[#C45D39]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-[#291B32] tracking-tight">
                  ResumeCustomizer
                </span>
                <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-[#C45D39] bg-[#E8D9E8]/60 px-1.5 py-0.5 rounded border border-[#DDD0D7]">
                  Studio
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-mono text-[#674E61] bg-[#F7F2EB] border border-[#DDD0D7]">
                  v1.2
                </span>
              </div>
              <p className="text-xs text-[#674E61] hidden sm:block">
                Editorial AI Career Atelier & ATS Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8D9E8]/50 text-xs font-semibold text-[#291B32] border border-[#DDD0D7]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C45D39]" />
              <span>Anti-Fabrication Guard</span>
            </div>

            <div
              id="backend-status-indicator"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#DDD0D7] bg-white text-[#291B32]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5 text-[#674E61]">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#674E61]" />
                  Connecting API...
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-[#291B32] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C45D39] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C45D39]"></span>
                  </span>
                  Studio Engine Live
                  {health.gemini_key_present && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E8D9E8] text-[#291B32] font-mono font-semibold">
                      Gemini
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[#A82A2A]">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F7F2EB] text-[#291B32] border border-[#DDD0D7] shadow-xs transition-colors"
                      title="View saved resume history"
                    >
                      <History className="w-3.5 h-3.5 text-[#C45D39]" />
                      <span>History</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white text-[#291B32] border border-[#DDD0D7] hover:bg-[#F7F2EB] shadow-xs transition-all"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#291B32] text-[#F7F2EB] flex items-center justify-center font-bold text-[10px]">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                          {user.full_name || user.email?.split("@")[0]}
                        </span>
                        <ChevronDown className="w-3 h-3 text-[#674E61]" />
                      </button>

                      {isUserMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#DDD0D7] py-1 z-20">
                            <div className="px-3 py-2 border-b border-[#DDD0D7]">
                              <p className="text-xs font-semibold text-[#291B32] truncate">
                                {user.full_name || "Account"}
                              </p>
                              <p className="text-[11px] text-[#674E61] truncate">
                                {user.email}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenHistory?.();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#291B32] hover:bg-[#F7F2EB] flex items-center gap-2 font-medium"
                            >
                              <History className="w-3.5 h-3.5 text-[#C45D39]" />
                              <span>Resume History</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#A82A2A] hover:bg-[#FDF2F2] flex items-center gap-2 border-t border-[#DDD0D7] font-medium"
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#C45D39] hover:bg-[#AF4F2E] active:bg-[#9A4224] text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
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
