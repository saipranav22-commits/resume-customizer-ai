import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  normalizeCandidateName,
  stripClosingSignature,
  formatCoverLetterWithVerifiedSignature,
} from "@/lib/nameNormalizer";
import { BatchAIImproveModal } from "@/components/BatchAIImproveModal";
import { InteractiveResumeEditor } from "@/components/InteractiveResumeEditor";
import CoverLetterView from "@/components/CoverLetterView";
import { sampleTailoredResume } from "./testFixtures";
import * as api from "@/lib/api";

// Mock API functions
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    batchImproveResume: vi.fn(),
    recheckResumeScore: vi.fn(),
    auditResume: vi.fn(),
    improveResumeText: vi.fn(),
    downloadCoverLetterPdf: vi.fn().mockResolvedValue({
      blob: new Blob(["dummy pdf"], { type: "application/pdf" }),
      filename: "B_SAI_PRANAV_Cover_Letter.pdf",
    }),
  };
});

describe("Phase 6.5: Candidate Name Integrity & Normalization", () => {
  it("preserves exact candidate name B SAI PRANAV", () => {
    expect(normalizeCandidateName("B SAI PRANAV")).toBe("B SAI PRANAV");
    expect(normalizeCandidateName("  B   SAI   PRANAV  ")).toBe("B SAI PRANAV");
  });

  it("heals kerning-split detached single letter PRANA V -> PRANAV", () => {
    expect(normalizeCandidateName("B SAI PRANA V")).toBe("B SAI PRANAV");
    expect(normalizeCandidateName("SAI PRANA V")).toBe("SAI PRANAV");
    expect(normalizeCandidateName("PRANA V")).toBe("PRANAV");
  });

  it("preserves names with initials", () => {
    expect(normalizeCandidateName("J. R. R. Tolkien")).toBe("J. R. R. Tolkien");
    expect(normalizeCandidateName("A. P. J. Abdul Kalam")).toBe("A. P. J. Abdul Kalam");
    expect(normalizeCandidateName("C S Lewis")).toBe("C S Lewis");
  });

  it("preserves multi-word surnames", () => {
    expect(normalizeCandidateName("Ludwig van Beethoven")).toBe("Ludwig van Beethoven");
    expect(normalizeCandidateName("Gabriel García Márquez")).toBe("Gabriel García Márquez");
    expect(normalizeCandidateName("Leonardo da Vinci")).toBe("Leonardo da Vinci");
  });

  it("preserves hyphenated names and apostrophes", () => {
    expect(normalizeCandidateName("Jean-Luc Picard")).toBe("Jean-Luc Picard");
    expect(normalizeCandidateName("Mary-Jane Watson")).toBe("Mary-Jane Watson");
    expect(normalizeCandidateName("Shaquille O'Neal")).toBe("Shaquille O'Neal");
    expect(normalizeCandidateName("Conan O’Brien")).toBe("Conan O'Brien");
  });

  it("preserves Unicode and diacritics in NFC form", () => {
    expect(normalizeCandidateName("Renée Dupont")).toBe("Renée Dupont");
    expect(normalizeCandidateName("José Müller")).toBe("José Müller");
    expect(normalizeCandidateName("Søren Kierkegaard")).toBe("Søren Kierkegaard");
  });
});

describe("Phase 6.5: BatchAIImproveModal Component", () => {
  const mockImprovements = [
    {
      id: "summary",
      section_type: "summary" as const,
      location: "Professional Summary",
      original_text: "Experienced software engineer specializing in backend systems.",
      improved_text: "High-impact Senior Backend Engineer architecting resilient cloud microservices.",
      rationale: "Aligns directly with technical leadership requirements in target job.",
      impact_keywords: ["Cloud Microservices", "High-Impact"],
    },
    {
      id: "exp-0-0",
      section_type: "experience" as const,
      location: "Senior Backend Developer at TechCorp",
      original_text: "Architected distributed microservices handling 20M+ daily events using FastAPI and Kafka.",
      improved_text: "Engineered scalable distributed microservices processing 20M+ events/day with 99.99% uptime.",
      rationale: "Quantifies operational reliability and enterprise resilience.",
      impact_keywords: ["99.99% Uptime", "Scalable"],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders proposals and allows selective accept/reject", async () => {
    vi.mocked(api.batchImproveResume).mockResolvedValueOnce({
      scope: "all",
      total_items: 2,
      improvements: mockImprovements,
      is_llm_generated: true,
    });

    const onAcceptSelected = vi.fn();
    const onClose = vi.fn();

    render(
      <BatchAIImproveModal
        isOpen={true}
        onClose={onClose}
        scope="all"
        jobDescription="Software Engineer JD"
        resumeData={sampleTailoredResume}
        onAcceptSelected={onAcceptSelected}
      />
    );

    // Shows loading state initially
    expect(screen.getByText(/Analyzing resume content against target role/i)).toBeInTheDocument();

    // Await proposals
    await waitFor(() => {
      expect(screen.getByText("Multi-Section AI Optimization")).toBeInTheDocument();
      expect(screen.getByText("Professional Summary")).toBeInTheDocument();
      expect(screen.getByText("Senior Backend Developer at TechCorp")).toBeInTheDocument();
    });

    // Check pre-selected count (2 of 2)
    expect(screen.getByText((_, el) => el?.tagName.toLowerCase() === "span" && el?.textContent?.trim() === "2 of 2 improvements selected")).toBeInTheDocument();

    // Click Deselect All
    fireEvent.click(screen.getByText("Deselect All"));
    expect(screen.getByText((_, el) => el?.tagName.toLowerCase() === "span" && el?.textContent?.trim() === "0 of 2 improvements selected")).toBeInTheDocument();

    // Click Select All
    fireEvent.click(screen.getByText("Select All"));
    expect(screen.getByText((_, el) => el?.tagName.toLowerCase() === "span" && el?.textContent?.trim() === "2 of 2 improvements selected")).toBeInTheDocument();

    // Click Accept Selected (2 changes)
    const acceptBtn = screen.getByRole("button", { name: /Accept Selected \(2 changes\)/i });
    fireEvent.click(acceptBtn);

    expect(onAcceptSelected).toHaveBeenCalledTimes(1);
    expect(onAcceptSelected).toHaveBeenCalledWith(mockImprovements);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes with zero modifications when Cancel is clicked", async () => {
    vi.mocked(api.batchImproveResume).mockResolvedValueOnce({
      scope: "summary",
      total_items: 1,
      improvements: [mockImprovements[0]],
      is_llm_generated: true,
    });

    const onAcceptSelected = vi.fn();
    const onClose = vi.fn();

    render(
      <BatchAIImproveModal
        isOpen={true}
        onClose={onClose}
        scope="summary"
        jobDescription="Software Engineer JD"
        resumeData={sampleTailoredResume}
        onAcceptSelected={onAcceptSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Professional Summary")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(onAcceptSelected).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Phase 6.5: InteractiveResumeEditor Candidate Name & Hybrid AI Improve UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays candidate name correctly and normalizes on blur", () => {
    const resumeWithName: typeof sampleTailoredResume = {
      ...sampleTailoredResume,
      candidate_name: "B SAI PRANAV",
    };

    render(
      <InteractiveResumeEditor
        resumeData={resumeWithName}
        jobDescription="Software Engineer JD"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText("Candidate Full Name");
    expect(nameInput).toHaveValue("B SAI PRANAV");

    // Simulate accidental space injection: B SAI PRANA V
    fireEvent.change(nameInput, { target: { value: "B SAI PRANA V" } });
    fireEvent.blur(nameInput);

    // On blur, normalizeCandidateName heals it back to B SAI PRANAV
    expect(nameInput).toHaveValue("B SAI PRANAV");
  });

  it("opens toolbar AI Improve action menu when nothing is focused", () => {
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Software Engineer JD"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
      />
    );

    const aiImproveBtn = screen.getByRole("button", { name: /^AI Improve$/i });
    fireEvent.click(aiImproveBtn);

    // Dropdown panel opens with 4 scopes
    expect(screen.getByText("AI Optimization Scope")).toBeInTheDocument();
    expect(screen.getByText("1. Improve Entire Resume")).toBeInTheDocument();
    expect(screen.getByText("2. Improve Professional Summary")).toBeInTheDocument();
    expect(screen.getByText("3. Improve Experience")).toBeInTheDocument();
    expect(screen.getByText("4. Improve Projects")).toBeInTheDocument();
  });

  it("hides contextual AI controls in Document Preview mode", () => {
    render(
      <InteractiveResumeEditor
        resumeData={sampleTailoredResume}
        jobDescription="Software Engineer JD"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
      />
    );

    // Switch to Document Preview mode
    const previewBtn = screen.getByRole("button", { name: /Document Preview/i });
    fireEvent.click(previewBtn);

    // Contextual edit and AI Improve controls should not exist in preview mode
    expect(screen.queryByPlaceholderText("Candidate Full Name")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/AI Improve this bullet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Recruiter Preview Mode: Clean ATS document appearance/i)).toBeInTheDocument();
  });
});

describe("Phase 6.5.1: Cover Letter Candidate Name Integrity & Deterministic Signature", () => {
  const sampleCoverLetterWithKerningGlitch =
    "Dear Hiring Team,\n\nI am thrilled to submit my application for this role.\n\nSincerely,\nB Sai Prana V";

  it("strips closing salutations and trailing signatures cleanly", () => {
    const stripped = stripClosingSignature(sampleCoverLetterWithKerningGlitch);
    expect(stripped).toBe("Dear Hiring Team,\n\nI am thrilled to submit my application for this role.");
    expect(stripped).not.toContain("Sincerely");
    expect(stripped).not.toContain("Prana V");
  });

  it("formats cover letter deterministically with verified candidate name B SAI PRANAV", () => {
    const formatted = formatCoverLetterWithVerifiedSignature(
      sampleCoverLetterWithKerningGlitch,
      "B SAI PRANAV"
    );
    expect(formatted).toContain("Sincerely,\nB SAI PRANAV");
    expect(formatted).not.toContain("B Sai Prana V");
    expect(formatted).not.toContain("PRANA V");
    expect(formatted).toContain("Dear Hiring Team,\n\nI am thrilled to submit my application for this role.");

    // Idempotent test
    const formattedTwice = formatCoverLetterWithVerifiedSignature(formatted, "B SAI PRANAV");
    expect(formattedTwice).toBe(formatted);
  });

  it("CoverLetterView renders identical authoritative candidate name in header and signature", async () => {
    const resumeWithGlitch: typeof sampleTailoredResume = {
      ...sampleTailoredResume,
      candidate_name: "B SAI PRANAV",
      generated_cover_letter: sampleCoverLetterWithKerningGlitch,
    };

    render(<CoverLetterView resume={resumeWithGlitch} />);

    // Header letterhead must render B SAI PRANAV
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("B SAI PRANAV");

    // Letter body preview must render B SAI PRANAV and never B Sai Prana V
    const previewContainer = document.getElementById("cover-letter-preview");
    expect(previewContainer).toBeInTheDocument();
    expect(previewContainer?.textContent).toContain("B SAI PRANAV");
    expect(previewContainer?.textContent).not.toContain("B Sai Prana V");
    expect(previewContainer?.textContent).not.toContain("PRANA V");

    // Trigger PDF download button and verify payload
    const downloadBtn = screen.getByRole("button", { name: /Download Cover Letter PDF/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadCoverLetterPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          candidate_name: "B SAI PRANAV",
          cover_letter_text: expect.stringContaining("Sincerely,\nB SAI PRANAV"),
        })
      );
    });
  });

  it("synchronizes name updates from InteractiveResumeEditor to cover letter", () => {
    const onDraftChange = vi.fn();
    const resumeWithGlitch: typeof sampleTailoredResume = {
      ...sampleTailoredResume,
      candidate_name: "B SAI PRANAV",
      generated_cover_letter: sampleCoverLetterWithKerningGlitch,
    };

    render(
      <InteractiveResumeEditor
        resumeData={resumeWithGlitch}
        jobDescription="Software Engineer JD"
        onSaveVersion={vi.fn()}
        onExport={vi.fn()}
        onDraftChange={onDraftChange}
      />
    );

    const nameInput = screen.getByPlaceholderText("Candidate Full Name");
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_name: "Jane Doe",
        generated_cover_letter: expect.stringContaining("Sincerely,\nJane Doe"),
      })
    );
  });
});

