"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bookmark,
  GitBranch,
  FolderPlus,
  Loader2,
  Tag,
  AlertCircle,
  Info,
} from "lucide-react";

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  jobDescription: string;
  activeVersionId: string | null;
  activeVersionName: string | null;
  activeVersionNumber: number | null;
  isSaving: boolean;
  onSave: (options: {
    title: string;
    version_name: string;
    parent_id: string | null;
    version_notes?: string;
    version_tags?: string[];
  }) => Promise<void>;
}

export default function SaveVersionModal(props: SaveVersionModalProps) {
  if (!props.isOpen) return null;
  return <SaveVersionModalContent {...props} />;
}

function SaveVersionModalContent({
  onClose,
  candidateName,
  jobDescription,
  activeVersionId,
  activeVersionName,
  activeVersionNumber,
  isSaving,
  onSave,
}: Omit<SaveVersionModalProps, "isOpen">) {
  const jdFirstLine = jobDescription.split("\n")[0].trim().slice(0, 45);
  const defaultTitle = `${candidateName || "Tailored"} - ${jdFirstLine || "Customized Resume"}`;
  const defaultVersionName = activeVersionId
    ? `Revision v${(activeVersionNumber ?? 1) + 1}`
    : jdFirstLine
    ? `${jdFirstLine} Tailored`
    : "Initial Tailored Version";

  const [saveMode, setSaveMode] = useState<"child" | "new_root">(
    activeVersionId ? "child" : "new_root"
  );
  const [title, setTitle] = useState<string>(defaultTitle);
  const [versionName, setVersionName] = useState<string>(defaultVersionName);
  const [versionNotes, setVersionNotes] = useState<string>("");
  const [versionTags, setVersionTags] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !versionName.trim()) {
      setError("Please provide both a Title and a Version Name.");
      return;
    }

    const tags = versionTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const parentId = activeVersionId && saveMode === "child" ? activeVersionId : null;

    try {
      await onSave({
        title: title.trim(),
        version_name: versionName.trim(),
        parent_id: parentId,
        version_notes: versionNotes.trim() || undefined,
        version_tags: tags,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save version";
      setError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-version-modal-title"
      className="fixed inset-0 z-60 overflow-y-auto bg-[#15283B]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#E2E8E4] rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8E4] bg-[#F8F7F3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#DCEDE5] text-[#087F66] rounded-xl">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="save-version-modal-title"
                className="text-base font-bold text-[#15283B]"
              >
                Save Resume Version
              </h2>
              <p className="text-xs text-[#64748B]">
                Snapshots are immutable. Saving creates a new tracked revision.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close save dialog"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#15283B] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Lineage Choice (if active version exists) */}
          {activeVersionId && (
            <div className="space-y-2">
              <label className="block font-bold text-[#15283B]">
                Revision Lineage Choice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Child revision */}
                <button
                  type="button"
                  onClick={() => setSaveMode("child")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "child"
                      ? "border-[#087F66] bg-[#DCEDE5]/35 ring-2 ring-[#087F66]/20"
                      : "border-[#E2E8E4] bg-white hover:border-[#087F66]/40 hover:bg-[#F8F7F3]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-[#087F66] shrink-0" />
                    <span className="font-bold text-[#15283B]">
                      Child Revision
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-snug">
                    Branch from active snapshot (v{activeVersionNumber ?? 1}) in the current family.
                  </p>
                </button>

                {/* Option 2: New independent root */}
                <button
                  type="button"
                  onClick={() => setSaveMode("new_root")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "new_root"
                      ? "border-[#087F66] bg-[#DCEDE5]/35 ring-2 ring-[#087F66]/20"
                      : "border-[#E2E8E4] bg-white hover:border-[#087F66]/40 hover:bg-[#F8F7F3]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderPlus className="w-4 h-4 text-[#087F66] shrink-0" />
                    <span className="font-bold text-[#15283B]">
                      New Root (v1)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-snug">
                    Create a brand-new independent revision family.
                  </p>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mt-1">
                <Info className="w-3.5 h-3.5 text-[#087F66] shrink-0" />
                <span>
                  Active snapshot: <strong className="text-[#15283B]">{activeVersionName}</strong> (will remain untouched).
                </span>
              </div>
            </div>
          )}

          {/* Version Name */}
          <div>
            <label className="block font-bold text-[#15283B] mb-1">
              Version Name *
            </label>
            <input
              type="text"
              required
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Revision v2 or Lead Backend Focused"
              className="w-full p-2.5 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4] text-[#15283B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F66]/20 focus:border-[#087F66]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-[#15283B] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. John Doe - Staff Engineer"
              className="w-full p-2.5 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4] text-[#15283B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F66]/20 focus:border-[#087F66]"
            />
          </div>

          {/* Version Notes */}
          <div>
            <label className="block font-bold text-[#15283B] mb-1">
              Version Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Document specific adjustments made in this revision..."
              className="w-full p-2.5 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4] text-[#15283B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F66]/20 focus:border-[#087F66] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-[#15283B] mb-1">
              Tags (Optional, comma-separated)
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={versionTags}
                onChange={(e) => setVersionTags(e.target.value)}
                placeholder="e.g. backend, cloud, python"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F8F7F3] border border-[#E2E8E4] text-[#15283B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087F66]/20 focus:border-[#087F66]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8E4]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl font-semibold text-[#64748B] hover:bg-[#F8F7F3] hover:text-[#15283B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !versionName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-[#087F66] hover:bg-[#066B56] text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? "Saving Version..." : "Save Resume Version"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
