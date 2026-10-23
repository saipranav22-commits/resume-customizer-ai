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
  AlertCircle
} from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import { downloadExport } from "@/lib/api";

interface TailoredResumeViewProps {
  resume: TailoredResumeResponse;
}

export default function TailoredResumeView({ resume }: TailoredResumeViewProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"resume" | "gaps">("resume");

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

  return (
    <div className="flex flex-col gap-6">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Tailored Resume Ready
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Export in recruiter-ready formats or inspect ATS alignment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="download-pdf-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("pdf")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingFormat === "pdf" ? "Exporting PDF..." : "Download PDF"}
          </button>

          <button
            id="download-docx-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("docx")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            {downloadingFormat === "docx" ? "Exporting Word..." : "Word (DOCX)"}
          </button>

          <button
            id="download-txt-btn"
            type="button"
            disabled={Boolean(downloadingFormat)}
            onClick={() => handleDownload("txt")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Plain Text
          </button>

          <button
            id="copy-resume-btn"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics & Match Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Match Score Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              JD Match Score
            </span>
            <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 font-mono">
              {resume.match_score}%
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {resume.match_score >= 80 ? "High Compatibility" : "Moderate Alignment"}
            </span>
          </div>
          <div className="mt-2 w-full bg-blue-200/60 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${resume.match_score}%` }}
            />
          </div>
        </div>

        {/* ATS Score Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              ATS Friendliness
            </span>
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
              {resume.ats_compatibility.score}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Scannable Format
            </span>
          </div>
          <div className="mt-2 w-full bg-emerald-200/60 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-400 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${resume.ats_compatibility.score}%` }}
            />
          </div>
        </div>

        {/* Missing Keywords Notice Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/30 dark:to-violet-950/20 border border-purple-200/80 dark:border-purple-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
              Missing JD Keywords
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">
              {resume.missing_keywords.length}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              Identified & Isolated
            </span>
          </div>
          <p className="mt-1 text-[11px] text-purple-700 dark:text-purple-300/80 leading-relaxed">
            Strictly segregated to avoid credential fabrication
          </p>
        </div>
      </div>

      {/* Tabs: Resume Preview vs Missing Keywords Gap Analysis */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "resume"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Full Resume Preview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gaps")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "gaps"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Missing Keywords & Gap Analysis ({resume.missing_keywords.length})
        </button>
      </div>

      {/* TAB 1: FULL RESUME PREVIEW */}
      {activeTab === "resume" && (
        <div
          id="resume-preview-document"
          className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-800 dark:text-slate-200 font-sans"
        >
          {/* Header */}
          <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {resume.candidate_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
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
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
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
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    GitHub
                  </a>
                </span>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              Professional Summary
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {resume.tailored_summary}
            </p>
          </div>

          {/* Core Skills */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5" />
              Core Qualifications & Skills
            </h3>
            {resume.skills.matching_skills.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Target JD Alignment:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {resume.skills.matching_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {resume.skills.additional_skills.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Additional Capabilities:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {resume.skills.additional_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
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
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Briefcase className="w-3.5 h-3.5" />
              Professional Experience
            </h3>
            <div className="space-y-5">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="border-l-2 border-blue-500/30 pl-4 py-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {exp.role} <span className="text-slate-400 dark:text-slate-500 font-normal">at</span> {exp.company}
                    </span>
                    {exp.duration && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {exp.duration}
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {exp.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
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
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <GraduationCap className="w-3.5 h-3.5" />
                Education
              </h3>
              <div className="space-y-2">
                {resume.education.map((edu, idx) => (
                  <div key={idx} className="flex items-baseline justify-between text-xs sm:text-sm">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{edu.degree}</span>
                      <span className="text-slate-500 dark:text-slate-400"> • {edu.institution}</span>
                      {edu.details && <p className="text-xs text-slate-500 mt-0.5">{edu.details}</p>}
                    </div>
                    {edu.year && <span className="text-xs text-slate-500 font-mono">{edu.year}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Award className="w-3.5 h-3.5" />
                Featured Projects
              </h3>
              <div className="space-y-3">
                {resume.projects.map((proj, idx) => (
                  <div key={idx} className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{proj.name}</span>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span className="text-xs text-slate-500">[{proj.technologies.join(", ")}]</span>
                      )}
                    </div>
                    {proj.bullets.map((b, bIdx) => (
                      <p key={bIdx} className="text-slate-600 dark:text-slate-300 mt-1 pl-3 border-l border-slate-300 dark:border-slate-700">
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

      {/* TAB 2: MISSING KEYWORDS GAP ANALYSIS */}
      {activeTab === "gaps" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
              <p className="font-bold mb-1">Ethical Guardrail in Effect: Credential Fabrication Prevented</p>
              <p>
                The skills listed below are emphasized by the target Job Description but were <strong>not detected in your resume</strong>.
                To preserve strict professional integrity, these keywords have <strong>NOT been added to your resume qualifications</strong>.
                Review the actionable guidance below to truthfully highlight related coursework, projects, or self-study if applicable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resume.missing_keywords.map((gap, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {gap.keyword}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {gap.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <strong>JD Context:</strong> {gap.context}
                </p>
                <div className="mt-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                  <strong className="text-purple-600 dark:text-purple-400">Recommendation:</strong>{" "}
                  {gap.recommendation}
                </div>
              </div>
            ))}
          </div>

          {resume.missing_keywords.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Outstanding Match!
              </p>
              <p className="text-xs">
                Your resume satisfies all primary keywords identified in this Job Description.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
