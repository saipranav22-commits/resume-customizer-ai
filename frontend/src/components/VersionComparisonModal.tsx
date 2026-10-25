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
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C45D39] font-mono bg-[#E8D9E8] px-2 py-0.5 rounded-full border border-[#DDD0D7]">
          <TrendingUp className="w-3.5 h-3.5" />
          +{delta}{unit}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9A3412] font-mono bg-[#FDF2F0] px-2 py-0.5 rounded-full border border-[#FDBA74]">
          <TrendingDown className="w-3.5 h-3.5" />
          {delta}{unit}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#674E61] font-mono bg-[#F7F2EB] px-2 py-0.5 rounded-full border border-[#DDD0D7]">
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
      className="fixed inset-0 z-50 overflow-y-auto bg-[#291B32]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-5xl bg-white border border-[#DDD0D7] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#DDD0D7] bg-[#F7F2EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E8D9E8] text-[#291B32] rounded-xl">
              <GitCompare className="w-5 h-5 text-[#C45D39]" />
            </div>
            <div>
              <h2
                id="comparison-modal-title"
                className="font-editorial text-base sm:text-lg font-bold text-[#291B32]"
              >
                Resume Version Comparison
              </h2>
              <p className="text-xs text-[#674E61]">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#DDD0D7] bg-white text-[#291B32] hover:bg-[#F7F2EB] transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#C45D39]" />
                <span className="hidden sm:inline">Swap Versions</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close version comparison dialog"
              className="p-1.5 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-[#F7F2EB] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Comparison Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#674E61]">
              <Loader2 className="w-8 h-8 animate-spin text-[#C45D39]" />
              <p className="text-sm">Analyzing and diffing resume versions...</p>
            </div>
          ) : !comparison ? (
            <div className="text-center py-16 text-[#674E61] text-sm">
              No comparison data available.
            </div>
          ) : (
            <>
              {/* Version Comparison Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version A (Baseline) */}
                <div className="p-4 rounded-xl border-2 border-[#DDD0D7] bg-[#F7F2EB]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-stone-200 text-stone-800">
                      Baseline (Version A)
                    </span>
                    <span className="font-mono text-xs font-bold text-[#674E61]">
                      v{comparison.version_a_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#291B32] truncate">
                    {comparison.version_a_name || versionAName || comparison.title_a || "Version A"}
                  </h3>
                  {comparison.title_a && (
                    <p className="text-xs text-[#674E61] truncate mt-0.5">{comparison.title_a}</p>
                  )}
                  {comparison.created_at_a && (
                    <p className="text-[11px] text-[#674E61] mt-2">
                      Created: {new Date(comparison.created_at_a).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Version B (Target / Comparison) */}
                <div className="p-4 rounded-xl border-2 border-[#C45D39]/40 bg-[#E8D9E8]/25">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#C45D39] text-white">
                      Comparing (Version B)
                    </span>
                    <span className="font-mono text-xs font-bold text-[#C45D39]">
                      v{comparison.version_b_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#291B32] truncate">
                    {comparison.version_b_name || versionBName || comparison.title_b || "Version B"}
                  </h3>
                  {comparison.title_b && (
                    <p className="text-xs text-[#674E61] truncate mt-0.5">{comparison.title_b}</p>
                  )}
                  {comparison.created_at_b && (
                    <p className="text-[11px] text-[#674E61] mt-2">
                      Created: {new Date(comparison.created_at_b).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* 1. Score Impact Summary */}
              <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD0D7]">
                  <Award className="w-4 h-4 text-[#C45D39]" />
                  <h4 className="text-sm font-bold text-[#291B32]">
                    Score & Optimization Performance
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ATS Compatibility */}
                  <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#291B32]">
                        ATS Readiness Score
                      </span>
                      {renderDelta(comparison.ats_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-[#674E61]">Baseline (A): </span>
                        <span className="font-bold text-[#291B32] font-mono">
                          {comparison.ats_score_a !== null && comparison.ats_score_a !== undefined
                            ? `${comparison.ats_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#674E61]">Target (B): </span>
                        <span className="font-bold text-[#C45D39] font-mono">
                          {comparison.ats_score_b !== null && comparison.ats_score_b !== undefined
                            ? `${comparison.ats_score_b}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* JD Match Score */}
                  <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#291B32]">
                        Job Match Score
                      </span>
                      {renderDelta(comparison.match_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-[#674E61]">Baseline (A): </span>
                        <span className="font-bold text-[#291B32] font-mono">
                          {comparison.match_score_a !== null && comparison.match_score_a !== undefined
                            ? `${comparison.match_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#674E61]">Target (B): </span>
                        <span className="font-bold text-[#C45D39] font-mono">
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
              <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C45D39]" />
                    <h4 className="text-sm font-bold text-[#291B32]">
                      Professional Summary Diff
                    </h4>
                  </div>
                  {comparison.summary_changed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Summary Modified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F7F2EB] text-[#674E61] border border-[#DDD0D7]">
                      Summary Unchanged
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#674E61]">
                      Baseline Summary (v{comparison.version_a_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-[#291B32]">
                      {comparison.summary_a || "(Empty summary)"}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      comparison.summary_changed
                        ? "bg-[#E8D9E8]/30 border-[#DDD0D7]"
                        : "bg-[#F7F2EB] border-[#DDD0D7]"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C45D39]">
                      Comparison Summary (v{comparison.version_b_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-[#291B32] font-medium">
                      {comparison.summary_b || "(Empty summary)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Skills Diff */}
              <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD0D7]">
                  <Layers className="w-4 h-4 text-[#C45D39]" />
                  <h4 className="text-sm font-bold text-[#291B32]">
                    Skills Comparison
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Added Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#C45D39]" />
                      <span className="text-xs font-bold text-[#291B32]">
                        Added in Version B ({comparison.added_skills.length})
                      </span>
                    </div>
                    {comparison.added_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.added_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]"
                          >
                            <Plus className="w-3 h-3 text-[#C45D39]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#674E61] italic">No new skills added.</p>
                    )}
                  </div>

                  {/* Removed Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#9A3412]" />
                      <span className="text-xs font-bold text-[#291B32]">
                        Removed from Version A ({comparison.removed_skills.length})
                      </span>
                    </div>
                    {comparison.removed_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.removed_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FDF2F0] text-[#9A3412] border border-[#FDBA74] line-through"
                          >
                            <Minus className="w-3 h-3 text-[#9A3412]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#674E61] italic">No skills removed.</p>
                    )}
                  </div>

                  {/* Shared Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#674E61]" />
                      <span className="text-xs font-bold text-[#291B32]">
                        Retained in Both Versions ({comparison.shared_skills.length})
                      </span>
                    </div>
                    {comparison.shared_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.shared_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[#F7F2EB] text-[#291B32] border border-[#DDD0D7]"
                          >
                            <Check className="w-3 h-3 text-[#C45D39]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#674E61] italic">No shared skills.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Experience Bullet Differences */}
              <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#DDD0D7]">
                  <Briefcase className="w-4 h-4 text-[#C45D39]" />
                  <h4 className="text-sm font-bold text-[#291B32]">
                    Experience Bullets Modification Diff
                  </h4>
                </div>

                <div className="space-y-6">
                  {comparison.experience_diffs.length === 0 ? (
                    <p className="text-xs text-[#674E61] italic">No experience roles found.</p>
                  ) : (
                    comparison.experience_diffs.map((exp, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-4 rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] space-y-3"
                      >
                        <div className="flex items-baseline justify-between text-xs font-bold text-[#291B32] pb-2 border-b border-[#DDD0D7]">
                          <span>
                            {exp.role || "Role"} —{" "}
                            <span className="text-[#674E61] font-normal">{exp.company || "Company"}</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#674E61]">
                            +{exp.added_bullets.length} / -{exp.removed_bullets.length}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Added bullets */}
                          {exp.added_bullets.map((b, bIdx) => (
                            <div
                              key={`add-${bIdx}`}
                              className="p-2.5 rounded-lg bg-[#E8D9E8]/50 border border-[#DDD0D7] text-[#291B32] flex items-start gap-2"
                            >
                              <span className="font-bold text-[#C45D39] mt-0.5 shrink-0">+</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Removed bullets */}
                          {exp.removed_bullets.map((b, bIdx) => (
                            <div
                              key={`rem-${bIdx}`}
                              className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#FDBA74] text-[#9A3412] flex items-start gap-2 line-through opacity-80"
                            >
                              <span className="font-bold text-[#9A3412] mt-0.5 shrink-0">-</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Unchanged bullets */}
                          {exp.unchanged_bullets.map((b, bIdx) => (
                            <div
                              key={`unc-${bIdx}`}
                              className="p-2 rounded-lg bg-white text-[#674E61] border border-[#DDD0D7]/60 flex items-start gap-2 text-[11px]"
                            >
                              <span className="text-[#674E61] mt-0.5 shrink-0">•</span>
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
        <div className="p-4 border-t border-[#DDD0D7] bg-[#F7F2EB] flex items-center justify-between">
          <p className="text-xs text-[#674E61]">
            Lineage & diff derived deterministically from saved snapshots.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
