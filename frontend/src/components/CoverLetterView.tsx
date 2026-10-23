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
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Tailored Cover Letter
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personalized narrative highlighting your genuine matching strengths
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-cl-pdf-btn"
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Generating PDF..." : "Download Cover Letter PDF"}
          </button>

          <button
            id="copy-cl-btn"
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
                <span>Copy Letter</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Letter Document Preview */}
      <div
        id="cover-letter-preview"
        className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-800 dark:text-slate-200 font-sans space-y-6"
      >
        {/* Letterhead */}
        <div className="pb-6 border-b-2 border-blue-600 dark:border-blue-500">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {resume.candidate_name}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            {resume.contact_info.email && <span>{resume.contact_info.email}</span>}
            {resume.contact_info.phone && <span>• {resume.contact_info.phone}</span>}
            {resume.contact_info.location && <span>• {resume.contact_info.location}</span>}
          </div>
        </div>

        {/* Letter Body */}
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line font-sans">
          {coverLetterText}
        </div>
      </div>
    </div>
  );
}
