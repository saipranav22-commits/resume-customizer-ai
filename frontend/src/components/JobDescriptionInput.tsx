"use client";

import React, { ChangeEvent } from "react";
import { FileCode, Trash2, CheckCircle2 } from "lucide-react";

interface JobDescriptionInputProps {
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
}

const SAMPLE_JD = `Role: Senior Full Stack Developer (Next.js & Python)

About the Job:
We are seeking an experienced Full Stack Developer to build and scale high-performance web applications and AI-driven workflow engines.

Key Responsibilities:
- Build responsive, modern user interfaces using Next.js (App Router), React, and TypeScript.
- Design, implement, and maintain high-throughput backend microservices and REST APIs using Python FastAPI.
- Integrate LLM APIs (Gemini, OpenAI) for automated intelligent data extraction, prompt engineering, and real-time processing.
- Deploy, monitor, and scale cloud applications using Docker, Kubernetes, and CI/CD pipelines.
- Ensure strict data integrity, test coverage, and ATS compliance across all engineering deliverables.

Requirements:
- 3+ years experience with Next.js, React, and modern TypeScript.
- Strong proficiency in Python, FastAPI or Django, and relational databases (PostgreSQL).
- Experience with Docker containers, cloud deployments (Render, Vercel, AWS), and Git workflows.
- Excellent communication and analytical problem-solving skills.`;

export default function JobDescriptionInput({
  value,
  onChange,
  error,
}: JobDescriptionInputProps) {
  const minLength = 50;
  const charCount = value.trim().length;
  const isSatisfied = charCount >= minLength;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleLoadSample = () => {
    onChange(SAMPLE_JD);
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="job-description-textarea"
          className="text-sm font-semibold text-[#291B32] flex items-center gap-2"
        >
          <span>2. Paste Job Description</span>
          <span className="text-xs font-normal text-[#674E61]">(Minimum {minLength} chars)</span>
        </label>
        <div className="flex items-center gap-2.5">
          {charCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[#674E61] hover:text-[#A82A2A] flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            id="load-sample-jd-btn"
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-[#C45D39] hover:text-[#AF4F2E] flex items-center gap-1.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#C45D39] rounded"
          >
            <FileCode className="w-3.5 h-3.5" />
            Load Sample Role
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          id="job-description-textarea"
          rows={7}
          value={value}
          onChange={handleChange}
          placeholder="Paste the full job description here (responsibilities, required qualifications, technical stack, etc.)..."
          className={`w-full rounded-2xl border p-4 text-sm text-[#291B32] placeholder:text-[#674E61]/60 bg-[#F7F2EB]/50 focus:bg-white focus:outline-none focus:ring-2 transition-all resize-y font-sans ${
            error
              ? "border-[#F5C2C2] focus:ring-[#A82A2A]/20"
              : isSatisfied
              ? "border-[#DDD0D7] focus:border-[#C45D39] focus:ring-[#C45D39]/20"
              : "border-[#DDD0D7] focus:border-[#C45D39] focus:ring-[#C45D39]/20"
          }`}
        />
        <div className="flex items-center justify-between px-1 text-xs mt-1.5">
          <div className="flex items-center gap-1.5">
            {isSatisfied ? (
              <span className="text-[#291B32] flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C45D39]" />
                Job description verified ({charCount} characters)
              </span>
            ) : charCount > 0 ? (
              <span className="text-[#B85C2A] font-medium">
                Needs {minLength - charCount} more characters for thorough analysis
              </span>
            ) : (
              <span className="text-[#674E61]">Please provide target job description</span>
            )}
          </div>
          <span className="text-[#674E61] font-mono">{charCount} chars</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#A82A2A] bg-[#FDF2F2] p-2.5 rounded-lg border border-[#F5C2C2]">{error}</p>
      )}
    </div>
  );
}
