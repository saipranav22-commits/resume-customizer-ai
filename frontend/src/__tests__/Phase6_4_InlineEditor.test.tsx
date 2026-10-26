import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InteractiveResumeEditor from "../components/InteractiveResumeEditor";
import { sampleTailoredResume } from "./testFixtures";
import { MatchScoreBreakdown } from "@/types/resume";
import * as api from "@/lib/api";

// Mock API functions
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    recheckResumeScore: vi.fn(),
    improveResumeText: vi.fn(),
    auditResume: vi.fn(),
  };
});

describe("Phase 6.4 - Inline ATS Document Resume Editor & Repeatable AI Improve", () => {
  const mockOnSaveVersion = vi.fn();
  const mockOnExport = vi.fn();
  const mockOnScoreUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Preview shows a properly structured continuous resume document canvas", async () => {
    const user = userEvent.setup();
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Toggle to Document Preview mode
    const previewBtn = screen.getByRole("button", { name: /Document Preview/i });
    await user.click(previewBtn);

    // Document canvas renders candidate name as heading
    expect(screen.getByRole("heading", { name: "Alex Morgan" })).toBeInTheDocument();
    // Contact line rendered as text
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    // Professional summary rendered as text paragraph
    expect(screen.getByText(sampleTailoredResume.tailored_summary)).toBeInTheDocument();
    // Sections rendered as continuous ATS document
    expect(screen.getByText(/Professional Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Skills & Competencies/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Education & Credentials/i)).toBeInTheDocument();
  });

  it("2. Edit mode enables contextual inline editing where unfocused fields do not all show borders", () => {
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // In edit mode by default, the candidate name and contact inputs have border-transparent
    const nameInput = screen.getByDisplayValue("Alex Morgan");
    expect(nameInput).toHaveClass("border-transparent");
    expect(nameInput).not.toHaveClass("border-[#C45D39]");

    const emailInput = screen.getByDisplayValue("alex@example.com");
    expect(emailInput).toHaveClass("border-transparent");

    // The summary textarea also has border-transparent when unfocused
    const summaryInput = screen.getByDisplayValue(sampleTailoredResume.tailored_summary);
    expect(summaryInput).toHaveClass("border-transparent");
  });

  it("3. AI Improve button appears for eligible selections and toolbar provides persistent action", async () => {
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Toolbar persistent AI Improve button and contextual bullet buttons
    const aiButtons = screen.getAllByRole("button", { name: /AI Improve/i });
    expect(aiButtons.length).toBeGreaterThanOrEqual(2);
    // The first one is the toolbar persistent action
    expect(aiButtons[0]).toBeInTheDocument();

    // Contextual summary AI Improve button
    expect(screen.getByRole("button", { name: /AI Improve Summary/i })).toBeInTheDocument();
  });

  it("4. AI Improve: Accept updates only the targeted block, while Reject leaves original unchanged", async () => {
    const user = userEvent.setup();

    vi.mocked(api.improveResumeText).mockResolvedValueOnce({
      original_text: sampleTailoredResume.tailored_summary,
      improved_text: "High-impact summary engineered for enterprise cloud architecture.",
      rationale: "Elevated action verbs and quantified scope.",
      impact_keywords: ["enterprise", "architecture"],
      is_llm_generated: false,
    });

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Click AI Improve Summary
    const summaryAiBtn = screen.getByRole("button", { name: /AI Improve Summary/i });
    await user.click(summaryAiBtn);

    // Modal opens with proposed wording
    await waitFor(() => {
      expect(screen.getByText("High-impact summary engineered for enterprise cloud architecture.")).toBeInTheDocument();
    });

    // Accept & Apply
    const acceptBtn = screen.getByRole("button", { name: /Accept & Apply to Draft/i });
    await user.click(acceptBtn);

    // Only the summary field was updated in the draft
    expect(screen.getByDisplayValue("High-impact summary engineered for enterprise cloud architecture.")).toBeInTheDocument();
    // Candidate name remains unchanged
    expect(screen.getByDisplayValue("Alex Morgan")).toBeInTheDocument();

    // Now test Reject (Keep Original) on a bullet
    const firstBullet = sampleTailoredResume.experience[0].bullets[0];
    vi.mocked(api.improveResumeText).mockResolvedValueOnce({
      original_text: firstBullet,
      improved_text: "Rejected bullet proposal that should not be applied.",
      rationale: "Test rejection.",
      impact_keywords: [],
      is_llm_generated: false,
    });

    // Find and click the AI improve button for the first bullet
    const bulletAiBtns = screen.getAllByRole("button", { name: /AI Improve/i });
    // bulletAiBtns[0] is toolbar, bulletAiBtns[1] is summary or bullet
    const firstBulletAiBtn = bulletAiBtns[bulletAiBtns.length - 1];
    await user.click(firstBulletAiBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Keep Original/i })).toBeInTheDocument();
    });

    // Click Reject / Keep Original
    await user.click(screen.getByRole("button", { name: /Keep Original/i }));

    // Original bullet is preserved unchanged
    expect(screen.getByDisplayValue(firstBullet)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Rejected bullet proposal that should not be applied.")).not.toBeInTheDocument();
  });

  it("5. CRITICAL: AI Improve Again operates on the latest accepted text", async () => {
    const user = userEvent.setup();

    // First call return
    vi.mocked(api.improveResumeText).mockResolvedValueOnce({
      original_text: sampleTailoredResume.tailored_summary,
      improved_text: "First accepted iteration of summary.",
      rationale: "First iteration rationale.",
      impact_keywords: ["First"],
      is_llm_generated: false,
    });

    // Second call return (must receive "First accepted iteration of summary." as input!)
    vi.mocked(api.improveResumeText).mockResolvedValueOnce({
      original_text: "First accepted iteration of summary.",
      improved_text: "Second refined iteration of summary.",
      rationale: "Second refinement.",
      impact_keywords: ["Second"],
      is_llm_generated: false,
    });

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // 1st Round: AI Improve Summary
    const summaryAiBtn = screen.getByRole("button", { name: /AI Improve Summary/i });
    await user.click(summaryAiBtn);

    await waitFor(() => {
      expect(screen.getByText("First accepted iteration of summary.")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /Accept & Apply to Draft/i }));

    // Verify draft updated
    expect(screen.getByDisplayValue("First accepted iteration of summary.")).toBeInTheDocument();

    // 2nd Round: Click AI Improve Summary AGAIN on the same block!
    await user.click(summaryAiBtn);

    // The second API call must have been called with the FIRST ACCEPTED text as input!
    await waitFor(() => {
      expect(api.improveResumeText).toHaveBeenLastCalledWith(
        expect.objectContaining({
          text: "First accepted iteration of summary.",
          section_type: "summary",
        })
      );
    });

    // And second suggestion appears
    await waitFor(() => {
      expect(screen.getByText("Second refined iteration of summary.")).toBeInTheDocument();
    });

    // Accept second iteration
    await user.click(screen.getByRole("button", { name: /Accept & Apply to Draft/i }));
    expect(screen.getByDisplayValue("Second refined iteration of summary.")).toBeInTheDocument();
  });

  it("6. Re-check Score evaluates against the latest edited draft and updates score", async () => {
    const user = userEvent.setup();

    vi.mocked(api.recheckResumeScore).mockResolvedValueOnce({
      match_score: 95,
      ats_compatibility: {
        score: 95,
        strengths: ["Superior skills match"],
        improvements: [],
      },
      match_breakdown: {
        ...(sampleTailoredResume.match_breakdown as MatchScoreBreakdown),
        overall_score: 95,
      },
      recommendations: [],
      missing_keywords: [],
      score_delta: 7,
      factor_deltas: {},
      is_stale: false,
    });

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Edit summary to make score stale
    const summaryInput = screen.getByDisplayValue(sampleTailoredResume.tailored_summary);
    fireEvent.change(summaryInput, {
      target: { value: sampleTailoredResume.tailored_summary + " Added specialized backend performance tuning." },
    });

    expect(screen.getByText(/Score Stale \(Edits made\)/i)).toBeInTheDocument();

    // Click Re-check Score
    const recheckBtn = screen.getByRole("button", { name: /Re-check Score/i });
    await user.click(recheckBtn);

    // Recheck was called with the modified draft
    expect(api.recheckResumeScore).toHaveBeenCalledWith(
      expect.objectContaining({
        resume_data: expect.objectContaining({
          tailored_summary: expect.stringContaining("performance tuning"),
        }),
      })
    );

    // Dual-Score modal opens with real score deltas
    await waitFor(() => {
      expect(screen.getByText("Live Re-check Evaluation")).toBeInTheDocument();
    });
    expect(screen.getByText("Score re-checked! Match changed from 88% → 95% (+7%).")).toBeInTheDocument();
  });

  it("7. Export and Save actions always use the latest approved draft without mutating original", async () => {
    const user = userEvent.setup();

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Make an edit to candidate name
    const nameInput = screen.getByDisplayValue("Alex Morgan");
    fireEvent.change(nameInput, { target: { value: "Dr. Alex Morgan" } });

    // Click Save as Version
    const saveBtn = screen.getByRole("button", { name: /Save as Version/i });
    await user.click(saveBtn);

    // onSaveVersion is called with the current edited draft
    expect(mockOnSaveVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_name: "Dr. Alex Morgan",
      })
    );

    // Original parent sampleTailoredResume is NOT mutated
    expect(sampleTailoredResume.candidate_name).toBe("Alex Morgan");

    // Click Export dropdown then PDF
    const exportBtn = screen.getByRole("button", { name: /Export/i });
    await user.click(exportBtn);

    const pdfExportBtn = screen.getByText("Download PDF");
    await user.click(pdfExportBtn);

    // onExport is called with format "pdf" and the edited draft
    expect(mockOnExport).toHaveBeenCalledWith(
      "pdf",
      expect.objectContaining({
        candidate_name: "Dr. Alex Morgan",
      })
    );
  });
});
