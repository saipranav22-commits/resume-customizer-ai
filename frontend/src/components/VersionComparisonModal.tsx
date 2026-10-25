"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Plus,
  FileText,
  Briefcase,
  Layers,
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  Award,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { compareVersions } from "@/lib/api";
import { VersionComparisonResponse } from "@/types/resume";

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionAId: string;
  versionBId: string;
  versionAName?: string;
  versionBName?: string;
  onSwap?: () => void;
}

export default function VersionComparisonModal(props: VersionComparisonModalProps) {
  if (!props.isOpen) return null;
  return (
    <VersionComparisonModalContent
      {...props}
      key={`${props.versionAId}-${props.versionBId}`}
    />
  );
}

function VersionComparisonModalContent({
  onClose,
  versionAId,
  versionBId,
  versionAName,
  versionBName,
  onSwap,
}: Omit<VersionComparisonModalProps, "isOpen">) {
  const { token } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<VersionComparisonResponse | null>(null);

  useEffect(() => {
    if (!token || !versionAId || !versionBId) return;
    let isMounted = true;
    compareVersions(token, {
      version_a_id: versionAId,
      version_b_id: versionBId,
    })
      .then((data) => {
        if (isMounted) {
          setComparison(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load version comparison";
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, versionAId, versionBId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const renderDelta = (delta: number | null | undefined, unit: string = "%") => {
    if (delta === null || delta === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Minus className="w-3.5 h-3.5" /> N/A
        </span>
      );
    }
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <TrendingUp className="w-3.5 h-3.5" />
          +{delta}{unit}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
          <TrendingDown className="w-3.5 h-3.5" />
          {delta}{unit}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600  font-mono bg-slate-100  px-2 py-0.5 rounded-full border border-[#E2E8E4] ">
        <Minus className="w-3.5 h-3.5" />
        0{unit}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#15283B]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-5xl bg-white  border border-[#E2E8E4]  rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2E8E4]  bg-[#F8F7F3] /60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#DCEDE5]  text-[#087F66]  rounded-xl">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="comparison-modal-title"
                className="text-base sm:text-lg font-bold text-[#15283B] "
              >
                Resume Version Comparison
              </h2>
              <p className="text-xs text-slate-500 ">
                Comparing Baseline Version (A) against Comparison Version (B)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwap && (
              <button
                type="button"
                onClick={onSwap}
                title="Swap baseline and comparison versions"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E8E4]  bg-white  text-slate-700  hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#087F66]" />
                <span className="hidden sm:inline">Swap Versions</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close version comparison dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Comparison Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#087F66]" />
              <p className="text-sm">Analyzing and diffing resume versions...</p>
            </div>
          ) : !comparison ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No comparison data available.
            </div>
          ) : (
            <>
              {/* Version Comparison Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version A (Baseline) */}
                <div className="p-4 rounded-xl border-2 border-[#E2E8E4]  bg-[#F8F7F3]/50 ">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-200 text-slate-800  ">
                      Baseline (Version A)
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      v{comparison.version_a_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#15283B]  truncate">
                    {comparison.version_a_name || versionAName || comparison.title_a || "Version A"}
                  </h3>
                  {comparison.title_a && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{comparison.title_a}</p>
                  )}
                  {comparison.created_at_a && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Created: {new Date(comparison.created_at_a).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Version B (Target / Comparison) */}
                <div className="p-4 rounded-xl border-2 border-[#087F66]/40  bg-blue-50/30 ">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#087F66] text-white">
                      Comparing (Version B)
                    </span>
                    <span className="font-mono text-xs font-bold text-[#087F66] ">
                      v{comparison.version_b_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#15283B]  truncate">
                    {comparison.version_b_name || versionBName || comparison.title_b || "Version B"}
                  </h3>
                  {comparison.title_b && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{comparison.title_b}</p>
                  )}
                  {comparison.created_at_b && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Created: {new Date(comparison.created_at_b).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* 1. Score Impact Summary */}
              <div className="p-5 rounded-2xl bg-white  border border-[#E2E8E4]  shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4] ">
                  <Award className="w-4 h-4 text-[#087F66] " />
                  <h4 className="text-sm font-bold text-[#15283B] ">
                    Score & Optimization Performance
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ATS Compatibility */}
                  <div className="p-4 rounded-xl bg-[#F8F7F3] /50 border border-[#E2E8E4] /60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 ">
                        ATS Readiness Score
                      </span>
                      {renderDelta(comparison.ats_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-slate-400">Baseline (A): </span>
                        <span className="font-bold text-slate-800  font-mono">
                          {comparison.ats_score_a !== null && comparison.ats_score_a !== undefined
                            ? `${comparison.ats_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Target (B): </span>
                        <span className="font-bold text-[#087F66]  font-mono">
                          {comparison.ats_score_b !== null && comparison.ats_score_b !== undefined
                            ? `${comparison.ats_score_b}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* JD Match Score */}
                  <div className="p-4 rounded-xl bg-[#F8F7F3] /50 border border-[#E2E8E4] /60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 ">
                        Job Match Score
                      </span>
                      {renderDelta(comparison.match_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-slate-400">Baseline (A): </span>
                        <span className="font-bold text-slate-800  font-mono">
                          {comparison.match_score_a !== null && comparison.match_score_a !== undefined
                            ? `${comparison.match_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Target (B): </span>
                        <span className="font-bold text-[#087F66]  font-mono">
                          {comparison.match_score_b !== null && comparison.match_score_b !== undefined
                            ? `${comparison.match_score_b}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Professional Summary Diff */}
              <div className="p-5 rounded-2xl bg-white  border border-[#E2E8E4]  shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4] ">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#087F66] " />
                    <h4 className="text-sm font-bold text-[#15283B] ">
                      Professional Summary Diff
                    </h4>
                  </div>
                  {comparison.summary_changed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Summary Modified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100  text-slate-600  border border-[#E2E8E4] ">
                      Summary Unchanged
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#F8F7F3] /40 border border-[#E2E8E4] /60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Baseline Summary (v{comparison.version_a_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 ">
                      {comparison.summary_a || "(Empty summary)"}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      comparison.summary_changed
                        ? "bg-blue-50/40  border-[#DCEDE5] "
                        : "bg-[#F8F7F3] /40 border-[#E2E8E4] /60"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F66] ">
                      Comparison Summary (v{comparison.version_b_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-800 dark:text-slate-100 font-medium">
                      {comparison.summary_b || "(Empty summary)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Skills Diff */}
              <div className="p-5 rounded-2xl bg-white  border border-[#E2E8E4]  shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4] ">
                  <Layers className="w-4 h-4 text-[#087F66] " />
                  <h4 className="text-sm font-bold text-[#15283B] ">
                    Skills Comparison
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Added Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-700 ">
                        Added in Version B ({comparison.added_skills.length})
                      </span>
                    </div>
                    {comparison.added_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.added_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          >
                            <Plus className="w-3 h-3 text-emerald-600" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No new skills added.</p>
                    )}
                  </div>

                  {/* Removed Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-700 ">
                        Removed from Version A ({comparison.removed_skills.length})
                      </span>
                    </div>
                    {comparison.removed_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.removed_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900 line-through"
                          >
                            <Minus className="w-3 h-3 text-rose-500" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No skills removed.</p>
                    )}
                  </div>

                  {/* Shared Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-xs font-bold text-slate-700 ">
                        Retained in Both Versions ({comparison.shared_skills.length})
                      </span>
                    </div>
                    {comparison.shared_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.shared_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-700   border border-[#E2E8E4] "
                          >
                            <Check className="w-3 h-3 text-slate-400" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No shared skills.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Experience Bullet Differences */}
              <div className="p-5 rounded-2xl bg-white  border border-[#E2E8E4]  shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4] ">
                  <Briefcase className="w-4 h-4 text-[#087F66] " />
                  <h4 className="text-sm font-bold text-[#15283B] ">
                    Experience Bullets Modification Diff
                  </h4>
                </div>

                <div className="space-y-6">
                  {comparison.experience_diffs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No experience roles found.</p>
                  ) : (
                    comparison.experience_diffs.map((exp, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-4 rounded-xl border border-[#E2E8E4]  bg-[#F8F7F3]/60 /40 space-y-3"
                      >
                        <div className="flex items-baseline justify-between text-xs font-bold text-[#15283B]  pb-2 border-b border-[#E2E8E4] ">
                          <span>
                            {exp.role || "Role"} —{" "}
                            <span className="text-slate-500 font-normal">{exp.company || "Company"}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            +{exp.added_bullets.length} / -{exp.removed_bullets.length}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Added bullets */}
                          {exp.added_bullets.map((b, bIdx) => (
                            <div
                              key={`add-${bIdx}`}
                              className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
                            >
                              <span className="font-bold text-emerald-600 mt-0.5 shrink-0">+</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Removed bullets */}
                          {exp.removed_bullets.map((b, bIdx) => (
                            <div
                              key={`rem-${bIdx}`}
                              className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-2 line-through opacity-80"
                            >
                              <span className="font-bold text-rose-600 mt-0.5 shrink-0">-</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Unchanged bullets */}
                          {exp.unchanged_bullets.map((b, bIdx) => (
                            <div
                              key={`unc-${bIdx}`}
                              className="p-2 rounded-lg bg-white /60 text-slate-600  flex items-start gap-2 text-[11px]"
                            >
                              <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E2E8E4]  bg-[#F8F7F3] /60 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Lineage & diff derived deterministically from saved snapshots.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300  dark:hover:bg-slate-700 text-slate-700  transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
