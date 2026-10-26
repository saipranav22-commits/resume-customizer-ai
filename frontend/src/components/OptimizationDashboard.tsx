"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  ShieldCheck,
  FileCheck
} from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import CircularScoreRing from "@/components/ui/CircularScoreRing";

export interface OptimizationDashboardProps {
  resumeData: TailoredResumeResponse;
}

export const OptimizationDashboard: React.FC<OptimizationDashboardProps> = ({ resumeData }) => {
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [expandedRecs, setExpandedRecs] = useState<Record<number, boolean>>({});
  const [auditFilter, setAuditFilter] = useState<"all" | "error" | "warning" | "suggestion">("all");

  const matchBreakdown = resumeData.match_breakdown;
  const atsAssessment = resumeData.ats_quality_assessment;
  const audit = resumeData.audit;
  const recommendations = resumeData.recommendations || [];
  const overallScore = matchBreakdown?.overall_score ?? resumeData.match_score ?? 80;

  const toggleRec = (idx: number) => {
    setExpandedRecs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredRecs = recommendations.filter((r) => {
    if (priorityFilter === "all") return true;
    return r.priority === priorityFilter;
  });

  const allAuditIssues = audit
    ? [
        ...audit.errors.map((e) => ({ ...e, type: "error" as const })),
        ...audit.warnings.map((w) => ({ ...w, type: "warning" as const })),
        ...audit.suggestions.map((s) => ({ ...s, type: "suggestion" as const })),
      ]
    : [];

  const filteredAuditIssues = allAuditIssues.filter((issue) => {
    if (auditFilter === "all") return true;
    return issue.type === auditFilter;
  });

  return (
    <div className="space-y-8">
      {/* SECTION 1: HERO DUAL-SCORE OVERVIEW (Deep Aubergine Dark Surfaces with High-Contrast Score Rings) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-white">
        {/* SCORE A: Target Job Match Score */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#291B32] border border-[#3D294B] shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C45D39]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D294B] border border-[#C45D39]/40 text-xs font-semibold text-[#E8D9E8]">
              <Sparkles className="w-3.5 h-3.5 text-[#C45D39]" />
              <span>Score A (JD Match): Target Job Match</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#DDD0D7] bg-[#1F1426] px-2 py-0.5 rounded border border-[#3D294B]">
              6-Factor Model
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <CircularScoreRing
              score={overallScore}
              size={130}
              strokeWidth={11}
              color="#C45D39"
              trackColor="#4A355A"
              theme="dark"
              textColor="text-white"
              subtextColor="text-[#E8D9E8]"
              sublabel="JD Match"
            />
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                {overallScore >= 85
                  ? "Outstanding Match"
                  : overallScore >= 70
                  ? "Strong Role Alignment"
                  : "Targeted Optimization Needed"}
              </h3>
              <p className="text-xs text-[#DDD0D7] leading-relaxed">
                Semantic alignment against target job requirements. Evaluates mandatory competencies, seniority, and domain terms.
              </p>
            </div>
          </div>

          {/* Sub-Metrics for Score A */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#3D294B] relative z-10">
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {matchBreakdown?.required_skill_score ?? 85}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Required (35%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {matchBreakdown?.experience_score ?? 80}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Role Align (20%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {matchBreakdown?.keyword_score ?? 78}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Keywords (10%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {matchBreakdown?.structure_score ?? 95}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Format (5%)</span>
            </div>
          </div>
        </div>

        {/* SCORE B: ATS & Resume Quality Score */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#291B32] border border-[#3D294B] shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8D9E8]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D294B] border border-[#E8D9E8]/40 text-xs font-semibold text-[#E8D9E8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E8D9E8]" />
              <span>Score B (ATS Quality): Document Standards</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#E8D9E8] bg-[#3D294B] px-2.5 py-0.5 rounded-full border border-[#4A355A]">
              {audit?.grade || "Grade A"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <CircularScoreRing
              score={atsAssessment?.overall_score ?? audit?.overall_score ?? 90}
              size={130}
              strokeWidth={11}
              color="#E8D9E8"
              trackColor="#4A355A"
              theme="dark"
              textColor="text-white"
              subtextColor="text-[#E8D9E8]"
              sublabel="ATS Quality"
            />
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                {audit?.grade === "Grade A"
                  ? "Enterprise ATS Ready"
                  : audit?.grade === "Grade B"
                  ? "Good Compatibility"
                  : "Structure Needs Review"}
              </h3>
              <p className="text-xs text-[#DDD0D7] leading-relaxed">
                Deterministic audit assessing parseability, section headers, bullet length, typography, and recruiter readability.
              </p>
            </div>
          </div>

          {/* Sub-Metrics for Score B */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#3D294B] relative z-10">
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {atsAssessment?.parseability_score ?? 95}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Parseability (25%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {atsAssessment?.structure_score ?? 92}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Structure (20%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {atsAssessment?.readability_score ?? 88}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Readability (15%)</span>
            </div>
            <div className="p-2 rounded-lg bg-[#1F1426]/60 border border-[#3D294B] text-center">
              <span className="text-xs font-mono font-bold text-white block">
                {atsAssessment?.formatting_consistency_score ?? 90}%
              </span>
              <span className="text-[10px] text-[#DDD0D7] block truncate">Format (15%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 6-FACTOR EXPLAINABLE MATCH BREAKDOWN */}
      {matchBreakdown && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C45D39]" />
              <h4 className="font-heading font-bold text-base text-[#291B32]">
                Explainable Six-Factor Evaluation
              </h4>
            </div>
            <span className="text-xs text-[#674E61] hidden sm:inline">
              Documented Weight Distribution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Factor 1: Required Skills */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Required Skills Coverage</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {matchBreakdown.required_skill_score}% (35% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.required_skill_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Strict mandatory technical proficiencies extracted directly from the requirements section.
              </p>
            </div>

            {/* Factor 2: Preferred Skills */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Preferred / Bonus Skills</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {matchBreakdown.preferred_skill_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.preferred_skill_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Nice-to-have or bonus qualifications providing competitive differentiation.
              </p>
            </div>

            {/* Factor 3: Experience Alignment */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Role & Seniority Alignment</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {matchBreakdown.experience_score}% (20% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.experience_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Alignment with required job title, demonstrated seniority, and scope of leadership.
              </p>
            </div>

            {/* Factor 4: Responsibility Alignment */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Responsibilities & Action Verbs</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {matchBreakdown.responsibility_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.responsibility_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Verifiable overlap with core day-to-day duties and active functional ownership verbs.
              </p>
            </div>

            {/* Factor 5: Keyword Coverage */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Domain Keyword Density</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {matchBreakdown.keyword_score}% (10% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.keyword_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Presence and contextual relevance of specialized technical industry terminology.
              </p>
            </div>

            {/* Factor 6: Structure Score */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">ATS Parseability & Layout</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {matchBreakdown.structure_score}% (5% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${matchBreakdown.structure_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Standard section headings, unambiguous contact data, and clean hierarchical parsing.
              </p>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#674E61] leading-relaxed">
            <span className="font-semibold text-[#291B32] block mb-1">
              Methodology Explanation:
            </span>
            {matchBreakdown.explanation}
          </div>
        </div>
      )}

      {/* SECTION 2B: ATS & RESUME QUALITY ASSESSMENT (TRACK B) */}
      {atsAssessment && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C45D39]" />
              <div>
                <h4 className="font-heading font-bold text-base text-[#291B32]">
                  ATS & Resume Quality Assessment (Track B)
                </h4>
                <p className="text-xs text-[#674E61]">
                  Deterministic document health evaluated independently of job description keywords
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-[#E8D9E8] border border-[#DDD0D7] text-xs font-bold text-[#291B32]">
                Quality Score: {atsAssessment.overall_score}%
              </span>
              {audit?.grade && (
                <span className="px-2.5 py-1 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs font-mono font-bold text-[#291B32]">
                  Grade {audit.grade}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* ATS Factor 1: Single-Column Parseability */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Single-Column Parseability</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {atsAssessment.parseability_score}% (25% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.parseability_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Single-stream text layout free from tables, floating text boxes, or multi-column barriers.
              </p>
            </div>

            {/* ATS Factor 2: Section Structure */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Section Structure</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {atsAssessment.structure_score}% (20% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.structure_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Recognized reverse-chronological section headers adapted to candidate experience level.
              </p>
            </div>

            {/* ATS Factor 3: Readability & Voice */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Readability & Voice</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {atsAssessment.readability_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.readability_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Action verb lead-ins, no first-person pronouns, and concise professional accomplishment bullets.
              </p>
            </div>

            {/* ATS Factor 4: Formatting Consistency */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Formatting Consistency</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {atsAssessment.formatting_consistency_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.formatting_consistency_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Standard date formats, bullet point consistency, and clean character typography.
              </p>
            </div>

            {/* ATS Factor 5: Relevant Content Coverage */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Content Coverage</span>
                <span className="font-mono font-bold text-[#C45D39]">
                  {atsAssessment.content_coverage_score}% (15% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#C45D39] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.content_coverage_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Verified experience, featured projects, core skills, and educational qualifications.
              </p>
            </div>

            {/* ATS Factor 6: Basic Document Completeness */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#291B32]">Document Completeness</span>
                <span className="font-mono font-bold text-[#291B32]">
                  {atsAssessment.completeness_score}% (10% wt)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#DDD0D7] overflow-hidden">
                <div
                  className="h-full bg-[#291B32] rounded-full transition-all duration-700"
                  style={{ width: `${atsAssessment.completeness_score}%` }}
                />
              </div>
              <p className="text-[11px] text-[#674E61]">
                Candidate name, verified contact email, phone, location, and absence of empty sections.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#674E61] leading-relaxed">
            <span className="font-semibold text-[#291B32] block mb-1">
              Methodology & Non-Vendor Notice:
            </span>
            {atsAssessment.explanation} {atsAssessment.disclaimer}
          </div>
        </div>
      )}

      {/* SECTION 2C: DETERMINISTIC RESUME QUALITY AUDIT REPORT */}
      {audit && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#C45D39]" />
              <div>
                <h4 className="font-heading font-bold text-base text-[#291B32]">
                  Deterministic Resume Quality Audit
                </h4>
                <p className="text-xs text-[#674E61]">
                  Automated validation layer checking format, readability, dates, and ATS parseability
                </p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs">
              <button
                type="button"
                onClick={() => setAuditFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  auditFilter === "all" ? "bg-[#291B32] text-white" : "text-[#674E61] hover:text-[#291B32]"
                }`}
              >
                All ({allAuditIssues.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("error")}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  auditFilter === "error" ? "bg-rose-700 text-white" : "text-[#674E61] hover:text-rose-700"
                }`}
              >
                Errors ({audit.errors.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("warning")}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  auditFilter === "warning" ? "bg-amber-700 text-white" : "text-[#674E61] hover:text-amber-700"
                }`}
              >
                Warnings ({audit.warnings.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("suggestion")}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  auditFilter === "suggestion" ? "bg-[#C45D39] text-white" : "text-[#674E61] hover:text-[#C45D39]"
                }`}
              >
                Suggestions ({audit.suggestions.length})
              </button>
            </div>
          </div>

          {/* Document Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-center">
              <span className="text-[10px] uppercase font-bold text-[#674E61] block">Total Words</span>
              <span className="text-base font-bold text-[#291B32] font-mono mt-0.5 block">
                {audit.metrics.word_count ?? "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-center">
              <span className="text-[10px] uppercase font-bold text-[#674E61] block">Bullet Points</span>
              <span className="text-base font-bold text-[#291B32] font-mono mt-0.5 block">
                {audit.metrics.bullet_count ?? "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-center">
              <span className="text-[10px] uppercase font-bold text-[#674E61] block">Avg Bullet Length</span>
              <span className="text-base font-bold text-[#291B32] font-mono mt-0.5 block">
                {audit.metrics.avg_bullet_words ? `${audit.metrics.avg_bullet_words} words` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-center">
              <span className="text-[10px] uppercase font-bold text-[#674E61] block">Duplicate Skills</span>
              <span className="text-base font-bold text-[#291B32] font-mono mt-0.5 block">
                {audit.metrics.duplicate_skills_count ?? 0}
              </span>
            </div>
          </div>

          {/* Issues List */}
          {filteredAuditIssues.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-center text-xs text-[#674E61] space-y-1">
              <CheckCircle2 className="w-6 h-6 text-[#C45D39] mx-auto mb-1.5" />
              <p className="font-semibold text-[#291B32]">No Issues Found in this Category</p>
              <p>{audit.summary}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAuditIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                    issue.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : issue.type === "warning"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-[#F7F2EB] border-[#DDD0D7] text-[#291B32]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          issue.type === "error"
                            ? "bg-rose-100 text-rose-800"
                            : issue.type === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[#E8D9E8] text-[#291B32]"
                        }`}
                      >
                        {issue.type}
                      </span>
                      <strong className="font-semibold text-[#291B32]">{issue.message}</strong>
                    </div>
                    {issue.category && (
                      <span className="text-[10px] font-mono text-[#674E61] uppercase">
                        {issue.category}
                      </span>
                    )}
                  </div>
                  {issue.location && (
                    <p className="text-[11px] text-[#674E61]">
                      <span className="font-medium text-[#291B32]">Section:</span> {issue.location}
                    </p>
                  )}
                  {issue.recommendation && (
                    <p className="text-[11px] text-[#C45D39] pt-0.5">
                      <span className="font-medium text-[#291B32]">Guidance:</span> {issue.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: SKILLS ALIGNMENT AUDIT */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#DDD0D7]">
          <Search className="w-5 h-5 text-[#C45D39]" />
          <h4 className="font-heading font-bold text-base text-[#291B32]">
            Structured Technical Skills Audit
          </h4>
        </div>

        <div className="space-y-4">
          {/* Matched in Primary Skills */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C45D39] block mb-2">
              ✓ Verified in Resume ({resumeData.skills.matching_skills.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {resumeData.skills.matching_skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-[#E8D9E8] border border-[#DDD0D7] text-xs font-semibold text-[#291B32]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Evidenced in Experience / Complementary */}
          {resumeData.skills.additional_skills.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#674E61] block mb-2">
                • Complementary & Foundational Skills ({resumeData.skills.additional_skills.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.additional_skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs font-medium text-[#674E61]"
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
              <span className="text-xs font-bold uppercase tracking-wider text-[#C45D39] block mb-2">
                ⚠ Missing Job Description Requirements ({resumeData.missing_keywords.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resumeData.missing_keywords.map((mk, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-[#FDF6F3] border border-[#C45D39]/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-[#C45D39] font-semibold">{mk.keyword}</strong>
                      <span className="text-[10px] text-[#674E61] uppercase font-bold">{mk.category}</span>
                    </div>
                    <p className="text-[#674E61]">{mk.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: PRIORITIZED RECOMMENDATIONS */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#DDD0D7]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#C45D39]" />
            <h4 className="font-heading font-bold text-base text-[#291B32]">
              Prioritized Optimization Recommendations ({recommendations.length})
            </h4>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs">
            {(["all", "high", "medium", "low"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPriorityFilter(filter)}
                className={`px-3 py-1 rounded-lg font-semibold uppercase tracking-wider text-[10px] transition-all ${
                  priorityFilter === filter
                    ? "bg-[#C45D39] text-white"
                    : "text-[#674E61] hover:text-[#291B32]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredRecs.length === 0 ? (
          <p className="text-xs text-[#674E61] py-4 text-center italic">
            No recommendations in this priority filter.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredRecs.map((rec, idx) => {
              const isExpanded = expandedRecs[idx] ?? false;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleRec(idx)}
                    className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-[#EFE8DF] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.priority === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : rec.priority === "medium"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]"
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-xs font-semibold text-[#291B32] line-clamp-1">
                        {rec.issue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {rec.requires_user_confirmation && (
                        <span className="hidden sm:inline-flex text-[10px] font-semibold text-[#C45D39] px-2 py-0.5 rounded bg-[#FDF6F3] border border-[#C45D39]/30">
                          Confirm Credentials
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#674E61]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#674E61]" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-[#DDD0D7] bg-white space-y-2 text-xs">
                      <div>
                        <strong className="text-[#291B32]">Requirement Context:</strong>
                        <p className="text-[#674E61] mt-0.5">{rec.requirement}</p>
                      </div>
                      <div>
                        <strong className="text-[#291B32]">Verifiable Evidence:</strong>
                        <p className="text-[#674E61] mt-0.5">{rec.evidence}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#FDF6F3] border border-[#C45D39]/30">
                        <strong className="text-[#C45D39]">Recommended Action:</strong>
                        <p className="text-[#291B32] mt-0.5">{rec.proposed_improvement}</p>
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
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#674E61]">
        <Info className="w-4 h-4 text-[#C45D39] flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#291B32]">Transparent Scoring Notice:</strong> Match scores represent semantic and structural alignment calculated directly from the provided job description. They do not simulate or guarantee proprietary ATS vendor screening algorithms or employer hiring outcomes.
        </p>
      </div>
    </div>
  );
};

export default OptimizationDashboard;
