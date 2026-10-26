"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  FileDown,
  Eye,
  Edit2,
  Check,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  User,
  Wrench,
  ChevronDown,
  ShieldCheck,
  XCircle,
  X,
} from "lucide-react";
import {
  TailoredResumeResponse,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  MatchScoreBreakdown,
  OptimizationRecommendation,
} from "@/types/resume";
import { recheckResumeScore, auditResume, ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import AIImproveModal from "@/components/AIImproveModal";

export interface InteractiveResumeEditorProps {
  resumeData: TailoredResumeResponse;
  jobDescription: string;
  onSaveVersion: (currentDraft: TailoredResumeResponse) => void;
  onExport: (format: "pdf" | "docx" | "txt", currentDraft: TailoredResumeResponse) => void;
  onScoreUpdated?: (
    updatedScore: number,
    breakdown: MatchScoreBreakdown,
    recommendations: OptimizationRecommendation[]
  ) => void;
}

export const InteractiveResumeEditor: React.FC<InteractiveResumeEditorProps> = ({
  resumeData,
  jobDescription,
  onSaveVersion,
  onExport,
  onScoreUpdated,
}) => {
  // Deep clone initial resume to avoid mutating parent props
  const [draft, setDraft] = useState<TailoredResumeResponse>(() =>
    resumeData ? JSON.parse(JSON.stringify(resumeData)) : ({} as TailoredResumeResponse)
  );
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");
  const [isScoreStale, setIsScoreStale] = useState<boolean>(false);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);

  // Phase 6.2: Audit and Dual-Score Modal States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [showDualScoreModal, setShowDualScoreModal] = useState<boolean>(false);

  // New skill input states
  const [newMatchingSkill, setNewMatchingSkill] = useState<string>("");
  const [newAdditionalSkill, setNewAdditionalSkill] = useState<string>("");
  const [newCert, setNewCert] = useState<string>("");

  // AI Improve Modal Target State
  const [aiTarget, setAiTarget] = useState<{
    text: string;
    sectionType: "summary" | "experience" | "project";
    context?: string;
    onApply: (improved: string) => void;
  } | null>(null);

  // Detect fresher candidate profile for adaptive section ordering
  const isFresher = useMemo(() => {
    if (!draft.experience || draft.experience.length === 0) return true;
    if (draft.experience.length === 1) {
      const role = (draft.experience[0].role || "").toLowerCase();
      if (["intern", "student", "trainee", "fellow", "apprentice"].some((w) => role.includes(w))) {
        return true;
      }
      if (draft.projects && draft.projects.length >= 2) {
        return true;
      }
    }
    return false;
  }, [draft.experience, draft.projects]);

  // Update draft whenever parent resumeData completely resets (e.g. from version restore)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(JSON.parse(JSON.stringify(resumeData)));
    setIsScoreStale(false);
    setRecheckMessage(null);
  }, [resumeData]);

  // Compute modified status
  const isModified = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(resumeData);
  }, [draft, resumeData]);

  const handleFieldChange = (field: string, value: unknown) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsScoreStale(true);
  };

  const handleContactChange = (field: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value,
      },
    }));
    setIsScoreStale(true);
  };

  // --- Skills Handlers ---
  const handleAddMatchingSkill = () => {
    const trimmed = newMatchingSkill.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        matching_skills: [...prev.skills.matching_skills, trimmed],
      },
    }));
    setNewMatchingSkill("");
    setIsScoreStale(true);
  };

  const handleRemoveMatchingSkill = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        matching_skills: prev.skills.matching_skills.filter((_, i) => i !== index),
      },
    }));
    setIsScoreStale(true);
  };

  const handleAddAdditionalSkill = () => {
    const trimmed = newAdditionalSkill.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        additional_skills: [...prev.skills.additional_skills, trimmed],
      },
    }));
    setNewAdditionalSkill("");
    setIsScoreStale(true);
  };

  const handleRemoveAdditionalSkill = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        additional_skills: prev.skills.additional_skills.filter((_, i) => i !== index),
      },
    }));
    setIsScoreStale(true);
  };

  // --- Experience Handlers ---
  const handleUpdateExperience = (expIndex: number, field: keyof ExperienceItem, val: string | string[]) => {
    setDraft((prev) => {
      const updated = [...prev.experience];
      updated[expIndex] = { ...updated[expIndex], [field]: val };
      return { ...prev, experience: updated };
    });
    setIsScoreStale(true);
  };

  const handleUpdateBullet = (expIndex: number, bulletIndex: number, val: string) => {
    setDraft((prev) => {
      const updated = [...prev.experience];
      const newBullets = [...updated[expIndex].bullets];
      newBullets[bulletIndex] = val;
      updated[expIndex] = { ...updated[expIndex], bullets: newBullets };
      return { ...prev, experience: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddBullet = (expIndex: number) => {
    setDraft((prev) => {
      const updated = [...prev.experience];
      updated[expIndex] = {
        ...updated[expIndex],
        bullets: [...updated[expIndex].bullets, "Engineered and delivered scalable features aligned with role requirements."],
      };
      return { ...prev, experience: updated };
    });
    setIsScoreStale(true);
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    setDraft((prev) => {
      const updated = [...prev.experience];
      updated[expIndex] = {
        ...updated[expIndex],
        bullets: updated[expIndex].bullets.filter((_, i) => i !== bulletIndex),
      };
      return { ...prev, experience: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddPosition = () => {
    const newPos: ExperienceItem = {
      role: "Software Engineer",
      company: "Company Name",
      duration: "2022 - 2024",
      location: "Remote",
      bullets: ["Architected and delivered reliable production software solutions."],
    };
    setDraft((prev) => ({
      ...prev,
      experience: [newPos, ...prev.experience],
    }));
    setIsScoreStale(true);
  };

  const handleRemovePosition = (expIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== expIndex),
    }));
    setIsScoreStale(true);
  };

  // --- Education Handlers ---
  const handleUpdateEducation = (eduIndex: number, field: keyof EducationItem, val: string) => {
    setDraft((prev) => {
      const updated = [...prev.education];
      updated[eduIndex] = { ...updated[eduIndex], [field]: val };
      return { ...prev, education: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddEducation = () => {
    const newEdu: EducationItem = {
      degree: "B.S. in Computer Science",
      institution: "University",
      year: "Graduated",
      details: "Relevant Coursework in Distributed Systems",
    };
    setDraft((prev) => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
    setIsScoreStale(true);
  };

  const handleRemoveEducation = (eduIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== eduIndex),
    }));
    setIsScoreStale(true);
  };

  // --- Projects Handlers ---
  const handleUpdateProject = (projIndex: number, field: keyof ProjectItem, val: string | string[]) => {
    setDraft((prev) => {
      const updated = [...prev.projects];
      updated[projIndex] = { ...updated[projIndex], [field]: val };
      return { ...prev, projects: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddProject = () => {
    const newProj: ProjectItem = {
      name: "New Software Project",
      technologies: ["React", "FastAPI"],
      bullets: ["Designed and implemented full-stack production application."],
      link: "https://github.com/project",
    };
    setDraft((prev) => ({
      ...prev,
      projects: [...prev.projects, newProj],
    }));
    setIsScoreStale(true);
  };

  const handleRemoveProject = (projIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== projIndex),
    }));
    setIsScoreStale(true);
  };

  // --- Certifications Handlers ---
  const handleAddCert = () => {
    const trimmed = newCert.trim();
    if (!trimmed) return;
    setDraft((prev) => ({
      ...prev,
      certifications: [...prev.certifications, trimmed],
    }));
    setNewCert("");
    setIsScoreStale(true);
  };

  const handleRemoveCert = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
    setIsScoreStale(true);
  };

  // --- Re-check Score Workflow ---
  const handleRecheckScore = async () => {
    setIsRechecking(true);
    setRecheckMessage(null);
    try {
      const res = await recheckResumeScore({
        resume_data: draft,
        job_description: jobDescription,
        previous_score: draft.match_score,
        previous_breakdown: draft.match_breakdown,
      });

      // Update draft with fresh score, breakdown, and audit
      setDraft((prev) => ({
        ...prev,
        match_score: res.match_score,
        ats_compatibility: res.ats_compatibility,
        match_breakdown: res.match_breakdown,
        recommendations: res.recommendations,
        missing_keywords: res.missing_keywords,
        audit: res.audit ?? prev.audit,
        ats_quality_assessment: res.ats_quality_assessment ?? prev.ats_quality_assessment,
      }));

      setIsScoreStale(false);
      setShowDualScoreModal(true);
      const sign = res.score_delta > 0 ? `+${res.score_delta}` : `${res.score_delta}`;
      setRecheckMessage(
        res.score_delta !== 0
          ? `Score re-checked! Match changed from ${draft.match_score}% → ${res.match_score}% (${sign}%).`
          : `Score re-checked! Match score remains optimal at ${res.match_score}%.`
      );

      if (onScoreUpdated) {
        onScoreUpdated(res.match_score, res.match_breakdown, res.recommendations);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to re-check score.";
      setRecheckMessage(`Error: ${msg}`);
    } finally {
      setIsRechecking(false);
    }
  };

  // --- Run Resume Quality Audit Workflow ---
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const auditRes = await auditResume(draft, jobDescription);
      setDraft((prev) => ({ ...prev, audit: auditRes }));
      setIsAuditModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to run resume audit.";
      alert(msg);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleResetToBaseline = () => {
    if (window.confirm("Discard all unsaved edits and restore initial tailored resume?")) {
      setDraft(JSON.parse(JSON.stringify(resumeData)));
      setIsScoreStale(false);
      setRecheckMessage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Action Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Mode toggle & Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-[#0B101A] border border-[#30384B]">
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "editor"
                  ? "bg-[#7C4DFF] text-white shadow-md shadow-[#7C4DFF]/30"
                  : "text-[#B8B9D0] hover:text-[#F7F7FA]"
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Interactive Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "preview"
                  ? "bg-[#7C4DFF] text-white shadow-md shadow-[#7C4DFF]/30"
                  : "text-[#B8B9D0] hover:text-[#F7F7FA]"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Document Preview</span>
            </button>
          </div>

          {/* Draft Modification Status */}
          {isModified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2C224B] border border-[#7C4DFF]/40 text-xs font-semibold text-[#B89AFF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C4DFF] animate-pulse" />
              Unsaved Draft Edits
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2231] border border-[#30384B] text-xs font-semibold text-[#B8B9D0]">
              <Check className="w-3.5 h-3.5 text-[#B89AFF]" />
              Draft In Sync
            </span>
          )}

          {/* Score Stale Alert */}
          {isScoreStale && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Score Stale (Edits made)
            </span>
          )}
        </div>

        {/* Right: Actions (ATS Audit, Re-check, Discard, Save Version, Export) */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* ATS Quality Audit Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunAudit}
            isLoading={isAuditing}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-[#7C4DFF]" />}
          >
            <span>ATS Audit</span>
            {draft.audit ? (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  draft.audit.errors.length > 0
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-[#2C224B] text-[#B89AFF]"
                }`}
              >
                {draft.audit.overall_score}%
              </span>
            ) : null}
          </Button>

          {/* Re-check Score Button */}
          <Button
            variant="ai"
            size="sm"
            onClick={handleRecheckScore}
            isLoading={isRechecking}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? "animate-spin" : ""}`} />}
          >
            Re-check Score
          </Button>

          {/* Discard Edits */}
          {isModified && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToBaseline}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Discard Edits
            </Button>
          )}

          {/* Save Version */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSaveVersion(draft)}
            icon={<Save className="w-3.5 h-3.5 text-[#FDBB83]" />}
          >
            Save as Version
          </Button>

          {/* Export Actions Dropdown */}
          <div className="relative group">
            <Button
              variant="editing"
              size="sm"
              icon={<FileDown className="w-3.5 h-3.5 text-[#B89AFF]" />}
            >
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
            </Button>
            <div className="absolute right-0 mt-1 w-36 py-1 bg-[#1B2231] border border-[#30384B] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                type="button"
                onClick={() => onExport("pdf", draft)}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#F7F7FA] hover:bg-[#2C224B] hover:text-[#B89AFF] flex items-center justify-between"
              >
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => onExport("docx", draft)}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#F7F7FA] hover:bg-[#2C224B] hover:text-[#B89AFF] flex items-center justify-between"
              >
                <span>Word (DOCX)</span>
              </button>
              <button
                type="button"
                onClick={() => onExport("txt", draft)}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#F7F7FA] hover:bg-[#2C224B] hover:text-[#B89AFF] flex items-center justify-between"
              >
                <span>Plain Text (TXT)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recheck Feedback Banner */}
      {recheckMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            recheckMessage.startsWith("Error")
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-[#2C224B]/60 border-[#7C4DFF]/40 text-[#B89AFF]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C4DFF]" />
            <span>{recheckMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecheckMessage(null)}
            className="text-[#B8B9D0] hover:text-[#F7F7FA]"
          >
            ×
          </button>
        </div>
      )}

      {/* VIEW MODE 1: INTERACTIVE EDITOR */}
      {viewMode === "editor" ? (
        <div className="space-y-6">
          {/* Section 1: Candidate Contact Info */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#7C4DFF]" />
                <h3 className="font-heading font-bold text-sm text-[#F7F7FA]">
                  {draft.candidate_name || "Candidate Information & Contact"}
                </h3>
              </div>
              <span className="text-[11px] text-[#B8B9D0]">Contact & Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={draft.candidate_name}
                  onChange={(e) => handleFieldChange("candidate_name", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.contact_info?.email || ""}
                  onChange={(e) => handleContactChange("email", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={draft.contact_info?.phone || ""}
                  onChange={(e) => handleContactChange("phone", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={draft.contact_info?.location || ""}
                  onChange={(e) => handleContactChange("location", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  value={draft.contact_info?.linkedin || ""}
                  onChange={(e) => handleContactChange("linkedin", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0] mb-1">
                  GitHub / Portfolio
                </label>
                <input
                  type="text"
                  value={draft.contact_info?.github || draft.contact_info?.portfolio || ""}
                  onChange={(e) => handleContactChange("github", e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional Summary */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C4DFF]" />
                <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                  Professional Summary
                </h4>
              </div>

              <Button
                variant="ai"
                size="sm"
                onClick={() =>
                  setAiTarget({
                    text: draft.tailored_summary,
                    sectionType: "summary",
                    context: `Target Role: ${draft.job_analysis?.target_role || "Software Engineer"}`,
                    onApply: (improved) => handleFieldChange("tailored_summary", improved),
                  })
                }
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                AI Improve Summary
              </Button>
            </div>

            <textarea
              rows={4}
              value={draft.tailored_summary}
              onChange={(e) => handleFieldChange("tailored_summary", e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-sm text-[#F7F7FA] leading-relaxed focus:outline-none focus:border-[#7C4DFF] focus:ring-1 focus:ring-[#7C4DFF] resize-y"
              placeholder="Enter your tailored professional summary..."
            />
          </div>

          {/* Section 3: Technical Skills */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
              <Wrench className="w-4 h-4 text-[#7C4DFF]" />
              <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                Technical Skills & Competencies
              </h4>
            </div>

            {/* Matching Skills */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B89AFF]">
                Role-Matching Skills
              </span>
              <div className="flex flex-wrap gap-2">
                {draft.skills.matching_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2C224B] border border-[#7C4DFF]/40 text-xs font-medium text-[#F7F7FA]"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMatchingSkill(idx)}
                      className="text-[#B8B9D0] hover:text-rose-400 p-0.5 rounded"
                      aria-label={`Remove ${skill}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Add matching skill inline */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newMatchingSkill}
                    onChange={(e) => setNewMatchingSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMatchingSkill()}
                    placeholder="+ Add Skill"
                    className="px-3 py-1.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] placeholder:text-[#B8B9D0]/60 focus:outline-none focus:border-[#7C4DFF] w-28"
                  />
                  {newMatchingSkill.trim() && (
                    <Button variant="ai" size="sm" onClick={handleAddMatchingSkill}>
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Skills */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0]">
                Additional & Foundational Skills
              </span>
              <div className="flex flex-wrap gap-2">
                {draft.skills.additional_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B2231] border border-[#30384B] text-xs font-medium text-[#B8B9D0]"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalSkill(idx)}
                      className="text-[#B8B9D0] hover:text-rose-400 p-0.5 rounded"
                      aria-label={`Remove ${skill}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Add additional skill inline */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newAdditionalSkill}
                    onChange={(e) => setNewAdditionalSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAdditionalSkill()}
                    placeholder="+ Add Additional"
                    className="px-3 py-1.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] placeholder:text-[#B8B9D0]/60 focus:outline-none focus:border-[#7C4DFF] w-32"
                  />
                  {newAdditionalSkill.trim() && (
                    <Button variant="secondary" size="sm" onClick={handleAddAdditionalSkill}>
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Work Experience */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#7C4DFF]" />
                <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                  Professional Experience
                </h4>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddPosition}
                icon={<Plus className="w-3.5 h-3.5 text-[#7C4DFF]" />}
              >
                Add Position
              </Button>
            </div>

            <div className="space-y-6">
              {draft.experience.map((exp, expIdx) => (
                <div
                  key={expIdx}
                  className="p-5 rounded-xl bg-[#1B2231]/70 border border-[#30384B] space-y-4"
                >
                  {/* Position metadata row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#30384B]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => handleUpdateExperience(expIdx, "role", e.target.value)}
                        placeholder="Job Title / Role"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs font-bold text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => handleUpdateExperience(expIdx, "company", e.target.value)}
                        placeholder="Company"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <input
                        type="text"
                        value={exp.duration || ""}
                        onChange={(e) => handleUpdateExperience(expIdx, "duration", e.target.value)}
                        placeholder="Dates / Duration"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <input
                        type="text"
                        value={exp.location || ""}
                        onChange={(e) => handleUpdateExperience(expIdx, "location", e.target.value)}
                        placeholder="Location"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0] focus:outline-none focus:border-[#7C4DFF]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePosition(expIdx)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 self-end sm:self-center"
                      title="Delete Position"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bullet points */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8B9D0]">
                      Key Accomplishments & Bullets
                    </span>

                    {exp.bullets.map((bullet, bulletIdx) => (
                      <div key={bulletIdx} className="flex items-start gap-2">
                        <textarea
                          rows={2}
                          value={bullet}
                          onChange={(e) => handleUpdateBullet(expIdx, bulletIdx, e.target.value)}
                          className="flex-1 p-2.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] leading-relaxed focus:outline-none focus:border-[#7C4DFF] resize-y"
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setAiTarget({
                                text: bullet,
                                sectionType: "experience",
                                context: `${exp.role} at ${exp.company}`,
                                onApply: (improved) => handleUpdateBullet(expIdx, bulletIdx, improved),
                              })
                            }
                            className="p-2 rounded-lg bg-[#2C224B] border border-[#7C4DFF]/30 text-[#B89AFF] hover:bg-[#7C4DFF] hover:text-white transition-colors"
                            title="AI Improve this bullet"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(expIdx, bulletIdx)}
                            className="p-2 rounded-lg bg-[#1B2231] border border-[#30384B] text-[#B8B9D0] hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                            title="Delete bullet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddBullet(expIdx)}
                      icon={<Plus className="w-3 h-3 text-[#7C4DFF]" />}
                    >
                      Add Bullet Point
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Projects */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#7C4DFF]" />
                <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                  Projects & Technical Case Studies
                </h4>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddProject}
                icon={<Plus className="w-3.5 h-3.5 text-[#7C4DFF]" />}
              >
                Add Project
              </Button>
            </div>

            <div className="space-y-4">
              {draft.projects.map((proj, projIdx) => (
                <div
                  key={projIdx}
                  className="p-4 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
                      <input
                        type="text"
                        value={proj.name}
                        onChange={(e) => handleUpdateProject(projIdx, "name", e.target.value)}
                        placeholder="Project Name"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs font-bold text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <input
                        type="text"
                        value={proj.technologies.join(", ")}
                        onChange={(e) =>
                          handleUpdateProject(
                            projIdx,
                            "technologies",
                            e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="Technologies (comma-separated)"
                        className="p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#B89AFF] focus:outline-none focus:border-[#7C4DFF]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(projIdx)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Project bullet */}
                  {proj.bullets.map((b, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <textarea
                        rows={1}
                        value={b}
                        onChange={(e) => {
                          const updated = [...proj.bullets];
                          updated[bIdx] = e.target.value;
                          handleUpdateProject(projIdx, "bullets", updated);
                        }}
                        className="flex-1 p-2 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF] resize-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAiTarget({
                            text: b,
                            sectionType: "project",
                            context: `Project: ${proj.name}`,
                            onApply: (improved) => {
                              const updated = [...proj.bullets];
                              updated[bIdx] = improved;
                              handleUpdateProject(projIdx, "bullets", updated);
                            },
                          })
                        }
                        className="p-1.5 rounded-lg bg-[#2C224B] text-[#B89AFF] hover:bg-[#7C4DFF] hover:text-white"
                        title="AI Improve bullet"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Education & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education */}
            <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30384B]">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#7C4DFF]" />
                  <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                    Education & Credentials
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddEducation}
                  icon={<Plus className="w-3 h-3 text-[#7C4DFF]" />}
                >
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {draft.education.map((edu, eduIdx) => (
                  <div
                    key={eduIdx}
                    className="p-3.5 rounded-xl bg-[#1B2231]/60 border border-[#30384B] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducation(eduIdx, "degree", e.target.value)}
                        placeholder="Degree"
                        className="flex-1 p-1.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs font-bold text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(eduIdx)}
                        className="text-rose-400 p-1 hover:bg-rose-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => handleUpdateEducation(eduIdx, "institution", e.target.value)}
                        placeholder="Institution"
                        className="p-1.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0] focus:outline-none focus:border-[#7C4DFF]"
                      />
                      <input
                        type="text"
                        value={edu.year || ""}
                        onChange={(e) => handleUpdateEducation(eduIdx, "year", e.target.value)}
                        placeholder="Year"
                        className="p-1.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-xs text-[#B8B9D0] focus:outline-none focus:border-[#7C4DFF]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="p-6 rounded-2xl bg-[#111827] border border-[#30384B] shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#30384B]">
                <Award className="w-4 h-4 text-[#FDBB83]" />
                <h4 className="font-heading font-bold text-sm text-[#F7F7FA]">
                  Certifications
                </h4>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {draft.certifications.map((cert, certIdx) => (
                    <span
                      key={certIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2C224B] border border-[#7C4DFF]/30 text-xs text-[#B89AFF]"
                    >
                      <span>{cert}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCert(certIdx)}
                        className="text-[#B8B9D0] hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCert()}
                    placeholder="+ Add Certification"
                    className="flex-1 p-2 rounded-xl bg-[#0B101A] border border-[#30384B] text-xs text-[#F7F7FA] focus:outline-none focus:border-[#7C4DFF]"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddCert}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: DOCUMENT PREVIEW CANVAS (ATS SINGLE COLUMN) */
        <div className="p-8 sm:p-12 rounded-2xl bg-[#FFFFFF] text-[#111827] shadow-2xl max-w-4xl mx-auto space-y-6 font-sans">
          {/* Document Header */}
          <div className="text-center pb-4 border-b border-slate-200 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {draft.candidate_name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
              {draft.contact_info?.email && <span>{draft.contact_info.email}</span>}
              {draft.contact_info?.phone && <span>• {draft.contact_info.phone}</span>}
              {draft.contact_info?.location && <span>• {draft.contact_info.location}</span>}
              {draft.contact_info?.linkedin && <span>• {draft.contact_info.linkedin}</span>}
              {draft.contact_info?.github && <span>• {draft.contact_info.github}</span>}
              {draft.contact_info?.portfolio && <span>• {draft.contact_info.portfolio}</span>}
            </div>
            {isFresher && (
              <div className="pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Fresher Adaptive Layout
                </span>
              </div>
            )}
          </div>

          {/* Document Summary */}
          {draft.tailored_summary && draft.tailored_summary.trim() && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Professional Summary
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                {draft.tailored_summary}
              </p>
            </div>
          )}

          {/* Document Skills */}
          {(draft.skills.matching_skills.length > 0 || draft.skills.additional_skills.length > 0) && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Technical & Core Skills
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                {draft.skills.matching_skills.length > 0 && (
                  <>
                    <strong className="text-slate-900">Core Competencies:</strong>{" "}
                    {draft.skills.matching_skills.join(", ")}
                  </>
                )}
                {draft.skills.additional_skills.length > 0 && (
                  <>
                    {draft.skills.matching_skills.length > 0 && <br />}
                    <strong className="text-slate-900">Additional Technologies:</strong>{" "}
                    {draft.skills.additional_skills.join(", ")}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Subrenders for adaptive layout */}
          {(() => {
            const renderExperience = () =>
              draft.experience.length > 0 ? (
                <div key="exp" className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Professional Experience
                  </h2>
                  <div className="space-y-4">
                    {draft.experience.map((exp, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{exp.role}</span>
                          <span className="text-slate-500">{exp.duration}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs italic text-slate-600">
                          <span>{exp.company}</span>
                          {exp.location && <span>{exp.location}</span>}
                        </div>
                        <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700 pt-1">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;

            const renderProjects = () =>
              draft.projects.length > 0 ? (
                <div key="proj" className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Key Projects
                  </h2>
                  <div className="space-y-3">
                    {draft.projects.map((proj, pIdx) => (
                      <div key={pIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{proj.name}</span>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <span className="text-[11px] text-slate-600 font-mono">
                              [{proj.technologies.join(", ")}]
                            </span>
                          )}
                        </div>
                        {proj.link && (
                          <div className="text-[11px] text-blue-700 underline">
                            {proj.link}
                          </div>
                        )}
                        {proj.bullets && proj.bullets.length > 0 && (
                          <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700 pt-0.5">
                            {proj.bullets.map((b, bIdx) => (
                              <li key={bIdx} className="leading-relaxed">
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;

            const renderEducation = () =>
              draft.education.length > 0 ? (
                <div key="edu" className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Education
                  </h2>
                  <div className="space-y-1.5">
                    {draft.education.map((edu, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-slate-900">{edu.degree}</strong> — {edu.institution}
                          </div>
                          <span className="text-slate-500">{edu.year}</span>
                        </div>
                        {edu.details && (
                          <p className="text-[11px] text-slate-600 italic">{edu.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;

            const renderCertifications = () =>
              draft.certifications.length > 0 ? (
                <div key="cert" className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                    Certifications & Credentials
                  </h2>
                  <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-700">
                    {draft.certifications.map((cert, cIdx) => (
                      <li key={cIdx} className="leading-relaxed">{cert}</li>
                    ))}
                  </ul>
                </div>
              ) : null;

            // Adaptive section ordering: fresher puts projects & education first
            if (isFresher) {
              return [
                renderProjects(),
                renderEducation(),
                renderExperience(),
                renderCertifications(),
              ];
            } else {
              return [
                renderExperience(),
                renderProjects(),
                renderEducation(),
                renderCertifications(),
              ];
            }
          })()}
        </div>
      )}

      {/* MODAL 1: RESUME QUALITY AUDIT MODAL */}
      {isAuditModalOpen && draft.audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-[#30384B] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7C4DFF]" />
                <h3 className="font-heading font-bold text-lg text-[#F7F7FA]">
                  ATS & Resume Quality Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg text-[#B8B9D0] hover:text-[#F7F7FA] hover:bg-[#1B2231]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Health Score Card */}
            <div className="p-4 rounded-xl bg-[#1B2231] border border-[#30384B] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#B8B9D0] uppercase">Overall Document Health</span>
                <h4 className="text-xl font-extrabold text-[#F7F7FA]">Grade {draft.audit.grade}</h4>
                <p className="text-xs text-[#B8B9D0] mt-1">{draft.audit.summary}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-[#7C4DFF] font-mono">{draft.audit.overall_score}%</span>
                <span className="block text-[10px] text-[#B8B9D0]">Health Index</span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-center">
                <span className="text-[10px] text-[#B8B9D0] block">Word Count</span>
                <span className="text-sm font-bold text-[#F7F7FA]">{draft.audit.metrics.word_count ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-center">
                <span className="text-[10px] text-[#B8B9D0] block">Bullet Count</span>
                <span className="text-sm font-bold text-[#F7F7FA]">{draft.audit.metrics.bullet_count ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-center">
                <span className="text-[10px] text-[#B8B9D0] block">Avg Words/Bullet</span>
                <span className="text-sm font-bold text-[#F7F7FA]">{draft.audit.metrics.avg_bullet_words ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0B101A] border border-[#30384B] text-center">
                <span className="text-[10px] text-[#B8B9D0] block">Duplicate Skills</span>
                <span className={`text-sm font-bold ${(draft.audit.metrics.duplicate_skills_count ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {draft.audit.metrics.duplicate_skills_count ?? 0}
                </span>
              </div>
            </div>

            {/* Issue Sections */}
            <div className="space-y-4 text-xs">
              {/* Errors */}
              {draft.audit.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Critical ATS Blockers ({draft.audit.errors.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.errors.map((err) => (
                      <div key={err.id} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-rose-100">{err.message}</strong>
                          {err.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20">{err.location}</span>}
                        </div>
                        <p className="text-[11px] text-rose-300">{err.detail}</p>
                        {err.recommendation && (
                          <p className="text-[11px] text-rose-200 font-medium">💡 Fix: {err.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {draft.audit.warnings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Formatting & Consistency Warnings ({draft.audit.warnings.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.warnings.map((warn) => (
                      <div key={warn.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-100">{warn.message}</strong>
                          {warn.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">{warn.location}</span>}
                        </div>
                        <p className="text-[11px] text-amber-300">{warn.detail}</p>
                        {warn.recommendation && (
                          <p className="text-[11px] text-amber-200 font-medium">💡 Fix: {warn.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {draft.audit.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-[#B89AFF] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>High-Impact Polish Suggestions ({draft.audit.suggestions.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.suggestions.map((sug) => (
                      <div key={sug.id} className="p-3 rounded-lg bg-[#2C224B]/40 border border-[#7C4DFF]/30 text-[#F7F7FA] space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-white">{sug.message}</strong>
                          {sug.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2C224B]">{sug.location}</span>}
                        </div>
                        <p className="text-[11px] text-[#B8B9D0]">{sug.detail}</p>
                        {sug.recommendation && (
                          <p className="text-[11px] text-[#B89AFF] font-medium">💡 Suggestion: {sug.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsAuditModalOpen(false)}>
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DUAL SCORE RE-CHECK BREAKDOWN MODAL */}
      {showDualScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-[#30384B] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#30384B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7C4DFF]" />
                <h3 className="font-heading font-bold text-lg text-[#F7F7FA]">
                  Live Re-check Evaluation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDualScoreModal(false)}
                className="p-1 rounded-lg text-[#B8B9D0] hover:text-[#F7F7FA] hover:bg-[#1B2231]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dual Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Score A: Job Description Match Score */}
              <div className="p-4 rounded-xl bg-[#1B2231] border border-[#30384B] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-semibold text-[#B89AFF] uppercase block">Factor A</span>
                    <h4 className="font-bold text-sm text-[#F7F7FA]">Job Description Match</h4>
                  </div>
                  <span className="text-2xl font-black text-[#7C4DFF] font-mono">
                    {draft.match_score}%
                  </span>
                </div>
                {draft.match_breakdown && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Required Skills (35%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.match_breakdown.required_skill_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Preferred Skills (15%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.match_breakdown.preferred_skill_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Experience Alignment (20%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.match_breakdown.experience_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Responsibilities (15%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.match_breakdown.responsibility_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Domain Keywords (10%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.match_breakdown.keyword_score}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Score B: ATS & Resume Quality Assessment */}
              <div className="p-4 rounded-xl bg-[#1B2231] border border-[#30384B] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-semibold text-[#FDBB83] uppercase block">Factor B</span>
                    <h4 className="font-bold text-sm text-[#F7F7FA]">ATS & Document Quality</h4>
                  </div>
                  <span className="text-2xl font-black text-[#FDBB83] font-mono">
                    {draft.ats_quality_assessment?.overall_score ?? draft.ats_compatibility?.score ?? 90}%
                  </span>
                </div>
                {draft.ats_quality_assessment && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Parseability (25%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.ats_quality_assessment.parseability_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Section Structure (20%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.ats_quality_assessment.structure_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Readability (15%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.ats_quality_assessment.readability_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Formatting Consistency (15%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.ats_quality_assessment.formatting_consistency_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#B8B9D0]">
                      <span>Content Coverage (15%):</span>
                      <span className="font-bold text-[#F7F7FA]">{draft.ats_quality_assessment.content_coverage_score}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Non-proprietary Disclaimer */}
            <div className="p-3.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-[11px] text-[#B8B9D0] leading-relaxed">
              <span className="font-bold text-[#F7F7FA] block mb-0.5">Verification Disclaimer:</span>
              Match and ATS quality scores indicate semantic and structural alignment with standard enterprise ATS parsers. They do not simulate or guarantee proprietary ATS vendor decisions or employer interview outcomes.
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowDualScoreModal(false); setIsAuditModalOpen(true); }}>
                Inspect Full Quality Audit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowDualScoreModal(false)}>
                Continue Editing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI IMPROVE MODAL */}
      {aiTarget && (
        <AIImproveModal
          isOpen={Boolean(aiTarget)}
          onClose={() => setAiTarget(null)}
          originalText={aiTarget.text}
          sectionType={aiTarget.sectionType}
          jobDescription={jobDescription}
          contextInfo={aiTarget.context}
          onAccept={(improved) => {
            aiTarget.onApply(improved);
            setAiTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default InteractiveResumeEditor;
