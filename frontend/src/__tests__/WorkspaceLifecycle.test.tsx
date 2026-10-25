import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import * as api from "@/lib/api";
import { sampleTailoredResume, sampleHistoryItems, sampleHistoryDetail } from "./testFixtures";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-test-1", email: "test@example.com", full_name: "Test User" },
    token: "mock-valid-jwt-token",
    isLoading: false,
    isConfigured: true,
  }),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  customizeResume: vi.fn(),
  saveHistory: vi.fn(),
  fetchHistory: vi.fn(),
  fetchHistoryDetail: vi.fn(),
  deleteHistory: vi.fn(),
  forkVersion: vi.fn(),
  updateVersionMetadata: vi.fn(),
  downloadVersionExport: vi.fn(),
  downloadExport: vi.fn(),
  compareVersions: vi.fn(),
  checkBackendHealth: vi.fn().mockResolvedValue({ status: "healthy", gemini_key_present: true }),
}));

describe("Workspace Lifecycle and Version Management UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchHistory).mockResolvedValue(sampleHistoryItems);
    vi.mocked(api.fetchHistoryDetail).mockResolvedValue(sampleHistoryDetail);
    vi.mocked(api.customizeResume).mockResolvedValue(sampleTailoredResume);
    vi.mocked(api.saveHistory).mockResolvedValue({
      ...sampleHistoryItems[0],
      id: "hist-new-v2",
      version_name: "Revision v2 - Saved",
      version_number: 2,
    });

    // Mock window methods
    window.confirm = vi.fn().mockReturnValue(true);
    window.scrollTo = vi.fn();
  });

  it("warns user before discarding unsaved modifications on reset", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Upload a valid PDF file
    const file = new File(["fake resume content"], "resume.pdf", { type: "application/pdf" });
    const fileInput = document.getElementById("resume-file-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    await user.upload(fileInput, file);

    const jdTextarea = screen.getByPlaceholderText(/Paste the full job description here/i);
    fireEvent.change(jdTextarea, {
      target: {
        value: "We are looking for a Senior Backend Software Engineer with at least 5 years of Python and FastAPI experience.",
      },
    });

    // Submit customization
    const tailorBtn = screen.getByRole("button", { name: /Tailor Resume for this Job/i });
    await waitFor(() => {
      expect(tailorBtn).not.toBeDisabled();
    });
    await user.click(tailorBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alex Morgan" })).toBeInTheDocument();
    });

    // Status indicator should show Unsaved Modifications
    expect(screen.getByText("Unsaved Modifications")).toBeInTheDocument();

    // Click Reset Form
    const resetBtn = screen.getByRole("button", { name: /Reset Form/i });
    await user.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("You have unsaved changes in your active tailored resume")
    );
  });

  it("restores a saved version from history, renders immutable active version badge, and allows saving a new revision", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Open History Drawer
    const historyBtn = screen.getByTitle("View saved resume history");
    await user.click(historyBtn);

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    // Restore v1.0
    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const restoreBtn = card.querySelector('button:has(svg.lucide-external-link)') || card.querySelectorAll("button")[card.querySelectorAll("button").length - 1];
    await user.click(restoreBtn);

    // After restore, the active banner should display active version snapshot
    await waitFor(() => {
      expect(screen.getByText(/Active:/i)).toBeInTheDocument();
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    // Should indicate saved snapshot is immutable
    expect(screen.getByText("Saved Snapshot (Immutable)")).toBeInTheDocument();

    // Editing job description marks workspace as modified
    const jdTextarea = screen.getByPlaceholderText(/Paste the full job description here/i);
    fireEvent.change(jdTextarea, {
      target: { value: "Looking for Senior Backend Developer with Kafka and Kubernetes." },
    });

    expect(screen.getByText("Unsaved Modifications")).toBeInTheDocument();
    expect(screen.getByText(/Active snapshot/i)).toBeInTheDocument();

    // Save as new revision
    const saveRevBtn = screen.getByRole("button", { name: /Save New Revision/i });
    await user.click(saveRevBtn);

    expect(screen.getByRole("heading", { name: "Save Resume Version" })).toBeInTheDocument();
    expect(screen.getByText("Child Revision")).toBeInTheDocument();

    const submitSaveBtn = screen.getByRole("button", { name: "Save Resume Version" });
    await user.click(submitSaveBtn);

    await waitFor(() => {
      expect(api.saveHistory).toHaveBeenCalledWith(
        "mock-valid-jwt-token",
        expect.objectContaining({
          parent_id: "hist-root-1",
        })
      );
    });
  });

  it("allows detaching active family so subsequent saves create an independent root", async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Open history and restore
    const historyBtn = screen.getByTitle("View saved resume history");
    await user.click(historyBtn);

    await waitFor(() => {
      expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    });

    const card = screen.getByText("v1.0 - Initial Customization").closest(".group")!;
    const restoreBtn = card.querySelector('button:has(svg.lucide-external-link)') || card.querySelectorAll("button")[card.querySelectorAll("button").length - 1];
    await user.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Detach Family/i })).toBeInTheDocument();
    });

    // Detach from family
    const detachBtn = screen.getByRole("button", { name: /Detach Family/i });
    await user.click(detachBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Detach from this revision family?")
    );

    // Active version badge should now be cleared
    expect(screen.queryByText(/Active:/i)).not.toBeInTheDocument();
  });
});
