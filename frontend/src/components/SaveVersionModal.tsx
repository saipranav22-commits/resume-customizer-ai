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
      className="fixed inset-0 z-60 overflow-y-auto bg-[#291B32]/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-lg bg-white border border-[#DDD0D7] rounded-2xl shadow-2xl overflow-hidden text-[#291B32]">
        {/* Header */}
        <div className="p-5 border-b border-[#DDD0D7] bg-[#F7F2EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E8D9E8] text-[#291B32] rounded-xl border border-[#DDD0D7]">
              <Bookmark className="w-5 h-5 text-[#C45D39]" />
            </div>
            <div>
              <h2
                id="save-version-modal-title"
                className="font-heading text-base font-bold text-[#291B32]"
              >
                Save Resume Version
              </h2>
              <p className="text-xs text-[#674E61]">
                Snapshots are immutable. Saving creates a new tracked revision.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close save dialog"
            className="p-1.5 rounded-lg text-[#674E61] hover:text-[#291B32] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-rose-900 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Lineage Choice (if active version exists) */}
          {activeVersionId && (
            <div className="space-y-2">
              <label className="block font-bold text-[#291B32]">
                Revision Lineage Choice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Child revision */}
                <button
                  type="button"
                  onClick={() => setSaveMode("child")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "child"
                      ? "border-[#C45D39] bg-[#FDF6F3] ring-2 ring-[#C45D39]/30 text-[#291B32]"
                      : "border-[#DDD0D7] bg-[#F7F2EB] hover:border-[#C45D39]/40 text-[#674E61]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-[#C45D39] shrink-0" />
                    <span className="font-bold text-[#291B32]">
                      Child Revision
                    </span>
                  </div>
                  <p className="text-[11px] text-[#674E61] leading-snug">
                    Branch from active snapshot (v{activeVersionNumber ?? 1}) in the current family.
                  </p>
                </button>

                {/* Option 2: New independent root */}
                <button
                  type="button"
                  onClick={() => setSaveMode("new_root")}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    saveMode === "new_root"
                      ? "border-[#C45D39] bg-[#FDF6F3] ring-2 ring-[#C45D39]/30 text-[#291B32]"
                      : "border-[#DDD0D7] bg-[#F7F2EB] hover:border-[#C45D39]/40 text-[#674E61]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderPlus className="w-4 h-4 text-[#C45D39] shrink-0" />
                    <span className="font-bold text-[#291B32]">
                      New Root (v1)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#674E61] leading-snug">
                    Create a brand-new independent revision family.
                  </p>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#674E61] mt-1">
                <Info className="w-3.5 h-3.5 text-[#C45D39] shrink-0" />
                <span>
                  Active snapshot: <strong className="text-[#291B32]">{activeVersionName}</strong> (will remain untouched).
                </span>
              </div>
            </div>
          )}

          {/* Version Name */}
          <div>
            <label className="block font-bold text-[#291B32] mb-1">
              Version Name *
            </label>
            <input
              type="text"
              required
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. Revision v2 or Lead Backend Focused"
              className="w-full p-2.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-[#291B32] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. John Doe - Staff Engineer"
              className="w-full p-2.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
            />
          </div>

          {/* Version Notes */}
          <div>
            <label className="block font-bold text-[#291B32] mb-1">
              Version Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Document specific adjustments made in this revision..."
              className="w-full p-2.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39] resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block font-bold text-[#291B32] mb-1">
              Tags (Optional, comma-separated)
            </label>
            <div className="relative">
              <Tag className="w-3.5 h-3.5 text-[#674E61] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={versionTags}
                onChange={(e) => setVersionTags(e.target.value)}
                placeholder="e.g. backend, cloud, python"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F7F2EB] border border-[#DDD0D7] text-[#291B32] placeholder-[#674E61]/60 focus:outline-none focus:ring-1 focus:ring-[#C45D39] focus:border-[#C45D39]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDD0D7]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl font-semibold text-[#674E61] hover:bg-[#F7F2EB] hover:text-[#291B32] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !versionName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-[#C45D39] hover:bg-[#b35230] text-white transition-colors disabled:opacity-50 shadow-md shadow-[#C45D39]/20"
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
