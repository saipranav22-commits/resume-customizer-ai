import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import TailoredResumeView from "@/components/TailoredResumeView";
import { sampleTailoredResume } from "./testFixtures";

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
  fetchHistory: vi.fn().mockResolvedValue([]),
  fetchHistoryDetail: vi.fn(),
  deleteHistory: vi.fn(),
  forkVersion: vi.fn(),
  updateVersionMetadata: vi.fn(),
  downloadVersionExport: vi.fn(),
  downloadExport: vi.fn().mockResolvedValue({
    blob: new Blob(["test"], { type: "text/plain" }),
    filename: "test.txt",
  }),
  compareVersions: vi.fn(),
  checkBackendHealth: vi.fn().mockResolvedValue({ status: "healthy", gemini_key_present: true }),
}));

describe("Phase 6 Premium Vertical UI Redesign & UX Guardrails", () => {
  it("renders the 4 sequential workflow steps on the main page", () => {
    render(<Home />);

    // Step 1: Upload Resume
    expect(screen.getAllByText("Step 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Upload Candidate Resume")).toBeInTheDocument();

    // Step 2: Target Job Description
    expect(screen.getAllByText("Step 2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Target Job Description")).toBeInTheDocument();

    // Step 3: Preferences
    expect(screen.getAllByText("Step 3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Customization Preferences")).toBeInTheDocument();

    // Step 4: AI Optimization
    expect(screen.getAllByText("Step 4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Run AI Optimization")).toBeInTheDocument();

    // Submit button
    expect(
      screen.getByRole("button", { name: /Tailor Resume for this Job/i })
    ).toBeInTheDocument();
  });

  it("distinguishes evidenced-in-project skills from missing skills (UX Fix)", async () => {
    const user = userEvent.setup();

    // Build resume where:
    // - Python is in matching_skills
    // - PostgreSQL is mentioned in projects but not in matching_skills
    // - Terraform is completely absent
    const resumeWithEvidencedSkill = {
      ...sampleTailoredResume,
      skills: {
        matching_skills: ["Python"],
        additional_skills: ["FastAPI"],
      },
      projects: [
        {
          name: "Real-time Metrics Platform",
          technologies: ["PostgreSQL", "Redis"],
          bullets: ["Engineered query caching layer using PostgreSQL."],
        },
      ],
      job_analysis: {
        target_role: "Backend Engineer",
        required_skills: ["Python", "PostgreSQL", "Terraform"],
        preferred_skills: ["Redis"],
        tools_frameworks: ["PostgreSQL", "Redis", "Terraform"],
        experience_level: "3+ years",
        education_requirement: "B.S. in CS",
        responsibilities: ["Develop backend services."],
        keywords: ["python", "postgresql", "terraform", "redis"],
      },
    };

    render(<TailoredResumeView resume={resumeWithEvidencedSkill} />);

    // Navigate to AI Optimization tab
    const optTab = screen.getByRole("button", { name: /AI Optimization & Breakdown/i });
    await user.click(optTab);

    // Python is matched in skills
    expect(screen.getByText("(Matched in Skills)")).toBeInTheDocument();

    // PostgreSQL is evidenced in projects: Must be marked as Evidenced, NOT Not Present!
    expect(screen.getByText("(Evidenced in Experience)")).toBeInTheDocument();

    // Terraform is absent: Marked as Not Present
    expect(screen.getByText("(Not Present)")).toBeInTheDocument();
  });

  it("renders export actions with accessible labels and icons", () => {
    render(<TailoredResumeView resume={sampleTailoredResume} />);

    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Word \(DOCX\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plain Text/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument();
  });
});
