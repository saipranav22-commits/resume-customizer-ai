import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InteractiveResumeEditor from "../components/InteractiveResumeEditor";
import { sampleTailoredResume } from "./testFixtures";

// Mock API functions
vi.mock("@/lib/api", () => ({
  recheckResumeScore: vi.fn().mockResolvedValue({
    match_score: 92,
    ats_compatibility: {
      score: 92,
      strengths: ["Strong keyword alignment"],
      improvements: [],
    },
    match_breakdown: {
      overall_score: 92,
      required_skill_score: 95,
      preferred_skill_score: 90,
      experience_score: 90,
      responsibility_score: 90,
      keyword_score: 95,
      structure_score: 90,
      factor_weights: {},
      explanation: "Updated scores reflect recent draft edits.",
      disclaimer: "Scored deterministically.",
    },
    recommendations: [],
    missing_keywords: [],
    score_delta: 4,
    factor_deltas: { required_skills: 5 },
    is_stale: false,
  }),
  improveResumeText: vi.fn().mockResolvedValue({
    original_text: "Old text",
    improved_text: "Architected resilient systems reducing latency by 45%.",
    rationale: "Quantified performance metrics and used strong action verb.",
    impact_keywords: ["Architected", "latency"],
    is_llm_generated: false,
  }),
}));

describe("InteractiveResumeEditor - Phase 6.2 Studio Editor", () => {
  const mockOnSaveVersion = vi.fn();
  const mockOnExport = vi.fn();
  const mockOnScoreUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders editor toolbar, candidate information, and section headings", () => {
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer role requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Toolbar elements
    expect(screen.getByText(/Interactive Editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft In Sync/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Re-check Score/i })).toBeInTheDocument();

    // Candidate details
    expect(screen.getByDisplayValue("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alex@example.com")).toBeInTheDocument();

    // Section headings
    expect(screen.getByText(/Professional Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Skills & Competencies/i)).toBeInTheDocument();
    expect(screen.getByText(/Professional Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Education & Credentials/i)).toBeInTheDocument();
  });

  it("marks draft as modified when editing summary", async () => {
    const user = userEvent.setup();
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer role requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    const summaryTextarea = screen.getByDisplayValue(sampleTailoredResume.tailored_summary);
    await user.type(summaryTextarea, " Updated skills.");

    // Status changes to Modified
    expect(screen.getByText(/Unsaved Draft Edits/i)).toBeInTheDocument();
    // Stale score warning badge appears
    expect(screen.getByText(/Score Stale/i)).toBeInTheDocument();
  });

  it("allows adding and removing skills dynamically", async () => {
    const user = userEvent.setup();
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer role requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    // Add a new skill via input enter key
    const input = screen.getByPlaceholderText("+ Add Skill");
    await user.type(input, "GraphQL{enter}");

    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("calls recheckResumeScore when clicking Re-check Score button", async () => {
    const user = userEvent.setup();
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer role requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    const recheckBtn = screen.getByRole("button", { name: /Re-check Score/i });
    await user.click(recheckBtn);

    expect(mockOnScoreUpdated).toHaveBeenCalledWith(
      92,
      expect.objectContaining({ overall_score: 92 }),
      expect.any(Array)
    );
  });

  it("toggles between Interactive Editor and Document Preview modes", async () => {
    const user = userEvent.setup();
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer role requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
        onScoreUpdated={mockOnScoreUpdated}
      />
    );

    const previewToggle = screen.getByRole("button", { name: /Document Preview/i });
    await user.click(previewToggle);

    // Should render document paper view with candidate name
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Interactive Editor/i })).toBeInTheDocument();
  });
});
