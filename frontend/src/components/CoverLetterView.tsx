"use client";

import React, { useState } from "react";
import { Download, Copy, Check, Mail } from "lucide-react";
import { TailoredResumeResponse } from "@/types/resume";
import { downloadCoverLetterPdf } from "@/lib/api";
import { normalizeCandidateName, formatCoverLetterWithVerifiedSignature } from "@/lib/nameNormalizer";

interface CoverLetterViewProps {
  resume: TailoredResumeResponse;
}

export default function CoverLetterView({ resume }: CoverLetterViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalizedCandidateName = normalizeCandidateName(resume.candidate_name) || "Candidate Name";
  const defaultLetterBody = "Dear Hiring Team,\n\nI am pleased to submit my application for the role. With strong background in modern software engineering and a track record of delivering high-impact solutions, I am excited about the opportunity to contribute to your team.";

  const coverLetterText = formatCoverLetterWithVerifiedSignature(
    resume.generated_cover_letter || defaultLetterBody,
    normalizedCandidateName
  );

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
        candidate_name: normalizedCandidateName,
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
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm">
        <div>
          <h2 className="text-base font-heading font-bold text-[#291B32] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#C45D39]" />
            Tailored Cover Letter
          </h2>
          <p className="text-xs text-[#674E61]">
            Personalized narrative highlighting your genuine matching strengths
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="download-cl-pdf-btn"
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#C45D39] hover:bg-[#b35230] active:bg-[#a04626] disabled:opacity-50 transition-all shadow-md shadow-[#C45D39]/20"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Generating PDF..." : "Download Cover Letter PDF"}
          </button>

          <button
            id="copy-cl-btn"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#291B32] bg-[#F7F2EB] hover:bg-[#FAF6F2] transition-all border border-[#DDD0D7] shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#C45D39]" />
                <span className="text-[#C45D39] font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#674E61]" />
                <span>Copy Letter</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Letter Document Preview */}
      <div
        id="cover-letter-preview"
        className="p-8 sm:p-12 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm text-[#291B32] space-y-6 max-w-4xl mx-auto font-sans"
      >
        {/* Letterhead */}
        <div className="pb-6 border-b-2 border-[#DDD0D7]">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#291B32]">
            {normalizedCandidateName}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[#674E61]">
            {resume.contact_info.email && <span>{resume.contact_info.email}</span>}
            {resume.contact_info.phone && <span>• {resume.contact_info.phone}</span>}
            {resume.contact_info.location && <span>• {resume.contact_info.location}</span>}
          </div>
        </div>

        {/* Letter Body */}
        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[#291B32] whitespace-pre-line font-sans">
          {coverLetterText}
        </div>
      </div>
    </div>
  );
}
