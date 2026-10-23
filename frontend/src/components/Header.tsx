"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Activity, ShieldCheck, AlertCircle } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";
import { HealthResponse } from "@/types/resume";

export default function Header() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
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
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ethical AI-Powered Resume Tailoring & ATS Optimization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Anti-Fabrication Guardrails Active</span>
          </div>

          <div
            id="backend-status-indicator"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-slate-50 dark:bg-slate-800/80"
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
                Backend Offline (Local Fallback)
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
