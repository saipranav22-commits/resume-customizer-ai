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
          className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
        >
          <span>2. Paste Job Description</span>
          <span className="text-xs font-normal text-slate-500">(Minimum {minLength} chars)</span>
        </label>
        <div className="flex items-center gap-2">
          {charCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            id="load-sample-jd-btn"
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <FileCode className="w-3.5 h-3.5" />
            Load Sample JD
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
          className={`w-full rounded-xl border p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 focus:outline-none focus:ring-2 transition-all resize-y font-sans ${
            error
              ? "border-rose-400 focus:ring-rose-400 dark:border-rose-700"
              : isSatisfied
              ? "border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
              : "border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
          }`}
        />
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5">
            {isSatisfied ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                JD meets requirements ({charCount} characters)
              </span>
            ) : charCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">
                Needs {minLength - charCount} more characters for thorough analysis
              </span>
            ) : (
              <span className="text-slate-400">Please provide the JD text</span>
            )}
          </div>
          <span className="text-slate-400 font-mono">{charCount} chars</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
