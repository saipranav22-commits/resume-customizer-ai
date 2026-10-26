"use client";

import React, { useEffect, useState } from "react";
import PrecisionResumeMark from "@/components/ui/PrecisionResumeMark";
import {
  Activity,
  ShieldCheck,
  AlertCircle,
  LogIn,
  LogOut,
  History,
  ChevronDown,
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
      <header className="border-b border-[#4A355A] bg-[#291B32] sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="shrink-0 flex items-center justify-center shadow-xs">
              <PrecisionResumeMark size={36} showGlow={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-base sm:text-lg text-[#FAF6F2] tracking-tight">
                  ResumeCustomizer
                </span>
                <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-[#E8D9E8] bg-[#352340] px-1.5 py-0.5 rounded border border-[#4A355A]">
                  Studio
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono text-[#DDD0D7] bg-[#1F1426] border border-[#4A355A]">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-[#DDD0D7] hidden sm:block">
                Precision AI Resume Studio & ATS Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#352340] text-xs font-semibold text-[#E8D9E8] border border-[#4A355A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C45D39]" />
              <span>Anti-Fabrication Guard</span>
            </div>

            <div
              id="backend-status-indicator"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#4A355A] bg-[#1F1426] text-[#FAF6F2]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5 text-[#DDD0D7]">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#C45D39]" />
                  Connecting API...
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-[#FAF6F2] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C45D39] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C45D39]"></span>
                  </span>
                  Studio Engine Live
                  {health.gemini_key_present && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#352340] text-[#E8D9E8] font-mono font-semibold border border-[#4A355A]">
                      Gemini
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-300">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#352340] hover:bg-[#4A355A] text-[#FAF6F2] border border-[#4A355A] shadow-xs transition-colors"
                      title="View saved resume history"
                    >
                      <History className="w-3.5 h-3.5 text-[#C45D39]" />
                      <span>History</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#352340] text-[#FAF6F2] border border-[#4A355A] hover:bg-[#4A355A] shadow-xs transition-all"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#C45D39] text-white flex items-center justify-center font-bold text-[10px]">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                          {user.full_name || user.email?.split("@")[0]}
                        </span>
                        <ChevronDown className="w-3 h-3 text-[#DDD0D7]" />
                      </button>

                      {isUserMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-[#291B32] rounded-xl shadow-2xl border border-[#4A355A] py-1 z-20">
                            <div className="px-3 py-2 border-b border-[#4A355A]">
                              <p className="text-xs font-semibold text-[#FAF6F2] truncate">
                                {user.full_name || "Account"}
                              </p>
                              <p className="text-[11px] text-[#DDD0D7] truncate">
                                {user.email}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenHistory?.();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#FAF6F2] hover:bg-[#352340] flex items-center gap-2 font-medium"
                            >
                              <History className="w-3.5 h-3.5 text-[#C45D39]" />
                              <span>Resume History</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 border-t border-[#4A355A] font-medium"
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
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#C45D39] hover:bg-[#B34E2C] active:bg-[#9E4324] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#C45D39]/25 transition-all"
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
