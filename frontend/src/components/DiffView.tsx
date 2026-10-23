"use client";

import React from "react";
import { GitCompare, CheckCircle2, FileText, Briefcase, Layers } from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";

interface DiffViewProps {
  resume: TailoredResumeResponse;
}

export default function DiffView({ resume }: DiffViewProps) {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
        <GitCompare className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200">
          <p className="font-bold">Transparent Optimization Diff View</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
            Compare your original resume text with the AI-tailored version. Notice how accomplishments
            are rephrased with strong action verbs and target JD keywords while strictly preserving your truthful credentials.
          </p>
        </div>
      </div>

      {/* 1. SUMMARY DIFF */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Professional Summary Comparison
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              Original Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {resume.original_summary || "No dedicated summary found in original resume."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              AI-Tailored Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
              {resume.tailored_summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. EXPERIENCE BULLETS DIFF */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Experience Bullets Optimization
          </h3>
        </div>

        <div className="space-y-6">
          {resume.experience.map((exp, expIdx) => (
            <div key={expIdx} className="space-y-3">
              <div className="flex items-baseline justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>
                  {exp.role} — <span className="text-slate-500">{exp.company}</span>
                </span>
                {exp.duration && <span className="font-mono text-slate-400">{exp.duration}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Bullets */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    Original Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    {exp.original_bullets && exp.original_bullets.length > 0 ? (
                      exp.original_bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 mt-1">•</span>
                          <span>{b}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-slate-400">Original bullet points mapped directly.</li>
                    )}
                  </ul>
                </div>

                {/* Tailored Bullets */}
                <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                    Tailored & Quantified Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SKILLS ALIGNMENT DIFF */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Skills Alignment & Isolation Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Verified Candidate Matching Skills:
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {resume.skills.matching_skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                >
                  ✓ {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">
              Unmatched JD Requirements (Strictly Isolated):
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {resume.missing_keywords.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  ⚠ {m.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
