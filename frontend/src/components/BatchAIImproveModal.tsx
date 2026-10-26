"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare,
  Square,
} from "lucide-react";
import { TailoredResumeResponse, SectionImprovementItem } from "@/types/resume";
import { batchImproveResume, ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";

export interface BatchAIImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: "all" | "summary" | "experience" | "projects";
  jobDescription: string;
  resumeData: TailoredResumeResponse;
  onAcceptSelected: (acceptedItems: SectionImprovementItem[]) => void;
}

export const BatchAIImproveModal: React.FC<BatchAIImproveModalProps> = ({
  isOpen,
  onClose,
  scope,
  jobDescription,
  resumeData,
  onAcceptSelected,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [improvements, setImprovements] = useState<SectionImprovementItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Scope label for UI
  const scopeLabel = useMemo(() => {
    switch (scope) {
      case "summary":
        return "Professional Summary";
      case "experience":
        return "Work Experience";
      case "projects":
        return "Key Projects";
      case "all":
      default:
        return "Entire Resume (Multi-Section)";
    }
  }, [scope]);

  // Execute batch improvement
  const fetchImprovements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await batchImproveResume({
        scope,
        job_description: jobDescription,
        resume_data: resumeData,
      });

      setImprovements(res.improvements || []);
      // By default, pre-select all proposed improvements for convenience
      setSelectedIds(new Set((res.improvements || []).map((item) => item.id)));
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to generate multi-section AI improvements.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchImprovements();
    } else {
      setImprovements([]);
      setSelectedIds(new Set());
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scope]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(improvements.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    const accepted = improvements.filter((item) => selectedIds.has(item.id));
    onAcceptSelected(accepted);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-ai-improve-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#291B32]/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[#FFFFFF] border border-[#DDD0D7] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-[#291B32]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#F7F2EB] border-b border-[#DDD0D7] flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8D9E8] border border-[#DDD0D7] text-xs font-bold text-[#291B32]">
                <Sparkles className="w-3.5 h-3.5 text-[#C45D39]" />
                {scopeLabel}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#674E61]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Evidence-Grounded AI
              </span>
            </div>
            <h2
              id="batch-ai-improve-title"
              className="text-lg sm:text-xl font-black text-[#291B32] tracking-tight"
            >
              Multi-Section AI Optimization
            </h2>
            <p className="text-xs text-[#674E61]">
              Review proposed wording before applying. No draft modifications occur without your explicit approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#674E61] hover:text-[#291B32] p-1.5 rounded-lg hover:bg-[#E8D9E8]/50 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Toolbar Subheader */}
        {!isLoading && !error && improvements.length > 0 && (
          <div className="px-6 py-3 bg-[#FAF8F5] border-b border-[#DDD0D7] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-[#291B32]">
              <SlidersHorizontal className="w-4 h-4 text-[#C45D39]" />
              <span>
                <strong>{selectedIds.size}</strong> of {improvements.length} improvements selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#291B32] hover:bg-[#E8D9E8] transition-colors"
              >
                Select All
              </button>
              <span className="text-[#DDD0D7]">•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#674E61] hover:text-[#291B32] hover:bg-[#E8D9E8] transition-colors"
              >
                Deselect All
              </button>
              <span className="text-[#DDD0D7]">•</span>
              <button
                type="button"
                onClick={fetchImprovements}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#C45D39] hover:bg-[#FBEFEA] transition-colors"
                title="Regenerate suggestions based on current resume data"
              >
                <RefreshCw className="w-3 h-3" />
                Improve Again
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FFFFFF]">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FBEFEA] flex items-center justify-center border border-[#C45D39]/30">
                <Loader2 className="w-6 h-6 text-[#C45D39] animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#291B32]">
                  Analyzing resume content against target role...
                </p>
                <p className="text-xs text-[#674E61]">
                  Generating action-oriented phrasing, technical metric alignment, and ATS optimization.
                </p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Optimization Request Failed</h4>
                  <p className="text-xs mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchImprovements}
                className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {!isLoading && !error && improvements.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-[#291B32]">
                Your content already demonstrates strong alignment!
              </h4>
              <p className="text-xs text-[#674E61] max-w-md mx-auto">
                No immediate weaknesses were detected for this section. You can try adjusting the target job description or customizing individual bullets directly.
              </p>
            </div>
          )}

          {!isLoading && !error && improvements.length > 0 && (
            <div className="space-y-4">
              {improvements.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#FFFFFF] border-[#C45D39] ring-1 ring-[#C45D39]/30 shadow-sm"
                        : "bg-[#FAF8F5] border-[#DDD0D7] opacity-80"
                    }`}
                  >
                    {/* Item Card Header */}
                    <div
                      className="px-4 py-2.5 bg-[#F7F2EB] border-b border-[#DDD0D7] flex items-center justify-between cursor-pointer rounded-t-xl"
                      onClick={() => toggleSelect(item.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className="text-[#C45D39] hover:opacity-80 transition-opacity"
                          aria-label={isSelected ? "Deselect item" : "Select item"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#C45D39]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#674E61]" />
                          )}
                        </button>
                        <span className="text-xs font-bold text-[#291B32]">
                          {item.location}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isSelected
                            ? "bg-[#C45D39] text-white"
                            : "bg-[#DDD0D7] text-[#674E61]"
                        }`}
                      >
                        {isSelected ? "Accept" : "Skip"}
                      </span>
                    </div>

                    {/* Diff Body */}
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Original */}
                        <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#DDD0D7] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#674E61]">
                            Original Wording
                          </span>
                          <p className="text-[#674E61] leading-relaxed line-through decoration-[#674E61]/40">
                            {item.original_text}
                          </p>
                        </div>

                        {/* Proposed */}
                        <div className="p-3 rounded-lg bg-[#FBEFEA] border border-[#C45D39]/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C45D39] flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#C45D39]" />
                              Proposed AI Enhancement
                            </span>
                          </div>
                          <p className="text-[#291B32] font-medium leading-relaxed">
                            {item.improved_text}
                          </p>
                        </div>
                      </div>

                      {/* Rationale & Keywords */}
                      <div className="pt-2 border-t border-[#DDD0D7]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-start gap-1.5 text-[#674E61]">
                          <ChevronRight className="w-3.5 h-3.5 text-[#C45D39] shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-snug">
                            <strong>Why:</strong> {item.rationale}
                          </span>
                        </div>

                        {item.impact_keywords && item.impact_keywords.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 shrink-0">
                            {item.impact_keywords.map((kw, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-1.5 py-0.5 rounded bg-[#E8D9E8] text-[#291B32] text-[10px] font-medium"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-[#F7F2EB] border-t border-[#DDD0D7] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#674E61]">
            Applied changes update your working draft. You can undo anytime.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none border-[#DDD0D7] text-[#291B32] hover:bg-[#E8D9E8]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isLoading || selectedIds.size === 0}
              onClick={handleApply}
              className="flex-1 sm:flex-none bg-[#C45D39] hover:bg-[#A34828] text-white flex items-center gap-1.5 font-bold shadow-md disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                Accept Selected ({selectedIds.size} changes)
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchAIImproveModal;
