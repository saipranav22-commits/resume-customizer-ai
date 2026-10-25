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
        <span className="inline-flex items-center gap-1 text-xs text-[#B8B9D0] font-mono">
          <Minus className="w-3.5 h-3.5" /> N/A
        </span>
      );
    }
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
          <TrendingUp className="w-3.5 h-3.5" /> +{delta}
          {unit}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
          <TrendingDown className="w-3.5 h-3.5" /> {delta}
          {unit}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B8B9D0] font-mono bg-[#1B2231] px-2 py-0.5 rounded-full border border-[#30384B]">
        <Minus className="w-3.5 h-3.5" /> 0{unit}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0B101A]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-5xl bg-[#111827] border border-[#30384B] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#30384B] bg-[#1B2231] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2C224B] text-[#B89AFF] rounded-xl border border-[#7C4DFF]/30">
              <GitCompare className="w-5 h-5 text-[#7C4DFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="comparison-modal-title"
                  className="font-heading text-base sm:text-lg font-bold text-[#F7F7FA]"
                >
                  Resume Version Comparison
                </h2>
              </div>
              <p className="text-xs text-[#B8B9D0]">
                Comparing changes, score deltas, and bullet improvements between two saved snapshots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwap && (
              <button
                type="button"
                onClick={onSwap}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#30384B] bg-[#0B101A] text-[#F7F7FA] hover:bg-[#1B2231] transition-colors"
                title="Swap baseline and target comparison order"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#7C4DFF]" />
                <span className="hidden sm:inline">Swap Versions</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#B8B9D0] hover:text-[#F7F7FA] hover:bg-[#0B101A] transition-colors"
              aria-label="Close comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#B8B9D0]">
              <Loader2 className="w-8 h-8 animate-spin text-[#7C4DFF]" />
              <p className="text-xs font-medium">Analyzing and diffing resume versions...</p>
            </div>
          ) : error || !comparison ? (
            <div className="text-center py-16 text-[#B8B9D0] text-sm">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="font-semibold text-[#F7F7FA]">Comparison Error</p>
              <p className="text-xs text-[#B8B9D0] mt-1">{error || "Data unavailable"}</p>
            </div>
          ) : (
            <>
              {/* Version Comparison Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Version A (Baseline) */}
                <div className="p-4 rounded-xl border border-[#30384B] bg-[#0B101A]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#1B2231] text-[#B8B9D0] border border-[#30384B]">
                      Baseline (Version A)
                    </span>
                    <span className="font-mono text-xs font-bold text-[#B8B9D0]">
                      v{comparison.version_a_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F7F7FA] truncate">
                    {comparison.version_a_name || versionAName || comparison.title_a || "Version A"}
                  </h3>
                  {comparison.title_a && (
                    <p className="text-xs text-[#B8B9D0] truncate mt-0.5">{comparison.title_a}</p>
                  )}
                  {comparison.created_at_a && (
                    <p className="text-[11px] text-[#B8B9D0] mt-2">
                      Created: {new Date(comparison.created_at_a).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Version B (Target / Comparison) */}
                <div className="p-4 rounded-xl border border-[#7C4DFF]/40 bg-[#2C224B]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#7C4DFF] text-white">
                      Comparing (Version B)
                    </span>
                    <span className="font-mono text-xs font-bold text-[#B89AFF]">
                      v{comparison.version_b_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F7F7FA] truncate">
                    {comparison.version_b_name || versionBName || comparison.title_b || "Version B"}
                  </h3>
                  {comparison.title_b && (
                    <p className="text-xs text-[#B8B9D0] truncate mt-0.5">{comparison.title_b}</p>
                  )}
                  {comparison.created_at_b && (
                    <p className="text-[11px] text-[#B8B9D0] mt-2">
                      Created: {new Date(comparison.created_at_b).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* 1. Score Impact Summary */}
              <div className="p-5 rounded-2xl bg-[#1B2231] border border-[#30384B] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
                  <Award className="w-4 h-4 text-[#7C4DFF]" />
                  <h4 className="text-sm font-bold text-[#F7F7FA]">
                    Score & Optimization Performance
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ATS Compatibility */}
                  <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#F7F7FA]">
                        ATS Readiness Score
                      </span>
                      {renderDelta(comparison.ats_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-[#B8B9D0]">Baseline (A): </span>
                        <span className="font-bold text-[#F7F7FA] font-mono">
                          {comparison.ats_score_a !== null && comparison.ats_score_a !== undefined
                            ? `${comparison.ats_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#B8B9D0]">Target (B): </span>
                        <span className="font-bold text-[#B89AFF] font-mono">
                          {comparison.ats_score_b !== null && comparison.ats_score_b !== undefined
                            ? `${comparison.ats_score_b}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* JD Match Score */}
                  <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#F7F7FA]">
                        Job Match Score
                      </span>
                      {renderDelta(comparison.match_score_delta)}
                    </div>
                    <div className="flex items-baseline justify-between mt-3 text-xs">
                      <div>
                        <span className="text-[#B8B9D0]">Baseline (A): </span>
                        <span className="font-bold text-[#F7F7FA] font-mono">
                          {comparison.match_score_a !== null && comparison.match_score_a !== undefined
                            ? `${comparison.match_score_a}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#B8B9D0]">Target (B): </span>
                        <span className="font-bold text-[#B89AFF] font-mono">
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
              <div className="p-5 rounded-2xl bg-[#1B2231] border border-[#30384B] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#7C4DFF]" />
                    <h4 className="text-sm font-bold text-[#F7F7FA]">
                      Professional Summary Diff
                    </h4>
                  </div>
                  {comparison.summary_changed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Summary Modified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0B101A] text-[#B8B9D0] border border-[#30384B]">
                      Summary Unchanged
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8B9D0]">
                      Baseline Summary (v{comparison.version_a_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-[#F7F7FA]">
                      {comparison.summary_a || "(Empty summary)"}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      comparison.summary_changed
                        ? "bg-[#2C224B]/30 border-[#7C4DFF]/40"
                        : "bg-[#0B101A] border-[#30384B]"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B89AFF]">
                      Comparison Summary (v{comparison.version_b_number})
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-[#F7F7FA] font-medium">
                      {comparison.summary_b || "(Empty summary)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Skills Diff */}
              <div className="p-5 rounded-2xl bg-[#1B2231] border border-[#30384B] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
                  <Layers className="w-4 h-4 text-[#7C4DFF]" />
                  <h4 className="text-sm font-bold text-[#F7F7FA]">
                    Skills Comparison
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Added Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#7C4DFF]" />
                      <span className="text-xs font-bold text-[#F7F7FA]">
                        Added in Version B ({comparison.added_skills.length})
                      </span>
                    </div>
                    {comparison.added_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.added_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2C224B] text-[#F7F7FA] border border-[#7C4DFF]/40"
                          >
                            <Plus className="w-3 h-3 text-[#7C4DFF]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#B8B9D0] italic">No new skills added.</p>
                    )}
                  </div>

                  {/* Removed Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-xs font-bold text-[#F7F7FA]">
                        Removed from Version A ({comparison.removed_skills.length})
                      </span>
                    </div>
                    {comparison.removed_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.removed_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 line-through"
                          >
                            <Minus className="w-3 h-3 text-rose-400" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#B8B9D0] italic">No skills removed.</p>
                    )}
                  </div>

                  {/* Shared Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#B8B9D0]" />
                      <span className="text-xs font-bold text-[#F7F7FA]">
                        Retained in Both Versions ({comparison.shared_skills.length})
                      </span>
                    </div>
                    {comparison.shared_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.shared_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-[#0B101A] text-[#F7F7FA] border border-[#30384B]"
                          >
                            <Check className="w-3 h-3 text-[#7C4DFF]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#B8B9D0] italic">No shared skills.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Experience Bullet Differences */}
              <div className="p-5 rounded-2xl bg-[#1B2231] border border-[#30384B] shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
                  <Briefcase className="w-4 h-4 text-[#7C4DFF]" />
                  <h4 className="text-sm font-bold text-[#F7F7FA]">
                    Experience Bullets Modification Diff
                  </h4>
                </div>

                <div className="space-y-6">
                  {comparison.experience_diffs.length === 0 ? (
                    <p className="text-xs text-[#B8B9D0] italic">No experience roles found.</p>
                  ) : (
                    comparison.experience_diffs.map((exp, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-4 rounded-xl border border-[#30384B] bg-[#0B101A] space-y-3"
                      >
                        <div className="flex items-baseline justify-between text-xs font-bold text-[#F7F7FA] pb-2 border-b border-[#30384B]">
                          <span>
                            {exp.role || "Role"} —{" "}
                            <span className="text-[#B8B9D0] font-normal">{exp.company || "Company"}</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#B8B9D0]">
                            +{exp.added_bullets.length} / -{exp.removed_bullets.length}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Added bullets */}
                          {exp.added_bullets.map((b, bIdx) => (
                            <div
                              key={`add-${bIdx}`}
                              className="p-2.5 rounded-lg bg-[#2C224B]/40 border border-[#7C4DFF]/30 text-[#F7F7FA] flex items-start gap-2"
                            >
                              <span className="font-bold text-[#7C4DFF] mt-0.5 shrink-0">+</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Removed bullets */}
                          {exp.removed_bullets.map((b, bIdx) => (
                            <div
                              key={`rem-${bIdx}`}
                              className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2 line-through opacity-80"
                            >
                              <span className="font-bold text-rose-400 mt-0.5 shrink-0">-</span>
                              <span className="leading-relaxed">{b}</span>
                            </div>
                          ))}

                          {/* Unchanged bullets */}
                          {exp.unchanged_bullets.map((b, bIdx) => (
                            <div
                              key={`unc-${bIdx}`}
                              className="p-2 rounded-lg bg-[#111827] text-[#B8B9D0] border border-[#30384B]/60 flex items-start gap-2 text-[11px]"
                            >
                              <span className="text-[#B8B9D0] mt-0.5 shrink-0">•</span>
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
        <div className="p-4 border-t border-[#30384B] bg-[#1B2231] flex items-center justify-between shrink-0">
          <p className="text-xs text-[#B8B9D0]">
            Lineage & diff derived deterministically from saved snapshots.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0B101A] hover:bg-[#111827] text-[#F7F7FA] border border-[#30384B] transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
