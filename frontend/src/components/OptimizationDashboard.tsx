"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Search
} from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import CircularScoreRing from "@/components/ui/CircularScoreRing";

export interface OptimizationDashboardProps {
  resumeData: TailoredResumeResponse;
}

export const OptimizationDashboard: React.FC<OptimizationDashboardProps> = ({ resumeData }) => {
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [expandedRecs, setExpandedRecs] = useState<Record<number, boolean>>({});

  const matchBreakdown = resumeData.match_breakdown;
  const recommendations = resumeData.recommendations || [];
  const overallScore = matchBreakdown?.overall_score ?? resumeData.match_score ?? 80;

  const toggleRec = (idx: number) => {
    setExpandedRecs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredRecs = recommendations.filter((r) => {
    if (priorityFilter === "all") return true;
    return r.priority === priorityFilter;
  });

  return (
    <div className="space-y-8">
      {/* SECTION 1: CIRCULAR SCORING OVERVIEW (Inspired by reference, refined) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-[#30384B] shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#7C4DFF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {/* Main Hero Circular Score Ring */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <CircularScoreRing
              score={overallScore}
              size={140}
              strokeWidth={12}
              color="#7C4DFF"
              trackColor="#1B2231"
              label=""
            />
            <div className="space-y-1.5 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2C224B] border border-[#7C4DFF]/40 text-xs font-semibold text-[#B89AFF]">
                <Sparkles className="w-3.5 h-3.5 text-[#7C4DFF]" />
                <span>Overall ATS Match Score</span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-[#F7F7FA]">
                {overallScore >= 85
                  ? "Outstanding ATS Alignment"
                  : overallScore >= 70
                  ? "Strong Role Alignment"
                  : "Requires Targeted Optimization"}
              </h3>
              <p className="text-xs text-[#B8B9D0] leading-relaxed">
                Evaluated against explicit job requirements across 6 verified dimensions. Re-check score as you edit your draft.
              </p>
            </div>
          </div>

          {/* Sub-Metrics Circular Rings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
            <div className="p-3.5 rounded-xl bg-[#1B2231]/70 border border-[#30384B] flex flex-col items-center">
              <CircularScoreRing
                score={matchBreakdown?.required_skill_score ?? 85}
                size={76}
                strokeWidth={7}
                color="#7C4DFF"
                sublabel="/ 100"
              />
              <span className="text-[11px] font-bold text-[#F7F7FA] mt-2 text-center">
                Required Skills
              </span>
              <span className="text-[10px] text-[#B8B9D0]">35% weight</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1B2231]/70 border border-[#30384B] flex flex-col items-center">
              <CircularScoreRing
                score={matchBreakdown?.experience_score ?? 80}
                size={76}
                strokeWidth={7}
                color="#B89AFF"
                sublabel="/ 100"
              />
              <span className="text-[11px] font-bold text-[#F7F7FA] mt-2 text-center">
                Role Alignment
              </span>
              <span className="text-[10px] text-[#B8B9D0]">20% weight</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1B2231]/70 border border-[#30384B] flex flex-col items-center">
              <CircularScoreRing
                score={matchBreakdown?.keyword_score ?? 78}
                size={76}
                strokeWidth={7}
                color="#FDBB83"
                sublabel="/ 100"
              />
              <span className="text-[11px] font-bold text-[#F7F7FA] mt-2 text-center">
                Keywords
              </span>
              <span className="text-[10px] text-[#B8B9D0]">10% weight</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1B2231]/70 border border-[#30384B] flex flex-col items-center">
              <CircularScoreRing
                score={matchBreakdown?.structure_score ?? 95}
                size={76}
                strokeWidth={7}
                color="#7C4DFF"
                sublabel="/ 100"
              />
              <span className="text-[11px] font-bold text-[#F7F7FA] mt-2 text-center">
                Formatting
              </span>
              <span className="text-[10px] text-[#B8B9D0]">5% weight</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 6-FACTOR EXPLAINABLE MATCH BREAKDOWN */}
      {matchBreakdown && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#7C4DFF]" />
              <h4 className="font-heading font-bold text-base text-[#F7F7FA]">
                Explainable Six-Factor Evaluation
              </h4>
            </div>
            <span className="text-xs text-[#B8B9D0] hidden sm:inline">
              Documented Weight Distribution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Factor 1: Required Skills */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">Required Skills Coverage</span>
                <span className="font-mono font-bold text-[#7C4DFF]">
                  {matchBreakdown.required_skill_score}% (35% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#7C4DFF] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.required_skill_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Strict mandatory technical proficiencies extracted directly from the requirements section.
              </p>
            </div>

            {/* Factor 2: Preferred Skills */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">Preferred / Bonus Skills</span>
                <span className="font-mono font-bold text-[#B89AFF]">
                  {matchBreakdown.preferred_skill_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#B89AFF] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.preferred_skill_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Nice-to-have or bonus qualifications providing competitive differentiation.
              </p>
            </div>

            {/* Factor 3: Experience Alignment */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">Role & Seniority Alignment</span>
                <span className="font-mono font-bold text-[#7C4DFF]">
                  {matchBreakdown.experience_score}% (20% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#7C4DFF] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.experience_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Alignment with required job title, demonstrated seniority, and scope of leadership.
              </p>
            </div>

            {/* Factor 4: Responsibility Alignment */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">Responsibilities & Action Verbs</span>
                <span className="font-mono font-bold text-[#B89AFF]">
                  {matchBreakdown.responsibility_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#B89AFF] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.responsibility_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Verifiable overlap with core day-to-day duties and active functional ownership verbs.
              </p>
            </div>

            {/* Factor 5: Keyword Coverage */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">Domain Keyword Density</span>
                <span className="font-mono font-bold text-[#FDBB83]">
                  {matchBreakdown.keyword_score}% (10% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#FDBB83] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.keyword_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Presence and contextual relevance of specialized technical industry terminology.
              </p>
            </div>

            {/* Factor 6: Structure Score */}
            <div className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#F7F7FA]">ATS Parseability & Layout</span>
                <span className="font-mono font-bold text-[#7C4DFF]">
                  {matchBreakdown.structure_score}% (5% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B101A] overflow-hidden">
                <div
                  className="h-full bg-[#7C4DFF] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.structure_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B8B9D0]">
                Standard section headings, unambiguous contact data, and clean hierarchical parsing.
              </p>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0] leading-relaxed">
            <span className="font-semibold text-[#F7F7FA] block mb-1">
              Methodology Explanation:
            </span>
            {matchBreakdown.explanation}
          </div>
        </div>
      )}

      {/* SECTION 3: SKILLS ALIGNMENT AUDIT */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
          <Search className="w-5 h-5 text-[#7C4DFF]" />
          <h4 className="font-heading font-bold text-base text-[#F7F7FA]">
            Structured Technical Skills Audit
          </h4>
        </div>

        <div className="space-y-4">
          {/* Matched in Primary Skills */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#B89AFF] block mb-2">
              ✓ Verified in Resume ({resumeData.skills.matching_skills.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {resumeData.skills.matching_skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-[#2C224B] border border-[#7C4DFF]/40 text-xs font-medium text-[#F7F7FA]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Evidenced in Experience / Complementary */}
          {resumeData.skills.additional_skills.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B8B9D0] block mb-2">
                • Complementary & Foundational Skills ({resumeData.skills.additional_skills.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.additional_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-[#1B2231] border border-[#30384B] text-xs font-medium text-[#B8B9D0]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords Advisory */}
          {resumeData.missing_keywords && resumeData.missing_keywords.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FDBB83] block mb-2">
                ⚠ Missing Job Description Requirements ({resumeData.missing_keywords.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resumeData.missing_keywords.map((mk, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-[#1B2231]/60 border border-[#FDBB83]/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-[#FDBB83] font-semibold">{mk.keyword}</strong>
                      <span className="text-[10px] text-[#B8B9D0] uppercase font-bold">{mk.category}</span>
                    </div>
                    <p className="text-[#B8B9D0]">{mk.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: PRIORITIZED RECOMMENDATIONS */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#30384B]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#7C4DFF]" />
            <h4 className="font-heading font-bold text-base text-[#F7F7FA]">
              Prioritized Optimization Recommendations ({recommendations.length})
            </h4>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs">
            {(["all", "high", "medium", "low"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPriorityFilter(filter)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  priorityFilter === filter
                    ? "bg-[#7C4DFF] text-white"
                    : "text-[#B8B9D0] hover:text-[#F7F7FA]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredRecs.length === 0 ? (
          <p className="text-xs text-[#B8B9D0] py-4 text-center italic">
            No recommendations in this priority filter.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRecs.map((rec, idx) => {
              const isExpanded = expandedRecs[idx] ?? false;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[#1B2231]/70 border border-[#30384B] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleRec(idx)}
                    className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-[#232C3E] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.priority === "high"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : rec.priority === "medium"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-[#2C224B] text-[#B89AFF] border border-[#7C4DFF]/30"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs font-semibold text-[#F7F7FA] line-clamp-1">
                        {rec.issue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rec.requires_user_confirmation && (
                        <span className="hidden sm:inline-flex text-[10px] font-semibold text-[#FDBB83] px-2 py-0.5 rounded bg-[#FDBB83]/10 border border-[#FDBB83]/20">
                          Confirm Credentials
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#B8B9D0]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#B8B9D0]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-[#30384B] bg-[#0B101A]/60 space-y-2 text-xs">
                      <div>
                        <strong className="text-[#F7F7FA]">Requirement Context:</strong>
                        <p className="text-[#B8B9D0] mt-0.5">{rec.requirement}</p>
                      </div>
                      <div>
                        <strong className="text-[#F7F7FA]">Verifiable Evidence:</strong>
                        <p className="text-[#B8B9D0] mt-0.5">{rec.evidence}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#2C224B]/40 border border-[#7C4DFF]/30">
                        <strong className="text-[#B89AFF]">Recommended Action:</strong>
                        <p className="text-[#F7F7FA] mt-0.5">{rec.proposed_improvement}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Honest Non-Guarantee Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0]">
        <Info className="w-4 h-4 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#F7F7FA]">Transparent Scoring Notice:</strong> Match scores represent semantic and structural alignment calculated directly from the provided job description. They do not simulate or guarantee proprietary ATS vendor screening algorithms or employer hiring outcomes.
        </p>
      </div>
    </div>
  );
};

export default OptimizationDashboard;
