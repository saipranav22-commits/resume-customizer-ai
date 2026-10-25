import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIImproveModal from "../components/AIImproveModal";

// Mock improveResumeText
vi.mock("@/lib/api", () => ({
  improveResumeText: vi.fn().mockResolvedValue({
    original_text: "Developed web applications.",
    improved_text: "Architected high-throughput web applications scaling to 1M+ active users.",
    rationale: "Replaced generic verb with strong technical action verb and quantified scale.",
    impact_keywords: ["Architected", "high-throughput", "scaling"],
    is_llm_generated: true,
  }),
}));

describe("AIImproveModal - Phase 6.2 Grounded Bullet Enhancer", () => {
  const mockOnClose = vi.fn();
  const mockOnAccept = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state then displays original vs proposed text and keywords", async () => {
    render(
      <AIImproveModal
        isOpen={true}
        onClose={mockOnClose}
        originalText="Developed web applications."
        sectionType="experience"
        jobDescription="Target Senior Software Engineer role"
        contextInfo="Role: Senior Software Engineer at TechCorp"
        onAccept={mockOnAccept}
      />
    );

    // Wait for the improved text to be loaded
    await waitFor(() => {
      expect(
        screen.getByText("Architected high-throughput web applications scaling to 1M+ active users.")
      ).toBeInTheDocument();
    });

    // Check Original text
    expect(screen.getByText("Developed web applications.")).toBeInTheDocument();

    // Check Rationale
    expect(
      screen.getByText(/Replaced generic verb with strong technical action verb/i)
    ).toBeInTheDocument();

    // Check Impact Keywords
    expect(screen.getByText("high-throughput")).toBeInTheDocument();
  });

  it("calls onAccept with improved text when Accept & Apply is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AIImproveModal
        isOpen={true}
        onClose={mockOnClose}
        originalText="Developed web applications."
        sectionType="experience"
        jobDescription="Target Senior Software Engineer role"
        contextInfo="Role: Senior Software Engineer at TechCorp"
        onAccept={mockOnAccept}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Architected high-throughput web applications scaling to 1M+ active users.")
      ).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole("button", { name: /Accept & Apply to Draft/i });
    await user.click(acceptBtn);

    expect(mockOnAccept).toHaveBeenCalledWith(
      "Architected high-throughput web applications scaling to 1M+ active users."
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("allows user to edit proposed text before accepting", async () => {
    const user = userEvent.setup();
    render(
      <AIImproveModal
        isOpen={true}
        onClose={mockOnClose}
        originalText="Developed web applications."
        sectionType="experience"
        jobDescription="Target Senior Software Engineer role"
        contextInfo="Role: Senior Software Engineer at TechCorp"
        onAccept={mockOnAccept}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Architected high-throughput web applications scaling to 1M+ active users.")
      ).toBeInTheDocument();
    });

    // Click Edit before accepting button
    const editBtn = screen.getByRole("button", { name: /Edit before accepting/i });
    await user.click(editBtn);

    // Edit textarea should now be available
    const textarea = screen.getByDisplayValue(
      "Architected high-throughput web applications scaling to 1M+ active users."
    );
    await user.type(textarea, " with 99.99% uptime.");

    // Accept edited text
    const acceptBtn = screen.getByRole("button", { name: /Accept & Apply to Draft/i });
    await user.click(acceptBtn);

    expect(mockOnAccept).toHaveBeenCalledWith(
      "Architected high-throughput web applications scaling to 1M+ active users. with 99.99% uptime."
    );
  });

  it("calls onClose when Keep Original is clicked without calling onAccept", async () => {
    const user = userEvent.setup();
    render(
      <AIImproveModal
        isOpen={true}
        onClose={mockOnClose}
        originalText="Developed web applications."
        sectionType="experience"
        jobDescription="Target Senior Software Engineer role"
        contextInfo="Role: Senior Software Engineer at TechCorp"
        onAccept={mockOnAccept}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Architected high-throughput web applications scaling to 1M+ active users.")
      ).toBeInTheDocument();
    });

    const rejectBtn = screen.getByRole("button", { name: /Keep Original/i });
    await user.click(rejectBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnAccept).not.toHaveBeenCalled();
  });
});
