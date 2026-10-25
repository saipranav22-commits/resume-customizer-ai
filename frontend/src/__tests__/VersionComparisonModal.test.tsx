import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VersionComparisonModal from "@/components/VersionComparisonModal";
import * as api from "@/lib/api";
import { sampleComparisonResponse } from "./testFixtures";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-test-1", email: "test@example.com" },
    token: "mock-valid-jwt-token",
    isLoading: false,
    isConfigured: true,
  }),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  compareVersions: vi.fn(),
}));

describe("VersionComparisonModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSwap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.compareVersions).mockResolvedValue(sampleComparisonResponse);
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <VersionComparisonModal
        isOpen={false}
        onClose={mockOnClose}
        versionAId="hist-root-1"
        versionBId="hist-child-2"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("fetches and renders deterministic comparison metrics and cards", async () => {
    render(
      <VersionComparisonModal
        isOpen={true}
        onClose={mockOnClose}
        versionAId="hist-root-1"
        versionBId="hist-child-2"
        versionAName="v1.0 - Initial Customization"
        versionBName="v2.0 - Fintech Emphasis"
        onSwap={mockOnSwap}
      />
    );

    // Initial loading text
    expect(screen.getByText("Analyzing and diffing resume versions...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Resume Version Comparison")).toBeInTheDocument();
    });

    expect(api.compareVersions).toHaveBeenCalledWith("mock-valid-jwt-token", {
      version_a_id: "hist-root-1",
      version_b_id: "hist-child-2",
    });

    // Check version headers
    expect(screen.getByText("Baseline (Version A)")).toBeInTheDocument();
    expect(screen.getByText("Comparing (Version B)")).toBeInTheDocument();
    expect(screen.getByText("v1.0 - Initial Customization")).toBeInTheDocument();
    expect(screen.getByText("v2.0 - Fintech Emphasis")).toBeInTheDocument();

    // Check score deltas
    expect(screen.getByText("+8%")).toBeInTheDocument(); // ATS delta
    expect(screen.getByText("+9%")).toBeInTheDocument(); // Match delta

    // Check summary diff
    expect(screen.getByText("Summary Modified")).toBeInTheDocument();
    expect(screen.getByText(/Experienced software engineer specializing in backend systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Results-driven Senior Backend Engineer with 8\+ years/i)).toBeInTheDocument();

    // Check skills differences
    expect(screen.getByText("Added in Version B (2)")).toBeInTheDocument();
    expect(screen.getByText("Kafka")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems")).toBeInTheDocument();

    expect(screen.getByText("Removed from Version A (1)")).toBeInTheDocument();
    expect(screen.getByText("Flask")).toBeInTheDocument();

    expect(screen.getByText("Retained in Both Versions (5)")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();

    // Check experience bullet differences
    expect(screen.getByText(/Senior Backend Developer/i)).toBeInTheDocument();
    expect(screen.getByText("TechCorp")).toBeInTheDocument();
    expect(screen.getByText("+1 / -1")).toBeInTheDocument();
    expect(screen.getByText(/Architected distributed microservices handling 20M\+ daily events/i)).toBeInTheDocument();
    expect(screen.getByText(/Built internal microservices with basic queuing/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimized PostgreSQL queries reducing latency by 45%/i)).toBeInTheDocument();
  });

  it("handles and renders error state if compare API rejects", async () => {
    vi.mocked(api.compareVersions).mockRejectedValueOnce(new Error("Unable to retrieve snapshot"));

    render(
      <VersionComparisonModal
        isOpen={true}
        onClose={mockOnClose}
        versionAId="hist-root-1"
        versionBId="hist-child-2"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Comparison Error")).toBeInTheDocument();
      expect(screen.getByText("Unable to retrieve snapshot")).toBeInTheDocument();
    });
  });

  it("calls onSwap when Swap Versions button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <VersionComparisonModal
        isOpen={true}
        onClose={mockOnClose}
        versionAId="hist-root-1"
        versionBId="hist-child-2"
        onSwap={mockOnSwap}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Swap Versions/i })).toBeInTheDocument();
    });

    const swapBtn = screen.getByRole("button", { name: /Swap Versions/i });
    await user.click(swapBtn);

    expect(mockOnSwap).toHaveBeenCalled();
  });

  it("closes modal on Escape key press and Close button click", async () => {
    const user = userEvent.setup();
    render(
      <VersionComparisonModal
        isOpen={true}
        onClose={mockOnClose}
        versionAId="hist-root-1"
        versionBId="hist-child-2"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close Comparison" })).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: "Close Comparison" });
    await user.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
