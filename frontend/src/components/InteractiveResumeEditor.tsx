"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  GraduationCap,
  ChevronDown,
  ShieldCheck,
  XCircle,
  X,
  Undo2,
} from "lucide-react";
import {
  TailoredResumeResponse,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  MatchScoreBreakdown,
  OptimizationRecommendation,
  SectionImprovementItem,
} from "@/types/resume";
import { recheckResumeScore, auditResume, ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import AIImproveModal from "@/components/AIImproveModal";
import BatchAIImproveModal from "@/components/BatchAIImproveModal";
import { normalizeCandidateName } from "@/lib/nameNormalizer";

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
  // Deep clone initial resume to avoid mutating parent props; normalize candidate name
  const [draft, setDraft] = useState<TailoredResumeResponse>(() => {
    if (!resumeData) return {} as TailoredResumeResponse;
    const cloned = JSON.parse(JSON.stringify(resumeData)) as TailoredResumeResponse;
    if (cloned.candidate_name) {
      cloned.candidate_name = normalizeCandidateName(cloned.candidate_name);
    }
    return cloned;
  });

  // Undo history stack
  const [undoHistory, setUndoHistory] = useState<TailoredResumeResponse[]>([]);

  // Mode: "editor" is inline editing mode; "preview" is clean recruiter document mode
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");

  const [isScoreStale, setIsScoreStale] = useState<boolean>(false);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);

  // Audit and Dual-Score Modal States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [showDualScoreModal, setShowDualScoreModal] = useState<boolean>(false);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Phase 6.5: Contextual & Toolbar AI Improve states
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [showAiImproveMenu, setShowAiImproveMenu] = useState<boolean>(false);
  const aiImproveMenuRef = useRef<HTMLDivElement>(null);

  const [batchModalState, setBatchModalState] = useState<{
    isOpen: boolean;
    scope: "all" | "summary" | "experience" | "projects";
  }>({
    isOpen: false,
    scope: "all",
  });

  // Track actively focused block for persistent toolbar AI Improve button
  const [activeFocus, setActiveFocus] = useState<{
    id: string;
    text: string;
    sectionType: "summary" | "experience" | "project";
    context?: string;
    onApply: (improved: string) => void;
  } | null>(null);

  // AI Improve Modal Target State
  const [aiTarget, setAiTarget] = useState<{
    text: string;
    sectionType: "summary" | "experience" | "project";
    context?: string;
    onApply: (improved: string) => void;
  } | null>(null);

  // New skill input states
  const [newMatchingSkill, setNewMatchingSkill] = useState<string>("");
  const [newAdditionalSkill, setNewAdditionalSkill] = useState<string>("");
  const [newCert, setNewCert] = useState<string>("");

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
    const cloned = JSON.parse(JSON.stringify(resumeData)) as TailoredResumeResponse;
    if (cloned.candidate_name) {
      cloned.candidate_name = normalizeCandidateName(cloned.candidate_name);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(cloned);
    setUndoHistory([]);
    setIsScoreStale(false);
    setRecheckMessage(null);
  }, [resumeData]);

  // Close export menu and AI improve menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (aiImproveMenuRef.current && !aiImproveMenuRef.current.contains(event.target as Node)) {
        setShowAiImproveMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute modified status
  const isModified = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(resumeData);
  }, [draft, resumeData]);

  // Push previous state into undo stack before mutating
  const pushUndo = (prevDraft: TailoredResumeResponse) => {
    setUndoHistory((history) => [...history.slice(-25), JSON.parse(JSON.stringify(prevDraft))]);
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setUndoHistory((h) => h.slice(0, h.length - 1));
    setDraft(previous);
    setIsScoreStale(true);
  };

  // --- Handlers for Document Fields ---
  const handleFieldChange = (field: string, value: unknown) => {
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsScoreStale(true);
  };

  const handleContactChange = (field: string, value: string) => {
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value,
      },
    }));
    setIsScoreStale(true);
  };

  const handleAddMatchingSkill = (explicitVal?: string) => {
    const val = typeof explicitVal === "string" ? explicitVal : newMatchingSkill;
    const trimmed = val.trim();
    if (!trimmed) return;
    pushUndo(draft);
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
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        matching_skills: prev.skills.matching_skills.filter((_, i) => i !== index),
      },
    }));
    setIsScoreStale(true);
  };

  const handleAddAdditionalSkill = (explicitVal?: string) => {
    const val = typeof explicitVal === "string" ? explicitVal : newAdditionalSkill;
    const trimmed = val.trim();
    if (!trimmed) return;
    pushUndo(draft);
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
    pushUndo(draft);
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
    pushUndo(draft);
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
    pushUndo(draft);
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
    pushUndo(draft);
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
    pushUndo(draft);
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
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== expIndex),
    }));
    setIsScoreStale(true);
  };

  // --- Education Handlers ---
  const handleUpdateEducation = (eduIndex: number, field: keyof EducationItem, val: string) => {
    pushUndo(draft);
    setDraft((prev) => {
      const updated = [...prev.education];
      updated[eduIndex] = { ...updated[eduIndex], [field]: val };
      return { ...prev, education: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddEducation = () => {
    pushUndo(draft);
    const newEdu: EducationItem = {
      degree: "B.S. in Computer Science",
      institution: "University",
      year: "2022",
    };
    setDraft((prev) => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
    setIsScoreStale(true);
  };

  const handleRemoveEducation = (eduIndex: number) => {
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== eduIndex),
    }));
    setIsScoreStale(true);
  };

  // --- Projects Handlers ---
  const handleUpdateProject = (projIndex: number, field: keyof ProjectItem, val: string | string[]) => {
    pushUndo(draft);
    setDraft((prev) => {
      const updated = [...prev.projects];
      updated[projIndex] = { ...updated[projIndex], [field]: val };
      return { ...prev, projects: updated };
    });
    setIsScoreStale(true);
  };

  const handleUpdateProjectBullet = (projIndex: number, bulletIndex: number, val: string) => {
    setDraft((prev) => {
      const updated = [...prev.projects];
      const newBullets = [...(updated[projIndex].bullets || [])];
      newBullets[bulletIndex] = val;
      updated[projIndex] = { ...updated[projIndex], bullets: newBullets };
      return { ...prev, projects: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddProjectBullet = (projIndex: number) => {
    pushUndo(draft);
    setDraft((prev) => {
      const updated = [...prev.projects];
      updated[projIndex] = {
        ...updated[projIndex],
        bullets: [...(updated[projIndex].bullets || []), "Engineered core modules and optimized runtime efficiency."],
      };
      return { ...prev, projects: updated };
    });
    setIsScoreStale(true);
  };

  const handleRemoveProjectBullet = (projIndex: number, bulletIndex: number) => {
    pushUndo(draft);
    setDraft((prev) => {
      const updated = [...prev.projects];
      updated[projIndex] = {
        ...updated[projIndex],
        bullets: (updated[projIndex].bullets || []).filter((_, i) => i !== bulletIndex),
      };
      return { ...prev, projects: updated };
    });
    setIsScoreStale(true);
  };

  const handleAddProject = () => {
    pushUndo(draft);
    const newProj: ProjectItem = {
      name: "Cloud Service Platform",
      technologies: ["TypeScript", "Next.js", "Python"],
      bullets: ["Engineered responsive client architecture and integrated low-latency endpoints."],
    };
    setDraft((prev) => ({
      ...prev,
      projects: [...prev.projects, newProj],
    }));
    setIsScoreStale(true);
  };

  const handleRemoveProject = (projIndex: number) => {
    pushUndo(draft);
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
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      certifications: [...prev.certifications, trimmed],
    }));
    setNewCert("");
    setIsScoreStale(true);
  };

  const handleRemoveCert = (index: number) => {
    pushUndo(draft);
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
    setIsScoreStale(true);
  };

  // --- AI Improve Trigger ---
  const openAiImprove = (target: {
    id: string;
    text: string;
    sectionType: "summary" | "experience" | "project";
    context?: string;
    onApply: (improved: string) => void;
  }) => {
    setActiveFocus(target);
    setAiTarget({
      text: target.text,
      sectionType: target.sectionType,
      context: target.context,
      onApply: (improved) => {
        pushUndo(draft);
        target.onApply(improved);
        // Refresh activeFocus so immediate repeated AI Improve operates on the latest accepted text!
        setActiveFocus((prev) => (prev ? { ...prev, text: improved } : null));
        setIsScoreStale(true);
      },
    });
  };

  // Toolbar AI Improve Handlers
  const handleToolbarAiImproveClick = () => {
    if (activeFocus && activeFocus.text.trim()) {
      openAiImprove(activeFocus);
    } else {
      setShowAiImproveMenu((prev) => !prev);
    }
  };

  const openBatchImprove = (scope: "all" | "summary" | "experience" | "projects") => {
    setShowAiImproveMenu(false);
    setBatchModalState({
      isOpen: true,
      scope,
    });
  };

  const handleAcceptBatchImprovements = (acceptedItems: SectionImprovementItem[]) => {
    if (!acceptedItems || acceptedItems.length === 0) return;
    pushUndo(draft);
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as TailoredResumeResponse;
      for (const item of acceptedItems) {
        if (item.id === "summary") {
          next.tailored_summary = item.improved_text;
        } else if (item.id.startsWith("exp-")) {
          // exp-{expIdx}-{bIdx}
          const parts = item.id.split("-");
          const expIdx = parseInt(parts[1], 10);
          const bIdx = parseInt(parts[2], 10);
          if (next.experience[expIdx] && next.experience[expIdx].bullets[bIdx] !== undefined) {
            next.experience[expIdx].bullets[bIdx] = item.improved_text;
          }
        } else if (item.id.startsWith("proj-")) {
          // proj-{projIdx}-{bIdx}
          const parts = item.id.split("-");
          const projIdx = parseInt(parts[1], 10);
          const bIdx = parseInt(parts[2], 10);
          if (next.projects[projIdx] && next.projects[projIdx].bullets[bIdx] !== undefined) {
            next.projects[projIdx].bullets[bIdx] = item.improved_text;
          }
        }
      }
      return next;
    });
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
      pushUndo(draft);
      setDraft(JSON.parse(JSON.stringify(resumeData)));
      setIsScoreStale(false);
      setRecheckMessage(null);
    }
  };

  const isEditing = viewMode === "editor";

  return (
    <div className="space-y-6">
      {/* 5. Responsive Professional Action Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#DDD0D7] shadow-sm flex flex-col gap-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Group 1: Editing Mode & Primary Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Mode Switcher: Edit Resume vs Done Editing */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] min-h-[44px]">
              <button
                type="button"
                onClick={() => setViewMode("editor")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                  isEditing
                    ? "bg-[#291B32] text-white shadow-xs"
                    : "text-[#674E61] hover:text-[#291B32]"
                }`}
                title="Switch to inline document editing mode"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Interactive Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                  !isEditing
                    ? "bg-[#291B32] text-white shadow-xs"
                    : "text-[#674E61] hover:text-[#291B32]"
                }`}
                title="Switch to clean recruiter document preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Document Preview</span>
              </button>
            </div>

            {/* Unified Toolbar AI Improve Button with Action Menu */}
            <div className="relative" ref={aiImproveMenuRef}>
              <div className="inline-flex rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={handleToolbarAiImproveClick}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-l-xl bg-[#FBEFEA] hover:bg-[#F7E1D7] active:bg-[#F2D0C1] border border-[#C45D39]/30 text-[#C45D39] text-xs font-bold transition-all min-h-[44px]"
                  title={
                    activeFocus && activeFocus.text.trim()
                      ? `AI Improve focused: ${activeFocus.sectionType}`
                      : "AI Improve Resume"
                  }
                >
                  <Sparkles className="w-4 h-4 text-[#C45D39]" />
                  <span>
                    {activeFocus && activeFocus.text.trim()
                      ? `Improve Selected (${activeFocus.sectionType})`
                      : "AI Improve"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiImproveMenu((prev) => !prev)}
                  className="px-2 py-2.5 rounded-r-xl bg-[#FBEFEA] hover:bg-[#F7E1D7] active:bg-[#F2D0C1] border-y border-r border-[#C45D39]/30 text-[#C45D39] text-xs font-bold transition-all min-h-[44px]"
                  aria-label="Open AI Improve Options"
                  title="Choose AI Improvement Scope"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[#C45D39]" />
                </button>
              </div>

              {showAiImproveMenu && (
                <div className="absolute left-0 mt-1.5 w-64 py-2 bg-white border border-[#DDD0D7] rounded-xl shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-[#DDD0D7]/60 mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#674E61]">
                      AI Optimization Scope
                    </p>
                  </div>
                  {activeFocus && activeFocus.text.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiImproveMenu(false);
                        openAiImprove(activeFocus);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#C45D39] hover:bg-[#FBEFEA] flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Improve Selected Text ({activeFocus.sectionType})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openBatchImprove("all")}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors"
                  >
                    <span>1. Improve Entire Resume</span>
                    <span className="text-[10px] text-[#C45D39] font-mono bg-[#FBEFEA] px-1.5 py-0.5 rounded">All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openBatchImprove("summary")}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors"
                  >
                    <span>2. Improve Professional Summary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openBatchImprove("experience")}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors"
                  >
                    <span>3. Improve Experience</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openBatchImprove("projects")}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors"
                  >
                    <span>4. Improve Projects</span>
                  </button>
                </div>
              )}
            </div>

            {/* Re-check Score Button */}
            <Button
              variant="recheck"
              size="md"
              onClick={handleRecheckScore}
              isLoading={isRechecking}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? "animate-spin" : ""}`} />}
              className="min-h-[44px]"
            >
              Re-check Score
            </Button>

            {/* ATS Audit Button */}
            <Button
              variant="secondary"
              size="md"
              onClick={handleRunAudit}
              isLoading={isAuditing}
              icon={<ShieldCheck className="w-3.5 h-3.5 text-[#C45D39]" />}
              className="min-h-[44px]"
            >
              <span>ATS Audit</span>
              {draft.audit ? (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    draft.audit.errors.length > 0
                      ? "bg-rose-100 text-rose-800"
                      : "bg-[#E8D9E8] text-[#291B32]"
                  }`}
                >
                  {draft.audit.overall_score}%
                </span>
              ) : null}
            </Button>
          </div>

          {/* Group 2: Secondary Document Controls */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* Undo Button */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoHistory.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${
                undoHistory.length > 0
                  ? "bg-white border-[#DDD0D7] text-[#291B32] hover:bg-[#F7F2EB]"
                  : "bg-[#F7F2EB]/50 border-[#DDD0D7]/40 text-[#674E61]/40 cursor-not-allowed"
              }`}
              title="Undo last draft edit"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>

            {/* Discard Edits Button */}
            {isModified && (
              <Button
                variant="ghost"
                size="md"
                onClick={handleResetToBaseline}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="min-h-[44px]"
              >
                Discard Edits
              </Button>
            )}

            {/* Save as Version Button */}
            <Button
              variant="save"
              size="md"
              onClick={() => onSaveVersion(draft)}
              icon={<Save className="w-3.5 h-3.5 text-[#E8D9E8]" />}
              className="min-h-[44px]"
            >
              Save as Version
            </Button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="export"
                size="md"
                onClick={() => setShowExportMenu((prev) => !prev)}
                icon={<FileDown className="w-3.5 h-3.5 text-[#C45D39]" />}
                className="min-h-[44px]"
              >
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </Button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-48 py-1.5 bg-white border border-[#DDD0D7] rounded-xl shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExport("pdf", draft);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors min-h-[40px]"
                  >
                    <span>Download PDF</span>
                    <span className="text-[10px] text-[#674E61] font-mono">ATS Standard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExport("docx", draft);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors min-h-[40px]"
                  >
                    <span>Download DOCX</span>
                    <span className="text-[10px] text-[#674E61] font-mono">MS Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      onExport("txt", draft);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#291B32] hover:bg-[#F7F2EB] hover:text-[#C45D39] flex items-center justify-between transition-colors min-h-[40px]"
                  >
                    <span>Download TXT</span>
                    <span className="text-[10px] text-[#674E61] font-mono">Plain Text</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DDD0D7]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Draft Sync Status */}
            {isModified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FDF6F3] border border-[#C45D39]/40 text-xs font-semibold text-[#C45D39]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C45D39] animate-pulse" />
                Unsaved Draft Edits
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-xs font-semibold text-[#674E61]">
                <Check className="w-3.5 h-3.5 text-[#C45D39]" />
                Draft In Sync
              </span>
            )}

            {/* Score Stale Alert */}
            {isScoreStale && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Score Stale (Edits made)
              </span>
            )}

            {/* Fresher Adaptive Layout Badge */}
            {isFresher && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8D9E8] border border-[#DDD0D7] text-xs font-bold text-[#291B32]">
                <GraduationCap className="w-3.5 h-3.5 text-[#C45D39]" />
                Fresher Adaptive Layout
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#674E61]">
            {isEditing ? (
              <span>Click any document text directly to edit. Hover bullets for AI Improve.</span>
            ) : (
              <span>Recruiter Preview Mode: Clean ATS document appearance.</span>
            )}
          </div>
        </div>
      </div>

      {/* Recheck Feedback Banner */}
      {recheckMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            recheckMessage.startsWith("Error")
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-[#FDF6F3] border-[#C45D39]/40 text-[#291B32]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C45D39]" />
            <span>{recheckMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecheckMessage(null)}
            className="text-[#674E61] hover:text-[#291B32] p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* 3. Rebuilt WYSIWYG Document Canvas: A Single Continuous Professional ATS Resume */}
      <div className="w-full max-w-[850px] mx-auto bg-white border border-[#DDD0D7] shadow-xl rounded-xl p-8 sm:p-14 text-[#291B32] font-sans transition-all relative select-text">
        {/* Document Header: Candidate Name & Contact Details */}
        <div className="text-center pb-5 border-b border-[#291B32] space-y-2">
          {isEditing ? (
            <h1 className="text-2xl sm:text-3xl font-black text-[#291B32] tracking-tight whitespace-normal break-normal">
              <span className="sr-only">{draft.candidate_name || "Candidate Name"}</span>
              <input
                type="text"
                value={draft.candidate_name || ""}
                onChange={(e) => handleFieldChange("candidate_name", e.target.value)}
                onBlur={(e) => {
                  const normalized = normalizeCandidateName(e.target.value);
                  if (normalized !== draft.candidate_name) {
                    handleFieldChange("candidate_name", normalized);
                  }
                }}
                placeholder="Candidate Full Name"
                className="w-full text-center text-2xl sm:text-3xl font-black text-[#291B32] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-1 outline-none bg-transparent transition-all placeholder-[#674E61]/40 whitespace-normal break-normal"
              />
            </h1>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-black text-[#291B32] tracking-tight whitespace-normal break-normal">
              {draft.candidate_name || "Candidate Name"}
            </h1>
          )}

          {/* Contact Line */}
          {isEditing ? (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#674E61] pt-1">
              <input
                type="email"
                value={draft.contact_info?.email || ""}
                onChange={(e) => handleContactChange("email", e.target.value)}
                placeholder="Email address"
                className="text-center border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-0.5 outline-none bg-transparent w-44"
              />
              <span className="text-[#DDD0D7] select-none">•</span>
              <input
                type="text"
                value={draft.contact_info?.phone || ""}
                onChange={(e) => handleContactChange("phone", e.target.value)}
                placeholder="Phone number"
                className="text-center border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-0.5 outline-none bg-transparent w-32"
              />
              <span className="text-[#DDD0D7] select-none">•</span>
              <input
                type="text"
                value={draft.contact_info?.location || ""}
                onChange={(e) => handleContactChange("location", e.target.value)}
                placeholder="Location"
                className="text-center border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-0.5 outline-none bg-transparent w-32"
              />
              <span className="text-[#DDD0D7] select-none">•</span>
              <input
                type="text"
                value={draft.contact_info?.linkedin || ""}
                onChange={(e) => handleContactChange("linkedin", e.target.value)}
                placeholder="LinkedIn URL"
                className="text-center border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-0.5 outline-none bg-transparent w-44"
              />
              <span className="text-[#DDD0D7] select-none">•</span>
              <input
                type="text"
                value={draft.contact_info?.github || draft.contact_info?.portfolio || ""}
                onChange={(e) => handleContactChange("github", e.target.value)}
                placeholder="GitHub / Portfolio"
                className="text-center border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-2 py-0.5 outline-none bg-transparent w-44"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-[#291B32]">
              {draft.contact_info?.email && <span>{draft.contact_info.email}</span>}
              {draft.contact_info?.phone && (
                <>
                  <span className="text-[#DDD0D7] select-none">•</span>
                  <span>{draft.contact_info.phone}</span>
                </>
              )}
              {draft.contact_info?.location && (
                <>
                  <span className="text-[#DDD0D7] select-none">•</span>
                  <span>{draft.contact_info.location}</span>
                </>
              )}
              {draft.contact_info?.linkedin && (
                <>
                  <span className="text-[#DDD0D7] select-none">•</span>
                  <span>{draft.contact_info.linkedin}</span>
                </>
              )}
              {(draft.contact_info?.github || draft.contact_info?.portfolio) && (
                <>
                  <span className="text-[#DDD0D7] select-none">•</span>
                  <span>{draft.contact_info.github || draft.contact_info.portfolio}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Section: Professional Summary */}
        <div
          className="mt-5 space-y-1.5"
          onMouseEnter={() => setHoveredItemId("summary")}
          onMouseLeave={() => setHoveredItemId(null)}
        >
          <div className="flex items-center justify-between border-b border-[#291B32] pb-1">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
              Professional Summary
            </h2>
            {isEditing && (hoveredItemId === "summary" || activeFocus?.id === "summary") && (
              <button
                type="button"
                onClick={() =>
                  openAiImprove({
                    id: "summary",
                    text: draft.tailored_summary,
                    sectionType: "summary",
                    context: `Target Role: ${draft.job_analysis?.target_role || "Software Engineer"}`,
                    onApply: (improved) => handleFieldChange("tailored_summary", improved),
                  })
                }
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#FBEFEA] hover:bg-[#F7E1D7] border border-[#C45D39]/30 text-[11px] font-bold text-[#C45D39] transition-all animate-in fade-in duration-150"
                title="AI Improve Summary wording and impact"
              >
                <Sparkles className="w-3 h-3 text-[#C45D39]" />
                <span>AI Improve</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              rows={4}
              value={draft.tailored_summary}
              onFocus={() =>
                setActiveFocus({
                  id: "summary",
                  text: draft.tailored_summary,
                  sectionType: "summary",
                  context: `Target Role: ${draft.job_analysis?.target_role || "Software Engineer"}`,
                  onApply: (improved) => handleFieldChange("tailored_summary", improved),
                })
              }
              onChange={(e) => handleFieldChange("tailored_summary", e.target.value)}
              className="w-full p-2 text-xs sm:text-sm text-[#291B32] leading-relaxed border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded-lg outline-none bg-transparent resize-y transition-all"
              placeholder="Enter tailored professional summary..."
            />
          ) : (
            <p className="text-xs sm:text-sm text-[#291B32] leading-relaxed pt-1">
              {draft.tailored_summary}
            </p>
          )}
        </div>

        {/* Section: Technical & Core Skills */}
        <div className="mt-5 space-y-2">
          <div className="border-b border-[#291B32] pb-1">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
              Technical Skills & Competencies
            </h2>
          </div>

          {isEditing ? (
            <div className="space-y-3 pt-1">
              {/* Role-Matching Skills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C45D39] block">
                  Core Role Competencies
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {draft.skills.matching_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E8D9E8] border border-[#DDD0D7] text-xs font-semibold text-[#291B32]"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMatchingSkill(idx)}
                        className="text-[#674E61] hover:text-rose-600 p-0.5 rounded"
                        aria-label={`Remove ${skill}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newMatchingSkill}
                      onChange={(e) => setNewMatchingSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMatchingSkill(e.currentTarget.value);
                        }
                      }}
                      placeholder="+ Add Skill"
                      className="px-2.5 py-1 rounded bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#291B32] focus:outline-none focus:border-[#C45D39] w-28"
                    />
                    {newMatchingSkill.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddMatchingSkill()}
                        className="px-2 py-1 rounded bg-[#C45D39] text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Technologies */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#674E61] block">
                  Additional Technologies & Tools
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {draft.skills.additional_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F7F2EB] border border-[#DDD0D7] text-xs font-medium text-[#291B32]"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalSkill(idx)}
                        className="text-[#674E61] hover:text-rose-600 p-0.5 rounded"
                        aria-label={`Remove ${skill}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newAdditionalSkill}
                      onChange={(e) => setNewAdditionalSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddAdditionalSkill(e.currentTarget.value);
                        }
                      }}
                      placeholder="+ Add Tool"
                      className="px-2.5 py-1 rounded bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#291B32] focus:outline-none focus:border-[#C45D39] w-28"
                    />
                    {newAdditionalSkill.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddAdditionalSkill()}
                        className="px-2 py-1 rounded bg-[#291B32] text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-[#291B32] leading-relaxed pt-1 space-y-1">
              {draft.skills.matching_skills.length > 0 && (
                <div>
                  <strong className="text-[#291B32]">Core Competencies:</strong>{" "}
                  {draft.skills.matching_skills.join(", ")}
                </div>
              )}
              {draft.skills.additional_skills.length > 0 && (
                <div>
                  <strong className="text-[#291B32]">Additional Technologies:</strong>{" "}
                  {draft.skills.additional_skills.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Rendering with Adaptive Ordering (Fresher vs Experienced) */}
        {(() => {
          // 1. Professional Experience Section
          const renderExperienceSection = () => (
            <div key="sec-experience" className="mt-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#291B32] pb-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
                  Professional Experience
                </h2>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddPosition}
                    className="flex items-center gap-1 text-xs text-[#C45D39] hover:underline font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Position</span>
                  </button>
                )}
              </div>

              <div className="space-y-4 pt-1">
                {draft.experience.map((exp, expIdx) => (
                  <div key={expIdx} className="space-y-1.5 group/pos">
                    {/* Header Row: Role & Duration */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => handleUpdateExperience(expIdx, "role", e.target.value)}
                            placeholder="Role Title"
                            className="font-bold text-[#291B32] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent flex-1"
                          />
                          <input
                            type="text"
                            value={exp.duration || ""}
                            onChange={(e) => handleUpdateExperience(expIdx, "duration", e.target.value)}
                            placeholder="Dates (e.g. 2022 - Present)"
                            className="text-right text-[#674E61] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent w-36"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-[#291B32]">{exp.role}</span>
                          <span className="text-[#674E61]">{exp.duration}</span>
                        </div>
                      )}
                    </div>

                    {/* Sub-Header Row: Company & Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs italic text-[#674E61] gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => handleUpdateExperience(expIdx, "company", e.target.value)}
                            placeholder="Company Name"
                            className="border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent flex-1"
                          />
                          <input
                            type="text"
                            value={exp.location || ""}
                            onChange={(e) => handleUpdateExperience(expIdx, "location", e.target.value)}
                            placeholder="Location"
                            className="text-right border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent w-36"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePosition(expIdx)}
                            className="text-[#674E61] hover:text-rose-600 p-1 opacity-70 hover:opacity-100"
                            title="Remove entire position"
                            aria-label={`Remove position ${exp.role}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span>{exp.company}</span>
                          {exp.location && <span>{exp.location}</span>}
                        </div>
                      )}
                    </div>

                    {/* Bullets List */}
                    <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs sm:text-sm text-[#291B32] pt-1">
                      {exp.bullets.map((bullet, bIdx) => {
                        const itemKey = `exp-${expIdx}-${bIdx}`;
                        const isItemActive = isEditing && (hoveredItemId === itemKey || activeFocus?.id === itemKey);
                        return (
                          <li
                            key={bIdx}
                            className="leading-relaxed group/bullet relative"
                            onMouseEnter={() => setHoveredItemId(itemKey)}
                            onMouseLeave={() => setHoveredItemId(null)}
                          >
                            {isEditing ? (
                              <div className="flex items-start gap-1.5">
                                <textarea
                                  rows={2}
                                  value={bullet}
                                  onFocus={() =>
                                    setActiveFocus({
                                      id: itemKey,
                                      text: bullet,
                                      sectionType: "experience",
                                      context: `Role: ${exp.role} at ${exp.company}`,
                                      onApply: (improved) => handleUpdateBullet(expIdx, bIdx, improved),
                                    })
                                  }
                                  onChange={(e) => handleUpdateBullet(expIdx, bIdx, e.target.value)}
                                  className="w-full border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-1 text-xs sm:text-sm text-[#291B32] leading-relaxed bg-transparent outline-none resize-y transition-all"
                                />

                                {isItemActive && (
                                  <div className="flex items-center gap-1 shrink-0 pt-1 animate-in fade-in duration-100">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAiImprove({
                                          id: itemKey,
                                          text: bullet,
                                          sectionType: "experience",
                                          context: `Role: ${exp.role} at ${exp.company}`,
                                          onApply: (improved) => handleUpdateBullet(expIdx, bIdx, improved),
                                        })
                                      }
                                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FBEFEA] hover:bg-[#F7E1D7] border border-[#C45D39]/30 text-[10px] font-bold text-[#C45D39] transition-all"
                                      title="AI Improve this bullet"
                                    >
                                      <Sparkles className="w-2.5 h-2.5 text-[#C45D39]" />
                                      <span>AI Improve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBullet(expIdx, bIdx)}
                                      className="text-[#674E61] hover:text-rose-600 p-1"
                                      aria-label={`Remove bullet ${bIdx + 1}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span>{bullet}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {isEditing && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddBullet(expIdx)}
                          className="text-xs text-[#C45D39] hover:underline font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );

          // 2. Key Projects Section
          const renderProjectsSection = () => (
            <div key="sec-projects" className="mt-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#291B32] pb-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
                  Key Projects
                </h2>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="flex items-center gap-1 text-xs text-[#C45D39] hover:underline font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                )}
              </div>

              <div className="space-y-4 pt-1">
                {draft.projects.map((proj, pIdx) => (
                  <div key={pIdx} className="space-y-1.5 group/proj">
                    {/* Project Title and Technologies */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => handleUpdateProject(pIdx, "name", e.target.value)}
                            placeholder="Project Name"
                            className="font-bold text-[#291B32] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent flex-1"
                          />
                          <input
                            type="text"
                            value={(proj.technologies || []).join(", ")}
                            onChange={(e) =>
                              handleUpdateProject(
                                pIdx,
                                "technologies",
                                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                              )
                            }
                            placeholder="Tech (comma-separated)"
                            className="text-right text-[#674E61] font-mono text-xs border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent w-44"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(pIdx)}
                            className="text-[#674E61] hover:text-rose-600 p-1 opacity-70 hover:opacity-100"
                            title="Remove project"
                            aria-label={`Remove project ${proj.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-[#291B32]">{proj.name}</span>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <span className="text-[11px] text-[#674E61] font-mono">
                              [{proj.technologies.join(", ")}]
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Project Link */}
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          value={proj.link || ""}
                          onChange={(e) => handleUpdateProject(pIdx, "link", e.target.value)}
                          placeholder="Project link / repo URL"
                          className="text-xs text-[#674E61] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent w-full"
                        />
                      </div>
                    ) : (
                      proj.link && (
                        <div className="text-[11px] text-[#291B32] underline">
                          {proj.link}
                        </div>
                      )
                    )}

                    {/* Project Bullets */}
                    <ul className="list-disc list-outside pl-4 space-y-1.5 text-xs sm:text-sm text-[#291B32] pt-0.5">
                      {(proj.bullets || []).map((bullet, bIdx) => {
                        const itemKey = `proj-${pIdx}-${bIdx}`;
                        const isItemActive = isEditing && (hoveredItemId === itemKey || activeFocus?.id === itemKey);
                        return (
                          <li
                            key={bIdx}
                            className="leading-relaxed group/bullet relative"
                            onMouseEnter={() => setHoveredItemId(itemKey)}
                            onMouseLeave={() => setHoveredItemId(null)}
                          >
                            {isEditing ? (
                              <div className="flex items-start gap-1.5">
                                <textarea
                                  rows={2}
                                  value={bullet}
                                  onFocus={() =>
                                    setActiveFocus({
                                      id: itemKey,
                                      text: bullet,
                                      sectionType: "project",
                                      context: `Project: ${proj.name}`,
                                      onApply: (improved) => handleUpdateProjectBullet(pIdx, bIdx, improved),
                                    })
                                  }
                                  onChange={(e) => handleUpdateProjectBullet(pIdx, bIdx, e.target.value)}
                                  className="w-full border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-1 text-xs sm:text-sm text-[#291B32] leading-relaxed bg-transparent outline-none resize-y transition-all"
                                />

                                {isItemActive && (
                                  <div className="flex items-center gap-1 shrink-0 pt-1 animate-in fade-in duration-100">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openAiImprove({
                                          id: itemKey,
                                          text: bullet,
                                          sectionType: "project",
                                          context: `Project: ${proj.name}`,
                                          onApply: (improved) => handleUpdateProjectBullet(pIdx, bIdx, improved),
                                        })
                                      }
                                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FBEFEA] hover:bg-[#F7E1D7] border border-[#C45D39]/30 text-[10px] font-bold text-[#C45D39] transition-all"
                                      title="AI Improve this project bullet"
                                    >
                                      <Sparkles className="w-2.5 h-2.5 text-[#C45D39]" />
                                      <span>AI Improve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProjectBullet(pIdx, bIdx)}
                                      className="text-[#674E61] hover:text-rose-600 p-1"
                                      aria-label={`Remove bullet ${bIdx + 1}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span>{bullet}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {isEditing && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddProjectBullet(pIdx)}
                          className="text-xs text-[#C45D39] hover:underline font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );

          // 3. Education & Credentials Section
          const renderEducationSection = () => (
            <div key="sec-education" className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#291B32] pb-1">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
                  Education & Credentials
                </h2>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="flex items-center gap-1 text-xs text-[#C45D39] hover:underline font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Education</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-1">
                {draft.education.map((edu, eduIdx) => (
                  <div key={eduIdx} className="text-xs sm:text-sm space-y-1">
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => handleUpdateEducation(eduIdx, "degree", e.target.value)}
                            placeholder="Degree"
                            className="font-bold text-[#291B32] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent flex-1"
                          />
                          <span className="text-[#674E61]">—</span>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => handleUpdateEducation(eduIdx, "institution", e.target.value)}
                            placeholder="Institution"
                            className="text-[#291B32] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={edu.year || ""}
                            onChange={(e) => handleUpdateEducation(eduIdx, "year", e.target.value)}
                            placeholder="Year"
                            className="text-right text-[#674E61] border border-transparent hover:border-[#DDD0D7] focus:border-[#C45D39] focus:ring-1 focus:ring-[#C45D39] rounded px-1.5 py-0.5 outline-none bg-transparent w-24"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEducation(eduIdx)}
                            className="text-[#674E61] hover:text-rose-600 p-1"
                            title="Remove education"
                            aria-label={`Remove education ${edu.degree}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <strong className="text-[#291B32]">{edu.degree}</strong> — {edu.institution}
                        </div>
                        <span className="text-[#674E61]">{edu.year}</span>
                      </div>
                    )}
                    {edu.details && (
                      <p className="text-[11px] text-[#674E61] italic">{edu.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );

          // 4. Certifications Section
          const renderCertificationsSection = () =>
            draft.certifications.length > 0 || isEditing ? (
              <div key="sec-certs" className="mt-5 space-y-2">
                <div className="flex items-center justify-between border-b border-[#291B32] pb-1">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#291B32]">
                    Certifications & Credentials
                  </h2>
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-[#291B32]">
                      {draft.certifications.map((cert, cIdx) => (
                        <li key={cIdx} className="leading-relaxed">
                          <div className="flex items-center justify-between gap-2">
                            <span>{cert}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCert(cIdx)}
                              className="text-[#674E61] hover:text-rose-600 p-0.5"
                              aria-label={`Remove ${cert}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newCert}
                        onChange={(e) => setNewCert(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCert()}
                        placeholder="+ Add Certification"
                        className="px-2.5 py-1 rounded bg-[#F7F2EB] border border-[#DDD0D7] text-xs text-[#291B32] focus:outline-none focus:border-[#C45D39] w-48"
                      />
                      {newCert.trim() && (
                        <button
                          type="button"
                          onClick={handleAddCert}
                          className="px-2.5 py-1 rounded bg-[#C45D39] text-white text-xs font-bold"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ul className="list-disc list-outside pl-4 space-y-1 text-xs sm:text-sm text-[#291B32] pt-1">
                    {draft.certifications.map((cert, cIdx) => (
                      <li key={cIdx} className="leading-relaxed">
                        {cert}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null;

          // Adaptive layout ordering based on candidate experience level
          if (isFresher) {
            return [
              renderProjectsSection(),
              renderEducationSection(),
              renderExperienceSection(),
              renderCertificationsSection(),
            ];
          } else {
            return [
              renderExperienceSection(),
              renderProjectsSection(),
              renderEducationSection(),
              renderCertificationsSection(),
            ];
          }
        })()}
      </div>

      {/* MODAL 1: RESUME QUALITY AUDIT MODAL */}
      {isAuditModalOpen && draft.audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#291B32]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#DDD0D7] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-[#291B32]">
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD0D7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C45D39]" />
                <h3 className="font-heading font-bold text-lg text-[#291B32]">
                  ATS & Resume Quality Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-[#F7F2EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Health Score Card */}
            <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#674E61] uppercase">Overall Document Health</span>
                <h4 className="text-xl font-extrabold text-[#291B32]">Grade {draft.audit.grade}</h4>
                <p className="text-xs text-[#674E61] mt-1">{draft.audit.summary}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-[#C45D39] font-mono">{draft.audit.overall_score}%</span>
                <span className="block text-[10px] text-[#674E61]">Health Index</span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-center">
                <span className="text-[10px] text-[#674E61] block">Word Count</span>
                <span className="text-sm font-bold text-[#291B32]">{draft.audit.metrics.word_count ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-center">
                <span className="text-[10px] text-[#674E61] block">Bullet Count</span>
                <span className="text-sm font-bold text-[#291B32]">{draft.audit.metrics.bullet_count ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-center">
                <span className="text-[10px] text-[#674E61] block">Avg Words/Bullet</span>
                <span className="text-sm font-bold text-[#291B32]">{draft.audit.metrics.avg_bullet_words ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-center">
                <span className="text-[10px] text-[#674E61] block">Duplicate Skills</span>
                <span className={`text-sm font-bold ${(draft.audit.metrics.duplicate_skills_count ?? 0) > 0 ? "text-amber-700" : "text-[#291B32]"}`}>
                  {draft.audit.metrics.duplicate_skills_count ?? 0}
                </span>
              </div>
            </div>

            {/* Issue Sections */}
            <div className="space-y-4 text-xs">
              {/* Errors */}
              {draft.audit.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Critical ATS Blockers ({draft.audit.errors.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.errors.map((err) => (
                      <div key={err.id} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-rose-950">{err.message}</strong>
                          {err.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100">{err.location}</span>}
                        </div>
                        <p className="text-[11px] text-rose-800">{err.detail}</p>
                        {err.recommendation && (
                          <p className="text-[11px] text-rose-900 font-medium">💡 Fix: {err.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {draft.audit.warnings.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Formatting & Consistency Warnings ({draft.audit.warnings.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.warnings.map((warn) => (
                      <div key={warn.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-950">{warn.message}</strong>
                          {warn.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100">{warn.location}</span>}
                        </div>
                        <p className="text-[11px] text-amber-800">{warn.detail}</p>
                        {warn.recommendation && (
                          <p className="text-[11px] text-amber-900 font-medium">💡 Fix: {warn.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {draft.audit.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-[#291B32] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C45D39]" />
                    <span>High-Impact Polish Suggestions ({draft.audit.suggestions.length})</span>
                  </h5>
                  <div className="space-y-2">
                    {draft.audit.suggestions.map((sug) => (
                      <div key={sug.id} className="p-3 rounded-lg bg-[#F7F2EB] border border-[#DDD0D7] text-[#291B32] space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#291B32]">{sug.message}</strong>
                          {sug.location && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8D9E8]">{sug.location}</span>}
                        </div>
                        <p className="text-[11px] text-[#674E61]">{sug.detail}</p>
                        {sug.recommendation && (
                          <p className="text-[11px] text-[#C45D39] font-medium">💡 Suggestion: {sug.recommendation}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#291B32]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#DDD0D7] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-[#291B32]">
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD0D7]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C45D39]" />
                <h3 className="font-heading font-bold text-lg text-[#291B32]">
                  Live Re-check Evaluation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDualScoreModal(false)}
                className="p-1 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-[#F7F2EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dual Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Score A: Job Description Match Score */}
              <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-semibold text-[#C45D39] uppercase block">Factor A</span>
                    <h4 className="font-bold text-sm text-[#291B32]">Job Description Match</h4>
                  </div>
                  <span className="text-2xl font-black text-[#C45D39] font-mono">
                    {draft.match_score}%
                  </span>
                </div>
                {draft.match_breakdown && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#674E61]">
                      <span>Required Skills (35%):</span>
                      <span className="font-bold text-[#291B32]">{draft.match_breakdown.required_skill_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Preferred Skills (15%):</span>
                      <span className="font-bold text-[#291B32]">{draft.match_breakdown.preferred_skill_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Experience Alignment (20%):</span>
                      <span className="font-bold text-[#291B32]">{draft.match_breakdown.experience_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Responsibilities (15%):</span>
                      <span className="font-bold text-[#291B32]">{draft.match_breakdown.responsibility_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Domain Keywords (10%):</span>
                      <span className="font-bold text-[#291B32]">{draft.match_breakdown.keyword_score}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Score B: ATS & Resume Quality Assessment */}
              <div className="p-4 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-semibold text-[#291B32] uppercase block">Factor B</span>
                    <h4 className="font-bold text-sm text-[#291B32]">ATS & Document Quality</h4>
                  </div>
                  <span className="text-2xl font-black text-[#291B32] font-mono">
                    {draft.ats_quality_assessment?.overall_score ?? draft.ats_compatibility?.score ?? 90}%
                  </span>
                </div>
                {draft.ats_quality_assessment && (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#674E61]">
                      <span>Parseability (25%):</span>
                      <span className="font-bold text-[#291B32]">{draft.ats_quality_assessment.parseability_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Section Structure (20%):</span>
                      <span className="font-bold text-[#291B32]">{draft.ats_quality_assessment.structure_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Readability (15%):</span>
                      <span className="font-bold text-[#291B32]">{draft.ats_quality_assessment.readability_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Formatting Consistency (15%):</span>
                      <span className="font-bold text-[#291B32]">{draft.ats_quality_assessment.formatting_consistency_score}%</span>
                    </div>
                    <div className="flex justify-between text-[#674E61]">
                      <span>Content Coverage (15%):</span>
                      <span className="font-bold text-[#291B32]">{draft.ats_quality_assessment.content_coverage_score}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Non-proprietary Disclaimer */}
            <div className="p-3.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[11px] text-[#674E61] leading-relaxed">
              <span className="font-bold text-[#291B32] block mb-0.5">Verification Disclaimer:</span>
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

      {/* SINGLE AI IMPROVE MODAL */}
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

      {/* MULTI-SECTION / WHOLE RESUME BATCH AI IMPROVE MODAL */}
      <BatchAIImproveModal
        isOpen={batchModalState.isOpen}
        onClose={() => setBatchModalState((prev) => ({ ...prev, isOpen: false }))}
        scope={batchModalState.scope}
        jobDescription={jobDescription}
        resumeData={draft}
        onAcceptSelected={handleAcceptBatchImprovements}
      />
    </div>
  );
};

export default InteractiveResumeEditor;
