"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  X,
  History,
  Trash2,
  ExternalLink,
  Calendar,
  Briefcase,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Star,
  GitFork,
  Edit3,
  ChevronDown,
  ChevronRight,
  GitCompare,
  Tag,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchHistory,
  fetchHistoryDetail,
  deleteHistory,
  forkVersion,
  updateVersionMetadata,
  downloadVersionExport,
} from "@/lib/api";
import {
  CustomizationHistoryItem,
  CustomizationHistoryDetail,
  ForkVersionRequest,
  UpdateVersionMetadataRequest,
} from "@/types/resume";
import VersionComparisonModal from "./VersionComparisonModal";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadHistory: (detail: CustomizationHistoryDetail) => void;
}

interface FamilyGroup {
  rootId: string;
  rootItem: CustomizationHistoryItem | null;
  items: CustomizationHistoryItem[];
}

export default function HistoryDrawer({ isOpen, onClose, onLoadHistory }: HistoryDrawerProps) {
  const { user, token } = useAuth();
  const [items, setItems] = useState<CustomizationHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStarredOnly, setFilterStarredOnly] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Accordion state for family groups
  const [collapsedFamilies, setCollapsedFamilies] = useState<Record<string, boolean>>({});

  // Action states
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingExport, setDownloadingExport] = useState<{ id: string; format: string } | null>(null);
  const [togglingStarId, setTogglingStarId] = useState<string | null>(null);

  // Sub-modals
  const [forkingItem, setForkingItem] = useState<CustomizationHistoryItem | null>(null);
  const [forkName, setForkName] = useState<string>("");
  const [forkNotes, setForkNotes] = useState<string>("");
  const [isSubmittingFork, setIsSubmittingFork] = useState<boolean>(false);

  const [renamingItem, setRenamingItem] = useState<CustomizationHistoryItem | null>(null);
  const [renameVersionName, setRenameVersionName] = useState<string>("");
  const [renameTitle, setRenameTitle] = useState<string>("");
  const [renameNotes, setRenameNotes] = useState<string>("");
  const [renameTagsInput, setRenameTagsInput] = useState<string>("");
  const [isSubmittingRename, setIsSubmittingRename] = useState<boolean>(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Comparison selection (exactly 2 IDs)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(token);
      setItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load history";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let isMounted = true;
    fetchHistory(token)
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load history";
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  // Flash auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Handle escape key navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else if (forkingItem) {
          setForkingItem(null);
        } else if (renamingItem) {
          setRenamingItem(null);
        } else if (isCompareModalOpen) {
          setIsCompareModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmDeleteId, forkingItem, renamingItem, isCompareModalOpen, onClose]);

  // Extract all available tags across items
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      (item.version_tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStarredOnly && !item.is_starred) return false;
      if (selectedTag && !(item.version_tags || []).includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchName = item.version_name?.toLowerCase().includes(q);
        const matchRole = item.target_role?.toLowerCase().includes(q);
        const matchNotes = item.version_notes?.toLowerCase().includes(q);
        const matchTags = (item.version_tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchName && !matchRole && !matchNotes && !matchTags) return false;
      }
      return true;
    });
  }, [items, filterStarredOnly, selectedTag, searchQuery]);

  // Group items by revision family (root_id)
  const familyGroups = useMemo<FamilyGroup[]>(() => {
    const groupsMap = new Map<string, CustomizationHistoryItem[]>();

    filteredItems.forEach((item) => {
      const familyKey = item.root_id || item.id;
      const list = groupsMap.get(familyKey) || [];
      list.push(item);
      groupsMap.set(familyKey, list);
    });

    const result: FamilyGroup[] = [];
    groupsMap.forEach((groupItems, rootId) => {
      // Sort items within family by version_number ascending (or created_at)
      groupItems.sort((a, b) => (a.version_number ?? 1) - (b.version_number ?? 1));
      const rootItem = items.find((i) => i.id === rootId) || groupItems[0];
      result.push({
        rootId,
        rootItem,
        items: groupItems,
      });
    });

    // Sort families: newest root first
    result.sort((a, b) => {
      const timeA = new Date(a.rootItem?.created_at || 0).getTime();
      const timeB = new Date(b.rootItem?.created_at || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [filteredItems, items]);

  if (!isOpen) return null;

  const toggleFamilyCollapse = (rootId: string) => {
    setCollapsedFamilies((prev) => ({
      ...prev,
      [rootId]: !prev[rootId],
    }));
  };

  const handleSelect = async (id: string) => {
    if (!token) return;
    setLoadingDetailId(id);
    try {
      const detail = await fetchHistoryDetail(token, id);
      onLoadHistory(detail);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load item detail";
      setError(msg);
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleToggleStar = async (item: CustomizationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    const newStarred = !item.is_starred;
    setTogglingStarId(item.id);
    try {
      await updateVersionMetadata(token, item.id, { is_starred: newStarred });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_starred: newStarred } : i))
      );
      setSuccessMsg(newStarred ? "Added to starred versions" : "Removed from starred versions");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle star";
      setError(msg);
    } finally {
      setTogglingStarId(null);
    }
  };

  const handleOpenForkModal = (item: CustomizationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setForkingItem(item);
    setForkName(`Fork of ${item.version_name || item.title || `v${item.version_number || 1}`}`);
    setForkNotes("");
  };

  const handleSubmitFork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !forkingItem || !forkName.trim()) return;
    setIsSubmittingFork(true);
    try {
      const req: ForkVersionRequest = {
        new_version_name: forkName.trim(),
        version_notes: forkNotes.trim() || undefined,
      };
      const created = await forkVersion(token, forkingItem.id, req);
      setSuccessMsg(`Created fork "${created.version_name || created.title}" (v${created.version_number})`);
      setForkingItem(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fork version";
      setError(msg);
    } finally {
      setIsSubmittingFork(false);
    }
  };

  const handleOpenRenameModal = (item: CustomizationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingItem(item);
    setRenameVersionName(item.version_name || "");
    setRenameTitle(item.title || "");
    setRenameNotes(item.version_notes || "");
    setRenameTagsInput((item.version_tags || []).join(", "));
  };

  const handleSubmitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !renamingItem) return;
    setIsSubmittingRename(true);
    try {
      const tags = renameTagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const req: UpdateVersionMetadataRequest = {
        version_name: renameVersionName.trim() || undefined,
        title: renameTitle.trim() || undefined,
        version_notes: renameNotes.trim() || undefined,
        version_tags: tags,
      };

      const updated = await updateVersionMetadata(token, renamingItem.id, req);
      setItems((prev) => prev.map((i) => (i.id === renamingItem.id ? { ...i, ...updated } : i)));
      setSuccessMsg("Version metadata updated successfully");
      setRenamingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update version metadata";
      setError(msg);
    } finally {
      setIsSubmittingRename(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteHistory(token, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedForCompare((prev) => prev.filter((iId) => iId !== id));
      setSuccessMsg("Resume version deleted successfully");
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete item";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (
    item: CustomizationHistoryItem,
    format: "pdf" | "docx" | "txt",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!token) return;
    setDownloadingExport({ id: item.id, format });
    try {
      const { blob, filename } = await downloadVersionExport(token, item.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMsg(`Exported ${format.toUpperCase()} successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`;
      setError(msg);
    } finally {
      setDownloadingExport(null);
    }
  };

  const handleToggleCompareSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        // Replace second item or keep max 2
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleSwapCompare = () => {
    setSelectedForCompare((prev) => (prev.length === 2 ? [prev[1], prev[0]] : prev));
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getVersionDisplayName = (item: CustomizationHistoryItem) => {
    return item.version_name?.trim() || item.title?.trim() || `Revision v${item.version_number ?? 1}`;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-drawer-title"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <div className="w-screen max-w-2xl bg-white  border-l border-[#E2E8E4]  shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E8E4]  flex items-center justify-between bg-[#F8F7F3] dark:bg-[#F8F7F3]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100  text-[#087F66]  rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="history-drawer-title"
                    className="text-base font-bold text-[#15283B]  flex items-center gap-2"
                  >
                    <span>Resume Version History</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#DCEDE5]/40 text-[#087F66] dark:bg-blue-950/60  border border-[#DCEDE5]  font-mono">
                      {items.length} {items.length === 1 ? "version" : "versions"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 ">
                    {user?.email || "Manage revision families, restore, and compare versions"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={loadData}
                  title="Refresh history"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600  hover:bg-slate-100  transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close history drawer"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600  hover:bg-slate-100  transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification feedback banners */}
            {error && (
              <div className="m-4 mb-0 flex items-start gap-2.5 p-3.5 text-xs text-rose-700 dark:text-rose-400 bg-rose-50  border border-rose-200  rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Error</p>
                  <p className="mt-0.5">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {successMsg && (
              <div className="m-4 mb-0 flex items-center gap-2 p-3 text-xs text-emerald-800  bg-emerald-50  border border-emerald-200  rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Search and Filter Bar */}
            <div className="p-4 border-b border-[#E2E8E4]  space-y-3 bg-white ">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, version name, role, tag, or notes..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[#F8F7F3] /80 border border-[#E2E8E4]  text-[#15283B]  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    filterStarredOnly
                      ? "bg-amber-50  text-amber-700  border-amber-300 "
                      : "bg-[#F8F7F3] /60 text-slate-600  border-[#E2E8E4]  hover:border-slate-300"
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      filterStarredOnly ? "fill-amber-400 text-amber-500" : "text-slate-400"
                    }`}
                  />
                  <span>Favorites Only</span>
                </button>

                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      selectedTag === tag
                        ? "bg-[#DCEDE5]/40 dark:bg-blue-950/60 text-[#087F66]  border-blue-300 "
                        : "bg-[#F8F7F3] /60 text-slate-600  border-[#E2E8E4]  hover:border-slate-300"
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                  </button>
                ))}

                {(searchQuery || filterStarredOnly || selectedTag) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStarredOnly(false);
                      setSelectedTag(null);
                    }}
                    className="text-xs text-[#087F66]  hover:underline ml-auto font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#087F66]" />
                  <span className="text-xs font-medium">Loading resume versions...</span>
                </div>
              ) : familyGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-[#E2E8E4]  rounded-2xl">
                  <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700 ">
                    {searchQuery || filterStarredOnly || selectedTag
                      ? "No Matching Resume Versions"
                      : "No Saved Resumes Yet"}
                  </h3>
                  <p className="text-xs text-slate-500  mt-1 max-w-sm">
                    {searchQuery || filterStarredOnly || selectedTag
                      ? "Try adjusting your search criteria or resetting filters."
                      : "Tailor a resume and click 'Save to History' to manage revision families, compare versions, and export anytime."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {familyGroups.map((family) => {
                    const isCollapsed = Boolean(collapsedFamilies[family.rootId]);
                    const count = family.items.length;
                    const rootItem = family.rootItem;

                    return (
                      <div
                        key={family.rootId}
                        className="rounded-2xl border border-[#E2E8E4]  bg-white  overflow-hidden shadow-sm"
                      >
                        {/* Family Header */}
                        <div
                          onClick={() => toggleFamilyCollapse(family.rootId)}
                          className="p-3.5 bg-[#F8F7F3] /60 border-b border-[#E2E8E4]  flex items-center justify-between cursor-pointer hover:bg-slate-100  transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              aria-label={isCollapsed ? "Expand revision family" : "Collapse revision family"}
                              className="text-slate-400 hover:text-slate-600 "
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200  text-slate-700  uppercase tracking-wider font-mono">
                                  Family
                                </span>
                                <span className="font-bold text-xs text-[#15283B]  truncate">
                                  {rootItem?.title || rootItem?.version_name || "Revision Family"}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100  text-[#087F66] ">
                                  {count} {count === 1 ? "version" : "revisions"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[11px] text-slate-400 font-mono">
                            Root #{family.rootId.slice(0, 8)}
                          </span>
                        </div>

                        {/* Family Items */}
                        {!isCollapsed && (
                          <div className="p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                            {family.items.map((item) => {
                              const isSelectedForCompare = selectedForCompare.includes(item.id);
                              const compareIndex = selectedForCompare.indexOf(item.id);

                              return (
                                <div
                                  key={item.id}
                                  className={`pt-3 first:pt-0 group relative p-3 rounded-xl border transition-all ${
                                    isSelectedForCompare
                                      ? "border-blue-500 bg-[#DCEDE5]/40/20 "
                                      : "border-transparent hover:border-[#E2E8E4] dark:hover:border-slate-700 bg-white "
                                  }`}
                                >
                                  {/* Card Top Row: Checkbox, Name/Number, Actions */}
                                  <div className="flex items-start justify-between gap-2.5">
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                      {/* Compare selection checkbox */}
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleCompareSelection(item.id, e)}
                                        title={
                                          isSelectedForCompare
                                            ? `Selected as Version ${compareIndex === 0 ? "A" : "B"}`
                                            : "Select for side-by-side comparison"
                                        }
                                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                          isSelectedForCompare
                                            ? "bg-[#087F66] border-blue-600 text-white font-bold text-[10px]"
                                            : "border-slate-300  hover:border-blue-500"
                                        }`}
                                      >
                                        {isSelectedForCompare ? (compareIndex === 0 ? "A" : "B") : null}
                                      </button>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {/* Version Number Badge */}
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono bg-slate-100  text-slate-700  border border-[#E2E8E4] ">
                                            v{item.version_number ?? 1}
                                          </span>

                                          {/* Version Name */}
                                          <h4 className="text-xs font-bold text-[#15283B]  truncate">
                                            {getVersionDisplayName(item)}
                                          </h4>

                                          {/* Star/Favorite Button */}
                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleStar(item, e)}
                                            disabled={togglingStarId === item.id}
                                            title={item.is_starred ? "Remove favorite" : "Mark as favorite"}
                                            className="text-slate-300 hover:text-amber-400 p-0.5 transition-colors"
                                          >
                                            <Star
                                              className={`w-3.5 h-3.5 ${
                                                item.is_starred
                                                  ? "fill-amber-400 text-amber-500"
                                                  : "text-slate-300 dark:text-slate-600"
                                              }`}
                                            />
                                          </button>
                                        </div>

                                        {/* Target Role & Title */}
                                        <div className="space-y-0.5 mt-0.5">
                                          {item.target_role && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-500  truncate">
                                              <Briefcase className="w-3 h-3 shrink-0" />
                                              <span className="truncate">{item.target_role}</span>
                                            </div>
                                          )}
                                          {item.title && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400  truncate" title={item.title}>
                                              <span className="truncate">{`Title: ${item.title}`}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Version Notes */}
                                        {item.version_notes && (
                                          <p className="text-[11px] text-slate-600  mt-1 italic line-clamp-1">
                                            &ldquo;{item.version_notes}&rdquo;
                                          </p>
                                        )}

                                        {/* Tags */}
                                        {item.version_tags && item.version_tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                            {item.version_tags.map((t, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100  text-slate-600  border border-[#E2E8E4] "
                                              >
                                                {t}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Inline Actions: Rename, Fork, Delete */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenRenameModal(item, e)}
                                        title="Rename or edit metadata"
                                        className="p-1.5 text-slate-400 hover:text-[#087F66] dark:hover:text-blue-400 rounded-lg hover:bg-slate-100  transition-colors"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenForkModal(item, e)}
                                        title="Fork / Duplicate version"
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100  transition-colors"
                                      >
                                        <GitFork className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(item.id);
                                        }}
                                        title="Delete version"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Card Bottom Row: Metadata, Scores, Load Button, Export */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100  text-[11px]">
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(item.created_at)}</span>
                                      </div>
                                      {item.ats_score !== undefined && item.ats_score !== null && (
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                          ATS {item.ats_score}%
                                        </span>
                                      )}
                                      {item.match_score !== undefined && item.match_score !== null && (
                                        <span className="font-semibold text-[#087F66] ">
                                          Match {item.match_score}%
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Export Format Dropdown / Buttons */}
                                      <div className="flex items-center gap-1 border border-[#E2E8E4]  rounded-lg p-0.5 bg-[#F8F7F3] ">
                                        <button
                                          type="button"
                                          onClick={(e) => handleExport(item, "pdf", e)}
                                          disabled={downloadingExport?.id === item.id}
                                          title="Export PDF"
                                          className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white dark:hover:bg-slate-700 text-slate-600  transition-colors disabled:opacity-50"
                                        >
                                          {downloadingExport?.id === item.id && downloadingExport.format === "pdf" ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            "PDF"
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleExport(item, "docx", e)}
                                          disabled={downloadingExport?.id === item.id}
                                          title="Export DOCX"
                                          className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white dark:hover:bg-slate-700 text-slate-600  transition-colors disabled:opacity-50"
                                        >
                                          {downloadingExport?.id === item.id && downloadingExport.format === "docx" ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            "DOCX"
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleExport(item, "txt", e)}
                                          disabled={downloadingExport?.id === item.id}
                                          title="Export TXT"
                                          className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white dark:hover:bg-slate-700 text-slate-600  transition-colors disabled:opacity-50"
                                        >
                                          {downloadingExport?.id === item.id && downloadingExport.format === "txt" ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            "TXT"
                                          )}
                                        </button>
                                      </div>

                                      {/* Restore / Load Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleSelect(item.id)}
                                        disabled={loadingDetailId === item.id}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs bg-[#087F66] hover:bg-[#066B56] text-white transition-colors"
                                      >
                                        {loadingDetailId === item.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <span>Restore</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Compare Action Footer Bar */}
            {selectedForCompare.length > 0 && (
              <div className="p-4 border-t border-[#E2E8E4]  bg-[#F8F7F3] /90 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <GitCompare className="w-4 h-4 text-[#087F66]" />
                  <span className="font-semibold text-slate-800 ">
                    {selectedForCompare.length} of 2 selected for comparison
                  </span>
                  {selectedForCompare.length < 2 && (
                    <span className="text-slate-400 italic">(select 1 more)</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedForCompare([])}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    disabled={selectedForCompare.length !== 2}
                    onClick={() => setIsCompareModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      selectedForCompare.length === 2
                        ? "bg-[#087F66] hover:bg-[#066B56] text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-200  text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Compare (2 selected)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-[#15283B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white  border border-[#E2E8E4]  rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#15283B] ">
                Confirm Version Deletion
              </h3>
            </div>

            <p className="text-xs text-slate-600  leading-relaxed">
              Are you sure you want to delete this saved resume version?
              <br />
              <strong className="text-slate-800  font-semibold mt-1 block">
                Any existing child versions will not be deleted; they will be safely reparented.
              </strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600  hover:bg-slate-100 "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                {deletingId === confirmDeleteId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Version</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fork Modal */}
      {forkingItem && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-[#15283B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white  border border-[#E2E8E4]  rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8E4] ">
              <div className="flex items-center gap-2">
                <GitFork className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-[#15283B] ">
                  Duplicate / Fork Version
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForkingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create a child branch in this revision family originating from{" "}
              <strong>{getVersionDisplayName(forkingItem)} (v{forkingItem.version_number ?? 1})</strong>.
            </p>

            <form onSubmit={handleSubmitFork} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  New Version Name *
                </label>
                <input
                  type="text"
                  required
                  value={forkName}
                  onChange={(e) => setForkName(e.target.value)}
                  placeholder="e.g. Senior Backend Role Variant"
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  Version Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={forkNotes}
                  onChange={(e) => setForkNotes(e.target.value)}
                  placeholder="e.g. Targeted toward AWS / Kubernetes focus"
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForkingItem(null)}
                  className="px-3 py-1.5 rounded-xl font-semibold text-slate-600  hover:bg-slate-100 "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFork || !forkName.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingFork ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitFork className="w-3.5 h-3.5" />
                  )}
                  <span>Create Fork</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename / Edit Metadata Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-[#15283B]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white  border border-[#E2E8E4]  rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8E4] ">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#087F66]" />
                <h3 className="font-bold text-sm text-[#15283B] ">
                  Edit Version Metadata
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenamingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRename} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  Version Name
                </label>
                <input
                  type="text"
                  value={renameVersionName}
                  onChange={(e) => setRenameVersionName(e.target.value)}
                  placeholder="e.g. Fintech Tech Lead Draft"
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  placeholder="e.g. Jane Doe - Tech Lead Resume"
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={renameNotes}
                  onChange={(e) => setRenameNotes(e.target.value)}
                  placeholder="Add notes about this iteration..."
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700  mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={renameTagsInput}
                  onChange={(e) => setRenameTagsInput(e.target.value)}
                  placeholder="e.g. backend, remote, fintech"
                  className="w-full p-2.5 rounded-xl bg-[#F8F7F3]  border border-[#E2E8E4]  text-[#15283B]  focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3 py-1.5 rounded-xl font-semibold text-slate-600  hover:bg-slate-100 "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRename}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold bg-[#087F66] hover:bg-[#066B56] text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingRename ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isCompareModalOpen && selectedForCompare.length === 2 && (
        <VersionComparisonModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          versionAId={selectedForCompare[0]}
          versionBId={selectedForCompare[1]}
          onSwap={handleSwapCompare}
        />
      )}
    </>
  );
}
