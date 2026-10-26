"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Bookmark,
  Check,
  Loader2,
  GitBranch,
  Target,
  Edit3,
  Layers,
  FileText,
  Sliders,
} from "lucide-react";
import Header from "@/components/Header";
import ResumeUpload from "@/components/ResumeUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import SectionControls from "@/components/SectionControls";
import OptimizationDashboard from "@/components/OptimizationDashboard";
import InteractiveResumeEditor from "@/components/InteractiveResumeEditor";
import DiffView from "@/components/DiffView";
import CoverLetterView from "@/components/CoverLetterView";
import HistoryDrawer from "@/components/HistoryDrawer";
import AuthModal from "@/components/AuthModal";
import SaveVersionModal from "@/components/SaveVersionModal";
import {
  customizeResume,
  saveHistory,
  downloadExport,
} from "@/lib/api";
import {
  TailoredResumeResponse,
  CustomizationHistoryDetail,
  MatchScoreBreakdown,
  OptimizationRecommendation,
} from "@/types/resume";
import { useAuth } from "@/context/AuthContext";

type WorkspaceTab = "editor" | "audit" | "diff" | "cover-letter";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Analyzing documents...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResponse | null>(null);

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("editor");

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

  // Versioning state
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
        typeof window !== "undefined" &&
        !window.confirm(
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

    // 6 Meaningful Processing Stages
    const steps = [
      "Stage 1/6: Reading & validating candidate resume document...",
      "Stage 2/6: Parsing job description & extracting key competencies...",
      "Stage 3/6: Evaluating multi-factor ATS alignment & keyword coverage...",
      "Stage 4/6: Generating evidence-grounded role optimizations...",
      "Stage 5/6: Validating factual integrity against source resume...",
      "Stage 6/6: Finalizing interactive studio workspace...",
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
      setActiveTab("editor");
      // Smooth scroll to results
      setTimeout(() => {
        const el = document.getElementById("studio-workspace-section");
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth" });
        }
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
        typeof window !== "undefined" &&
        !window.confirm(
          "You have unsaved changes in your active tailored resume. Resetting will discard these changes. Continue?"
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

  const handleOpenSaveModal = (currentDraft?: TailoredResumeResponse) => {
    if (currentDraft) {
      setTailoredResult(currentDraft);
    }
    if (!tailoredResult && !currentDraft) return;
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
      typeof window !== "undefined" &&
      window.confirm(
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
        typeof window !== "undefined" &&
        !window.confirm(
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
    setActiveTab("editor");
    setTimeout(() => {
      const el = document.getElementById("studio-workspace-section");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Sync score updates when user re-checks score in the Interactive Resume Editor
  const handleScoreUpdated = (
    updatedScore: number,
    breakdown: MatchScoreBreakdown,
    recommendations: OptimizationRecommendation[]
  ) => {
    if (!tailoredResult) return;
    setTailoredResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        match_score: updatedScore,
        match_breakdown: breakdown,
        recommendations: recommendations,
        ats_compatibility: {
          ...prev.ats_compatibility,
          score: updatedScore,
        },
      };
    });
  };

  // Direct export handler for current draft
  const handleExportDraft = async (
    format: "pdf" | "docx" | "txt",
    currentDraft: TailoredResumeResponse
  ) => {
    try {
      const result = await downloadExport(currentDraft, format);
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      alert(msg);
    }
  };

  const atsScoreDisplay = tailoredResult
    ? tailoredResult.ats_compatibility?.score ?? tailoredResult.match_score ?? 80
    : 0;

  return (
    <div className="min-h-screen bg-[#F7F2EB] text-[#291B32] flex flex-col font-sans selection:bg-[#C45D39]/20 selection:text-[#291B32] studio-editorial-bg relative overflow-x-hidden">
      {/* Editorial architectural line accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[15%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#C45D39]/12 via-[#291B32]/5 to-transparent" />
        <div className="absolute right-[12%] top-32 w-64 h-88 border border-[#C45D39]/8 rounded-2xl bg-white/[0.04] transform rotate-[-2deg] hidden xl:block shadow-xs" />
        <div className="absolute left-[8%] top-64 w-52 h-72 border border-[#291B32]/6 rounded-2xl bg-white/[0.03] transform rotate-[3deg] hidden xl:block shadow-xs" />
      </div>

      {/* 1. Header and Account Controls */}
      <Header onOpenHistory={() => setIsHistoryDrawerOpen(true)} />

      {/* Primary Centered Vertical Workflow Container */}
      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 relative z-10">
        {/* 2. Hero Section with Radial Glow and Visual Composition */}
        <section className="relative text-center max-w-3xl mx-auto pt-6 pb-2">
          {/* Subtle radial ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C45D39]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] mb-5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C45D39] animate-pulse" />
            <span>AI Resume Studio & Precision ATS Optimization</span>
          </div>

          <h1 className="relative font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#291B32] tracking-tight leading-[1.15]">
            Engineered for High-Impact Roles.{" "}
            <span className="text-[#C45D39]">
              Tailored by True AI.
            </span>
          </h1>

          <p className="relative mt-4 text-sm sm:text-base text-[#674E61] leading-relaxed max-w-2xl mx-auto">
            Analyze job descriptions against authentic candidate evidence. Align hard skills,
            enhance experience bullets inline with grounded AI suggestions, and re-check scores in real time.
          </p>

          {/* Quick Jump Action Bar */}
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#upload-resume-section"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#C45D39] hover:bg-[#B34E2C] active:bg-[#9E4324] text-white shadow-md shadow-[#C45D39]/25 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#capabilities-section"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white hover:bg-[#F7F2EB] text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32] shadow-xs transition-all"
            >
              <Layers className="w-4 h-4 text-[#C45D39]" />
              <span>Studio Capabilities</span>
            </a>
          </div>

          {/* Workflow Sequence Indicator */}
          <div className="relative mt-10 inline-flex flex-wrap items-center justify-center gap-2.5 text-xs font-semibold text-[#674E61] bg-white border border-[#DDD0D7] px-4 py-2.5 rounded-2xl shadow-xs">
            <span className="text-[#291B32] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E8D9E8] text-[#291B32] flex items-center justify-center font-bold text-[10px] font-mono border border-[#DDD0D7]">
                01
              </span>
              <span>Upload Resume</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C45D39]/60" />
            <span className="text-[#291B32] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E8D9E8] text-[#291B32] flex items-center justify-center font-bold text-[10px] font-mono border border-[#DDD0D7]">
                02
              </span>
              <span>Target JD</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C45D39]/60" />
            <span className="text-[#291B32] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E8D9E8] text-[#291B32] flex items-center justify-center font-bold text-[10px] font-mono border border-[#DDD0D7]">
                03
              </span>
              <span>Preferences</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C45D39]/60" />
            <span className="text-[#291B32] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#E8D9E8] text-[#291B32] flex items-center justify-center font-bold text-[10px] font-mono border border-[#DDD0D7]">
                04
              </span>
              <span>Interactive Studio</span>
            </span>
          </div>
        </section>

        {/* 3. Product Capability Overview (3 Professional Cards) */}
        <section id="capabilities-section" className="space-y-4 pt-2">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-[#C45D39]">
              Commercial-Grade Platform
            </h2>
            <p className="font-heading text-xl sm:text-2xl font-bold text-[#291B32] mt-1">
              End-to-End Optimization Architecture
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-[#DDD0D7] hover:border-[#C45D39]/50 transition-all group shadow-xs hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FBEFEA] border border-[#C45D39]/20 flex items-center justify-center text-[#C45D39] mb-4 group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#291B32]">
                ATS & Alignment Audit
              </h3>
              <p className="text-xs text-[#674E61] mt-2 leading-relaxed">
                6-factor mathematical scoring with granular skill breakdowns, keyword density evaluation, and prioritized gap recommendations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#DDD0D7] hover:border-[#C45D39]/50 transition-all group shadow-xs hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FBEFEA] border border-[#C45D39]/20 flex items-center justify-center text-[#C45D39] mb-4 group-hover:scale-105 transition-transform">
                <Edit3 className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#291B32]">
                Interactive Studio & AI Improve
              </h3>
              <p className="text-xs text-[#674E61] mt-2 leading-relaxed">
                Inline resume editing with one-click AI bullet enhancement, side-by-side accept/reject suggestions, and live score recalculation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#DDD0D7] hover:border-[#C45D39]/50 transition-all group shadow-xs hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#FBEFEA] border border-[#C45D39]/20 flex items-center justify-center text-[#C45D39] mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-base font-bold text-[#291B32]">
                Versioning Hub & Multi-Export
              </h3>
              <p className="text-xs text-[#674E61] mt-2 leading-relaxed">
                Branching revision families backed by Supabase RLS. Generate executive ReportLab PDFs, Word DOCX, and plain text anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-sm">
              <p className="font-bold">Customization Error</p>
              <p className="mt-0.5 text-xs text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 4. Upload Resume Section */}
        <section id="upload-resume-section" className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] uppercase tracking-wider font-mono">
                Step 1
              </span>
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#291B32]">
                Upload Candidate Resume
              </h2>
            </div>
            <span className="text-xs text-[#674E61] hidden sm:inline">
              PDF (.pdf) & Word (.docx) supported
            </span>
          </div>
          <ResumeUpload file={file} onFileSelect={setFile} error={null} />
        </section>

        {/* 5. Target Job Description Section */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] uppercase tracking-wider font-mono">
                Step 2
              </span>
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#291B32]">
                Target Job Description
              </h2>
            </div>
            <span className="text-xs text-[#674E61] hidden sm:inline">
              Extracts competencies & required qualifications
            </span>
          </div>
          <JobDescriptionInput
            value={jobDescription}
            onChange={handleJobDescriptionChange}
          />
        </section>

        {/* 6. Customization Preferences Section */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] uppercase tracking-wider font-mono">
                Step 3
              </span>
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#291B32]">
                Customization Preferences
              </h2>
            </div>
            <span className="text-xs text-[#674E61] hidden sm:inline">
              Control which sections are tuned by AI
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

        {/* 7. Run AI Optimization Section */}
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD0D7]">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] uppercase tracking-wider font-mono">
                Step 4
              </span>
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#291B32]">
                Run AI Optimization
              </h2>
            </div>
            {tailoredResult && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#C45D39] hover:text-[#B34E2C] flex items-center gap-1 font-semibold transition-colors"
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
              className={`w-full py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-[#C45D39] ${
                canSubmit
                  ? "bg-[#C45D39] hover:bg-[#B34E2C] active:bg-[#9E4324] text-white cursor-pointer shadow-[#C45D39]/25 hover:shadow-[#C45D39]/40"
                  : "bg-[#E8D9E8]/40 text-[#8F7589] border border-[#DDD0D7] cursor-not-allowed shadow-none"
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
          <div className="p-4 rounded-xl bg-[#291B32] border border-[#4A355A] text-xs text-[#DDD0D7] space-y-2 shadow-md">
            <div className="font-bold text-[#FAF6F2] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C45D39]" />
              <span>Anti-Hallucination & Factual Integrity Safeguards</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px] leading-relaxed text-[#DDD0D7]">
              <li>Factual verification: Never invents employers, dates, credentials, or metrics.</li>
              <li>Missing criteria are reported as actionable candidate gaps, not falsely hallucinated.</li>
              <li>Inline AI Improve suggestions require explicit user acceptance before updating the draft.</li>
              <li>Version lineage preserves historical snapshots immutably with Supabase RLS.</li>
            </ul>
          </div>
        </section>

        {/* 8 - 13: Results Studio Workspace */}
        {tailoredResult ? (
          <section id="studio-workspace-section" className="space-y-6 pt-4 scroll-mt-20">
            {/* Version Lineage & Status Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#FBEFEA] text-[#C45D39] border border-[#C45D39]/20">
                  <GitBranch className="w-4 h-4" />
                </div>
                {activeVersionId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#674E61]">Active:</span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7F2EB] text-[#291B32] border border-[#DDD0D7]">
                      {activeVersionName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#E8D9E8] text-[#291B32]">
                      v{activeVersionNumber ?? 1}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-[#291B32]">
                    Draft Resume (Unsaved)
                  </span>
                )}

                {isDirty ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBEFEA] text-[#C45D39] border border-[#C45D39]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39] animate-pulse" />
                    <span>Unsaved Modifications</span>
                  </span>
                ) : activeVersionId ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7]">
                    <Check className="w-3 h-3 text-[#C45D39]" />
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
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#674E61] hover:text-[#291B32] hover:bg-[#F7F2EB] border border-[#DDD0D7] transition-colors"
                  >
                    Detach Family
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenSaveModal()}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#291B32] hover:bg-[#3B2848] active:bg-[#1F1426] text-[#FAF6F2] shadow-xs transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : isDirty ? (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-[#C45D39]" />
                      <span>{activeVersionId ? "Save New Revision" : "Save as Version"}</span>
                    </>
                  ) : isSaved ? (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-[#C45D39]" />
                      <span>Save Another Revision</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-[#C45D39]" />
                      <span>Save Version</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Immutable Version Warning Notice */}
            {activeVersionId && isDirty && (
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Active snapshot <strong>{activeVersionName}</strong> is preserved and immutable. Saving creates a new tracked revision without overwriting past history.
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#DDD0D7] pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                  activeTab === "editor"
                    ? "bg-[#291B32] text-white shadow-xs"
                    : "bg-white text-[#674E61] hover:text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32]"
                }`}
              >
                <Edit3 className="w-4 h-4 text-[#C45D39]" />
                <span>Interactive Resume Studio</span>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-[#C45D39]" title="Unsaved edits" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                  activeTab === "audit"
                    ? "bg-[#291B32] text-white shadow-xs"
                    : "bg-white text-[#674E61] hover:text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32]"
                }`}
              >
                <Target className="w-4 h-4 text-[#C45D39]" />
                <span>ATS & Alignment Audit</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-[#E8D9E8] text-[#291B32] border border-[#DDD0D7] font-mono">
                  {atsScoreDisplay}%
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("diff")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                  activeTab === "diff"
                    ? "bg-[#291B32] text-white shadow-xs"
                    : "bg-white text-[#674E61] hover:text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32]"
                }`}
              >
                <Sliders className="w-4 h-4 text-[#C45D39]" />
                <span>Change Diff Analysis</span>
              </button>

              {tailoredResult.generated_cover_letter && (
                <button
                  type="button"
                  onClick={() => setActiveTab("cover-letter")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 ${
                    activeTab === "cover-letter"
                      ? "bg-[#291B32] text-white shadow-xs"
                      : "bg-white text-[#674E61] hover:text-[#291B32] border border-[#DDD0D7] hover:border-[#291B32]"
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#C45D39]" />
                  <span>Cover Letter</span>
                </button>
              )}
            </div>

            {/* Tab 1: Interactive Resume Editor */}
            {activeTab === "editor" && (
              <InteractiveResumeEditor
                resumeData={tailoredResult}
                jobDescription={jobDescription}
                onSaveVersion={handleOpenSaveModal}
                onExport={handleExportDraft}
                onScoreUpdated={handleScoreUpdated}
              />
            )}

            {/* Tab 2: ATS & Alignment Audit Dashboard */}
            {activeTab === "audit" && (
              <OptimizationDashboard resumeData={tailoredResult} />
            )}

            {/* Tab 3: Change Diff View */}
            {activeTab === "diff" && (
              <DiffView resume={tailoredResult} />
            )}

            {/* Tab 4: Cover Letter View */}
            {activeTab === "cover-letter" && tailoredResult.generated_cover_letter && (
              <CoverLetterView resume={tailoredResult} />
            )}
          </section>
        ) : (
          /* Placeholder State Before Optimization */
          <section className="p-8 sm:p-12 rounded-2xl bg-white border border-dashed border-[#DDD0D7] text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FBEFEA] border border-[#C45D39]/20 text-[#C45D39] flex items-center justify-center mb-4 shadow-sm">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-[#291B32]">
              Interactive Studio & ATS Audit Will Launch Here
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[#674E61] max-w-lg leading-relaxed">
              Complete steps 1 through 3 above and click &quot;Tailor Resume for this Job&quot; to inspect your multi-circular score breakdown, edit bullets inline with AI, and download production-ready exports.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
              <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                <span className="text-[10px] font-bold text-[#C45D39] uppercase tracking-wider font-mono">
                  Phase 1
                </span>
                <p className="text-xs font-bold text-[#291B32] mt-1 font-heading">
                  PDF & DOCX Extraction
                </p>
                <p className="text-[11px] text-[#674E61] mt-1 leading-snug">
                  Extracts authentic candidate history with strict anti-fabrication standards.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                <span className="text-[10px] font-bold text-[#C45D39] uppercase tracking-wider font-mono">
                  Phase 2
                </span>
                <p className="text-xs font-bold text-[#291B32] mt-1 font-heading">
                  Explainable ATS Audit
                </p>
                <p className="text-[11px] text-[#674E61] mt-1 leading-snug">
                  Multi-circular scoring metrics, keyword coverage, and role alignment insights.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7]">
                <span className="text-[10px] font-bold text-[#C45D39] uppercase tracking-wider font-mono">
                  Phase 3
                </span>
                <p className="text-xs font-bold text-[#291B32] mt-1 font-heading">
                  Live Studio & Multi-Export
                </p>
                <p className="text-[11px] text-[#674E61] mt-1 leading-snug">
                  Edit inline, AI-improve text, re-check score, and download PDF or DOCX.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 14. Footer */}
      <footer className="mt-auto border-t border-[#DDD0D7] bg-white py-6 text-center text-xs text-[#674E61]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C45D39]" />
            <span className="font-semibold text-[#291B32]">Resume Customizer AI Studio</span>
            <span className="text-[#8F7589]">· Phase 6.3</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#674E61]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39]" />
              Next.js 16 App Router
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39]" />
              FastAPI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39]" />
              Gemini AI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39]" />
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
