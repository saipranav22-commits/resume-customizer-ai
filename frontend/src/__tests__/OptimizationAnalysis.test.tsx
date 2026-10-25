import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TailoredResumeView from "../components/TailoredResumeView";
import { sampleTailoredResume } from "./testFixtures";

// Mock downloadExport
vi.mock("@/lib/api", () => ({
  downloadExport: vi.fn().mockResolvedValue({
    blob: new Blob(["test"], { type: "text/plain" }),
    filename: "test.txt",
  }),
}));

describe("TailoredResumeView - Phase 5C AI Optimization & Breakdown Tab", () => {
  it("renders the AI Optimization tab button with recommendation count badge", () => {
    render(<TailoredResumeView resume={sampleTailoredResume} />);
    const tabBtn = screen.getByRole("button", { name: /AI Optimization & Breakdown/i });
    expect(tabBtn).toBeInTheDocument();
    expect(tabBtn).toHaveTextContent("2"); // 2 recommendations in sample
  });

  it("navigates to optimization tab and renders the Explainable Match Breakdown with all 6 factors", async () => {
    const user = userEvent.setup();
    render(<TailoredResumeView resume={sampleTailoredResume} />);

    const tabBtn = screen.getByRole("button", { name: /AI Optimization & Breakdown/i });
    await user.click(tabBtn);

    // Header and overall score
    expect(screen.getByText("Explainable Match Breakdown")).toBeInTheDocument();
    expect(screen.getAllByText("88%").length).toBeGreaterThanOrEqual(1);

    // 6 Tested Factor Weights
    expect(screen.getByText(/Required Skill Coverage \(35% weight\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferred Skill Coverage \(15% weight\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Role & Experience Alignment \(20% weight\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Responsibility Alignment \(15% weight\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Domain Keyword Coverage \(10% weight\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Resume Structure & Readability \(5% weight\)/i)).toBeInTheDocument();

    // Methodology explanation and ethical disclaimer
    expect(
      screen.getByText(/High overall match driven by complete required skills coverage and strong role alignment/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Match scores indicate semantic and structural alignment with the provided job description/i)
    ).toBeInTheDocument();
  });

  it("renders structured job description requirements and skill match status", async () => {
    const user = userEvent.setup();
    render(<TailoredResumeView resume={sampleTailoredResume} />);

    await user.click(screen.getByRole("button", { name: /AI Optimization & Breakdown/i }));

    expect(screen.getByText("Structured Job Requirements")).toBeInTheDocument();
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("5+ years")).toBeInTheDocument();
    expect(
      screen.getByText("Bachelor's degree in Computer Science or equivalent")
    ).toBeInTheDocument();

    // Mandatory skills
    expect(screen.getByText("Mandatory Required Skills:")).toBeInTheDocument();
    // Preferred skills
    expect(screen.getByText("Preferred / Bonus Qualifications:")).toBeInTheDocument();
  });

  it("renders prioritized optimization recommendations with confirmation badges", async () => {
    const user = userEvent.setup();
    render(<TailoredResumeView resume={sampleTailoredResume} />);

    await user.click(screen.getByRole("button", { name: /AI Optimization & Breakdown/i }));

    expect(screen.getByText("Prioritized AI Optimization Recommendations")).toBeInTheDocument();

    // Priority badges
    expect(screen.getByText(/medium priority/i)).toBeInTheDocument();
    expect(screen.getByText(/low priority/i)).toBeInTheDocument();

    // Confirmation flags
    expect(screen.getByText("Requires Candidate Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Evidence Grounded")).toBeInTheDocument();

    // Recommendation contents
    expect(screen.getByText("Preferred skill 'Kubernetes' not highlighted.")).toBeInTheDocument();
    expect(
      screen.getByText(/Highlight any hands-on Kubernetes container orchestration experience if authentic/i)
    ).toBeInTheDocument();
  });

  it("gracefully displays historical notice when viewing legacy Phase 5A/5B snapshot without breakdown", async () => {
    const user = userEvent.setup();
    const legacySnapshot = {
      ...sampleTailoredResume,
      job_analysis: null,
      match_breakdown: null,
      recommendations: [],
    };
    render(<TailoredResumeView resume={legacySnapshot} />);

    await user.click(screen.getByRole("button", { name: /AI Optimization & Breakdown/i }));

    expect(screen.getByText(/Historical Snapshot/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This resume version was created prior to Phase 5C explainable scoring/i)
    ).toBeInTheDocument();
  });
});
