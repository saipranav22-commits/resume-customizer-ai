import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InteractiveResumeEditor from "../components/InteractiveResumeEditor";
import OptimizationDashboard from "../components/OptimizationDashboard";
import TailoredResumeView from "../components/TailoredResumeView";
import { sampleTailoredResume } from "./testFixtures";
import { ResumeQualityAudit, RecheckScoreResponse } from "@/types/resume";
import * as api from "@/lib/api";

// Mock API
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    recheckResumeScore: vi.fn(),
    auditResume: vi.fn(),
    downloadExport: vi.fn().mockResolvedValue({
      blob: new Blob(["test"], { type: "text/plain" }),
      filename: "test.pdf",
    }),
  };
});

describe("Phase 6.2 Professional ATS Resume Engine - Frontend Tests", () => {
  it("renders ATS Quality Audit button and launches the deterministic audit modal", async () => {
    const user = userEvent.setup();
    const mockOnSaveVersion = vi.fn();
    const mockOnExport = vi.fn();

    vi.mocked(api.auditResume).mockResolvedValueOnce(sampleTailoredResume.audit as ResumeQualityAudit);

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={mockOnSaveVersion}
        onExport={mockOnExport}
      />
    );

    const auditBtn = screen.getByRole("button", { name: /ATS Audit/i });
    expect(auditBtn).toBeInTheDocument();

    await user.click(auditBtn);

    // Audit modal header and grade (wait for async audit to complete)
    await waitFor(() => {
      expect(screen.getByText("ATS & Resume Quality Audit")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Grade A/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Resume meets high professional ATS standards/i)).toBeInTheDocument();

    // Metrics strip
    expect(screen.getByText("310")).toBeInTheDocument(); // total words
    expect(screen.getByText("18.5")).toBeInTheDocument(); // avg bullet words

    // Warnings and suggestions
    expect(screen.getByText("Bullet exceeds 35 words")).toBeInTheDocument();
    expect(screen.getByText("Opening summary is concise and impact-focused")).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByRole("button", { name: /Close Audit/i });
    await user.click(closeBtn);
    expect(screen.queryByText("ATS & Resume Quality Audit")).not.toBeInTheDocument();
  });

  it("adapts layout order for fresher candidates in Document Preview Canvas", async () => {
    const user = userEvent.setup();
    const fresherResume = {
      ...sampleTailoredResume,
      experience: [],
      projects: [
        {
          name: "Distributed Cache Service",
          technologies: ["Go", "Raft", "gRPC"],
          bullets: ["Built Raft-consensus cache handling 5k rps."],
        },
      ],
      education: [
        {
          institution: "University of Technology",
          degree: "B.S. in Computer Science",
          year: "2025",
        },
      ],
    };

    render(
      <InteractiveResumeEditor
        resumeData={fresherResume}
        jobDescription="Junior Backend Engineer requirements"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
      />
    );

    // Switch from editor mode to Document Preview mode
    const previewTabBtn = screen.getByRole("button", { name: /Document Preview/i });
    await user.click(previewTabBtn);

    // Fresher layout indicator in preview header
    expect(screen.getByText("Fresher Adaptive Layout")).toBeInTheDocument();

    // Preview canvas should render Key Projects and Education
    expect(screen.getByText("Key Projects")).toBeInTheDocument();
    expect(screen.getByText("Distributed Cache Service")).toBeInTheDocument();
    expect(screen.getByText(/University of Technology/i)).toBeInTheDocument();
  });

  it("displays Dual-Score Re-check Evaluation modal with Score A and Score B breakdowns", async () => {
    const user = userEvent.setup();
    const mockRecheckResponse = {
      overall_score: 91,
      match_score: 91,
      ats_score: 94,
      match_breakdown: sampleTailoredResume.match_breakdown,
      ats_quality_assessment: sampleTailoredResume.ats_quality_assessment,
      audit: sampleTailoredResume.audit,
      score_delta: 3,
      ats_delta: 2,
      recommendations: sampleTailoredResume.recommendations,
      missing_keywords: [],
      ats_compatibility: sampleTailoredResume.ats_compatibility,
    };

    vi.mocked(api.recheckResumeScore).mockResolvedValueOnce(
      mockRecheckResponse as unknown as RecheckScoreResponse
    );

    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Senior Backend Engineer requirements"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
      />
    );

    const recheckBtn = screen.getByRole("button", { name: /Re-check Score/i });
    await user.click(recheckBtn);

    await waitFor(() => {
      expect(screen.getByText("Live Re-check Evaluation")).toBeInTheDocument();
    });

    // Score A and Score B headers
    expect(screen.getByText("Job Description Match")).toBeInTheDocument();
    expect(screen.getByText("ATS & Document Quality")).toBeInTheDocument();

    // Both scores visible
    expect(screen.getAllByText(/91%/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/93%/i).length).toBeGreaterThanOrEqual(1);

    // Factor weight descriptions
    expect(screen.getByText(/Required Skills \(35%\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Parseability \(25%\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Readability \(15%\):/i)).toBeInTheDocument();

    // Non-vendor disclaimer
    expect(
      screen.getByText(/Match and ATS quality scores indicate semantic and structural alignment/i)
    ).toBeInTheDocument();
  });

  it("renders ATS & Resume Quality Assessment and Deterministic Quality Audit in OptimizationDashboard", () => {
    render(<OptimizationDashboard resumeData={sampleTailoredResume} />);

    // Dual-track score badges in header
    expect(screen.getByText(/Score A \(JD Match\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Score B \(ATS Quality\):/i)).toBeInTheDocument();

    // Section 2B: ATS Quality Assessment
    expect(screen.getByText("ATS & Resume Quality Assessment (Track B)")).toBeInTheDocument();
    expect(screen.getByText("Single-Column Parseability")).toBeInTheDocument();
    expect(screen.getByText("Section Structure")).toBeInTheDocument();
    expect(screen.getByText("Readability & Voice")).toBeInTheDocument();
    expect(screen.getByText("Formatting Consistency")).toBeInTheDocument();
    expect(screen.getByText("Content Coverage")).toBeInTheDocument();
    expect(screen.getByText("Document Completeness")).toBeInTheDocument();

    // Section 2C: Deterministic Quality Audit
    expect(screen.getByText("Deterministic Resume Quality Audit")).toBeInTheDocument();
    expect(screen.getByText(/Warnings \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("Bullet exceeds 35 words")).toBeInTheDocument();
  });

  it("renders ATS Quality Assessment and Quality Audit findings in TailoredResumeView optimization tab", async () => {
    const user = userEvent.setup();
    render(<TailoredResumeView resume={sampleTailoredResume} />);

    const optTab = screen.getByRole("button", { name: /AI Optimization & Breakdown/i });
    await user.click(optTab);

    // Track B in TailoredResumeView
    expect(screen.getByText("ATS & Resume Quality Assessment (Track B)")).toBeInTheDocument();
    expect(screen.getByText("Single-Column Parseability (25% wt)")).toBeInTheDocument();

    // Audit Findings in TailoredResumeView
    expect(screen.getByText("Resume Quality Audit Findings")).toBeInTheDocument();
    expect(screen.getAllByText(/Grade A/i).length).toBeGreaterThanOrEqual(1);
  });
});
