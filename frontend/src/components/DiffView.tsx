"use client";

import React from "react";
import { GitCompare, CheckCircle2, FileText, Briefcase, Layers, AlertCircle } from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";

interface DiffViewProps {
  resume: TailoredResumeResponse;
}

export default function DiffView({ resume }: DiffViewProps) {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-[#2C224B]/40 border border-[#7C4DFF]/30 flex items-start gap-3">
        <GitCompare className="w-5 h-5 text-[#7C4DFF] shrink-0 mt-0.5" />
        <div className="text-xs text-[#F7F7FA]">
          <p className="font-bold">Transparent Optimization Diff View</p>
          <p className="mt-0.5 text-[#B8B9D0]">
            Compare your original resume text directly with the AI-tailored version. Notice how accomplishments
            are rephrased with strong action verbs and target JD keywords while strictly preserving your truthful credentials.
          </p>
        </div>
      </div>

      {/* 1. SUMMARY DIFF */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
          <FileText className="w-4 h-4 text-[#7C4DFF]" />
          <h3 className="font-heading font-bold text-sm text-[#F7F7FA]">
            Professional Summary Comparison
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B]">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1B2231] text-[#B8B9D0] border border-[#30384B]">
              Original Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[#B8B9D0] line-through opacity-75">
              {resume.original_summary || "No dedicated summary found in original resume."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#1B2231] border border-[#7C4DFF]/40 shadow-inner">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7C4DFF] text-white">
              AI-Tailored Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[#F7F7FA] font-medium">
              {resume.tailored_summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. EXPERIENCE BULLETS DIFF */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
          <Briefcase className="w-4 h-4 text-[#7C4DFF]" />
          <h3 className="font-heading font-bold text-sm text-[#F7F7FA]">
            Experience Bullets Optimization
          </h3>
        </div>

        <div className="space-y-6">
          {resume.experience.map((exp, expIdx) => (
            <div key={expIdx} className="space-y-3">
              <div className="flex items-baseline justify-between text-xs font-bold text-[#F7F7FA]">
                <span>
                  {exp.role} <span className="text-[#B8B9D0] font-normal">at</span> {exp.company}
                </span>
                {exp.duration && <span className="font-mono text-[#B8B9D0] font-normal">{exp.duration}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Bullets */}
                <div className="p-4 rounded-xl bg-[#0B101A] border border-[#30384B]">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1B2231] text-[#B8B9D0] border border-[#30384B]">
                    Original Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-[#B8B9D0]">
                    {exp.original_bullets && exp.original_bullets.length > 0 ? (
                      exp.original_bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-[#30384B] mt-0.5">•</span>
                          <span className="line-through opacity-70">{b}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-[#B8B9D0]/60">Original bullet points mapped directly.</li>
                    )}
                  </ul>
                </div>

                {/* Tailored Bullets */}
                <div className="p-4 rounded-xl bg-[#1B2231] border border-[#7C4DFF]/40">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#7C4DFF] text-white">
                    Tailored & Quantified Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-[#F7F7FA] font-medium">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#7C4DFF] mt-0.5 shrink-0" />
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
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
          <Layers className="w-4 h-4 text-[#7C4DFF]" />
          <h3 className="font-heading font-bold text-sm text-[#F7F7FA]">
            Skills Alignment & Isolation Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#2C224B]/30 border border-[#7C4DFF]/30">
            <span className="text-xs font-semibold text-[#B89AFF]">
              Verified Candidate Matching Skills:
            </span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {resume.skills.matching_skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#2C224B] text-[#F7F7FA] border border-[#7C4DFF]/40 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#7C4DFF]" />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#1B2231] border border-[#FDBB83]/30">
            <span className="text-xs font-semibold text-[#FDBB83]">
              Unmatched JD Requirements (Strictly Isolated):
            </span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {resume.missing_keywords.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#0B101A] text-[#FDBB83] border border-[#FDBB83]/30 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 text-[#FDBB83]" />
                  {m.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
