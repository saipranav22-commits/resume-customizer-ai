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
      className="fixed inset-0 z-60 overflow-y-auto bg-[#0B101A]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-lg bg-[#111827] border border-[#30384B] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#30384B] bg-[#1B2231] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2C224B] text-[#B89AFF] rounded-xl border border-[#7C4DFF]/30">
              <Bookmark className="w-5 h-5 text-[#7C4DFF]" />
            </div>
            <div>
              <h2
                id="save-version-modal-title"
                className="font-heading text-base font-bold text-[#F7F7FA]"
              >
                Save Resume Version
              </h2>
              <p className="text-xs text-[#B8B9D0]">
                Snapshots are immutable. Saving creates a new tracked revision.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close save dialog"
            className="p-1.5 rounded-lg text-[#B8B9D0] hover:text-[#F7F7FA] hover:bg-[#111827] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Lineage Choice (if active version exists) */}
          {activeVersionId && (
            <div className="space-y-2">
              <label className="block font-bold text-[#F7F7FA]">
                Revision Lineage Choice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Child revision */}
                <button
                  type="button"
                  onClick={() => setSaveMode("child")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "child"
                      ? "border-[#7C4DFF] bg-[#2C224B] ring-2 ring-[#7C4DFF]/30 text-[#F7F7FA]"
                      : "border-[#30384B] bg-[#1B2231] hover:border-[#7C4DFF]/40 text-[#B8B9D0]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span className="font-bold text-[#F7F7FA]">
                      Child Revision
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B9D0] leading-snug">
                    Branch from active snapshot (v{activeVersionNumber ?? 1}) in the current family.
                  </p>
                </button>

                {/* Option 2: New independent root */}
                <button
                  type="button"
                  onClick={() => setSaveMode("new_root")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "new_root"
                      ? "border-[#7C4DFF] bg-[#2C224B] ring-2 ring-[#7C4DFF]/30 text-[#F7F7FA]"
                      : "border-[#30384B] bg-[#1B2231] hover:border-[#7C4DFF]/40 text-[#B8B9D0]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderPlus className="w-4 h-4 text-[#7C4DFF] shrink-0" />
                    <span className="font-bold text-[#F7F7FA]">
                      New Root (v1)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B9D0] leading-snug">
                    Create a brand-new independent revision family.
                  </p>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#B8B9D0] mt-1">
                <Info className="w-3.5 h-3.5 text-[#7C4DFF] shrink-0" />
                <span>
                  Active snapshot: <strong className="text-[#F7F7FA]">{activeVersionName}</strong> (will remain untouched).
                </span>
              </div>
            </div>
          )}

          {/* Version Name */}
          <div>
            <label className="block font-bold text-[#F7F7FA] mb-1">
              Version Name *
            </label>
            <input
              type="text"
              required
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Revision v2 or Lead Backend Focused"
              className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-[#F7F7FA] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. John Doe - Staff Engineer"
              className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
            />
          </div>

          {/* Version Notes */}
          <div>
            <label className="block font-bold text-[#F7F7FA] mb-1">
              Version Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Document specific adjustments made in this revision..."
              className="w-full p-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-[#F7F7FA] mb-1">
              Tags (Optional, comma-separated)
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-[#B8B9D0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={versionTags}
                onChange={(e) => setVersionTags(e.target.value)}
                placeholder="e.g. backend, cloud, python"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0B101A] border border-[#30384B] text-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30384B]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl font-semibold text-[#B8B9D0] hover:bg-[#1B2231] hover:text-[#F7F7FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !versionName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-[#7C4DFF] hover:bg-[#6940DE] active:bg-[#5833C5] text-white transition-colors disabled:opacity-50 shadow-md shadow-[#7C4DFF]/25"
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
