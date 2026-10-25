"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Bookmark,
  Check,
  Loader2,
  GitBranch
} from "lucide-react";
import Header from "@/components/Header";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import TailoredResumeView from "@/components/TailoredResumeView";
import SectionControls from "@/components/SectionControls";
import HistoryDrawer from "@/components/HistoryDrawer";
import AuthModal from "@/components/AuthModal";
import SaveVersionModal from "@/components/SaveVersionModal";
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

  // Phase 5A & 5B: Auth & Version Lifecycle State
  const { user, token } = useAuth();
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Phase 5B Versioning state
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [activeVersionName, setActiveVersionName] = useState<string | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

  const canSubmit = Boolean(file) && jobDescription.trim().length >= 50 && !isLoading;

  // Warn before browser window unload when there are unsaved workspace modifications
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && tailoredResult) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, tailoredResult]);

  const handleJobDescriptionChange = (val: string) => {
    setJobDescription(val);
    if (tailoredResult) {
      setIsDirty(true);
      setIsSaved(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDirty && tailoredResult) {
      if (
        !confirm(
          "You have unsaved changes in your active tailored resume. Re-tailoring will overwrite your current workspace. Continue?"
        )
      ) {
        return;
      }
    }
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
      "Stage 1/6: Reading & validating resume document...",
      "Stage 2/6: Analyzing job description & extracting criteria...",
      "Stage 3/6: Evaluating resume alignment & skill coverage...",
      "Stage 4/6: Generating evidence-grounded improvements...",
      "Stage 5/6: Validating output & verifying factual integrity...",
      "Stage 6/6: Preparing explainable optimization results...",
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
      setIsDirty(true);
      // Smooth scroll to results
      setTimeout(() => {
        const el = document.getElementById("workspace-results-section");
        if (el && typeof el.scrollIntoView === "function") { el.scrollIntoView({ behavior: "smooth" }); }
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (isDirty && tailoredResult) {
      if (
        !confirm(
          "You have unsaved changes in your active tailored resume. Resetting the form will discard these changes. Continue?"
        )
      ) {
        return;
      }
    }
    setTailoredResult(null);
    setErrorMessage(null);
    setActiveVersionId(null);
    setActiveVersionName(null);
    setActiveVersionNumber(null);
    setIsDirty(false);
    setIsSaved(false);
  };

  const handleOpenSaveModal = () => {
    if (!tailoredResult) return;
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSaveModalOpen(true);
  };

  const handleSaveVersion = async (options: {
    title: string;
    version_name: string;
    parent_id: string | null;
    version_notes?: string;
    version_tags?: string[];
  }) => {
    if (!tailoredResult || !token) return;

    setIsSaving(true);
    try {
      const jdFirstLine = jobDescription.split("\n")[0].trim().slice(0, 40);
      const created = await saveHistory(token, {
        title: options.title,
        job_description: jobDescription,
        target_role: jdFirstLine || "Target Position",
        tailored_result: tailoredResult,
        version_name: options.version_name,
        parent_id: options.parent_id,
        version_notes: options.version_notes,
        version_tags: options.version_tags,
      });

      setActiveVersionId(created.id);
      setActiveVersionName(created.version_name || created.title);
      setActiveVersionNumber(created.version_number ?? 1);
      setIsDirty(false);
      setIsSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetachActiveVersion = () => {
    if (
      confirm(
        "Detach from this revision family? Your current workspace content will remain, but subsequent saves will create a brand-new independent root (v1)."
      )
    ) {
      setActiveVersionId(null);
      setActiveVersionName(null);
      setActiveVersionNumber(null);
      setIsDirty(true);
      setIsSaved(false);
    }
  };

  const handleLoadHistory = (detail: CustomizationHistoryDetail) => {
    if (isDirty && tailoredResult) {
      if (
        !confirm(
          "You have unsaved changes in your active tailored resume. Loading another version will discard your current modifications. Continue?"
        )
      ) {
        return;
      }
    }
    setTailoredResult(detail.tailored_result);
    setJobDescription(detail.job_description);
    setActiveVersionId(detail.id);
    setActiveVersionName(detail.version_name || detail.title);
    setActiveVersionNumber(detail.version_number ?? 1);
    setIsDirty(false);
    setIsSaved(true);
    window.scrollTo({ top: 150, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] flex flex-col font-sans text-[#15283B]">
      {/* 1. Header and account controls */}
      <Header onOpenHistory={() => setIsHistoryDrawerOpen(true)} />

      {/* Primary centered vertical workflow container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* 2. Hero / introduction section */}
        <section className="text-center max-w-3xl mx-auto pt-2 pb-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#DCEDE5] text-[#087F66] border border-[#087F66]/20 mb-4 shadow-xs">
            <Cpu className="w-3.5 h-3.5" />
            <span>Next-Gen Full Stack Resume Customizer & Optimizer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#15283B] tracking-tight leading-tight">
            Elevate Your Resume for Every Target Role
          </h1>
          <p className="mt-3.5 text-sm sm:text-base text-[#64748B] leading-relaxed max-w-2xl mx-auto">
            Powered by FastAPI and Gemini AI. Rephrases experience, matches core skills,
            and pinpoints missing keywords with strict anti-fabrication standards.
          </p>

          {/* Workflow Sequence Indicator */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#64748B] bg-white border border-[#E2E8E4] px-4 py-2 rounded-xl shadow-xs">
            <span className="text-[#087F66] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DCEDE5] text-[#087F66] flex items-center justify-center font-bold text-[11px]">1</span>
              Upload Resume
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[#087F66] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DCEDE5] text-[#087F66] flex items-center justify-center font-bold text-[11px]">2</span>
              Job Description
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[#087F66] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DCEDE5] text-[#087F66] flex items-center justify-center font-bold text-[11px]">3</span>
              Preferences
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[#087F66] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#DCEDE5] text-[#087F66] flex items-center justify-center font-bold text-[11px]">4</span>
              AI Optimize & Export
            </span>
          </div>
        </section>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-sm">
              <p className="font-bold">Customization Error</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 3. Upload Resume Card */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCEDE5] text-[#087F66] uppercase tracking-wider">
                Step 1
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#15283B]">
                Upload Candidate Resume
              </h2>
            </div>
            <span className="text-xs text-[#64748B] hidden sm:inline">
              Accepts PDF (.pdf) & Word (.docx)
            </span>
          </div>
          <ResumeUpload file={file} onFileSelect={setFile} error={null} />
        </section>

        {/* 4. Paste Job Description Card */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCEDE5] text-[#087F66] uppercase tracking-wider">
                Step 2
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#15283B]">
                Target Job Description
              </h2>
            </div>
            <span className="text-xs text-[#64748B] hidden sm:inline">
              Extracts requirements & skills
            </span>
          </div>
          <JobDescriptionInput
            value={jobDescription}
            onChange={handleJobDescriptionChange}
          />
        </section>

        {/* 5. Tailoring Controls Card */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCEDE5] text-[#087F66] uppercase tracking-wider">
                Step 3
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#15283B]">
                Customization Preferences
              </h2>
            </div>
            <span className="text-xs text-[#64748B] hidden sm:inline">
              Select target sections to optimize
            </span>
          </div>
          <SectionControls
            customizeSummary={customizeSummary}
            setCustomizeSummary={setCustomizeSummary}
            customizeSkills={customizeSkills}
            setCustomizeSkills={setCustomizeSkills}
            customizeExperience={customizeExperience}
            setCustomizeExperience={setCustomizeExperience}
          />
        </section>

        {/* 6. Generate / AI Processing Card */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8E4]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#DCEDE5] text-[#087F66] uppercase tracking-wider">
                Step 4
              </span>
              <h2 className="text-base sm:text-lg font-bold text-[#15283B]">
                Run AI Optimization
              </h2>
            </div>
            {tailoredResult && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#087F66] hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Form
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              id="submit-customize-btn"
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-sm ${
                canSubmit
                  ? "bg-[#087F66] hover:bg-[#066B56] text-white cursor-pointer hover:shadow-md"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>{loadingStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Tailor Resume for this Job</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Quality Standards Card */}
          <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4] text-xs text-[#64748B] space-y-2">
            <div className="font-bold text-[#15283B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#087F66]" />
              <span>Executive Recruiter & Anti-Fabrication Standards</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px] leading-relaxed text-[#64748B]">
              <li>Strict factual accuracy — no fake companies, degrees, tools, or fabricated metrics.</li>
              <li>Missing job keywords are provided as transparent gap recommendations, never invented.</li>
              <li>ReportLab executive PDF & Microsoft Word DOCX formatting standard.</li>
              <li>Persistent revision history secured with Supabase Row Level Security.</li>
            </ul>
          </div>
        </section>

        {/* 7 - 11: Output Workspace Sections (Rendered sequentially full-width when results exist) */}
        {tailoredResult ? (
          <section id="workspace-results-section" className="space-y-8 pt-4 scroll-mt-20">
            {/* Version Family & Lineage Status Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8E4] shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#DCEDE5] text-[#087F66]">
                  <GitBranch className="w-4 h-4" />
                </div>
                {activeVersionId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64748B]">Active:</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F8F7F3] text-[#15283B] border border-[#E2E8E4]">
                      {activeVersionName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#DCEDE5] text-[#087F66]">
                      v{activeVersionNumber ?? 1}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[#15283B]">
                    New Unsaved Tailored Version
                  </span>
                )}

                {isDirty ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Unsaved Modifications</span>
                  </span>
                ) : activeVersionId ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DCEDE5] text-[#087F66] border border-[#087F66]/20">
                    <Check className="w-3 h-3 text-[#087F66]" />
                    <span>Saved Snapshot (Immutable)</span>
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {activeVersionId && (
                  <button
                    type="button"
                    onClick={handleDetachActiveVersion}
                    title="Detach from this revision family to save future modifications as an independent root (v1)"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#15283B] hover:bg-[#F8F7F3] border border-[#E2E8E4] transition-colors"
                  >
                    Detach Family
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#087F66] hover:bg-[#066B56] text-white shadow-sm transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isDirty ? (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{activeVersionId ? "Save New Revision" : "Save as Version"}</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Another Revision</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save Version</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {activeVersionId && isDirty && (
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Active snapshot <strong>{activeVersionName}</strong> is preserved and immutable. Saving creates a new tracked revision without overwriting past history.
              </div>
            )}

            {/* 7 - 11. Full-width Tailored Resume View (Optimization, Document Preview, Diff, Cover Letter, Exports) */}
            <TailoredResumeView resume={tailoredResult} />
          </section>
        ) : (
          /* Placeholder State Before Optimization */
          <section className="p-8 sm:p-12 rounded-2xl bg-white border border-dashed border-[#E2E8E4] text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#DCEDE5] text-[#087F66] flex items-center justify-center mb-4 shadow-xs">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#15283B]">
              Your Tailored Resume & Optimization Analysis Will Appear Here
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[#64748B] max-w-lg leading-relaxed">
              Complete steps 1 through 3 above and click &quot;Tailor Resume for this Job&quot; to review your full-width optimization breakdown, document preview, diff view, and cover letter.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
              <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4]">
                <span className="text-[10px] font-bold text-[#087F66] uppercase">
                  Step 1
                </span>
                <p className="text-xs font-bold text-[#15283B] mt-1">
                  PDF / DOCX Parsing
                </p>
                <p className="text-[11px] text-[#64748B] mt-1 leading-snug">
                  Extracts authentic candidate history with anti-fabrication standards.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4]">
                <span className="text-[10px] font-bold text-[#087F66] uppercase">
                  Step 2
                </span>
                <p className="text-xs font-bold text-[#15283B] mt-1">
                  LLM Matching & Scoring
                </p>
                <p className="text-[11px] text-[#64748B] mt-1 leading-snug">
                  Multi-factor explainable score breakdown and evidence-grounded suggestions.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4]">
                <span className="text-[10px] font-bold text-[#087F66] uppercase">
                  Step 3
                </span>
                <p className="text-xs font-bold text-[#15283B] mt-1">
                  1-Click Export & History
                </p>
                <p className="text-[11px] text-[#64748B] mt-1 leading-snug">
                  Download PDF or DOCX, fork new revisions, and restore past versions.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 12. Footer */}
      <footer className="mt-auto border-t border-[#E2E8E4] bg-white py-5 text-center text-xs text-[#64748B]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-medium text-[#15283B]">Resume Customizer AI Assessment Project</span>
          <div className="flex items-center gap-3.5 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#087F66]" />
              Next.js 16 App Router
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#087F66]" />
              FastAPI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#087F66]" />
              Gemini AI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#087F66]" />
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

      {/* Save Resume Version Modal */}
      {tailoredResult && (
        <SaveVersionModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          candidateName={tailoredResult.candidate_name}
          jobDescription={jobDescription}
          activeVersionId={activeVersionId}
          activeVersionName={activeVersionName}
          activeVersionNumber={activeVersionNumber}
          isSaving={isSaving}
          onSave={handleSaveVersion}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
