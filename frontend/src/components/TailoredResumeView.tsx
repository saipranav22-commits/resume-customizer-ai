"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  FileCheck2,
  Copy,
  Check,
  ShieldCheck,
  Target,
  Sparkles,
  Layers,
  Award,
  GraduationCap,
  Briefcase,
  AlertCircle,
  GitCompare,
  Mail,
  Info
} from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import { downloadExport } from "@/lib/api";
import DiffView from "@/components/DiffView";
import CoverLetterView from "@/components/CoverLetterView";

interface TailoredResumeViewProps {
  resume: TailoredResumeResponse;
}

export default function TailoredResumeView({ resume }: TailoredResumeViewProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "diff" | "cover_letter" | "gaps" | "optimization">("resume");

  const handleDownload = async (format: "pdf" | "docx" | "txt") => {
    try {
      setDownloadingFormat(format);
      const { blob, filename } = await downloadExport(resume, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      alert(msg);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleCopy = async () => {
    try {
      const lines: string[] = [
        resume.candidate_name.toUpperCase(),
        [
          resume.contact_info.email,
          resume.contact_info.phone,
          resume.contact_info.location,
          resume.contact_info.linkedin,
          resume.contact_info.github,
        ]
          .filter(Boolean)
          .join(" | "),
        "",
        "PROFESSIONAL SUMMARY",
        resume.tailored_summary,
        "",
        "CORE SKILLS (ALIGNED WITH JD)",
        resume.skills.matching_skills.join(", "),
        "",
        "ADDITIONAL SKILLS",
        resume.skills.additional_skills.join(", "),
        "",
        "PROFESSIONAL EXPERIENCE",
        ...resume.experience.flatMap((e) => [
          `${e.role} - ${e.company} (${e.duration || ""})`,
          ...e.bullets.map((b) => `  * ${b}`),
          "",
        ]),
        "EDUCATION",
        ...resume.education.map((edu) => `${edu.degree} - ${edu.institution} (${edu.year || ""})`),
      ];
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Failed to copy resume to clipboard.");
    }
  };

  const isSkillHighlighted = (skill: string) => {
    return resume.skills.matching_skills.some(
      (ms) => ms.toLowerCase() === skill.toLowerCase()
    );
  };

  const isSkillEvidencedInDetails = (skill: string) => {
    const sLower = skill.toLowerCase();
    if (isSkillHighlighted(skill)) return false;

    if (resume.raw_parsed_resume_text && resume.raw_parsed_resume_text.toLowerCase().includes(sLower)) {
      return true;
    }
    if (resume.skills.additional_skills && resume.skills.additional_skills.some(s => s.toLowerCase() === sLower)) {
      return true;
    }
    if (resume.experience && resume.experience.some(e =>
      e.role.toLowerCase().includes(sLower) ||
      e.bullets.some(b => b.toLowerCase().includes(sLower)) ||
      (e.original_bullets && e.original_bullets.some(b => b.toLowerCase().includes(sLower)))
    )) {
      return true;
    }
    if (resume.projects && resume.projects.some(p =>
      p.name.toLowerCase().includes(sLower) ||
      (p.technologies && p.technologies.some(t => t.toLowerCase() === sLower)) ||
      p.bullets.some(b => b.toLowerCase().includes(sLower))
    )) {
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#291B32] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C45D39]" />
              Tailored Resume Workspace
            </h2>
            {resume.is_llm_generated !== false ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]">
                <Sparkles className="w-3 h-3 text-[#C45D39]" />
                Gemini AI Tailored
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-700" />
                Deterministic Fallback
              </span>
            )}
          </div>
          <p className="text-xs text-[#674E61] mt-0.5">
            Full-width executive preview, explainable scoring, before/after diff, and recruiter downloads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="download-pdf-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("pdf")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#C45D39] hover:bg-[#AF4F2E] active:bg-[#9A4224] disabled:opacity-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingFormat === "pdf" ? "Exporting PDF..." : "Download PDF"}
          </button>

          <button
            id="download-docx-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("docx")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#291B32] bg-white hover:bg-[#F7F2EB] border border-[#DDD0D7] disabled:opacity-50 transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#C45D39]" />
            {downloadingFormat === "docx" ? "Exporting Word..." : "Word (DOCX)"}
          </button>

          <button
            id="download-txt-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("txt")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#291B32] bg-white hover:bg-[#F7F2EB] transition-all border border-[#DDD0D7] shadow-xs"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[#674E61]" />
            Plain Text
          </button>

          <button
            id="copy-resume-btn"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] transition-all border border-[#DDD0D7] shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#C45D39]" />
                <span className="text-[#C45D39] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#674E61]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics & Match Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Match Score Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#291B32] uppercase tracking-wider">
              JD Match Score
            </span>
            <Target className="w-4 h-4 text-[#C45D39]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#C45D39] font-mono">
              {resume.match_score}%
            </span>
            <span className="text-xs text-[#291B32] font-medium">
              {resume.match_score >= 80 ? "High Compatibility" : "Moderate Alignment"}
            </span>
          </div>
          <div className="mt-3 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#C45D39] h-2 rounded-full transition-all duration-1000"
              style={{ width: `${resume.match_score}%` }}
            />
          </div>
        </div>

        {/* ATS Score Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#291B32] uppercase tracking-wider">
              ATS Friendliness
            </span>
            <Award className="w-4 h-4 text-[#C45D39]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#291B32] font-mono">
              {resume.ats_compatibility.score}%
            </span>
            <span className="text-xs text-[#674E61] font-medium">
              Scannable Format
            </span>
          </div>
          <div className="mt-3 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#291B32] h-2 rounded-full transition-all duration-1000"
              style={{ width: `${resume.ats_compatibility.score}%` }}
            />
          </div>
        </div>

        {/* Missing Keywords Notice Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#291B32] uppercase tracking-wider">
              Missing JD Keywords
            </span>
            <ShieldCheck className="w-4 h-4 text-[#C45D39]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#291B32] font-mono">
              {resume.missing_keywords.length}
            </span>
            <span className="text-xs text-[#674E61] font-medium">
              Identified & Isolated
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[#674E61] leading-relaxed">
            Strictly segregated to avoid credential fabrication
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DDD0D7] pb-3">
        <button
          id="tab-resume-btn"
          type="button"
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "resume"
              ? "bg-[#291B32] text-white shadow-sm"
              : "text-[#291B32] hover:bg-white bg-white/60 border border-[#DDD0D7]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Full Resume Preview
        </button>

        <button
          id="tab-diff-btn"
          type="button"
          onClick={() => setActiveTab("diff")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "diff"
              ? "bg-[#291B32] text-white shadow-sm"
              : "text-[#291B32] hover:bg-white bg-white/60 border border-[#DDD0D7]"
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          Diff View (Before vs After)
        </button>

        <button
          id="tab-cl-btn"
          type="button"
          onClick={() => setActiveTab("cover_letter")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "cover_letter"
              ? "bg-[#291B32] text-white shadow-sm"
              : "text-[#291B32] hover:bg-white bg-white/60 border border-[#DDD0D7]"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Cover Letter
        </button>

        <button
          id="tab-gaps-btn"
          type="button"
          onClick={() => setActiveTab("gaps")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "gaps"
              ? "bg-[#291B32] text-white shadow-sm"
              : "text-[#291B32] hover:bg-white bg-white/60 border border-[#DDD0D7]"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Missing Keywords ({resume.missing_keywords.length})
        </button>

        <button
          id="tab-optimization-btn"
          type="button"
          onClick={() => setActiveTab("optimization")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "optimization"
              ? "bg-[#291B32] text-white shadow-sm"
              : "text-[#291B32] hover:bg-white bg-white/60 border border-[#DDD0D7]"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          AI Optimization & Breakdown
          {resume.recommendations && resume.recommendations.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#E8D9E8] text-[#291B32] font-bold">
              {resume.recommendations.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FULL RESUME PREVIEW */}
      {activeTab === "resume" && (
        <div
          id="resume-preview-document"
          className="p-8 sm:p-12 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm text-[#291B32]"
        >
          {/* Header */}
          <div className="text-center pb-6 border-b border-[#DDD0D7]">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#291B32]">
              {resume.candidate_name}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-[#674E61]">
              {resume.contact_info.email && <span>{resume.contact_info.email}</span>}
              {resume.contact_info.phone && <span>• {resume.contact_info.phone}</span>}
              {resume.contact_info.location && <span>• {resume.contact_info.location}</span>}
              {resume.contact_info.linkedin && (
                <span>
                  •{" "}
                  <a
                    href={resume.contact_info.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C45D39] hover:underline font-medium"
                  >
                    LinkedIn
                  </a>
                </span>
              )}
              {resume.contact_info.github && (
                <span>
                  •{" "}
                  <a
                    href={resume.contact_info.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C45D39] hover:underline font-medium"
                  >
                    GitHub
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          <div className="mt-6">
            <h3 className="font-editorial text-xs font-bold text-[#C45D39] uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              Professional Summary
            </h3>
            <p className="text-sm leading-relaxed text-[#291B32]">
              {resume.tailored_summary}
            </p>
          </div>

          {/* Core Skills */}
          <div className="mt-6">
            <h3 className="font-editorial text-xs font-bold text-[#C45D39] uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5" />
              Core Qualifications & Skills
            </h3>
            {resume.skills.matching_skills.length > 0 && (
              <div className="mb-2.5">
                <span className="text-xs font-semibold text-[#291B32]">
                  Target JD Alignment:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {resume.skills.matching_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {resume.skills.additional_skills.length > 0 && (
              <div className="mt-2.5">
                <span className="text-xs font-semibold text-[#291B32]">
                  Additional Capabilities:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {resume.skills.additional_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F7F2EB] text-[#291B32] border border-[#DDD0D7]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Experience */}
          <div className="mt-6">
            <h3 className="font-editorial text-xs font-bold text-[#C45D39] uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Briefcase className="w-3.5 h-3.5" />
              Professional Experience
            </h3>
            <div className="space-y-5">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 border-[#C45D39]/40 pl-4 py-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="text-sm font-bold text-[#291B32]">
                      {exp.role} <span className="text-[#674E61] font-normal">at</span> {exp.company}
                    </span>
                    {exp.duration && (
                      <span className="text-xs text-[#674E61] font-mono">
                        {exp.duration}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-[#291B32]/90">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className="text-[#C45D39] mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C45D39] shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <div className="mt-6">
              <h3 className="font-editorial text-xs font-bold text-[#C45D39] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <GraduationCap className="w-3.5 h-3.5" />
                Education
              </h3>
              <div className="space-y-2">
                {resume.education.map((edu, idx) => (
                  <div key={idx} className="flex items-baseline justify-between text-xs sm:text-sm">
                    <div>
                      <span className="font-semibold text-[#291B32]">{edu.degree}</span>
                      <span className="text-[#674E61]"> — {edu.institution}</span>
                      {edu.details && <p className="text-xs text-[#674E61] mt-0.5">{edu.details}</p>}
                    </div>
                    {edu.year && <span className="text-xs text-[#674E61] font-mono">{edu.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="mt-6">
              <h3 className="font-editorial text-xs font-bold text-[#C45D39] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Award className="w-3.5 h-3.5" />
                Featured Projects
              </h3>
              <div className="space-y-3">
                {resume.projects.map((proj, idx) => (
                  <div key={idx} className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#291B32]">{proj.name}</span>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className="text-xs text-[#674E61]">[{proj.technologies.join(", ")}]</span>
                      )}
                    </div>
                    {proj.bullets.map((b, bIdx) => (
                      <p key={bIdx} className="text-[#291B32]/80 mt-1 pl-3 border-l border-[#DDD0D7]">
                        {b}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DIFF VIEW */}
      {activeTab === "diff" && <DiffView resume={resume} />}

      {/* TAB 3: COVER LETTER */}
      {activeTab === "cover_letter" && <CoverLetterView resume={resume} />}

      {/* TAB 4: MISSING KEYWORDS GAP ANALYSIS */}
      {activeTab === "gaps" && (
        <div className="p-6 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-6">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-1">Ethical Guardrail in Effect: Credential Fabrication Prevented</p>
              <p>
                The job description mentioned the keywords below, but our parser verified they do not exist
                in your uploaded resume. To maintain strict honesty, these skills were <strong>not</strong> inserted into your tailored resume bullets or skills list.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[#291B32]">
              Isolated Keywords & Transparent Action Plans ({resume.missing_keywords.length})
            </h3>
            {resume.missing_keywords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resume.missing_keywords.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#291B32]">{item.keyword}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#674E61]">{item.context}</p>
                    <p className="text-[11px] text-[#C45D39] font-medium pt-1 flex items-center gap-1">
                      <span>→</span>
                      <span>{item.recommendation}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#674E61] bg-[#F7F2EB] rounded-xl border border-[#DDD0D7]">
                <Check className="w-6 h-6 text-[#C45D39] mx-auto mb-1.5" />
                <p className="font-semibold text-[#291B32]">No Critical Gaps Found</p>
                <p>Your resume satisfies all primary keywords identified in this job description.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AI OPTIMIZATION & MATCH ANALYSIS (Phase 5C & 6) */}
      {activeTab === "optimization" && (
        <div id="optimization-analysis-panel" className="flex flex-col gap-6">
          {!resume.match_breakdown && (
            <div className="p-6 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm text-center">
              <Info className="w-8 h-8 text-[#C45D39] mx-auto mb-2" />
              <h3 className="font-bold text-sm text-[#291B32]">
                Historical Snapshot (Match Score: {resume.match_score}%)
              </h3>
              <p className="text-xs text-[#674E61] mt-1 max-w-md mx-auto">
                This resume version was created prior to Phase 5C explainable scoring. Re-tailor against your target job description to generate a multi-factor score breakdown and structured JD requirements.
              </p>
            </div>
          )}

          {/* 1. Explainable Match Score Breakdown */}
          {resume.match_breakdown && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#DDD0D7]">
                <div>
                  <h3 className="text-base font-bold text-[#291B32] flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#C45D39]" />
                    Explainable Match Breakdown
                  </h3>
                  <p className="text-xs text-[#674E61] mt-0.5">
                    Multi-factor evaluation mathematically weighted across 6 criteria
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#C45D39] font-mono">
                    {resume.match_breakdown.overall_score}%
                  </span>
                  <span className="block text-[10px] text-[#674E61]">Weighted Overall</span>
                </div>
              </div>

              {/* Factors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Required Skill Coverage ({Math.round(resume.match_breakdown.factor_weights["required_skills"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.required_skill_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.required_skill_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Preferred Skill Coverage ({Math.round(resume.match_breakdown.factor_weights["preferred_skills"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.preferred_skill_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.preferred_skill_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Role & Experience Alignment ({Math.round(resume.match_breakdown.factor_weights["experience"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.experience_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.experience_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Responsibility Alignment ({Math.round(resume.match_breakdown.factor_weights["responsibilities"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.responsibility_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.responsibility_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Domain Keyword Coverage ({Math.round(resume.match_breakdown.factor_weights["keyword_coverage"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.keyword_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.keyword_score}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#291B32]">
                    <span>Resume Structure & Readability ({Math.round(resume.match_breakdown.factor_weights["structure"] * 100)}% weight)</span>
                    <span className="font-mono text-[#C45D39] font-bold">{resume.match_breakdown.structure_score}%</span>
                  </div>
                  <div className="mt-2.5 w-full bg-[#DDD0D7] rounded-full h-2 overflow-hidden">
                    <div className="bg-[#C45D39] h-2 rounded-full" style={{ width: `${resume.match_breakdown.structure_score}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-[#E8D9E8]/35 border border-[#DDD0D7] text-xs text-[#291B32] leading-relaxed">
                <strong>Methodology & Evidence:</strong> {resume.match_breakdown.explanation}
              </div>

              <div className="mt-2.5 p-3 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[11px] text-[#674E61] leading-relaxed">
                <strong>Transparency Note:</strong> {resume.match_breakdown.disclaimer}
              </div>
            </div>
          )}

          {/* 2. Structured Job Description Requirements with UX Fix */}
          {resume.job_analysis && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
              <div className="pb-4 border-b border-[#DDD0D7]">
                <h3 className="text-base font-bold text-[#291B32] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C45D39]" />
                  Structured Job Requirements
                </h3>
                <p className="text-xs text-[#674E61] mt-0.5">
                  Verifiable breakdown of technical requirements extracted from target job posting
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-xs">
                <div>
                  <span className="font-semibold text-[#674E61]">Target Role:</span>
                  <p className="text-[#291B32] font-bold text-sm mt-0.5">{resume.job_analysis.target_role}</p>
                </div>
                <div>
                  <span className="font-semibold text-[#674E61]">Experience & Seniority:</span>
                  <p className="text-[#291B32] font-medium mt-0.5">{resume.job_analysis.experience_level || "Not specified"}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-[#674E61]">Education Requirement:</span>
                  <p className="text-[#291B32] font-medium mt-0.5">{resume.job_analysis.education_requirement || "Not specified"}</p>
                </div>

                <div className="md:col-span-2 mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#291B32]">Mandatory Required Skills:</span>
                    <span className="text-[11px] text-[#674E61]">
                      Distinguishes Highlighted vs Evidenced in Experience vs Absent
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {resume.job_analysis.required_skills.map((skill, i) => {
                      const matched = isSkillHighlighted(skill);
                      const evidenced = isSkillEvidencedInDetails(skill);
                      return (
                        <span
                          key={i}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                            matched
                              ? "bg-[#E8D9E8] text-[#291B32] border-[#DDD0D7]"
                              : evidenced
                              ? "bg-[#F7F2EB] text-[#674E61] border-[#DDD0D7]"
                              : "bg-[#FDF2F0] text-[#9A3412] border-[#FDBA74]"
                          }`}
                        >
                          {matched ? (
                            <Check className="w-3.5 h-3.5 text-[#C45D39]" />
                          ) : evidenced ? (
                            <Info className="w-3.5 h-3.5 text-[#674E61]" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-[#C45D39]" />
                          )}
                          <span>{skill}</span>
                          <span className="text-[10px] font-normal opacity-90">
                            {matched
                              ? "(Matched in Skills)"
                              : evidenced
                              ? "(Evidenced in Experience)"
                              : "(Not Present)"}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {resume.job_analysis.preferred_skills && resume.job_analysis.preferred_skills.length > 0 && (
                  <div className="md:col-span-2 mt-3">
                    <span className="font-semibold text-[#291B32]">Preferred / Bonus Qualifications:</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {resume.job_analysis.preferred_skills.map((skill, i) => {
                        const matched = isSkillHighlighted(skill);
                        const evidenced = isSkillEvidencedInDetails(skill);
                        return (
                          <span
                            key={i}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                              matched
                                ? "bg-[#E8D9E8] text-[#291B32] border-[#DDD0D7]"
                                : evidenced
                                ? "bg-[#F7F2EB] text-[#674E61] border-[#DDD0D7]"
                                : "bg-[#F7F2EB] text-[#674E61] border-[#DDD0D7]"
                            }`}
                          >
                            {matched ? (
                              <Check className="w-3.5 h-3.5 text-[#C45D39]" />
                            ) : evidenced ? (
                              <Info className="w-3.5 h-3.5 text-[#674E61]" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
                            )}
                            <span>{skill}</span>
                            <span className="text-[10px] font-normal opacity-90">
                              {matched
                                ? "(Matched)"
                                : evidenced
                                ? "(Evidenced in Projects)"
                                : "(Optional)"}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Prioritized AI Optimization Recommendations */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD0D7]">
              <div>
                <h3 className="text-base font-bold text-[#291B32] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C45D39]" />
                  Prioritized AI Optimization Recommendations
                </h3>
                <p className="text-xs text-[#674E61] mt-0.5">
                  Actionable suggestions grounded in factual resume evidence
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E8D9E8] text-[#291B32]">
                {resume.recommendations?.length || 0} Actions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-5">
              {resume.recommendations && resume.recommendations.length > 0 ? (
                resume.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-[#DDD0D7] bg-[#F7F2EB] hover:border-[#C45D39]/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rec.priority === "high"
                              ? "bg-[#FDF2F0] text-[#9A3412] border border-[#FDBA74]"
                              : rec.priority === "medium"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]"
                          }`}
                        >
                          {rec.priority} Priority
                        </span>
                        {rec.requires_user_confirmation ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            Requires Candidate Confirmation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]">
                            <Check className="w-3 h-3 text-[#C45D39]" />
                            Evidence Grounded
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-[#291B32] mt-2.5">
                      {rec.issue}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5 text-xs text-[#674E61]">
                      <p>
                        <strong className="text-[#291B32]">JD Requirement:</strong> {rec.requirement}
                      </p>
                      <p>
                        <strong className="text-[#291B32]">Resume Evidence:</strong> {rec.evidence}
                      </p>
                    </div>

                    <div className="mt-3.5 p-3.5 rounded-lg bg-white border border-[#DDD0D7] text-xs text-[#291B32] leading-relaxed">
                      <strong className="text-[#C45D39]">Proposed Improvement:</strong>{" "}
                      {rec.proposed_improvement}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[#674E61]">
                  <Check className="w-8 h-8 text-[#C45D39] mx-auto mb-2" />
                  <p className="font-semibold text-[#291B32]">
                    No Critical Optimization Issues Identified
                  </p>
                  <p className="text-xs text-[#674E61] mt-1">
                    Your tailored resume directly aligns with the primary requirements of the job description.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
