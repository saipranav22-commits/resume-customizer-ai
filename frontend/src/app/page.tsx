"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Bookmark,
  Check,
  Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import TailoredResumeView from "@/components/TailoredResumeView";
import SectionControls from "@/components/SectionControls";
import HistoryDrawer from "@/components/HistoryDrawer";
import AuthModal from "@/components/AuthModal";
import { customizeResume, saveHistory } from "@/lib/api";
import { TailoredResumeResponse, CustomizationHistoryDetail } from "@/types/resume";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Analyzing documents...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResponse | null>(null);

  // Section customization controls
  const [customizeSummary, setCustomizeSummary] = useState<boolean>(true);
  const [customizeSkills, setCustomizeSkills] = useState<boolean>(true);
  const [customizeExperience, setCustomizeExperience] = useState<boolean>(true);

  // Phase 5A: Auth & History UI States
  const { user, token } = useAuth();
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const canSubmit = Boolean(file) && jobDescription.trim().length >= 50 && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please upload your resume (PDF or DOCX).");
      return;
    }
    if (jobDescription.trim().length < 50) {
      setErrorMessage("Job description must be at least 50 characters for an accurate analysis.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setIsSaved(false);

    // Progressive step indicator for UX
    const steps = [
      "Extracting text from uploaded resume...",
      "Analyzing job description & core requirements...",
      "Matching candidate qualifications without fabricating credentials...",
      "Generating ATS-optimized tailored summary and experience bullets...",
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setLoadingStep(steps[stepIndex]);
    }, 2200);

    try {
      const result = await customizeResume(
        file,
        jobDescription,
        {
          customizeSummary,
          customizeSkills,
          customizeExperience,
        },
        token
      );
      setTailoredResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTailoredResult(null);
    setErrorMessage(null);
    setIsSaved(false);
  };

  const handleSaveToHistory = async () => {
    if (!tailoredResult) return;
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const jdFirstLine = jobDescription.split("\n")[0].trim().slice(0, 40);
      const title = `${tailoredResult.candidate_name || "Tailored"} - ${jdFirstLine || "Customized Resume"}`;
      await saveHistory(token, {
        title,
        job_description: jobDescription,
        target_role: jdFirstLine || "Target Position",
        tailored_result: tailoredResult,
      });
      setIsSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save history";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadHistory = (detail: CustomizationHistoryDetail) => {
    setTailoredResult(detail.tailored_result);
    setJobDescription(detail.job_description);
    setIsSaved(true);
    window.scrollTo({ top: 150, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Header onOpenHistory={() => setIsHistoryDrawerOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <div className="mb-8 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>Next-Gen Full Stack Resume Customizer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tailor Your Resume to Any Job in Seconds
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Powered by FastAPI and Gemini AI. Rephrases experience, matches core skills,
            and pinpoints missing keywords with strict anti-fabrication standards.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="text-sm">
              <p className="font-bold">Customization Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Two-Column Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Inputs & Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Job & Resume Setup
                </h2>
                {tailoredResult && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset Form
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <ResumeUpload file={file} onFileSelect={setFile} />

                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                />

                <SectionControls
                  customizeSummary={customizeSummary}
                  setCustomizeSummary={setCustomizeSummary}
                  customizeSkills={customizeSkills}
                  setCustomizeSkills={setCustomizeSkills}
                  customizeExperience={customizeExperience}
                  setCustomizeExperience={setCustomizeExperience}
                />

                <div className="pt-2">
                  <button
                    id="submit-customize-btn"
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                      canSubmit
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 hover:shadow-blue-500/30 scale-[1.01]"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{loadingStep}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Tailor Resume for this Job</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quality Standards Card */}
            <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Executive Recruiter Standards</span>
              </div>
              <ul className="space-y-1 pl-4 list-disc text-[11px] leading-relaxed">
                <li>Strict factual accuracy — no fake companies, degrees, or tools.</li>
                <li>Missing job keywords are provided as transparent gap recommendations.</li>
                <li>ReportLab executive PDF & Microsoft Word DOCX formatting.</li>
                <li>Persistent history saved securely with Supabase Row Level Security.</li>
              </ul>
            </div>
          </div>

          {/* RIGHT: Tailored Resume or Empty Placeholder (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {tailoredResult ? (
              <>
                {/* Save to History Action Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {tailoredResult.candidate_name}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Tailoring Complete
                    </span>
                  </div>

                  <button
                    onClick={handleSaveToHistory}
                    disabled={isSaving || isSaved}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSaved
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : isSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Saved in History</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save to History</span>
                      </>
                    )}
                  </button>
                </div>

                <TailoredResumeView resume={tailoredResult} />
              </>
            ) : (
              <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Your Tailored Resume Will Appear Here
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  Upload your resume on the left, paste the target job description, and click
                  &quot;Tailor Resume&quot; to review your customized output.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Step 1
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      PDF/DOCX Parse
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Extracts genuine candidate history.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Step 2
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      LLM Matching
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rephrases bullets and highlights skills.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Step 3
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      1-Click Export & Save
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Download PDF, Word, or save to history.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Resume Customizer AI Assessment Project</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Next.js App Router
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              FastAPI
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Gemini AI
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Supabase Auth & RLS
            </span>
          </div>
        </div>
      </footer>

      {/* Slide-over Resume History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onLoadHistory={handleLoadHistory}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
