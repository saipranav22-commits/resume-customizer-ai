"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Target,
  Check,
} from "lucide-react";
import PrecisionResumeMark from "@/components/ui/PrecisionResumeMark";

export default function HeroStudioShowcase() {
  const [activeTab, setActiveTab] = useState<"ai-improve" | "audit-metrics">("ai-improve");
  const [applied, setApplied] = useState<boolean>(true);

  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Ambient background glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-[#C45D39]/15 via-[#E8D9E8]/25 to-[#291B32]/10 rounded-3xl blur-xl opacity-75 -z-10" />

      {/* Main Studio Console Card */}
      <div className="rounded-2xl bg-white border border-[#DDD0D7] shadow-xl overflow-hidden text-[#291B32] transition-all hover:shadow-2xl">
        {/* Top Studio Control Bar */}
        <div className="px-4 py-3 bg-[#291B32] text-white flex items-center justify-between border-b border-[#4A355A]">
          <div className="flex items-center gap-2.5">
            <PrecisionResumeMark size={24} />
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-xs sm:text-sm text-[#FAF6F2]">
                Interactive Studio Canvas
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#352340] text-[#E8D9E8] border border-[#4A355A]">
                Synthetic Demo
              </span>
            </div>
          </div>

          {/* Dual Illustrative Metric Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#352340] border border-[#C45D39]/40 text-[11px] font-bold text-[#FAF6F2]">
              <Target className="w-3 h-3 text-[#C45D39]" />
              <span>94%</span>
              <span className="text-[9px] text-[#DDD0D7] font-normal hidden sm:inline">Match</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#352340] border border-[#DDD0D7]/30 text-[11px] font-bold text-[#E8D9E8]">
              <ShieldCheck className="w-3 h-3 text-[#E8D9E8]" />
              <span>96%</span>
              <span className="text-[9px] text-[#DDD0D7] font-normal hidden sm:inline">ATS A</span>
            </div>
          </div>
        </div>

        {/* Studio Sub-Header Tabs */}
        <div className="px-4 py-2 bg-[#F7F2EB] border-b border-[#DDD0D7] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("ai-improve")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "ai-improve"
                  ? "bg-[#291B32] text-white shadow-xs"
                  : "text-[#674E61] hover:text-[#291B32]"
              }`}
            >
              Grounded AI Bullet Refinement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit-metrics")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                activeTab === "audit-metrics"
                  ? "bg-[#291B32] text-white shadow-xs"
                  : "text-[#674E61] hover:text-[#291B32]"
              }`}
            >
              ATS Scoring Breakdown
            </button>
          </div>
          <span className="text-[10px] text-[#674E61] font-mono italic hidden md:inline">
            Illustrative sample
          </span>
        </div>

        {/* Tab 1: AI Bullet Refinement Showcase */}
        {activeTab === "ai-improve" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Synthetic Document Header */}
            <div className="pb-3 border-b border-[#DDD0D7]/70 flex items-start justify-between">
              <div>
                <h4 className="font-heading font-black text-base text-[#291B32] tracking-tight">
                  ALEX MORGAN
                </h4>
                <p className="text-[11px] font-medium text-[#674E61]">
                  Staff Full-Stack & Cloud Systems Architect &bull; San Francisco, CA
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]">
                ATS Standard Layout
              </span>
            </div>

            {/* Targeted Experience Snippet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#291B32]">
                  Lead Software Architect &bull; Distributed Realtime Cloud
                </span>
                <span className="text-[11px] font-mono text-[#674E61]">2022 &ndash; Present</span>
              </div>

              {/* Bullet undergoing AI Refinement with Copper Precision Accent */}
              <div className="relative pl-3 border-l-2 border-[#C45D39] bg-[#FBEFEA]/40 rounded-r-lg p-2 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[#291B32] leading-relaxed">
                    {applied ? (
                      <span>
                        <strong className="text-[#C45D39] font-semibold">Architected</strong> real-time WebSocket dashboard in Next.js, reducing payload latency by 42% across 15,000 concurrent enterprise sessions.
                      </span>
                    ) : (
                      <span className="text-[#674E61]">
                        Built frontend features and updated API endpoints for user telemetry dashboard.
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setApplied(!applied)}
                    className="shrink-0 px-2 py-1 rounded-md text-[10px] font-bold bg-[#291B32] text-white hover:bg-[#3B2848] transition-colors"
                  >
                    {applied ? "Show Original" : "Apply AI"}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Proposal Comparison Overlay Card */}
            <div className="rounded-xl bg-[#FAF6F2] border border-[#C45D39]/30 p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#291B32]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C45D39]" />
                  <span>Grounded AI Improvement</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Factually Grounded
                </span>
              </div>

              {/* Diff Snippet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200/60 text-rose-900">
                  <span className="font-bold text-[9px] uppercase tracking-wider block text-rose-700 mb-0.5">
                    Original Draft (Passive)
                  </span>
                  <p className="text-[11px] leading-tight">
                    &ldquo;Built frontend features and updated API endpoints.&rdquo;
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-[#FBEFEA] border border-[#C45D39]/40 text-[#291B32]">
                  <span className="font-bold text-[9px] uppercase tracking-wider block text-[#C45D39] mb-0.5">
                    AI Grounded Alignment
                  </span>
                  <p className="text-[11px] leading-tight font-medium">
                    &ldquo;Architected real-time WebSocket dashboard in Next.js, cutting latency 42%.&rdquo;
                  </p>
                </div>
              </div>

              {/* Extracted JD Competency Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#DDD0D7]/60">
                <span className="text-[10px] font-semibold text-[#674E61]">Matched JD Competencies:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8D9E8] text-[#291B32]">
                  +Next.js
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8D9E8] text-[#291B32]">
                  +WebSockets
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8D9E8] text-[#291B32]">
                  +Latency
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: ATS Scoring Breakdown Showcase */}
        {activeTab === "audit-metrics" && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                <span className="text-2xl font-black font-heading text-[#C45D39] block">94%</span>
                <span className="text-xs font-bold text-[#291B32] block">Job Description Match</span>
                <span className="text-[10px] text-[#674E61] block mt-0.5">Semantic 6-Factor Model</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                <span className="text-2xl font-black font-heading text-[#291B32] block">96%</span>
                <span className="text-xs font-bold text-[#291B32] block">ATS Document Quality</span>
                <span className="text-[10px] text-[#674E61] block mt-0.5">Grade A Certified</span>
              </div>
            </div>

            {/* Factor Bars */}
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Required Skills Coverage</span>
                  <span className="font-mono text-[#C45D39]">95% (35% weight)</span>
                </div>
                <div className="h-1.5 bg-[#DDD0D7] rounded-full overflow-hidden">
                  <div className="h-full bg-[#C45D39] rounded-full w-[95%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Role & Experience Alignment</span>
                  <span className="font-mono text-[#291B32]">92% (20% weight)</span>
                </div>
                <div className="h-1.5 bg-[#DDD0D7] rounded-full overflow-hidden">
                  <div className="h-full bg-[#291B32] rounded-full w-[92%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>ATS Parseability & Header Standard</span>
                  <span className="font-mono text-[#291B32]">98% (25% weight)</span>
                </div>
                <div className="h-1.5 bg-[#DDD0D7] rounded-full overflow-hidden">
                  <div className="h-full bg-[#291B32] rounded-full w-[98%]" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#674E61] text-center pt-1 border-t border-[#DDD0D7]/60 italic">
              Actual application scoring uses calibrated backend evaluation algorithms.
            </p>
          </div>
        )}

        {/* Footer Bar */}
        <div className="px-4 py-2.5 bg-[#FAF6F2] border-t border-[#DDD0D7] flex items-center justify-between text-[11px] text-[#674E61]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[#291B32]">Calibrated Dual-Engine Architecture</span>
          </div>
          <span className="font-mono text-[10px] text-[#674E61]">Zero False Claims</span>
        </div>
      </div>
    </div>
  );
}
