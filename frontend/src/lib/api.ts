import {
  TailoredResumeResponse,
  HealthResponse,
  CoverLetterRequest,
  CustomizationHistoryItem,
  CustomizationHistoryDetail,
  SaveHistoryRequest,
  UserProfile,
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

// --- Phase 5A: Resume History & Auth API Services ---

export async function fetchHistory(token: string): Promise<CustomizationHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/history`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new ApiError(`Failed to fetch history (${res.status})`, res.status);
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
    });

    if (!res.ok) {
      throw new ApiError(`Failed to fetch history detail (${res.status})`, res.status);
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
      let errorMsg = `Save history failed (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // default
      }
      throw new ApiError(errorMsg, res.status);
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
      throw new ApiError(`Failed to delete history item (${res.status})`, res.status);
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to delete history item";
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
