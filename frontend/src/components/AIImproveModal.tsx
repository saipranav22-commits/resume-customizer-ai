"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Check, X, Edit3, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { improveResumeText, ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";

export interface AIImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  sectionType: "summary" | "experience" | "project";
  jobDescription: string;
  contextInfo?: string;
  onAccept: (improvedText: string) => void;
}

export const AIImproveModal: React.FC<AIImproveModalProps> = ({
  isOpen,
  onClose,
  originalText,
  sectionType,
  jobDescription,
  contextInfo,
  onAccept,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [improvedText, setImprovedText] = useState<string>("");
  const [rationale, setRationale] = useState<string>("");
  const [impactKeywords, setImpactKeywords] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [userEditedText, setUserEditedText] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !originalText.trim()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setIsEditing(false);

    async function fetchImprovement() {
      try {
        const res = await improveResumeText({
          text: originalText,
          section_type: sectionType,
          job_description: jobDescription,
          context: contextInfo,
        });

        if (isMounted) {
          setImprovedText(res.improved_text);
          setUserEditedText(res.improved_text);
          setRationale(res.rationale);
          setImpactKeywords(res.impact_keywords || []);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof ApiError ? err.message : "Failed to generate AI improvement.";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    fetchImprovement();

    return () => {
      isMounted = false;
    };
  }, [isOpen, originalText, sectionType, jobDescription, contextInfo]);

  if (!isOpen) return null;

  const handleAccept = () => {
    const finalSelection = isEditing ? userEditedText : improvedText;
    onAccept(finalSelection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#291B32]/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white border border-[#DDD0D7] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#291B32]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DDD0D7]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E8D9E8] border border-[#DDD0D7] text-[#291B32]">
              <Sparkles className="w-5 h-5 text-[#C45D39]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#291B32]">
                AI Text Improvement
              </h3>
              <p className="text-xs text-[#674E61]">
                Optimizing for {sectionType === "summary" ? "Professional Summary" : `${sectionType} bullet alignment`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-[#F7F2EB] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-Fabrication Guarantee Chip */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#674E61]">
          <ShieldCheck className="w-4 h-4 text-[#C45D39] flex-shrink-0" />
          <span>
            <strong className="text-[#291B32]">Strict Truthfulness:</strong> Preserves verified facts while elevating action verbs, conciseness, and ATS alignment.
          </span>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#C45D39]" />
            <p className="text-sm font-medium text-[#674E61]">
              Analyzing phrasing and aligning with target role competencies...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Could not generate improvement</span>
            </div>
            <p className="text-xs text-rose-800">{error}</p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Original Wording Card */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#674E61]">
                Original Text
              </span>
              <p className="text-[#674E61] leading-relaxed line-through opacity-75">
                {originalText}
              </p>
            </div>

            {/* Proposed Wording Card */}
            <div className="p-4 rounded-xl bg-[#FDF6F3] border border-[#C45D39]/40 space-y-2 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C45D39] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C45D39]" />
                  Proposed Improvement
                </span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-xs text-[#C45D39] hover:underline font-semibold"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit before accepting</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  rows={3}
                  value={userEditedText}
                  onChange={(e) => setUserEditedText(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white border border-[#C45D39] text-[#291B32] focus:outline-none focus:ring-2 focus:ring-[#C45D39]/20 resize-none text-xs sm:text-sm"
                />
              ) : (
                <p className="text-[#291B32] font-medium leading-relaxed">
                  {improvedText}
                </p>
              )}
            </div>

            {/* Rationale & Keywords */}
            {rationale && (
              <div className="p-3.5 rounded-xl bg-[#E8D9E8]/40 border border-[#DDD0D7] space-y-1.5 text-xs">
                <span className="font-semibold text-[#291B32]">Why this wording is more effective:</span>
                <p className="text-[#674E61] leading-relaxed">{rationale}</p>
                {impactKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[#674E61] font-medium mr-1">Target Keywords:</span>
                    {impactKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-[#E8D9E8] border border-[#DDD0D7] text-[#291B32] font-semibold text-[11px]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#DDD0D7]">
              <Button variant="ghost" size="md" onClick={onClose} className="w-full sm:w-auto">
                Keep Original
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleAccept}
                icon={<Check className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Accept & Apply to Draft
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIImproveModal;
