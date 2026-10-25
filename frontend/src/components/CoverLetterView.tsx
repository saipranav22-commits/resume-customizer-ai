"use client";

import React, { useState } from "react";
import { Download, Copy, Check, Mail } from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import { downloadCoverLetterPdf } from "@/lib/api";

interface CoverLetterViewProps {
  resume: TailoredResumeResponse;
}

export default function CoverLetterView({ resume }: CoverLetterViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const coverLetterText =
    resume.generated_cover_letter ||
    `Dear Hiring Team,\n\nI am pleased to submit my application for the role. With strong background in modern software engineering and a track record of delivering high-impact solutions, I am excited about the opportunity to contribute to your team.\n\nSincerely,\n${resume.candidate_name}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coverLetterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Failed to copy cover letter to clipboard.");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const { blob, filename } = await downloadCoverLetterPdf({
        candidate_name: resume.candidate_name,
        contact_info: resume.contact_info,
        cover_letter_text: coverLetterText,
        target_role: "Software Engineering Role",
        company_name: "Hiring Team",
      });

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
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl">
        <div>
          <h2 className="text-base font-heading font-bold text-[#F7F7FA] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#7C4DFF]" />
            Tailored Cover Letter
          </h2>
          <p className="text-xs text-[#B8B9D0]">
            Personalized narrative highlighting your genuine matching strengths
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="download-cl-pdf-btn"
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#7C4DFF] hover:bg-[#6940DE] active:bg-[#5833C5] disabled:opacity-50 transition-all shadow-md shadow-[#7C4DFF]/25"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Generating PDF..." : "Download Cover Letter PDF"}
          </button>

          <button
            id="copy-cl-btn"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#F7F7FA] bg-[#1B2231] hover:bg-[#232C3E] transition-all border border-[#30384B] shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#B89AFF]" />
                <span className="text-[#B89AFF] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#B8B9D0]" />
                <span>Copy Letter</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Letter Document Preview */}
      <div
        id="cover-letter-preview"
        className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 space-y-6 max-w-4xl mx-auto"
      >
        {/* Letterhead */}
        <div className="pb-6 border-b-2 border-[#7C4DFF]">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
            {resume.candidate_name}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-600">
            {resume.contact_info.email && <span>{resume.contact_info.email}</span>}
            {resume.contact_info.phone && <span>• {resume.contact_info.phone}</span>}
            {resume.contact_info.location && <span>• {resume.contact_info.location}</span>}
          </div>
        </div>

        {/* Letter Body */}
        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-line font-sans">
          {coverLetterText}
        </div>
      </div>
    </div>
  );
}
