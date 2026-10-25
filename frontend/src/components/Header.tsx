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
      <header className="border-b border-[#E2E8E4] bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-[0_1px_3px_0_rgba(21,40,59,0.03)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#087F66] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#15283B] tracking-tight">
                  ResumeCustomizer<span className="text-[#087F66]">AI</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCEDE5] text-[#087F66] border border-[#087F66]/20">
                  v1.2
                </span>
              </div>
              <p className="text-xs text-[#64748B] hidden sm:block">
                Ethical AI-Powered Resume Optimization & ATS Alignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCEDE5]/50 text-xs font-semibold text-[#087F66] border border-[#087F66]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#087F66]" />
              <span>Anti-Fabrication Guard</span>
            </div>

            <div
              id="backend-status-indicator"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E2E8E4] bg-white text-[#15283B]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5 text-[#64748B]">
                  <Activity className="w-3.5 h-3.5 animate-spin text-[#64748B]" />
                  Connecting API...
                </span>
              ) : health ? (
                <span className="flex items-center gap-1.5 text-[#087F66] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#087F66] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#087F66]"></span>
                  </span>
                  Backend Live
                  {health.gemini_key_present && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#DCEDE5] text-[#087F66] font-mono font-semibold">
                      Gemini
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#F8F7F3] text-[#15283B] border border-[#E2E8E4] shadow-sm transition-colors"
                      title="View saved resume history"
                    >
                      <History className="w-3.5 h-3.5 text-[#087F66]" />
                      <span>History</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-[#15283B] border border-[#E2E8E4] hover:bg-[#F8F7F3] shadow-sm transition-all"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#087F66] text-white flex items-center justify-center font-bold text-[10px]">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </div>
                        <span className="hidden lg:inline max-w-[120px] truncate font-medium">
                          {user.full_name || user.email?.split("@")[0]}
                        </span>
                        <ChevronDown className="w-3 h-3 text-[#64748B]" />
                      </button>

                      {isUserMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsUserMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E2E8E4] py-1 z-20">
                            <div className="px-3 py-2 border-b border-[#E2E8E4]">
                              <p className="text-xs font-semibold text-[#15283B] truncate">
                                {user.full_name || "Account"}
                              </p>
                              <p className="text-[11px] text-[#64748B] truncate">
                                {user.email}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenHistory?.();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#15283B] hover:bg-[#F8F7F3] flex items-center gap-2 font-medium"
                            >
                              <History className="w-3.5 h-3.5 text-[#087F66]" />
                              <span>Resume History</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                signOut();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-[#E2E8E4] font-medium"
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#087F66] hover:bg-[#066B56] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
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
