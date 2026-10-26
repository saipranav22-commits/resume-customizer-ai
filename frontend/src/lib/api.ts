import {
  TailoredResumeResponse,
  HealthResponse,
  CoverLetterRequest,
  CustomizationHistoryItem,
  CustomizationHistoryDetail,
  SaveHistoryRequest,
  UserProfile,
  FetchHistoryOptions,
  ForkVersionRequest,
  UpdateVersionMetadataRequest,
  CompareVersionsRequest,
  VersionComparisonResponse,
  ImproveTextRequest,
  ImproveTextResponse,
  RecheckScoreRequest,
  RecheckScoreResponse,
  ResumeQualityAudit,
  BatchImproveRequest,
  BatchImproveResponse,
} from "@/types/resume";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new ApiError(`Health check returned status ${res.status}`, res.status);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "Unable to connect to the backend server. Please verify the Python FastAPI server is running on port 8000.",
      0
    );
  }
}

export async function customizeResume(
  file: File,
  jobDescription: string,
  options?: {
    customizeSummary?: boolean;
    customizeSkills?: boolean;
    customizeExperience?: boolean;
  },
  token?: string | null
): Promise<TailoredResumeResponse> {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("job_description", jobDescription);
  formData.append("customize_summary", String(options?.customizeSummary ?? true));
  formData.append("customize_skills", String(options?.customizeSkills ?? true));
  formData.append("customize_experience", String(options?.customizeExperience ?? true));

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/customize`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = Array.isArray(errJson.detail)
            ? errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
            : errJson.detail;
        }
      } catch {
        const rawText = await res.text();
        if (rawText) errorMsg = rawText;
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Network error occurred";
    throw new ApiError(msg, 0);
  }
}

export async function downloadExport(
  resumeData: TailoredResumeResponse,
  format: "pdf" | "docx" | "txt"
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/export/${format}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resumeData),
    });

    if (!res.ok) {
      let errorMsg = `Export failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, res.status);
    }

    const blob = await res.blob();
    let filename = `Tailored_Resume.${format}`;
    const disposition = res.headers.get("Content-Disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"']+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    return { blob, filename };
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to download export file";
    throw new ApiError(msg, 0);
  }
}

export async function downloadCoverLetterPdf(
  req: CoverLetterRequest
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/export/cover-letter/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Cover letter export failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // use default
      }
      throw new ApiError(errorMsg, res.status);
    }

    const blob = await res.blob();
    let filename = `Tailored_Cover_Letter.pdf`;
    const disposition = res.headers.get("Content-Disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"']+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    return { blob, filename };
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to download cover letter PDF";
    throw new ApiError(msg, 0);
  }
}

// Helper function to extract user-friendly error messages
function formatApiError(status: number, errJson?: unknown, defaultMsg: string = ""): string {
  if (status === 401) return "Your session has expired. Please log in again.";
  if (status === 403) return "You do not have permission to access or modify this version.";
  if (status === 404) return "The requested resume version was not found.";
  if (status === 409) {
    if (typeof errJson === "object" && errJson !== null && "detail" in errJson) {
      return String((errJson as { detail: unknown }).detail);
    }
    return "A versioning conflict occurred. Please refresh your history.";
  }
  if (typeof errJson === "object" && errJson !== null && "detail" in errJson) {
    const detail = (errJson as { detail: unknown }).detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join(", ");
    }
    return String(detail);
  }
  return defaultMsg || `Request failed with status ${status}`;
}

// --- Phase 5A & 5B: Resume History & Version Management API Services ---

export async function fetchHistory(
  token: string,
  options?: FetchHistoryOptions
): Promise<CustomizationHistoryItem[]> {
  try {
    const params = new URLSearchParams();
    if (options?.resume_id) params.append("resume_id", options.resume_id);
    if (options?.root_id) params.append("root_id", options.root_id);
    if (options?.is_starred !== undefined) params.append("is_starred", String(options.is_starred));
    if (options?.tag) params.append("tag", options.tag);
    if (options?.search) params.append("search", options.search);
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.offset !== undefined) params.append("offset", String(options.offset));

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/history${queryString}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to load resume history"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to load resume history";
    throw new ApiError(msg, 0);
  }
}

export async function fetchHistoryDetail(
  token: string,
  historyId: string
): Promise<CustomizationHistoryDetail> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/${historyId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to load history details"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to load history details";
    throw new ApiError(msg, 0);
  }
}

export async function saveHistory(
  token: string,
  payload: SaveHistoryRequest
): Promise<CustomizationHistoryItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to save history"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to save to history";
    throw new ApiError(msg, 0);
  }
}

export async function deleteHistory(token: string, historyId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/${historyId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to delete history item"), res.status);
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to delete history item";
    throw new ApiError(msg, 0);
  }
}

export async function forkVersion(
  token: string,
  versionId: string,
  payload: ForkVersionRequest
): Promise<CustomizationHistoryItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/${versionId}/fork`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to duplicate resume version"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to duplicate resume version";
    throw new ApiError(msg, 0);
  }
}

export async function updateVersionMetadata(
  token: string,
  versionId: string,
  payload: UpdateVersionMetadataRequest
): Promise<CustomizationHistoryItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/${versionId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to update version metadata"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to update version metadata";
    throw new ApiError(msg, 0);
  }
}

export async function compareVersions(
  token: string,
  payload: CompareVersionsRequest
): Promise<VersionComparisonResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/compare`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, "Failed to compare versions"), res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to compare versions";
    throw new ApiError(msg, 0);
  }
}

export async function downloadVersionExport(
  token: string,
  versionId: string,
  format: "pdf" | "docx" | "txt"
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history/${versionId}/export/${format}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch {}
      throw new ApiError(formatApiError(res.status, errJson, `Export failed with status ${res.status}`), res.status);
    }

    const blob = await res.blob();
    let filename = `Resume_v_${versionId.slice(0, 8)}.${format}`;
    const disposition = res.headers.get("Content-Disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename=["']?([^"']+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    return { blob, filename };
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to download export file";
    throw new ApiError(msg, 0);
  }
}


export async function fetchUserProfile(token: string): Promise<UserProfile> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(`Failed to load profile (${res.status})`, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to load user profile";
    throw new ApiError(msg, 0);
  }
}

export async function improveResumeText(
  req: ImproveTextRequest,
  token?: string | null
): Promise<ImproveTextResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/improve-text`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Failed to improve text (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = Array.isArray(errJson.detail)
            ? errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
            : errJson.detail;
        }
      } catch {
        const rawText = await res.text();
        if (rawText) errorMsg = rawText;
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to improve text snippet";
    throw new ApiError(msg, 0);
  }
}

export async function recheckResumeScore(
  req: RecheckScoreRequest,
  token?: string | null
): Promise<RecheckScoreResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/recheck-score`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Failed to recheck score (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = Array.isArray(errJson.detail)
            ? errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
            : errJson.detail;
        }
      } catch {
        const rawText = await res.text();
        if (rawText) errorMsg = rawText;
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to recheck resume score";
    throw new ApiError(msg, 0);
  }
}

export async function auditResume(
  resumeData: TailoredResumeResponse,
  jobDescription?: string,
  token?: string | null
): Promise<ResumeQualityAudit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const queryParam = jobDescription ? `?job_description=${encodeURIComponent(jobDescription.slice(0, 500))}` : "";
  try {
    const res = await fetch(`${API_BASE_URL}/api/audit${queryParam}`, {
      method: "POST",
      headers,
      body: JSON.stringify(resumeData),
    });

    if (!res.ok) {
      let errorMsg = `Failed to audit resume (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = Array.isArray(errJson.detail)
            ? errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
            : errJson.detail;
        }
      } catch {
        const rawText = await res.text();
        if (rawText) errorMsg = rawText;
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to audit resume";
    throw new ApiError(msg, 0);
  }
}

export async function batchImproveResume(
  req: BatchImproveRequest,
  token?: string | null
): Promise<BatchImproveResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/editor/batch-improve`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      let errorMsg = `Failed to batch improve resume (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = Array.isArray(errJson.detail)
            ? errJson.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
            : errJson.detail;
        }
      } catch {
        const rawText = await res.text();
        if (rawText) errorMsg = rawText;
      }
      throw new ApiError(errorMsg, res.status);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to run batch AI improvement";
    throw new ApiError(msg, 0);
  }
}
