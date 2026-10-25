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
      <div className="p-4 rounded-xl bg-[#DCEDE5]/40 border border-[#DCEDE5] flex items-start gap-3">
        <GitCompare className="w-5 h-5 text-[#087F66] shrink-0 mt-0.5" />
        <div className="text-xs text-[#15283B]">
          <p className="font-bold">Transparent Optimization Diff View</p>
          <p className="mt-0.5 text-[#64748B]">
            Compare your original resume text directly with the AI-tailored version. Notice how accomplishments
            are rephrased with strong action verbs and target JD keywords while strictly preserving your truthful credentials.
          </p>
        </div>
      </div>

      {/* 1. SUMMARY DIFF */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4]">
          <FileText className="w-4 h-4 text-[#087F66]" />
          <h3 className="font-bold text-sm text-[#15283B]">
            Professional Summary Comparison
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4]">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
              Original Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
              {resume.original_summary || "No dedicated summary found in original resume."}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#DCEDE5]/30 border border-[#DCEDE5]">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#087F66] text-white">
              AI-Tailored Summary
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[#15283B] font-medium">
              {resume.tailored_summary}
            </p>
          </div>
        </div>
      </div>

      {/* 2. EXPERIENCE BULLETS DIFF */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4]">
          <Briefcase className="w-4 h-4 text-[#087F66]" />
          <h3 className="font-bold text-sm text-[#15283B]">
            Experience Bullets Optimization
          </h3>
        </div>

        <div className="space-y-6">
          {resume.experience.map((exp, expIdx) => (
            <div key={expIdx} className="space-y-3">
              <div className="flex items-baseline justify-between text-xs font-bold text-[#15283B]">
                <span>
                  {exp.role} <span className="text-[#64748B] font-normal">at</span> {exp.company}
                </span>
                {exp.duration && <span className="font-mono text-[#64748B] font-normal">{exp.duration}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Bullets */}
                <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4]">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                    Original Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-[#64748B]">
                    {exp.original_bullets && exp.original_bullets.length > 0 ? (
                      exp.original_bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-slate-400 mt-0.5">•</span>
                          <span>{b}</span>
                        </li>
                      ))
                    ) : (
                      <li className="italic text-slate-400">Original bullet points mapped directly.</li>
                    )}
                  </ul>
                </div>

                {/* Tailored Bullets */}
                <div className="p-4 rounded-xl bg-[#DCEDE5]/25 border border-[#DCEDE5]">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#087F66] text-white">
                    Tailored & Quantified Bullets
                  </span>
                  <ul className="mt-3 space-y-2 text-xs text-[#15283B] font-medium">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#087F66] mt-0.5 shrink-0" />
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
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8E4]">
          <Layers className="w-4 h-4 text-[#087F66]" />
          <h3 className="font-bold text-sm text-[#15283B]">
            Skills Alignment & Isolation Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#DCEDE5]/20 border border-[#DCEDE5]">
            <span className="text-xs font-semibold text-[#15283B]">
              Verified Candidate Matching Skills:
            </span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {resume.skills.matching_skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#DCEDE5] text-[#087F66] border border-[#087F66]/20 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#087F66]" />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-semibold text-amber-900">
              Unmatched JD Requirements (Strictly Isolated):
            </span>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {resume.missing_keywords.map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 text-amber-600" />
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
